# pkm wiki

self-hosted documentation engine.

## development

```bash
cd docs
npm install
npm run wiki:dev  # http://localhost:4173/pkm/
```

## build & deploy

```bash
npm run wiki:build
./deploy.sh  # → /var/www/pkm
docker compose -f ../docker-compose.wiki.yml up -d
```

## editing

add .md files to `content/`
use `[[page name]]` links
run `npm run wiki:lint` before commit

see [[meta/llm-editing-rules]]
