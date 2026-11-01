"""Rebuild modern terrain assets. Requires Pillow; no historical routes generated.

python3 prepare-terrain.py --cache /path/to/terrain-cache --out /tmp/rebuilt
Uses cached originals if present. Live OSM data may change; provenance records hashes.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import math
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--acquired-at", default=date.today().isoformat())
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)

    def read(url, name):
        path = args.cache / name
        if not path.exists():
            request = urllib.request.Request(url, headers={"User-Agent": "LongMarchTerrainStudy/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                path.write_bytes(response.read())
        return path.read_bytes()

    bounds, zoom, size = [101.96, 29.72, 102.40, 30.12], 11, 321
    n = 2**zoom
    px = lambda lon: (lon + 180) / 360 * n * 256
    py = lambda lat: (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * 256
    x0, x1, y0, y1 = px(bounds[0]), px(bounds[2]), py(bounds[3]), py(bounds[1])
    coords = [(x, y) for y in range(int(y0 // 256), int(y1 // 256) + 1)
              for x in range(int(x0 // 256), int(x1 // 256) + 1)]

    def tile(xy):
        x, y = xy
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{x}/{y}.png"
        raw = read(url, f"{zoom}-{x}-{y}.png")
        return xy, Image.open(io.BytesIO(raw)).convert("RGB"), {
            "url": url, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}

    tiles, sources = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for xy, image, source in pool.map(tile, coords):
            tiles[xy] = image
            sources.append(source)

    def elevation(x, y):
        ix, iy = int(x), int(y)
        r, g, b = tiles[ix // 256, iy // 256].getpixel((ix % 256, iy % 256))
        return r * 256 + g + b / 256 - 32768

    heights = []
    for j in range(size):
        for i in range(size):
            x, y = x0 + (x1 - x0) * i / (size - 1), y0 + (y1 - y0) * j / (size - 1)
            dx, dy = x % 1, y % 1
            heights.append(round(elevation(x, y) * (1 - dx) * (1 - dy)
                                 + elevation(x + 1, y) * dx * (1 - dy)
                                 + elevation(x, y + 1) * (1 - dx) * dy
                                 + elevation(x + 1, y + 1) * dx * dy))
    meta = {
        "id": "dadu-valley-modern-dem", "bounds": bounds, "size": size,
        "min": min(heights), "max": max(heights), "projection": "EPSG:3857",
        "heightUnits": "metres", "verticalExaggeration": 2.0,
        "source": "Mapzen / AWS Terrain Tiles; global SRTM/GMTED2010 courtesy of USGS",
        "sourceUrl": "https://registry.opendata.aws/terrain-tiles/",
        "acquiredAt": args.acquired_at, "tiles": sources,
        "processing": "Terrarium decoded, bilinear sampled on uniform Web Mercator grid, rounded to metre. No invented landforms. Modern reference, not 1935 reconstruction.",
    }
    def write(name, data):
        (args.out / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    write("heightfield.json", {"meta": meta, "heights": heights})
    write("provenance.json", meta)

    nodes, ways, river_sources = {}, {}, []
    for index, (south, north) in enumerate([(29.72, 29.82), (29.82, 29.92), (29.92, 30.02), (30.02, 30.12)]):
        url = f"https://api.openstreetmap.org/api/0.6/map?bbox=102.20,{south:.2f},102.26,{north:.2f}"
        raw = read(url, f"osm-{index}.xml")
        root = ET.fromstring(raw)
        river_sources.append({"url": url, "sha256": hashlib.sha256(raw).hexdigest()})
        for node in root.findall("node"):
            nodes[int(node.attrib["id"])] = [float(node.attrib["lon"]), float(node.attrib["lat"])]
        for way in root.findall("way"):
            tags = {t.attrib["k"]: t.attrib["v"] for t in way.findall("tag")}
            if tags.get("waterway") == "river":
                ways[int(way.attrib["id"])] = (tags.get("name", ""), [int(v.attrib["ref"]) for v in way.findall("nd")])
    result = []
    for way_id, (name, refs) in ways.items():
        if not all(ref in nodes for ref in refs):
            raise ValueError(f"Incomplete way {way_id}; do not invent missing geometry")
        result.append({"id": way_id, "name": name, "coordinates": [nodes[ref] for ref in refs]})
    write("rivers.json", {
        "source": "OpenStreetMap contributors", "license": "ODbL-1.0",
        "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
        "acquiredAt": args.acquired_at,
        "coverage": "Queried 102.20–102.26 E, 29.72–30.12 N; complete returned river ways retained. Not comprehensive hydrology.",
        "sources": river_sources, "ways": result,
    })
    print(f"Built {size}x{size} heights and {len(result)} river ways; review provenance before replacing assets.")


if __name__ == "__main__":
    main()
