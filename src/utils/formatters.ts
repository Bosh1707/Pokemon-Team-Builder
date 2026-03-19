/**
 * Utility functions for formatting and display logic
 */

/**
 * Converts a string to title case, handling hyphens.
 * Example: "special-attack" => "Special Attack"
 */
export function toTitleCase(value: string): string {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

/**
 * Extracts Pokemon ID from a PokeAPI URL
 * Example: "https://pokeapi.co/api/v2/pokemon/1/" => 1
 */
export function getPokemonIdFromUrl(url: string): number {
  const segments = url.split('/').filter(Boolean)
  const idSegment = segments[segments.length - 1]
  return Number(idSegment)
}

/**
 * Generates the sprite URL for a Pokemon by ID
 * Example: 1 => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
 */
export function getPokemonSpriteById(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

/**
 * Converts a stat name to a CSS class name
 * Example: "special-attack" => "stat-special-attack"
 */
export function getStatClassName(stat: string): string {
  return `stat-${stat.toLowerCase()}`
}

/**
 * Converts a type name to a CSS class name
 * Example: "fire" => "type-fire"
 */
export function getTypeClassName(type: string): string {
  return `type-${type.toLowerCase()}`
}

/**
 * Formats a damage multiplier value for display
 * Example: 2 => "2x", 0 => "0x", 0.5 => "0.5x"
 */
export function formatMultiplier(multiplier: number): string {
  if (multiplier === 0) {
    return '0x'
  }

  const rounded = Math.round(multiplier * 100) / 100
  return `${rounded}x`
}
