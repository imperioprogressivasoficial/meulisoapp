#!/usr/bin/env python3
"""Recorta as folhas de ícones 3D (public/img/icones/folhas/folha-*.png) em ícones
individuais com fundo transparente: public/img/icones/<nome>.webp (256 px)."""
from pathlib import Path
from collections import deque
from PIL import Image, ImageFilter

raiz = Path(__file__).resolve().parent.parent / 'public/img/icones'
FOLHAS = {
    'c': (4, ['cronograma', 'hidratacao', 'nutricao', 'reconstrucao', 'diagnostico', 'cabelo', 'galeria', 'sino',
              'prancha', 'escova', 'liso', 'tesoura', 'sempre-lisa', 'raiz', 'estrela', 'agendar']),
}

def sem_fundo(im: Image.Image) -> Image.Image:
    """Remove o branco ligado às bordas (flood fill), preservando brilhos brancos internos."""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    claro = lambda p: p[0] > 236 and p[1] > 236 and p[2] > 236
    fundo = [[False] * h for _ in range(w)]
    fila = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while fila:
        x, y = fila.popleft()
        if 0 <= x < w and 0 <= y < h and not fundo[x][y] and claro(px[x, y]):
            fundo[x][y] = True
            fila.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    alfa = Image.new('L', (w, h), 255); pa = alfa.load()
    for x in range(w):
        for y in range(h):
            if fundo[x][y]: pa[x, y] = 0
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alfa)
    return im

for letra, (n, nomes) in FOLHAS.items():
    folha = Image.open(raiz / 'folhas' / f'folha-{letra}.png').convert('RGB')
    W, H = folha.size; cw, ch = W / n, H / n
    for i, nome in enumerate(nomes):
        c, r = i % n, i // n
        cel = folha.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        ic = sem_fundo(cel)
        bb = ic.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
        if bb: ic = ic.crop(bb)
        lado = max(ic.size) + 16
        q = Image.new('RGBA', (lado, lado), (0, 0, 0, 0)); q.paste(ic, ((lado - ic.width) // 2, (lado - ic.height) // 2))
        q.resize((256, 256), Image.LANCZOS).save(raiz / f'{nome}.webp', 'WEBP', quality=90, method=6)
        print('ok', nome)
