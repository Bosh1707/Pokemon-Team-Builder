# Pokemon Team Builder

## Overview
Pokemon Team Builder is a React + TypeScript web application that helps users build a team of up to 6 Pokemon and evaluate team quality using data from PokeAPI.

## Table of Contents
 
- [Demo](#demo)
- [Overview](#overview)
- [Approach and Architecture](#approach-and-architecture)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [Testing Instructions](#testing-instructions)
- [Project Structure](#project-structure)
- [Known Limitations & Future Improvements](#known-limitations--future-improvements)
- [Assumptions](#assumptions)
 


## Demo
 
[App demo](./docs/demo.mp4)
 
**Key screens:**
- **Search panel** — filter by name and up to 2 types, with a loading skeleton while the Pokémon index fetches
- **Team grid** — per-Pokémon stat bars or radar chart, switchable per card
- **Analysis panel** — type coverage table, per-Pokémon defensive multiplier matrix, role/speed balance bars, and recommendation cards
- **localStorage persistence** — team survives a page refresh
 

## Approach and Architecture

### Tech Stack
 
| Tool | Version | Purpose |
|---|---|---|
| [React](https://react.dev/) | 18 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.6 | Type safety |
| [Vite](https://vitejs.dev/) | 6 | Build tool and dev server |
| [Vitest](https://vitest.dev/) | 2 | Unit test runner |
| [Testing Library](https://testing-library.com/) | 16 | React component testing utilities |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Base CSS reset |
| [PokéAPI](https://pokeapi.co/) | v2 | Pokémon and type data |
 
---

### Design approach
- Keep the UI interactive and immediate, with fast in-browser filtering and memoized computations.
- Separate data transformation logic from rendering where possible.
- Handle loading and failure states explicitly so the app remains usable even when parts of API data fail.

### High-level architecture
- `src/App.tsx`
	- Main container and UI composition
	- API integration and state management
	- Team operations (add/remove Pokemon)
	- Analysis and recommendation generation
- `src/utils/formatters.ts`
	- Display helpers (title casing, sprite id parsing, stat/type class mapping, multiplier formatting)
- `src/utils/multipliers.ts`
	- Type multiplier and coverage helper functions
- `src/utils/localStorage.ts`
	- Team persistence helpers (save/load/clear)
- `src/utils/__tests__/`
	- Unit tests for extracted utility logic

### API integration and data handling
- Primary endpoint: `https://pokeapi.co/api/v2/pokemon?limit=1302`
	- Used to load the searchable Pokemon index
- Secondary endpoint pattern: `https://pokeapi.co/api/v2/type/{type}`
	- Used to build type-relation maps for coverage analysis and type filtering
- On-demand detail endpoint pattern: `https://pokeapi.co/api/v2/pokemon/{name}`
	- Used when adding a selected Pokemon to the team

### Loading and error handling strategy
- Separate loading states for:
	- Pokemon list (`isLoadingList`)
	- Type relation data (`isLoadingTypeData`)
	- Add action (`isAdding`)
- Error messaging:
	- Full list load failures show a clear blocking message
	- Type data failures degrade gracefully (team builder still works, analysis may be limited)
	- Missing Pokemon names show actionable feedback

## Setup Instructions
### Prerequisites
- Node.js 18+ (recommended current LTS)
- npm 9+

### Install dependencies
```bash
npm install
```

### Run the app (development)
```bash
npm run dev
```

Then open the local Vite URL shown in the terminal (usually `http://localhost:5173`).

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Testing Instructions
### Run unit tests
```bash
npm test
```

### Run tests in UI mode
```bash
npm run test:ui
```

Current tests cover utility modules in `src/utils/__tests__/`:
- `formatters.test.ts`
- `multipliers.test.ts`

## Assumptions and Challenges
### Assumptions
- PokeAPI response schemas are mostly stable for `pokemon` and `type` endpoints.
- Team size is intentionally capped at 6 Pokemon.
- Type filtering supports up to 2 selected types by design for simpler UX.
- Persisted team payload in `localStorage` is trusted after lightweight structure checks.

### Challenges encountered
- Coordinating multiple async data sources (Pokemon list + type relations) while keeping UI responsive.
- Handling partially available data so analysis features fail gracefully rather than blocking all interaction.
- Transforming nested API payloads into efficient structures (`Record`, `Set`) for repeated calculations.

### Design decisions and limitations
- Some heavy analysis logic currently lives in `App.tsx`; this can be further split into dedicated hooks/services.
- Recommendation logic is heuristic (rule-based), not battle-simulation accurate.
- Unit tests currently focus on pure utility functions, not full component integration.
- The app depends on live PokeAPI availability and does not include an offline fallback dataset.

### Rationale for the Recommendation System Logic
The recommendation engine is designed around the philosophy of synergistic roster construction rather than simply suggesting Pokemon with the highest overall base stats. Just like building a competitive sports lineup, a team consisting entirely of offensive units leaves critical structural gaps. The logic operates on three main heuristic pillars:

1. **Defensive Vulnerability Mapping (Plugging Holes):** The system calculates an aggregated matrix of the current team's elemental weaknesses. If a significant portion of the roster shares a vulnerability (e.g., three members are weak to Ground-type attacks), the algorithm prioritizes suggesting types that resist or are immune to that threat, ensuring the team isn't swept by a single counter.

2. **Functional Role Balance:**
   Using the base stat distributions, the system categorizes the current team into broad functional roles (e.g., fast physical attackers, bulky defensive anchors, special sweepers). If the analysis detects a skewed distribution—such as a lack of physical bulk—it adjusts its recommendations to suggest units that can fulfill that missing role and anchor the team's defense.

3. **Statistical Normalization:**
   By evaluating the team's average stats against a baseline expected average, the system identifies distinct statistical deficits. For instance, if the team possesses high attack but heavily lacks speed, the recommendation heuristic will weight faster Pokemon more heavily to prevent the team from being consistently out-paced. 

### Potential future improvements
 
- Add `localStorage` cache for the Pokémon index and type-relation data to reduce load time on repeat visits
- Introduce move-set analysis to complement the stat-based role classification
- Add an offline fallback dataset so the app works without a network connection
- Expand tests to cover component interactions with React Testing Library
- Split heavy analysis logic out of `App.tsx` into dedicated custom hooks (`useTypeAnalysis`, `useRecommendations`)