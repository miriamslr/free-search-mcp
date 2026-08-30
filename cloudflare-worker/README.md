# Free Search MCP para Cloudflare (Produção)

Reimplementação Cloudflare-native do núcleo do projeto Python. O serviço roda em produção no Cloudflare Workers com suporte a HTTP/SSE, cache KV persistente e ferramentas `search`, `fetch` e `research`.

Para a documentação completa de arquitetura, credenciais e integrações (ChatGPT, Antigravity, Claude), consulte:
📄 **[Documentação de Produção (docs/CLOUDFLARE_PRODUCTION.md)](../docs/CLOUDFLARE_PRODUCTION.md)**

## Resumo de Produção

- **Conta:** `Acellere MCPs` (`2bbf9af1af4a1d1466579ae28267a9b8`)
- **URL Base:** `https://free-search-mcp.acellere-mcps.workers.dev`
- **Endpoint MCP:** `https://free-search-mcp.acellere-mcps.workers.dev/mcp`
- **Health Check:** `https://free-search-mcp.acellere-mcps.workers.dev/health`
- **KV Cache:** `CACHE` (`790321ef91b444819322653058c8e1cc`)

## Comandos

~~~bash
cd cloudflare-worker
npm install
npm run typecheck
npm test
npm run deploy
~~~
