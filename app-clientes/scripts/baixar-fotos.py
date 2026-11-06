#!/usr/bin/env python3
"""Baixa as fotos da Higgsfield e gera versões WebP otimizadas em public/img.

Uso: python3 scripts/baixar-fotos.py   (precisa de acesso a d8j0ntlcm91z4.cloudfront.net e Pillow)
"""
import io, re, sys, urllib.request
from pathlib import Path
from PIL import Image

raiz = Path(__file__).resolve().parent.parent
ts = (raiz / 'src/data/fotos.ts').read_text(encoding='utf-8')
cdn = re.search(r"const CDN = '([^']+)'", ts).group(1)
destino = raiz / 'public/img'
destino.mkdir(parents=True, exist_ok=True)

for arquivo, remoto in re.findall(r"arquivo: '([^']+)', remoto: '([^']+)'", ts):
    with urllib.request.urlopen(f"{cdn}{remoto}.png", timeout=60) as r:
        img = Image.open(io.BytesIO(r.read())).convert('RGB')
    img.thumbnail((1200, 1200))
    for largura, sufixo in ((1200, ''), (640, '-640')):
        copia = img.copy()
        copia.thumbnail((largura, largura))
        copia.save(destino / f"{arquivo}{sufixo}.webp", 'WEBP', quality=78, method=6)
    print('ok', arquivo)
print('Fotos salvas em', destino)

# folhas de ícones 3D: baixadas como PNG para recorte (scripts/recortar-icones.py)
pasta = destino / 'icones' / 'folhas'
pasta.mkdir(parents=True, exist_ok=True)
for folha, remoto in re.findall(r"folha: '([^']+)', remoto: '([^']+)'", ts):
    with urllib.request.urlopen(f"{cdn}{remoto}.png", timeout=60) as r:
        (pasta / f"folha-{folha}.png").write_bytes(r.read())
    print('ok folha', folha)
