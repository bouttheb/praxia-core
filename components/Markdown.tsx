"use client";

import { isValidElement, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeEl = Array.isArray(children) ? children[0] : children;
  const className = isValidElement<{ className?: string }>(codeEl) ? codeEl.props.className ?? "" : "";
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? "";
  const raw = extractText(children).replace(/\n$/, "");

  function copy() {
    void navigator.clipboard?.writeText(raw).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="rounded-[10px] overflow-hidden group/code"
      style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)" }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: "var(--color-line)" }}
      >
        <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--color-ink-faint)" }}>
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] font-medium opacity-0 group-hover/code:opacity-100 transition-opacity"
          style={{ color: copied ? "var(--color-success)" : "var(--color-ink-faint)" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="font-mono text-[0.85em] p-3 overflow-x-auto leading-relaxed">
        <code className="block whitespace-pre">{raw}</code>
      </pre>
    </div>
  );
}

// Chat-sized markdown rendering styled with the app's CSS variables, so agent
// replies read like a real chat message instead of raw **asterisks**.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="praxia-markdown space-y-3 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--color-accent)" }}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--color-ink)" }}>{children}</strong>,
          h1: ({ children }) => <h3 className="font-semibold text-[1.05em] mt-1">{children}</h3>,
          h2: ({ children }) => <h3 className="font-semibold text-[1.02em] mt-1">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold mt-1">{children}</h4>,
          h4: ({ children }) => <h4 className="font-semibold mt-1">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-3 italic"
              style={{ borderColor: "var(--color-line-strong)", color: "var(--color-ink-faint)" }}
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr style={{ borderColor: "var(--color-line)" }} />,
          code: ({ className, children }) => {
            const isBlock = typeof className === "string" && className.includes("language-");
            if (isBlock) {
              return <code className="block whitespace-pre overflow-x-auto">{children}</code>;
            }
            return (
              <code
                className="font-mono text-[0.88em] px-1.5 py-0.5 rounded-[6px]"
                style={{ background: "var(--color-bg-sunken)", border: "1px solid var(--color-line)" }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="text-[0.92em] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left font-semibold px-2 py-1 border" style={{ borderColor: "var(--color-line)" }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border align-top" style={{ borderColor: "var(--color-line)" }}>
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
