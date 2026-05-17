// Patterns for detecting secrets in code
const SECRET_PATTERNS = [
  // Cloud providers
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS Secret Key', pattern: /aws[_-]?secret[_-]?access[_-]?key['"]?\s*[=:]\s*['"][A-Za-z0-9\/+=]{40}['"]/ },
  { name: 'Google Cloud API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Azure Key', pattern: /['"]?azure[_-]?key['"]?\s*[=:]\s*['"][A-Za-z0-9\/+=]{40,}['"]/ },
  
  // AI Services
  { name: 'OpenAI API Key', pattern: /sk-[A-Za-z0-9]{48}/ },
  { name: 'Anthropic API Key', pattern: /sk-ant-[A-Za-z0-9\-_]{95,}/ },
  { name: 'Claude API Key', pattern: /sk-ant-api[0-9]{2}-[A-Za-z0-9\-_]{93,}/ },
  
  // Payment processors
  { name: 'Stripe Secret Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Stripe Restricted Key', pattern: /rk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'PayPal Secret', pattern: /['"]?paypal[_-]?secret['"]?\s*[=:]\s*['"][A-Za-z0-9\-_]{60,}['"]/ },
  
  // Communication
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/ },
  { name: 'Slack Webhook', pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/ },
  { name: 'Twilio API Key', pattern: /SK[a-z0-9]{32}/ },
  { name: 'SendGrid API Key', pattern: /SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}/ },
  
  // Version control
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'GitLab Token', pattern: /glpat-[A-Za-z0-9\-_]{20}/ },
  
  // Databases
  { name: 'MongoDB Connection String', pattern: /mongodb(\+srv)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/ },
  { name: 'PostgreSQL Connection String', pattern: /postgres(ql)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/ },
  { name: 'MySQL Connection String', pattern: /mysql:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/ },
  { name: 'Redis URL with password', pattern: /redis:\/\/:[^\s'"]+@[^\s'"]+/ },
  
  // Generic patterns (broader catch-all)
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]{30,}/ },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  
  // Generic hardcoded secrets (language-agnostic, must be long enough to avoid false positives)
  { name: 'Hardcoded API Key', pattern: /\w*[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]\w*\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{20,}['"]/ },
  { name: 'Hardcoded Secret', pattern: /\w*[Ss][Ee][Cc][Rr][Ee][Tt]\w*\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{20,}['"]/ },
  { name: 'Hardcoded Token', pattern: /\w*[Tt][Oo][Kk][Ee][Nn]\w*\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{20,}['"]/ },
  { name: 'Hardcoded Password', pattern: /\w*[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]\w*\s*[=:]\s*['"][^'"]{8,}['"]/ },
  { name: 'Hardcoded Key', pattern: /\w*[Kk][Ee][Yy]\w*\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{25,}['"]/ },
  
  // Generic key=value patterns (last resort, must be long)
  { name: 'API Key', pattern: /['"]?api[_-]?key['"]?\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{30,}['"]/ },
  { name: 'Secret Key', pattern: /['"]?secret[_-]?key['"]?\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{30,}['"]/ },
  { name: 'Access Token', pattern: /['"]?access[_-]?token['"]?\s*[=:]\s*['"][a-zA-Z0-9_\-\/+=]{30,}['"]/ },
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
