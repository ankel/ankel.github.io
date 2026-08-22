#!/usr/bin/env bash
set -e

PORT="${1:-8000}"
HOST="127.0.0.1"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo " Serving Portfolio Rebalancer"
echo " Directory: ${DIR}"
echo " URL:       http://${HOST}:${PORT}/"
echo "=================================================="
echo "Press Ctrl+C to stop the server."
echo ""

exec python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${DIR}"
