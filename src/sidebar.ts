import * as vscode from 'vscode';
import { analyzeGitDiff } from './analyzer';

export class PrismSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _analysisResult?: any;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getInitialHtml();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'analyze':
          await this.runAnalysis();
          break;
        case 'copySummary':
          if (this._analysisResult) {
            const summary = this._buildTextSummary(this._analysisResult);
            await vscode.env.clipboard.writeText(summary);
            vscode.window.showInformationMessage('Summary copied to clipboard!');
          }
          break;
      }
    });
  }

  public async runAnalysis() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    if (this._view) {
      this._view.webview.html = this._getLoadingHtml();
    }

    // Check if user is on a protected branch
    const rescueResult = await this._checkAndOfferRescue(workspaceFolder.uri.fsPath);
    if (rescueResult === 'rescued') {
      vscode.window.showInformationMessage('Changes moved to new branch! Run "Analyze My PR" again when ready.');
      if (this._view) {
        this._view.webview.html = this._getInitialHtml();
      }
      return;
    } else if (rescueResult === 'cancelled') {
      if (this._view) {
        this._view.webview.html = this._getInitialHtml();
      }
      return;
    }

    const targetBranch = await vscode.window.showInputBox({
      prompt: 'Target branch to compare against (leave empty for default)',
      placeHolder: 'e.g., feat/big-feature, develop, main'
    });

    if (targetBranch === undefined) {
      if (this._view) {
        this._view.webview.html = this._getInitialHtml();
      }
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('prism');
      const defaultBranch = (config.get('defaultTargetBranch') as string) || undefined;
      const result = await analyzeGitDiff(workspaceFolder.uri.fsPath, targetBranch || defaultBranch);
      
      this._analysisResult = result;
      
      if (this._view) {
        this._view.webview.html = this._getAnalysisHtml(result);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Analysis failed: ${error}`);
      if (this._view) {
        this._view.webview.html = this._getErrorHtml(String(error));
      }
    }
  }

  private async _checkAndOfferRescue(repoPath: string): Promise<'rescued' | 'cancelled' | 'continue'> {
    const simpleGit = require('simple-git');
    const git = simpleGit(repoPath);
    
    const currentBranch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    const config = vscode.workspace.getConfiguration('prism');
    const protectedBranches = (config.get('protectedBranches') as string[]) || ['main', 'master'];
    
    if (!protectedBranches.includes(currentBranch)) {
      return 'continue';
    }

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

  private _getInitialHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px;
      color: var(--vscode-foreground);
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }
    .empty-state h2 {
      color: var(--vscode-textLink-foreground);
      margin-bottom: 10px;
    }
    .empty-state p {
      color: var(--vscode-descriptionForeground);
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .action-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1em;
      font-weight: bold;
    }
    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="empty-state">
    <h2>🛡️ Prism PR Safety</h2>
    <p>Check your changes before pushing to catch issues early.</p>
    <button class="action-button" onclick="analyze()">🔍 Analyze My PR</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function analyze() {
      vscode.postMessage({ type: 'analyze' });
    }
  </script>
</body>
</html>`;
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px;
      color: var(--vscode-foreground);
      text-align: center;
    }
  </style>
</head>
<body>
  <h2>🔍 Analyzing your changes...</h2>
  <p>This may take a few seconds.</p>
</body>
</html>`;
  }

  private _getErrorHtml(error: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px;
      color: var(--vscode-foreground);
    }
    .error {
      background: var(--vscode-inputValidation-errorBackground);
      border-left: 4px solid var(--vscode-inputValidation-errorBorder);
      padding: 15px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h3>❌ Analysis Failed</h3>
    <p>${error}</p>
  </div>
</body>
</html>`;
  }

  private _getAnalysisHtml(result: any): string {
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
      padding: 15px;
      color: var(--vscode-foreground);
    }
    h2 { 
      color: var(--vscode-textLink-foreground);
      font-size: 1.1em;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 1em;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    .section { margin: 15px 0; }
    .branch-info {
      background: var(--vscode-textBlockQuote-background);
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 0.85em;
      margin-bottom: 15px;
    }
    .risk-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 0.85em;
      background: ${riskColor};
      color: white;
    }
    .warning {
      background: var(--vscode-inputValidation-warningBackground);
      border-left: 3px solid var(--vscode-inputValidation-warningBorder);
      padding: 10px;
      margin: 8px 0;
      border-radius: 3px;
      font-size: 0.9em;
    }
    .warning.critical {
      background: var(--vscode-inputValidation-errorBackground);
      border-left: 3px solid var(--vscode-inputValidation-errorBorder);
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
      padding: 10px;
      border-radius: 4px;
      margin: 8px 0;
    }
    .checklist-item {
      padding: 6px 0;
      display: flex;
      align-items: flex-start;
      font-size: 0.9em;
    }
    .checklist-item input {
      margin-right: 8px;
      margin-top: 2px;
    }
    .checklist-section {
      margin-bottom: 12px;
    }
    .checklist-section-title {
      font-weight: bold;
      margin-bottom: 6px;
      font-size: 0.9em;
    }
    .priority-required { color: #f85149; }
    .priority-recommended { color: #d29922; }
    .priority-optional { color: #8b949e; }
    .ai-explanation {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 12px;
      border-radius: 3px;
      line-height: 1.5;
      white-space: pre-wrap;
      font-size: 0.9em;
    }
    .ollama-hint {
      background: var(--vscode-textCodeBlock-background);
      padding: 10px;
      border-radius: 3px;
      font-size: 0.85em;
    }
    .ollama-hint code {
      background: var(--vscode-editor-background);
      padding: 2px 5px;
      border-radius: 2px;
      font-family: monospace;
    }
    .ollama-hint a {
      color: var(--vscode-textLink-foreground);
    }
    .file-list {
      background: var(--vscode-editor-background);
      padding: 10px;
      border-radius: 4px;
      margin: 8px 0;
      max-height: 200px;
      overflow-y: auto;
    }
    .file {
      padding: 3px 0;
      font-family: monospace;
      font-size: 0.85em;
    }
    .category {
      font-weight: bold;
      margin-top: 10px;
      color: var(--vscode-textLink-activeForeground);
      font-size: 0.9em;
    }
    .action-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="branch-info">
    <strong>${result.currentBranch}</strong> → <strong>${result.targetBranch}</strong>
  </div>

  <div class="section">
    <h2>Risk Level: ${riskEmoji} <span class="risk-badge">${result.risks.riskLevel.toUpperCase()}</span></h2>
  </div>

  <div class="section">
    <h2>⚠️ Warnings</h2>
    ${result.risks.warnings.length === 0 ? 
      '<p class="no-warnings">✓ No issues detected. Your PR looks good!</p>' :
      result.risks.warnings.map((w: any) => `
        <div class="warning ${w.level === 'high' ? 'critical' : ''}">
          <div class="warning-title">${w.title}</div>
          <div>${w.message}</div>
        </div>
      `).join('')
    }
  </div>

  ${result.aiExplanation.available && result.aiExplanation.explanation ? `
    <div class="section">
      <h2>🤖 AI Mentor</h2>
      <div class="ai-explanation">
        ${result.aiExplanation.explanation}
      </div>
    </div>
  ` : ''}

  ${result.aiExplanation.available === false && result.risks.warnings.length > 0 ? `
    <div class="section">
      <div class="ollama-hint">
        💡 Tip: Install <a href="https://ollama.ai">Ollama</a> and run <code>ollama pull llama3.2:3b</code> to get AI-powered explanations.
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
    <h3>Summary</h3>
    <p style="font-size: 0.9em;">${result.summary}</p>
  </div>

  <div class="section">
    <h3>Changed Files (${result.totalFiles})</h3>
    <div class="file-list">
      ${Object.entries(result.categorizedFiles)
        .map(([category, files]: [string, any]) => `
          <div class="category">${category} (${files.length})</div>
          ${files.map((f: string) => `<div class="file">• ${f}</div>`).join('')}
        `)
        .join('')}
    </div>
  </div>

  <button class="action-button" onclick="copySummary()">📋 Copy Summary</button>

  <script>
    const vscode = acquireVsCodeApi();
    
    function copySummary() {
      vscode.postMessage({ type: 'copySummary' });
    }
  </script>
</body>
</html>`;
  }

  private _buildTextSummary(result: any): string {
    const lines: string[] = [];
    
    lines.push(`PR Analysis: ${result.currentBranch} → ${result.targetBranch}`);
    lines.push(`Risk Level: ${result.risks.riskLevel.toUpperCase()}`);
    lines.push('');
    
    if (result.risks.warnings.length > 0) {
      lines.push('Warnings:');
      result.risks.warnings.forEach((w: any) => {
        lines.push(`- ${w.title}: ${w.message}`);
      });
      lines.push('');
    }
    
    lines.push(result.summary);
    
    return lines.join('\n');
  }
}
