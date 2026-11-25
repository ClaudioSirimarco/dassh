// DASSH Code — service worker MÍNIMO do celular. Só guarda o "casco" estático (páginas, scripts, estilos, ícones) para
// abrir mais rápido e mostrar a tela inicial sem rede. Estratégia: rede primeiro; o cache só responde se a rede falhar.
// NUNCA cacheia: APIs, WebSocket/MQTT (o service worker nem os enxerga), tokens, pareamento, dados de sessão, outras origens,
// métodos que não sejam GET, nem qualquer caminho fora da lista fechada abaixo. Atualiza sem ficar preso a versão velha:
// skipWaiting + clients.claim, e o cache antigo é apagado ao ativar (troque VERSAO ao mudar o casco).
const VERSAO = "dassh-casco-v2";
const CASCO = [
  "conectar.html", "ponte-remota.js", "aparencia.js", "cores-conectado.css", "pwa-celular.js", "manifest.webmanifest",
  "vendor/xterm.css", "vendor/xterm.js", "vendor/mqtt.min.js",
  "icone-celular-180.png", "icone-celular-192.png", "icone-celular-512.png", "icone-celular-maskable-512.png",
];
const BASE = new URL("./", self.location).pathname;
const PERMITIDOS = new Set(CASCO.map((p) => BASE + p));

self.addEventListener("install", (ev) => {
  self.skipWaiting();
  ev.waitUntil(caches.open(VERSAO).then((c) => Promise.all(CASCO.map((p) => c.add(new Request(p, { cache: "reload" })).catch(() => {})))));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("dassh-casco-") && k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", (ev) => { if (ev.data === "pular-espera") self.skipWaiting(); });

self.addEventListener("fetch", (ev) => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !PERMITIDOS.has(url.pathname)) return;   // nada fora do casco
  if (req.headers.has("authorization")) return;
  const chave = url.origin + url.pathname;   // sem ?query nem #fragmento (o código de pareamento fica fora do cache)
  ev.respondWith((async () => {
    try {
      const r = await fetch(req);
      if (r && r.ok && r.type === "basic") { const c = await caches.open(VERSAO); c.put(chave, r.clone()).catch(() => {}); }
      return r;
    } catch (e) {
      const guardado = await caches.match(chave, { ignoreSearch: true });
      if (guardado) return guardado;
      throw e;
    }
  })());
});
