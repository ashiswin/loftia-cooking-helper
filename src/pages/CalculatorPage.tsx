import { useDeferredValue, useMemo, useState } from 'react'
import { Segmented } from '../components/Segmented'
import { Sprite } from '../components/Sprite'
import { formatDew, formatSigned } from '../lib/format'
import {
  optimizePantry,
  pantryGroups,
  pantryIngredients,
  type Inventory,
  type PantryIngredient,
  type ProfitBasis,
} from '../lib/optimizer'

type GatheredMode = 'market' | 'free'

const basisOptions = [
  { value: 'gross', label: 'Gross dew' },
  { value: 'raw', label: 'Value gain' },
  { value: 'market', label: 'Recipe margin' },
]

const stationOptions = [
  { value: '1', label: 'Lv 1' },
  { value: '2', label: 'Lv 2' },
  { value: '3', label: 'Lv 3' },
]

const sourceLabel: Record<string, string> = {
  seed: 'Seed',
  shop: 'Shop',
  gather: 'Foraged',
  sapling: 'Sapling',
  craft: 'Crafted',
}

const sampleInventory: Inventory = {
  carrot: 12,
  tomato: 10,
  potato: 10,
  wheat: 16,
  rice: 8,
  onion: 10,
  garlic: 6,
  radish: 6,
  'chili-pepper': 4,
  soybeans: 6,
  spinach: 4,
  pineapple: 6,
  coconut: 6,
  banana: 6,
  cacao: 6,
  milk: 10,
  egg: 12,
  butter: 8,
  sugar: 10,
  'cooking-oil': 8,
  salt: 10,
  'wild-berries': 10,
  cinnamon: 6,
  cumin: 4,
  honey: 4,
  cauliflower: 4,
  eggplant: 6,
  watermelon: 4,
  basil: 4,
  lettuce: 10,
  flax: 4,
  algae: 4,
  'enoki-mushrooms': 6,
  'oyster-mushrooms': 6,
  'portobello-mushrooms': 6,
  'bioluminescent-ivy': 4,
}

function qtyOf(inventory: Inventory, slug: string) {
  return Math.max(0, Math.floor(inventory[slug] ?? 0))
}

function PantryRow({
  ingredient,
  qty,
  onSet,
}: {
  ingredient: PantryIngredient
  qty: number
  onSet: (qty: number) => void
}) {
  return (
    <div className={`pantry-row ${qty > 0 ? 'has-stock' : ''}`}>
      <Sprite src={ingredient.icon} alt={ingredient.name} color={ingredient.color} size="sm" />
      <div className="pantry-info">
        <span className="pantry-name">{ingredient.name}</span>
        <span className="pantry-source">
          {sourceLabel[ingredient.source]} · sells {formatDew(ingredient.sell)}
        </span>
      </div>
      <div className="qty-control">
        <button type="button" onClick={() => onSet(Math.max(0, qty - 1))} aria-label={`Remove one ${ingredient.name}`}>
          −
        </button>
        <input
          type="number"
          min={0}
          max={9999}
          inputMode="numeric"
          value={qty === 0 ? '' : qty}
          placeholder="0"
          aria-label={`${ingredient.name} quantity`}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10)
            onSet(Number.isFinite(next) ? Math.max(0, Math.min(9999, next)) : 0)
          }}
        />
        <button type="button" onClick={() => onSet(qty + 1)} aria-label={`Add one ${ingredient.name}`}>
          +
        </button>
      </div>
    </div>
  )
}

