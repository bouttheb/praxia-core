const MONOGRAM_TONES: Array<{ bg: string; fg: string }> = [
  { bg: "var(--color-accent-soft)", fg: "var(--color-accent-strong)" },
  { bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  { bg: "var(--color-warn-soft)", fg: "var(--color-warn)" },
  { bg: "rgba(219, 39, 119, 0.10)", fg: "#be185d" },
  { bg: "rgba(13, 148, 136, 0.10)", fg: "#0f766e" },
];

function monogramTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return MONOGRAM_TONES[hash % MONOGRAM_TONES.length];
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Deterministic colored initials for a project — same name, same tone, everywhere.
export function Monogram({ name, size = 32 }: { name: string; size?: number }) {
  const tone = monogramTone(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-[10px] font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, background: tone.bg, color: tone.fg }}
    >
      {initials(name)}
    </span>
  );
}
