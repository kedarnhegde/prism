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
  totalFiles: number
): RulesResult {
  const warnings: Warning[] = [];

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
