import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { Plugin, ResolvedConfig } from 'vite';
import {
  normalizeDataset,
  type HistoryDatasetV2,
} from '../src/shared/contracts';
import { validateDataset } from '../src/shared/utils/validate-dataset';
import { createReleaseSnapshot } from '../src/shared/utils/release-snapshot';
import { validatePublishedAssets } from './validate-published-assets';

const moduleId = 'virtual:history-release';
const resolvedModule = `\0${moduleId}`;
const publishedModule = '\0virtual:history-published';
export const SHELL_FILES = [
  'assets/fonts/zhi-mang-xing-display.woff2',
  'licenses/Zhi-Mang-Xing-OFL.txt',
  'licenses/title-calligraphy-SOURCE.txt',
  'licenses/OFL-1.1.txt',
] as const;

export function releaseAssetFiles(published: HistoryDatasetV2) {
  return [
    ...new Set<string>([
      ...SHELL_FILES,
      ...published.assets.map((a) => a.filePath.slice(1)),
    ]),
  ];
}
function sensitiveTokens(
  candidate: HistoryDatasetV2,
  published: HistoryDatasetV2,
) {
  const publishedRecords = new Set(
    Object.values(published)
      .filter(Array.isArray)
      .flat()
      .map((r) => JSON.stringify(r)),
  );
  const tokens = new Set<string>();
  function inspect(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, field] of Object.entries(value)) {
      if (
        typeof field === 'string' &&
        (([
          'text',
          'detail',
          'summary',
          'prompt',
          'explanation',
          'feedback',
        ].includes(key) &&
          field.length > 24) ||
          ['materialId', 'filePath'].includes(key))
      )
        tokens.add(field);
      else inspect(field);
    }
  }
  for (const records of Object.values(candidate).filter(Array.isArray)) {
    for (const record of records)
      if (!publishedRecords.has(JSON.stringify(record))) inspect(record);
  }
  // A shared value present in a genuinely published record is permitted.
  const publicText = JSON.stringify(published);
  return [...tokens].filter(
    (token) => !publicText.includes(JSON.stringify(token).slice(1, -1)),
  );
}
export function assertReleaseFiles(
  files: ReadonlyMap<string, Uint8Array | string>,
  candidate: HistoryDatasetV2,
  published: HistoryDatasetV2,
  blockedHashes: ReadonlySet<string> = new Set(),
) {
  const allowed = new Set(releaseAssetFiles(published));
  const tokens = sensitiveTokens(candidate, published);
  for (const [rawName, bytes] of files) {
    if (blockedHashes.has(createHash('sha256').update(bytes).digest('hex')))
      throw new Error(`生产包含未发布资源字节：${rawName}`);
    const name = rawName.replaceAll('\\', '/');
    if (
      /^(?:src\/|__dev\/)|(?:^|\/)(?:fixtures|workbench)\//.test(name) ||
      (/^assets\/(?:archive|terrain|textures)\//.test(name) &&
        !allowed.has(name))
    )
      throw new Error(`生产包含未获发布许可的文件：${name}`);
    if (!/\.(?:js|json|html|map|txt|css)$/.test(name)) continue;
    const text =
      typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes);
    const decoded = text.replace(/\\u([\da-f]{4})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    for (const token of tokens) {
      if (
        decoded.includes(token) ||
        decoded.includes(JSON.stringify(token).slice(1, -1))
      )
        throw new Error(`生产包含候选内容：${name}`);
    }
    if (
      /simulation-only-[ab]|fixture-material-|自动测试内存结构|\/src\/(?:tests|data\/fixtures|features\/history\/review)\//.test(
        decoded,
      )
    )
      throw new Error(`生产包含开发或模拟审核内容：${name}`);
  }
}
async function readAllowedFile(publicRoot: string, name: string) {
  const root = await realpath(publicRoot);
  const file = await realpath(resolve(root, name));
  const path = relative(root, file);
  if (
    isAbsolute(path) ||
    path === '..' ||
    path.startsWith(`..\\`) ||
    path.startsWith('../')
  )
    throw new Error(`发布素材越界：${name}`);
  return readFile(file);
}
async function readOutput(
  directory: string,
  prefix = '',
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      for (const item of await readOutput(
        resolve(directory, entry.name),
        `${name}/`,
      ))
        files.set(...item);
    } else files.set(name, await readFile(resolve(directory, entry.name)));
  }
  return files;
}

