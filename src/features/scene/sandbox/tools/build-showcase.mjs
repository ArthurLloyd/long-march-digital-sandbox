import { build } from 'vite';
import process from 'node:process';
import { log } from 'node:console';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, chmod, copyFile } from 'node:fs/promises';

const scene = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repo = resolve(scene, '../../..');
const out = resolve(
  process.argv[2] ?? '/Users/a555/Desktop/长征沙盘_三维整合版_2026-11-02',
);
if (
  out === repo ||
  out === scene ||
  out === '/' ||
  !out.includes('长征沙盘_三维整合版')
)
  throw new Error('Use a dedicated showcase output folder');
await build({
  configFile: false,
  mode: 'showcase',
  root: scene,
  base: './',
  publicDir: resolve(repo, 'public'),
  build: {
    outDir: out,
    emptyOutDir: false,
    rolldownOptions: {
      input: {
        atlas: resolve(scene, 'sandbox/index.html'),
        crossing: resolve(scene, 'prototype/index.html'),
      },
    },
  },
});
await writeFile(
  resolve(out, 'index.html'),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./sandbox/index.html"><title>山河行迹</title><a href="./sandbox/index.html">进入长征沙盘三维整合版</a></html>',
);
await writeFile(
  resolve(out, '启动整合版.command'),
  '#!/bin/zsh\ncd "$(dirname "$0")"\npython3 -m http.server 5180 --bind 127.0.0.1 &\nscene_pid=$!\ntrap \'kill "$scene_pid" 2>/dev/null\' EXIT INT TERM\nsleep 1\nopen "http://127.0.0.1:5180/sandbox/index.html"\necho "关闭此窗口即可停止本地预览。"\nwait "$scene_pid"\n',
);
await chmod(resolve(out, '启动整合版.command'), 0o755);
await copyFile(
  resolve(scene, 'sandbox/DELIVERY.md'),
  resolve(out, '使用说明.md'),
);
log('Showcase:', out);
