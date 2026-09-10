#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ git pull"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "→ rebuild and restart"
docker compose up -d --build

echo "→ health"
sleep 3
curl -fsS http://127.0.0.1:3001/api/health
echo
echo "Готово. Текущий коммит: $(git rev-parse --short HEAD)"
