# Abort Preparation

Safely abort the preparation process and return to the original state.

## Your Tasks

1. **Verify Current State**
   - Check current branch name
   - Confirm this is a prep branch (contains "prep" in name)
   - Show what branch user will return to

2. **Check for Uncommitted Work**
   - Run `git status`
   - If there are uncommitted changes on the prep branch:
     - List the modified files
     - Ask user: "You have uncommitted changes. Are you sure you want to discard them?"
     - Require explicit confirmation

3. **Switch Back to Original Branch**
   - Determine the original branch (usually `main` or `master`)
   - If uncertain, ask user which branch to return to
   - Switch to the original branch
   - Confirm the switch was successful

4. **Delete Prep Branch**
   - Delete the prep branch: `git branch -D prep-for-public` (or whatever it's named)
   - Confirm deletion
   - Show current branch to verify we're back to normal

5. **Clean Up Any Generated Files**
   - Ask if user wants to delete any prep-related files:
     - `SCAN_REPORT.md`
     - Any other reports generated during prep
   - Only delete if user confirms

6. **Final Confirmation**
   - Show a summary:
     ```
     ✅ Returned to branch: main
     ✅ Deleted prep branch: prep-for-public
     ✅ Repository is back to original state
     ```

## Safety Instructions

- **Always confirm** before deleting branches or discarding changes
- **Never delete** the current branch - switch first, then delete
- **Verify** the target branch exists before switching
- If anything goes wrong, stop and explain the issue to the user

## Example Output

```
⚠️  Abort Preparation Workflow

Current branch: prep-for-public
Will return to: main

📋 Uncommitted changes found:
   - Modified: README.md
   - Modified: src/utils.js
   - New file: LICENSE

❓ Are you sure you want to discard these changes and delete the prep branch?
   Type 'yes' to confirm, or 'no' to cancel.
```

After confirmation:

```
✅ Switched to branch 'main'
✅ Deleted branch 'prep-for-public'
✅ Repository restored to original state

You can start over anytime with: /prep-start
```
