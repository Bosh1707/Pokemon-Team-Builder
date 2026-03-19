import { describe, it, expect } from 'vitest'
import { getMultiplierClass, getCoverageCountClass } from '../multipliers'

describe('getMultiplierClass', () => {
  it('returns multiplier-0 for immunity (0x)', () => {
    expect(getMultiplierClass(0)).toBe('multiplier-0')
  })

  it('returns multiplier-4 for 4x or higher', () => {
    expect(getMultiplierClass(4)).toBe('multiplier-4')
    expect(getMultiplierClass(8)).toBe('multiplier-4')
  })

  it('returns multiplier-2 for 2x weakness', () => {
    expect(getMultiplierClass(2)).toBe('multiplier-2')
    expect(getMultiplierClass(2.5)).toBe('multiplier-2')
  })

  it('returns multiplier-05 for 0.5x resistance', () => {
    expect(getMultiplierClass(0.5)).toBe('multiplier-05')
  })

  it('returns multiplier-025 for 0.25x or lower resistance', () => {
    expect(getMultiplierClass(0.25)).toBe('multiplier-025')
    expect(getMultiplierClass(0.1)).toBe('multiplier-025')
  })

  it('returns multiplier-1 for neutral (1x)', () => {
    expect(getMultiplierClass(1)).toBe('multiplier-1')
    expect(getMultiplierClass(1.5)).toBe('multiplier-1')
  })

  it('applies correct classification for boundary values', () => {
    expect(getMultiplierClass(3.99)).toBe('multiplier-2')
    expect(getMultiplierClass(4)).toBe('multiplier-4')
    expect(getMultiplierClass(0.26)).toBe('multiplier-05')
    expect(getMultiplierClass(0.25)).toBe('multiplier-025')
  })
})

describe('getCoverageCountClass', () => {
  it('returns coverage-count--none for zero values', () => {
    expect(getCoverageCountClass('weak', 0)).toBe('coverage-count coverage-count--none')
    expect(getCoverageCountClass('resist', 0)).toBe('coverage-count coverage-count--none')
    expect(getCoverageCountClass('immune', 0)).toBe('coverage-count coverage-count--none')
    expect(getCoverageCountClass('attack', 0)).toBe('coverage-count coverage-count--none')
  })

  it('returns coverage-count--weak for weakness coverage', () => {
    expect(getCoverageCountClass('weak', 1)).toBe('coverage-count coverage-count--weak')
    expect(getCoverageCountClass('weak', 3)).toBe('coverage-count coverage-count--weak')
  })

  it('returns coverage-count--resist for resistance coverage', () => {
    expect(getCoverageCountClass('resist', 1)).toBe('coverage-count coverage-count--resist')
    expect(getCoverageCountClass('resist', 5)).toBe('coverage-count coverage-count--resist')
  })

  it('returns coverage-count--immune for immunity coverage', () => {
    expect(getCoverageCountClass('immune', 1)).toBe('coverage-count coverage-count--immune')
    expect(getCoverageCountClass('immune', 2)).toBe('coverage-count coverage-count--immune')
  })

  it('returns coverage-count--attack for offensive coverage', () => {
    expect(getCoverageCountClass('attack', 1)).toBe('coverage-count coverage-count--attack')
    expect(getCoverageCountClass('attack', 4)).toBe('coverage-count coverage-count--attack')
  })
})
