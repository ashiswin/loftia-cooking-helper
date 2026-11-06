import type { Recipe } from '../data/gameData'
import { Dew } from './Dew'
import { Sprite } from './Sprite'
import { formatMinutes, formatRate, formatSigned } from '../lib/format'

type TimeMode = 'parallel' | 'sequential'

type RecipeRowProps = {
  recipe: Recipe
  cost: number
  profit: number
  time: number
  timeMode: TimeMode
  expanded: boolean
  onToggle: () => void
  freeGather: boolean
}

const sourceLabel: Record<string, string> = {
  seed: 'Seed',
  shop: 'Shop',
  gather: 'Gathered',
  sapling: 'Sapling',
  craft: 'Crafted',
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`chevron ${open ? 'is-open' : ''}`} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function sourceNote(ing: Recipe['ingredients'][number], freeGather: boolean) {
  if (ing.source === 'gather') return freeGather ? 'free' : 'sell value'
  if (ing.source === 'sapling') return freeGather ? 'free' : 'sell value'
  if (ing.source === 'craft') return ing.costNote
  return ing.costNote.replace(/\s+\d+$/, '')
}

function ClockIcon() {
  return (
    <svg className="inline-glyph" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6v4.4l2.8 1.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function RecipeRow({
  recipe,
  cost,
  profit,
  time,
  timeMode,
  expanded,
  onToggle,
  freeGather,
}: RecipeRowProps) {
  const rate = time > 0 ? profit / (time / 60) : profit > 0 ? Number.POSITIVE_INFINITY : 0

  return (
    <article className={`recipe-row ${expanded ? 'is-expanded' : ''}`}>
      <div className="recipe-main">
        <button type="button" className="recipe-cell recipe-name-cell" onClick={onToggle} aria-expanded={expanded}>
          <Sprite src={recipe.icon} alt={recipe.name} color={recipe.color} size="md" />
          <span className="recipe-name-wrap">
            <span className="recipe-name">{recipe.name}</span>
            <span className="recipe-meta">
              <span className={`type-pill ${recipe.type === 'Drink' ? 'is-drink' : ''}`}>{recipe.type}</span>
              <span className="level-pill">Lv {recipe.level}</span>
            </span>
          </span>
        </button>

        <div className="ingredient-chips" aria-label="Ingredients">
          {recipe.ingredients.map((ing) => (
            <span className="ing-chip" key={ing.slug} title={`${ing.qty}× ${ing.name}`}>
              <Sprite src={ing.icon} alt={ing.name} color={ing.color} size="xs" />
              <b>{ing.qty}</b>
            </span>
          ))}
        </div>

        <div className="num-cell" data-label="Cost">
          <Dew value={cost} className="dew-muted" />
        </div>
        <div className="num-cell" data-label="Sells">
          <Dew value={recipe.sell} />
        </div>
        <div className="num-cell" data-label="Profit">
          <span className={`profit-pill ${profit < 0 ? 'is-negative' : ''}`}>{formatSigned(profit)}</span>
        </div>
        <div className="num-cell time-cell" data-label="Grow time">
          <span className="time-value"><ClockIcon />{formatMinutes(time)}</span>
          <small>{timeMode === 'parallel' ? 'parallel' : 'one plot'}</small>
        </div>
        <div className="num-cell rate-cell" data-label="Dew / hr">
          <span className={profit < 0 ? 'is-negative-text' : ''}>{formatRate(rate)}</span>
          <small>dew/hr</small>
        </div>

        <button
          type="button"
          className="expand-btn"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Hide' : 'Show'} details for ${recipe.name}`}
        >
          <Chevron open={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="recipe-detail">
          <div className="detail-intro">
            <p>{recipe.description}</p>
            <div className="detail-pills">
              <span className="detail-pill"><img src="/icons/cooking-station.webp" alt="" /> Cooking Station Lv {recipe.level}</span>
              <span className="detail-pill"><img src="/ui/energy-cost.webp" alt="" /> {recipe.energy} energy</span>
              <span className="detail-pill"><ClockIcon /> {formatMinutes(time)} to grow</span>
            </div>
          </div>

          <div className="detail-grid">
            <section className="detail-card">
              <div className="detail-card-head">
                <h3>Ingredient breakdown</h3>
                <span>{freeGather ? 'gathered = free' : 'gathered at sell value'}</span>
              </div>
              <div className="ing-table">
                <div className="ing-table-head">
                  <span>Ingredient</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Grow</span>
                  <span>Line</span>
                </div>
                {recipe.ingredients.map((ing) => {
                  const unit = freeGather ? ing.unitCostFree : ing.unitCost
                  const line = freeGather ? ing.costFree : ing.cost
                  return (
                    <div className="ing-table-row" key={ing.slug}>
                      <span className="ing-name-cell">
                        <Sprite src={ing.icon} alt={ing.name} color={ing.color} size="sm" />
                        <span>
                          <strong>{ing.name}</strong>
                          <small title={ing.costNote}>{sourceLabel[ing.source]} · {sourceNote(ing, freeGather)}</small>
                        </span>
                      </span>
                      <span data-label="Qty">×{ing.qty}</span>
                      <span data-label="Unit"><Dew value={unit} className="dew-muted" /></span>
                      <span data-label="Grow">{ing.grow > 0 ? formatMinutes(ing.grow) : '—'}</span>
                      <span data-label="Line"><Dew value={line} /></span>
                    </div>
                  )
                })}
              </div>
              <div className="ing-total">
                <span>Total material cost</span>
                <Dew value={cost} />
              </div>
            </section>

            <section className="detail-card">
              <div className="detail-card-head">
                <h3>Profit snapshot</h3>
                <span>{freeGather ? 'gathered free' : 'gathered at sell value'}</span>
              </div>
              <dl className="mini-stats">
                <div>
                  <dt>Sell price</dt>
                  <dd><Dew value={recipe.sell} /></dd>
                </div>
                <div>
                  <dt>Material cost</dt>
                  <dd><Dew value={cost} /></dd>
                </div>
                <div className="is-emphasis">
                  <dt>Net profit</dt>
                  <dd className={profit < 0 ? 'is-negative-text' : 'is-positive-text'}>{formatSigned(profit)} dew</dd>
                </div>
                <div>
                  <dt>Dew per hour</dt>
                  <dd>{formatRate(rate)} <small>dew/hr</small></dd>
                </div>
                <div>
                  <dt>Grow time · parallel</dt>
                  <dd>{formatMinutes(recipe.growParallel)}</dd>
                </div>
                <div>
                  <dt>Grow time · one plot</dt>
                  <dd>{formatMinutes(recipe.growSequential)}</dd>
                </div>
              </dl>
              <p className="detail-note">
                Grow times assume enough farm plots to grow each ingredient at once. One-plot time adds every ingredient together.
              </p>
            </section>
          </div>
        </div>
      )}
    </article>
  )
}
