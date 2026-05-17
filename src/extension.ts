import * as vscode from 'vscode';
import { analyzeGitDiff } from './analyzer';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('prism.analyzeMyPR', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // Check if user is on a protected branch
    const rescueResult = await checkAndOfferRescue(workspaceFolder.uri.fsPath);
    if (rescueResult === 'rescued') {
      vscode.window.showInformationMessage('Changes moved to new branch! Run "Analyze My PR" again when ready.');
      return;
    } else if (rescueResult === 'cancelled') {
      return;
    }

    const targetBranch = await vscode.window.showInputBox({
      prompt: 'Target branch to compare against (leave empty for default)',
      placeHolder: 'e.g., feat/big-feature, develop, main'
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing your PR...',
        cancellable: false
      },
      async () => {
        try {
          const config = vscode.workspace.getConfiguration('prism');
          const defaultBranch = config.get<string>('defaultTargetBranch') || undefined;
          const result = await analyzeGitDiff(workspaceFolder.uri.fsPath, targetBranch || defaultBranch);
          
          const panel = vscode.window.createWebviewPanel(
            'prismAnalysis',
            'PR Analysis',
            vscode.ViewColumn.One,
            {}
          );

          panel.webview.html = getWebviewContent(result);
        } catch (error) {
          vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
      }
    );
  });

  context.subscriptions.push(disposable);
}

