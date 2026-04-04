"""
MLIP-trends data pipeline: fetch citation data from OpenAlex API.

Reads papers_*.json files, queries OpenAlex for metadata and citation counts,
and outputs processed_data.json with incremental update support.

Incremental logic:
  - If a paper already exists in processed_data.json with citation_history,
    only re-fetch if the existing data is stale (last_updated > 7 days ago).
  - This avoids unnecessary API calls for historical data that won't change.
"""

import glob
import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "processed_data.json"
OPENALEX_API = "https://api.openalex.org/works"
POLITE_EMAIL = "mlip-trends@users.noreply.github.com"

REQUEST_DELAY = 0.15  # seconds between requests
STALE_DAYS = 7  # re-fetch if older than this


def load_json(path: Path) -> dict | list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_doi(doi: str) -> str:
    """Extract bare DOI from a full URL or bare DOI string."""
    doi = doi.strip()
    for prefix in ["https://doi.org/", "http://doi.org/"]:
        if doi.startswith(prefix):
            doi = doi[len(prefix):]
            break
    # Convert arxiv.org/abs/XXXX URLs to standard arXiv DOI
    m = re.match(r"https?://arxiv\.org/abs/(\d+\.\d+)", doi)
    if m:
        doi = f"10.48550/arXiv.{m.group(1)}"
    return doi


def category_from_filename(filename: str) -> str:
    """Extract category id from filename like 'papers_dataset.json'."""
    stem = Path(filename).stem  # e.g. 'papers_dataset'
    cat = stem.removeprefix("papers_")  # e.g. 'dataset'
    return cat.replace("-", "_")  # 'foundation-model' -> 'foundation_model'


def fetch_openalex(doi: str) -> dict | None:
    """Fetch work metadata from OpenAlex by DOI."""
    # Handle arXiv DOIs
    if "arxiv" in doi.lower():
        url = f"{OPENALEX_API}?filter=doi:{doi}&mailto={POLITE_EMAIL}"
    else:
        url = f"{OPENALEX_API}/https://doi.org/{doi}?mailto={POLITE_EMAIL}"

    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": f"MLIP-trends (mailto:{POLITE_EMAIL})"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if "results" in data:
                results = data.get("results", [])
                return results[0] if results else None
            return data
    except urllib.error.HTTPError as e:
        print(f"  [WARN] HTTP {e.code} for DOI: {doi}")
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to fetch DOI {doi}: {e}")
        return None


def extract_citation_history(work: dict) -> list[dict]:
    """Extract yearly citation counts from OpenAlex counts_by_year."""
    counts = work.get("counts_by_year", [])
    return sorted(
        [{"year": c["year"], "citations": c["cited_by_count"]} for c in counts],
        key=lambda x: x["year"],
    )


def process_work(work: dict, paper_entry: dict, category: str) -> dict:
    """Transform an OpenAlex work + paper entry into processed format."""
    authorships = work.get("authorships", [])
    authors = [a.get("author", {}).get("display_name", "Unknown") for a in authorships]

    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    venue = source.get("display_name", "")

    return {
        "paper_id": paper_entry["paper_id"],
        "project_id": paper_entry.get("project_id", ""),
        "doi": paper_entry["doi"],
        "openalex_id": work.get("id", ""),
        "title": paper_entry.get("title", work.get("title", "Unknown Title")),
        "authors": authors,
        "publication_year": work.get("publication_year"),
        "venue": venue,
        "community": paper_entry.get("community", "independent"),
        "category": category,
        "links": paper_entry.get("links", {}),
        "cited_by_count": work.get("cited_by_count", 0),
        "citation_history": extract_citation_history(work),
        "last_updated": datetime.now().isoformat(),
    }


def load_existing_cache() -> dict:
    """Load existing processed_data.json as a cache, keyed by DOI."""
    if not OUTPUT_FILE.exists():
        return {}
    try:
        data = load_json(OUTPUT_FILE)
        return {normalize_doi(p["doi"]): p for p in data.get("papers", [])}
    except Exception:
        return {}


