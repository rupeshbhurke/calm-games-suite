// PostToolUse hook: format the file Claude just edited or wrote, so CI's format:check passes.
import { execFileSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;

const file = JSON.parse(input).tool_input?.file_path;
if (file) {
  try {
    execFileSync(
      'npx',
      ['prettier', '--write', '--ignore-unknown', '--log-level', 'silent', file],
      {
        stdio: 'ignore',
        shell: process.platform === 'win32',
      },
    );
  } catch {
    // Unparseable file or Prettier unavailable: leave it for format:check to report.
  }
}
