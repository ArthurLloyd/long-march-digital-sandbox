import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssetReference } from '../src/shared/contracts/assets.ts';

/** Build-time existence check; runtime reference/rights checks remain in the shared validator. */
export async function validatePublishedAssets(
  publicRoot: URL,
  assets: readonly AssetReference[],
) {
  if (assets.length === 0) return;
  const resolvedRoot = await realpath(fileURLToPath(publicRoot));
  for (const asset of assets) {
    try {
      const file = await realpath(
        fileURLToPath(new URL(`.${asset.filePath}`, publicRoot)),
      );
      const inside = relative(resolvedRoot, file);
      if (
        isAbsolute(inside) ||
        inside === '..' ||
        inside.startsWith('../') ||
        inside.startsWith('..\\') ||
        !(await stat(file)).isFile()
      )
        throw new Error('不是 public 内的普通文件');
    } catch {
      throw new Error(
        `正式素材文件缺失或越界：${asset.assetId} (${asset.filePath})`,
      );
    }
  }
}
