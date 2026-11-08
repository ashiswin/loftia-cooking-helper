import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { CalculatorPage } from './pages/CalculatorPage'
import { GlobalVillagePage } from './pages/GlobalVillagePage'
import { ShoppingListDrawer } from './components/ShoppingListDrawer'
import { RecipesPage } from './pages/RecipesPage'
import { useRoute } from './lib/useRoute'
import { loadShoppingList, saveShoppingList, type ShoppingList } from './lib/shoppingList'
import './App.css'

function App() {
  const { path, navigate } = useRoute()
  const isCalculator = path.startsWith('/calculator')
  const isGlobalVillage = path.startsWith('/global-village')
  const isRecipes = !isCalculator && !isGlobalVillage
  const [shoppingList, setShoppingList] = useState<ShoppingList>(loadShoppingList)
  const [isListOpen, setIsListOpen] = useState(false)

  useEffect(() => {
    saveShoppingList(shoppingList)
  }, [shoppingList])

  useEffect(() => {
    if (isGlobalVillage) {
      document.title = 'Global Village · Loftia Cooking Helper'
    } else if (isCalculator) {
      document.title = 'Pantry Planner · Loftia Cooking Helper'
    } else {
      document.title = 'Loftia Cooking Helper'
    }
  }, [isCalculator, isGlobalVillage])

  const listCount = Object.values(shoppingList).reduce((total, qty) => total + qty, 0)

  const addRecipeToList = (slug: string) => {
    setShoppingList((current) => ({ ...current, [slug]: Math.min(999, (current[slug] ?? 0) + 1) }))
  }

  const addRecipesToList = (slugs: string[]) => {
    setShoppingList((current) => {
      const next = { ...current }
      for (const slug of slugs) {
        next[slug] = Math.min(999, (next[slug] ?? 0) + 1)
      }
      return next
    })
  }

  const setRecipeCount = (slug: string, qty: number) => {
    setShoppingList((current) => {
      const next = { ...current }
      if (qty <= 0) {
        delete next[slug]
      } else {
        next[slug] = Math.min(999, Math.floor(qty))
      }
      return next
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          <span className="brand-mark">
            <img src="/ui/leaf.webp" alt="" />
          </span>
          <span className="brand-text">
            <strong>Loftia</strong>
            <em>Cooking Helper</em>
          </span>
        </a>

        <nav className="main-nav" aria-label="Pages">
          <a
            href="/"
            className={isRecipes ? 'is-active' : ''}
            aria-current={isRecipes ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              navigate('/')
            }}
          >
            Recipe ledger
          </a>
          <a
            href="/calculator"
            className={isCalculator ? 'is-active' : ''}
            aria-current={isCalculator ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              navigate('/calculator')
            }}
          >
            Pantry planner
          </a>
          <a
            href="/global-village"
            className={isGlobalVillage ? 'is-active' : ''}
            aria-current={isGlobalVillage ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              navigate('/global-village')
            }}
          >
            Global Village
          </a>
        </nav>

        <div className="topbar-right">
          <button
            type="button"
            className={`cart-button ${listCount > 0 ? 'has-items' : ''}`}
            onClick={() => setIsListOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isListOpen}
          >
            <svg className="cart-glyph" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2.5 3.5h2l1.6 8.1a1.5 1.5 0 0 0 1.5 1.2h6.7a1.5 1.5 0 0 0 1.5-1.2l1-5.1H5.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="15.7" r="1.1" fill="currentColor" />
              <circle cx="14.5" cy="15.7" r="1.1" fill="currentColor" />
            </svg>
            <span>Shopping list</span>
            {listCount > 0 && <b>{listCount}</b>}
          </button>
          <a className="codex-link" href="https://loftiacodex.com/items?category=Resources&subcategory=Foods" target="_blank" rel="noreferrer">
            Data from Loftia Codex <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
        {isGlobalVillage ? (
          <GlobalVillagePage onAddRecipes={addRecipesToList} />
        ) : isCalculator ? (
          <CalculatorPage />
        ) : (
          <RecipesPage shoppingList={shoppingList} onAddRecipe={addRecipeToList} />
        )}

        <footer className="footer">
          <div>
            {isGlobalVillage ? (
              <>
                <strong>How the daily requests work</strong>
                <p>
                  Requests rotate daily at 03:00 UTC. Shopping costs use Hazel seed and Kun ingredient prices, and
                  checked-off dishes are removed from the prep and shopping pane.
                </p>
              </>
            ) : isCalculator ? (
              <>
                <strong>How the optimizer works</strong>
                <p>
                  The planner solves an integer linear program with one variable per recipe and one constraint per ingredient.
                  It will never use more of an ingredient than you entered. “Value gain” compares the plan against selling
                  your raw ingredients, so it will not recommend cooking away value. Switch “Foraged pricing” to “Free” if
                  you plan to gather those ingredients yourself.
                </p>
              </>
            ) : (
              <>
                <strong>How the math works</strong>
                <p>
                  The recipe ledger uses seed-shop prices for crops, Kun's Recipe Shop prices for bought ingredients, and the
                  sell value of gathered items. Sapling-grown crops use their sapling value unless you set Sapling source to
                  Forage. The pantry planner compares plans against the raw sell value of your inventory.
                </p>
              </>
            )}
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
      <ShoppingListDrawer
        open={isListOpen}
        list={shoppingList}
        onClose={() => setIsListOpen(false)}
        onSetRecipeCount={setRecipeCount}
        onClear={() => setShoppingList({})}
      />
      <Analytics route={path} path={path} />
    </div>
  )
}

export default App
