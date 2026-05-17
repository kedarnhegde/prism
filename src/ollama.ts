import { RulesResult } from './rules';

export interface OllamaExplanation {
  available: boolean;
  explanation?: string;
  error?: string;
}

export async function getOllamaExplanation(
  risks: RulesResult,
  categorizedFiles: Record<string, string[]>,
  totalFiles: number
): Promise<OllamaExplanation> {
  // Check if Ollama is running
  const isAvailable = await checkOllamaAvailable();
  
  if (!isAvailable) {
    return { available: false };
  }

  // Only call Ollama if there are warnings
  if (risks.warnings.length === 0) {
    return { available: true };
  }

  try {
    const prompt = buildPrompt(risks, categorizedFiles, totalFiles);
    const explanation = await callOllama(prompt);
    return { available: true, explanation };
  } catch (error) {
    return { available: true, error: String(error) };
  }
}

async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

async function callOllama(prompt: string): Promise<string> {
  const vscode = require('vscode');
  const config = vscode.workspace.getConfiguration('prism');
  const model = (config.get('ollamaModel') as string) || 'llama3.2:3b';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 300
      }
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.response;
}

function buildPrompt(
  risks: RulesResult,
  categorizedFiles: Record<string, string[]>,
  totalFiles: number
): string {
  const fileCategories = Object.entries(categorizedFiles)
    .map(([cat, files]) => `${cat}: ${files.length}`)
    .join(', ');

  const warningsList = risks.warnings
    .map(w => `- ${w.title}: ${w.message}`)
    .join('\n');

  return `You are a helpful coding mentor for junior developers. A developer is about to push their code changes and needs guidance.

Changes summary:
- Total files changed: ${totalFiles}
- File types: ${fileCategories}
- Risk level: ${risks.riskLevel}

Warnings detected:
${warningsList}

Explain these warnings in a friendly, educational way. Help them understand:
1. Why these issues matter
2. What could go wrong if they push anyway
3. Quick tips to fix them

Keep it concise (3-4 sentences max). Be supportive, not scary.`;
}
