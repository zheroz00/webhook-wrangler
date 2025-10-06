# Start Preparation Workflow

Initialize the repository preparation process with safety measures.

## Your Tasks

1. **Verify Git Repository**
   - Check if current directory is a git repository
   - Show current branch name
   - Check if there are uncommitted changes
   - If uncommitted changes exist:
     - Show `git status` output
     - Ask user if they want to:
       - Commit changes first
       - Stash changes
       - Proceed anyway (risky)
       - Abort

2. **Create Safety Branch**
   - Create a new branch: `prep-for-public` (or `prep-for-public-2`, etc. if exists)
   - Switch to the new branch
   - Confirm branch creation and current branch
   - Explain: "All preparation work will be done on this branch. Your original branch is safe."

3. **Initial Repository Scan**
   - **Enhanced Overview (if Visual Tree Explorer available)**:
     - Use `mcp__gitPrep__visual-tree-explorer__explore_tree` for comprehensive view
     - Show file structure with sizes, types, and preview lines
     - Depth: 2-3 levels, focus on spotting issues
     - Highlight: large files, sensitive file types, unusual extensions
   - **Fallback Overview (basic commands)**:
     - Repository size, number of commits, primary language, file count
     - Use `find` commands to check for large files, .env files, etc.
   - **Red Flags to Report**:
     - Very large files (>10MB)
     - `.env` files tracked in git
     - Credential/key files (.pem, .key, etc.)
     - Unusual file types for the project
     - Database files, backup files, temp files

4. **Set Expectations**
   - Explain the workflow sequence:
     1. `/prep-scan` - Security audit
     2. `/prep-clean` - Code cleanup
     3. `/prep-docs` - Documentation
     4. `/prep-review` - Final review
   - Remind user they can run `/prep-abort` to delete the branch and start over
   - Suggest: "Ready to proceed with `/prep-scan`?"

## Safety Instructions

- **Never proceed** if there are uncommitted changes without user approval
- **Always confirm** branch creation succeeded
- **Show git commands** being run for transparency
- If the repo is not a git repository, explain they need to initialize it first

## Example Output

### With Visual Tree Explorer:
```
✅ Git repository detected
📍 Current branch: main
🌿 Creating safety branch: prep-for-public
✅ Switched to branch 'prep-for-public'

🌳 Repository Structure Overview:
└── 📁 my-project (156 files, 2.3MB)
    ├── 📁 src (45 files)
    │   ├── 📄 index.js (250 lines)
    │   └── 📁 components (20 files)
    ├── 📄 .env (⚠️ SENSITIVE - 12 lines)
    ├── 📄 package.json (35 lines)
    └── 📁 dist (50 files, ⚠️ Large: 1.2MB)

⚠️  Red flags detected:
   - .env file tracked in git (will scan for secrets)
   - Large dist/ folder (might want to .gitignore)
   - 3 TODO comments found

🎯 Next Steps: Ready to scan? Run: /prep-scan
```

### Fallback (without VTE):
```
✅ Git repository detected
📍 Current branch: main
🌿 Creating safety branch: prep-for-public
✅ Switched to branch 'prep-for-public'

📊 Basic Repository Info:
   - 156 files, 47 commits, 2.3 MB
   - Primary language: JavaScript

⚠️  Quick check found:
   - 1 .env file (will scan for secrets)
   - 3 TODO comments to review

🎯 Next Steps: Ready to scan? Run: /prep-scan
```
