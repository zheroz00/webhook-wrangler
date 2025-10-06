# Security & Code Scan

Perform a comprehensive security and code quality scan of the repository to identify issues before making it public.

## Your Tasks

1. **Scan for Secrets & Credentials**
   - **Enhanced File Discovery (if Visual Tree Explorer available)**:
     - Use `mcp__gitPrep__visual-tree-explorer__explore_tree` to quickly spot sensitive files
     - Look for: `.env*`, `config/`, `*secret*`, `*credential*`, `*.key`, `*.pem` files
     - Check file previews for obvious secrets (first few lines)
   - **Pattern-based Scanning**:
     - Run `./scripts/scan-secrets.sh` for comprehensive pattern matching
     - Search for: `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `private_key`, AWS keys, OAuth secrets
     - Check patterns like: `sk-`, `ghp_`, `AKIA`, `-----BEGIN`, connection strings
   - **Fallback Discovery**:
     - Use `find` commands to locate sensitive file types
     - Manual grep through common locations if VTE unavailable

2. **Check Git History for Secrets**
   - Warn if secrets may exist in git history (even if removed from current code)
   - Suggest using `git log -p | grep -i "password\|api_key\|secret"` for manual check
   - Note: If found, will need `git filter-branch` or BFG Repo-Cleaner

3. **Scan for Sensitive Information**
   - Personal emails, phone numbers, addresses
   - Internal URLs, server IPs, company-specific identifiers
   - Database names, internal hostnames
   - Any TODO/FIXME comments mentioning security

4. **Check for Exposed Debug/Test Data**
   - Hardcoded test credentials or sample data with real-looking values
   - Debug endpoints or test code in production files
   - Console.log statements with sensitive data

5. **Generate Security Report**
   - Create a markdown report: `SCAN_REPORT.md`
   - Categorize findings: Critical, High, Medium, Low
   - For each finding: location, issue, recommendation
   - Mark false positives clearly

6. **Quick Code Quality Checks**
   - **Enhanced Code Analysis (if Visual Tree Explorer available)**:
     - Use VTE to get overview of code structure and identify large/suspicious files
     - Check file previews for obvious issues (commented code, debug statements)
   - **Standard Analysis**:
     - Run `./scripts/find-dead-code.sh` for comprehensive dead code detection
     - List commented-out code blocks (>5 lines)
     - Find TODO/FIXME/HACK comments
     - Identify obvious dead code or unused imports

## Output Format

Present findings in a clear summary:
- **Critical Issues**: Block publication immediately
- **High Priority**: Should fix before publishing
- **Medium Priority**: Consider fixing
- **Low Priority**: Optional cleanup

Ask the user if they want to see the full detailed report or just the summary.

## Safety Notes
- Never output actual secret values in the chat
- Use placeholders like `[API_KEY_FOUND]` when reporting
- Always recommend rotating any found secrets
