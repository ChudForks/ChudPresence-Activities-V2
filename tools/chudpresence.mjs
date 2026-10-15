#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';
import { validateMetadata, readPackage } from './build-catalog.mjs';
import {
  MAX_ACTIVITY_ICON_BYTES,
  MAX_ACTIVITY_SOURCE_BYTES,
} from '../sdk/activity-contract.generated.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activitiesRoot = path.join(root, 'activities');
const idPattern = /^[a-z0-9][a-z0-9-]{1,63}$/;

function usage() {
  console.log(`ChudPresence Activity SDK V2

Usage:
  chudpresence activity new <id>
  chudpresence activity build <id>
  chudpresence activity validate <id>
  chudpresence activity dev <id>
  chudpresence activity test <id>
`);
}

function activityDirectory(id) {
  if (!idPattern.test(String(id || ''))) throw new Error('Activity ID must use lowercase letters, numbers, and hyphens.');
  return path.join(activitiesRoot, id);
}

function activityName(id) {
  return id.split('-').map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' ');
}

async function readMetadata(id) {
  const directory = activityDirectory(id);
  const metadataText = await fs.readFile(path.join(directory, 'metadata.json'), 'utf8');
  const metadata = JSON.parse(metadataText);
  validateMetadata(metadata, id, metadataText);
  return { directory, metadata, metadataText };
}

async function validatePackage(id, { checkSyntax = true } = {}) {
  await readPackage(id);
  const { directory, metadata } = await readMetadata(id);
  const sourcePath = path.join(directory, 'activity.js');
  const source = await fs.readFile(sourcePath, 'utf8');
  if (!source.trim() || Buffer.byteLength(source, 'utf8') > MAX_ACTIVITY_SOURCE_BYTES) {
    throw new Error(`${id}: activity.js is empty or exceeds ${Math.round(MAX_ACTIVITY_SOURCE_BYTES / 1024)} KB.`);
  }
  if (checkSyntax) execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
  if (metadata.icon === 'icon.png') {
    const icon = await fs.readFile(path.join(directory, 'icon.png'));
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (icon.length > MAX_ACTIVITY_ICON_BYTES || !icon.subarray(0, 8).equals(signature)) {
      throw new Error(`${id}: icon.png must be a valid PNG up to ${Math.round(MAX_ACTIVITY_ICON_BYTES / 1024)} KB.`);
    }
  }
  return { directory, metadata, sourcePath };
}

function updateCatalog() {
  execFileSync(process.execPath, ['tools/build-catalog.mjs'], { cwd: root, stdio: 'inherit' });
}

async function createActivity(id) {
  const directory = activityDirectory(id);
  await fs.mkdir(directory, { recursive: false });
  await fs.mkdir(path.join(directory, 'src'));
  await fs.mkdir(path.join(directory, 'tests'));
  const name = activityName(id);
  const metadata = {
    id,
    name,
    description: `Show current media playback from ${name}.`,
    version: '1.0.0',
    apiVersion: 2,
    minExtensionVersion: '2.0.0',
    category: 'other',
    defaultMediaKind: 'generic',
    matches: ['https://example.com/*'],
    entry: 'activity.js',
    pageAccess: { media: true, selectors: { title: { selector: 'main h1', read: 'text' } } },
  };
  await fs.writeFile(path.join(directory, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  await fs.writeFile(path.join(directory, 'src', 'index.ts'), `import type { ActivityV2API } from '@chudpresence/activity-sdk-v2/types';\n\ndeclare const ChudPresence: ActivityV2API;\n\nChudPresence.onUpdate(async () => {\n  const title = ChudPresence.page.read('title');\n  const player = ChudPresence.media.getAll().find(media => media.visible && !media.ended);\n  if (typeof title !== 'string' || !title || !player) {\n    await ChudPresence.clear();\n    return;\n  }\n  await ChudPresence.report({\n    kind: 'video', media: { title },\n    playback: { state: player.paused ? 'paused' : 'playing', position: player.currentTime, duration: player.duration, rate: player.playbackRate }\n  });\n});\n`);
  await fs.writeFile(path.join(directory, 'tests', 'activity.test.js'), `import assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nimport test from 'node:test';\n\ntest('${id} package metadata is self-contained', async () => {\n  const metadata = JSON.parse(await readFile(new URL('../metadata.json', import.meta.url), 'utf8'));\n  assert.equal(metadata.id, '${id}');\n  assert.equal(metadata.entry, 'activity.js');\n});\n`);
  console.log(`Created activities/${id}. Edit metadata.json, src/index.ts, and tests before publishing.`);
}

async function compile(id, { watch = false } = {}) {
  const { directory, metadata } = await readMetadata(id);
  const entryPoint = path.join(directory, 'src', 'index.ts');
  const outfile = path.join(directory, 'activity.js');
  try { await fs.access(entryPoint); }
  catch (error) {
    if (error.code !== 'ENOENT' || watch) throw error;
    await validatePackage(id);
    updateCatalog();
    console.log(`Validated directly authored activities/${id}/activity.js v${metadata.version}.`);
    return;
  }
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit'], {
    cwd: root,
    stdio: 'inherit',
  });

  const options = {
    absWorkingDir: root,
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'info',
  };
  if (!watch) {
    await build(options);
    await validatePackage(id);
    updateCatalog();
    console.log(`Built self-contained activities/${id}/activity.js v${metadata.version}.`);
    return;
  }

  const plugin = {
    name: 'chudpresence-activity-package',
    setup(buildApi) {
      buildApi.onEnd(async (result) => {
        if (result.errors.length) return;
        try {
          await validatePackage(id);
          updateCatalog();
          console.log(`Updated ${id} ${metadata.version}; reselect the package files in Developer mode and load them to apply it.`);
        } catch (error) {
          console.error(`Activity validation failed: ${error.message}`);
        }
      });
    },
  };
  const watchContext = await context({ ...options, plugins: [plugin] });
  await watchContext.watch();
  console.log(`Watching activities/${id}/src. Press Ctrl+C to stop.`);
  const stop = async () => { await watchContext.dispose(); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise(() => {});
}

async function runTests(id) {
  const directory = path.join(activityDirectory(id), 'tests');
  const files = [];
  async function collect(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await collect(target);
      else if (entry.isFile() && /\.(?:test|spec)\.(?:js|mjs|cjs)$/.test(entry.name)) files.push(target);
    }
  }
  await collect(directory);
  if (!files.length) throw new Error(`${id} has no tests under its tests/ directory.`);
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  execFileSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit', env: environment });
}

async function main() {
  const [noun, command, id] = process.argv.slice(2);
  if (noun !== 'activity' || !command) return usage();
  if (command === 'new') return createActivity(id);
  if (command === 'build') return compile(id);
  if (command === 'dev') return compile(id, { watch: true });
  if (command === 'validate') {
    const result = await validatePackage(id);
    console.log(`Validated ${result.metadata.name} ${result.metadata.version}.`);
    return;
  }
  if (command === 'test') return runTests(id);
  usage();
  throw new Error(`Unknown Activity command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  });
}
