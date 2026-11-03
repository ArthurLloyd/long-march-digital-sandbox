import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  getPublishedDatasetV2,
  validateDataset,
} from '../src/shared/utils/validate-dataset.ts';
import { normalizeDataset } from '../src/shared/contracts/dataset.ts';
import { validatePublishedAssets } from './validate-published-assets.ts';
import { eventMapInput } from '../src/app/history/event-map/event-map-loader.ts';
import { validateEventMapResources } from '../src/app/history/event-map/event-map-schema.ts';

const root = new URL('../src/data/verified/', import.meta.url);
async function collect(directory: URL): Promise<unknown[]> {
  const results: unknown[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(
      encodeURIComponent(entry.name) + (entry.isDirectory() ? '/' : ''),
      directory,
    );
    if (entry.isDirectory()) results.push(...(await collect(url)));
    else if (entry.name.endsWith('.json')) {
      const data: unknown = JSON.parse(await readFile(url, 'utf8'));
      validateDataset(data);
      results.push(data);
    }
  }
  return results;
}

try {
  const files = await collect(root);
  if (files.length !== 1)
    throw new Error(
      '当前契约只允许 dataset.json 一个正式数据入口；扩展前须由 C 同步运行时加载器与校验脚本。',
    );
  const data = normalizeDataset(validateDataset(files[0]));
  const spatial = validateEventMapResources(
    eventMapInput.positions,
    eventMapInput.references,
    data,
  );
  console.log(
    `展陈位置结构校验通过：${spatial.positions.placements.length} 个位置实例，${spatial.positions.nodes.length} 个地点节点；不等于史实审核。`,
  );
  await validatePublishedAssets(
    new URL('../public/', import.meta.url),
    getPublishedDatasetV2(files[0]).assets,
  );
  console.log(
    `历史数据校验通过：${data.events.length} 个事件，${data.routes.length} 条路线，${data.sources.length} 条来源。`,
  );
  console.log(
    `数据目录：${fileURLToPath(root)}；空数据集有效，不代表已完成史实审核。`,
  );
  console.log(
    `v2 扩展：${data.topics.length} 个专题，${data.phases.length} 个阶段，${data.experiences.length} 个体验，${data.assets.length} 个素材。`,
  );
} catch (error) {
  console.error(
    '历史数据校验失败：',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
