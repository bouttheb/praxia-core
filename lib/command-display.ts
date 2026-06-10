const SITE_BUILD_PREFIX = "You are building a brand-new website for SiteLauncher";
const WHAT_TO_BUILD_MARKER = "WHAT TO BUILD:";
const DESIGN_MARKERS = ["DESIGN DIRECTION", "DESIGN BAR", "OUTPUT REQUIREMENTS", "BUILD INSTRUCTIONS"];

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function extractSiteLauncherBuildRequest(body: string) {
  const markerIndex = body.indexOf(WHAT_TO_BUILD_MARKER);
  if (markerIndex === -1) return null;

  const afterMarker = body.slice(markerIndex + WHAT_TO_BUILD_MARKER.length);
  const nextMarkerIndex = DESIGN_MARKERS
    .map((marker) => afterMarker.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const section = nextMarkerIndex == null ? afterMarker : afterMarker.slice(0, nextMarkerIndex);
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^Build type:/i.test(line) && !line.startsWith("-"));

  return compactWhitespace(lines.join(" "));
}

export function commandPreview(body: string, maxLength = 180) {
  const trimmed = body.trim();
  if (!trimmed) return "Command request";

  if (trimmed.startsWith(SITE_BUILD_PREFIX)) {
    const request = extractSiteLauncherBuildRequest(trimmed);
    return request ? truncate(`Build site: ${request}`, maxLength) : "SiteLauncher website build request.";
  }

  return truncate(compactWhitespace(trimmed), maxLength);
}

export function shouldShowCommandDetails(status: string, error: string | null, result: string | null) {
  return Boolean(error || (result && ["failed", "blocked", "needs_input"].includes(status)));
}
