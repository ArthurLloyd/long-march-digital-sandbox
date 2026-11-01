// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('现代地理源文件与哈希', () => {
  it('八个高程细节与独立 OSM 水系均匹配采集清单，不含历史审核字段', async () => {
    const base = new URL('../app/panorama/data/details/', import.meta.url);
    const provenance = JSON.parse(
      await readFile(new URL('provenance.json', base), 'utf8'),
    );
    expect(provenance.sources).toHaveLength(72);
    expect(provenance.outputs).toHaveLength(9);
    for (const output of provenance.outputs as {
      file: string;
      sha256: string;
    }[]) {
      const data = await readFile(new URL(output.file, base));
      expect(createHash('sha256').update(data).digest('hex')).toBe(
        output.sha256,
      );
      const parsed = JSON.parse(data.toString());
      expect(parsed).not.toHaveProperty('reviews');
      expect(parsed).not.toHaveProperty('events');
      if ('heights' in parsed)
        expect(parsed.heights).toHaveLength(parsed.cols * parsed.rows);
    }
    const water = JSON.parse(
      await readFile(new URL('modern-water.json', base), 'utf8'),
    );
    expect(water.license).toBe('ODbL-1.0');
    expect(water.regions).toHaveLength(2);
    expect(
      water.regions.reduce(
        (sum: number, region: { lines: unknown[] }) =>
          sum + region.lines.length,
        0,
      ),
    ).toBe(49);
  });
  it('通用岩石素材保留独立 CC0 来源、像素来源哈希及最终文件哈希', async () => {
    const base = new URL('../app/panorama/assets/rock/', import.meta.url);
    const provenance = JSON.parse(
      await readFile(new URL('provenance.json', base), 'utf8'),
    );
    expect(provenance.license).toBe('CC0-1.0');
    expect(provenance.origin).toBe('https://polyhaven.com/a/rock_boulder_dry');
    expect(provenance.files).toHaveLength(2);
    for (const file of provenance.files as {
      file: string;
      sha256: string;
      sourceSha256: string;
      sourceMd5: string;
      bytes: number;
    }[]) {
      const bytes = await readFile(new URL(file.file, base));
      expect(bytes.length).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        file.sha256,
      );
      expect(file.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(file.sourceMd5).toMatch(/^[a-f0-9]{32}$/);
    }
  });
});
