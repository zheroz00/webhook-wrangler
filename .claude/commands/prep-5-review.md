# Final Review Checklist

Walk through a comprehensive checklist before making the repository public.

## Your Tasks

Conduct an interactive review with the user. For each section, verify completion and show relevant details.

### 1. Security ✓
- [ ] No secrets or credentials in code
- [ ] No secrets in git history (or cleaned with BFG/filter-branch)
- [ ] No sensitive personal information
- [ ] No internal URLs, IPs, or company identifiers
- [ ] All found secrets have been rotated (if applicable)

**Action**: Show summary of security scan results. If scan wasn't run, offer to run `/prep-scan`.

### 2. Code Quality ✓
- [ ] No commented-out code blocks
- [ ] Debug statements removed (console.log, debugger, etc.)
- [ ] No embarrassing or unprofessional comments
- [ ] Dead code removed
- [ ] Unused imports/dependencies cleaned up

**Action**: Quick scan for obvious issues. If cleanup wasn't done, offer to run `/prep-clean`.

### 3. Documentation ✓
- [ ] README.md exists and is comprehensive
- [ ] LICENSE file exists with correct license
- [ ] Installation instructions are clear
- [ ] Usage examples are provided
- [ ] Project description is accurate and helpful

**Action**: Verify all docs exist and check their quality. If missing, offer to run `/prep-docs`.

### 4. Dependencies ✓
- [ ] All dependencies are necessary
- [ ] No known security vulnerabilities
- [ ] Dependency licenses are compatible with project license
- [ ] `package.json`/manifest has correct metadata (name, version, description)

**Action**: If package manager available, run security audit (`npm audit`, `pip-audit`, etc.)

### 5. Project Metadata ✓
- [ ] `.gitignore` properly configured
- [ ] Version number makes sense
- [ ] No test/dev files in repo
- [ ] Repository description ready for GitHub
- [ ] Topics/tags identified for discoverability

### 6. Git Repository Health ✓
- [ ] Commit messages are reasonable (not embarrassing)
- [ ] No huge files in repo (check repo size)
- [ ] Default branch is set correctly (main/master)
- [ ] Old branches cleaned up or documented

**Action**: Run `git log --oneline -20` to review recent commits, check for issues.

### 7. Final Code Read-Through ✓
- [ ] Code represents your best work (or at least decent work!)
- [ ] Code is something you'd be comfortable showing in an interview
- [ ] No obvious bugs or broken features
- [ ] Project actually works as described in README

**Action**: Ask user to do a final manual review of key files.

## Process

1. Go through each section systematically
2. Show relevant information for each checkpoint
3. Mark items complete only when user confirms
4. Identify any blockers that prevent publication
5. Create a summary of:
   - ✅ Everything ready
   - ⚠️ Issues to address
   - 🚫 Blockers that must be fixed

## Final Recommendation

Based on the review, provide a clear recommendation:
- **Ready to publish** - Go ahead, looks good!
- **Minor issues** - Can publish but consider fixing X, Y, Z
- **Not ready** - Must address [critical issues] before publishing

Ask user if they want to proceed, address issues, or wait.
