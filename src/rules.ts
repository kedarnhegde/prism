import { SecretMatch } from './secrets';

export interface Warning {
  level: 'low' | 'medium' | 'high';
  title: string;
  message: string;
}

export interface RulesResult {
  riskLevel: 'low' | 'medium' | 'high';
  warnings: Warning[];
}

export function analyzeRisks(
  categorizedFiles: Record<string, string[]>,
  totalFiles: number,
  allChangedFiles: string[],
  secrets: SecretMatch[]
): RulesResult {
  const warnings: Warning[] = [];

  // Rule 0: Secrets detected (CRITICAL)
  if (secrets.length > 0) {
    const secretTypes = [...new Set(secrets.map(s => s.type))].join(', ');
    warnings.push({
      level: 'high',
      title: '🚨 CRITICAL: Secrets detected in code',
      message: `Found ${secrets.length} potential secret(s): ${secretTypes}. DO NOT push this. Remove secrets and use environment variables instead.`
    });
  }

  // Rule 1: Missing tests
  const hasCodeChanges = (categorizedFiles['Frontend Files']?.length || 0) > 0;
  const hasTestChanges = (categorizedFiles['Test Files']?.length || 0) > 0;
  
  if (hasCodeChanges && !hasTestChanges) {
    warnings.push({
      level: 'medium',
      title: 'Missing test coverage',
      message: 'You changed code files but no test files were updated. Reviewers may ask for test coverage.'
    });
  }

  // Rule 2: CI/CD changes
  if (categorizedFiles['CI/CD Files']?.length) {
    warnings.push({
      level: 'high',
      title: 'CI/CD workflow modified',
      message: 'GitHub Actions files were changed. This affects the build pipeline. Make sure you test this carefully.'
    });
  }

  // Rule 3: Large PR
  if (totalFiles > 15) {
    warnings.push({
      level: 'medium',
      title: 'Large PR detected',
      message: `You changed ${totalFiles} files. Large PRs are harder to review. Consider splitting into smaller PRs.`
    });
  }

  // Rule 4: Environment variable changes
  const envFiles = categorizedFiles['Config Files']?.filter(f => 
    f.includes('.env') || f.includes('environment')
  ) || [];
  
  if (envFiles.length > 0) {
    warnings.push({
      level: 'medium',
      title: 'Environment configuration changed',
      message: 'Environment files were modified. Make sure to update documentation and notify your team.'
    });
  }

  // Rule 5: Pushing .env files (CRITICAL)
  const actualEnvFiles = allChangedFiles.filter(f => 
    f.match(/\.env$/) && !f.includes('.env.example')
  );
  
  if (actualEnvFiles.length > 0) {
    warnings.push({
      level: 'high',
      title: '⚠️ DANGER: .env file detected',
      message: `You're about to push ${actualEnvFiles.join(', ')}. This likely contains secrets and should NOT be committed. Add it to .gitignore immediately.`
    });
  }

  // Determine overall risk level
  const riskLevel = calculateRiskLevel(warnings);

  return { riskLevel, warnings };
}

function calculateRiskLevel(warnings: Warning[]): 'low' | 'medium' | 'high' {
  if (warnings.length === 0) return 'low';
  
  const hasHigh = warnings.some(w => w.level === 'high');
  const hasMedium = warnings.some(w => w.level === 'medium');
  
  if (hasHigh) return 'high';
  if (hasMedium) return 'medium';
  return 'low';
}
