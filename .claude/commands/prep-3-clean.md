# Code Cleanup

Clean up the codebase to remove unused code, debug statements, and improve overall code quality before publication.

## Your Tasks

1. **Find and Remove Dead Code**
   - Unused functions, classes, and methods
   - Unused imports/requires
   - Unreachable code
   - Old commented-out code blocks (>3 lines)
   - Present findings to user before removing anything

2. **Clean Up Debug Code**
   - `console.log`, `console.debug`, `print()`, `debugger` statements
   - Debug-only conditional blocks
   - Test code left in production files
   - Development-only features/flags
   - Show each finding with context (filename + line number)

3. **Remove Embarrassing Content**
   - TODO comments with names or embarrassing notes
   - Profanity or unprofessional comments
   - "WTF", "HACK", "UGLY", "STUPID" type comments
   - Personal notes that shouldn't be public
   - Present these sensitively and let user decide

4. **Clean Up Code Comments**
   - Remove redundant comments that just repeat code
   - Fix typos in remaining comments
   - Remove commented-out code
   - Keep useful documentation comments

5. **Dependency Cleanup**
   - List unused dependencies (package.json, requirements.txt, go.mod, etc.)
   - Check for deprecated packages
   - Suggest removal with caution (ask user to verify)

6. **File/Folder Cleanup**
   - List temporary files (`.DS_Store`, `Thumbs.db`, `*.swp`, `*.tmp`)
   - Suggest `.gitignore` additions if needed
   - Identify backup files (`*.bak`, `*.old`)

## Process

1. Analyze and create categorized list of findings
2. Present to user with file locations
3. Ask which categories they want to clean up
4. For each category:
   - Show specific instances
   - Get approval before making changes
   - Make changes and report what was done

## Safety

- **Never auto-delete code** - always get user approval
- Show context (few lines before/after) for each finding
- Be conservative - when in doubt, ask the user
- Make changes incrementally, not all at once
- Suggest committing after each major cleanup category
