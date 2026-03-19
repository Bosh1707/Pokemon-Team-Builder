import { describe, it, expect } from 'vitest'
import {
  toTitleCase,
  getPokemonIdFromUrl,
  getPokemonSpriteById,
  getStatClassName,
  getTypeClassName,
  formatMultiplier,
} from '../formatters'

describe('toTitleCase', () => {
  it('converts single word to title case', () => {
    expect(toTitleCase('fire')).toBe('Fire')
  })

  it('converts hyphenated words correctly', () => {
    expect(toTitleCase('special-attack')).toBe('Special Attack')
  })

  it('handles multiple hyphens', () => {
    expect(toTitleCase('some-long-phrase')).toBe('Some Long Phrase')
  })

  it('preserves single characters', () => {
    expect(toTitleCase('a')).toBe('A')
  })

  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('')
  })

  it('converts type names correctly', () => {
    expect(toTitleCase('electric')).toBe('Electric')
    expect(toTitleCase('poison')).toBe('Poison')
    expect(toTitleCase('steel')).toBe('Steel')
  })
})

describe('getPokemonIdFromUrl', () => {
  it('extracts ID from standard PokeAPI URL', () => {
    expect(getPokemonIdFromUrl('https://pokeapi.co/api/v2/pokemon/1/')).toBe(1)
  })

  it('extracts large ID from URL', () => {
    expect(getPokemonIdFromUrl('https://pokeapi.co/api/v2/pokemon/1302/')).toBe(1302)
  })

  it('extracts ID from URL without trailing slash', () => {
    expect(getPokemonIdFromUrl('https://pokeapi.co/api/v2/pokemon/25')).toBe(25)
  })

  it('handles single digit ID', () => {
    expect(getPokemonIdFromUrl('https://pokeapi.co/api/v2/pokemon/3/')).toBe(3)
  })
})

describe('getPokemonSpriteById', () => {
  it('creates correct sprite URL for ID', () => {
    expect(getPokemonSpriteById(1)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
    )
  })

  it('creates sprite URL for larger ID', () => {
    expect(getPokemonSpriteById(150)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png'
    )
  })

  it('works with high ID numbers', () => {
    expect(getPokemonSpriteById(1302)).toContain('1302')
  })
})

describe('getStatClassName', () => {
  it('converts stat name to CSS class', () => {
    expect(getStatClassName('hp')).toBe('stat-hp')
  })

  it('handles hyphenated stat names', () => {
    expect(getStatClassName('special-attack')).toBe('stat-special-attack')
  })

  it('converts all stats correctly', () => {
    expect(getStatClassName('attack')).toBe('stat-attack')
    expect(getStatClassName('defense')).toBe('stat-defense')
    expect(getStatClassName('special-defense')).toBe('stat-special-defense')
    expect(getStatClassName('speed')).toBe('stat-speed')
  })
})

describe('getTypeClassName', () => {
  it('converts type name to CSS class', () => {
    expect(getTypeClassName('fire')).toBe('type-fire')
  })

  it('handles all standard Pokemon types', () => {
    const types = [
      'normal',
      'fire',
      'water',
      'electric',
      'grass',
      'ice',
      'fighting',
      'poison',
      'ground',
      'flying',
      'psychic',
      'bug',
      'rock',
      'ghost',
      'dragon',
      'dark',
      'steel',
      'fairy',
    ]

    types.forEach((type) => {
      expect(getTypeClassName(type)).toBe(`type-${type}`)
    })
  })
})

describe('formatMultiplier', () => {
  it('formats immunity (0x) correctly', () => {
    expect(formatMultiplier(0)).toBe('0x')
  })

  it('formats 2x multiplier', () => {
    expect(formatMultiplier(2)).toBe('2x')
  })

  it('formats 4x multiplier', () => {
    expect(formatMultiplier(4)).toBe('4x')
  })

  it('formats 0.5x resistance', () => {
    expect(formatMultiplier(0.5)).toBe('0.5x')
  })

  it('formats 0.25x resistance', () => {
    expect(formatMultiplier(0.25)).toBe('0.25x')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatMultiplier(1.555)).toBe('1.56x')
  })

  it('formats 1x neutral', () => {
    expect(formatMultiplier(1)).toBe('1x')
  })

  it('handles small decimals', () => {
    expect(formatMultiplier(0.25)).toBe('0.25x')
    expect(formatMultiplier(0.125)).toBe('0.13x')
  })
})
