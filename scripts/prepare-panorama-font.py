"""Extend the existing OFL subset for modern geographic-view lettering."""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True)
parser.add_argument('--assets',type=Path,required=True)
args=parser.parse_args()
source=args.source.read_bytes()
if hashlib.sha256(source).hexdigest()!='644e0cae9b40f0b10ab729a01bd32032e3973bac22be3dccae01bf6ae7fde969':
    raise ValueError('Unexpected original OFL font; stop before modifying the subset')
target=args.assets/'panorama-cinematic.woff2'
previous=TTFont(target)
unicodes=set(previous.getBestCmap())
previous.close()
text='赣南丘陵黔北山地赤水河谷金沙江流域大渡川西高原陕甘雄浑层峦磅礴现代地理山河之间'
unicodes.update(map(ord,text))
font=TTFont(args.source)
options=subset.Options()
worker=subset.Subsetter(options=options)
worker.populate(unicodes=unicodes)
worker.subset(font)
font.flavor='woff2'
font.save(target)
font.close()
provenance_path=args.assets/'font-provenance.json'
provenance=json.loads(provenance_path.read_text(encoding='utf-8-sig'))
data=target.read_bytes()
provenance['purpose']='C-owned exhibition cinematic event and contemporary geographic-view titles'
provenance['subset'].update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),processing='Existing FontTools; previous title glyphs retained and modern geographic-view lettering added; WOFF2, no outline modification.')
provenance_path.write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(provenance['subset'],ensure_ascii=False))
