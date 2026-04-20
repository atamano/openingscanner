/**
 * PGN/SAN formatting helpers shared across scanner UI components.
 * Pure functions — no React dependencies.
 */

/**
 * Format the last move in a SAN path as `N. move` (White) or `N... move`
 * (Black), where N is derived from the combined ply count of `baseMoves` and
 * `pathMoves`.
 */
export function formatLastMove(
  baseMoves: readonly string[],
  pathMoves: readonly string[],
): string {
  const last = pathMoves[pathMoves.length - 1];
  if (!last) return "";
  const totalPly = baseMoves.length + pathMoves.length;
  const moveNumber = Math.ceil(totalPly / 2);
  const isBlack = totalPly % 2 === 0;
  return isBlack ? `${moveNumber}... ${last}` : `${moveNumber}. ${last}`;
}

/**
 * Render an array of SAN moves as a short PGN-style preview. `maxPlies`
 * defaults to 10 (the cap used by strong/weak spots panels); gap-analysis
 * passes 8. Appends an ellipsis when truncated.
 */
export function renderPreview(
  sans: readonly string[],
  maxPlies: number = 10,
): string {
  const limit = Math.min(sans.length, maxPlies);
  const out: string[] = [];
  for (let i = 0; i < limit; i++) {
    if (i % 2 === 0) out.push(`${i / 2 + 1}.`);
    out.push(sans[i]);
  }
  return out.join(" ") + (sans.length > limit ? " …" : "");
}
