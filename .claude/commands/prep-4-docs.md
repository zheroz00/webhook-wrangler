# Documentation Setup

Ensure the repository has proper documentation for public release.

## Your Tasks

1. **Review/Create README.md**
   - Check if README exists and is comprehensive
   - Ensure it includes:
     - Clear project title and description (what it does, why it exists)
     - Installation instructions
     - Usage instructions with examples
     - Requirements/dependencies
     - Screenshots or demo (if applicable)
     - Badges (build status, license) if appropriate
   - If README is missing or minimal, offer to generate a template
   - Use the existing code to write accurate documentation

2. **License Selection**
   - Check if LICENSE file exists
   - If not, help user choose:
     - **MIT** - Most permissive, great for portfolio projects
     - **Apache 2.0** - Similar to MIT, better patent protection
     - **GPL-3.0** - Copyleft, requires derivatives to be open source
     - **Unlicense** - Public domain dedication
   - Generate LICENSE file with proper copyright holder and year
   - Ask user for their preferred name in the license

3. **Additional Documentation Files**
   - **CONTRIBUTING.md** - If user wants contributions (ask first)
   - **CHANGELOG.md** - If project has version history to document
   - **CODE_OF_CONDUCT.md** - Optional, but good for community projects
   - Only create if user wants them

4. **Code Documentation Check**
   - Scan for undocumented public APIs or exported functions
   - Check if complex logic has explanatory comments
   - Suggest JSDoc/docstrings for key functions if missing
   - Don't overdo it - code should be self-documenting where possible

5. **Repository Metadata**
   - Suggest description for GitHub repo (50-100 chars)
   - Recommend relevant topics/tags for GitHub (5-10 tags)
   - If there's a demo URL or homepage, note it

6. **Special Files Check**
   - `.gitignore` - ensure it's appropriate for the project type
   - `package.json`/`manifest.json` - description fields filled?
   - Check that version numbers are sensible (not 0.0.0 or weird values)

## Process

1. Audit existing documentation
2. Show user what's missing or incomplete
3. For each missing piece:
   - Explain why it's important
   - Offer to generate it (with user's approval)
   - Generate using actual project code/structure as reference
4. Show user the generated content before writing files
5. Let user edit/approve before finalizing

## Quality Standards

- Documentation should be clear and concise
- Use active voice and simple language
- Include practical examples
- Keep formatting consistent
- Avoid marketing speak - be factual and helpful
