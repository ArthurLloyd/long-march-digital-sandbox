"""Build a small modern geography reference; never generates historical routes.

Python 3 + existing Pillow. Network is used only during this explicit preparation.
Raw downloads stay in --cache; clipped output has URLs and SHA-256 provenance.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

BOUNDS = [96, 23, 118, 39]  # viewport coverage, not a historical boundary
ZOOM = 6
COLS, ROWS = 385, 321


def mercator(lon, lat):
    return ((lon + 180) / 360, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--acquired-at', required=True)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    provenance = []

    def download(url, name):
        path = args.cache / (hashlib.sha256(url.encode()).hexdigest()[:16] + '-' + name)
        if not path.exists():
            with urlopen(Request(url, headers={'User-Agent': 'LongMarch-Geography-Prototype/1.0'}), timeout=60) as response:
                payload = response.read()
            path.write_bytes(payload)
        payload = path.read_bytes()
        return payload, {'url': url, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}

    # Pin upstream vector contents to an actual commit, not a moving master URL.
    info, _ = download('https://api.github.com/repos/nvkelso/natural-earth-vector/commits/master', 'natural-earth-commit.json')
    revision = json.loads(info)['sha']
    vector_url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{revision}/geojson/ne_10m_rivers_lake_centerlines.geojson'
    raw, source = download(vector_url, 'rivers-source.geojson')
    provenance.append(source)
    rivers = []
    west, south, east, north = BOUNDS
    for feature in json.loads(raw)['features']:
        props, geometry = feature['properties'], feature['geometry']
        lines = [geometry['coordinates']] if geometry['type'] == 'LineString' else geometry['coordinates'] if geometry['type'] == 'MultiLineString' else []
        clipped = []
        for line in lines:
            current = []
            for point in line:
                if west <= point[0] <= east and south <= point[1] <= north:
                    current.append(point[:2])
                else:
                    if len(current) > 1:
                        clipped.append(current)
                    current = []
            if len(current) > 1:
                clipped.append(current)
        if clipped:
            rivers.append({'name': props.get('name_zh') or props.get('name_en') or props.get('name') or '未命名现代河段', 'sourceName': props.get('name'), 'coordinates': clipped})

    min_x, min_y = mercator(west, north)
    max_x, max_y = mercator(east, south)
    scale = 2 ** ZOOM
    coords = [(x, y) for x in range(math.floor(min_x * scale), math.floor(max_x * scale) + 1) for y in range(math.floor(min_y * scale), math.floor(max_y * scale) + 1)]

    def tile(coord):
        x, y = coord
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x}/{y}.png'
        payload, source = download(url, f'terrarium-{ZOOM}-{x}-{y}.png')
        return coord, Image.open(io.BytesIO(payload)).convert('RGB'), source

    tiles = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for coord, image, source in pool.map(tile, coords):
            tiles[coord] = image
            provenance.append(source)

    def sample(x, y):
        x = min(math.floor(max_x * scale * 256), max(math.floor(min_x * scale * 256), x))
        y = min(math.floor(max_y * scale * 256), max(math.floor(min_y * scale * 256), y))
        rgb = tiles[(x // 256, y // 256)].getpixel((x % 256, y % 256))
        return rgb[0] * 256 + rgb[1] + rgb[2] / 256 - 32768

    heights = []
    for row in range(ROWS):
        y = (min_y + (max_y - min_y) * row / (ROWS - 1)) * scale * 256
        for col in range(COLS):
            x = (min_x + (max_x - min_x) * col / (COLS - 1)) * scale * 256
            ix, iy, dx, dy = math.floor(x), math.floor(y), x % 1, y % 1
            height = (sample(ix, iy) * (1-dx) + sample(ix+1, iy) * dx) * (1-dy) + (sample(ix, iy+1) * (1-dx) + sample(ix+1, iy+1) * dx) * dy
            heights.append(round(height))
    output = {'kind': 'modern-geography-reference', 'bounds': BOUNDS, 'projection': 'EPSG:3857', 'inputCoordinates': 'WGS84 [longitude, latitude]', 'cols': COLS, 'rows': ROWS, 'heightUnit': 'metre', 'sourceZoom': ZOOM, 'verticalExaggeration': 12, 'heights': heights, 'rivers': rivers}
    (args.out / 'modern-geography.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    record = {'acquiredAt': args.acquired_at, 'bounds': BOUNDS, 'naturalEarthRevision': revision, 'terrainAttribution': 'Mapzen / Tilezen Terrain Tiles; global GMTED2010 / SRTM courtesy USGS; global ETOPO1 NOAA', 'riverLicense': 'Natural Earth public domain', 'processing': 'Terrarium z6, bilinear sample to 385x321, round metres. Rivers retain original vertices and consecutive in-bounds segments; no smoothing, inferred watercourses or historical routes.', 'limitations': 'Modern generalized geography. Approximately kilometre-scale terrain; vertical exaggeration 12x for continental-scale readability, not physical vertical scale. Not 1935 terrain or complete hydrology. No administrative or national boundaries.', 'sources': sorted(provenance, key=lambda item: item['url']), 'outputs': []}
    payload = (args.out / 'modern-geography.json').read_bytes()
    record['outputs'].append({'file': 'modern-geography.json', 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
    (args.out / 'provenance.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'tiles': len(tiles), 'grid': [COLS, ROWS], 'rivers': len(rivers), 'names': sorted(set(r['name'] for r in rivers)), 'range': [min(heights), max(heights)], 'bytes': len(payload)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
