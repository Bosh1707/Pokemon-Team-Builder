import { useEffect, useMemo, useState } from 'react'
import './App.css'

type PokemonListResponse = {
  results: Array<{ name: string }>
}

type PokemonResponse = {
  id: number
  name: string
  types: Array<{ type: { name: string } }>
  abilities: Array<{ ability: { name: string } }>
  stats: Array<{ base_stat: number; stat: { name: string } }>
  sprites: {
    front_default: string | null
    other?: {
      'official-artwork'?: {
        front_default?: string | null
      }
    }
  }
}

type TeamPokemon = {
  id: number
  name: string
  types: string[]
  abilities: string[]
  stats: Array<{ name: string; value: number }>
  sprite: string | null
}

const MAX_TEAM_SIZE = 6
const BASE_STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

function toTitleCase(value: string): string {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function App() {
  const [allPokemonNames, setAllPokemonNames] = useState<string[]>([])
  const [team, setTeam] = useState<TeamPokemon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPokemonNames() {
      setIsLoadingList(true)
      setErrorMessage('')

      try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1302')
        if (!response.ok) {
          throw new Error('Unable to load Pokemon list.')
        }

        const data = (await response.json()) as PokemonListResponse
        const names = data.results
          .map((item) => item.name)
          .sort((a, b) => a.localeCompare(b))

        if (isMounted) {
          setAllPokemonNames(names)
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            'Failed to load Pokemon list from PokeAPI. Please refresh and try again.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingList(false)
        }
      }
    }

    loadPokemonNames()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredNames = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return allPokemonNames.slice(0, 20)
    }

    return allPokemonNames
      .filter((name) => name.includes(normalized))
      .slice(0, 20)
  }, [allPokemonNames, searchTerm])

  async function addPokemon(rawName: string) {
    const normalizedName = rawName.trim().toLowerCase()

    if (!normalizedName) {
      setErrorMessage('Please choose a Pokemon first.')
      return
    }

    if (team.length >= MAX_TEAM_SIZE) {
      setErrorMessage('Your team already has 6 Pokemon.')
      return
    }

    if (team.some((pokemon) => pokemon.name === normalizedName)) {
      setErrorMessage(`${toTitleCase(normalizedName)} is already on your team.`)
      return
    }

    setErrorMessage('')
    setIsAdding(true)

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${normalizedName}`)
      if (!response.ok) {
        throw new Error('Pokemon not found')
      }

      const pokemon = (await response.json()) as PokemonResponse
      const orderedStats = BASE_STAT_ORDER.map((statName) => {
        const stat = pokemon.stats.find((entry) => entry.stat.name === statName)
        return {
          name: statName,
          value: stat?.base_stat ?? 0,
        }
      })

      const teamPokemon: TeamPokemon = {
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types.map((entry) => entry.type.name),
        abilities: pokemon.abilities.map((entry) => entry.ability.name),
        stats: orderedStats,
        sprite:
          pokemon.sprites.other?.['official-artwork']?.front_default ??
          pokemon.sprites.front_default,
      }

      setTeam((currentTeam) => [...currentTeam, teamPokemon])
      setSearchTerm('')
      setSelectedName('')
    } catch {
      setErrorMessage(`Could not find Pokemon: "${rawName}".`)
    } finally {
      setIsAdding(false)
    }
  }

  function removePokemon(name: string) {
    setTeam((currentTeam) => currentTeam.filter((pokemon) => pokemon.name !== name))
    setErrorMessage('')
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <h1>Pokemon Team Builder</h1>
        <p>Build a team of up to 6 Pokemon and inspect their key information.</p>
      </header>

      <section className="builder-panel" aria-labelledby="builder-title">
        <div>
          <h2 id="builder-title">Add Pokemon</h2>
          <p className="helper-text">Search by name or pick from the suggestion list.</p>
        </div>

        <div className="controls-grid">
          <label>
            Search Pokemon
            <input
              type="text"
              list="pokemon-suggestions"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="e.g. pikachu"
              disabled={isLoadingList || isAdding}
            />
          </label>

          <label>
            Or select one
            <select
              value={selectedName}
              onChange={(event) => setSelectedName(event.target.value)}
              disabled={isLoadingList || isAdding}
            >
              <option value="">Choose a Pokemon</option>
              {filteredNames.map((name) => (
                <option key={name} value={name}>
                  {toTitleCase(name)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <datalist id="pokemon-suggestions">
          {filteredNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="actions-row">
          <button
            type="button"
            onClick={() => addPokemon(searchTerm || selectedName)}
            disabled={isLoadingList || isAdding || team.length >= MAX_TEAM_SIZE}
          >
            {isAdding ? 'Adding...' : 'Add to Team'}
          </button>

          <span className="team-count">
            Team size: {team.length} / {MAX_TEAM_SIZE}
          </span>
        </div>

        {isLoadingList && <p className="status-message">Loading Pokemon list...</p>}
        {!isLoadingList && team.length >= MAX_TEAM_SIZE && (
          <p className="status-message">
            Team is full. Remove a Pokemon before adding another.
          </p>
        )}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </section>

      <section className="team-panel" aria-labelledby="team-title">
        <h2 id="team-title">Current Team</h2>

        {team.length === 0 ? (
          <p className="empty-state">No Pokemon added yet. Start by searching above.</p>
        ) : (
          <div className="team-grid">
            {team.map((pokemon) => (
              <article className="pokemon-card" key={pokemon.name}>
                <div className="pokemon-head">
                  <div>
                    <h3>{toTitleCase(pokemon.name)}</h3>
                    <p>#{pokemon.id.toString().padStart(4, '0')}</p>
                  </div>

                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removePokemon(pokemon.name)}
                  >
                    Remove
                  </button>
                </div>

                {pokemon.sprite ? (
                  <img
                    className="pokemon-art"
                    src={pokemon.sprite}
                    alt={`${toTitleCase(pokemon.name)} artwork`}
                  />
                ) : (
                  <div className="pokemon-art placeholder-art">No image</div>
                )}

                <div className="meta-block">
                  <h4>Types</h4>
                  <ul className="pill-list">
                    {pokemon.types.map((type) => (
                      <li key={type}>{toTitleCase(type)}</li>
                    ))}
                  </ul>
                </div>

                <div className="meta-block">
                  <h4>Abilities</h4>
                  <ul>
                    {pokemon.abilities.map((ability) => (
                      <li key={ability}>{toTitleCase(ability)}</li>
                    ))}
                  </ul>
                </div>

                <div className="meta-block">
                  <h4>Base Stats</h4>
                  <table>
                    <tbody>
                      {pokemon.stats.map((stat) => (
                        <tr key={stat.name}>
                          <th>{toTitleCase(stat.name)}</th>
                          <td>{stat.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
