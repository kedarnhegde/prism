import simpleGit from 'simple-git';
import { analyzeRisks, RulesResult } from './rules';
import { generateChecklist, ChecklistItem } from './checklist';
import { scanForSecrets } from './secrets';
import { getOllamaExplanation, OllamaExplanation } from './ollama';

interface AnalysisResult {
  totalFiles: number;
  categorizedFiles: Record<string, string[]>;
  summary: string;
  currentBranch: string;
  targetBranch: string;
  risks: RulesResult;
  checklist: ChecklistItem[];
  aiExplanation: OllamaExplanation;
}

export async function analyzeGitDiff(repoPath: string, userTargetBranch?: string): Promise<AnalysisResult> {
  const git = simpleGit(repoPath);
  
  const currentBranch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  const branches = await git.branch();
  const allBranches = branches.all.map(b => b.replace('remotes/origin/', ''));
  
  // Branch selection: user input > user config > main > master
  let targetBranch: string | null = null;
  
  if (userTargetBranch && allBranches.includes(userTargetBranch)) {
    targetBranch = userTargetBranch;
  } else if (allBranches.includes('main')) {
    targetBranch = 'main';
  } else if (allBranches.includes('master')) {
    targetBranch = 'master';
  }
  
  if (!targetBranch) {
    throw new Error('No target branch found (tried: main, master)');
  }

  if (currentBranch === targetBranch) {
    throw new Error(`You're on ${targetBranch}. Switch to a feature branch first.`);
  }

  // Get diff between current branch and target
  const diff = await git.diff([`${targetBranch}...HEAD`, '--name-only']);
  const changedFiles = diff.split('\n').filter(f => f.trim());

  if (changedFiles.length === 0) {
    throw new Error(`No changes found between ${currentBranch} and ${targetBranch}. Make sure you've committed your changes.`);
  }

  // Get full diff with content for secrets scanning
  const fullDiff = await git.diff([`${targetBranch}...HEAD`]);
  const secrets = await scanForSecrets(repoPath, fullDiff);

  const categorized = categorizeFiles(changedFiles);
  const summary = generateSummary(changedFiles, categorized);
  const risks = analyzeRisks(categorized, changedFiles.length, changedFiles, secrets);
  const checklist = generateChecklist(categorized, risks);
  const aiExplanation = await getOllamaExplanation(risks, categorized, changedFiles.length);

  return {
    totalFiles: changedFiles.length,
    categorizedFiles: categorized,
    summary,
    currentBranch,
    targetBranch,
    risks,
    checklist,
    aiExplanation
  };
}

function categorizeFiles(files: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    'Frontend Files': [],
    'Test Files': [],
    'Config Files': [],
    'CI/CD Files': [],
    'Documentation': [],
    'Unknown': []
  };

  for (const file of files) {
    if (file.includes('.github/workflows')) {
      categories['CI/CD Files'].push(file);
    } else if (file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      categories['Test Files'].push(file);
    } else if (file.match(/\.(tsx?|jsx?)$/) && !file.includes('test')) {
      categories['Frontend Files'].push(file);
    } else if (file.match(/\.(md|txt)$/i) || file.includes('README') || file.includes('CHANGELOG')) {
      categories['Documentation'].push(file);
    } else if (file.match(/\.(json|yaml|yml|toml|env)$/)) {
      categories['Config Files'].push(file);
    } else {
      categories['Unknown'].push(file);
    }
  }

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, files]) => files.length > 0)
  );
}

function generateSummary(files: string[], categorized: Record<string, string[]>): string {
  const parts: string[] = [];
  
  parts.push(`You changed ${files.length} file${files.length === 1 ? '' : 's'}.`);
  
  if (categorized['Frontend Files']?.length) {
    parts.push(`${categorized['Frontend Files'].length} ${categorized['Frontend Files'].length === 1 ? 'is a frontend file' : 'are frontend files'}.`);
  }
  
  if (categorized['CI/CD Files']?.length) {
    parts.push(`${categorized['CI/CD Files'].length} ${categorized['CI/CD Files'].length === 1 ? 'is a CI/CD file' : 'are CI/CD files'}.`);
  }
  
  if (!categorized['Test Files'] || categorized['Test Files'].length === 0) {
    parts.push('No test files changed.');
  } else {
    parts.push(`${categorized['Test Files'].length} test file${categorized['Test Files'].length === 1 ? '' : 's'} changed.`);
  }

  return parts.join(' ');
}
