import { Fragment, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  toTitleCase,
  getPokemonIdFromUrl,
  getPokemonSpriteById,
  getStatClassName,
  getTypeClassName,
  formatMultiplier,
} from './utils/formatters'
import { getMultiplierClass, getCoverageCountClass } from './utils/multipliers'
import { saveTeamToStorage, loadTeamFromStorage, clearTeamFromStorage } from './utils/localStorage'

type PokemonListResponse = {
  results: Array<{ name: string; url: string }>
}

type PokemonListItem = {
  id: number
  name: string
  sprite: string
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

type TypeRelations = {
  doubleDamageFrom: Set<string>
  halfDamageFrom: Set<string>
  noDamageFrom: Set<string>
  doubleDamageTo: Set<string>
}

type CoverageRow = {
  type: string
  weakCount: number
  resistCount: number
  immuneCount: number
  attackerCount: number
  weakNames: string[]
  resistNames: string[]
  immuneNames: string[]
  attackerNames: string[]
}

type RoleCoverage = {
  physicalAttackers: number
  specialAttackers: number
  mixedAttackers: number
  defensivePokemon: number
  fastPokemon: number
  mediumSpeedPokemon: number
  slowPokemon: number
  avgHp: number
  avgAttack: number
  avgDefense: number
  avgSpAttack: number
  avgSpDefense: number
  avgSpeed: number
}

type Recommendation = {
  title: string
  detail: string
  tone: 'warning' | 'advice' | 'good'
  sprites?: Array<{ name: string; sprite: string | null }>
  suggestedTypes?: string[]
}

type StatChartView = 'bar' | 'spider'

const MAX_TEAM_SIZE = 6
const BASE_STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

const POKEMON_TYPES = [
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

function getStatValue(pokemon: TeamPokemon, statName: string): number {
  return pokemon.stats.find((stat) => stat.name === statName)?.value ?? 0
}

function getTotalStats(pokemon: TeamPokemon): number {
  return pokemon.stats.reduce((sum, stat) => sum + stat.value, 0)
}

function renderWithTypeBadges(text: string) {
  const titleCaseTypes = POKEMON_TYPES.map(toTitleCase)
  const typePattern = new RegExp(`\\b(${titleCaseTypes.join('|')})\\b`, 'g')
  const parts: Array<string | React.ReactElement> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = typePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const typeName = match[1].toLowerCase()
    parts.push(
      <span key={`${typeName}-${match.index}`} className={`type-pill-inline rec-type-pill ${getTypeClassName(typeName)}`}>
        {match[1]}
      </span>,
    )
    lastIndex = match.index + match[1].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <Fragment>{parts}</Fragment>
}

const RADAR_STAT_MAX = 180

const RADAR_STATS: Array<{ key: string; label: string; color: string }> = [
  { key: 'hp', label: 'HP', color: '#4caf50' },
  { key: 'attack', label: 'Atk', color: '#e65100' },
  { key: 'defense', label: 'Def', color: '#1e88e5' },
  { key: 'special-attack', label: 'SpA', color: '#d81b60' },
  { key: 'special-defense', label: 'SpD', color: '#00897b' },
  { key: 'speed', label: 'Spe', color: '#8e24aa' },
]

function RadarChart({
    values,
    size = 260,
    maxStat = RADAR_STAT_MAX,
  }: {
    values: Record<string, number>
    size?: number
    maxStat?: number
  }) {
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.34
    const levels = 4
    const n = RADAR_STATS.length
    const labelR = r + size * 0.09
    const fontSize = Math.max(10, Math.round(size * 0.046))
    const pointRadius = Math.max(3, Math.round(size * 0.016))
    const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2
    const pt = (i: number, radius: number) => ({
      x: cx + radius * Math.cos(angle(i)),
      y: cy + radius * Math.sin(angle(i)),
    })

    const gridPolygons = Array.from({ length: levels }, (_, l) => {
      const lr = (r * (l + 1)) / levels
      return Array.from({ length: n }, (__, i) => pt(i, lr))
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(' ')
    })

    const dataPts = RADAR_STATS.map((stat, i) => {
      const norm = Math.min((values[stat.key] ?? 0) / maxStat, 1)
      return pt(i, norm * r)
    })
    const dataPolygon = dataPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

    return (
      <svg
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="radar-svg"
        aria-hidden="true"
      >
        {gridPolygons.map((pts, l) => (
          <polygon
            key={l}
            points={pts}
            fill={l % 2 === 0 ? '#f5f6ff' : 'none'}
            stroke="#dde1ee"
            strokeWidth="1"
          />
        ))}

        {Array.from({ length: n }, (_, i) => {
          const outer = pt(i, r)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x.toFixed(2)}
              y2={outer.y.toFixed(2)}
              stroke="#dde1ee"
              strokeWidth="1"
            />
          )
        })}

        <polygon
          points={dataPolygon}
          fill="rgba(75,87,240,0.18)"
          stroke="#4b57f0"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {dataPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r={pointRadius.toString()}
            fill="#4b57f0"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}

        {RADAR_STATS.map((stat, i) => {
          const lp = pt(i, labelR)
          return (
            <text
              key={i}
              x={lp.x.toFixed(2)}
              y={lp.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize.toString()}
              fontWeight="700"
              fill={stat.color}
              style={{ cursor: 'help' }}
            >
              <title>{stat.label}: {values[stat.key] ?? 0}</title>
              {stat.label}
            </text>
          )
        })}
      </svg>
    )
  }

  function StatBars({
    values,
    maxValue,
  }: {
    values: Record<string, number>
    maxValue: number
  }) {
    return (
      <div className="stats-bar-chart" role="img" aria-label="Pokemon stat bar chart">
        {RADAR_STATS.map((stat) => {
          const value = values[stat.key] ?? 0
          const percent = Math.round((Math.min(value, maxValue) / maxValue) * 100)

          return (
            <div key={stat.key} className="stats-bar-row">
              <span className="stats-bar-name" style={{ color: stat.color }}>
                {stat.label}
              </span>
              <div className="stats-bar-track">
                <div
                  className="stats-bar-fill"
                  style={{ width: `${percent}%`, background: stat.color }}
                />
              </div>
              <span className="stats-bar-value">{value}</span>
            </div>
          )
        })}
      </div>
    )
  }

  function ChartToggle({
    value,
    onChange,
    label,
  }: {
    value: StatChartView
    onChange: (next: StatChartView) => void
    label: string
  }) {
    return (
      <div className="chart-toggle" role="group" aria-label={label}>
        <button
          type="button"
          className={`chart-toggle-button ${value === 'bar' ? 'is-active' : ''}`}
          onClick={() => onChange('bar')}
          aria-pressed={value === 'bar'}
        >
          Bar Graph
        </button>
        <button
          type="button"
          className={`chart-toggle-button ${value === 'spider' ? 'is-active' : ''}`}
          onClick={() => onChange('spider')}
          aria-pressed={value === 'spider'}
        >
          Spider Diagram
        </button>
      </div>
    )
  }

  function RoleBar({
    label,
    value,
    max,
    color,
  }: {
    label: string
    value: number
    max: number
    color: string
  }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
      <div className="role-bar-row">
        <span className="role-bar-label">{label}</span>
        <div className="role-bar-track">
          <div className="role-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="role-bar-count" style={{ color }}>{value}</span>
      </div>
    )
  }

