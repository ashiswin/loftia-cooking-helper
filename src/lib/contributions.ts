import { globalVillageBins, type ContributionBin, type ContributionBundle } from '../data/globalVillage'
import { recipes, type Recipe } from '../data/gameData'

const HOUR = 3_600_000
const DAY_OFFSET = -3
const EPOCH_OFFSET = 621_355_968e5

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const floatBuffer = new DataView(new ArrayBuffer(4))

function crc32(value: string): number {
  let crc = 0xffffffff
  for (const character of value) {
    let code = character.codePointAt(0) ?? 0
    for (let i = 0; i < 4; i += 1) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ code) & 255]
      code >>>= 8
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pairHash(a: number, b: number): number {
  let x = 2654435769
  a >>>= 0
  b >>>= 0
  a = (a - b) >>> 0
  a = (a ^ (b >>> 13)) >>> 0
  x = (x - a - b) >>> 0
  x = (x ^ (a << 8)) >>> 0
  b = (b - x - a) >>> 0
  b = (b ^ (x >>> 13)) >>> 0
  a = (a - b - x) >>> 0
  a = (a ^ (b >>> 12)) >>> 0
  x = (x - a - b) >>> 0
  x = (x ^ (a << 16)) >>> 0
  b = (b - x - a) >>> 0
  b = (b ^ (x >>> 5)) >>> 0
  a = (a - b - x) >>> 0
  a = (a ^ (b >>> 3)) >>> 0
  x = (x - a - b) >>> 0
  x = (x ^ (a << 10)) >>> 0
  b = (b - x - a) >>> 0
  b = (b ^ (x >>> 15)) >>> 0
  return b
}

function hashFloat(seed: number): number {
  const value = (Math.imul(seed >>> 0, 196314165) + 907633515) >>> 0
  floatBuffer.setUint32(0, (value >>> 9) | 1065353216)
  return floatBuffer.getFloat32(0) - 1
}

function dayNumber(now: number, refreshHours: number, offset: number): number {
  return Math.floor(((now + EPOCH_OFFSET) / HOUR + offset) / refreshHours)
}

export function selectDailyBundle(bin: ContributionBin, now = Date.now(), offset = DAY_OFFSET) {
  const dayIndex = dayNumber(now, bin.refreshHours, offset)
  const bundleIds = bin.bundles
    .map((bundle) => bundle.id)
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))
  const value = hashFloat(pairHash(dayIndex, crc32(bin.id)))
  const bundleId = bundleIds[Math.trunc(value * bundleIds.length)]
  const bundle = bin.bundles.find((candidate) => candidate.id === bundleId) ?? bin.bundles[0]
  const refreshAt = ((dayIndex + 1) * bin.refreshHours - offset) * HOUR - EPOCH_OFFSET
  return { bundle, dayIndex, refreshAt }
}

const recipeBySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]))

export interface DailyContributionRecipe {
  recipe: Recipe
  qty: number
}

export interface DailyContribution {
  bin: ContributionBin
  bundle: ContributionBundle
  dayIndex: number
  refreshAt: number
  recipes: DailyContributionRecipe[]
}

export function getDailyContributions(now = Date.now(), offset = DAY_OFFSET): DailyContribution[] {
  return globalVillageBins.map((bin) => {
    const { bundle, dayIndex, refreshAt } = selectDailyBundle(bin, now, offset)
    const selectedRecipes = bundle.recipes.flatMap((entry) => {
      const recipe = recipeBySlug.get(entry.slug)
      return recipe ? [{ recipe, qty: entry.qty }] : []
    })
    return { bin, bundle, dayIndex, refreshAt, recipes: selectedRecipes }
  })
}
