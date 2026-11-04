"""Subset the OFL Ma Shan Zheng font to the actual epilogue copy."""
import hashlib
import json
import re
from pathlib import Path
from urllib.request import urlopen
from fontTools import subset

root=Path(__file__).resolve().parents[1]
cache=root/'artifacts/book-font';cache.mkdir(parents=True,exist_ok=True)
out=root/'src/app/exhibition/assets';out.mkdir(parents=True,exist_ok=True)
base='https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/'
source=cache/'MaShanZheng-Regular.ttf'
payload=source.read_bytes() if source.exists() else urlopen(base+'MaShanZheng-Regular.ttf',timeout=45).read()
license_path=out/'Ma-Shan-Zheng-OFL.txt'
license_text=license_path.read_bytes() if license_path.exists() else urlopen(base+'OFL.txt',timeout=45).read()
source.write_bytes(payload)
copy=(root/'src/app/exhibition/JourneyEpilogue.tsx').read_text(encoding='utf-8')+'关闭'
chars=''.join(sorted(set(re.findall(r'[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]',copy))))
options=subset.Options();options.flavor='woff2'
font=subset.load_font(str(source),options);s=subset.Subsetter(options=options);s.populate(text=chars);s.subset(font)
target=out/'book-calligraphy.woff2';subset.save_font(font,str(target),options)
(out/'Ma-Shan-Zheng-OFL.txt').write_text('\n'.join(line.rstrip() for line in license_text.decode().splitlines()).rstrip()+'\n',encoding='utf-8',newline='\n')
(out/'book-font-provenance.json').write_text(json.dumps({'font':'Ma Shan Zheng','source':base+'MaShanZheng-Regular.ttf','acquiredAt':'2026-11-04','license':'SIL OFL 1.1','licenseFile':'Ma-Shan-Zheng-OFL.txt','sourceSha256':hashlib.sha256(payload).hexdigest(),'subsetSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'characters':chars,'processing':'FontTools glyph subset to the actual epilogue and controls; original outlines unchanged.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'glyphs':len(chars),'bytes':target.stat().st_size}))