function App() {
  const [allPokemonList, setAllPokemonList] = useState<PokemonListItem[]>([])
  const [team, setTeam] = useState<TeamPokemon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSearchTypes, setSelectedSearchTypes] = useState<string[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoadingTypeData, setIsLoadingTypeData] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [typeRelationsMap, setTypeRelationsMap] = useState<Record<string, TypeRelations>>({})
  const [pokemonTypesMap, setPokemonTypesMap] = useState<Record<string, string[]>>({})
  const [selectedCoverageType, setSelectedCoverageType] = useState<string | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [pokemonStatsView, setPokemonStatsView] = useState<StatChartView>('bar')
  const [averageStatsView, setAverageStatsView] = useState<StatChartView>('spider')

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
        const pokemonByIndex = data.results
          .map((item) => {
            const id = getPokemonIdFromUrl(item.url)
            return {
              id,
              name: item.name,
              sprite: getPokemonSpriteById(id),
            }
          })
          .filter((item) => Number.isFinite(item.id))
          .sort((a, b) => a.id - b.id)

        if (isMounted) {
          setAllPokemonList(pokemonByIndex)
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

  // Load team from localStorage on mount
  useEffect(() => {
    const savedTeam = loadTeamFromStorage()
    if (savedTeam.length > 0) {
      setTeam(savedTeam)
    }
  }, [])

  // Save team to localStorage whenever it changes
  useEffect(() => {
    saveTeamToStorage(team)
  }, [team])

  useEffect(() => {
    setShowRecommendations(false)
  }, [team])

  useEffect(() => {
    let isMounted = true

    async function loadTypeRelations() {
      setIsLoadingTypeData(true)

      try {
        const typeResponses = await Promise.all(
          POKEMON_TYPES.map((type) => fetch(`https://pokeapi.co/api/v2/type/${type}`)),
        )

        if (typeResponses.some((response) => !response.ok)) {
          throw new Error('Unable to load type data.')
        }

        const typePayloads = await Promise.all(typeResponses.map((response) => response.json()))

        const nextMap: Record<string, TypeRelations> = {}
        const nextPokemonTypesMap: Record<string, string[]> = {}

        for (let index = 0; index < POKEMON_TYPES.length; index += 1) {
          const typeName = POKEMON_TYPES[index]
          const payload = typePayloads[index] as {
            damage_relations: {
              double_damage_from: Array<{ name: string }>
              half_damage_from: Array<{ name: string }>
              no_damage_from: Array<{ name: string }>
              double_damage_to: Array<{ name: string }>
            }
            pokemon: Array<{ pokemon: { name: string } }>
          }

          nextMap[typeName] = {
            doubleDamageFrom: new Set(
              payload.damage_relations.double_damage_from.map((entry) => entry.name),
            ),
            halfDamageFrom: new Set(
              payload.damage_relations.half_damage_from.map((entry) => entry.name),
            ),
            noDamageFrom: new Set(
              payload.damage_relations.no_damage_from.map((entry) => entry.name),
            ),
            doubleDamageTo: new Set(
              payload.damage_relations.double_damage_to.map((entry) => entry.name),
            ),
          }

          for (const entry of payload.pokemon) {
            const pokemonName = entry.pokemon.name
            if (!nextPokemonTypesMap[pokemonName]) {
              nextPokemonTypesMap[pokemonName] = []
            }

            nextPokemonTypesMap[pokemonName].push(typeName)
          }
        }

        if (isMounted) {
          setTypeRelationsMap(nextMap)
          setPokemonTypesMap(nextPokemonTypesMap)
        }
      } catch {
        if (isMounted) {
          setErrorMessage(
            'Some analysis data could not be loaded. Team builder still works, but type analysis may be limited.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoadingTypeData(false)
        }
      }
    }

    loadTypeRelations()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredPokemon = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    return allPokemonList
      .filter((pokemon) => {
        const matchesName = !normalized || pokemon.name.includes(normalized)
        if (!matchesName) {
          return false
        }

        if (selectedSearchTypes.length === 0) {
          return true
        }

        const pokemonTypes = pokemonTypesMap[pokemon.name] ?? []
        return selectedSearchTypes.every((type) => pokemonTypes.includes(type))
      })
      .slice(0, 20)
  }, [allPokemonList, pokemonTypesMap, searchTerm, selectedSearchTypes])

  function toggleSearchType(type: string) {
    setSelectedSearchTypes((current) => {
      if (current.includes(type)) {
        return current.filter((value) => value !== type)
      }

      if (current.length >= 2) {
        return current
      }

      return [...current, type]
    })
  }

  const canUseTypeFilter = !isLoadingTypeData && Object.keys(pokemonTypesMap).length > 0

  const typeCoverageRows = useMemo<CoverageRow[]>(() => {
    if (team.length === 0) {
      return []
    }

    return POKEMON_TYPES.map((attackType) => {
      let weakCount = 0
      let resistCount = 0
      let immuneCount = 0
      let attackerCount = 0
      const weakNames: string[] = []
      const resistNames: string[] = []
      const immuneNames: string[] = []
      const attackerNames: string[] = []

      for (const pokemon of team) {
        let multiplier = 1

        for (const defendingType of pokemon.types) {
          const relations = typeRelationsMap[defendingType]
          if (!relations) {
            continue
          }

          if (relations.noDamageFrom.has(attackType)) {
            multiplier *= 0
          } else if (relations.doubleDamageFrom.has(attackType)) {
            multiplier *= 2
          } else if (relations.halfDamageFrom.has(attackType)) {
            multiplier *= 0.5
          }
        }

        if (multiplier === 0) {
          immuneCount += 1
          immuneNames.push(toTitleCase(pokemon.name))
        } else if (multiplier > 1) {
          weakCount += 1
          weakNames.push(toTitleCase(pokemon.name))
        } else if (multiplier < 1) {
          resistCount += 1
          resistNames.push(toTitleCase(pokemon.name))
        }

        if (
          pokemon.types.some((attackingType) =>
            typeRelationsMap[attackingType]?.doubleDamageTo.has(attackType),
          )
        ) {
          attackerCount += 1
          attackerNames.push(toTitleCase(pokemon.name))
        }
      }

      return {
        type: attackType,
        weakCount,
        resistCount,
        immuneCount,
        attackerCount,
        weakNames,
        resistNames,
        immuneNames,
        attackerNames,
      }
    })
  }, [team, typeRelationsMap])

  const topWeakTypes = useMemo(
    () =>
      typeCoverageRows
        .filter((row) => row.weakCount > 0)
        .sort((a, b) => b.weakCount - a.weakCount)
        .slice(0, 3),
    [typeCoverageRows],
  )

  const duplicateWeaknesses = useMemo(
    () => typeCoverageRows.filter((row) => row.weakCount >= 2).sort((a, b) => b.weakCount - a.weakCount),
    [typeCoverageRows],
  )

  const strongestCoverageTypes = useMemo(
    () =>
      typeCoverageRows
        .filter((row) => row.attackerCount > 0)
        .sort((a, b) => b.attackerCount - a.attackerCount)
        .slice(0, 3),
    [typeCoverageRows],
  )

  const defensiveMultipliers = useMemo(() => {
    const byPokemon: Record<number, Record<string, number>> = {}

    for (const pokemon of team) {
      byPokemon[pokemon.id] = {}

      for (const attackType of POKEMON_TYPES) {
        let multiplier = 1

        for (const defendingType of pokemon.types) {
          const relations = typeRelationsMap[defendingType]
          if (!relations) {
            continue
          }

          if (relations.noDamageFrom.has(attackType)) {
            multiplier *= 0
          } else if (relations.doubleDamageFrom.has(attackType)) {
            multiplier *= 2
          } else if (relations.halfDamageFrom.has(attackType)) {
            multiplier *= 0.5
          }
        }

        byPokemon[pokemon.id][attackType] = multiplier
      }
    }

    return byPokemon
  }, [team, typeRelationsMap])

  const roleCoverage = useMemo<RoleCoverage | null>(() => {
    if (team.length === 0) {
      return null
    }

    let physicalAttackers = 0
    let specialAttackers = 0
    let mixedAttackers = 0
    let defensivePokemon = 0
    let fastPokemon = 0
    let mediumSpeedPokemon = 0
    let slowPokemon = 0
    let sumHp = 0
    let sumAttack = 0
    let sumDefense = 0
    let sumSpAttack = 0
    let sumSpDefense = 0
    let sumSpeed = 0

    for (const pokemon of team) {
      const hp = getStatValue(pokemon, 'hp')
      const attack = getStatValue(pokemon, 'attack')
      const defense = getStatValue(pokemon, 'defense')
      const spAttack = getStatValue(pokemon, 'special-attack')
      const spDefense = getStatValue(pokemon, 'special-defense')
      const speed = getStatValue(pokemon, 'speed')

      sumHp += hp
      sumAttack += attack
      sumDefense += defense
      sumSpAttack += spAttack
      sumSpDefense += spDefense
      sumSpeed += speed

      if (attack >= spAttack + 20) {
        physicalAttackers += 1
      } else if (spAttack >= attack + 20) {
        specialAttackers += 1
      } else {
        mixedAttackers += 1
      }

      if ((defense + spDefense) / 2 >= 90 || (hp >= 95 && defense >= 80 && spDefense >= 80)) {
        defensivePokemon += 1
      }

      if (speed >= 100) {
        fastPokemon += 1
      } else if (speed <= 60) {
        slowPokemon += 1
      } else {
        mediumSpeedPokemon += 1
      }
    }

    return {
      physicalAttackers,
      specialAttackers,
      mixedAttackers,
      defensivePokemon,
      fastPokemon,
      mediumSpeedPokemon,
      slowPokemon,
      avgHp: Math.round(sumHp / team.length),
      avgAttack: Math.round(sumAttack / team.length),
      avgDefense: Math.round(sumDefense / team.length),
      avgSpAttack: Math.round(sumSpAttack / team.length),
      avgSpDefense: Math.round(sumSpDefense / team.length),
      avgSpeed: Math.round(sumSpeed / team.length),
    }
  }, [team])

  const averageStatValues = useMemo<Record<string, number> | null>(() => {
    if (!roleCoverage) {
      return null
    }

    return {
      hp: roleCoverage.avgHp,
      attack: roleCoverage.avgAttack,
      defense: roleCoverage.avgDefense,
      'special-attack': roleCoverage.avgSpAttack,
      'special-defense': roleCoverage.avgSpDefense,
      speed: roleCoverage.avgSpeed,
    }
  }, [roleCoverage])

  const recommendations = useMemo<Recommendation[]>(() => {
    if (team.length === 0 || !roleCoverage) {
      return []
    }

    const items: Recommendation[] = []

    if (roleCoverage.defensivePokemon === 0) {
      items.push({
        title: 'Missing a defensive pivot',
        detail:
          'Your team lacks a clearly defensive Pokemon. Add or swap in something with strong HP and bulk so you have a safer switch-in when pressure builds.',
        tone: 'warning',
        suggestedTypes: ['steel', 'water', 'rock', 'fairy'],
      })
    }

    if (roleCoverage.fastPokemon === 0) {
      items.push({
        title: 'No fast speed control',
        detail:
          'None of your current Pokemon fall into the fast tier, so many matchups may force you to take hits first. Consider adding a naturally fast cleaner or speed control support.',
        tone: 'warning',
        suggestedTypes: ['electric', 'flying', 'psychic'],
      })
    }

    if (roleCoverage.specialAttackers === 0) {
      items.push({
        title: 'Special offense is missing',
        detail:
          'Your team leans away from special attacking pressure. A strong special attacker would make it harder for physical walls to stonewall the whole team.',
        tone: 'advice',
        suggestedTypes: ['psychic', 'fire', 'electric', 'water'],
      })
    }

    if (roleCoverage.physicalAttackers === 0) {
      items.push({
        title: 'Physical offense is missing',
        detail:
          'Your team lacks a clear physical attacker. Adding one would diversify your damage output and reduce how easy it is to wall your team on the special side.',
        tone: 'advice',
        suggestedTypes: ['fighting', 'ground', 'dragon', 'steel'],
      })
    }

    if (duplicateWeaknesses.length > 0) {
      const worstWeakness = duplicateWeaknesses[0]

      const resistingTypes = POKEMON_TYPES.filter((type) => {
        const relations = typeRelationsMap[type]
        return (
          relations?.halfDamageFrom.has(worstWeakness.type) ||
          relations?.noDamageFrom.has(worstWeakness.type)
        )
      }).slice(0, 4)

      items.push({
        title: `Overlapping ${toTitleCase(worstWeakness.type)} weakness`,
        detail: `${worstWeakness.weakNames.join(', ')} all stack a ${toTitleCase(worstWeakness.type)} weakness. That overlap makes the matchup easier to punish.`,
        tone: 'warning',
        sprites: worstWeakness.weakNames.slice(0, 4).map((name) => {
          const pokemon = team.find((p) => toTitleCase(p.name) === name)
          return { name, sprite: pokemon?.sprite ?? null }
        }),
        suggestedTypes: resistingTypes,
      })

      const duplicateWeakNameCounts = new Map<string, number>()
      for (const row of duplicateWeaknesses) {
        for (const name of row.weakNames) {
          duplicateWeakNameCounts.set(name, (duplicateWeakNameCounts.get(name) ?? 0) + 1)
        }
      }

      const replacementCandidate = team
        .map((pokemon) => ({
          name: toTitleCase(pokemon.name),
          sprite: pokemon.sprite,
          duplicateWeaknessCount: duplicateWeakNameCounts.get(toTitleCase(pokemon.name)) ?? 0,
          totalStats: getTotalStats(pokemon),
        }))
        .sort((a, b) => {
          if (b.duplicateWeaknessCount !== a.duplicateWeaknessCount) {
            return b.duplicateWeaknessCount - a.duplicateWeaknessCount
          }

          return a.totalStats - b.totalStats
        })[0]

      if (replacementCandidate && replacementCandidate.duplicateWeaknessCount > 0) {
        items.push({
          title: `Consider replacing ${replacementCandidate.name}`,
          detail: `${replacementCandidate.name} contributes to ${replacementCandidate.duplicateWeaknessCount} shared weakness${replacementCandidate.duplicateWeaknessCount > 1 ? 'es' : ''}. Replacing it with something that resists ${toTitleCase(worstWeakness.type)} would reduce team overlap.`,
          tone: 'advice',
          sprites: [{ name: replacementCandidate.name, sprite: replacementCandidate.sprite }],
          suggestedTypes: resistingTypes,
        })
      }
    }

    const lowCoverageTypes = typeCoverageRows
      .filter((row) => row.attackerCount === 0)
      .slice(0, 2)

    if (lowCoverageTypes.length > 0) {
      const coverageSuggested: string[] = []
      for (const uncoveredRow of lowCoverageTypes) {
        for (const type of POKEMON_TYPES) {
          if (typeRelationsMap[type]?.doubleDamageTo.has(uncoveredRow.type) && !coverageSuggested.includes(type)) {
            coverageSuggested.push(type)
          }
        }
      }

      items.push({
        title: 'A few typings are hard to pressure back',
        detail: `You currently have no strong attackers into ${lowCoverageTypes
          .map((row) => toTitleCase(row.type))
          .join(' and ')}. Adding coverage for those types would round the team out.`,
        tone: 'advice',
        suggestedTypes: coverageSuggested.slice(0, 5),
      })
    }

    if (items.length === 0) {
      items.push({
        title: 'Balanced first draft',
        detail:
          'This team does not trigger any major simple-rule warnings. You have a decent spread of roles and no obvious overlapping weakness problem from these basic checks.',
        tone: 'good',
      })
    }

    return items.slice(0, 5)
  }, [duplicateWeaknesses, roleCoverage, team, typeCoverageRows, typeRelationsMap])

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
          <p className="helper-text">
            Search by name or filter by up to two types, then click a result to add it.
          </p>
        </div>

        <div className="controls-grid">
          <label>
            Search Pokemon
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="e.g. pikachu"
              disabled={isLoadingList || isAdding}
            />
          </label>

          <label>
            Filter by Type (up to 2)
            <div className="type-filter-field">
              <details className={`type-dropdown ${!canUseTypeFilter ? 'is-disabled' : ''}`}>
                <summary
                  aria-disabled={!canUseTypeFilter}
                  onClick={(event) => {
                    if (!canUseTypeFilter) {
                      event.preventDefault()
                    }
                  }}
                >
                  {selectedSearchTypes.length > 0 ? (
                    <span className="type-dropdown-value">
                      {selectedSearchTypes.map((type) => (
                        <span key={type} className={`type-pill-inline ${getTypeClassName(type)}`}>
                          {toTitleCase(type)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="type-dropdown-placeholder">
                      {canUseTypeFilter ? 'Select type badges' : 'Loading type options...'}
                    </span>
                  )}
                </summary>

                {canUseTypeFilter && (
                  <div className="type-dropdown-menu">
                    {POKEMON_TYPES.map((type) => {
                      const isSelected = selectedSearchTypes.includes(type)
                      const isLocked = !isSelected && selectedSearchTypes.length >= 2

                      return (
                        <button
                          key={type}
                          type="button"
                          className={`type-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => toggleSearchType(type)}
                          disabled={isLocked}
                          aria-pressed={isSelected}
                        >
                          <span className={`type-pill-inline ${getTypeClassName(type)}`}>
                            {toTitleCase(type)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </details>

              <button
                type="button"
                className="clear-type-filter"
                onClick={() => setSelectedSearchTypes([])}
                disabled={selectedSearchTypes.length === 0}
              >
                Clear
              </button>
            </div>
          </label>
        </div>

        <div className="search-results" aria-live="polite">
          {filteredPokemon.map((pokemon) => (
            <button
              key={pokemon.name}
              type="button"
              className="search-result-item"
              onClick={() => {
                setSearchTerm(pokemon.name)
              }}
              disabled={isAdding || team.length >= MAX_TEAM_SIZE}
            >
              <img src={pokemon.sprite} alt="" aria-hidden="true" />
              <span className="search-result-main">
                <span className="search-result-name">
                  #{pokemon.id.toString().padStart(4, '0')} {toTitleCase(pokemon.name)}
                </span>
                {(pokemonTypesMap[pokemon.name] ?? []).length > 0 && (
                  <span className="search-result-types">
                    {(pokemonTypesMap[pokemon.name] ?? []).map((type) => (
                      <span
                        key={`${pokemon.name}-${type}`}
                        className={`type-pill-inline type-pill-inline--compact ${getTypeClassName(type)}`}
                      >
                        {toTitleCase(type)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="actions-row">
          <button
            type="button"
            onClick={() => addPokemon(searchTerm)}
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
        <div className="section-heading-row">
          <h2 id="team-title">Current Team</h2>
          <ChartToggle
            value={pokemonStatsView}
            onChange={setPokemonStatsView}
            label="Pokemon base stats chart view"
                    {...team.length > 0 && (
                      <button
                        type="button"
                        className="clear-team-button"
                        onClick={() => {
                          setTeam([])
                          clearTeamFromStorage()
                        }}
                      >
                        Clear Team
                      </button>
                    )}
          />
        </div>

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
                      <li key={type} className={getTypeClassName(type)}>
                        {toTitleCase(type)}
                      </li>
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
                  {pokemonStatsView === 'bar' ? (
                    <table className="stat-table">
                      <tbody>
                        {pokemon.stats.map((stat) => (
                          <tr key={stat.name} className={getStatClassName(stat.name)}>
                            <th>{toTitleCase(stat.name)}</th>
                            <td className="stat-value">{stat.value}</td>
                            <td className="stat-bar-cell">
                              <div className="stat-bar">
                                <div
                                  className="stat-bar-fill"
                                  style={{ width: `${Math.round((stat.value / 255) * 100)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="stat-total">
                          <th>Total</th>
                          <td className="stat-value">
                            {pokemon.stats.reduce((sum, s) => sum + s.value, 0)}
                          </td>
                          <td className="stat-bar-cell" />
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="pokemon-stats-visual">
                      <RadarChart
                        values={pokemon.stats.reduce<Record<string, number>>((acc, stat) => {
                          acc[stat.name] = stat.value
                          return acc
                        }, {})}
                        size={220}
                        maxStat={255}
                      />
                      <p className="radar-label">
                        Base Stat Shape (Total {pokemon.stats.reduce((sum, s) => sum + s.value, 0)})
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="analysis-panel" aria-labelledby="analysis-title">
        <h2 id="analysis-title">Team Analysis</h2>

        {team.length === 0 ? (
          <p className="empty-state">Add Pokemon to see type and role coverage analysis.</p>
        ) : (
          <>
            <div className="analysis-grid">
              <article className="analysis-card">
                <h3>Type Summary</h3>
                {isLoadingTypeData ? (
                  <p className="status-message">Loading type matchup data…</p>
                ) : (
                  <div className="type-summary-sections">
                    <div className="type-summary-row">
                      <span className="type-summary-label type-summary-label--weak">
                        Biggest Weaknesses
                      </span>
                      <div className="type-badge-row">
                        {topWeakTypes.length > 0 ? (
                          topWeakTypes.map((row) => (
                            <span
                              key={row.type}
                              className={`type-pill-inline ${getTypeClassName(row.type)}`}
                            >
                              {toTitleCase(row.type)}
                              <span className="type-count">{row.weakCount}</span>
                            </span>
                          ))
                        ) : (
                          <span className="type-summary-none">None detected</span>
                        )}
                      </div>
                    </div>

                    <div className="type-summary-row">
                      <span className="type-summary-label type-summary-label--duplicate">
                        Duplicate Weaknesses
                      </span>
                      <div className="type-badge-row">
                        {duplicateWeaknesses.length > 0 ? (
                          duplicateWeaknesses.map((row) => (
                            <span
                              key={row.type}
                              className={`type-pill-inline ${getTypeClassName(row.type)}`}
                            >
                              {toTitleCase(row.type)}
                              <span className="type-count">{row.weakCount}</span>
                            </span>
                          ))
                        ) : (
                          <span className="type-summary-none">None</span>
                        )}
                      </div>
                    </div>

                    <div className="type-summary-row">
                      <span className="type-summary-label type-summary-label--strong">
                        Strong Coverage
                      </span>
                      <div className="type-badge-row">
                        {strongestCoverageTypes.length > 0 ? (
                          strongestCoverageTypes.map((row) => (
                            <span
                              key={row.type}
                              className={`type-pill-inline ${getTypeClassName(row.type)}`}
                            >
                              {toTitleCase(row.type)}
                              <span className="type-count">{row.attackerCount}</span>
                            </span>
                          ))
                        ) : (
                          <span className="type-summary-none">Limited</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>

              <article className="analysis-card">
                <div className="analysis-card-heading-row">
                  <h3>Role &amp; Stat Balance</h3>
                  <ChartToggle
                    value={averageStatsView}
                    onChange={setAverageStatsView}
                    label="Team average stats chart view"
                  />
                </div>
                {roleCoverage && (
                  <div className="role-card-body">
                    <div className="role-details">
                      <h4>Roles</h4>
                      <div className="role-bars">
                        <RoleBar
                          label="Physical"
                          value={roleCoverage.physicalAttackers}
                          max={team.length}
                          color="#e65100"
                        />
                        <RoleBar
                          label="Special"
                          value={roleCoverage.specialAttackers}
                          max={team.length}
                          color="#d81b60"
                        />
                        <RoleBar
                          label="Mixed"
                          value={roleCoverage.mixedAttackers}
                          max={team.length}
                          color="#8e24aa"
                        />
                        <RoleBar
                          label="Defensive"
                          value={roleCoverage.defensivePokemon}
                          max={team.length}
                          color="#1e88e5"
                        />
                      </div>

                      <h4>Speed Tiers</h4>
                      <div className="role-bars">
                        <RoleBar
                          label="Fast (≥100)"
                          value={roleCoverage.fastPokemon}
                          max={team.length}
                          color="#8e24aa"
                        />
                        <RoleBar
                          label="Medium"
                          value={roleCoverage.mediumSpeedPokemon}
                          max={team.length}
                          color="#f7a900"
                        />
                        <RoleBar
                          label="Slow (≤60)"
                          value={roleCoverage.slowPokemon}
                          max={team.length}
                          color="#a8a77a"
                        />
                      </div>
                    </div>

                    {averageStatValues && (
                      <div className="radar-container">
                        {averageStatsView === 'bar' ? (
                          <>
                            <StatBars values={averageStatValues} maxValue={180} />
                            <p className="radar-label">Team Average Stats (Bar Graph)</p>
                          </>
                        ) : (
                          <>
                            <RadarChart values={averageStatValues} />
                            <p className="radar-label">Team Average Stats (Spider Diagram)</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>

            {!isLoadingTypeData && typeCoverageRows.length > 0 && (
              <article className="analysis-card coverage-table-card">
                <h3>Type Coverage Table</h3>
                <div className="table-scroll">
                  <table className="analysis-table analysis-table--coverage">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Weak</th>
                        <th>Resist</th>
                        <th>Immune</th>
                        <th>Strong Attackers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeCoverageRows.map((row) => (
                        <Fragment key={row.type}>
                          <tr>
                            <th>
                              <button
                                type="button"
                                className={`coverage-type-button ${
                                  selectedCoverageType === row.type ? 'is-active' : ''
                                }`}
                                onClick={() =>
                                  setSelectedCoverageType((current) =>
                                    current === row.type ? null : row.type,
                                  )
                                }
                                aria-pressed={selectedCoverageType === row.type}
                                title="Click to view type breakdown"
                              >
                                <span className={`type-pill-inline ${getTypeClassName(row.type)}`}>
                                  {toTitleCase(row.type)}
                                </span>
                              </button>
                            </th>
                            <td>
                              <span
                                className={getCoverageCountClass('weak', row.weakCount)}
                                title={row.weakNames.length > 0 ? row.weakNames.join(', ') : undefined}
                                style={row.weakNames.length > 0 ? { cursor: 'help' } : undefined}
                              >
                                {row.weakCount}
                              </span>
                            </td>
                            <td>
                              <span
                                className={getCoverageCountClass('resist', row.resistCount)}
                                title={
                                  row.resistNames.length > 0
                                    ? row.resistNames.join(', ')
                                    : undefined
                                }
                                style={row.resistNames.length > 0 ? { cursor: 'help' } : undefined}
                              >
                                {row.resistCount}
                              </span>
                            </td>
                            <td>
                              <span
                                className={getCoverageCountClass('immune', row.immuneCount)}
                                title={
                                  row.immuneNames.length > 0
                                    ? row.immuneNames.join(', ')
                                    : undefined
                                }
                                style={row.immuneNames.length > 0 ? { cursor: 'help' } : undefined}
                              >
                                {row.immuneCount}
                              </span>
                            </td>
                            <td>
                              <span
                                className={getCoverageCountClass('attack', row.attackerCount)}
                                title={
                                  row.attackerNames.length > 0
                                    ? row.attackerNames.join(', ')
                                    : undefined
                                }
                                style={row.attackerNames.length > 0 ? { cursor: 'help' } : undefined}
                              >
                                {row.attackerCount}
                              </span>
                            </td>
                          </tr>

                          {selectedCoverageType === row.type && (
                            <tr className="coverage-breakdown-row">
                              <td colSpan={5}>
                                <div className="coverage-breakdown coverage-breakdown--inline" aria-live="polite">
                                  <p className="coverage-breakdown-title">
                                    Breakdown for{' '}
                                    <span className={`type-pill-inline ${getTypeClassName(row.type)}`}>
                                      {toTitleCase(row.type)}
                                    </span>
                                  </p>
                                  <ul className="coverage-breakdown-list">
                                    <li>
                                      <strong>Weak:</strong>{' '}
                                      {row.weakNames.length > 0 ? row.weakNames.join(', ') : 'None'}
                                    </li>
                                    <li>
                                      <strong>Resist:</strong>{' '}
                                      {row.resistNames.length > 0
                                        ? row.resistNames.join(', ')
                                        : 'None'}
                                    </li>
                                    <li>
                                      <strong>Immune:</strong>{' '}
                                      {row.immuneNames.length > 0
                                        ? row.immuneNames.join(', ')
                                        : 'None'}
                                    </li>
                                    <li>
                                      <strong>Strong Attackers:</strong>{' '}
                                      {row.attackerNames.length > 0
                                        ? row.attackerNames.join(', ')
                                        : 'None'}
                                    </li>
                                  </ul>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {!isLoadingTypeData && Object.keys(defensiveMultipliers).length > 0 && (
              <article className="analysis-card coverage-table-card">
                <h3>Per-Pokemon Defensive Multipliers</h3>
                <div className="table-scroll">
                  <table className="analysis-table analysis-table--defense">
                    <thead>
                      <tr>
                        <th>Pokemon</th>
                        {POKEMON_TYPES.map((type) => (
                          <th key={type}>
                            <span
                              className={`type-pill-inline type-pill-inline--compact ${getTypeClassName(type)}`}
                            >
                              {toTitleCase(type)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((pokemon) => (
                        <tr key={pokemon.id}>
                          <th>{toTitleCase(pokemon.name)}</th>
                          {POKEMON_TYPES.map((type) => {
                            const multiplier = defensiveMultipliers[pokemon.id][type] ?? 1
                            return (
                              <td key={`${pokemon.id}-${type}`}>
                                <span className={`multiplier-badge ${getMultiplierClass(multiplier)}`}>
                                  {formatMultiplier(multiplier)}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            <article className="analysis-card recommendations-card">
              <h3>Recommendations</h3>
              <p className="recommendations-helper">
                Generate simple team advice based on your current roles, shared weaknesses, and
                coverage gaps.
              </p>
              <div className="recommendations-actions">
                <button
                  type="button"
                  onClick={() => setShowRecommendations(true)}
                  disabled={team.length === 0 || isLoadingTypeData}
                >
                  {showRecommendations ? 'Recommendations Loaded' : 'Show Recommendations'}
                </button>
                {!showRecommendations && (
                  <span className="recommendations-note">
                    Update your team, then press the button to see advice for that version.
                  </span>
                )}
              </div>

              {showRecommendations && (
                <div className="recommendations-list">
                  {recommendations.map((recommendation) => (
                    <article
                      key={recommendation.title}
                      className={`recommendation-item recommendation-item--${recommendation.tone}`}
                    >
                      <h4>{recommendation.title}</h4>

                      {recommendation.sprites && recommendation.sprites.length > 0 && (
                        <div className="rec-sprites">
                          {recommendation.sprites.map((item) => (
                            <div key={item.name} className="rec-sprite-item">
                              {item.sprite && (
                                <img src={item.sprite} alt={item.name} className="rec-sprite-img" />
                              )}
                              <span className="rec-sprite-name">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p>{renderWithTypeBadges(recommendation.detail)}</p>

                      {recommendation.suggestedTypes && recommendation.suggestedTypes.length > 0 && (
                        <div className="rec-suggested-types">
                          <span className="rec-suggested-label">Try adding:</span>
                          {recommendation.suggestedTypes.map((type) => (
                            <span
                              key={type}
                              className={`type-pill-inline ${getTypeClassName(type)}`}
                            >
                              {toTitleCase(type)}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </article>
          </>
        )}
      </section>
    </main>
  )
}

export default App
