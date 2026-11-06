import { useMemo, useState } from 'react'
import { recipes } from './data/gameData'
import { RecipeRow } from './components/RecipeRow'
import { Sprite } from './components/Sprite'
import { formatMinutes, formatRate, formatSigned } from './lib/format'
import './App.css'

type SortKey = 'name' | 'cost' | 'sell' | 'profit' | 'time' | 'rate' | 'level'
type SortDir = 'asc' | 'desc'
type TimeMode = 'parallel' | 'sequential'
type GatheredMode = 'market' | 'free'

const defaultDir: Record<SortKey, SortDir> = {
  name: 'asc',
  cost: 'asc',
  sell: 'desc',
  profit: 'desc',
  time: 'asc',
  rate: 'desc',
  level: 'asc',
}

const ingredientCount = new Set(recipes.flatMap((recipe) => recipe.ingredients.map((ing) => ing.slug))).size

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="segmented-wrap">
      <span className="control-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'is-active' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SortButton({
  children,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  children: React.ReactNode
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      className={`sort-btn ${active ? 'is-active' : ''} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {children}
      <span className="sort-arrow" aria-hidden="true">
        {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [type, setType] = useState('all')
  const [timeMode, setTimeMode] = useState<TimeMode>('parallel')
  const [gathered, setGathered] = useState<GatheredMode>('market')
  const [onlyProfitable, setOnlyProfitable] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'profit', dir: 'desc' })
  const [expanded, setExpanded] = useState<string | null>(null)

  const freeGather = gathered === 'free'

  const view = useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = recipes.filter((recipe) => {
      if (level !== 'all' && recipe.level !== Number(level)) return false
      if (type !== 'all' && recipe.type !== type) return false
      const profit = freeGather ? recipe.profitFree : recipe.profit
      if (onlyProfitable && profit <= 0) return false
      if (!search) return true
      return (
        recipe.name.toLowerCase().includes(search) ||
        recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(search))
      )
    })

    const mapped = filtered.map((recipe) => {
      const cost = freeGather ? recipe.costFree : recipe.cost
      const profit = freeGather ? recipe.profitFree : recipe.profit
      const time = timeMode === 'parallel' ? recipe.growParallel : recipe.growSequential
      const rate = time > 0 ? profit / (time / 60) : profit > 0 ? Number.POSITIVE_INFINITY : 0
      return { recipe, cost, profit, time, rate }
    })

    mapped.sort((a, b) => {
      let av: string | number
      let bv: string | number
      switch (sort.key) {
        case 'name':
          av = a.recipe.name.toLowerCase()
          bv = b.recipe.name.toLowerCase()
          break
        case 'cost':
          av = a.cost
          bv = b.cost
          break
        case 'sell':
          av = a.recipe.sell
          bv = b.recipe.sell
          break
        case 'profit':
          av = a.profit
          bv = b.profit
          break
        case 'time':
          av = a.time
          bv = b.time
          break
        case 'level':
          av = a.recipe.level
          bv = b.recipe.level
          break
        case 'rate':
          av = a.rate
          bv = b.rate
          break
      }
      const result = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sort.dir === 'asc' ? result : -result
    })

    return mapped
  }, [freeGather, level, onlyProfitable, query, sort, timeMode, type])

  const bestProfit = useMemo(() => {
    return view.reduce<(typeof view)[number] | null>((best, row) => (!best || row.profit > best.profit ? row : best), null)
  }, [view])

  const bestRate = useMemo(() => {
    const timed = view.filter((row) => row.time > 0 && row.profit > 0)
    if (timed.length === 0) return bestProfit
    return timed.reduce((best, row) => (row.rate > best.rate ? row : best), timed[0])
  }, [bestProfit, view])

  const quickest = useMemo(() => {
    const profitable = view.filter((row) => row.profit > 0)
    if (profitable.length === 0) return null
    return profitable.reduce((best, row) => {
      if (row.time < best.time) return row
      if (row.time === best.time && row.profit > best.profit) return row
      return best
    }, profitable[0])
  }, [view])

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: defaultDir[key] }
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <img src="/ui/leaf.webp" alt="" />
          </span>
          <span className="brand-text">
            <strong>Loftia</strong>
            <em>Cooking Helper</em>
          </span>
        </a>
        <div className="topbar-right">
          <span className="fan-badge">Fan-made</span>
          <a className="codex-link" href="https://loftiacodex.com/items?category=Resources&subcategory=Foods" target="_blank" rel="noreferrer">
            Data from Loftia Codex <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><img src="/ui/blueprint.webp" alt="" /> Farmer's market math</span>
            <h1>
              Cook smarter.
              <span>Grow richer.</span>
            </h1>
            <p>
              Every cooking recipe in Loftia, with the true cost of its ingredients, how long the garden needs,
              and the profit left in your pocket. Sort by dew or by time and find your next best dish.
            </p>
            <div className="hero-stats">
              <span><b>{recipes.length}</b> recipes</span>
              <span><b>{ingredientCount}</b> ingredients</span>
              <span><b>3</b> station levels</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="hero-halo" />
            <span className="hero-plate">
              <Sprite src="/icons/cooking-station.webp" alt="" size="hero" color="#4f9d74" />
            </span>
            <span className="float float-carrot"><Sprite src="/icons/carrot.webp" alt="" size="lg" color="#8c8f7c" /></span>
            <span className="float float-tomato"><Sprite src="/icons/tomato.webp" alt="" size="md" color="#4f9d74" /></span>
            <span className="float float-wheat"><Sprite src="/icons/wheat.webp" alt="" size="md" color="#8c8f7c" /></span>
            <span className="float float-honey"><Sprite src="/icons/honey.webp" alt="" size="md" color="#4f9d74" /></span>
            <span className="float float-soup"><Sprite src="/icons/carrot-soup.webp" alt="" size="lg" color="#4f9d74" /></span>
          </div>
        </section>

        <section className="toolbar" aria-label="Recipe filters">
          <div className="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m15.5 15.5 4.4 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes or ingredients…"
              aria-label="Search recipes or ingredients"
            />
            {query && (
              <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <div className="filters">
            <Segmented
              label="Station"
              value={level}
              onChange={setLevel}
              options={[
                { value: 'all', label: 'All' },
                { value: '1', label: 'Lv 1' },
                { value: '2', label: 'Lv 2' },
                { value: '3', label: 'Lv 3' },
              ]}
            />
            <Segmented
              label="Type"
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'All' },
                { value: 'Food', label: 'Food' },
                { value: 'Drink', label: 'Drink' },
              ]}
            />
            <Segmented
              label="Grow time"
              value={timeMode}
              onChange={(value) => setTimeMode(value as TimeMode)}
              options={[
                { value: 'parallel', label: 'Parallel' },
                { value: 'sequential', label: 'One plot' },
              ]}
            />
            <Segmented
              label="Gathered"
              value={gathered}
              onChange={(value) => setGathered(value as GatheredMode)}
              options={[
                { value: 'market', label: 'Sell value' },
                { value: 'free', label: 'Free' },
              ]}
            />
            <label className="check-control">
              <input type="checkbox" checked={onlyProfitable} onChange={(event) => setOnlyProfitable(event.target.checked)} />
              <span>Profitable only</span>
            </label>
          </div>
        </section>

        <section className="highlights" aria-label="Recipe highlights">
          <article className="highlight-card">
            <div className="highlight-icon">
              {bestProfit && <Sprite src={bestProfit.recipe.icon} alt="" color={bestProfit.recipe.color} size="md" />}
            </div>
            <div>
              <span className="highlight-label">Best net profit</span>
              <strong className="highlight-value">{bestProfit ? `${formatSigned(bestProfit.profit)} dew` : '—'}</strong>
              <span className="highlight-name">{bestProfit?.recipe.name ?? 'No recipes match'}</span>
            </div>
          </article>
          <article className="highlight-card">
            <div className="highlight-icon">
              {bestRate && <Sprite src={bestRate.recipe.icon} alt="" color={bestRate.recipe.color} size="md" />}
            </div>
            <div>
              <span className="highlight-label">Best dew per hour</span>
              <strong className="highlight-value">{bestRate ? `${formatRate(bestRate.rate)} / hr` : '—'}</strong>
              <span className="highlight-name">{bestRate?.recipe.name ?? 'No timed recipes'}</span>
            </div>
          </article>
          <article className="highlight-card">
            <div className="highlight-icon">
              {quickest && <Sprite src={quickest.recipe.icon} alt="" color={quickest.recipe.color} size="md" />}
            </div>
            <div>
              <span className="highlight-label">Quickest profit</span>
              <strong className="highlight-value">{quickest ? formatMinutes(quickest.time) : '—'}</strong>
              <span className="highlight-name">{quickest?.recipe.name ?? 'No profitable recipes'}</span>
            </div>
          </article>
        </section>

        <section className="recipe-panel">
          <div className="panel-head">
            <div>
              <h2>Recipe ledger</h2>
              <p>Click a recipe for its full ingredient cost and grow-time breakdown.</p>
            </div>
            <span className="result-count">{view.length} of {recipes.length} recipes</span>
          </div>

          <div className="table-head" role="row">
            <SortButton sortKey="name" sort={sort} onSort={toggleSort} className="head-recipe">Recipe</SortButton>
            <span className="head-ings">Ingredients</span>
            <SortButton sortKey="cost" sort={sort} onSort={toggleSort} className="head-num">Cost</SortButton>
            <SortButton sortKey="sell" sort={sort} onSort={toggleSort} className="head-num">Sells</SortButton>
            <SortButton sortKey="profit" sort={sort} onSort={toggleSort} className="head-num">Profit</SortButton>
            <SortButton sortKey="time" sort={sort} onSort={toggleSort} className="head-num">Grow time</SortButton>
            <SortButton sortKey="rate" sort={sort} onSort={toggleSort} className="head-num">Dew / hr</SortButton>
            <span className="head-expand" aria-hidden="true" />
          </div>

          <div className="recipe-list">
            {view.map(({ recipe, cost, profit, time }) => (
              <RecipeRow
                key={recipe.slug}
                recipe={recipe}
                cost={cost}
                profit={profit}
                time={time}
                timeMode={timeMode}
                expanded={expanded === recipe.slug}
                onToggle={() => setExpanded((current) => (current === recipe.slug ? null : recipe.slug))}
                freeGather={freeGather}
              />
            ))}
            {view.length === 0 && (
              <div className="empty-state">
                <Sprite src="/icons/cooking-station.webp" alt="" color="#4f9d74" size="lg" />
                <h3>No recipes on the menu</h3>
                <p>Try clearing the search or loosening the filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setLevel('all')
                    setType('all')
                    setOnlyProfitable(false)
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <div>
            <strong>How the math works</strong>
            <p>
              Material cost uses seed-shop prices for crops, Kun's Recipe Shop prices for bought ingredients, and the
              sell value of gathered items. Switch “Gathered” to “Free” if you plan to forage everything yourself.
            </p>
          </div>
          <div>
            <strong>About the data</strong>
            <p>
              Recipe, cost, and sprite data was pulled from <a href="https://loftiacodex.com/" target="_blank" rel="noreferrer">Loftia Codex</a>.
              This is an unofficial fan project, not affiliated with Loftia or Qloud Games.
            </p>
          </div>
          <div className="footer-note">
            <span className="footer-dew"><img src="/ui/currency-dew.webp" alt="" /> Prices in dew</span>
            <span>Recipes current as of Nov 2026</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
