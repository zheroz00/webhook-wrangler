#!/bin/bash

# Dead Code Finder
# Identifies potentially unused code and debug statements

set -e

TARGET_DIR="${1:-.}"

echo "🧹 Finding dead code and debug statements in: $TARGET_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Find debug statements
find_debug_statements() {
    echo ""
    echo "🐛 Debug statements (console.log, debugger, etc.):"

    grep -r -n -E '(console\.(log|debug|trace|info)|debugger|print\(|var_dump|dd\()' "$TARGET_DIR" \
        --include="*.js" \
        --include="*.jsx" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.py" \
        --include="*.php" \
        --exclude-dir="node_modules" \
        --exclude-dir=".git" \
        --exclude-dir="vendor" \
        --color=always \
        2>/dev/null | head -50 || echo "  ✅ No debug statements found"
}

# Find commented code blocks
find_commented_code() {
    echo ""
    echo "💬 Large commented code blocks (potential dead code):"

    # Look for multiple consecutive commented lines (more than 5)
    grep -r -n -E '^\s*(//|#|<!--)' "$TARGET_DIR" \
        --include="*.js" \
        --include="*.jsx" \
        --include="*.ts" \
        --include="*.tsx" \
        --include="*.py" \
        --include="*.html" \
        --exclude-dir="node_modules" \
        --exclude-dir=".git" \
        2>/dev/null | awk -F: '{print $1}' | uniq -c | awk '$1 > 5 {print "  ⚠️  " $2 " (" $1 " consecutive commented lines)"}' || echo "  ✅ No large commented blocks found"
}

# Find TODO/FIXME/HACK comments
find_code_comments() {
    echo ""
    echo "📝 TODO/FIXME/HACK comments:"

    grep -r -n -i -E '(TODO|FIXME|HACK|XXX|WTF|UGLY|STUPID):?' "$TARGET_DIR" \
        --exclude-dir="node_modules" \
        --exclude-dir=".git" \
        --exclude-dir="vendor" \
        --exclude="*.md" \
        --color=always \
        2>/dev/null | head -30 || echo "  ✅ No problematic comments found"
}

# Find potential unused imports (JavaScript/TypeScript)
find_unused_imports() {
    echo ""
    echo "📦 Checking for potentially unused imports (sample):"

    # This is a simple heuristic - not perfect but catches obvious cases
    find "$TARGET_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
        ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | head -10 | while read -r file; do

        # Get imports
        imports=$(grep -E "^import .* from" "$file" 2>/dev/null | sed -E "s/import \{([^}]+)\}.*/\1/" | tr ',' '\n' | awk '{$1=$1};1')

        if [[ -n "$imports" ]]; then
            while IFS= read -r import; do
                import=$(echo "$import" | xargs) # trim whitespace
                if [[ -n "$import" ]] && ! grep -q "$import" "$file" 2>/dev/null; then
                    echo "  ⚠️  Potentially unused: '$import' in $file"
                fi
            done <<< "$imports"
        fi
    done

    echo "  💡 Run a proper linter (ESLint, etc.) for accurate unused import detection"
}

# Find temp/backup files
find_temp_files() {
    echo ""
    echo "🗑️  Temporary and backup files:"

    find "$TARGET_DIR" -type f \( \
        -name "*.tmp" -o \
        -name "*.temp" -o \
        -name "*.bak" -o \
        -name "*.old" -o \
        -name "*.swp" -o \
        -name "*~" -o \
        -name ".DS_Store" -o \
        -name "Thumbs.db" \
    \) ! -path "*/.git/*" 2>/dev/null | while read -r file; do
        echo "  ⚠️  $file"
    done || echo "  ✅ No temp files found"
}

# Run all checks
find_debug_statements
find_commented_code
find_code_comments
find_unused_imports
find_temp_files

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Dead code scan complete!"
echo ""
echo "💡 For more accurate results, use language-specific tools:"
echo "   - JavaScript/TypeScript: ESLint, ts-prune"
echo "   - Python: vulture, pylint"
echo "   - Go: go vet, staticcheck"
