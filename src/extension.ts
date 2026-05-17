import * as vscode from 'vscode';
import { analyzeGitDiff } from './analyzer';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('prism.analyzeMyPR', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
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

function getWebviewContent(result: any): string {
  const riskColor = result.risks.riskLevel === 'high' ? '#f85149' : 
                    result.risks.riskLevel === 'medium' ? '#d29922' : '#3fb950';
  const riskEmoji = result.risks.riskLevel === 'high' ? '🔴' : 
                    result.risks.riskLevel === 'medium' ? '🟡' : '🟢';

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
    <h2>Warnings</h2>
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
