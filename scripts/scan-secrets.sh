#!/bin/bash

# Secret Scanner Script
# Scans repository for potential secrets and credentials

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS_FILE="$SCRIPT_DIR/secret-patterns.txt"
TARGET_DIR="${1:-.}"

echo "🔍 Scanning for secrets in: $TARGET_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if patterns file exists
if [[ ! -f "$PATTERNS_FILE" ]]; then
    echo "❌ Error: Pattern file not found: $PATTERNS_FILE"
    exit 1
fi

# Function to scan using grep
scan_with_grep() {
    echo ""
    echo "📝 Scanning with pattern matching..."

    # Read patterns and search (exclude git directory and common non-code files)
    grep -r -n -i -f "$PATTERNS_FILE" "$TARGET_DIR" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude-dir="vendor" \
        --exclude-dir="venv" \
        --exclude-dir=".venv" \
        --exclude="*.md" \
        --exclude="*.log" \
        --exclude="*.min.js" \
        --exclude="*.map" \
        --color=always \
        2>/dev/null || echo "  ✅ No obvious secrets found with pattern matching"
}

# Function to find common secret files
find_secret_files() {
    echo ""
    echo "📁 Checking for sensitive files..."

    find "$TARGET_DIR" -type f \( \
        -name "*.env*" -o \
        -name "*secret*" -o \
        -name "*credential*" -o \
        -name "*.pem" -o \
        -name "*.key" -o \
        -name "*.p12" -o \
        -name "*.pfx" -o \
        -name "id_rsa*" -o \
        -name "*.keystore" \
    \) ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | while read -r file; do
        echo "  ⚠️  Found: $file"
    done || echo "  ✅ No obvious secret files found"
}

# Function to check for hardcoded IPs and URLs
check_urls_ips() {
    echo ""
    echo "🌐 Checking for hardcoded IPs and internal URLs..."

    grep -r -n -E '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b|http://[a-zA-Z0-9.-]+\.(local|internal|corp|lan)' "$TARGET_DIR" \
        --exclude-dir=".git" \
        --exclude-dir="node_modules" \
        --exclude="*.md" \
        --exclude="*.log" \
        2>/dev/null | head -20 || echo "  ✅ No obvious hardcoded IPs/internal URLs found"
}

# Run scans
scan_with_grep
find_secret_files
check_urls_ips

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Scan complete!"
echo ""
echo "⚠️  IMPORTANT: This is a basic scan. For production use, consider:"
echo "   - gitleaks (https://github.com/gitleaks/gitleaks)"
echo "   - trufflehog (https://github.com/trufflesecurity/trufflehog)"
echo "   - git-secrets (https://github.com/awslabs/git-secrets)"
echo ""
echo "💡 Also manually review:"
echo "   - Git history: git log -p | grep -i 'password\\|secret\\|key'"
echo "   - Environment files and config files"
echo "   - Any TODO/FIXME comments about security"
