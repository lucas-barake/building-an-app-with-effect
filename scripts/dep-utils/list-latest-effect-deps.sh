#!/bin/bash

# Script to list latest Effect package versions concurrently
# Usage: ./list-effect-deps.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Array of Effect packages to check
packages=(
    "effect"
    "@effect/platform"
    "@effect/platform-browser"
    "@effect/platform-node"
    "@effect/platform-bun"
    "@effect/experimental"
    "@effect/opentelemetry"
    "@effect/cluster"
    "@effect/sql"
    "@effect/sql-pg"
    "@effect/sql-kysely"
    "@effect/eslint-plugin"
    "@effect/language-service"
    "@effect/vitest"
    "@effect/rpc"
    "@effect/ai"
    "@effect/ai-openai"
    "@effect/ai-anthropic"
    "@effect/ai-google"
    "@effect-rx/rx-react"
    "@effect/cli"
    "@effect/printer"
    "@effect/printer-ansi"
    "@effect/workflow"
    "@effect/typeclass"
)

echo -e "${YELLOW}Fetching latest versions of Effect packages concurrently...${NC}"

# Create temporary directory for results
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

# Function to get latest version of a package
get_latest_version() {
    local package=$1
    local temp_file="$temp_dir/${package//\//_}"
    local version=$(pnpm info "$package" version 2>/dev/null || echo "ERROR")
    echo "$package: $version" > "$temp_file"
}

# Start all jobs concurrently
for package in "${packages[@]}"; do
    get_latest_version "$package" &
done

# Wait for all background jobs to complete
wait

# Collect and display results in order
for package in "${packages[@]}"; do
    temp_file="$temp_dir/${package//\//_}"
    if [ -f "$temp_file" ]; then
        cat "$temp_file"
    else
        echo -e "${RED}$package: ERROR${NC}"
    fi
done

echo -e "${GREEN}Done!${NC}" 
