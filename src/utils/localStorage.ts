type TeamPokemon = {
  id: number
  name: string
  types: string[]
  abilities: string[]
  stats: Array<{ name: string; value: number }>
  sprite: string | null
}

const STORAGE_KEY = 'pokemon-team-builder-team'

export function saveTeamToStorage(team: TeamPokemon[]): void {
  try {
    const serialized = JSON.stringify(team)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.error('Failed to save team to localStorage:', error)
  }
}

export function loadTeamFromStorage(): TeamPokemon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }
    const parsed = JSON.parse(stored) as TeamPokemon[]
    // Validate that it's an array of objects with expected structure
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'object' && item.id)) {
      return parsed
    }
    return []
  } catch (error) {
    console.error('Failed to load team from localStorage:', error)
    return []
  }
}

export function clearTeamFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear team from localStorage:', error)
  }
}
