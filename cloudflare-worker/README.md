# Free Search MCP para Cloudflare

Reimplementacao Cloudflare-native do nucleo do projeto Python. A versao inicial oferece MCP remoto por HTTP com as ferramentas search, fetch e research.

## Publicar

~~~bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler secret put MCP_AUTH_TOKEN
npm run typecheck
npm test
npm run deploy
~~~

Nunca coloque o token no wrangler.jsonc ou no GitHub.

Teste o endpoint publico de saude em /health. O MCP fica em /mcp e exige o cabecalho Authorization: Bearer SEU_TOKEN.

## Cache opcional

Crie um namespace com npx wrangler kv namespace create CACHE e adicione o binding CACHE ao wrangler.jsonc. Sem KV, o Worker funciona sem cache persistente.

## Seguranca

URLs locais, redes privadas, protocolos fora de HTTP(S), credenciais embutidas e redirecionamentos perigosos sao recusados. Downloads e arquivos binarios nao fazem parte desta versao.

## Escopo

O Python original continua intacto. Esta versao ainda nao inclui PDF/Office, mecanismos academicos, downloads, Browser Run nem paridade com as onze ferramentas originais.
