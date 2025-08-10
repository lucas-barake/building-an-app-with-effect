#!/bin/bash

# Script to update Effect package versions in package.json concurrently
# Usage: ./update-effect-deps.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    "@effect-atom/atom-react"
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
    echo "$package:$version" > "$temp_file"
}

# Start all jobs concurrently
for package in "${packages[@]}"; do
    get_latest_version "$package" &
done

# Wait for all background jobs to complete
wait

# Collect results
versions=""
for package in "${packages[@]}"; do
    temp_file="$temp_dir/${package//\//_}"
    if [ -f "$temp_file" ]; then
        versions+=$(cat "$temp_file")$'\n'
    fi
done

echo -e "${GREEN}Latest versions:${NC}"
echo "$versions"

# Create a temporary file to store the new package.json
temp_file=$(mktemp)

# Function to update package.json
update_package_json() {
    local package_json="package.json"
    
    if [ ! -f "$package_json" ]; then
        echo -e "${RED}Error: package.json not found in current directory${NC}"
        exit 1
    fi
    
    # Read the current package.json
    cp "$package_json" "$temp_file"
    
    # Update each package version
    while IFS= read -r line; do
        if [[ $line =~ ^([^:]+):(.+)$ ]]; then
            local package="${BASH_REMATCH[1]}"
            local version="${BASH_REMATCH[2]}"
            
            if [ "$version" != "ERROR" ]; then
                echo -e "${YELLOW}Updating $package to $version${NC}"
                
                # Escape special characters in package name for sed
                local escaped_package=$(echo "$package" | sed 's/[[\.*^$()+?{|]/\\&/g')
                
                # Update the version in the overrides section
                sed -i.bak "s|\"$escaped_package\": \"[^\"]*\"|\"$escaped_package\": \"$version\"|" "$temp_file"
            else
                echo -e "${RED}Failed to get version for $package${NC}"
            fi
        fi
    done <<< "$versions"
    
    # Show diff
    echo -e "${GREEN}Changes to be made:${NC}"
    diff "$package_json" "$temp_file" || true
    
    mv "$temp_file" "$package_json"
    echo -e "${GREEN}Package.json updated successfully!${NC}"
}

# Run the update
update_package_json

# Cleanup
rm -f "$temp_file.bak" 
