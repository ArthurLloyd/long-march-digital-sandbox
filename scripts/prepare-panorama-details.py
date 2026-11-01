"""Modern regional terrain for view-dependent detail. No historical locations/routes."""
import argparse
import concurrent.futures
import hashlib
import io
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from PIL import Image

CENTERS = {'ruijin':(115.75,25.9),'zunyi':(106.7,27.6),'chishui':(106.15,27.95),'jinsha':(102.35,26.55),'luding':(102.2,29.9),'snow':(102.55,31.2),'grass':(102.9,33.3),'reunion':(106.5,36.2)}
Z, COLS, ROWS = 9, 385, 321


def xy(lon,lat):
    return ((lon+180)/360,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--acquired-at',required=True)
    args=parser.parse_args();args.cache.mkdir(parents=True,exist_ok=True);args.out.mkdir(parents=True,exist_ok=True)
    def download(url,name):
        path=args.cache/(hashlib.sha256(url.encode()).hexdigest()[:16]+'-'+name)
        if not path.exists():
            with urlopen(Request(url,headers={'User-Agent':'LongMarch-ModernTerrain-Preparation/1.0'}),timeout=60) as response: data=response.read()
            path.write_bytes(data)
        data=path.read_bytes()
        return data,{'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    windows={key:[lon-.9,lat-.7,lon+.9,lat+.7] for key,(lon,lat) in CENTERS.items()}
    required=set()
    for west,south,east,north in windows.values():
        a,b=xy(west,north);c,d=xy(east,south)
        required.update((x,y) for x in range(math.floor(a*2**Z),math.floor(c*2**Z)+1) for y in range(math.floor(b*2**Z),math.floor(d*2**Z)+1))
    def tile(coord):
        x,y=coord;url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
        payload,record=download(url,f'{Z}-{x}-{y}.png')
        return coord,Image.open(io.BytesIO(payload)).convert('RGB'),record
    tiles={};sources=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for coord,image,record in pool.map(tile,sorted(required)):tiles[coord]=image;sources.append(record)
    def sample(x,y):
        image=tiles.get((x//256,y//256))
        if image is None: raise ValueError('Missing modern tile at sample boundary')
        r,g,b=image.getpixel((x%256,y%256));return r*256+g+b/256-32768
    outputs=[]
    for key,bounds in windows.items():
        west,south,east,north=bounds;a,b=xy(west,north);c,d=xy(east,south);heights=[]
        for row in range(ROWS):
            py=(b+(d-b)*row/(ROWS-1))*2**Z*256;iy=math.floor(py);dy=py%1
            for col in range(COLS):
                px=(a+(c-a)*col/(COLS-1))*2**Z*256;ix=math.floor(px);dx=px%1
                value=(sample(ix,iy)*(1-dx)+sample(ix+1,iy)*dx)*(1-dy)+(sample(ix,iy+1)*(1-dx)+sample(ix+1,iy+1)*dx)*dy
                heights.append(round(value))
        path=args.out/(key+'.json');payload=json.dumps({'kind':'modern-regional-terrain','id':key,'bounds':bounds,'projection':'EPSG:3857','cols':COLS,'rows':ROWS,'heightUnit':'metre','sourceZoom':Z,'heights':heights},separators=(',',':')).encode()+b'\n';path.write_bytes(payload)
        outputs.append({'file':path.name,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
    water=[]
    for key,name in [('chishui','赤水河'),('luding','大渡河')]:
        west,south,east,north=windows[key]
        query=f'[out:json][timeout:40];way["waterway"="river"]["name"="{name}"]({south},{west},{north},{east});out geom;'
        url='https://overpass-api.de/api/interpreter?'+urlencode({'data':query})
        try:
            payload,record=download(url,key+'-water.json');response=json.loads(payload)
        except Exception as error:
            print(f'Modern water {key}: unavailable ({error}); no invented fallback geometry.',flush=True);continue
        lines=[{'osmWayId':element['id'],'name':element.get('tags',{}).get('name',name),'coordinates':[[p['lon'],p['lat']] for p in element.get('geometry',[])]} for element in response.get('elements',[]) if len(element.get('geometry',[]))>1]
        water.append({'regionId':key,'lines':lines,'source':record})
    path=args.out/'modern-water.json';payload=json.dumps({'kind':'modern-water-reference','license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','regions':water},ensure_ascii=False,separators=(',',':')).encode()+b'\n';path.write_bytes(payload);outputs.append({'file':path.name,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()})
    provenance={'acquiredAt':args.acquired_at,'purpose':'Modern camera study regions, not event coordinates or historical routes','sourceZoom':Z,'grid':[COLS,ROWS],'terrainAttribution':'Mapzen / Tilezen Terrain Tiles; global USGS GMTED2010 / SRTM, NOAA ETOPO1','sources':sources,'waterSources':[region['source'] for region in water],'waterLicense':'ODbL 1.0; OpenStreetMap copyright https://www.openstreetmap.org/copyright','outputs':outputs,'processing':'Terrarium decode, bilinear sample, metre rounding. Modern water keeps returned original OSM vertices; no historical geometry inference. Runtime terrain material/smoothing/exaggeration are visual only.'}
    (args.out/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'tiles':len(tiles),'regions':len(windows),'waterRegions':len(water),'waterWays':sum(len(region['lines']) for region in water),'outputBytes':sum(item['bytes'] for item in outputs)}),flush=True)


if __name__=='__main__': main()
