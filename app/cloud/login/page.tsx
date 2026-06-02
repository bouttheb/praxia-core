import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function CloudLoginPage() {
  return (
    <AppShell loadNavAreas={false}>
      <main className="flex-1 min-w-0 overflow-y-auto cockpit-scroll">
        <div className="px-6 lg:px-10 py-8 max-w-[760px] mx-auto">
          <header className="mb-8">
            <div className="eyebrow">Praxia Cloud</div>
            <h1 className="serif text-4xl mt-2">Sign in</h1>
            <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--color-ink-mute)" }}>
              Hosted login will restore the workspace dashboard, active daemon devices, and billing state.
            </p>
          </header>

          <form className="surface-solid p-5 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input className="input mt-2 w-full" type="email" placeholder="you@example.com" />
            </label>
            <button type="button" className="btn btn-primary" disabled>
              Magic link API next
            </button>
            <div className="text-sm" style={{ color: "var(--color-ink-mute)" }}>
              New to Praxia Cloud? <Link href="/cloud/signup" className="font-semibold" style={{ color: "var(--color-accent)" }}>Create a workspace</Link>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  );
}
