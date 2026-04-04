#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1. Clean cache ==="
#rm -f "$ROOT/data/processed_data.json"
#rm -f "$ROOT/frontend/public/data/processed_data.json"

echo "=== 2. Fetch data ==="
python3 "$ROOT/scripts/fetch_data.py"

echo "=== 3. Copy data to frontend ==="
mkdir -p "$ROOT/frontend/public/data"
cp "$ROOT/data/processed_data.json" "$ROOT/frontend/public/data/"

echo "=== 4. Start dev server ==="
cd "$ROOT/frontend"
npx vite --open
