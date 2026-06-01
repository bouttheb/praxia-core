"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

type AreaNavItem = {
  id: number;
  name: string;
};

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    iconPath: "M3 11l9-8 9 8M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9",
  },
  {
    href: "/chat",
    label: "Command",
    iconPath: "M21 12a8 8 0 01-11.4 7.3L3 21l1.7-6.6A8 8 0 1121 12z",
  },
  {
    href: "/runs",
    label: "Runs",
    iconPath: "M4 5h16M4 12h16M4 19h16",
  },
  {
    href: "/setup",
    label: "Setup",
    iconPath: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  },
  {
    href: "/cloud",
    label: "Cloud",
    iconPath: "M17.5 18H7a4 4 0 01-.9-7.9 5.5 5.5 0 0110.5-1.9A4.8 4.8 0 1117.5 18z",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function LeftNav({ areas }: { areas: AreaNavItem[] }) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const inner = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4">
        <Link href="/" aria-label="Praxia Core home" className="block">
          <Logo height={26} priority={false} />
        </Link>
      </div>

      <nav className="px-3 cockpit-scroll overflow-y-auto flex-1 pb-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-item ${active ? "is-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.iconPath} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {areas.length > 0 && (
          <div className="mt-6">
            <div className="eyebrow px-3 mb-2">Areas</div>
            <ul className="space-y-0.5">
              {areas.slice(0, 10).map((area) => (
                <li key={area.id}>
                  <Link
                    href={`/#area-${area.id}`}
                    className="nav-item text-[0.82rem]"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{ width: 6, height: 6, background: "var(--color-ink-faint)" }}
                    />
                    <span className="truncate">{area.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div
        className="px-5 py-4 mx-3 mb-3 rounded-[14px]"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-line)",
          backdropFilter: "saturate(140%) blur(8px)",
          WebkitBackdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="ai-pulse" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--color-success)" }}>
            Local-first
          </span>
        </div>
        <div className="text-[11px] leading-snug" style={{ color: "var(--color-ink-mute)" }}>
          Queue work from here. Your paired machine executes it.
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 rounded-full w-9 h-9 flex items-center justify-center"
        style={{
          background: "var(--color-bg-elevated-solid)",
          border: "1px solid var(--color-line)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>

      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 h-full" style={{ borderRight: "1px solid var(--color-line)" }}>
        {inner}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(17,17,17,0.45)", backdropFilter: "blur(6px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[260px]"
            style={{ background: "var(--color-bg)", borderRight: "1px solid var(--color-line)" }}
          >
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}
