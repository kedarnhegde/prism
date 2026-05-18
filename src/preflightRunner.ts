import { exec } from 'child_process';
import { promisify } from 'util';
import { CICommand } from './ciParser';

const execAsync = promisify(exec);

export interface CheckResult {
  name: string;
  command: string;
  passed: boolean;
  output?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export async function runPreflightChecks(
  repoPath: string,
  commands: CICommand[],
  timeoutMs: number = 60000
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const cmd of commands) {
    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        cwd: repoPath,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      results.push({
        name: cmd.name,
        command: cmd.command,
        passed: true,
        output: stdout || stderr
      });
    } catch (error: any) {
      // Only skip if the script literally doesn't exist in package.json
      // npm returns specific error for missing scripts
      const errorText = String(error.stderr || error.message || '');
      const isScriptMissing = 
        errorText.includes('missing script:') ||
        errorText.includes('Unknown command') ||
        error.code === 'ENOENT';

      if (isScriptMissing) {
        results.push({
          name: cmd.name,
          command: cmd.command,
          passed: true,
          skipped: true,
          skipReason: 'Not configured in your project'
        });
      } else {
        // Command ran but failed - this is what we want to show
        results.push({
          name: cmd.name,
          command: cmd.command,
          passed: false,
          error: error.message,
          output: error.stdout || error.stderr
        });
      }
    }
  }

  return results;
}
