// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, createServer, preview } from 'vite';
import { describe, expect, it } from 'vitest';
import { panoramaWorkbenchPlugin } from '../../scripts/panorama-workbench';
import { productionIsolationPlugin } from '../../scripts/contract-workbench';

function address(server: {
  httpServer?: {
    address(): string | import('node:net').AddressInfo | null;
  } | null;
}) {
  const result = server.httpServer?.address();
  if (!result || typeof result === 'string')
    throw new Error('未取得隔离验证端口');
  return `http://127.0.0.1:${result.port}`;
}
describe('全景开发原型的实际入口与生产隔离', () => {
  it('生产构建同样拒绝单独引入原型 CSS 和题字素材链', async () => {
    await expect(
      build({
        configFile: false,
        plugins: [productionIsolationPlugin()],
        logLevel: 'silent',
        build: {
          write: false,
          cssCodeSplit: true,
          lib: {
            entry: fileURLToPath(
              new URL('../app/panorama/panorama.css', import.meta.url),
            ),
            formats: ['es'],
          },
        },
      }),
    ).rejects.toThrow('生产构建包含隔离测试模块');
  });
  it('真实开发服务提供全景 HTML，拒绝 POST，不缓存候选页面', async () => {
    const server = await createServer({
      configFile: false,
      plugins: [panoramaWorkbenchPlugin()],
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: '127.0.0.1', port: 0 },
      logLevel: 'silent',
    });
    try {
      await server.listen();
      const base = address(server);
      const response = await fetch(`${base}/__dev/panorama`);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toContain('/src/tests/panorama/main.tsx');
      expect(
        (await fetch(`${base}/__dev/panorama`, { method: 'POST' })).status,
      ).toBe(405);
    } finally {
      await server.close();
    }
  });
  it('通过开发原型兼容出口绕入地图内核仍被生产隔离', async () => {
    await expect(
      build({
        configFile: false,
        plugins: [productionIsolationPlugin()],
        logLevel: 'silent',
        build: {
          write: false,
          lib: {
            entry: fileURLToPath(
              new URL('../app/panorama/geography.ts', import.meta.url),
            ),
            formats: ['es'],
          },
        },
      }),
    ).rejects.toThrow('生产构建包含隔离测试模块');
  }, 15000);
  it('现代地理内核直接出口可以构建，且不放宽候选与 fixtures 隔离', async () => {
    const result = await build({
      configFile: false,
      plugins: [productionIsolationPlugin()],
      logLevel: 'silent',
      build: {
        write: false,
        lib: {
          entry: fileURLToPath(
            new URL('../app/landscape/geography.ts', import.meta.url),
          ),
          formats: ['es'],
        },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunks = outputs.flatMap((output) =>
      'output' in output
        ? output.output.filter((file) => file.type === 'chunk')
        : [],
    );
    expect(
      chunks.some(
        (chunk) =>
          chunk.exports.includes('projectGeo') &&
          chunk.exports.includes('geography'),
      ),
    ).toBe(true);
  }, 15000);
  it('真实生产预览首页正常、全景开发路由为 404', async () => {
    const directory = await mkdtemp(
      join(tmpdir(), 'longmarch-panorama-preview-'),
    );
    if (
      !resolve(directory).startsWith(
        resolve(tmpdir(), 'longmarch-panorama-preview-'),
      )
    )
      throw new Error('拒绝意外清理路径');
    let server: Awaited<ReturnType<typeof preview>> | undefined;
    try {
      await writeFile(
        join(directory, 'index.html'),
        '<!doctype html><html><head><title>验收外壳</title></head><body>正式外壳</body></html>',
      );
      await build({
        configFile: false,
        root: directory,
        logLevel: 'silent',
        build: { outDir: 'dist' },
      });
      server = await preview({
        configFile: false,
        root: directory,
        plugins: [panoramaWorkbenchPlugin()],
        preview: { host: '127.0.0.1', port: 0 },
      });
      const base = address(server);
      expect((await fetch(`${base}/`)).status).toBe(200);
      expect((await fetch(`${base}/__dev/panorama`)).status).toBe(404);
    } finally {
      if (server)
        await new Promise<void>((done, error) =>
          server!.httpServer.close((problem) =>
            problem ? error(problem) : done(),
          ),
        );
      await rm(directory, { recursive: true, force: true });
    }
  }, 15000);
});
