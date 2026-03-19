/**
 * Utility functions for type multiplier calculations and display
 */

/**
 * Returns CSS class for multiplier badge styling
 * - 0x: immune
 * - 4x+: critical weakness
 * - 2x: major weakness
 * - 0.5x: major resistance
 * - 0.25x: critical resistance
 * - 1x: neutral
 */
export function getMultiplierClass(multiplier: number): string {
  if (multiplier === 0) {
    return 'multiplier-0'
  }

  if (multiplier >= 4) {
    return 'multiplier-4'
  }

  if (multiplier >= 2) {
    return 'multiplier-2'
  }

  if (multiplier <= 0.25) {
    return 'multiplier-025'
  }

  if (multiplier <= 0.5) {
    return 'multiplier-05'
  }

  return 'multiplier-1'
}

/**
 * Returns CSS class for coverage count display
 * Shows visual indicator for weakness/resistance/immunity
 */
export function getCoverageCountClass(
  kind: 'weak' | 'resist' | 'immune' | 'attack',
  value: number,
): string {
  if (value === 0) {
    return 'coverage-count coverage-count--none'
  }

  return `coverage-count coverage-count--${kind}`
}
