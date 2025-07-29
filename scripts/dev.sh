#!/bin/bash

echo "Starting development servers..."

# Check if concurrently is installed
if ! command -v concurrently &> /dev/null; then
  echo "Installing concurrently..."
  npm install
fi

# Start both backend and frontend servers
npx concurrently \
  --names "backend,frontend" \
  --prefix "[{name}]" \
  --prefix-colors "bgBlue.bold,bgGreen.bold" \
  "npm --prefix backend run dev" \
  "npm --prefix frontend run dev"