#!/bin/zsh
# Construye la "vitrina" estática para Firebase Hosting en frontend/dist.
# Necesita la base de datos encendida (Docker: cronos-postgres-alt en el puerto 5433).
#   zsh backend/scripts/build_vitrina.sh
#   npx firebase-tools deploy --only hosting
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "1/3 · Construyendo la tienda en modo vitrina…"
cd "$ROOT/frontend"
npm run build -- --mode vitrina

echo "2/3 · Exportando el catálogo a JSON…"
cd "$ROOT/backend"
env DB_PORT="${DB_PORT:-5433}" venv/bin/python scripts/export_vitrina.py "$ROOT/frontend/dist/static-api"

echo "3/3 · Copiando las imágenes de los relojes…"
mkdir -p "$ROOT/frontend/dist/media"
rsync -a --delete --exclude 'uploads/' "$ROOT/backend/media/" "$ROOT/frontend/dist/media/"

echo "Vitrina lista en frontend/dist ($(du -sh "$ROOT/frontend/dist" | cut -f1))"
