// Tests for the font scripts' Python environment (scripts/lib/venv.mjs): where its Python is, and
// when its packages need installing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { markInstalled, needsInstall, venvPython } from './venv.mjs';

describe('venvPython', () => {
  it('is in bin on Linux and macOS, and in Scripts on Windows', () => {
    expect(venvPython('/project', 'linux')).toBe(path.join('/project', '.venv', 'bin', 'python'));
    expect(venvPython('/project', 'darwin')).toBe(path.join('/project', '.venv', 'bin', 'python'));
    expect(venvPython('/project', 'win32')).toBe(
      path.join('/project', '.venv', 'Scripts', 'python.exe'),
    );
  });
});

describe('needsInstall', () => {
  let project;
  const python = () => venvPython(project, process.platform);
  beforeEach(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'venv-test-'));
    fs.mkdirSync(path.join(project, 'scripts'));
    fs.writeFileSync(path.join(project, 'scripts', 'requirements.txt'), 'fonttools==1.0\n');
  });
  afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

  it('is true when there is no environment yet', () => {
    expect(needsInstall(project)).toBe(true);
  });

  it('is true until the packages in requirements.txt have been installed, and false after', () => {
    fs.mkdirSync(path.dirname(python()), { recursive: true });
    fs.writeFileSync(python(), '');
    expect(needsInstall(project)).toBe(true);
    markInstalled(project);
    expect(needsInstall(project)).toBe(false);
  });

  it('is true again once requirements.txt changes', () => {
    fs.mkdirSync(path.dirname(python()), { recursive: true });
    fs.writeFileSync(python(), '');
    markInstalled(project);
    fs.writeFileSync(path.join(project, 'scripts', 'requirements.txt'), 'fonttools==2.0\n');
    expect(needsInstall(project)).toBe(true);
  });
});
