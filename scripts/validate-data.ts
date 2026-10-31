import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateDataset } from '../src/shared/utils/validate-dataset.ts';
import type { HistoryDataset } from '../src/shared/contracts/data.ts';

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
  const data = validateDataset(files[0]) as HistoryDataset;
  console.log(
    `历史数据校验通过：${data.events.length} 个事件，${data.routes.length} 条路线，${data.sources.length} 条来源。`,
  );
  console.log(
    `数据目录：${fileURLToPath(root)}；空数据集有效，不代表已完成史实审核。`,
  );
} catch (error) {
  console.error(
    '历史数据校验失败：',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
