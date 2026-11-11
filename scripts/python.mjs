// Runs one of the Python font scripts (fonts.py or fallback_fonts.py) with the project's own
// Python environment in .venv. The first time, and whenever scripts/requirements.txt changes, it
// sets that environment up: it makes .venv with the computer's Python and installs the packages
// into it, without keeping pip's download cache. Nothing is installed outside this folder.
// Run through: pnpm run fonts, pnpm run fonts:fallback
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markInstalled, needsInstall, venvDir, venvPython } from './lib/venv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = process.argv[2];
const run = (command, args) =>
  spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PIP_NO_CACHE_DIR: '1', PIP_DISABLE_PIP_VERSION_CHECK: '1' },
  });

if (needsInstall(root)) {
  console.log('Setting up the Python environment for the font scripts (.venv)...');
  // The computer's own Python: "python3" on Linux and macOS, "py" or "python" on Windows.
  const candidates =
    process.platform === 'win32'
      ? [
          ['py', ['-3']],
          ['python', []],
        ]
      : [
          ['python3', []],
          ['python', []],
        ];
  const made = candidates.some(
    ([command, extra]) => run(command, [...extra, '-m', 'venv', venvDir(root)]).status === 0,
  );
  if (!made) {
    console.log(
      'Could not find Python. Install the latest Python 3 from https://www.python.org/downloads/ and try again.',
    );
    process.exit(1);
  }
  if (
    run(venvPython(root), [
      '-m',
      'pip',
      'install',
      '--no-cache-dir',
      '-r',
      path.join('scripts', 'requirements.txt'),
    ]).status !== 0
  ) {
    console.log('Installing the Python packages failed (see above).');
    process.exit(1);
  }
  markInstalled(root);
}

process.exit(
  run(venvPython(root), [path.join('scripts', script), ...process.argv.slice(3)]).status ?? 1,
);
