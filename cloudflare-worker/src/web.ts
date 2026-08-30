import { assertPublicUrl } from "./security";

export interface SearchResult { title: string; url: string; snippet: string; engine: string; }

function decode(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function resultUrl(raw: string): string | null {
  try {
    const url = new URL(raw, "https://html.duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return assertPublicUrl(redirected ? decodeURIComponent(redirected) : url.href).href;
  } catch { return null; }
}

async function fetchLimited(url: URL, maxBytes = 1500000): Promise<Response> {
  let current = url;
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetch(current, { redirect: "manual", headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FreeSearchMCP/0.1)",
      "Accept": "text/html,application/xhtml+xml"
    }});
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (!location) throw new Error("Redirecionamento sem destino.");
      current = assertPublicUrl(new URL(location, current).href);
      continue;
    }
    if (Number(response.headers.get("content-length") || 0) > maxBytes) throw new Error("Resposta excede o limite.");
    return response;
  }
  throw new Error("Muitos redirecionamentos.");
}

async function duckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const html = await (await fetchLimited(url)).text();
  const results: SearchResult[] = [];
  for (const block of html.split(/class="result\s/).slice(1)) {
    const link = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const target = resultUrl(link[1]); if (!target) continue;
    const snippet = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    results.push({ title: decode(link[2]), url: target, snippet: decode(snippet?.[1] || ""), engine: "duckduckgo" });
    if (results.length >= limit) break;
  }
  return results;
}

async function mojeek(query: string, limit: number): Promise<SearchResult[]> {
  const url = new URL("https://www.mojeek.com/search"); url.searchParams.set("q", query);
  const html = await (await fetchLimited(url)).text();
  const results: SearchResult[] = [];
  const pattern = /<li class="result"[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
  for (const match of html.matchAll(pattern)) {
    const target = resultUrl(match[1]);
    if (target) results.push({ title: decode(match[2]), url: target, snippet: decode(match[3]), engine: "mojeek" });
    if (results.length >= limit) break;
  }
  return results;
}

export async function searchWeb(query: string, limit = 8): Promise<SearchResult[]> {
  const safeLimit = Math.max(1, Math.min(limit, 15));
  const settled = await Promise.allSettled([duckDuckGo(query, safeLimit), mojeek(query, safeLimit)]);
  const merged = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  const seen = new Set<string>();
  return merged.filter((item) => {
    const url = new URL(item.url); const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
    if (seen.has(key)) return false; seen.add(key); return true;
  }).slice(0, safeLimit);
}

export async function fetchPage(input: string, maxChars = 30000): Promise<{url:string; title:string; text:string}> {
  const url = assertPublicUrl(input);
  const response = await fetchLimited(url);
  if (!response.ok) throw new Error("Falha ao abrir pagina: HTTP " + response.status + ".");
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/") && !type.includes("json")) throw new Error("Esta versao aceita apenas texto ou HTML.");
  const html = (await response.text()).slice(0, 1500000);
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname);
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, "\n")
    .split("\n").map(decode).filter((line) => line.length > 20).join("\n\n").slice(0, Math.min(maxChars, 50000));
  return { url: response.url || url.href, title, text };
}
