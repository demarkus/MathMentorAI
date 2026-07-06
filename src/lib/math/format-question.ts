import { createElement, type ReactNode } from "react";

/**
 * Presentational formatting for math text (question text, answers, worked
 * steps). Three incremental transforms, applied only where the pattern is
 * unambiguous:
 * - caret exponents render as real superscripts — "x^2" → x<sup>2</sup>
 * - simple tight fractions render stacked — "1/2", "2/x", "6x/3" (spaced or
 *   compound forms like "x=2/x=3", "(x-9)/(x-3)", "0.5/2" are left as text)
 * - square roots render with an overlined radicand — "√16", "√(x+2)"
 *
 * Purely a string-to-React-node transform: nothing is evaluated, no HTML is
 * parsed (never dangerouslySetInnerHTML), and anything unrecognised passes
 * through unchanged. Every rendered construct carries an aria-label with the
 * spoken form, with the visual parts aria-hidden.
 */

const EXPONENT_RE = /\^(-?\d+|-?[a-z])/g;
// Numerator/denominator: up to three digits with an optional trailing variable
// ("6x"), or a bare variable. Anything richer is ambiguous and stays text.
const FRACTION_RE = /(\d{1,3}[a-z]?|[a-z])\/(\d{1,3}[a-z]?|[a-z])/g;
const SQRT_RE = /√\(([^()]{1,24})\)|√([0-9a-z]{1,3})/g;

type NextKey = () => number;

/** Applies a string transform to the string segments, leaving elements alone. */
function mapStrings(nodes: ReactNode[], transform: (text: string) => ReactNode[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (const node of nodes) {
    if (typeof node === "string") out.push(...transform(node));
    else out.push(node);
  }
  return out;
}

function splitExponents(source: string, nextKey: NextKey): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  EXPONENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EXPONENT_RE.exec(source)) !== null) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    nodes.push(createElement("sup", { key: nextKey() }, match[1]));
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

const FRACTION_STYLE = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  verticalAlign: "middle",
  lineHeight: "1.2",
  fontSize: "0.85em",
  margin: "0 0.1em",
} as const;

function fractionElement(numerator: string, denominator: string, key: number): ReactNode {
  return createElement(
    "span",
    { key, "aria-label": `${numerator} over ${denominator}`, style: FRACTION_STYLE },
    createElement(
      "span",
      { "aria-hidden": true, style: { padding: "0 0.25em", borderBottom: "1px solid currentColor" } },
      numerator,
    ),
    createElement("span", { "aria-hidden": true, style: { padding: "0 0.25em" } }, denominator),
  );
}

function splitFractions(source: string, nextKey: NextKey): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  FRACTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FRACTION_RE.exec(source)) !== null) {
    const before = source[match.index - 1];
    const after = source[match.index + match[0].length];
    const afterNext = source[match.index + match[0].length + 1];
    // Left boundary: mid-token ("6x" in "16x/3" is fine — the 1 is consumed by
    // the match — but "0.5/2" or "x^2/3" must stay text).
    const beforeBlocked = before !== undefined && /[0-9a-z)^.]/.test(before);
    // Right boundary: "x=2/x=3" is a root list, not a fraction; "3/2.5" would
    // orphan the ".5". A sentence-final period ("Answer: 5/x.") is fine.
    const afterBlocked =
      after !== undefined &&
      (/[0-9a-z(=^]/.test(after) || (after === "." && afterNext !== undefined && /\d/.test(afterNext)));
    if (beforeBlocked || afterBlocked) continue;

    if (match.index > last) nodes.push(source.slice(last, match.index));
    nodes.push(fractionElement(match[1], match[2], nextKey()));
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

function splitRoots(source: string, nextKey: NextKey): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  SQRT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SQRT_RE.exec(source)) !== null) {
    const radicand = match[1] ?? match[2];
    if (match.index > last) nodes.push(source.slice(last, match.index));
    nodes.push(
      createElement(
        "span",
        { key: nextKey(), "aria-label": `the square root of ${radicand}`, style: { whiteSpace: "nowrap" } },
        createElement("span", { "aria-hidden": true }, "√"),
        createElement(
          "span",
          { "aria-hidden": true, style: { borderTop: "1px solid currentColor", padding: "0 0.15em" } },
          // Exponents inside the radicand still format: "√(x^2+9)".
          splitExponents(radicand, nextKey),
        ),
      ),
    );
    last = match.index + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

export function formatQuestion(text: string): ReactNode {
  try {
    const source = String(text ?? "");
    let key = 0;
    const nextKey: NextKey = () => key++;

    let nodes: ReactNode[] = [source];
    nodes = mapStrings(nodes, (segment) => splitRoots(segment, nextKey));
    nodes = mapStrings(nodes, (segment) => splitExponents(segment, nextKey));
    nodes = mapStrings(nodes, (segment) => splitFractions(segment, nextKey));

    // No math constructs found — hand back the plain string (also covers "").
    if (nodes.every((node) => typeof node === "string")) return nodes.join("");
    return nodes;
  } catch {
    // Formatting is cosmetic only — never let it take down a question render.
    return text;
  }
}
