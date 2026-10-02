// wenfeng.org -> oss://wenfeng-org（广州，文派账号）反向代理
// 1) OSS 默认 endpoint 对 html 强制 Content-Disposition: attachment（2024-04 起的风控），
//    附件头只是响应头——这里剥掉，最终响应头由 Worker 决定。
// 2) OSS 静态托管只解析根路径 index，子目录不解析——这里补目录→/index.html 重写。
const UPSTREAM = 'https://wenfeng-org.oss-cn-guangzhou.aliyuncs.com';
const HOP = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-authorization', 'te', 'trailers', 'accept-encoding', 'cdn-loop']);
export default {
  async fetch(request) {
    const u = new URL(request.url);
    let p = u.pathname;
    if (p === '/') {
      p = '/index.html';
    } else if (!/\.[a-z0-9]+$/i.test(p)) {
      p = p.replace(/\/+$/, '') + '/index.html';
    }
    const h = new Headers();
    for (const [k, v] of request.headers) {
      if (!HOP.has(k.toLowerCase())) h.set(k, v);
    }
    const init = { method: request.method, headers: h, cf: { cacheEverything: true } };
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
    const r = await fetch(UPSTREAM + p + u.search, init);
    const rh = new Headers(r.headers);
    rh.delete('content-disposition');
    rh.delete('x-oss-force-download');
    return new Response(r.body, { status: r.status, headers: rh });
  }
};
