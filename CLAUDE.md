# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static marketing site for **Neural Ops**, a Brazilian AI-infrastructure consultancy (Portuguese, pt-BR content). Plain HTML/CSS/JS — no framework, no bundler, no build step for the main site. Deployed on Vercel.

## Commands

There is no build/lint/test tooling in this repo (`package.json` only declares `engines.node`). To preview locally, serve the directory as static files, e.g.:

```bash
python3 -m http.server 3051
```

(matches the `.claude/launch.json` config). Just open the relevant `.html` file path in the browser — no compilation needed for changes to `index.html`, `cases/`, or `proposta*` pages.

## Deployment & routing (`vercel.json`)

- `cleanUrls: true` + `trailingSlash: true` — URLs are extensionless with a trailing slash (`/proposta-kiss/`, not `/proposta-kiss.html`).
- **Duplicate proposal files**: pages like `proposta-certificacao.html` / `proposta-kiss.html` exist both as a root `.html` file *and* as `<name>/index.html`. With `cleanUrls: true`, **the folder's `index.html` wins** at the clean URL. When editing one of these proposal pages, edit (or resync) both copies — history shows this has caused real drift (see commit `f44c931`).
- `/diagnostico/(.*)` rewrites to `/diagnostico/index.html` (SPA fallback).
- Per-path cache headers are set in `vercel.json`: assets are immutable/long-cached, `.html` is `max-age=0, must-revalidate`, `llms.txt`/`sitemap.xml`/`robots.txt` get short caches. Keep this in mind if a change "isn't showing up" — HTML is always revalidated but hashed assets are cached for a year.

## Structure

- **`index.html`** — the main landing page. Single large file (~120KB) with inline sections; no templating/includes.
- **`diagnostico/`** — a prebuilt Vite SPA (the "Diagnóstico Neural" quiz/scoring tool). The files under `diagnostico/assets/` are hashed build output committed directly; there is **no Vite source/config in this repo**, so treat these as a black-box build artifact — don't hand-edit the bundled JS/CSS unless you're prepared to rebuild the source elsewhere and re-drop the output here.
- **`cases/`** — case-study pages, one folder per case (`cases/<slug>/index.html`) plus `cases/insights/<slug>/index.html` for insight articles. All share `cases/shared.css` (dark theme, `--lime: #beff01` accent) and a common nav/glow-cursor pattern. `cases/index.html` is the directory/listing page.
- **`proposta/`, `proposta-cbjc/`, `proposta-certificacao/`, `proposta-kiss/`, `proposta-taimin.html`** — one-off client-specific proposal landing pages, not linked from the main nav and blocked from indexing via `robots.txt`. These are throwaway/bespoke per client — don't assume shared structure across them beyond the certificação/kiss dual-file quirk noted above.
- **`agendar/`** — booking page.
- **`api/`** — two Vercel serverless functions, both talking to the same GoHighLevel (GHL) CRM location (`LOCATION_ID` hardcoded in each file):
  - `api/tag-lead.js` — Edge runtime. Upserts a GHL contact and applies tags computed client-side (e.g. from the quiz).
  - `api/attach-pdf.js` — Node runtime (6MB body limit). Upserts a GHL contact, uploads a base64 PDF to GHL media, writes a formatted note with diagnosis data, and sends a branded HTML email via Resend (`sendDiagnosticEmail`/`buildDiagnosticEmail`). Email failures are swallowed so they never block the main response.
  - Required env vars (see `.env.example`, set only in the Vercel dashboard, never committed): `GHL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `GHL_BOOKING_URL`.
- **`assets/`** — third-party vendor libraries (Bootstrap, Swiper, GSAP, Isotope, jQuery plugins, etc.) plus `assets/scss/` source partials and a compiled `assets/css/main.css` + `main.css.map`. There's no Sass build tooling in this repo (no gulpfile/webpack/package.json script) — `main.css` appears to be built externally and committed; if you edit `.scss`, you'll need to compile it out-of-band and update `main.css` yourself.
- **`llms.txt`** — structured, hand-maintained summary of the company/services/cases for LLM crawlers (per llmstxt.org). If case studies or metrics in `cases/` change, keep this file's numbers in sync.
- **`ADS-*.md`, `ads-data*.json`, `ADS-STRATEGY-REPORT*.pdf`** — outputs from the `/ads-*` skills (ad strategy/audit artifacts), not part of the deployed site.

## Reformulação de out/2026 (prevalece sobre o que está acima)

- **`nx/`**: camada compartilhada das páginas novas. `site.css` (tokens e componentes), `site.js` (injeta nav e rodapé em `[data-nx-nav]`/`[data-nx-footer]`, guarda UTMs por 30 dias, `NX.track()` manda eventos de funil ao `dataLayer` do GTM). Ao mudar esses arquivos, subir o `?v=` nas páginas.
- **`nx/diag/`**: motor de diagnóstico reutilizável. `engine.js` roda quiz e relatório; cada vertical é um arquivo de configuração (`geral.js`, `saude.js`) com perguntas, pontos de risco 0–3, pesos por dimensão, textos do relatório, score comercial e CTAs. Nova vertical = nova config + landing, `quiz/` e `resultado/`. Trocar `version` na config quando perguntas ou pesos mudarem (o link do relatório codifica as respostas por versão). Testes: `node tests/diag.test.js` e `node tests/lead.test.mjs`.
- Diagnósticos: `diagnostico/` (geral) e `saude/diagnostico/` (clínicas), cada um com `index.html`, `quiz/` e `resultado/` (noindex). Respostas vão no fragmento `#r=`, sem dado pessoal. O SPA Vite antigo foi para `diagnostico/legado/` (noindex, sem uso).
- `api/diagnostico-lead.js`: captura de lead dos diagnósticos (validação no servidor, isca anti-robô, limite por IP, origens permitidas), grava no GHL e/ou `LEAD_WEBHOOK_URL`, envia link por Resend. Responde 503 sem destino configurado.
- Cases: só `medprev/`, `kiss-my/` e o projeto em validação. Os cases ilustrativos antigos e `insights/` tinham números sem base: os arquivos ficaram, mas o `vercel.json` redireciona (301) para `/cases/`. Nunca publicar métrica sem dado real; números da MedPrev sempre com o recorte (30 dias × 60 dias, nunca somados).

## Conventions specific to this repo

- Content is in **Portuguese (Brazil)**; keep copy, meta tags, and `og:locale`/`lang` attributes consistent with that.
- Dark theme with a signature lime accent (`#beff01`) is used consistently across `index.html`, `cases/`, and proposal pages — match it when adding new pages.
- Case/proposal pages carry full SEO/OG/Twitter meta blocks and JSON-LD (`schema.org`) — replicate this pattern rather than omitting it when creating a new page of the same kind.