/** Source records stay untouched. Only a derived, deny-preserving view reaches App. */
export function historyReleasePlugin(): Plugin {
  let config: ResolvedConfig;
  let candidate: HistoryDatasetV2;
  let snapshot: ReturnType<typeof createReleaseSnapshot>;
  let sourcePath: string;
  let blockedHashes = new Set<string>();
  async function loadSource() {
    candidate = normalizeDataset(
      validateDataset(JSON.parse(await readFile(sourcePath, 'utf8'))),
    );
    snapshot = createReleaseSnapshot(candidate);
    return snapshot;
  }
  return {
    name: 'history-release-boundary',
    enforce: 'pre',
    config(_config, env) {
      return env.command === 'build' ? { publicDir: false } : undefined;
    },
    configResolved(value) {
      config = value;
      sourcePath = resolve(config.root, 'src/data/verified/dataset.json');
    },
    async resolveId(source, importer) {
      if (source === moduleId) return resolvedModule;
      if (config.command === 'build' && source.endsWith('dataset.json')) {
        const target = await this.resolve(source, importer, { skipSelf: true });
        if (
          target &&
          target.id.split('?')[0] === sourcePath.replaceAll('\\', '/')
        )
          return publishedModule;
      }
    },
    async load(id) {
      if (![resolvedModule, publishedModule].includes(id)) return;
      this.addWatchFile(sourcePath);
      const data = await loadSource();
      return `export default ${JSON.stringify(id === resolvedModule ? data : data.dataset)};`;
    },
    async buildStart() {
      await loadSource();
      if (config.command === 'build') {
        await validatePublishedAssets(
          pathToFileURL(`${resolve(config.root, 'public')}/`),
          snapshot.dataset.assets,
        );
        const allowed = new Set(releaseAssetFiles(snapshot.dataset));
        const approvedHashes = new Set<string>();
        blockedHashes = new Set();
        for (const [name, bytes] of await readOutput(
          resolve(config.root, 'public'),
        )) {
          const hash = createHash('sha256').update(bytes).digest('hex');
          (allowed.has(name) ? approvedHashes : blockedHashes).add(hash);
        }
        for (const hash of approvedHashes) blockedHashes.delete(hash);
      }
    },
    async generateBundle(_options, bundle) {
      if (config.command !== 'build') return;
      for (const name of releaseAssetFiles(snapshot.dataset))
        this.emitFile({
          type: 'asset',
          fileName: name,
          source: await readAllowedFile(resolve(config.root, 'public'), name),
        });
      const files = new Map<string, string | Uint8Array>();
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          if (
            Object.keys(output.modules).some(
              (id) => id.split('?')[0] === sourcePath.replaceAll('\\', '/'),
            )
          )
            throw new Error('生产禁止导入原始候选 JSON');
          files.set(output.fileName, output.code);
        } else {
          for (const original of output.originalFileNames) {
            const path = relative(
              resolve(config.root, 'public'),
              resolve(config.root, original),
            ).replaceAll('\\', '/');
            if (
              !path.startsWith('../') &&
              !isAbsolute(path) &&
              !releaseAssetFiles(snapshot.dataset).includes(path)
            )
              throw new Error(`生产导入未许可 public 素材：${output.fileName}`);
          }
          files.set(output.fileName, output.source);
        }
      }
      assertReleaseFiles(files, candidate, snapshot.dataset, blockedHashes);
    },
    async closeBundle() {
      if (config.command === 'build' && config.build.write)
        assertReleaseFiles(
          await readOutput(resolve(config.root, config.build.outDir)),
          candidate,
          snapshot.dataset,
          blockedHashes,
        );
    },
    transformIndexHtml(html, context) {
      if (
        config.command === 'serve' &&
        context.path === '/src/features/history/review/index.html'
      )
        return {
          html,
          tags: [
            {
              tag: 'p',
              attrs: { role: 'note' },
              children: '历史候选资料，尚未完成人工复核。',
              injectTo: 'body-prepend',
            },
          ],
        };
      return html;
    },
    async configurePreviewServer(server) {
      const allowed = new Set(releaseAssetFiles((await loadSource()).dataset));
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (
          path.startsWith('/__dev/') ||
          path.startsWith('/src/') ||
          (/^\/assets\/(?:archive|terrain|textures)\//.test(path) &&
            !allowed.has(path.slice(1)))
        ) {
          response.statusCode = 404;
          response.end('Not found');
          return;
        }
        next();
      });
    },
  };
}
