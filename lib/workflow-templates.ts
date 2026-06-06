export type WorkflowTemplateKey =
  | "bugfix"
  | "feature"
  | "deployment"
  | "audit"
  | "integration"
  | "landing_page"
  | "content_pipeline"
  | "data_import"
  | "research_plan"
  | "client_engine_setup";

export type WorkflowTemplate = {
  key: WorkflowTemplateKey;
  label: string;
  description: string;
  requiredInputs: string[];
  defaultSteps: string[];
  doneCriteria: string[];
  matchers: RegExp[];
};

export const workflowTemplates: WorkflowTemplate[] = [
  {
    key: "bugfix",
    label: "Bug Fix",
    description: "Diagnose a failing behavior, patch it, and verify the fix.",
    requiredInputs: ["the failure or symptom", "where it happens"],
    defaultSteps: ["Inspect the failure and relevant code", "Implement the smallest clear fix", "Run targeted verification"],
    doneCriteria: ["Root cause is summarized", "Fix is implemented", "Relevant checks pass"],
    matchers: [/bug|fix|broken|error|fail|crash|regression|not working/i],
  },
  {
    key: "feature",
    label: "Feature Build",
    description: "Build a bounded product or code feature.",
    requiredInputs: ["target behavior", "affected area", "acceptance criteria"],
    defaultSteps: ["Inspect the current implementation", "Implement the requested feature", "Run build or tests and report changes"],
    doneCriteria: ["Requested behavior exists", "No unrelated files changed", "Build or targeted checks pass"],
    matchers: [/add|build|implement|create|wire|support|enable/i],
  },
  {
    key: "deployment",
    label: "Deployment",
    description: "Prepare, run, or inspect a deployment flow.",
    requiredInputs: ["target environment", "deployment provider or command"],
    defaultSteps: ["Inspect deployment configuration", "Run the deployment or readiness check", "Verify deployment status"],
    doneCriteria: ["Deployment target is clear", "Deployment status is reported", "Follow-up blockers are explicit"],
    matchers: [/deploy|vercel|netlify|hosting|production|preview|release/i],
  },
  {
    key: "audit",
    label: "Audit",
    description: "Review code, security, architecture, or behavior and produce findings.",
    requiredInputs: ["audit target", "risk area or review goal"],
    defaultSteps: ["Map the relevant surface area", "Identify findings and evidence", "Recommend prioritized fixes"],
    doneCriteria: ["Findings include evidence", "Severity is clear", "Next actions are prioritized"],
    matchers: [/audit|review|inspect|assess|security|risks?|findings/i],
  },
  {
    key: "integration",
    label: "Integration",
    description: "Connect an external service or internal module.",
    requiredInputs: ["service or module", "credentials/setup status", "expected data flow"],
    defaultSteps: ["Inspect existing integration points", "Implement the connection", "Verify the integration path"],
    doneCriteria: ["Integration path is documented", "Missing secrets are listed", "Verification result is reported"],
    matchers: [/integrat|api|webhook|stripe|clerk|supabase|github|gmail|openai|twilio/i],
  },
  {
    key: "landing_page",
    label: "Landing Page",
    description: "Create or improve a bounded public-facing page.",
    requiredInputs: ["audience", "offer or product", "primary action"],
    defaultSteps: ["Inspect app design conventions", "Implement page content and layout", "Run visual/build verification"],
    doneCriteria: ["Page communicates the offer", "Primary action is present", "Responsive layout is verified"],
    matchers: [/landing|homepage|hero|website|marketing page|sales page/i],
  },
  {
    key: "content_pipeline",
    label: "Content Pipeline",
    description: "Set up a repeatable content or publishing workflow.",
    requiredInputs: ["content source", "publishing destination", "approval rules"],
    defaultSteps: ["Map the content workflow", "Implement the repeatable pipeline", "Verify with a sample item"],
    doneCriteria: ["Inputs and outputs are clear", "Pipeline can be repeated", "Sample run is verified"],
    matchers: [/content|podcast|publish|episode|newsletter|social/i],
  },
  {
    key: "data_import",
    label: "Data Import",
    description: "Import, normalize, or validate project data.",
    requiredInputs: ["source format", "destination", "dedupe or validation rules"],
    defaultSteps: ["Inspect source and target schemas", "Implement import/normalization", "Run a validation sample"],
    doneCriteria: ["Data mapping is clear", "Validation is reported", "Failures are explainable"],
    matchers: [/import|csv|spreadsheet|airtable|migrate|normalize|data/i],
  },
  {
    key: "research_plan",
    label: "Research Plan",
    description: "Turn an open question into a bounded research answer and next steps.",
    requiredInputs: ["research question", "decision the research informs"],
    defaultSteps: ["Clarify the decision and assumptions", "Gather evidence", "Summarize recommendation and uncertainties"],
    doneCriteria: ["Sources or evidence are identified", "Recommendation is explicit", "Uncertainty is named"],
    matchers: [/research|compare|evaluate|options|recommend|market|competitor/i],
  },
  {
    key: "client_engine_setup",
    label: "Client Engine Setup",
    description: "Scope and prepare a repeatable operating engine for a client or organization.",
    requiredInputs: ["client type", "operating workflow", "human approval points"],
    defaultSteps: ["Scope the engine and user roles", "Create the setup plan and templates", "Queue first implementation tasks"],
    doneCriteria: ["Engine scope is bounded", "Approval points are documented", "First tasks are actionable"],
    matchers: [/engine|client|church|company|business|operator|operations/i],
  },
];

export function findWorkflowTemplate(commandBody: string) {
  return workflowTemplates.find((template) => template.matchers.some((matcher) => matcher.test(commandBody))) ?? workflowTemplates[1];
}

export function getWorkflowTemplate(key: string | null | undefined) {
  return workflowTemplates.find((template) => template.key === key) ?? null;
}