async function checkAndOfferRescue(repoPath: string): Promise<'rescued' | 'cancelled' | 'continue'> {
  const simpleGit = require('simple-git');
  const git = simpleGit(repoPath);
  
  const currentBranch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  const config = vscode.workspace.getConfiguration('prism');
  const protectedBranches = config.get<string[]>('protectedBranches') || ['main', 'master'];
  
  if (!protectedBranches.includes(currentBranch)) {
    return 'continue';
  }

  // Check if there are uncommitted changes
  const status = await git.status();
  const hasChanges = status.files.length > 0;
  
  if (!hasChanges) {
    return 'continue';
  }

  const choice = await vscode.window.showWarningMessage(
    `You're coding directly on ${currentBranch}. This is risky! Want me to move your changes to a new branch?`,
    'Yes, rescue my changes',
    'No, I know what I\'m doing'
  );

  if (choice !== 'Yes, rescue my changes') {
    return 'cancelled';
  }

  const newBranchName = await vscode.window.showInputBox({
    prompt: 'Name for your new feature branch',
    placeHolder: 'e.g., feat/my-feature, fix/bug-123',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Branch name cannot be empty';
      }
      if (value.includes(' ')) {
        return 'Branch name cannot contain spaces';
      }
      return null;
    }
  });

  if (!newBranchName) {
    return 'cancelled';
  }

  try {
    await git.stash();
    await git.checkoutLocalBranch(newBranchName.trim());
    await git.stash(['pop']);
    return 'rescued';
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to rescue changes: ${error}`);
    return 'cancelled';
  }
}

function getWebviewContent(result: any): string {
  const riskColor = result.risks.riskLevel === 'high' ? '#f85149' : 
                    result.risks.riskLevel === 'medium' ? '#d29922' : '#3fb950';
  const riskEmoji = result.risks.riskLevel === 'high' ? '🔴' : 
                    result.risks.riskLevel === 'medium' ? '🟡' : '🟢';

  const requiredItems = result.checklist.filter((item: any) => item.priority === 'required');
  const recommendedItems = result.checklist.filter((item: any) => item.priority === 'recommended');
  const optionalItems = result.checklist.filter((item: any) => item.priority === 'optional');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px;
      color: var(--vscode-foreground);
    }
    h2 { color: var(--vscode-textLink-foreground); }
    .section { margin: 20px 0; }
    .file-list { 
      background: var(--vscode-editor-background);
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .file { 
      padding: 4px 0;
      font-family: monospace;
    }
    .category {
      font-weight: bold;
      margin-top: 15px;
      color: var(--vscode-textLink-activeForeground);
    }
    .branch-info {
      background: var(--vscode-textBlockQuote-background);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.9em;
      margin-bottom: 15px;
    }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 0.9em;
      background: ${riskColor};
      color: white;
    }
    .warning {
      background: var(--vscode-inputValidation-warningBackground);
      border-left: 4px solid var(--vscode-inputValidation-warningBorder);
      padding: 12px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .warning-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .no-warnings {
      color: var(--vscode-testing-iconPassed);
      font-weight: bold;
    }
    .checklist {
      background: var(--vscode-editor-background);
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .checklist-item {
      padding: 8px 0;
      display: flex;
      align-items: flex-start;
    }
    .checklist-item input {
      margin-right: 10px;
      margin-top: 2px;
    }
    .checklist-section {
      margin-bottom: 15px;
    }
    .checklist-section-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: var(--vscode-textLink-activeForeground);
    }
    .priority-required { color: #f85149; }
    .priority-recommended { color: #d29922; }
    .priority-optional { color: #8b949e; }
    .ai-explanation {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--vscode-textLink-foreground);
      padding: 15px;
      border-radius: 4px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .ollama-hint {
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .ollama-hint code {
      background: var(--vscode-editor-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    .ollama-hint a {
      color: var(--vscode-textLink-foreground);
    }
  </style>
</head>
<body>
  <h1>📊 PR Analysis</h1>
  
  <div class="branch-info">
    Comparing <strong>${result.currentBranch}</strong> against <strong>${result.targetBranch}</strong>
  </div>

  <div class="section">
    <h2>Risk Level: ${riskEmoji} <span class="risk-badge">${result.risks.riskLevel.toUpperCase()}</span></h2>
  </div>

  <div class="section">
    <h2>⚠️ Warnings</h2>
    ${result.risks.warnings.length === 0 ? 
      '<p class="no-warnings">✓ No issues detected. Your PR looks good!</p>' :
      result.risks.warnings.map((w: any) => `
        <div class="warning">
          <div class="warning-title">${w.title}</div>
          <div>${w.message}</div>
        </div>
      `).join('')
    }
  </div>

  ${result.aiExplanation.available && result.aiExplanation.explanation ? `
    <div class="section">
      <h2>🤖 AI Mentor Explanation</h2>
      <div class="ai-explanation">
        ${result.aiExplanation.explanation}
      </div>
    </div>
  ` : ''}

  ${result.aiExplanation.available === false && result.risks.warnings.length > 0 ? `
    <div class="section">
      <div class="ollama-hint">
        💡 Tip: Install <a href="https://ollama.ai">Ollama</a> and run <code>ollama pull llama3.2:3b</code> to get AI-powered explanations of these warnings.
      </div>
    </div>
  ` : ''}

  <div class="section">
    <h2>✅ Before You Push</h2>
    <div class="checklist">
      ${requiredItems.length > 0 ? `
        <div class="checklist-section">
          <div class="checklist-section-title priority-required">Required</div>
          ${requiredItems.map((item: any) => `
            <div class="checklist-item">
              <input type="checkbox" />
              <span>${item.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${recommendedItems.length > 0 ? `
        <div class="checklist-section">
          <div class="checklist-section-title priority-recommended">Recommended</div>
          ${recommendedItems.map((item: any) => `
            <div class="checklist-item">
              <input type="checkbox" />
              <span>${item.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${optionalItems.length > 0 ? `
        <div class="checklist-section">
          <div class="checklist-section-title priority-optional">Optional</div>
          ${optionalItems.map((item: any) => `
            <div class="checklist-item">
              <input type="checkbox" />
              <span>${item.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <p>${result.summary}</p>
  </div>

  <div class="section">
    <h2>Changed Files (${result.totalFiles})</h2>
    <div class="file-list">
      ${Object.entries(result.categorizedFiles)
        .map(([category, files]: [string, any]) => `
          <div class="category">${category} (${files.length})</div>
          ${files.map((f: string) => `<div class="file">• ${f}</div>`).join('')}
        `)
        .join('')}
    </div>
  </div>
</body>
</html>`;
}

export function deactivate() {}
