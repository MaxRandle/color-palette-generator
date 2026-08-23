"use client";

import { useState } from "react";

type Outcome = "idle" | "copied" | "failed";

const MESSAGE: Record<Outcome, string | null> = {
  idle: null,
  copied: "Copied",
  failed: "Copy failed",
};

/** Copies a block of text to the clipboard, reporting briefly how it went. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [outcome, setOutcome] = useState<Outcome>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setOutcome("copied");
    } catch {
      // Denied permission or no clipboard API; the text stays selectable.
      setOutcome("failed");
    }
    setTimeout(() => setOutcome("idle"), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {MESSAGE[outcome] ?? label}
      </button>
      {/* Announced separately: a focused button's changing name is not reliably read out. */}
      <span aria-live="polite" className="sr-only">
        {MESSAGE[outcome]}
      </span>
    </>
  );
}
