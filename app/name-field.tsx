"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useDraft } from "./use-draft";

type NameFieldProps = {
  /** Both the field's label and the id it is labelled by, which must be unique. */
  id: string;
  label: string;
  /** The name the Palette actually holds, which the field falls back to on blur. */
  name: string;
  /** Why a name cannot be committed, or null. Asked of what is typed, not of
   * what the Palette holds, so the message tracks the field rather than lagging
   * a keystroke behind it. */
  errorFor: (name: string) => string | null;
  onRename: (name: string) => void;
  /** Whether the thing can be removed at all, and what to say when it cannot. */
  removable: boolean;
  removeLabel: string;
  onRemove: () => void;
  /**
   * Whether this name was just minted, and so is the one thing worth typing
   * first: the field takes focus with it selected. The caller keys this
   * component by the thing it names, so a mint arrives as a fresh field and the
   * handoff happens on mount.
   */
  claiming?: boolean;
  /** A control belonging in the same row, before the field. */
  children?: ReactNode;
  /** The field is a CSS identifier, and reads as one. */
  mono?: boolean;
};

/**
 * What something in the Palette is called, and the control that removes it.
 *
 * Shared by the two things the user names — a Spectrum and a Chroma profile —
 * because naming them is the same act, down to the awkward parts: the draft
 * that keeps invalid text on screen while refusing to commit it, the fall back
 * to the committed name on blur, and the handoff that puts a minted name in the
 * field with its text selected. Copying those would leave two of each to keep
 * in step.
 *
 * `aria-disabled` rather than `disabled` throughout: a control that cannot act
 * still says why, and stays reachable by keyboard to say it.
 */
export function NameField({
  id,
  label,
  name,
  errorFor,
  onRename,
  removable,
  removeLabel,
  onRemove,
  claiming = false,
  children,
  mono = false,
}: NameFieldProps) {
  const draft = useDraft(name);
  const error = errorFor(draft.text);
  const field = useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  /** Whether the handoff has already happened, so it happens once. */
  const claimed = useRef(false);

  // After the render rather than during the action that minted: the field
  // shows the committed name, so selecting its text any earlier would select
  // the name of whatever was copied.
  useEffect(() => {
    if (!claiming || claimed.current) return;
    claimed.current = true;
    field.current?.focus();
    field.current?.select();
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {children}
        <input
          id={id}
          ref={field}
          type="text"
          value={draft.text}
          onChange={(event) => {
            draft.type(event.target.value);
            onRename(event.target.value);
          }}
          onBlur={draft.reset}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className={`w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm aria-invalid:border-red-500 dark:border-zinc-700 ${
            mono ? "font-mono" : ""
          }`}
        />
        <button
          type="button"
          aria-disabled={!removable}
          aria-label={removeLabel}
          onClick={onRemove}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
      {/* Announced as it appears: the field is focused while the error changes. */}
      <p
        id={errorId}
        role="alert"
        className="min-h-5 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </p>
    </div>
  );
}
