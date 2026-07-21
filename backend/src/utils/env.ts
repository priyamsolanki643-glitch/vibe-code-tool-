import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, 'backend', '.env'),
    path.join(cwd, 'backend', '.env.local'),
  ];
  
  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const index = trimmed.indexOf('=');
          if (index === -1) return;
          const key = trimmed.substring(0, index).trim();
          const val = trimmed.substring(index + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        });
      } catch (e) {
        console.error(`Error loading env file ${envPath}:`, e);
      }
    }
  }
}

loadEnv();
