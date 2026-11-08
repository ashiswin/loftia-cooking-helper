import { useEffect, useMemo, useState } from 'react'
import { Dew } from '../components/Dew'
import { Sprite } from '../components/Sprite'
import { getDailyContributions } from '../lib/contributions'
import { buildShoppingSummary } from '../lib/shoppingList'

const STORAGE_KEY = 'loftia-global-village-v1'

type CheckByDay = Record<string, Record<string, boolean>>

function loadCheckByDay(): CheckByDay {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return {}
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const next: CheckByDay = {}
    for (const [dayKey, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const checked: Record<string, boolean> = {}
      for (const [key, isChecked] of Object.entries(value as Record<string, unknown>)) {
        if (typeof isChecked === 'boolean') checked[key] = isChecked
      }
      next[dayKey] = checked
    }
    return next
  } catch {
    return {}
  }
}

function countdown(target: number, now: number): string {
  const diff = Math.max(0, target - now)
  const totalMinutes = Math.floor(diff / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function GlobalVillagePage({ onAddRecipes }: { onAddRecipes: (slugs: string[]) => void }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const contributions = useMemo(() => getDailyContributions(now), [now])
  const dayKey = useMemo(() => contributions.map((entry) => `${entry.bin.id}:${entry.dayIndex}`).join('|'), [contributions])
  const [checkByDay, setCheckByDay] = useState<CheckByDay>(loadCheckByDay)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkByDay))
    } catch {
      // Checkboxes still work for this session if storage is unavailable.
    }
  }, [checkByDay])

  const checked = useMemo(() => checkByDay[dayKey] ?? {}, [checkByDay, dayKey])

  const doneCount = contributions.reduce((total, entry) => {
    return total + entry.recipes.filter((item) => checked[`${entry.bin.id}:${item.recipe.slug}`]).length
  }, 0)

  const remainingContributions = useMemo(
    () =>
      contributions.map((entry) => ({
        ...entry,
        recipes: entry.recipes.filter((item) => !checked[`${entry.bin.id}:${item.recipe.slug}`]),
      })),
    [checked, contributions],
  )

  const contributionList = useMemo(() => {
    const list: Record<string, number> = {}
    for (const entry of remainingContributions) {
      for (const item of entry.recipes) {
        list[item.recipe.slug] = (list[item.recipe.slug] ?? 0) + item.qty
      }
    }
    return list
  }, [remainingContributions])

  const shopping = useMemo(() => buildShoppingSummary(contributionList), [contributionList])
  const requestCount = contributions.reduce((total, entry) => total + entry.recipes.length, 0)
  const remainingRequestCount = remainingContributions.reduce((total, entry) => total + entry.recipes.length, 0)
  const rewardTotal = contributions.reduce((total, entry) => total + entry.bin.reward * entry.recipes.length, 0)
  const remainingReward = remainingContributions.reduce(
    (total, entry) => total + entry.bin.reward * entry.recipes.length,
    0,
  )
  const nextRefresh = Math.min(...contributions.map((entry) => entry.refreshAt))
  const allDone = remainingRequestCount === 0

  const toggle = (key: string) => {
    setCheckByDay((current) => ({
      ...current,
      [dayKey]: { ...(current[dayKey] ?? {}), [key]: !(current[dayKey]?.[key] ?? false) },
    }))
  }

  const addAllToShoppingList = () => {
    onAddRecipes(remainingContributions.flatMap((entry) => entry.recipes.map((item) => item.recipe.slug)))
  }

  return (
    <div className="gv-page">
      <section className="calc-hero gv-hero">
        <div className="calc-hero-copy">
          <span className="eyebrow">
            <img src="/ui/global-village-status.webp" alt="" /> Daily contribution
          </span>
          <h1>Global Village</h1>
          <p>
            Today's requests from all three contribution bins. Tick dishes off as you deliver them, and see exactly
            what to buy and how long the garden needs.
          </p>
          <div className="calc-hero-stats gv-hero-stats">
            <div>
              <span>Requests</span>
              <strong>{requestCount}</strong>
              <small>today</small>
            </div>
            <div>
              <span>Done</span>
              <strong>{doneCount}/{requestCount}</strong>
              <small>delivered</small>
            </div>
            <div>
              <span>Reward</span>
              <strong>{rewardTotal}</strong>
              <small>sols</small>
            </div>
          </div>
        </div>
        <div className="gv-hero-art" aria-hidden="true">
          <img src="/ui/global-village-status.webp" alt="" />
        </div>
      </section>

      <div className="gv-reset-bar">
        <span>Daily reset in <b>{countdown(nextRefresh, now)}</b></span>
        <span className="gv-reset-note">Requests rotate automatically each day.</span>
      </div>

      <div className="calc-layout gv-layout">
        <div className="gv-bins">
          {contributions.map((entry) => {
            const binDone = entry.recipes.filter(
              (item) => checked[`${entry.bin.id}:${item.recipe.slug}`],
            ).length
            return (
              <section className="calc-card gv-bin-card" key={entry.bin.id}>
                <header className="gv-bin-head">
                  <span className={`gv-lv gv-lv-${entry.bin.level}`}>Lv {entry.bin.level}</span>
                  <div className="gv-bin-title">
                    <h2>{entry.bin.name}</h2>
                    <p>
                      {entry.bin.reward} Sols per request · {entry.recipes.length} requests
                    </p>
                  </div>
                  <span className={`gv-bin-progress ${binDone === entry.recipes.length ? 'is-complete' : ''}`}>
                    {binDone}/{entry.recipes.length}
                  </span>
                </header>

                <div className="gv-requests">
                  {entry.recipes.map(({ recipe, qty }) => {
                    const key = `${entry.bin.id}:${recipe.slug}`
                    const isChecked = Boolean(checked[key])
                    return (
                      <label className={`gv-request ${isChecked ? 'is-done' : ''}`} key={key}>
                        <input
                          type="checkbox"
                          className="gv-checkbox"
                          checked={isChecked}
                          onChange={() => toggle(key)}
                        />
                        <Sprite src={recipe.icon} alt={recipe.name} color={recipe.color} size="md" />
                        <div className="gv-request-main">
                          <div className="gv-request-title">
                            <strong>{recipe.name}</strong>
                            <span>×{qty}</span>
                          </div>
                          <div className="gv-request-meta">
                            <span>{recipe.type} · Lv {recipe.level}</span>
                          </div>
                          <div className="plan-ingredients gv-request-ings">
                            {recipe.ingredients.map((ingredient) => (
                              <span className="plan-ingredient" key={ingredient.slug}>
                                <Sprite src={ingredient.icon} alt="" color={ingredient.color} size="xs" />
                                {ingredient.qty * qty}× {ingredient.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="gv-request-reward">
                          <img src="/ui/currency-sols.webp" alt="" />
                          {entry.bin.reward}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <aside className="gv-side">
          <section className="calc-card gv-prep-card">
            <div className="gv-card-head">
              <div>
                <h2>Prep & shopping</h2>
                <p>
                  {allDone
                    ? 'All contributions checked off.'
                    : `${remainingRequestCount} of ${requestCount} requests left to deliver.`}
                </p>
              </div>
              <button type="button" className="soft-button" onClick={addAllToShoppingList} disabled={allDone}>
                {allDone ? 'Nothing left' : doneCount > 0 ? 'Add remaining to list' : 'Add all to list'}
              </button>
            </div>

            {allDone ? (
              <div className="empty-state gv-done-state">
                <Sprite src="/icons/cooking-station.webp" alt="" color="#4f9d74" size="lg" />
                <h3>All done for today</h3>
                <p>Every contribution is checked off. New requests arrive after the daily reset.</p>
              </div>
            ) : (
              <>
                <div className="plan-summary gv-summary">
                  <div className="plan-stat is-positive">
                    <span>Shop cost</span>
                    <strong><Dew value={shopping.shopTotal} /></strong>
                    <small>dew</small>
                  </div>
                  <div className="plan-stat">
                    <span>Reward left</span>
                    <strong className="gv-sols-value"><img src="/ui/currency-sols.webp" alt="" />{remainingReward}</strong>
                    <small>sols</small>
                  </div>
                </div>

                <div className="gv-shop-groups">
                  {shopping.groups.map((group) => (
                    <section className={`shop-group shop-group-${group.id}`} key={group.id}>
                      <div className="shop-group-head">
                        <div>
                          <h3>{group.title}</h3>
                          <p>{group.subtitle}</p>
                        </div>
                        {group.total > 0 && <Dew value={group.total} />}
                      </div>
                      <div className="shop-lines">
                        {group.lines.map((line) => (
                          <div className="shop-line" key={line.key}>
                            <Sprite src={line.icon} alt={line.name} color={line.color} size="sm" />
                            <div className="shop-line-info">
                              <strong>{line.name}</strong>
                              <small>{line.note}</small>
                            </div>
                            <span className="shop-line-qty">×{line.qty}</span>
                            {line.unitCost > 0 ? (
                              <span className="shop-line-cost"><Dew value={line.cost} /></span>
                            ) : (
                              <span className="shop-line-free">
                                {line.kind === 'gather' ? 'forage' : line.kind === 'sapling' ? 'grow' : 'craft'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <p className="gv-note">
                  Costs use Hazel seed and Kun ingredient prices. Foraged and crafted items are listed for reference.
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
