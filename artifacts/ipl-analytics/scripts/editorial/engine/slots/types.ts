import type { A, Draft } from "../core";

export interface SlotSpec {
  /** Position in each franchise's 100-title plan (1–100). */
  n: number;
  storyType: NonNullable<Draft["storyType"]>;
  build(a: A): Draft;
}

/** Standard hypothesis helper. */
export const hyp = (id: string, statement: string, whyUnverified: string, howToTest: string) => ({ id, statement: `Hypothesis: ${statement}`, whyUnverified, howToTest });

/** Clamp an SEO meta title to the 70-character schema limit. */
export const metaTitle = (s: string) => (s.length <= 70 ? s : `${s.slice(0, 66).replace(/\s+\S*$/, "")} | CF`);
/** Clamp/pad a meta description into the 70–170 character range. */
export const metaDesc = (s: string) => {
  const t = s.length > 170 ? `${s.slice(0, 166).replace(/\s+\S*$/, "")}…` : s;
  return t.length >= 70 ? t : `${t} CricField analysis from IPL ball-by-ball data, 2008–2026.`;
};
