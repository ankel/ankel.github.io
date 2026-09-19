#!/usr/bin/env bash
set -e

# Centralized server script for all apps under apps/
# Usage:
#   From app dir (e.g. apps/pw-gen):  ../serve.sh [PORT]
#   From apps dir:                    ./serve.sh [APP_NAME] [PORT]
#   From repo root:                   ./apps/serve.sh [APP_NAME] [PORT]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="."
PORT="${PORT:-8080}"
HOST="127.0.0.1"

if [ -n "$1" ]; then
  # If $1 is a number, treat as PORT; otherwise treat as TARGET_DIR
  if [[ "$1" =~ ^[0-9]+$ ]]; then
    PORT="$1"
  else
    if [ -d "$1" ]; then
      TARGET_DIR="$1"
    elif [ -d "${SCRIPT_DIR}/$1" ]; then
      TARGET_DIR="${SCRIPT_DIR}/$1"
    else
      TARGET_DIR="$1"
    fi
    if [ -n "$2" ] && [[ "$2" =~ ^[0-9]+$ ]]; then
      PORT="$2"
    fi
  fi
fi

# Resolve absolute path to target directory
DIR="$(cd "${TARGET_DIR}" && pwd)"

echo "=================================================="
echo " Serving Web Application"
echo " Directory: ${DIR}"
echo " URL:       http://${HOST}:${PORT}/"
echo "=================================================="
echo "Press Ctrl+C to stop the server."
echo ""

exec python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${DIR}"
