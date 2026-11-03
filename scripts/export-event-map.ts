import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/shared/contracts';
import { validateDataset } from '../src/shared/utils/validate-dataset';
import { loadExhibitionEventMap } from '../src/app/history/event-map/event-map-loader';
import {
  eventLocationInventory,
  eventMapCoverage,
} from '../src/app/history/event-map/event-map-selectors';

/** Explicit export only; validates current resources and never writes the B dataset. */
const dataset = normalizeDataset(
  validateDataset(
    JSON.parse(
      await readFile(
        new URL('../src/data/verified/dataset.json', import.meta.url),
        'utf8',
      ),
    ),
  ),
);
const model = loadExhibitionEventMap(dataset, 'exhibition');
if (!model || model.error) throw new Error(model?.error ?? '展陈位置不可用');
const directory = new URL(
  '../docs/architecture/event-map-01/',
  import.meta.url,
);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL('location-nodes.json', directory),
  JSON.stringify(
    {
      schemaVersion: 1,
      version: model.resources.positions.version,
      coordinateSystem: 'WGS84',
      nodes: eventLocationInventory(model),
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  new URL('event-coverage.json', directory),
  JSON.stringify(
    {
      schemaVersion: 1,
      version: model.resources.positions.version,
      events: eventMapCoverage(dataset, model),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `已导出 ${dataset.events.length} 事件覆盖清单、${model.entries.length} 位置实例及 ${model.resources.positions.nodes.length} 地点节点；不生成连线。`,
);
