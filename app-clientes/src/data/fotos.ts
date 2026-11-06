/**
 * Fotografias geradas com Higgsfield (Soul 2.0), com modelos fictícias (brancas, negras e morenas) de vários tipos de cabelo, na identidade Meu Liso (fundos claros).
 * Cada foto tem uma função definida. O app usa a cópia otimizada em /img
 * (gerada por scripts/baixar-fotos.py) e, se ela ainda não existir, a versão hospedada.
 */
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HpOV5jOkbWRquIienhqikDNOTv/'

export const FOTOS = {
  splash: { arquivo: 'splash', remoto: 'hf_20261101_161234_eb223e8f-123b-4490-8e68-ac9d4a49e4da', alt: 'Mulher sorrindo com cabelo longo, liso e brilhante em fundo claro' },
  espelho: { arquivo: 'espelho', remoto: 'hf_20261101_161235_41d1d954-9096-4e14-8c6e-7c84386416c8', alt: 'Mulher de cabelo ondulado sorrindo no espelho de casa' },
  crespo: { arquivo: 'crespo', remoto: 'hf_20261101_161420_d47c2cb5-6225-4cae-aee7-cfb0f0e80001', alt: 'Mulher negra com cabelo crespo volumoso e definido' },
  fios: { arquivo: 'fios', remoto: 'hf_20261101_160317_75a16eac-477d-47f8-8ac7-f184abdf6dcc', alt: 'Detalhe de fios brilhantes com luz dourada' },
  salao: { arquivo: 'salao', remoto: 'hf_20261101_160317_4991db6e-68c8-4755-83d2-0fcad9f658a6', alt: 'Bancada com pente, toalha e produtos de cuidado capilar' },
  retrato: { arquivo: 'retrato', remoto: 'hf_20261101_161419_5b965c6d-90a3-4456-b048-80cea5a54f1b', alt: 'Retrato de mulher morena com cabelo liso em fundo bege' },
  produtos: { arquivo: 'produtos', remoto: 'hf_20261101_160315_8e847218-1a18-4161-92ab-e59e5a3ee39e', alt: 'Frascos de cuidado capilar sem rótulo em tons claros' },
  costas: { arquivo: 'costas', remoto: 'hf_20261101_161235_7d3b31f2-2383-4712-90d3-871d0119a2fb', alt: 'Cabelo longo e liso visto de costas' },
  amigas: { arquivo: 'amigas', remoto: 'hf_20261101_161419_96b2f616-9e85-4773-89b8-0ed5cf1ce548', alt: 'Duas amigas, uma loira de cabelo liso e outra negra de cabelo cacheado, rindo em casa' },
  escova: { arquivo: 'escova', remoto: 'hf_20261101_161653_114a6bb4-8668-4191-83c6-fd9a4b57e12c', alt: 'Mulher penteando o condicionador nos fios com pente de dentes largos' },
  madura: { arquivo: 'madura', remoto: 'hf_20261101_161234_7e2913dc-9395-455b-a885-0dd1d510b36e', alt: 'Mulher de 50 anos com cabelo liso e fios brancos sorrindo' },
  cachos: { arquivo: 'cachos', remoto: 'hf_20261101_161420_7ac022f1-adde-4c6c-b3b0-e7cb8d502fe5', alt: 'Mulher morena com cabelo cacheado sorrindo' },
} as const

export type ChaveFoto = keyof typeof FOTOS

export const urlLocal = (k: ChaveFoto) => `${import.meta.env.BASE_URL}img/${FOTOS[k].arquivo}.webp`
export const urlRemota = (k: ChaveFoto) => `${CDN}${FOTOS[k].remoto}_min.webp`
export const urlOriginal = (k: ChaveFoto) => `${CDN}${FOTOS[k].remoto}.png`

/** Folha de ícones 3D (Higgsfield, paleta champagne) recortada em public/img/icones/ por scripts/recortar-icones.py */
export const FOLHAS_ICONES = {
  c: { folha: 'c', remoto: 'hf_20261101_162613_981221cf-0f12-4831-9afd-2c49b07f6c57' },
}
