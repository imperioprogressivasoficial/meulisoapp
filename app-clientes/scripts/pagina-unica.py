#!/usr/bin/env python3
"""Embute o JS, o CSS e as fontes do build de publicação no index.html.

Uso: npx vite build -c vite.publicar.config.ts && python3 scripts/pagina-unica.py
Resultado: dist-publicar/index.html (autossuficiente) + dist-publicar/img/ (fotos).
"""
import base64, re
from pathlib import Path

d = Path(__file__).resolve().parent.parent / 'dist-publicar'
html = (d / 'index.html').read_text(encoding='utf-8')
MIME = {'.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp'}

def css_inline(css: str, base: Path) -> str:
    def troca(m):
        url = m.group(1).strip('\'"')
        if url.startswith('data:') or url.startswith('http'):
            return m.group(0)
        f = (base / url).resolve()
        if not f.exists():
            return m.group(0)
        return f"url(data:{MIME.get(f.suffix, 'application/octet-stream')};base64,{base64.b64encode(f.read_bytes()).decode()})"
    return re.sub(r'url\(([^)]+)\)', troca, css)

def estilo(m):
    f = d / m.group(1).lstrip('./')
    return '<style>' + css_inline(f.read_text(encoding='utf-8'), f.parent) + '</style>'

def script(m):
    js = (d / m.group(1).lstrip('./')).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script type="module">' + js + '</script>'

html = re.sub(r'<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', estilo, html)
html = re.sub(r'<script type="module"[^>]*src="([^"]+)"[^>]*></script>', script, html)
html = re.sub(r'<link rel="manifest"[^>]*>', '', html)
(d / 'index.html').write_text(html, encoding='utf-8')
print('ok', round(len(html) / 1e6, 2), 'MB')
