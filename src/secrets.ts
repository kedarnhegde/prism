// Patterns for detecting secrets in code
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic API Key', pattern: /api[_-]?key[_-]?[=:]\s*['"][a-zA-Z0-9]{20,}['"]/ },
  { name: 'Generic Secret', pattern: /secret[_-]?[=:]\s*['"][a-zA-Z0-9]{20,}['"]/ },
  { name: 'Password in code', pattern: /password[_-]?[=:]\s*['"][^'"]{8,}['"]/ },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'Generic Token', pattern: /token[_-]?[=:]\s*['"][a-zA-Z0-9]{20,}['"]/ },
  { name: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/ },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/ },
  { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
];

export interface SecretMatch {
  type: string;
  line: string;
  lineNumber: number;
}

export async function scanForSecrets(repoPath: string, diff: string): Promise<SecretMatch[]> {
  const matches: SecretMatch[] = [];
  const lines = diff.split('\n');
  
  lines.forEach((line, index) => {
    // Only check added lines (start with +)
    if (!line.startsWith('+')) return;
    
    // Skip lines that are just adding comments or examples
    if (line.includes('example') || line.includes('EXAMPLE') || line.includes('placeholder')) {
      return;
    }
    
    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        matches.push({
          type: name,
          line: line.substring(1).trim(), // Remove the + prefix
          lineNumber: index + 1
        });
      }
    }
  });
  
  return matches;
}
