#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Node.js 18 or newer and npm are required to run German Vocab Studio."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing the React app dependencies..."
    npm install
fi

echo "Starting German Vocab Studio..."
npm run dev
