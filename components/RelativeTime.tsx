"use client";

export function staleness(iso: string | null): "fresh" | "stale" | "cold" | "new" {
  if (!iso) return "new";
  const ageMs = Date.now() - new Date(iso).getTime();
  const days = ageMs / 86_400_000;
  if (days <= 2) return "fresh";
  if (days <= 7) return "stale";
  return "cold";
}

export function RelativeTime({ iso }: { iso: string }) {
  const value = relativeTime(iso);
  return <span title={new Date(iso).toLocaleString()}>{value}</span>;
}

function relativeTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
