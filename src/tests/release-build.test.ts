// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { build, preview } from 'vite';
import { fileURLToPath } from 'node:url';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import {
  historyReleasePlugin,
  assertReleaseFiles,
  SHELL_FILES,
} from '../../scripts/history-release';
import raw from '../data/verified/dataset.json';
import { createReleaseSnapshot } from '../shared/utils/release-snapshot';
import { normalizeDataset } from '../shared/contracts';
import { validateDataset } from '../shared/utils/validate-dataset';
import { simulatePublishedSample } from './fixtures/c1-sample';
import { draftAsset } from './fixtures/v2-dataset';

async function filesIn(
  directory: string,
  prefix = '',
): Promise<Map<string, Uint8Array>> {
  const result = new Map<string, Uint8Array>();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory())
      for (const item of await filesIn(
        join(directory, entry.name),
        `${prefix}${entry.name}/`,
      ))
        result.set(...item);
    else
      result.set(
        prefix + entry.name,
        await readFile(join(directory, entry.name)),
      );
  }
  return result;
}
async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), 'longmarch-c3-release-'));
  if (
    !resolve(directory).startsWith(resolve(tmpdir(), 'longmarch-c3-release-'))
  )
    throw new Error('测试路径越界');
  return directory;
}
describe('实际产物的数据与资源发布边界', () => {
  it('完整 App 构建的 dist 不携带候选、图片、工作台或模拟审核', async () => {
    const directory = await temporary();
    try {
      const outDir = join(directory, 'dist');
      await build({
        root: fileURLToPath(new URL('../../', import.meta.url)),
        logLevel: 'silent',
        build: { outDir, emptyOutDir: true },
      });
      const files = await filesIn(outDir);
      expect(files.has('index.html')).toBe(true);
      expect(files.has('assets/fonts/zhi-mang-xing-display.woff2')).toBe(true);
      expect(
        [...files.keys()].some(
          (n) =>
            n.includes('/archive/') ||
            n.includes('/textures/') ||
            n.includes('/terrain/') ||
            n.includes('/review/'),
        ),
      ).toBe(false);
      const snapshot = createReleaseSnapshot(raw);
      expect(() =>
        assertReleaseFiles(
          files,
          normalizeDataset(validateDataset(raw)),
          snapshot.dataset,
        ),
      ).not.toThrow();
      const js = [...files]
        .filter(([name]) => name.endsWith('.js'))
        .map(([, bytes]) => new TextDecoder().decode(bytes))
        .join('');
      expect(js).not.toContain('ld-hotspot-banks');
      expect(js).not.toContain('两份记载均将铁索');
      expect(js).not.toContain('simulation-only-a');
      expect(js).not.toContain('createCandidateReviewCatalog');
      expect(js.includes('preview-label')).toBe(false);
      const server = await preview({
        root: fileURLToPath(new URL('../../', import.meta.url)),
        logLevel: 'silent',
        build: { outDir },
        preview: { host: '127.0.0.1', port: 0, strictPort: true },
      });
      try {
        const address = server.httpServer.address();
        if (!address || typeof address === 'string')
          throw new Error('未取得预览地址');
        const base = `http://127.0.0.1:${address.port}`;
        const home = await fetch(base + '/');
        expect(home.status).toBe(200);
        expect(await home.text()).toContain('<div id="root">');
        for (const path of [
          '/__dev/contracts?flow=c3',
          '/src/features/history/review/index.html',
          '/assets/archive/portraits/zhou-photo.jpg',
        ]) {
          const response = await fetch(base + path);
          await response.text();
          expect(response.status, path).toBe(404);
        }
      } finally {
        await new Promise<void>((done) =>
          server.httpServer.close(() => done()),
        );
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
  it('实际写入候选脚本或未许可静态文件会使构建失败', async () => {
    const directory = await temporary();
    try {
      await expect(
        build({
          root: fileURLToPath(new URL('../../', import.meta.url)),
          logLevel: 'silent',
          plugins: [
            {
              name: 'deliberate-candidate-leak',
              generateBundle() {
                this.emitFile({
                  type: 'asset',
                  fileName: 'leaked.js',
                  source: 'console.log("ld-hotspot-banks")',
                });
              },
            },
          ],
          build: { outDir: join(directory, 'dist'), emptyOutDir: true },
        }),
      ).rejects.toThrow('生产包含候选内容');
      const snapshot = createReleaseSnapshot(raw);
      expect(() =>
        assertReleaseFiles(
          new Map([
            ['assets/archive/portraits/zhou-photo.jpg', new Uint8Array()],
          ]),
          normalizeDataset(validateDataset(raw)),
          snapshot.dataset,
        ),
      ).toThrow('未获发布许可');
      const image = await readFile(
        fileURLToPath(
          new URL(
            '../../public/assets/archive/portraits/zhou-photo.jpg',
            import.meta.url,
          ),
        ),
      );
      await expect(
        build({
          root: fileURLToPath(new URL('../../', import.meta.url)),
          logLevel: 'silent',
          plugins: [
            {
              name: 'renamed-unpublished-image',
              generateBundle() {
                this.emitFile({
                  type: 'asset',
                  fileName: 'assets/renamed-image.jpg',
                  source: image,
                });
              },
            },
          ],
          build: { outDir: join(directory, 'renamed'), emptyOutDir: true },
        }),
      ).rejects.toThrow('生产包含未发布资源字节');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
  it('将来经发布过滤允许的素材可以进入实际输出，原始 JSON 导入也被过滤', async () => {
    const directory = await temporary();
    try {
      const data = simulatePublishedSample();
      const asset = {
        ...draftAsset(),
        ...data.events[0],
        assetId: 'fixture-asset',
        filePath: '/assets/archive/allowed.svg',
        rightsStatus: 'cleared',
      };
      // A synthetic graph in this temporary test project only. No real reviewer is represented.
      data.assets = [
        {
          ...draftAsset(),
          reviewStatus: 'reviewed',
          releaseStatus: 'published',
          reviewedBy: data.events[0]!.reviewedBy,
          reviewedAt: data.events[0]!.reviewedAt,
          reviews: data.events[0]!.reviews,
          rightsStatus: 'cleared',
          filePath: asset.filePath,
        },
      ];
      for (const [name, content] of [
        ['src/data/verified/dataset.json', JSON.stringify(data)],
        [
          'entry.js',
          'import d from "./src/data/verified/dataset.json"; export const count=d.assets.length;',
        ],
        [
          'public/assets/archive/allowed.svg',
          '<svg xmlns="http://www.w3.org/2000/svg"/>',
        ],
        ...SHELL_FILES.map((n) => [`public/${n}`, 'local test file']),
      ]) {
        const path = join(directory, name!);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content!);
      }
      await build({
        root: directory,
        configFile: false,
        plugins: [historyReleasePlugin()],
        logLevel: 'silent',
        build: {
          outDir: 'dist',
          lib: { entry: join(directory, 'entry.js'), formats: ['es'] },
        },
      });
      expect(
        await readFile(
          join(directory, 'dist/assets/archive/allowed.svg'),
          'utf8',
        ),
      ).toContain('<svg');
      expect(
        (await filesIn(join(directory, 'dist'))).has(
          'src/data/verified/dataset.json',
        ),
      ).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
});
