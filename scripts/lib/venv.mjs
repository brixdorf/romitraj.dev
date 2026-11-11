// The font scripts' own Python environment, in .venv inside this folder: where its Python is, and
// whether the packages in scripts/requirements.txt still need installing into it.
import fs from 'node:fs';
import path from 'node:path';

export const venvDir = (root) => path.join(root, '.venv');

// Python inside the environment: in "bin" on Linux and macOS, in "Scripts" on Windows.
export const venvPython = (root, platform = process.platform) =>
  platform === 'win32'
    ? path.join(venvDir(root), 'Scripts', 'python.exe')
    : path.join(venvDir(root), 'bin', 'python');

const requirements = (root) => path.join(root, 'scripts', 'requirements.txt');
// A copy of requirements.txt as it was when its packages were last installed.
const installedList = (root) => path.join(venvDir(root), 'requirements.installed.txt');

// True when there is no environment yet, or requirements.txt changed since the last install.
export function needsInstall(root) {
  if (!fs.existsSync(venvPython(root))) return true;
  const installed = fs.existsSync(installedList(root))
    ? fs.readFileSync(installedList(root), 'utf8')
    : null;
  return installed !== fs.readFileSync(requirements(root), 'utf8');
}

// Notes that the packages in requirements.txt are now installed.
export function markInstalled(root) {
  fs.copyFileSync(requirements(root), installedList(root));
}
