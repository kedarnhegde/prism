# Prism - PR Safety Mentor

Local-first VS Code extension that helps junior developers understand their PR impact before pushing.

## Sprint 0 + Sprint 1 ✅

- ✅ Basic VS Code extension setup
- ✅ "Analyze My PR" command
- ✅ Reads git diff between current branch and main/master
- ✅ Categorizes changed files (Frontend, Tests, CI/CD, Config, Docs)
- ✅ Shows summary with file counts

## How to Test

1. Open this project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open a git repository with a feature branch
4. Open Command Palette (`Cmd+Shift+P`)
5. Run: `Prism: Analyze My PR`

## What It Does

Compares your current branch against `main` (or `master`) and shows:
- Total files changed
- Files grouped by category
- Simple summary

## Next: Sprint 2

Add rule-based warnings (missing tests, CI/CD changes, large PRs, etc.)
