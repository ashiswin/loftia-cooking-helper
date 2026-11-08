import { useEffect, useMemo } from 'react'
import { Dew } from './Dew'
import { Sprite } from './Sprite'
import { buildShoppingSummary, type ShoppingList } from '../lib/shoppingList'

type ShoppingListDrawerProps = {
  open: boolean
  list: ShoppingList
  onClose: () => void
  onSetRecipeCount: (slug: string, qty: number) => void
  onClear: () => void
}

export function ShoppingListDrawer({ open, list, onClose, onSetRecipeCount, onClear }: ShoppingListDrawerProps) {
  const summary = useMemo(() => buildShoppingSummary(list), [list])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="drawer-layer">
      <button type="button" className="drawer-scrim" aria-label="Close shopping list" onClick={onClose} />
      <aside className="shopping-drawer" role="dialog" aria-modal="true" aria-labelledby="shopping-list-title">
        <header className="drawer-head">
          <div>
            <span className="eyebrow">Shop prep</span>
            <h2 id="shopping-list-title">Shopping list</h2>
            <p>
              {summary.recipeCount === 0
                ? 'Nothing added yet'
                : `${summary.recipeCount} ${summary.recipeCount === 1 ? 'recipe' : 'recipes'} · ${summary.batchCount} ${summary.batchCount === 1 ? 'batch' : 'batches'}`}
            </p>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close shopping list">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="drawer-body">
          {summary.recipeCount === 0 && (
            <div className="empty-state drawer-empty">
              <Sprite src="/icons/cooking-station.webp" alt="" color="#4f9d74" size="lg" />
              <h3>Your list is empty</h3>
              <p>Use “Add” on any recipe to start building a shopping list.</p>
            </div>
          )}

          {summary.groups.map((group) => (
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
                      <span className="shop-line-free">{line.kind === 'gather' ? 'forage' : line.kind === 'sapling' ? 'grow' : 'craft'}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {summary.recipeLines.length > 0 && (
            <section className="drawer-recipes">
              <div className="shop-group-head">
                <div>
                  <h3>Recipes on the list</h3>
                  <p>Adjust batches or remove a recipe.</p>
                </div>
              </div>
              {summary.recipeLines.map(({ recipe, qty }) => (
                <div className="drawer-recipe" key={recipe.slug}>
                  <Sprite src={recipe.icon} alt={recipe.name} color={recipe.color} size="sm" />
                  <div className="drawer-recipe-info">
                    <strong>{recipe.name}</strong>
                    <small>{recipe.type} · Lv {recipe.level}</small>
                  </div>
                  <div className="drawer-recipe-controls">
                    <button
                      type="button"
                      onClick={() => onSetRecipeCount(recipe.slug, qty - 1)}
                      aria-label={`Remove one ${recipe.name} batch`}
                    >
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      onClick={() => onSetRecipeCount(recipe.slug, qty + 1)}
                      aria-label={`Add one ${recipe.name} batch`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        <footer className="drawer-foot">
          <div className="drawer-total">
            <span>Shop total</span>
            <strong><Dew value={summary.shopTotal} /></strong>
          </div>
          <button type="button" className="drawer-clear" onClick={onClear} disabled={summary.batchCount === 0}>
            Clear list
          </button>
        </footer>
      </aside>
    </div>
  )
}
