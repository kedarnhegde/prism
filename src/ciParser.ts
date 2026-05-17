import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface CICommand {
  name: string;
  command: string;
}

export async function detectCICommands(repoPath: string): Promise<CICommand[]> {
  const commands: CICommand[] = [];

  // Check GitHub Actions
  const githubWorkflowsPath = path.join(repoPath, '.github', 'workflows');
  if (fs.existsSync(githubWorkflowsPath)) {
    const workflowFiles = fs.readdirSync(githubWorkflowsPath).filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    for (const file of workflowFiles) {
      const filePath = path.join(githubWorkflowsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const workflow: any = yaml.load(content);
        extractGitHubActionsCommands(workflow, commands);
      } catch (error) {
        // Skip invalid YAML
      }
    }
  }

  // Check CircleCI
  const circleCIPath = path.join(repoPath, '.circleci', 'config.yml');
  if (fs.existsSync(circleCIPath)) {
    const content = fs.readFileSync(circleCIPath, 'utf8');
    try {
      const config: any = yaml.load(content);
      extractCircleCICommands(config, commands);
    } catch (error) {
      // Skip invalid YAML
    }
  }

  // Check GitLab CI
  const gitlabCIPath = path.join(repoPath, '.gitlab-ci.yml');
  if (fs.existsSync(gitlabCIPath)) {
    const content = fs.readFileSync(gitlabCIPath, 'utf8');
    try {
      const config: any = yaml.load(content);
      extractGitLabCICommands(config, commands);
    } catch (error) {
      // Skip invalid YAML
    }
  }

  return deduplicateCommands(commands);
}

function extractGitHubActionsCommands(workflow: any, commands: CICommand[]): void {
  if (!workflow.jobs) return;

  for (const jobName in workflow.jobs) {
    const job = workflow.jobs[jobName];
    if (!job.steps) continue;

    for (const step of job.steps) {
      if (step.run) {
        const runCommand = step.run.trim();
        parseAndAddCommand(runCommand, commands);
      }
    }
  }
}

function extractCircleCICommands(config: any, commands: CICommand[]): void {
  if (!config.jobs) return;

  for (const jobName in config.jobs) {
    const job = config.jobs[jobName];
    if (!job.steps) continue;

    for (const step of job.steps) {
      if (step.run) {
        const runCommand = typeof step.run === 'string' ? step.run : step.run.command;
        if (runCommand) {
          parseAndAddCommand(runCommand.trim(), commands);
        }
      }
    }
  }
}

function extractGitLabCICommands(config: any, commands: CICommand[]): void {
  for (const key in config) {
    if (key.startsWith('.') || ['stages', 'variables', 'default'].includes(key)) continue;
    
    const job = config[key];
    if (job.script) {
      const scripts = Array.isArray(job.script) ? job.script : [job.script];
      for (const script of scripts) {
        parseAndAddCommand(script.trim(), commands);
      }
    }
  }
}

function parseAndAddCommand(commandLine: string, commands: CICommand[]): void {
  // Skip comments and empty lines
  if (!commandLine || commandLine.startsWith('#')) return;

  // Common patterns to extract
  const patterns = [
    { regex: /npm\s+run\s+(\w+)/, type: 'npm' },
    { regex: /npm\s+(test|lint|build)/, type: 'npm' },
    { regex: /yarn\s+(\w+)/, type: 'yarn' },
    { regex: /pnpm\s+(\w+)/, type: 'pnpm' },
    { regex: /pytest/, type: 'pytest' },
    { regex: /python\s+-m\s+pytest/, type: 'pytest' },
    { regex: /eslint/, type: 'eslint' },
    { regex: /tsc\s+/, type: 'tsc' },
    { regex: /cargo\s+test/, type: 'cargo-test' },
    { regex: /go\s+test/, type: 'go-test' },
    { regex: /mvn\s+test/, type: 'maven-test' },
    { regex: /gradle\s+test/, type: 'gradle-test' },
  ];

  for (const { regex, type } of patterns) {
    const match = commandLine.match(regex);
    if (match) {
      let name = type;
      let command = commandLine;

      // Extract specific script name for npm/yarn/pnpm
      if (['npm', 'yarn', 'pnpm'].includes(type) && match[1]) {
        name = match[1];
      }

      commands.push({ name, command: command.split('&&')[0].trim() });
      break;
    }
  }
}

function deduplicateCommands(commands: CICommand[]): CICommand[] {
  const seen = new Set<string>();
  const unique: CICommand[] = [];

  for (const cmd of commands) {
    const key = `${cmd.name}:${cmd.command}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cmd);
    }
  }

  return unique;
}
