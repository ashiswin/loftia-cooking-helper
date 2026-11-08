import { ingredientData, recipes, type Recipe, type RecipeIngredient } from '../data/gameData'

export type ShoppingList = Record<string, number>

export type ShoppingKind = 'seed' | 'shop' | 'gather' | 'sapling' | 'craft'

export interface ShoppingLine {
  key: string
  name: string
  icon: string
  color: string
  qty: number
  unitCost: number
  cost: number
  kind: ShoppingKind
  note: string
}

export interface ShoppingGroup {
  id: 'hazel' | 'kun' | 'other'
  title: string
  subtitle: string
  lines: ShoppingLine[]
  total: number
}

export interface ShoppingRecipeLine {
  recipe: Recipe
  qty: number
}

export interface ShoppingSummary {
  recipeLines: ShoppingRecipeLine[]
  groups: ShoppingGroup[]
  shopTotal: number
  batchCount: number
  recipeCount: number
  itemCount: number
}

export const SHOPPING_LIST_KEY = 'loftia-shopping-list-v1'

const recipeBySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]))

function lineMeta(ingredient: RecipeIngredient): Pick<ShoppingLine, 'name' | 'note' | 'unitCost' | 'kind'> {
  const growNote = ingredientData[ingredient.slug]?.growNote
  if (ingredient.source === 'seed') {
    return {
      kind: 'seed',
      name: growNote || `${ingredient.name} Seed`,
      note: 'Seed',
      unitCost: ingredient.unitCost,
    }
  }
  if (ingredient.source === 'shop') {
    return {
      kind: 'shop',
      name: ingredient.name,
      note: 'Ingredient',
      unitCost: ingredient.unitCost,
    }
  }
  if (ingredient.source === 'sapling') {
    return {
      kind: 'sapling',
      name: ingredient.name,
      note: `Grow from ${growNote || 'a sapling'}`,
      unitCost: 0,
    }
  }
  if (ingredient.source === 'craft') {
    return {
      kind: 'craft',
      name: ingredient.name,
      note: ingredient.costNote ? `Craft · ${ingredient.costNote}` : 'Craft yourself',
      unitCost: 0,
    }
  }
  return {
    kind: 'gather',
    name: ingredient.name,
    note: 'Forage yourself',
    unitCost: 0,
  }
}

export function buildShoppingSummary(list: ShoppingList): ShoppingSummary {
  const recipeLines: ShoppingRecipeLine[] = []
  const lines = new Map<string, ShoppingLine>()
  let batchCount = 0

  for (const [slug, rawQty] of Object.entries(list)) {
    const qty = Math.max(0, Math.floor(rawQty))
    const recipe = recipeBySlug.get(slug)
    if (!recipe || qty <= 0) continue
    recipeLines.push({ recipe, qty })
    batchCount += qty

    for (const ingredient of recipe.ingredients) {
      const meta = lineMeta(ingredient)
      const key = `${meta.kind}:${ingredient.slug}`
      const existing = lines.get(key)
      const line = existing ?? {
        key,
        name: meta.name,
        icon: ingredient.icon,
        color: ingredient.color,
        qty: 0,
        unitCost: meta.unitCost,
        cost: 0,
        kind: meta.kind,
        note: meta.note,
      }
      line.qty += ingredient.qty * qty
      line.cost = line.qty * line.unitCost
      lines.set(key, line)
    }
  }

  const allLines = [...lines.values()].sort((a, b) => a.name.localeCompare(b.name))
  const groups = ([
    {
      id: 'hazel',
      title: "Hazel's Seed Shop",
      subtitle: 'Seeds to plant',
      lines: allLines.filter((line) => line.kind === 'seed'),
      total: allLines.filter((line) => line.kind === 'seed').reduce((total, line) => total + line.cost, 0),
    },
    {
      id: 'kun',
      title: "Kun's Recipe Shop",
      subtitle: 'Ingredients to buy',
      lines: allLines.filter((line) => line.kind === 'shop'),
      total: allLines.filter((line) => line.kind === 'shop').reduce((total, line) => total + line.cost, 0),
    },
    {
      id: 'other',
      title: 'Forage & craft',
      subtitle: 'Not bought from Hazel or Kun',
      lines: allLines.filter((line) => line.kind !== 'seed' && line.kind !== 'shop'),
      total: 0,
    },
  ] as ShoppingGroup[]).filter((group) => group.lines.length > 0)

  const shopTotal = groups.reduce((total, group) => total + group.total, 0)
  const itemCount = groups.reduce((total, group) => total + group.lines.reduce((lineTotal, line) => lineTotal + line.qty, 0), 0)

  recipeLines.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name))

  return {
    recipeLines,
    groups,
    shopTotal,
    batchCount,
    recipeCount: recipeLines.length,
    itemCount,
  }
}

export function loadShoppingList(): ShoppingList {
  try {
    const saved = window.localStorage.getItem(SHOPPING_LIST_KEY)
    if (!saved) return {}
    const parsed: unknown = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const next: ShoppingList = {}
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!recipeBySlug.has(slug)) continue
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
      next[slug] = Math.min(999, Math.floor(value))
    }
    return next
  } catch {
    return {}
  }
}

export function saveShoppingList(list: ShoppingList) {
  try {
    const cleaned = Object.fromEntries(Object.entries(list).filter(([, qty]) => qty > 0))
    window.localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(cleaned))
  } catch {
    // The list still works for this session if storage is unavailable.
  }
}
