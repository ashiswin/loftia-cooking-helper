import { useEffect } from 'react'
import { CalculatorPage } from './pages/CalculatorPage'
import { RecipesPage } from './pages/RecipesPage'
import { useRoute } from './lib/useRoute'
import './App.css'

function App() {
  const { path, navigate } = useRoute()
  const isCalculator = path.startsWith('/calculator')

  useEffect(() => {
    document.title = isCalculator ? 'Pantry Planner · Loftia Cooking Helper' : 'Loftia Cooking Helper'
  }, [isCalculator])

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
            className={isCalculator ? '' : 'is-active'}
            aria-current={isCalculator ? undefined : 'page'}
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
        </nav>

        <div className="topbar-right">
          <span className="fan-badge">Fan-made</span>
          <a className="codex-link" href="https://loftiacodex.com/items?category=Resources&subcategory=Foods" target="_blank" rel="noreferrer">
            Data from Loftia Codex <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
        {isCalculator ? <CalculatorPage /> : <RecipesPage />}

        <footer className="footer">
          <div>
            {isCalculator ? (
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
    </div>
  )
}

export default App
