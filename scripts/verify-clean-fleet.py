"""XML integrity + real Chromium getBBox checks across navy, army, and air clean SVG views."""
from pathlib import Path
import json, re, subprocess, tempfile, xml.etree.ElementTree as E, html, sys

ROOT = Path(__file__).resolve().parents[1]
NS = '{http://www.w3.org/2000/svg}'
cat = json.loads((ROOT / 'metadata/catalog.json').read_text('utf8'))

if '--army' in sys.argv:
    assets = [a for a in cat['assets'] if a['equipmentId'].startswith('army:')]
elif '--air' in sys.argv:
    assets = [a for a in cat['assets'] if a['equipmentId'].startswith('air:')]
elif '--navy' in sys.argv:
    assets = [a for a in cat['assets'] if a['kind'] == 'clean-master' and a['equipmentId'].startswith('navy:')]
else:
    assets = [a for a in cat['assets'] if a['kind'] in ('clean-master', 'clean-variant')]
expected = len(assets)
assert expected >= 31, f"Unexpectedly few clean assets: {expected}"
inputs = []
for a in assets:
    s = (ROOT / a['sourcePath']).read_text('utf8')
    r = E.fromstring(s)
    assert r.get('data-clean-status') != 'draft', a['id']
    ids = [el.get('id') for el in r.iter() if el.get('id')]
    assert len(ids) == len(set(ids)), a['id']
    for ref in re.findall(r'url\(#([^)]*)\)', s):
        assert ref in ids, (a['id'], ref)
    for el in r.iter():
        assert el.tag not in [NS + t for t in ['script', 'foreignObject', 'image']], (a['id'], el.tag)
        for k, v in el.attrib.items():
            assert not k.lower().startswith('on'), a['id']
            if k.endswith('href'):
                assert v.startswith('#') and v[1:] in ids, (a['id'], v)
    views = [el for el in r.iter(NS + 'g') if el.get('id') in ['clean-side', 'clean-top']]
    assert sorted(el.get('id') for el in views) == ['clean-side', 'clean-top'], a['id']
    for view in views:
        assert not any(el is not view and el.get('id') in ['clean-side', 'clean-top'] for el in view.iter()), a['id']
    def check_view_ownership(el, in_view=False, in_defs=False):
        in_view = in_view or el.get('id') in ['clean-side', 'clean-top']
        in_defs = in_defs or el.tag == NS + 'defs'
        if el.tag in [NS + t for t in ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'use']]:
            assert in_view or in_defs, ('geometry outside two views', a['id'], el.tag)
        for child in el:
            check_view_ownership(child, in_view, in_defs)
    check_view_ownership(r)
    assert r.find(NS + 'rect') is None, a['id']
    inputs.append({'id': a['id'], 'number': a['sourcePath'].split('/')[2][:2], 'sha256': a['sha256'], 'svg': s})

script = '''const rows=INPUT; const result=[];
for(const row of rows){const doc=new DOMParser().parseFromString(row.svg,'image/svg+xml');const root=document.importNode(doc.documentElement,true);root.style.cssText='position:absolute;top:0;left:0;visibility:hidden';document.body.append(root);const box=root.getBBox();const vb=root.viewBox.baseVal;const groups=['clean-side','clean-top'].map(id=>{const b=root.querySelector('#'+id).getBBox();return [b.x,b.y,b.width,b.height]});result.push({id:row.id,number:row.number,sha256:row.sha256,bounds:groups,content:[box.x,box.y,box.width,box.height],viewBox:[vb.x,vb.y,vb.width,vb.height],inside:box.x>=-1&&box.y>=-1&&box.x+box.width<=vb.width+1&&box.y+box.height<=vb.height+1,nonempty:groups.every(b=>b[2]>0&&b[3]>0)});root.remove();}document.getElementById('result').textContent=JSON.stringify(result);'''.replace('INPUT', json.dumps(inputs, ensure_ascii=False).replace('</', '<\\/'))

with tempfile.TemporaryDirectory(prefix='clean-measure-') as tmp:
    p = Path(tmp) / 'check.html'
    p.write_text('<!doctype html><meta charset="utf-8"><body><pre id="result"></pre><script>' + script + '</script>', encoding='utf8')
    proc = subprocess.run([r'C:\Program Files\Google\Chrome\Application\chrome.exe', '--headless', '--disable-gpu', '--no-first-run', f'--user-data-dir={tmp}/profile', '--dump-dom', p.as_uri()], capture_output=True, timeout=90)
    assert proc.returncode == 0, proc.stderr[-1000:]
    match = re.search(r'<pre id="result">(.*?)</pre>', proc.stdout.decode('utf8'), re.S)
    assert match
    results = json.loads(html.unescape(match[1]))
    assert len(results) == expected
    assert all(r['inside'] and r['nonempty'] for r in results), [r for r in results if not r['inside'] or not r['nonempty']]

print(f'PASS: {expected} XML documents, unique IDs/local references, inert elements, {expected*2} nonempty views, all geometry inside viewBox.')
