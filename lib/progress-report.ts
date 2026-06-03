export type PraxiaProgressReport = {
  summary: string | null;
  next: string | null;
  completionPercent: number | null;
  scopeChanged: boolean | null;
  docsUpdated: boolean | null;
};

const REPORT_BLOCK = /PRAXIA_REPORT\s*([\s\S]*?)\s*END_PRAXIA_REPORT/i;

export function parsePraxiaProgressReport(output: string | null | undefined): PraxiaProgressReport | null {
  if (!output) return null;
  const match = output.match(REPORT_BLOCK);
  if (!match) return null;

  const fields = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s*([a-zA-Z_ -]+)\s*:\s*(.*?)\s*$/);
    if (!item) continue;
    const key = item[1].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
    fields.set(key, item[2]);
  }

  return {
    summary: clean(fields.get("summary") ?? fields.get("today")),
    next: clean(fields.get("next") ?? fields.get("tomorrow") ?? fields.get("next_step")),
    completionPercent: parsePercent(fields.get("completion_percent") ?? fields.get("progress")),
    scopeChanged: parseBool(fields.get("scope_changed")),
    docsUpdated: parseBool(fields.get("docs_updated")),
  };
}

export function clampCompletionPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 4000) : null;
}

function parsePercent(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/\d{1,3}/);
  if (!match) return null;
  return clampCompletionPercent(Number(match[0]));
}

function parseBool(value: string | undefined) {
  if (!value) return null;
  if (/^(yes|true|y|1)$/i.test(value.trim())) return true;
  if (/^(no|false|n|0)$/i.test(value.trim())) return false;
  return null;
}
