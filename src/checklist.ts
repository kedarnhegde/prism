import { RulesResult } from './rules';

export interface ChecklistItem {
  text: string;
  priority: 'required' | 'recommended' | 'optional';
}

export function generateChecklist(
  categorizedFiles: Record<string, string[]>,
  risks: RulesResult
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];

  // Always include basic checks
  checklist.push({
    text: 'Run tests locally and make sure they pass',
    priority: 'required'
  });

  checklist.push({
    text: 'Review your own changes before pushing',
    priority: 'required'
  });

  // Dynamic checks based on file changes
  const hasCodeChanges = (categorizedFiles['Frontend Files']?.length || 0) > 0;
  const hasTestChanges = (categorizedFiles['Test Files']?.length || 0) > 0;
  
  if (hasCodeChanges && !hasTestChanges) {
    checklist.push({
      text: 'Write tests for your code changes',
      priority: 'required'
    });
  }

  if (categorizedFiles['CI/CD Files']?.length) {
    checklist.push({
      text: 'Test CI/CD pipeline changes locally if possible',
      priority: 'required'
    });
    
    checklist.push({
      text: 'Notify team about CI/CD changes before merging',
      priority: 'recommended'
    });
  }

  const hasUIChanges = categorizedFiles['Frontend Files']?.some(f => 
    f.match(/\.(tsx|jsx)$/)
  );
  
  if (hasUIChanges) {
    checklist.push({
      text: 'Add screenshots or video of UI changes to PR description',
      priority: 'recommended'
    });
  }

  const envFiles = categorizedFiles['Config Files']?.filter(f => 
    f.includes('.env') || f.includes('environment')
  ) || [];
  
  if (envFiles.length > 0) {
    checklist.push({
      text: 'Update documentation for environment variable changes',
      priority: 'required'
    });
    
    checklist.push({
      text: 'Notify team about new environment variables',
      priority: 'required'
    });
  }

  if (!categorizedFiles['Documentation']?.length && hasCodeChanges) {
    checklist.push({
      text: 'Update README or docs if needed',
      priority: 'optional'
    });
  }

  checklist.push({
    text: 'Write a clear PR title and description',
    priority: 'required'
  });

  if (risks.riskLevel === 'high') {
    checklist.push({
      text: 'Mention high-risk changes in PR description',
      priority: 'required'
    });
  }

  return checklist;
}
