# About MLIP Trends

MLIP Trends is a lightweight, open-source dashboard for tracking the academic impact of Machine Learning Interatomic Potentials (MLIPs).

## Why this project?

The MLIP field is evolving rapidly — new architectures (MACE, NequIP, EquiformerV2...), foundation models (MACE-MP, CHGNet, MatterSim...), and software ecosystems (DeePMD-kit, FLARE...) emerge frequently. It's hard for researchers to objectively assess the influence and adoption of each technology.

This dashboard provides a **citation-based** overview, updated automatically via the OpenAlex API.

## How it works

1. **Data entry** — Contributors add paper DOIs to `data/papers_*.json` files on GitHub
2. **Data pipeline** — A Python script (`scripts/fetch_data.py`) queries the [OpenAlex API](https://openalex.org) for citation metadata, with incremental caching to avoid redundant requests
3. **Automation** — GitHub Actions runs the pipeline weekly and commits updated data
4. **Frontend** — This React + ECharts dashboard reads the generated `processed_data.json` and renders rankings and trends

## How to contribute

### Adding a paper

Edit the appropriate `data/papers_<category>.json` file and add an entry:

```json
{
  "project_id": "MyProject",
  "paper_id": "MyProject-v1",
  "title": "Full paper title",
  "doi": "https://doi.org/10.xxxx/xxxxx",
  "community": "independent",
  "links": {
    "GitHub": "https://github.com/...",
    "arXiv": "https://arxiv.org/abs/..."
  }
}
```

### Categories

| File | Description |
|------|-------------|
| `papers_architecture.json` | Model architectures (SchNet, NequIP, MACE, ...) |
| `papers_foundation-model.json` | Pre-trained universal models (MACE-MP, CHGNet, ...) |
| `papers_software.json` | Software frameworks (DeePMD-kit, FLARE, ...) |
| `papers_dataset.json` | Training datasets (OC20, MPtrj, ...) |
| `papers_extension.json` | Extensions & algorithms (DP-GEN, active learning, ...) |

### Communities

Communities represent research groups or organizations. See `data/communities.json` for the current list. To add a new community, include it there with a unique `id`, display `name`, and `color`.

## Data source

All citation data comes from [OpenAlex](https://openalex.org), a free and open index of scholarly works.

## Source code

[GitHub Repository](https://github.com/MoseyQAQ/MLIP-trends)
