import { allowedOrigin, authorized } from "./security";
import { fetchPage, searchWeb } from "./web";

interface Env { MCP_AUTH_TOKEN?: string; MCP_ALLOWED_ORIGINS?: string; SEARCH_CACHE_TTL_SECONDS?: string; CACHE?: KVNamespace; }
const tools = [
  {name:"search",description:"Pesquisa a web e retorna titulo, URL e trecho.",inputSchema:{type:"object",properties:{query:{type:"string"},limit:{type:"integer",minimum:1,maximum:15}},required:["query"]}},
  {name:"fetch",description:"Abre uma URL publica e extrai o texto. Nao acessa redes locais.",inputSchema:{type:"object",properties:{url:{type:"string"},max_chars:{type:"integer",minimum:1000,maximum:50000}},required:["url"]}},
  {name:"research",description:"Pesquisa um tema e le as melhores paginas em uma chamada.",inputSchema:{type:"object",properties:{question:{type:"string"},depth:{type:"integer",minimum:1,maximum:5}},required:["question"]}}
];
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...corsHeaders}});
const result = (id:unknown,data:unknown) => json({jsonrpc:"2.0",id,result:data});
const rpcError = (id:unknown,code:number,message:string,status=200) => json({jsonrpc:"2.0",id,error:{code,message}},status);
const content = (value:unknown) => ({content:[{type:"text",text:typeof value === "string" ? value : JSON.stringify(value,null,2)}]});

async function cached<T>(env:Env,key:string,operation:()=>Promise<T>):Promise<T> {
  const hit = await env.CACHE?.get(key,"json") as T|null; if (hit) return hit;
  const value = await operation();
  await env.CACHE?.put(key,JSON.stringify(value),{expirationTtl:Math.max(60,Number(env.SEARCH_CACHE_TTL_SECONDS || 3600))});
  return value;
}

async function callTool(env:Env,name:string,args:Record<string,unknown>) {
  if (name === "search") {
    const query = String(args.query || "").trim(); if (!query) throw new Error("A consulta nao pode estar vazia.");
    return cached(env,"search:"+query+":"+(args.limit || 8),()=>searchWeb(query,Number(args.limit || 8)));
  }
  if (name === "fetch") return fetchPage(String(args.url || ""),Number(args.max_chars || 30000));
  if (name === "research") {
    const question=String(args.question || "").trim(); if (!question) throw new Error("A pergunta nao pode estar vazia.");
    const depth=Math.max(1,Math.min(Number(args.depth || 3),5));
    const sources=await searchWeb(question,Math.max(depth,5));
    const pages=await Promise.allSettled(sources.slice(0,depth).map((item)=>fetchPage(item.url,15000)));
    return {question,sources,documents:pages.flatMap((item)=>item.status==="fulfilled"?[item.value]:[])};
  }
  throw new Error("Ferramenta desconhecida: "+name);
}

export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const url=new URL(request.url);
    if (url.pathname==="/health") return json({ok:true,service:"free-search-mcp-cloudflare",version:"0.1.0"});
    if (url.pathname!=="/mcp" && url.pathname!=="/sse") return new Response("Not found",{status:404,headers:corsHeaders});
    if (!allowedOrigin(request,env.MCP_ALLOWED_ORIGINS)) return json({error:"Origin nao permitida."},403);
    if (!authorized(request,env.MCP_AUTH_TOKEN)) return json({error:"Nao autorizado."},401);
    if (request.method==="GET") return json({status:"ready",service:"free-search-mcp-cloudflare",tools});
    if (request.method!=="POST") return new Response("Method not allowed",{status:405,headers:{Allow:"POST, GET, OPTIONS",...corsHeaders}});
    let rpc:{id?:unknown;method?:string;params?:Record<string,unknown>};
    try { rpc=await request.json(); } catch { return rpcError(null,-32700,"JSON invalido.",400); }
    try {
      if (rpc.method==="initialize") return result(rpc.id,{protocolVersion:"2025-06-18",capabilities:{tools:{}},serverInfo:{name:"free-search-mcp-cloudflare",version:"0.1.0"}});
      if (rpc.method==="notifications/initialized") return new Response(null,{status:202,headers:corsHeaders});
      if (rpc.method==="ping") return result(rpc.id,{});
      if (rpc.method==="tools/list") return result(rpc.id,{tools});
      if (rpc.method==="tools/call") {
        const params=rpc.params || {};
        const value=await callTool(env,String(params.name || ""),(params.arguments || {}) as Record<string,unknown>);
        return result(rpc.id,content(value));
      }
      return rpcError(rpc.id ?? null,-32601,"Metodo nao encontrado.");
    } catch (cause) {
      return result(rpc.id,{...content(cause instanceof Error?cause.message:"Erro inesperado."),isError:true});
    }
  }
} satisfies ExportedHandler<Env>;
