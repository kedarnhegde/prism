import * as vscode from 'vscode';
import { PrismSidebarProvider } from './sidebar';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new PrismSidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('prism.analysisView', sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prism.analyzeMyPR', async () => {
      await sidebarProvider.runAnalysis(undefined);
      await vscode.commands.executeCommand('prism.analysisView.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('prism.refreshAnalysis', async () => {
      await sidebarProvider.runAnalysis(undefined);
    })
  );
}

export function deactivate() {}
