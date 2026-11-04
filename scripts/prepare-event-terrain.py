"""Acquire bounded modern DEM windows for event reading, never military routes."""
import argparse
import concurrent.futures
import hashlib
import io
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

Z, COLS, ROWS = 10, 257, 225

def xy(lon, lat):
    return ((lon + 180) / 360, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--cache', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    args = p.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    base = Path(__file__).resolve().parents[1]
    data = json.loads((base / 'src/app/exhibition/data/exhibition-supplement.json').read_text(encoding='utf-8'))
    names = ['xiangjiang', 'liping', 'lazikou', 'hadapu', 'wuqi', 'ganquan', 'huining', 'yongping', 'ganzi', 'red25-departure']
    refs = {r['referenceId']: r for r in data['modernReferences']}
    windows = {}
    for name in names:
        lon, lat = refs['ex-loc-' + name]['coordinates']
        windows[name] = [lon - .48, lat - .40, lon + .48, lat + .40]
    windows['blockades'] = [112.45, 24.95, 114.15, 26.05]
    required = set()
    for west, south, east, north in windows.values():
        a, b = xy(west, north); c, d = xy(east, south)
        required.update((x, y) for x in range(math.floor(a*2**Z), math.floor(c*2**Z)+1) for y in range(math.floor(b*2**Z), math.floor(d*2**Z)+1))
    def tile(coord):
        x,y = coord
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
        path = args.cache / f'{Z}-{x}-{y}.png'
        if not path.exists():
            with urlopen(Request(url, headers={'User-Agent':'LongMarch-ModernTerrain/1.0'}),timeout=45) as response:
                path.write_bytes(response.read())
        payload = path.read_bytes()
        return coord, Image.open(io.BytesIO(payload)).convert('RGB'), {'url':url, 'bytes':len(payload), 'sha256':hashlib.sha256(payload).hexdigest()}
    tiles, sources = {}, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for coord, image, record in pool.map(tile, sorted(required)):
            tiles[coord] = image; sources.append(record)
    def sample(x,y):
        r,g,b = tiles[(x//256,y//256)].getpixel((x%256,y%256))
        return r*256+g+b/256-32768
    outputs=[]
    for key,bounds in windows.items():
        west,south,east,north=bounds; a,b=xy(west,north); c,d=xy(east,south)
        heights=[]
        for row in range(ROWS):
            py=(b+(d-b)*row/(ROWS-1))*2**Z*256; iy=math.floor(py); dy=py%1
            for col in range(COLS):
                px=(a+(c-a)*col/(COLS-1))*2**Z*256; ix=math.floor(px); dx=px%1
                h=(sample(ix,iy)*(1-dx)+sample(ix+1,iy)*dx)*(1-dy)+(sample(ix,iy+1)*(1-dx)+sample(ix+1,iy+1)*dx)*dy
                heights.append(round(h))
        payload=(json.dumps({'kind':'modern-regional-terrain','id':key,'bounds':bounds,'projection':'EPSG:3857','cols':COLS,'rows':ROWS,'heightUnit':'metre','sourceZoom':Z,'heights':heights},separators=(',',':'))+'\n').encode()
        (args.out/(key+'.json')).write_bytes(payload)
        outputs.append({'id':key,'bounds':bounds,'file':key+'.json','bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
    (args.out/'provenance.json').write_text(json.dumps({'acquiredAt':'2026-11-04','purpose':'Modern terrain display windows around sourced placename references; not historical boundaries or positions','sourceZoom':Z,'grid':[COLS,ROWS],'attribution':'Mapzen / Tilezen Terrain Tiles; USGS / SRTM / GMTED2010','sourceInfo':'https://registry.opendata.aws/terrain-tiles/','processing':'Terrarium decode; bilinear sample; metre rounding. Display exaggeration is separate.','sources':sources,'outputs':outputs},indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'tiles':len(tiles),'windows':len(outputs),'bytes':sum(r['bytes'] for r in outputs)}),flush=True)

if __name__ == '__main__': main()
