# Prism - Developer Guide

> Contributing to Prism? This guide will get you up and running.

## 🏗️ Architecture Overview

Prism is a VS Code extension built with TypeScript that analyzes git diffs and provides intelligent feedback.

### Core Components

```
src/
├── extension.ts          # Extension entry point, registers commands
├── sidebar.ts            # Webview UI provider for the sidebar panel
├── analyzer.ts           # Main analysis orchestrator
├── rules.ts              # Risk detection rules engine
├── checklist.ts          # Dynamic checklist generator
├── secrets.ts            # Secret pattern matching
├── ciParser.ts           # CI/CD config parser (GitHub Actions, CircleCI, GitLab)
├── preflightRunner.ts    # Local CI command executor
└── ollama.ts             # Optional AI explanation provider
```

### Data Flow

```
User triggers analysis
    ↓
extension.ts → sidebar.ts
    ↓
analyzer.ts orchestrates:
    ├── Git diff extraction (simple-git)
    ├── File categorization
    ├── secrets.ts → Scan for leaked credentials
    ├── rules.ts → Apply risk detection rules
    ├── checklist.ts → Generate personalized checklist
    ├── ciParser.ts → Extract CI commands
    ├── preflightRunner.ts → Run commands locally
    └── ollama.ts → Get AI explanation (optional)
    ↓
sidebar.ts renders results in webview
```

## 🚀 Local Development Setup

### Prerequisites

- **Node.js** 20.x or higher
- **VS Code** 1.85.0 or higher
- **Git** (obviously!)
- **npm** or **yarn**

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/kedarnhegde/prism.git
cd prism

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### Running the Extension

1. Open the project in VS Code:
   ```bash
   code .
   ```

2. Press `F5` to launch the Extension Development Host
   - This opens a new VS Code window with the extension loaded
   - The original window shows debug logs

3. In the Extension Development Host window:
   - Open any git repository
   - Create/switch to a feature branch
   - Make some changes and commit them
   - Click the Prism icon in the sidebar OR
   - Run `Cmd+Shift+P` → "Prism: Analyze My PR"

### Development Workflow

```bash
# Watch mode - auto-recompile on changes
npm run watch

# After making changes:
# 1. Save your files (watch mode recompiles)
# 2. In Extension Development Host: Cmd+R to reload
# 3. Test your changes
```

### Debugging

- **Breakpoints**: Set breakpoints in `.ts` files (they work in compiled code)
- **Console Logs**: Use `console.log()` - output appears in Debug Console
- **Webview Debugging**: 
  - `Cmd+Shift+P` → "Developer: Open Webview Developer Tools"
  - Inspect the sidebar HTML/CSS/JS

## 🧪 Testing

### Manual Testing Checklist

Create a test repository with:

```bash
# Setup test repo
mkdir prism-test && cd prism-test
git init
git checkout -b main
echo "# Test" > README.md
git add . && git commit -m "Initial commit"

# Create feature branch with various changes
git checkout -b feature/test

# Test Case 1: Code without tests
echo "export const add = (a, b) => a + b;" > math.js
git add . && git commit -m "Add math function"

# Test Case 2: Secrets detection
echo "const API_KEY = 'sk-1234567890abcdef1234567890abcdef12345678';" > config.js
git add . && git commit -m "Add config"

# Test Case 3: CI/CD changes
mkdir -p .github/workflows
echo "name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test" > .github/workflows/ci.yml
git add . && git commit -m "Add CI"

# Test Case 4: Large PR
for i in {1..20}; do echo "file $i" > "file$i.txt"; done
git add . && git commit -m "Add many files"

# Now run Prism analysis
```

### Expected Behaviors

| Scenario | Expected Result |
|----------|----------------|
| Code changes without tests | Medium risk warning |
| Secrets in diff | High risk warning (critical) |
| CI/CD file changes | High risk warning |
| 15+ files changed | Medium risk warning (large PR) |
| `.env` file added | High risk warning |
| On `main` branch with changes | Rescue prompt appears |
| No changes | Error: "No changes found" |

### Testing Pre-flight Checks

```bash
# In your test repo, add package.json
echo '{"scripts":{"test":"echo test","lint":"echo lint"}}' > package.json
git add . && git commit -m "Add scripts"

# Add GitHub Actions workflow that uses these scripts
# Run analysis - should detect and execute npm test, npm lint
```

## 🏗️ Project Structure

```
prism/
├── src/                    # TypeScript source files
├── out/                    # Compiled JavaScript (gitignored)
├── resources/              # Images, icons
│   ├── icon.png           # Activity bar icon (monochrome)
│   └── logo.png           # Brand logo (color)
├── .vscode/               # VS Code debug config
├── .vscodeignore          # Files excluded from extension package
├── package.json           # Extension manifest & dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # User-facing documentation
```

