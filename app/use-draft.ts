"use client";

import { useState } from "react";

/**
 * What the user is typing, held apart from the committed value.
 *
 * Every field here edits a value the core seam normalizes — bounding Lightness
 * and Chroma, wrapping Hue, refusing an invalid prefix — so the committed value
 * is often not the text that produced it. Keeping the draft means a half-typed
 * "0." or "-" survives, and dropping it on blur is what makes a field read back
 * as what the Palette actually holds.
 */
export function useDraft(committed: string) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    /** The draft while the user is typing, otherwise the committed value. */
    text: draft ?? committed,
    type: setDraft,
    /** Drop the draft, so the field shows the committed value again. */
    reset: () => setDraft(null),
  };
}
