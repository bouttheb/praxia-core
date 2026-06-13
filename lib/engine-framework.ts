// Engine Framework — the blueprint registry for client-facing engines.
//
// An "engine" is a client-facing product surface inside a Praxia workspace:
// one org, one landing page, deliverables (videos / summaries / memos)
// published to storage with a manifest, and a chat agent that speaks the
// client's domain language while doing its engineering backstage.
//
// This registry is the single place an engine is described. Nav chrome,
// deliverable loading, publishing, the agent doctrine, and preflight checks
// all key off the blueprint, so standing up a new engine is: add a
// blueprint, provision the org/project, build a page, publish artifacts.
// See docs/ENGINE_FRAMEWORK.md for the full playbook.
//
// The EXAMPLE_FIELD_GUIDE_BLUEPRINT below is a worked, fictional example —
// replace it with your own engine's blueprint.

export type EnginePronouns = {
  subject: string; // "she" / "he" / "they"
  object: string; // "her" / "him" / "them"
  possessive: string; // "her" / "his" / "their"
};

export type EngineBlueprint = {
  /** Stable identifier, e.g. "acme-market-analysis". */
  key: string;
  /** Workspace (organization slug) that owns this engine. */
  orgSlug: string;
  /** Short workspace label for prose, e.g. "Acme". */
  workspaceLabel: string;
  /** Display name, e.g. "Analysis Engine". */
  name: string;
  /** Landing page route. Members open straight into this. */
  href: string;
  client: {
    /** First name of the primary end user, when there is one. */
    firstName: string | null;
    /** Who uses this engine, for agent prompts: "Acme's commodity buyer". */
    description: string;
    pronouns: EnginePronouns;
    /** Voice the chat agent answers in: "a market analyst answering a buyer in a meeting". */
    replyPersona: string;
    /** The domain adjective for prose: "market" (→ "market terms", "Market vocabulary"). */
    domainLabel: string;
    /** Domain vocabulary welcome in replies: "GTCs, RSI, divergence, ...". */
    domainVocabulary: string;
    /** Example sentence (quoted) showing how to describe an improvement as product behavior. */
    improvementExampleReply: string;
    /** Address for formal new-functionality requests. */
    escalationEmail: string;
  };
  /**
   * When true, a member (non-owner/admin) whose ONLY workspace is this org
   * gets no left nav and no mobile hamburger — the workspace opens straight
   * into the engine. Owners/admins always keep their chrome.
   */
  memberChromeless: boolean;
  deliverables: {
    /** What the engine ships, in the client's words: "the videos, summaries, or memos". */
    nouns: string;
    /** Shorthand for one deliverable cycle: "brief". */
    shortNoun: string;
    /** Plural shorthand: "briefs". */
    shortNounPlural: string;
    /** What counts as an in-scope improvement, spelled out for the agent. */
    improvementScope: string;
    /** What the engine produces, for the new-functionality boundary: "analysis and briefs". */
    outputDomain: string;
    /** Storage prefix all artifacts live under, ending with "/". */
    blobPrefix: string;
    /** Public manifest URL the hosted dashboard reads. Null until first publish. */
    manifestUrl: string | null;
    /** Daemon-side directories the publisher scans for --date stems. */
    localDirs: string[];
  };
  agent: {
    /** Working directory the daemon command runs in (the engine's pipeline repo). */
    workingDir: string;
    /** Full investigation paragraph for the doctrine prompt. */
    investigation: string;
    /** Directories the agent inspects before answering. */
    investigateDirs: string[];
    /** Optional trailing bullet after the directory list. */
    investigateExtra: string | null;
    /** Evidence the agent grounds answers in: "charts and data". */
    evidenceLabel: string;
    /** Short form used in "verify in the …": "chart/data". */
    evidenceLabelShort: string;
    /** Examples of new functionality that must escalate, in this engine's domain. */
    forbiddenCapabilityExamples: string;
    /** Script that quietly alerts the owner (e.g. banner + iMessage) without the client knowing. */
    notifyScript: string;
    /** Durable record of escalated requests. */
    escalationLogPath: string;
    /** Compounding learning log the agent reads before triage and appends after shipping. */
    feedbackLogPath: string;
  };
};

/**
 * Worked example — a fictional commodity-analysis engine for "Acme Produce".
 * Copy this shape for a real engine; every string here ends up either in the
 * client's UI or in the agent's behavioral contract, so write them with care.
 */
export const EXAMPLE_FIELD_GUIDE_BLUEPRINT: EngineBlueprint = {
  key: "acme-market-analysis",
  orgSlug: "acme-produce",
  workspaceLabel: "Acme",
  name: "Analysis Engine",
  href: "/engines/acme-market-analysis",
  client: {
    firstName: "Jordan",
    description: "Acme Produce's commodity buyer",
    pronouns: { subject: "they", object: "them", possessive: "their" },
    replyPersona: "a market analyst answering a buyer in a meeting",
    domainLabel: "market",
    domainVocabulary: "GTCs, RSI, divergence, liquidity, support/resistance, spreads, basis, candles, volume",
    improvementExampleReply:
      "'starting with the next brief, the summary will flag four-hour RSI divergence ahead of the entry call'",
    escalationEmail: "requests@example.com",
  },
  memberChromeless: true,
  deliverables: {
    nouns: "the videos, summaries, or memos",
    shortNoun: "brief",
    shortNounPlural: "briefs",
    improvementScope:
      "the videos, summaries, memos, and the analysis inside them (what the narration emphasizes, what the summary highlights or how it's structured, chart annotations, calling out signals they care about, fixing wrong brief content)",
    outputDomain: "analysis and briefs",
    blobPrefix: "acme/market-analysis-artifacts/",
    manifestUrl: null,
    localDirs: ["/home/owner/acme-brief-pipeline/output"],
  },
  agent: {
    workingDir: "/home/owner/acme-brief-pipeline",
    investigation:
      "Use the local environment to investigate the actual market/chart context before answering. Inspect the latest pipeline output, chart render, data files, and summary/fundamentals files. Do not answer from the dashboard tables alone. Work out: what the chart/data actually showed before the move, which signal was present/missed/underweighted, and what Jordan should watch next.",
    investigateDirs: ["/home/owner/acme-brief-pipeline/output"],
    investigateExtra: "Any chart/data/source files used by the brief pipeline for the date in question.",
    evidenceLabel: "charts and data",
    evidenceLabelShort: "chart/data",
    forbiddenCapabilityExamples:
      "auto-trading or automated order execution, placing or managing live orders, booking freight, making purchases, sending messages on their behalf",
    notifyScript: "/home/owner/acme-brief-pipeline/scripts/notify.sh",
    escalationLogPath: "/home/owner/acme-brief-pipeline/docs/client-escalations.md",
    feedbackLogPath: "/home/owner/acme-brief-pipeline/docs/client-feedback-log.md",
  },
};

/**
 * Register real engines here. The example blueprint is intentionally NOT
 * registered — it exists as a template.
 */
const ENGINE_BLUEPRINTS: EngineBlueprint[] = [];

export function getEngineBlueprint(key: string | null | undefined) {
  if (!key) return null;
  return ENGINE_BLUEPRINTS.find((blueprint) => blueprint.key === key) ?? null;
}

export function getEngineBlueprintByOrgSlug(slug: string | null | undefined) {
  if (!slug) return null;
  return ENGINE_BLUEPRINTS.find((blueprint) => blueprint.orgSlug === slug) ?? null;
}

export function listEngineBlueprints() {
  return [...ENGINE_BLUEPRINTS];
}
