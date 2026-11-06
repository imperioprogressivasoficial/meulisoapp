# Meu Liso

App de cuidado com o cabelo para todos os tipos de fio (liso, ondulado, cacheado e crespo), by Império Progressivas.

- **Cronograma capilar** de 4 semanas, montado a partir de um quiz.
- **Diário do cabelo**, **Evolução** em fotos e **Diagnóstico**.
- Instalável no celular (PWA). Dados na nuvem com Supabase quando configurado; sem Supabase, roda em modo demonstração.

O app fica em [`app-clientes/`](app-clientes/). Veja o [README do app](app-clientes/README.md) para rodar, testar e configurar (Supabase, login com Google e Apple).

## Publicação (VPS)

`app-clientes/deploy/vps/docker-compose.yml` compila o site direto deste repositório e o serve em https://meuliso.n8nimperio.tech (Docker + Traefik, HTTPS automático).

## Segurança

Este repositório é público e não contém senhas nem chaves. Chaves do Supabase e de provedores ficam fora do código (veja `app-clientes/.env.example`).