export function CalculatorPage() {
  const [inventory, setInventory] = useState<Inventory>({})
  const [basis, setBasis] = useState<ProfitBasis>('gross')
  const [stationLevel, setStationLevel] = useState('3')
  const [search, setSearch] = useState('')
  const [gatheredMode, setGatheredMode] = useState<GatheredMode>('market')

  const deferredInventory = useDeferredValue(inventory)
  const result = useMemo(
    () => optimizePantry(deferredInventory, basis, Number(stationLevel), gatheredMode === 'free'),
    [basis, deferredInventory, gatheredMode, stationLevel],
  )

  const filteredIngredients = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pantryIngredients
    return pantryIngredients.filter((ingredient) => ingredient.name.toLowerCase().includes(term))
  }, [search])

  const groups = useMemo(() => pantryGroups(filteredIngredients), [filteredIngredients])
  const totalStock = useMemo(() => pantryIngredients.reduce((total, ingredient) => total + qtyOf(inventory, ingredient.slug), 0), [inventory])
  const usedItems = pantryIngredients.filter((ingredient) => (result.used[ingredient.slug] ?? 0) > 0)
  const leftoverItems = pantryIngredients.filter(
    (ingredient) => (result.leftover[ingredient.slug] ?? 0) > 0 && qtyOf(inventory, ingredient.slug) > 0,
  )

  const setQty = (slug: string, qty: number) => {
    setInventory((current) => ({ ...current, [slug]: Math.max(0, qty) }))
  }

  const profitLabel = basis === 'raw' ? 'Value gain' : basis === 'market' ? 'Recipe margin' : 'Gross sales'
  const profitTone = result.totalProfit > 0 ? 'is-positive' : 'is-neutral'

  return (
    <div className="calculator-page">
      <section className="calc-hero">
        <div className="calc-hero-copy">
          <span className="eyebrow"><img src="/icons/cooking-station.webp" alt="" /> Inventory optimizer</span>
          <h1>Pantry Planner</h1>
          <p>
            Tell the kitchen what you have. It searches every recipe and every ingredient limit to find the set of
            dishes that turns your pantry into the most dew.
          </p>
        </div>
        <div className="calc-hero-stats">
          <div>
            <span>In pantry</span>
            <strong>{totalStock}</strong>
            <small>ingredients</small>
          </div>
          <div>
            <span>Plan profit</span>
            <strong>{result.totalProfit > 0 ? `+${formatDew(result.totalProfit)}` : formatDew(result.totalProfit)}</strong>
            <small>dew</small>
          </div>
          <div>
            <span>Dishes</span>
            <strong>{result.totalDishes}</strong>
            <small>to cook</small>
          </div>
        </div>
      </section>

      <section className="calc-controls">
        <div className="calc-control-block">
          <Segmented
            label="Profit basis"
            value={basis}
            onChange={(value) => setBasis(value as ProfitBasis)}
            options={basisOptions}
          />
          <p className="basis-help">
            {basis === 'raw' && 'Cooked sell price minus what your raw ingredients would sell for. Best for a pantry you already own.'}
            {basis === 'market' && 'Cooked sell price minus seed and shop costs. Best when you are buying materials to cook.'}
            {basis === 'gross' && 'Total sell price of the plan, ignoring ingredient value. Best for raw revenue targets.'}
          </p>
        </div>
        <Segmented
          label="Cooking station"
          value={stationLevel}
          onChange={setStationLevel}
          options={stationOptions}
        />
        <Segmented
          label="Foraged pricing"
          value={gatheredMode}
          onChange={(value) => setGatheredMode(value as GatheredMode)}
          options={[
            { value: 'market', label: 'Sell value' },
            { value: 'free', label: 'Free' },
          ]}
        />
        <div className="calc-actions">
          <button type="button" className="ghost-button" onClick={() => setInventory({})}>
            Clear pantry
          </button>
          <button type="button" className="soft-button" onClick={() => setInventory(sampleInventory)}>
            Load sample
          </button>
        </div>
      </section>

      <div className="calc-layout">
        <section className="calc-card pantry-card">
          <div className="calc-card-head">
            <div>
              <h2>Your pantry</h2>
              <p>Enter whole ingredients. Your plan updates as you type.</p>
            </div>
            <span className="result-count">{totalStock} items</span>
          </div>

          <div className="search-box pantry-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.6" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m15.5 15.5 4.4 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find an ingredient…"
              aria-label="Find an ingredient"
            />
            {search && (
              <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Clear ingredient search">
                ×
              </button>
            )}
          </div>

          {groups.map((group) => (
            <div className="pantry-group" key={group.label}>
              <h3>
                {group.label}
                <span>{group.items.length}</span>
              </h3>
              <div className="pantry-grid">
                {group.items.map((ingredient) => (
                  <PantryRow
                    key={ingredient.slug}
                    ingredient={ingredient}
                    qty={qtyOf(inventory, ingredient.slug)}
                    onSet={(qty) => setQty(ingredient.slug, qty)}
                  />
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="empty-state pantry-empty">
              <Sprite src="/icons/cooking-station.webp" alt="" color="#4f9d74" size="lg" />
              <h3>No ingredient found</h3>
              <p>Try another name, or clear the search.</p>
            </div>
          )}
        </section>

        <section className="calc-card plan-card">
          <div className="calc-card-head">
            <div>
              <h2>Optimal cook plan</h2>
              <p>
                {result.status === 'optimal' && 'Exact solution across all available recipes.'}
                {result.status === 'timedout' && 'Solver hit its time limit; this is the best plan found.'}
                {result.status !== 'optimal' && result.status !== 'timedout' && 'No feasible plan could be solved.'}
              </p>
            </div>
            <span className={`solver-badge ${result.status}`}>{result.status === 'optimal' ? 'Optimal' : result.status}</span>
          </div>

          <div className="plan-summary">
            <div className={`plan-stat ${profitTone}`}>
              <span>{profitLabel}</span>
              <strong>{result.totalProfit > 0 ? `+${formatDew(result.totalProfit)}` : formatDew(result.totalProfit)}</strong>
              <small>dew</small>
            </div>
            <div className="plan-stat">
              <span>Dishes</span>
              <strong>{result.totalDishes}</strong>
              <small>to cook</small>
            </div>
            <div className="plan-stat">
              <span>Raw value used</span>
              <strong>{formatDew(result.rawValueUsed)}</strong>
              <small>dew</small>
            </div>
            <div className="plan-stat">
              <span>Pantry left</span>
              <strong>{formatDew(result.leftoverRawValue)}</strong>
              <small>dew raw</small>
            </div>
          </div>

          <div className="plan-context">
            <span>Pantry raw value: <b>{formatDew(result.pantryRawValue)} dew</b></span>
            <span>Plan sells for: <b>{formatDew(result.totalSell)} dew</b></span>
          </div>

          {result.lines.length > 0 ? (
            <>
              <div className="plan-lines">
                {result.lines.map((line) => (
                  <article className="plan-line" key={line.recipe.slug}>
                    <Sprite src={line.recipe.icon} alt={line.recipe.name} color={line.recipe.color} size="md" />
                    <div className="plan-line-body">
                      <div className="plan-line-head">
                        <strong>{line.recipe.name}</strong>
                        <span className="plan-qty">×{line.qty}</span>
                      </div>
                      <div className="plan-line-meta">
                        <span>{line.recipe.type} · Lv {line.recipe.level}</span>
                        <span>Sells for {formatDew(line.sellTotal)}</span>
                        <span className="plan-profit">{formatSigned(line.profitTotal)} {basis === 'gross' ? 'dew' : 'gain'}</span>
                      </div>
                      <div className="plan-ingredients">
                        {line.recipe.ingredients.map((ingredient) => (
                          <span className="plan-ingredient" key={ingredient.slug}>
                            <Sprite src={ingredient.icon} alt="" color={ingredient.color} size="xs" />
                            {ingredient.qty * line.qty}× {ingredient.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {usedItems.length > 0 && (
                <div className="plan-section">
                  <h3>Ingredients used</h3>
                  <div className="leftover-chips">
                    {usedItems.map((ingredient) => (
                      <span className="leftover-chip" key={ingredient.slug} title={ingredient.name}>
                        <Sprite src={ingredient.icon} alt="" color={ingredient.color} size="xs" />
                        <b>{result.used[ingredient.slug]}</b>
                        <span>{ingredient.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {leftoverItems.length > 0 && (
                <div className="plan-section">
                  <h3>Leftover pantry</h3>
                  <div className="leftover-chips">
                    {leftoverItems.map((ingredient) => (
                      <span className="leftover-chip" key={ingredient.slug} title={ingredient.name}>
                        <Sprite src={ingredient.icon} alt="" color={ingredient.color} size="xs" />
                        <b>{result.leftover[ingredient.slug]}</b>
                        <span>{ingredient.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state plan-empty">
              <Sprite src="/icons/cooking-station.webp" alt="" color="#4f9d74" size="lg" />
              <h3>{totalStock === 0 ? 'Your pantry is empty' : 'No profitable plan yet'}</h3>
              <p>
                {totalStock === 0
                  ? 'Add a few ingredients or load the sample pantry to see the optimizer work.'
                  : 'Try another profit basis or a lower station level. Selling these ingredients raw may be the better move.'}
              </p>
              {totalStock === 0 && (
                <button type="button" onClick={() => setInventory(sampleInventory)}>
                  Load sample pantry
                </button>
              )}
            </div>
          )}
        </section>
      </div>

    </div>
  )
}
