import { solve, type Model } from 'yalps'
import { ingredientData, recipes, type Ingredient, type Recipe } from '../data/gameData'

export type ProfitBasis = 'raw' | 'market' | 'gross'
export type Inventory = Record<string, number>

export type PantryIngredient = Ingredient

export interface PlanLine {
  recipe: Recipe
  qty: number
  sellTotal: number
  profitEach: number
  profitTotal: number
}

export interface OptimizationResult {
  status: string
  lines: PlanLine[]
  totalProfit: number
  totalSell: number
  totalDishes: number
  used: Inventory
  leftover: Inventory
  rawValueUsed: number
  leftoverRawValue: number
  pantryRawValue: number
  basis: ProfitBasis
}

const recipeIngredientSlugs = Array.from(
  new Set(recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.slug))),
)

export const pantryIngredients: PantryIngredient[] = recipeIngredientSlugs
  .map((slug) => ingredientData[slug])
  .filter((ingredient): ingredient is PantryIngredient => Boolean(ingredient))

export function ingredientCategory(ingredient: PantryIngredient): string {
  if (ingredient.isCrop) return 'Crops'
  if (ingredient.source === 'shop' || ingredient.source === 'craft') return 'Shop & crafted'
  return 'Foraged'
}

export function pantryGroups(ingredients: PantryIngredient[]): { label: string; items: PantryIngredient[] }[] {
  const order = ['Crops', 'Foraged', 'Shop & crafted']
  const groups = new Map<string, PantryIngredient[]>(order.map((label) => [label, []]))
  for (const ingredient of ingredients) {
    groups.get(ingredientCategory(ingredient))?.push(ingredient)
  }
  return order.map((label) => ({ label, items: groups.get(label) ?? [] })).filter((group) => group.items.length > 0)
}

export function rawValue(ingredient: PantryIngredient, qty: number, foragedFree = false): number {
  const free = foragedFree && (ingredient.source === 'gather' || ingredient.source === 'sapling')
  return (free ? 0 : ingredient.sell) * qty
}

export function recipeProfit(recipe: Recipe, basis: ProfitBasis, foragedFree = false): number {
  if (basis === 'gross') return recipe.sell
  if (basis === 'market') return foragedFree ? recipe.profitFree : recipe.profit
  const ingredientValue = recipe.ingredients.reduce((total, ingredient) => {
    const data = ingredientData[ingredient.slug]
    if (!data) return total
    const free = foragedFree && (data.source === 'gather' || data.source === 'sapling')
    return total + (free ? 0 : data.sell) * ingredient.qty
  }, 0)
  return recipe.sell - ingredientValue
}

function emptyResult(basis: ProfitBasis, inventory: Inventory, foragedFree: boolean): OptimizationResult {
  const used: Inventory = {}
  const leftover: Inventory = {}
  let pantryRawValue = 0
  let leftoverRawValue = 0
  for (const ingredient of pantryIngredients) {
    const qty = Math.max(0, Math.floor(inventory[ingredient.slug] ?? 0))
    used[ingredient.slug] = 0
    leftover[ingredient.slug] = qty
    pantryRawValue += rawValue(ingredient, qty, foragedFree)
    leftoverRawValue += rawValue(ingredient, qty, foragedFree)
  }
  return {
    status: 'optimal',
    lines: [],
    totalProfit: 0,
    totalSell: 0,
    totalDishes: 0,
    used,
    leftover,
    rawValueUsed: 0,
    leftoverRawValue,
    pantryRawValue,
    basis,
  }
}

export function optimizePantry(
  inventory: Inventory,
  basis: ProfitBasis,
  maxStationLevel: number,
  foragedFree = false,
): OptimizationResult {
  const constraints: Record<string, { max: number }> = {}
  for (const ingredient of pantryIngredients) {
    constraints[ingredient.slug] = { max: Math.max(0, Math.floor(inventory[ingredient.slug] ?? 0)) }
  }

  const variables: Record<string, Record<string, number>> = {}
  const recipeProfitBySlug = new Map<string, number>()

  for (const recipe of recipes) {
    if (recipe.level > maxStationLevel) continue
    if (recipe.ingredients.some((ingredient) => (inventory[ingredient.slug] ?? 0) < ingredient.qty)) continue
    const profit = recipeProfit(recipe, basis, foragedFree)
    if (profit <= 0) continue
    const coefficients: Record<string, number> = { __profit__: profit }
    for (const ingredient of recipe.ingredients) {
      coefficients[ingredient.slug] = ingredient.qty
    }
    variables[recipe.slug] = coefficients
    recipeProfitBySlug.set(recipe.slug, profit)
  }

  if (Object.keys(variables).length === 0) return emptyResult(basis, inventory, foragedFree)

  const model: Model = {
    direction: 'maximize',
    objective: '__profit__',
    constraints,
    variables,
    integers: true,
  }

  const solution = solve(model, { timeout: 5000 })
  const lines: PlanLine[] = []
  const used: Inventory = {}
  for (const ingredient of pantryIngredients) used[ingredient.slug] = 0

  for (const [slug, qty] of solution.variables) {
    if (qty <= 0) continue
    const recipe = recipes.find((candidate) => candidate.slug === slug)
    if (!recipe) continue
    const runQty = Math.max(1, Math.round(qty))
    const profitEach = recipeProfitBySlug.get(slug) ?? recipeProfit(recipe, basis, foragedFree)
    lines.push({
      recipe,
      qty: runQty,
      sellTotal: recipe.sell * runQty,
      profitEach,
      profitTotal: profitEach * runQty,
    })
    for (const ingredient of recipe.ingredients) {
      used[ingredient.slug] = (used[ingredient.slug] ?? 0) + ingredient.qty * runQty
    }
  }

  lines.sort((a, b) => b.profitTotal - a.profitTotal)

  const leftover: Inventory = {}
  let pantryRawValue = 0
  let leftoverRawValue = 0
  let rawValueUsed = 0
  for (const ingredient of pantryIngredients) {
    const stock = Math.max(0, Math.floor(inventory[ingredient.slug] ?? 0))
    const remaining = Math.max(0, stock - (used[ingredient.slug] ?? 0))
    leftover[ingredient.slug] = remaining
    pantryRawValue += rawValue(ingredient, stock, foragedFree)
    leftoverRawValue += rawValue(ingredient, remaining, foragedFree)
    rawValueUsed += rawValue(ingredient, used[ingredient.slug] ?? 0, foragedFree)
  }

  return {
    status: solution.status,
    lines,
    totalProfit: lines.reduce((total, line) => total + line.profitTotal, 0),
    totalSell: lines.reduce((total, line) => total + line.sellTotal, 0),
    totalDishes: lines.reduce((total, line) => total + line.qty, 0),
    used,
    leftover,
    rawValueUsed,
    leftoverRawValue,
    pantryRawValue,
    basis,
  }
}