def is_stale(entry: dict) -> bool:
    """Check if an existing entry needs re-fetching."""
    last_updated = entry.get("last_updated")
    if not last_updated:
        return True
    try:
        updated_dt = datetime.fromisoformat(last_updated)
        return datetime.now() - updated_dt > timedelta(days=STALE_DAYS)
    except ValueError:
        return True


def load_all_papers() -> list[tuple[dict, str]]:
    """Load all papers_*.json files, returning (paper_entry, category) pairs."""
    all_papers = []
    pattern = str(DATA_DIR / "papers_*.json")
    for filepath in sorted(glob.glob(pattern)):
        category = category_from_filename(filepath)
        try:
            entries = load_json(Path(filepath))
            # Handle both list and dict-with-list formats
            if isinstance(entries, dict):
                entries = entries.get("papers", [])
            for entry in entries:
                if "doi" in entry and "paper_id" in entry:
                    all_papers.append((entry, category))
        except Exception as e:
            print(f"  [WARN] Skipping {filepath}: {e}")
    return all_papers


def main():
    print("=" * 60)
    print("MLIP-trends Data Pipeline (Incremental)")
    print(f"Run time: {datetime.now().isoformat()}")
    print("=" * 60)

    # Load existing cache
    cache = load_existing_cache()
    print(f"Cached entries: {len(cache)}")

    # Load all paper entries
    all_papers = load_all_papers()
    print(f"Total papers in source files: {len(all_papers)}")

    processed = []
    fetched = 0
    skipped = 0
    failed = []

    for i, (paper, category) in enumerate(all_papers):
        doi_raw = paper["doi"]
        doi = normalize_doi(doi_raw)
        paper_id = paper["paper_id"]

        # Check cache: skip if fresh
        if doi in cache and not is_stale(cache[doi]):
            print(f"[{i+1}/{len(all_papers)}] CACHED: {paper_id} ({doi})")
            # Update mutable fields from source (title, community, links may change)
            cached = cache[doi].copy()
            cached["title"] = paper.get("title", cached.get("title", ""))
            cached["community"] = paper.get("community", cached.get("community", ""))
            cached["links"] = paper.get("links", cached.get("links", {}))
            cached["category"] = category
            cached["project_id"] = paper.get("project_id", cached.get("project_id", ""))
            processed.append(cached)
            skipped += 1
            continue

        # Fetch from OpenAlex
        print(f"[{i+1}/{len(all_papers)}] Fetching: {paper_id} ({doi})")
        work = fetch_openalex(doi)
        if work is None:
            print(f"  -> NOT FOUND in OpenAlex, using source metadata as fallback")
            failed.append(doi)
            # Keep old cache if available, otherwise create a stub from source
            if doi in cache:
                processed.append(cache[doi])
            else:
                stub = {
                    "paper_id": paper["paper_id"],
                    "project_id": paper.get("project_id", ""),
                    "doi": paper["doi"],
                    "openalex_id": "",
                    "title": paper.get("title", ""),
                    "authors": [],
                    "publication_year": None,
                    "venue": "",
                    "community": paper.get("community", "independent"),
                    "category": category,
                    "links": paper.get("links", {}),
                    "cited_by_count": 0,
                    "citation_history": [],
                    "last_updated": datetime.now().isoformat(),
                }
                processed.append(stub)
            continue

        entry = process_work(work, paper, category)
        processed.append(entry)
        fetched += 1
        print(f"  -> OK: \"{entry['title']}\" ({entry['cited_by_count']} citations)")

        time.sleep(REQUEST_DELAY)

    # Sort by total citations descending
    processed.sort(key=lambda x: x.get("cited_by_count", 0), reverse=True)

    # Build output
    output = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "total_papers": len(processed),
            "fetched": fetched,
            "cached": skipped,
            "failed_dois": failed,
        },
        "communities": load_json(DATA_DIR / "communities.json").get("communities", []),
        "categories": load_json(DATA_DIR / "categories.json").get("categories", []),
        "papers": processed,
    }

    save_json(OUTPUT_FILE, output)

    print(f"\n{'=' * 60}")
    print(f"Done! Total: {len(processed)} | Fetched: {fetched} | Cached: {skipped}")
    if failed:
        print(f"Failed DOIs ({len(failed)}):")
        for d in failed:
            print(f"  - {d}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
