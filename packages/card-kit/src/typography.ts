/**
 * Calculates adaptive font size in points to prevent overflow for long names.
 */
export function calculateAdaptiveFontSizePt(
  text: string,
  baseSizePt: number = 11,
  minSizePt: number = 7.5,
  charLimit: number = 22,
): number {
  if (!text) return baseSizePt;
  const length = text.trim().length;
  if (length <= charLimit) return baseSizePt;

  const excess = length - charLimit;
  const reduction = (excess / 12) * 2;
  return Math.max(minSizePt, Math.round((baseSizePt - reduction) * 10) / 10);
}
