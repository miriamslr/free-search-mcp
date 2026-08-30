const privateV4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

export function assertPublicUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL invalida."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Somente URLs HTTP(S) sao permitidas.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "metadata.google.internal" || privateV4.some((rule) => rule.test(host)) ||
      host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:") ||
      /^\d+$/.test(host) || /^0x/i.test(host)) {
    throw new Error("Enderecos locais ou privados nao sao permitidos.");
  }
  url.username = ""; url.password = "";
  return url;
}

export function allowedOrigin(request: Request, configured = ""): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return configured.split(",").map((item) => item.trim()).filter(Boolean).includes(origin);
}

export function authorized(request: Request, token?: string): boolean {
  if (!token) return true;
  if (request.headers.get("Authorization") === "Bearer " + token) return true;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || url.searchParams.get("key") || url.searchParams.get("auth");
  return queryToken === token;
}
