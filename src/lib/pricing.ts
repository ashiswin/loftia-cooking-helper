import type { Recipe, RecipeIngredient } from '../data/gameData'

export type SaplingSource = 'forage' | 'shop'

export function ingredientUnitCost(
  ingredient: RecipeIngredient,
  gatheredFree: boolean,
  saplingSource: SaplingSource,
): number {
  if (ingredient.source === 'sapling') {
    return saplingSource === 'forage' ? 0 : ingredient.unitCost
  }
  if (ingredient.source === 'gather') {
    return gatheredFree ? 0 : ingredient.unitCost
  }
  if (ingredient.source === 'craft') {
    return gatheredFree ? ingredient.unitCostFree : ingredient.unitCost
  }
  return ingredient.unitCost
}

export function priceRecipe(recipe: Recipe, gatheredFree: boolean, saplingSource: SaplingSource) {
  const unitCosts: Record<string, number> = {}
  let cost = 0
  for (const ingredient of recipe.ingredients) {
    const unit = ingredientUnitCost(ingredient, gatheredFree, saplingSource)
    unitCosts[ingredient.slug] = unit
    cost += unit * ingredient.qty
  }
  return { cost, profit: recipe.sell - cost, unitCosts }
}
