// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { build, createServer } from 'vite';
import {
  contractWorkbenchPlugin,
  productionIsolationPlugin,
} from '../../scripts/contract-workbench';
import { validatePublishedAssets } from '../../scripts/validate-published-assets';
import { draftAsset } from './fixtures/v2-dataset';

describe('真实 Vite 开发入口与生产隔离', () => {
  it('开发服务器按需提供独立工作台 HTML', async () => {
    const server = await createServer({
      configFile: false,
      plugins: [contractWorkbenchPlugin()],
      // This server only tests HTML middleware. Do not overwrite the real
      // application's dependency cache while another dev server is running.
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: '127.0.0.1', port: 0 },
      logLevel: 'silent',
    });
    try {
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string')
        throw new Error('测试服务器未取得地址');
      const response = await fetch(
        `http://127.0.0.1:${address.port}/__dev/contracts`,
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('/src/tests/workbench/main.tsx');
    } finally {
      await server.close();
    }
  });
  it('生产构建实际引入 fixture 时失败，不依赖页面标记', async () => {
    await expect(
      build({
        configFile: false,
        plugins: [productionIsolationPlugin()],
        logLevel: 'silent',
        build: {
          write: false,
          lib: {
            entry: fileURLToPath(
              new URL('./fixtures/v2-dataset.ts', import.meta.url),
            ),
            formats: ['es'],
          },
        },
      }),
    ).rejects.toThrow('生产构建包含隔离测试模块');
  }, 15000);
  it('构建门禁检查公开素材实际文件，缺失不能仅凭 ID 或权利字段通过', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'longmarch-c0-assets-'));
    if (
      !resolve(directory).startsWith(resolve(tmpdir(), 'longmarch-c0-assets-'))
    ) {
      throw new Error('拒绝使用意外测试路径');
    }
    try {
      await mkdir(join(directory, 'assets'));
      const publicRoot = pathToFileURL(`${directory}/`);
      const asset = draftAsset();
      await expect(
        validatePublishedAssets(publicRoot, [asset]),
      ).rejects.toThrow('正式素材文件缺失或越界');
      await writeFile(
        join(directory, 'assets', 'fixture-no-file.svg'),
        '<svg/>',
      );
      await expect(
        validatePublishedAssets(publicRoot, [asset]),
      ).resolves.toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
