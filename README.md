# Prism - PR Safety Mentor

### Your AI-powered safety net for pull requests. Catch issues before they reach code review.

Prism is a local-first VS Code extension that helps developers understand the impact of their changes before pushing code. Think of it as a friendly mentor that reviews your PR and gives you actionable feedback.

## Live Link

https://marketplace.visualstudio.com/items?itemName=prism-ai.prism-ai

## DEMO



https://github.com/user-attachments/assets/d8cc9fe6-fb43-4d01-93ea-63b6b73e72a4




## ✨ Features


### 🚨 Risk Detection
Identifies potential issues before they become problems:
- **Secrets Detection** - Catches API keys, tokens, and credentials before they leak
- **Missing Test Coverage** - Warns when code changes lack corresponding tests
- **CI/CD Changes** - Flags modifications to build pipelines that need extra care
- **Large PRs** - Suggests splitting oversized pull requests
- **Environment Files** - Prevents accidental commits of `.env` files

<img width="399" height="516" alt="Screenshot 2026-05-18 at 12 45 23" src="https://github.com/user-attachments/assets/c6a2617f-86bc-4721-8750-83b996183ff1" />



### 🔍 Smart PR Analysis
Automatically analyzes your git changes and categorizes files by type (Frontend, Tests, CI/CD, Config, Documentation).

<img width="396" height="387" alt="Screenshot 2026-05-18 at 12 45 48" src="https://github.com/user-attachments/assets/998368d2-6457-42d4-843c-d60be15c12d3" />


### 🛡️ Protected Branch Rescue
Accidentally coding on `main` or `master`? Prism detects this and offers to safely move your changes to a new feature branch.

<img width="383" height="341" alt="Screenshot 2026-05-18 at 12 46 38" src="https://github.com/user-attachments/assets/fff075ae-8ef6-4579-97b1-9c22168b1392" />


### ✅ Smart Checklist
Get a personalized pre-push checklist based on your changes:
- **Required** - Must-do items before pushing
- **Recommended** - Best practices for your specific changes
- **Optional** - Nice-to-have improvements

<img width="396" height="405" alt="Screenshot 2026-05-18 at 12 45 38" src="https://github.com/user-attachments/assets/0d56b6e6-c1c2-4105-a6ef-e2619bccabb0" />


### 🤖 AI-Powered Explanations
Connect your local Ollama instance for friendly, educational explanations of detected issues. No data leaves your machine.

<img width="399" height="516" alt="Screenshot 2026-05-18 at 12 45 23" src="https://github.com/user-attachments/assets/56e2af91-3446-4ecc-8e22-c203a797f0ac" />


## 🚀 Getting Started

### Installation

1. Install from VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=prism-ai.prism-ai
2. Or search for "Prism" in VS Code Extensions (`Cmd+Shift+X`)

### Usage

#### Method 1: Sidebar (Recommended)
1. Click the Prism icon in the Activity Bar (left sidebar)
2. Optionally specify a target branch (defaults to `main`)
3. Click "🔍 Analyze My PR"

#### Method 2: Command Palette
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Prism: Analyze My PR"
3. Press Enter

### First-Time Setup

No configuration needed! Prism works out of the box. However, you can customize:

**Settings** (`Cmd+,` → Search "Prism"):
- `prism.defaultTargetBranch` - Default branch to compare against (e.g., `develop`)
- `prism.protectedBranches` - Branches that trigger rescue prompts (default: `main`, `master`)
- `prism.ollamaModel` - AI model for explanations (default: `llama3.2:3b`)

## 🤖 Optional: Enable AI Explanations

Want friendly AI explanations of your PR risks? Install Ollama:

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2:3b

# Start Ollama (runs in background)
ollama serve
```

That's it! Prism will automatically detect Ollama and provide AI-powered insights.

**Privacy Note**: All AI processing happens locally on your machine. No code or data is sent to external servers.

## 📋 Requirements

- VS Code 1.85.0 or higher
- Git repository with at least one commit
- Node.js (for pre-flight checks, optional)

## 🎯 Use Cases

### For Junior Developers
- Learn what makes a good PR before submitting
- Understand why certain changes are risky
- Build good habits with guided checklists

### For Teams
- Reduce code review cycles by catching issues early
- Standardize PR quality across the team
- Prevent common mistakes (leaked secrets, missing tests)

### For Solo Developers
- Self-review before pushing
- Catch mistakes when working late/tired
- Maintain code quality without a team

## 🔒 Privacy & Security

- **100% Local** - All analysis happens on your machine
- **No Telemetry** - We don't collect any data
- **No Network Calls** - Except optional Ollama (also local)
- **Open Source** - Audit the code yourself

## 🐛 Troubleshooting

### "No changes found"
- Make sure you've committed your changes
- Verify you're on a feature branch (not `main`/`master`)
- Check that your branch has diverged from the target branch

### "Analysis failed"
- Ensure you're in a git repository
- Check that `main` or `master` branch exists
- Try specifying a target branch manually

### Pre-flight checks not running
- Verify CI/CD config files exist (`.github/workflows/*.yml`, etc.)
- Ensure required tools (npm, yarn, etc.) are installed
- Check that commands are valid for your local environment

## 💬 Feedback & Support

- **Issues**: [GitHub Issues](https://github.com/kedarnhegde/prism/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/kedarnhegde/prism/discussions)
- **Questions**: Open an issue with the "question" label

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with ❤️ for developers who want to ship better code.

---

**[⭐ Star us on GitHub](https://github.com/kedarnhegde/prism)** | **[📦 View on Marketplace](https://marketplace.visualstudio.com/items?itemName=prism-ai.prism-ai)**
