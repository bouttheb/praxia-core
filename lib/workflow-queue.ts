import type { AgentKey } from "@/lib/agents";
import { sql } from "@/lib/db";
import type { ScopeAssessment } from "@/lib/scope-gate";

export type CommandProjectContext = {
  id: number;
  name: string;
  description: string | null;
  agent: AgentKey;
  working_directory: string | null;
  vision_md: string | null;
  completion_percent: number;
  latest_today: string | null;
  latest_tomorrow: string | null;
};

export async function loadCommandProjectContext(projectId: number) {
  const [project] = await sql<CommandProjectContext[]>`
    SELECT
      p.id,
      p.name,
      p.description,
      p.agent,
      p.working_directory,
      p.vision_md,
      p.completion_percent,
      lu.today AS latest_today,
      lu.tomorrow AS latest_tomorrow
    FROM projects p
    LEFT JOIN LATERAL (
      SELECT today, tomorrow
      FROM updates u
      WHERE u.project_id = p.id
      ORDER BY u.created_at DESC
      LIMIT 1
    ) lu ON TRUE
    WHERE p.id = ${projectId}
      AND p.archived = FALSE
      AND p.hidden = FALSE
  `;
  return project ?? null;
}

export async function insertScopeAssessment(projectId: number, commandBody: string, assessment: ScopeAssessment) {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO scope_assessments (
      project_id,
      command_body,
      decision,
      confidence,
      template_key,
      template_label,
      summary,
      missing_inputs,
      clarifying_questions,
      proposed_steps,
      definition_of_done,
      risk_level
    )
    VALUES (
      ${projectId},
      ${commandBody},
      ${assessment.decision},
      ${assessment.confidence},
      ${assessment.templateKey},
      ${assessment.templateLabel},
      ${assessment.summary},
      ${JSON.stringify(assessment.missingInputs)}::jsonb,
      ${JSON.stringify(assessment.clarifyingQuestions)}::jsonb,
      ${JSON.stringify(assessment.proposedSteps)}::jsonb,
      ${JSON.stringify(assessment.definitionOfDone)}::jsonb,
      ${assessment.riskLevel}
    )
    RETURNING id
  `;
  return row.id;
}

export async function queueWorkflow({
  project,
  commandBody,
  agent,
  autoLog,
  assessment,
}: {
  project: CommandProjectContext;
  commandBody: string;
  agent: AgentKey;
  autoLog: boolean;
  assessment: ScopeAssessment;
}) {
  return sql.begin(async (tx) => {
    const [assessmentRow] = await tx<{ id: number }[]>`
      INSERT INTO scope_assessments (
        project_id,
        command_body,
        decision,
        confidence,
        template_key,
        template_label,
        summary,
        missing_inputs,
        clarifying_questions,
        proposed_steps,
        definition_of_done,
        risk_level
      )
      VALUES (
        ${project.id},
        ${commandBody},
        ${assessment.decision},
        ${assessment.confidence},
        ${assessment.templateKey},
        ${assessment.templateLabel},
        ${assessment.summary},
        ${JSON.stringify(assessment.missingInputs)}::jsonb,
        ${JSON.stringify(assessment.clarifyingQuestions)}::jsonb,
        ${JSON.stringify(assessment.proposedSteps)}::jsonb,
        ${JSON.stringify(assessment.definitionOfDone)}::jsonb,
        ${assessment.riskLevel}
      )
      RETURNING id
    `;

    const [run] = await tx<{ id: number }[]>`
      INSERT INTO workflow_runs (
        project_id,
        scope_assessment_id,
        template_key,
        template_label,
        status,
        original_command,
        total_steps,
        agent,
        working_dir,
        definition_of_done
      )
      VALUES (
        ${project.id},
        ${assessmentRow.id},
        ${assessment.templateKey},
        ${assessment.templateLabel},
        'queued',
        ${commandBody},
        ${assessment.proposedSteps.length},
        ${agent},
        ${project.working_directory},
        ${JSON.stringify(assessment.definitionOfDone)}::jsonb
      )
      RETURNING id
    `;

    const stepRows: { id: number; step_index: number; title: string; prompt: string }[] = [];
    for (const [index, step] of assessment.proposedSteps.entries()) {
      const title = step.split(":")[0]?.trim() || `Step ${index + 1}`;
      const [stepRow] = await tx<{ id: number; step_index: number; title: string; prompt: string }[]>`
        INSERT INTO workflow_steps (workflow_run_id, project_id, step_index, title, prompt)
        VALUES (${run.id}, ${project.id}, ${index}, ${title}, ${step})
        RETURNING id, step_index, title, prompt
      `;
      stepRows.push(stepRow);
    }

    const firstStep = stepRows[0];
    const commandBodyForAgent = firstStep ? buildWorkflowStepCommand(commandBody, firstStep, assessment) : commandBody;
    const [command] = await tx<{ id: number }[]>`
      INSERT INTO commands (
        project_id,
        body,
        agent,
        working_dir,
        auto_log,
        scope_assessment_id,
        workflow_run_id,
        workflow_step_id
      )
      VALUES (
        ${project.id},
        ${commandBodyForAgent},
        ${agent},
        ${project.working_directory},
        ${autoLog},
        ${assessmentRow.id},
        ${run.id},
        ${firstStep?.id ?? null}
      )
      RETURNING id
    `;

    if (firstStep) {
      await tx`
        UPDATE workflow_steps
        SET command_id = ${command.id}, updated_at = NOW()
        WHERE id = ${firstStep.id}
      `;
    }

    return {
      commandId: command.id,
      workflowRunId: run.id,
      scopeAssessmentId: assessmentRow.id,
    };
  });
}

export async function advanceWorkflowAfterCommand({
  commandId,
  status,
  resultSummary,
}: {
  commandId: number;
  status: "completed" | "failed" | "blocked" | "needs_input" | "cancelled";
  resultSummary: string | null;
}) {
  const [current] = await sql<
    {
      id: number;
      project_id: number;
      agent: AgentKey;
      working_dir: string | null;
      auto_log: boolean;
      scope_assessment_id: number | null;
      workflow_run_id: number | null;
      workflow_step_id: number | null;
      original_command: string | null;
      template_label: string | null;
      definition_of_done: unknown;
    }[]
  >`
    SELECT
      c.id,
      c.project_id,
      c.agent,
      c.working_dir,
      c.auto_log,
      c.scope_assessment_id,
      c.workflow_run_id,
      c.workflow_step_id,
      wr.original_command,
      wr.template_label,
      wr.definition_of_done
    FROM commands c
    LEFT JOIN workflow_runs wr ON wr.id = c.workflow_run_id
    WHERE c.id = ${commandId}
  `;

  if (!current?.workflow_run_id || !current.workflow_step_id) {
    return { queuedNextCommandId: null };
  }

  return sql.begin(async (tx) => {
    await tx`
      UPDATE workflow_steps
      SET
        status = ${status},
        result_summary = ${resultSummary},
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${current.workflow_step_id}
    `;

    if (status !== "completed") {
      await tx`
        UPDATE workflow_runs
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${current.workflow_run_id}
      `;
      return { queuedNextCommandId: null };
    }

    const [nextStep] = await tx<{ id: number; step_index: number; title: string; prompt: string }[]>`
      SELECT id, step_index, title, prompt
      FROM workflow_steps
      WHERE workflow_run_id = ${current.workflow_run_id}
        AND status = 'queued'
      ORDER BY step_index ASC
      LIMIT 1
      FOR UPDATE
    `;

    if (!nextStep) {
      await tx`
        UPDATE workflow_runs
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = ${current.workflow_run_id}
      `;
      return { queuedNextCommandId: null };
    }

    await tx`
      UPDATE workflow_runs
      SET status = 'running', current_step_index = ${nextStep.step_index}, updated_at = NOW()
      WHERE id = ${current.workflow_run_id}
    `;

    const assessment = {
      templateLabel: current.template_label,
      definitionOfDone: normalizeStringArray(current.definition_of_done),
    };
    const commandBodyForAgent = buildWorkflowStepCommand(current.original_command ?? nextStep.prompt, nextStep, assessment);
    const [nextCommand] = await tx<{ id: number }[]>`
      INSERT INTO commands (
        project_id,
        body,
        agent,
        working_dir,
        auto_log,
        scope_assessment_id,
        workflow_run_id,
        workflow_step_id
      )
      VALUES (
        ${current.project_id},
        ${commandBodyForAgent},
        ${current.agent},
        ${current.working_dir},
        ${current.auto_log},
        ${current.scope_assessment_id},
        ${current.workflow_run_id},
        ${nextStep.id}
      )
      RETURNING id
    `;

    await tx`
      UPDATE workflow_steps
      SET command_id = ${nextCommand.id}, updated_at = NOW()
      WHERE id = ${nextStep.id}
    `;

    return { queuedNextCommandId: nextCommand.id };
  });
}

function buildWorkflowStepCommand(
  originalCommand: string,
  step: { step_index: number; title: string; prompt: string },
  assessment: Pick<ScopeAssessment, "templateLabel" | "definitionOfDone">,
) {
  const done = assessment.definitionOfDone.length > 0 ? assessment.definitionOfDone.map((item) => `- ${item}`).join("\n") : "- Report what was verified";
  return `Workflow: ${assessment.templateLabel ?? "Praxia workflow"}
Step ${step.step_index + 1}: ${step.title}

Original request:
${originalCommand}

Current step instruction:
${step.prompt}

Definition of done:
${done}

Complete only this step. If the step requires human input or access you do not have, stop and report needs_input or blocked in the Praxia report.`;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