## 📦 Building & Packaging

```bash
# Compile TypeScript
npm run compile

# Package extension (.vsix file)
npx vsce package

# Install locally for testing
code --install-extension prism-0.1.0.vsix
```

## 🎨 Adding New Features

### Adding a New Risk Rule

1. **Edit `src/rules.ts`**:
   ```typescript
   // Add new warning condition
   if (someCondition) {
     warnings.push({
       level: 'medium', // or 'low', 'high'
       title: 'Your warning title',
       message: 'Detailed explanation for the user'
     });
   }
   ```

2. **Update `src/checklist.ts`** (if needed):
   ```typescript
   // Add corresponding checklist item
   if (someCondition) {
     checklist.push({
       text: 'Action item for the user',
       priority: 'required' // or 'recommended', 'optional'
     });
   }
   ```

3. **Test**: Create a scenario that triggers your rule

### Adding a New Secret Pattern

Edit `src/secrets.ts`:

```typescript
const SECRET_PATTERNS = [
  // Add your pattern
  { 
    name: 'Service Name API Key', 
    pattern: /your-regex-pattern-here/ 
  },
  // ...
];
```

**Tips**:
- Make patterns specific to avoid false positives
- Require minimum length (20+ chars) for generic patterns
- Test against real examples

### Adding a New CI/CD Provider

Edit `src/ciParser.ts`:

```typescript
// Add detection logic
const yourCIPath = path.join(repoPath, '.your-ci-config.yml');
if (fs.existsSync(yourCIPath)) {
  const content = fs.readFileSync(yourCIPath, 'utf8');
  const config = yaml.load(content);
  extractYourCICommands(config, commands);
}

// Add extraction function
function extractYourCICommands(config: any, commands: CICommand[]): void {
  // Parse config and extract runnable commands
  // Use parseAndAddCommand() helper
}
```

## 🎨 UI Customization

The sidebar UI is in `src/sidebar.ts` using inline HTML/CSS. Key methods:

- `_getInitialHtml()` - Empty state (before analysis)
- `_getLoadingHtml()` - Loading state
- `_getAnalysisHtml()` - Results view
- `_getErrorHtml()` - Error state

**Styling**: Uses VS Code CSS variables for theme compatibility:
- `var(--vscode-foreground)` - Text color
- `var(--vscode-button-background)` - Button color
- `var(--vscode-inputValidation-errorBackground)` - Error background
- [Full list](https://code.visualstudio.com/api/references/theme-color)

## 🔧 Configuration

Extension settings are defined in `package.json` under `contributes.configuration`:

```json
{
  "prism.yourSetting": {
    "type": "string",
    "default": "value",
    "description": "What this setting does"
  }
}
```

Access in code:
```typescript
const config = vscode.workspace.getConfiguration('prism');
const value = config.get('yourSetting');
```

## 🐛 Common Issues

### "Cannot find module 'simple-git'"
```bash
npm install
```

### Extension not loading in dev host
- Check Debug Console for errors
- Ensure `npm run compile` succeeded
- Try reloading the window (`Cmd+R`)

### Changes not reflecting
- Make sure watch mode is running (`npm run watch`)
- Reload Extension Development Host (`Cmd+R`)
- Check for TypeScript compilation errors

### Webview not updating
- Webviews cache aggressively
- Add cache-busting or disable cache in Webview DevTools

## 📚 Useful Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [simple-git Documentation](https://github.com/steveukx/git-js)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

## 🤝 Contributing

### Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused

### PR Guidelines

- **Title**: Clear, descriptive (e.g., "Add support for Jenkins CI")
- **Description**: What, why, and how
- **Testing**: Describe how you tested the changes
- **Screenshots**: For UI changes

### Commit Messages

```
feat: Add new secret pattern for XYZ API
fix: Correct risk level calculation for large PRs
docs: Update setup instructions
refactor: Simplify file categorization logic
```

## 🗺️ Roadmap

### Planned Features
- [ ] Support for more CI/CD providers (Jenkins, Travis, etc.)
- [ ] Configurable risk thresholds
- [ ] Custom rule definitions via config file
- [ ] PR template suggestions
- [ ] Integration with GitHub/GitLab APIs
- [ ] Team-wide shared configurations
- [ ] Historical PR metrics

### Ideas Welcome!
Open an issue with the `enhancement` label to suggest features.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 💬 Questions?

- **General Questions**: Open a GitHub Discussion
- **Bug Reports**: Open a GitHub Issue
- **Security Issues**: Email security@yourproject.com (don't open public issues)

---

Happy coding! 🚀
