# Free Search MCP - Documentação de Produção Cloudflare

Este documento consolida todas as informações de arquitetura, credenciais, endpoints, integrações (ChatGPT, Antigravity, Claude) e manutenção do **Free Search MCP** rodando em ambiente de produção no Cloudflare Workers.

---

## 1. Visão Geral e Infraestrutura

- **Provedor:** Cloudflare Workers (Edge Global)
- **Conta Cloudflare:** `Acellere MCPs`
- **Account ID:** `2bbf9af1af4a1d1466579ae28267a9b8`
- **Nome do Worker:** `free-search-mcp`
- **URL Base:** `https://free-search-mcp.acellere-mcps.workers.dev`
- **KV Namespace (Cache):** `CACHE` (`790321ef91b444819322653058c8e1cc`)
- **TTL Padrão de Cache:** 3600 segundos (1 hora)
- **Protocolo MCP:** JSON-RPC 2.0 / Streamable HTTP & SSE

---

## 2. Endpoints e Rotas

| Endpoint | Método | Autenticação | Finalidade |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Pública | Healthcheck e status do serviço |
| `/mcp` | `POST` | Bearer Token ou `?token=` | Endpoint principal do protocolo MCP |
| `/mcp` | `GET` | Bearer Token ou `?token=` | Descoberta / Probe de ferramentas |
| `/mcp` | `OPTIONS` | Pública | Preflight CORS para navegadores e ChatGPT |
| `/sse` | `GET/POST` | Bearer Token ou `?token=` | Alias de compatibilidade SSE |

---

## 3. Autenticação e Credenciais

A autenticação pode ser feita de duas formas equivalentes:

1. **Via Cabeçalho HTTP (Recomendado para IDEs/Antigravity/Claude):**
   ```http
   Authorization: Bearer 2309d9a554c01bca7fda9d2ad466b75be2e9ca66edeed3407a096bcb5d7cd758
   ```

2. **Via Parâmetro na URL (Recomendado para ChatGPT no modo "Sem autenticação"):**
   ```text
   https://free-search-mcp.acellere-mcps.workers.dev/mcp?token=2309d9a554c01bca7fda9d2ad466b75be2e9ca66edeed3407a096bcb5d7cd758
   ```

> ⚠️ **Segredo do Worker:** O token está armazenado de forma encriptada no Cloudflare Secrets sob a variável `MCP_AUTH_TOKEN`.

---

## 4. Guia de Integração

### A. Integração com o ChatGPT (Plugins / Custom Actions / MCP)

1. No ChatGPT, acesse **Configurações > Conectores / Modo Desenvolvedor > Novo Plugin / MCP**.
2. Preencha os campos:
   - **Nome:** `Free Search MCP`
   - **Descrição:** `Pesquisa na web e leitura de páginas em tempo real.`
   - **Conexão:** Selecione **URL do servidor**
   - **URL:** `https://free-search-mcp.acellere-mcps.workers.dev/mcp?token=2309d9a554c01bca7fda9d2ad466b75be2e9ca66edeed3407a096bcb5d7cd758`
   - **Autenticação:** Selecione **Sem autenticação** *(o token já é validado pela URL com HTTPS seguro)*.
3. Clique em **Entendi e quero continuar** e conclua a ativação.

---

### B. Integração com o Antigravity IDE

Configure no arquivo `~/.gemini/config/mcp_config.json` ou no `.agents/mcp_config.json` do workspace:

```json
{
  "mcpServers": {
    "free-search-cloudflare": {
      "serverUrl": "https://free-search-mcp.acellere-mcps.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer 2309d9a554c01bca7fda9d2ad466b75be2e9ca66edeed3407a096bcb5d7cd758"
      }
    }
  }
}
```

---

### C. Integração com Claude Desktop / Claude Code

Adicione ao `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "free-search": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://free-search-mcp.acellere-mcps.workers.dev/mcp",
        "--header",
        "Authorization: Bearer 2309d9a554c01bca7fda9d2ad466b75be2e9ca66edeed3407a096bcb5d7cd758"
      ]
    }
  }
}
```

---

## 5. Ferramentas Disponíveis (Tools)

### 1. `search`
- **Descrição:** Realiza pesquisa na web e retorna título, URL e trecho com agregação em tempo real.
- **Parâmetros:**
  - `query` (string, obrigatório): Termo de busca.
  - `limit` (int, opcional): Quantidade máxima de resultados (1 a 15, padrão: 8).

### 2. `fetch`
- **Descrição:** Acessa uma URL pública e extrai texto limpo em Markdown/texto (com proteção contra SSRF e redes locais).
- **Parâmetros:**
  - `url` (string, obrigatório): URL pública a ser lida.
  - `max_chars` (int, opcional): Limite de caracteres (1.000 a 50.000, padrão: 30.000).

### 3. `research`
- **Descrição:** Executa pesquisa profunda com leitura automatizada das principais páginas retornadas em uma única chamada.
- **Parâmetros:**
  - `question` (string, obrigatório): Pergunta ou tema de pesquisa.
  - `depth` (int, opcional): Profundidade da leitura (1 a 5 páginas, padrão: 3).

---

## 6. Comandos Úteis de Manutenção (Wrangler)

Na pasta `cloudflare-worker`:

```powershell
# Executar localmente
npm run dev

# Validar TypeScript e Testes
npm run typecheck
npm test

# Fazer novo deploy para a conta Acellere MCPs
npm run deploy

# Atualizar o segredo de autenticação
npx wrangler secret put MCP_AUTH_TOKEN

# Visualizar logs em tempo real (Tail)
npx wrangler tail
```
