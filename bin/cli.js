#!/usr/bin/env node

/**
 * NeuralScaler 4K (DLSS 5) - Command Line Interface (CLI)
 * Lightweight, offline 4K video super-resolution directly from terminal.
 * GitHub: https://github.com/justForever17/NeuralScaler-4K
 */

import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read version from package.json
let version = '2.2.0';
try {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) version = pkg.version;
  }
} catch {
  // fallback version
}

function showHelp() {
  console.log(`
NeuralScaler 4K (DLSS 5) - Video Super-Resolution CLI v${version}
Copyright (c) 2026 justForever17 (MIT License)

Usage:
  neuralscaler <input-video> [options]
  npx neuralscaler <input-video> [options]

Arguments:
  <input-video>             Path to the source video (.mp4, .mov, .mkv, .avi, etc.)

Options:
  -t, --target <res>        Target resolution: 4K (default) or 2X
  -q, --quality <profile>   Quality profile: FAITHFUL (default), NATURAL, CINEMATIC
  -o, --output-dir <dir>    Output directory (default: ./output_4k or same folder)
      --gui                 Launch the desktop interactive GUI workstation
  -v, --version             Show CLI version number
  -h, --help                Show this help message

Examples:
  npx neuralscaler sample.mp4
  npx neuralscaler input.mp4 --target 4K --quality CINEMATIC
  npx neuralscaler input.mp4 -o D:\\Output4K\\ -t 2X
  neuralscaler --gui
`);
}

// Find suitable Python executable
function findPython() {
  const candidates = [
    'python',
    'python3',
    'py',
    path.join(projectRoot, 'python', 'python.exe'),
    path.join(projectRoot, '..', '..', '.venv', 'Scripts', 'python.exe')
  ];

  for (const exe of candidates) {
    try {
      const res = spawnSync(exe, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
      if (res.status === 0) {
        return exe;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`NeuralScaler 4K CLI v${version}`);
    process.exit(0);
  }

  const pythonExe = findPython();
  if (!pythonExe) {
    console.error('[Error] Python runtime not found in system PATH or local environment.');
    console.error('Please ensure Python 3.9+ is installed and accessible.');
    process.exit(1);
  }

  const serverScript = path.join(projectRoot, 'server.py');
  if (!fs.existsSync(serverScript)) {
    console.error(`[Error] Core engine server.py not found at: ${serverScript}`);
    process.exit(1);
  }

  // Forward arguments to server.py
  const forwardArgs = [serverScript, ...args];

  // Spawn Python engine
  const child = spawn(pythonExe, forwardArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  // Relay signals
  const cleanup = () => {
    try {
      child.kill('SIGINT');
    } catch {
      // ignore
    }
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    } else {
      process.exit(code ?? 0);
    }
  });
}

run();
