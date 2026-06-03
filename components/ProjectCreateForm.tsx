"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { agentOptions, type AgentKey } from "@/lib/agents";

export function ProjectCreateForm() {
  const router = useRouter();
  const [areaName, setAreaName] = useState("Personal Projects");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [agent, setAgent] = useState<AgentKey>("claude");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ areaName, name, description, workingDirectory, agent }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setStatus("done");
      setName("");
      setDescription("");
      setWorkingDirectory("");
      router.refresh();
      router.push("/");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not create project.");
    }
  }

  return (
    <form onSubmit={submit} className="surface-solid p-5 space-y-4">
      <div>
        <div className="eyebrow">Add project</div>
        <h2 className="serif text-2xl mt-2">Connect a local repo</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          Project group
          <input className="input mt-2 w-full" value={areaName} onChange={(event) => setAreaName(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Project name
          <input className="input mt-2 w-full" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Description
        <input className="input mt-2 w-full" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Working directory
        <input className="input mt-2 w-full font-mono text-sm" value={workingDirectory} onChange={(event) => setWorkingDirectory(event.target.value)} placeholder="/Users/me/code/my-app" />
      </label>
      <label className="block text-sm font-medium">
        Default agent
        <select className="input mt-2 w-full" value={agent} onChange={(event) => setAgent(event.target.value as AgentKey)}>
          {agentOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Adding..." : "Add project"}
      </button>
      {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </form>
  );
}
