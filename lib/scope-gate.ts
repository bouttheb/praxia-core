import { findWorkflowTemplate, type WorkflowTemplate, type WorkflowTemplateKey } from "@/lib/workflow-templates";

export type ScopeDecision = "execute" | "clarify" | "split" | "reject";
export type ScopeRiskLevel = "low" | "medium" | "high";

export type ScopeGateInput = {
  projectName: string;
  projectDescription: string | null;
  projectVision: string | null;
  latestToday: string | null;
  latestTomorrow: string | null;
  completionPercent: number;
  commandBody: string;
};

export type ScopeAssessment = {
  decision: ScopeDecision;
  confidence: number;
  templateKey: WorkflowTemplateKey | null;
  templateLabel: string | null;
  summary: string;
  missingInputs: string[];
  clarifyingQuestions: string[];
  proposedSteps: string[];
  definitionOfDone: string[];
  riskLevel: ScopeRiskLevel;
};

const destructivePattern = /\b(delete|drop|destroy|wipe|erase|purge|reset)\b.*\b(prod|production|database|db|all|users|customers|billing)\b/i;
const broadPattern =
  /\b(entire|complete|full|whole|all[-\s]?in[-\s]?one|platform|operating system|everything|from scratch|end[-\s]?to[-\s]?end)\b/i;
const vaguePattern = /\b(make it better|improve|fix this|handle this|do the thing|next level|clean up|optimi[sz]e)\b/i;
const humanOnlyPattern = /\b(sign up|buy|purchase|billing|mfa|2fa|two[-\s]?factor|credit card|bank|domain transfer)\b/i;

export function assessScope(input: ScopeGateInput): ScopeAssessment {
  const commandBody = input.commandBody.trim();
  const template = findWorkflowTemplate(commandBody);
  const missingInputs = findMissingInputs(commandBody, template);
  const proposedSteps = buildProposedSteps(commandBody, template);
  const definitionOfDone = template.doneCriteria;

  if (destructivePattern.test(commandBody)) {
    return {
      decision: "reject",
      confidence: 0.92,
      templateKey: null,
      templateLabel: null,
      summary: "This request appears destructive or production-impacting and needs explicit manual handling before Praxia queues an agent.",
      missingInputs: ["explicit target", "backup/rollback plan", "human approval"],
      clarifyingQuestions: ["What exact resource should be changed, and what rollback plan should Praxia verify first?"],
      proposedSteps: ["Confirm target and backup", "Create a rollback plan", "Run a read-only inspection before any change"],
      definitionOfDone: ["No destructive action runs without explicit approval"],
      riskLevel: "high",
    };
  }

  if (shouldSplit(commandBody)) {
    return {
      decision: "split",
      confidence: 0.78,
      templateKey: template.key,
      templateLabel: template.label,
      summary: `This is larger than one safe agent run. Praxia should split it into a ${template.label.toLowerCase()} workflow with bounded milestones before execution.`,
      missingInputs,
      clarifyingQuestions: [
        "Which milestone should Praxia execute first?",
        "What outcome would count as done for this first milestone?",
      ],
      proposedSteps,
      definitionOfDone,
      riskLevel: "high",
    };
  }

  if (shouldClarify(commandBody, missingInputs)) {
    return {
      decision: "clarify",
      confidence: 0.72,
      templateKey: template.key,
      templateLabel: template.label,
      summary: `Praxia can likely use the ${template.label.toLowerCase()} workflow, but the request needs tighter inputs before dispatch.`,
      missingInputs,
      clarifyingQuestions: buildClarifyingQuestions(missingInputs, template),
      proposedSteps,
      definitionOfDone,
      riskLevel: humanOnlyPattern.test(commandBody) ? "high" : "medium",
    };
  }

  return {
    decision: "execute",
    confidence: 0.84,
    templateKey: template.key,
    templateLabel: template.label,
    summary: `This is scoped enough to queue as a ${template.label.toLowerCase()} workflow.`,
    missingInputs: [],
    clarifyingQuestions: [],
    proposedSteps,
    definitionOfDone,
    riskLevel: humanOnlyPattern.test(commandBody) ? "medium" : "low",
  };
}

function shouldSplit(commandBody: string) {
  const wordCount = commandBody.split(/\s+/).filter(Boolean).length;
  return broadPattern.test(commandBody) || wordCount > 140;
}

function shouldClarify(commandBody: string, missingInputs: string[]) {
  return commandBody.length < 18 || vaguePattern.test(commandBody) || humanOnlyPattern.test(commandBody) || missingInputs.length >= 2;
}

function findMissingInputs(commandBody: string, template: WorkflowTemplate) {
  const lower = commandBody.toLowerCase();
  return template.requiredInputs.filter((input) => {
    if (input.includes("target") || input.includes("affected") || input.includes("where")) {
      return !/\b(app|page|api|route|component|project|repo|dashboard|daemon|database|schema|ui|flow|feature)\b/i.test(lower);
    }
    if (input.includes("acceptance") || input.includes("done") || input.includes("approval")) {
      return !/\b(done|pass|verify|should|must|when|so that|acceptance)\b/i.test(lower);
    }
    if (input.includes("environment") || input.includes("provider")) {
      return !/\b(prod|production|preview|local|vercel|netlify|docker|server)\b/i.test(lower);
    }
    if (input.includes("credentials") || input.includes("secret")) {
      return /api|stripe|clerk|supabase|github|gmail|openai|twilio/i.test(lower) && !/\b(env|token|key|configured|already)\b/i.test(lower);
    }
    return false;
  });
}

function buildClarifyingQuestions(missingInputs: string[], template: WorkflowTemplate) {
  const questions = missingInputs.map((input) => `What is the ${input} for this ${template.label.toLowerCase()}?`);
  if (questions.length === 0) {
    questions.push("What specific outcome should Praxia produce in this run?");
  }
  return questions.slice(0, 3);
}

function buildProposedSteps(commandBody: string, template: WorkflowTemplate) {
  const quotedRequest = commandBody.length > 220 ? `${commandBody.slice(0, 217)}...` : commandBody;
  return template.defaultSteps.map((step, index) => `${step}: ${index === 0 ? quotedRequest : "continue from the prior step"}`);
}
