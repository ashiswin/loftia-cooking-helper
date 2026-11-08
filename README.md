# Loftia Cooking Helper

A fan-made React + TypeScript tool for Loftia that lists every cooking recipe with its material cost, sell value, net profit, grow time, and dew per hour.

## Features

- All 61 cooking recipes with in-game sprites
- Cost breakdown by seed, shop purchase, gathered material, sapling, or crafted ingredient
- Net profit and profit-per-hour calculations
- Parallel vs. one-plot grow-time estimates
- Sortable columns, station-level filters, search, and a gathered-material cost toggle
- **Pantry Planner**: enter your inventory and get an exact, profit-maximizing cook plan
- Shopping list drawer: add recipes and get aggregated Hazel seed and Kun ingredient totals
- **Global Village**: today's rotating contribution bundles with checklists, remaining shop costs, and prep time
- Responsive Loftia Codex-inspired styling

## Pantry Planner

The planner models recipes as an integer linear program solved with [YALPS](https://www.npmjs.com/package/yalps). Each recipe is a variable, each ingredient is a constraint, and the objective maximizes the selected profit basis: raw ingredient value gain, recipe margin against shop/seed costs, or gross sales.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
```

Recipe and sprite data was sourced from [Loftia Codex](https://loftiacodex.com/). This is an unofficial fan project, not affiliated with Loftia or Qloud Games.
