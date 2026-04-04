# MLIP Trends

Machine Learning Interatomic Potentials (MLIP) impact and citation tracker. A lightweight, auto-updating dashboard that tracks academic citations across the MLIP ecosystem.

**Live site:** https://MoseyQAQ.github.io/MLIP-trends/

## Architecture

```
data/
  communities.json     # Community definitions (DeepModeling, ACEsuit, etc.)
  categories.json      # Category labels (Software, Architecture, Foundation Model, Dataset, Extension)
  papers.json          # Curated paper list (DOI + community + category)
  processed_data.json  # Auto-generated: enriched data from OpenAlex API

scripts/
  fetch_data.py        # Data pipeline: DOI -> OpenAlex API -> processed_data.json

frontend/              # React + Vite + ECharts dashboard

.github/workflows/
  update-data.yml      # Weekly auto-update of citation data
  deploy.yml           # Auto-deploy to GitHub Pages on push
```

## How to Add a Paper

Edit `data/papers.json` and add an entry:

```json
{
  "doi": "10.xxxx/xxxxx",
  "community": "deepmodeling",
  "category": "architecture",
  "note": "Short description"
}
```

Valid communities: see `data/communities.json`

Valid categories: `software`, `architecture`, `foundation_model`, `dataset`, `extension`

## Local Development

```bash
# Run data pipeline
python scripts/fetch_data.py

# Start frontend dev server
cd frontend
npm install
mkdir -p public/data && cp ../data/processed_data.json public/data/
npm run dev
```

## Data Source

Citation data from [OpenAlex](https://openalex.org) (free, open scholarly metadata).
