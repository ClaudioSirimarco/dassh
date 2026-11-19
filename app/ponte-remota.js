// 📱 DASSH Conectado — página do CELULAR (mobile-first). Pareia este aparelho com o PC do dono, conecta pelo relé (MQTT/WebSocket)
// com criptografia de ponta a ponta e permite assistir/assumir as abas abertas no PC ou abrir uma nova. Protocolo: conectado.py e
// docs/CONECTADO-CELULAR.md. Bibliotecas locais (sem CDN): vendor/noble (x25519, ed25519, scrypt, hkdf, sha256) e vendor/mqtt.min.js.
import { x25519, ed25519 } from "./vendor/noble/curves/ed25519.js";
import { scryptAsync } from "./vendor/noble/hashes/scrypt.js";
import { hkdf } from "./vendor/noble/hashes/hkdf.js";
import { sha256 } from "./vendor/noble/hashes/sha256.js";

const SERVIDORES = ["wss://broker.emqx.io:8084/mqtt", "wss://test.mosquitto.org:8081/mqtt"];
const CHAVE_LS = "dassh-cel-v1";
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (u) => { let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(String(s)), (c) => c.charCodeAt(0));
const hex = (u) => [...u].map((x) => x.toString(16).padStart(2, "0")).join("");
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
const juntar = (...p) => { const o = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const aad = (...p) => te.encode(p.join("|"));
const topicoDe = (chave, info) => "dassh/v2/" + hex(hkdf(sha256, chave, undefined, te.encode(info), 32)).slice(0, 40);
const iguais = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const normalizar = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// ---------------- cifra (igual ao compartilhar.py: zlib + AES-256-GCM, preenchimento em blocos de 256 bytes) ----------------
async function fluxo(dados, Stream) {
  return new Uint8Array(await new Response(new Blob([dados]).stream().pipeThrough(new Stream("deflate"))).arrayBuffer());
}
const BLOCO = 256, HDR = 28, PAD_MAX = 16 * 1024, MAX_BLOB = 2 ** 20, MAX_TXT = 4 * 2 ** 20;
async function comprimirPad(texto) {
  const base = await fluxo(te.encode(texto), CompressionStream);
  if (base.length > PAD_MAX) return base;
  const alvo = Math.ceil((base.length + HDR) / BLOCO) * BLOCO - HDR;
  if (base.length === alvo) return base;
  const cab = texto.slice(0, -1) + ',"pad":"', lixo = b64(rnd(2 * (alvo + BLOCO - base.length) + 96));
  const comp = (n) => fluxo(te.encode(cab + lixo.slice(0, n) + '"}'), CompressionStream);
  for (const meta of [alvo, alvo + BLOCO]) {
    let lo = 0, hi = lixo.length;
    if ((await comp(hi)).length < meta) continue;
    while (lo < hi) { const m = (lo + hi) >> 1; if ((await comp(m)).length >= meta) hi = m; else lo = m + 1; }
    for (let n = Math.max(0, lo - 6); n <= Math.min(lixo.length, lo + 6); n++) { const c = await comp(n); if (c.length === meta) return c; }
  }
  return base;
}
async function cifrar(chave, obj, ad) {
  const k = await crypto.subtle.importKey("raw", chave, "AES-GCM", false, ["encrypt"]);
  const n = rnd(12);
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: n, additionalData: ad }, k, await comprimirPad(JSON.stringify(obj))));
  return juntar(n, c);
}
async function descomprimir(dados) {
  const rd = new Response(new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate"))).body.getReader();
  const partes = []; let total = 0;
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    total += value.length;
    if (total > MAX_TXT) { rd.cancel().catch(() => {}); throw new Error("mensagem grande demais"); }
    partes.push(value);
  }
  return juntar(...partes);
}
async function decifrar(chave, blob, ad) {
  if (blob.length < 29 || blob.length > MAX_BLOB) throw new Error("tamanho inválido");
  const k = await crypto.subtle.importKey("raw", chave, "AES-GCM", false, ["decrypt"]);
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.slice(0, 12), additionalData: ad }, k, blob.slice(12));
  return JSON.parse(td.decode(await descomprimir(new Uint8Array(p))));
}
// anti-replay: janela deslizante de 64 por remetente (seq) + relógio ±2 min (ts)
class Janela {
  constructor() { this.max = 0; this.mask = 0n; }
  aceitar(seq) {
    if (!Number.isSafeInteger(seq) || seq < 1) return false;
    if (seq > this.max) {
      const d = seq - this.max;
      if (this.max && d > 100000) return false;
      this.mask = d < 64 ? ((this.mask << BigInt(d)) | 1n) & ((1n << 64n) - 1n) : 1n;
      this.max = seq; return true;
    }
    const d = BigInt(this.max - seq);
    if (d >= 64n || (this.mask & (1n << d))) return false;
    this.mask |= 1n << d; return true;
  }
}
const tsOk = (ts) => typeof ts === "number" && Number.isFinite(ts) && Math.abs(Date.now() - ts) <= 120000;
const assinar = (texto, priv) => b64(ed25519.sign(te.encode(texto), priv));
const confere = (sig, texto, pub) => { try { return ed25519.verify(unb64(sig), te.encode(texto), pub); } catch { return false; } };
async function sas(pcEd, ed, x) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", juntar(te.encode("dassh-sas|"), pcEd, ed, x)));
  const n = new DataView(h.buffer).getUint32(0) % 1000000;
  return String(Math.floor(n / 1000)).padStart(3, "0") + " " + String(n % 1000).padStart(3, "0");
}

// ---------------- armazenamento local do aparelho ----------------
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE_LS) || "null"); } catch { return null; } };
const gravar = (d) => { try { d ? localStorage.setItem(CHAVE_LS, JSON.stringify(d)) : localStorage.removeItem(CHAVE_LS); } catch {} };

// ---------------- relé (MQTT) ----------------
class Rele {
  constructor(servidores, aoReceber) { this.servidores = servidores; this.aoReceber = aoReceber; this.c = null; this.subs = new Set(); }
  async abrir() {
    if (this.c && this.c.connected) return;
    let ultimo;
    for (const url of this.servidores) {
      try {
        await new Promise((ok, falha) => {
          const c = mqtt.connect(url, { clientId: "dassh-cel-" + hex(rnd(6)), reconnectPeriod: 3000, connectTimeout: 10000 });
          const t = setTimeout(() => { c.end(true); falha(new Error("tempo")); }, 11000);
          c.on("connect", () => { clearTimeout(t); this.subs.forEach((s) => c.subscribe(s, { qos: 1 })); this.c = c; ok(); });
          c.on("message", (top, m) => this.aoReceber(top, new Uint8Array(m)));
          c.on("error", (e) => { if (!this.c) { clearTimeout(t); c.end(true); falha(e); } });
        });
        return;
      } catch (e) { ultimo = e; }
    }
    throw new Error("Sem acesso ao servidor de retransmissão (internet/firewall). " + (ultimo ? ultimo.message : ""));
  }
  assinar(t) { this.subs.add(t); if (this.c) this.c.subscribe(t, { qos: 1 }); }
  publicar(t, blob) { if (this.c && this.c.connected) this.c.publish(t, blob, { qos: 1, retain: false }); }
  fechar() { try { this.c && this.c.end(true); } catch {} this.c = null; this.subs.clear(); }
}

// ---------------- protocolo do aparelho ----------------
const cel = {
  rele: null, sess: null, seq: 0, rastro: null, vistos: new Set(), abas: [], portas: [], pc: "", rid: 0, espera: new Map(),
  atual: null, meu: false, rx: [], estado: "desconectado", ultimoRx: 0,
};
window.__cel = cel;   // (testes) estado visível — nenhuma chave fica aqui

function novoRele(srv) {
  if (cel.rele) cel.rele.fechar();
  cel.rele = new Rele(srv && srv.length ? srv : SERVIDORES, (t, m) => receber(t, m).catch(() => {}));
  return cel.rele;
}

async function parear(codigo, nome) {
  const cod = normalizar(codigo);
  if (cod.length !== 12) throw new Error("O código tem 12 caracteres (ex.: ABCD-EFGH-JKLM).");
  const P = await scryptAsync(te.encode(cod), te.encode("dassh-parear-v1"), { N: 2 ** 15, r: 8, p: 1, dkLen: 32 });
  const topico = topicoDe(P, "dassh-parear-topico");
  const edPriv = ed25519.utils.randomPrivateKey(), xPriv = x25519.utils.randomPrivateKey();
  const ed = b64(ed25519.getPublicKey(edPriv)), x = b64(x25519.getPublicKey(xPriv)), dev = hex(rnd(8)), ts = Date.now();
  const msg = { t: "parear", id: dev, nome, ed, x, ts };
  msg.sig = assinar(`dassh-parear|${topico}|${dev}|${ed}|${x}|${ts}`, edPriv);
  const rele = novoRele();
  const resposta = new Promise((ok, falha) => {
    cel.aoParear = async (blob) => {
      try {
        if (blob[0] !== 0) return;
        const r = await decifrar(P, blob.slice(1), aad(topico, "pc", "h"));
        if (r.t !== "pareado" || r.para !== dev) return;
        const pcEd = unb64(r.pc_ed), pcX = unb64(r.pc_x);
        if (pcEd.length !== 32 || pcX.length !== 32 || !/^dassh\/v2\/[0-9a-f]{40}$/.test(r.topico)) return;
        if (!confere(r.sig, `dassh-pareado|${topico}|${dev}|${ed}|${x}|${r.topico}|${r.pc_ed}|${r.pc_x}`, pcEd)) return;
        ok(r);
      } catch {}
    };
    setTimeout(() => falha(new Error("O PC não respondeu. Confira o código (vale 5 min, uma vez só) e se o PC está com a janela de pareamento aberta.")), 30000);
  });
  cel.topicoPar = topico + "/h";
  rele.assinar(cel.topicoPar);
  await rele.abrir();
  rele.publicar(topico + "/c", juntar([0], await cifrar(P, msg, aad(topico, "-", "c"))));
  try {
    const r = await resposta;
    const srv = Array.isArray(r.srv) ? r.srv.filter((s) => typeof s === "string" && /^wss?:\/\//.test(s)).slice(0, 4) : [];
    const d = { dev, nome, ed: b64(edPriv), x: b64(xPriv), pc: { nome: String(r.pc_nome || "PC").slice(0, 40), ed: r.pc_ed, x: r.pc_x, topico: r.topico, srv },
                sas: await sas(unb64(r.pc_ed), unb64(ed), unb64(x)), criado: Date.now() };
    gravar(d);
    return d;
  } finally { cel.aoParear = null; cel.topicoPar = null; rele.fechar(); }
}

async function conectar() {
  const d = ler(); if (!d) throw new Error("Aparelho não pareado.");
  desconectar(true);
  setEstado("meio", "Conectando…");
  const topico = d.pc.topico, dev = d.dev;
  const xPriv = unb64(d.x), edPriv = unb64(d.ed), pcX = unb64(d.pc.x), pcEd = unb64(d.pc.ed);
  const segEst = x25519.getSharedSecret(xPriv, pcX);
  const kEst = hkdf(sha256, segEst, undefined, juntar(te.encode("dassh-conectado-estatica|" + dev), pcX, x25519.getPublicKey(xPriv)), 32);
  const eph = x25519.utils.randomPrivateKey(), e = b64(x25519.getPublicKey(eph)), ts = Date.now(), n = b64(rnd(16));
  const ola = { t: "ola", id: dev, e, ts, n };
  ola.sig = assinar(`dassh-ola|${topico}|${dev}|${e}|${ts}|${n}`, edPriv);
  const rele = novoRele(d.pc.srv);
  const bemvindo = new Promise((ok, falha) => {
    cel.aoOla = async (blob) => {
      try {
        const r = await decifrar(kEst, blob.slice(1), aad(topico, "pc", "bemvindo"));
        if (r.t !== "bemvindo" || r.para !== dev || r.n !== n || !/^[0-9a-f]{8}$/.test(r.s) || !tsOk(r.ts)) return;
        if (!confere(r.sig, `dassh-bemvindo|${topico}|${dev}|${e}|${r.e}|${r.s}|${n}`, pcEd)) return;
        ok(r);
      } catch {}
    };
    cel.tOla = setTimeout(() => falha(new Error("O PC não respondeu. Ele precisa estar ligado, com o DASSH Console aberto e “disponível para meus aparelhos”.")), 15000);
  });
  rele.assinar(topico + "/h");
  await rele.abrir();
  rele.publicar(topico + "/c", juntar([2], await cifrar(kEst, ola, aad(topico, dev, "ola"))));
  let r;
  try { r = await bemvindo; } finally { cel.aoOla = null; clearTimeout(cel.tOla); }
  const ePc = unb64(r.e);
  const transcr = sha256(te.encode(`${topico}|${dev}|${e}|${r.e}|${r.s}|${n}`));
  const k = hkdf(sha256, juntar(x25519.getSharedSecret(eph, ePc), segEst), transcr, te.encode("dassh-conectado-sessao"), 64);
  cel.sess = { topico, dev, id: r.s, sidb: te.encode(r.s), kc: k.slice(0, 32), kh: k.slice(32) };
  cel.seq = 0; cel.rastro = new Janela(); cel.pc = r.pc_nome || d.pc.nome; cel.ultimoRx = Date.now();
  setEstado("on", "Conectado · " + cel.pc);
  cel.ping = setInterval(() => {
    enviar({ t: "ping" });
    if (Date.now() - cel.ultimoRx > 40000) { toast("Sem sinal do PC — reconectando…", "erro"); conectar().catch((e) => fimSessao(e.message)); }
  }, 10000);
  enviar({ t: "listar" });
  return r;
}

async function enviar(obj) {
  const s = cel.sess; if (!s) return;
  const m = { ...obj, v: 2, de: s.dev, seq: ++cel.seq, ts: Date.now() };
  cel.rele.publicar(s.topico + "/c", juntar([3], s.sidb, await cifrar(s.kc, m, aad(s.topico, s.id, "c"))));
}
function pedir(obj) {   // ação com resposta (res)
  const rid = ++cel.rid;
  return new Promise((ok) => { cel.espera.set(rid, ok); enviar({ ...obj, rid }); setTimeout(() => { if (cel.espera.delete(rid)) ok({ ok: false, erro: "O PC não respondeu." }); }, 20000); });
}

async function receber(topico, blob) {
  if (blob.length < 30 || blob.length > MAX_BLOB) return;
  const chave = hex(blob.subarray(0, 40));
  if (cel.vistos.has(chave)) return;   // repetição exata: descarta
  if (cel.topicoPar && topico === cel.topicoPar) return cel.aoParear && cel.aoParear(blob);
  if (blob[0] === 2 && cel.aoOla) return cel.aoOla(blob);
  const s = cel.sess;
  if (!s || blob[0] !== 3 || topico !== s.topico + "/h" || !iguais(blob.subarray(1, 9), s.sidb)) return;
  const msg = await decifrar(s.kh, blob.slice(9), aad(s.topico, s.id, "h")).catch(() => null);
  if (!msg || typeof msg !== "object" || msg.de !== "pc" || !tsOk(msg.ts) || !cel.rastro.aceitar(msg.seq)) return;
  cel.vistos.add(chave); if (cel.vistos.size > 5000) cel.vistos.delete(cel.vistos.values().next().value);
  cel.ultimoRx = Date.now();
  tratar(msg);
}

const limpa = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, "").slice(0, n);
function tratar(m) {
  if (m.t === "res") { const f = cel.espera.get(m.id); if (f) { cel.espera.delete(m.id); f(m); } return; }
  if (m.t === "abas") {
    cel.abas = (Array.isArray(m.lista) ? m.lista : []).slice(0, 16).filter((a) => a && /^[A-Za-z0-9_-]{1,32}$/.test(a.sid))
      .map((a) => ({ sid: a.sid, nome: limpa(a.nome, 60), tipo: limpa(a.tipo, 20), alvo: limpa(a.alvo, 80), meu: a.meu === true, cel: a.cel ? limpa(a.cel, 40) : null, ao_vivo: !!a.ao_vivo }));
    cel.portas = (Array.isArray(m.portas) ? m.portas : []).slice(0, 32).map((p) => ({ porta: limpa(p.porta, 20), descricao: limpa(p.descricao, 60) }));
    desenharAbas();
    if (cel.atual) { const a = cel.abas.find((x) => x.sid === cel.atual); if (a) { cel.meu = a.meu; desenharPapel(); } }
    return;
  }
  const texto = typeof m.d === "string" ? m.d : "";
  if (m.t === "tela" && m.sid === cel.atual) { term.reset(); escreverTerm(texto); cel.meu = m.meu === true; desenharPapel(); return; }
  if (m.t === "out" && m.sid === cel.atual) return escreverTerm(texto);
  if (m.t === "controle") { if (m.sid === cel.atual) { cel.meu = m.meu === true; desenharPapel(); } if (m.meu === false) toast("O controle voltou para o PC — você está assistindo"); return; }
  if (m.t === "aviso") return toast(limpa(m.msg, 200), "erro");
  if (m.t === "fim") return fimSessao(limpa(m.motivo, 200));
}

function desconectar(silencioso) {
  clearInterval(cel.ping);
  if (cel.sess && !silencioso) enviar({ t: "sair" });
  const r = cel.rele;
  cel.sess = null;
  if (r) setTimeout(() => r.fechar(), silencioso ? 0 : 300);
  if (!silencioso) setEstado("", "Desconectado");
}
function fimSessao(motivo) {
  clearInterval(cel.ping); cel.sess = null; if (cel.rele) cel.rele.fechar();
  setEstado("", /revogado/i.test(motivo) ? "Revogado" : "Desconectado");
  if (/revogado/i.test(motivo)) { const d = ler(); if (d) { d.revogado = true; gravar(d); } }
  mostrar("sessoes"); desenharPc(); msg("#con-msg", motivo, true);
}

// ================= interface =================
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const msg = (sel, t, erro) => { const el = $(sel); el.textContent = t || ""; el.className = "msg" + (t ? (erro ? " erro" : " ok") : ""); };
function toast(t, cls = "") { const el = $("#toast"); el.textContent = t; el.className = "toast on " + cls; clearTimeout(toast.t); toast.t = setTimeout(() => (el.className = "toast " + cls), 3200); }
function setEstado(cls, t) { cel.estado = t; $("#estado").className = "pilula " + cls; $("#estado-txt").textContent = t; }
function mostrar(nome) { document.querySelectorAll(".tela").forEach((t) => t.classList.toggle("ativa", t.id === "tela-" + nome)); if (nome !== "term") cel.atual = null; }

const ICONES = { serial: "🔌", powershell: "⚡", cmd: "⌨️", ssh: "🔐" };
function desenharPc() {
  const d = ler(), on = !!cel.sess;
  $("#pc-nome").textContent = "🖥 " + (d ? d.pc.nome : "PC");
  $("#pc-info").textContent = d ? (d.revogado ? "Este aparelho foi revogado no PC." : `Pareado como “${d.nome}”`) : "";
  $("#btn-conectar").style.display = on ? "none" : "";
  $("#btn-desconectar").style.display = on ? "" : "none";
  $("#cartao-abas").style.display = on ? "" : "none";
  $("#cartao-nova").style.display = on ? "" : "none";
}
function desenharAbas() {
  const l = $("#lista-abas");
  if (!cel.abas.length) { l.innerHTML = `<div class="vazio">Nenhuma aba de terminal aberta no PC.<br>Abra uma nova abaixo.</div>`; }
  else l.innerHTML = cel.abas.map((a) => `<div class="aba-card" data-sid="${esc(a.sid)}"><span class="ic">${ICONES[a.tipo] || "▣"}</span>
    <div class="txt"><b>${esc(a.nome)}${a.meu ? '<span class="selo">você controla</span>' : a.cel ? `<span class="selo pc">${esc(a.cel)}</span>` : ""}</b>
    <small>${esc(a.tipo)}${a.alvo && a.alvo !== a.tipo ? " · " + esc(a.alvo) : ""}${a.ao_vivo ? " · 📡 ao vivo" : ""}</small></div>
    <div class="acoes"><button data-acao="assistir">Assistir</button><button class="primario" data-acao="assumir">Assumir</button></div></div>`).join("");
  l.querySelectorAll(".aba-card").forEach((c) => c.querySelectorAll("button").forEach((b) => (b.onclick = () => abrirAba(c.dataset.sid, b.dataset.acao === "assumir"))));
  const sel = $("#nova-porta"), atual = sel.value;
  sel.innerHTML = cel.portas.length ? cel.portas.map((p) => `<option value="${esc(p.porta)}">${esc(p.porta)} — ${esc(p.descricao)}</option>`).join("")
    : `<option value="">nenhuma porta COM no PC</option>`;
  if (atual && cel.portas.some((p) => p.porta === atual)) sel.value = atual;
  desenharPc();
}
async function abrirAba(sid, assumir) {
  const a = cel.abas.find((x) => x.sid === sid); if (!a) return;
  cel.atual = sid; cel.meu = a.meu;
  mostrar("term"); cel.atual = sid; $("#term-nome").textContent = a.nome; term.reset(); desenharPapel(); ajustarTerm();
  const r = await pedir({ t: assumir ? "assumir" : "assistir", sid });
  if (!r.ok) { toast(r.erro || "Falhou", "erro"); return mostrar("sessoes"); }
  if (assumir) { cel.meu = true; desenharPapel(); toast("Você está com o controle desta aba"); }
}
function desenharPapel() {
  const p = $("#term-papel"); p.textContent = cel.meu ? "você controla" : "assistindo"; p.classList.toggle("ativo", cel.meu);
  const b = $("#btn-controle"); b.textContent = cel.meu ? "Devolver" : "Assumir"; b.classList.toggle("primario", !cel.meu);
  $("#cmd-linha").placeholder = cel.meu ? "digite o comando…" : "toque em Assumir para digitar";
}

// terminal (xterm): mesmo tamanho do PC (100x30); a fonte encolhe para caber na largura e "A±" alterna o zoom
const term = new Terminal({ cols: 100, rows: 30, fontSize: 7, fontFamily: "Consolas, 'Courier New', monospace", scrollback: 3000, cursorBlink: true,
  theme: { background: "#000000", foreground: "#d8dee9", cursor: "#00dc78" } });
term.open($("#term"));
let zoom = false;
function ajustarTerm() {
  const w = $("#term-caixa").clientWidth - 10;
  term.options.fontSize = zoom ? 13 : Math.max(5, Math.min(14, Math.floor((w / 100 / 0.6) * 2) / 2));
}
addEventListener("resize", ajustarTerm);
function escreverTerm(t) { if (!t) return; cel.rx.push(t); if (cel.rx.length > 2000) cel.rx.splice(0, 1000); term.write(t); }
function digitar(d) {
  if (!cel.sess || !cel.atual) return;
  if (!cel.meu) return toast("Você está assistindo — toque em Assumir para digitar", "erro");
  enviar({ t: "in", sid: cel.atual, d });
}
term.onData((d) => digitar(d));
const TECLAS = { ctrlc: "\x03", tab: "\t", esc: "\x1b", cima: "\x1b[A", baixo: "\x1b[B", dir: "\x1b[C", esq: "\x1b[D", enter: "\r",
                 ctrld: "\x04", ctrlz: "\x1a", ctrll: "\x0c", espaco: " ", q: "q" };
document.querySelectorAll("[data-tecla]").forEach((b) => (b.onclick = () => {
  if (b.dataset.tecla === "zoom") { zoom = !zoom; return ajustarTerm(); }
  digitar(TECLAS[b.dataset.tecla]);
}));
const enviarLinha = () => { const i = $("#cmd-linha"); if (!cel.meu) return digitar(""); digitar(i.value + "\r"); i.value = ""; };
$("#cmd-enviar").onclick = enviarLinha;
$("#cmd-linha").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviarLinha(); } });
$("#btn-voltar").onclick = () => { mostrar("sessoes"); enviar({ t: "listar" }); };
$("#btn-controle").onclick = async () => {
  if (!cel.atual) return;
  if (cel.meu) { enviar({ t: "devolver", sid: cel.atual }); cel.meu = false; desenharPapel(); return; }
  const r = await pedir({ t: "assumir", sid: cel.atual });
  if (r.ok) { cel.meu = true; desenharPapel(); } else toast(r.erro || "Falhou", "erro");
};

// abrir aba nova
let tipoNovo = "serial";
document.querySelectorAll("#nova-tipo button").forEach((b) => (b.onclick = () => {
  tipoNovo = b.dataset.tipo;
  document.querySelectorAll("#nova-tipo button").forEach((x) => x.classList.toggle("sel", x === b));
  $("#nova-serial").style.display = tipoNovo === "serial" ? "" : "none";
  $("#nova-ssh").style.display = tipoNovo === "ssh" ? "" : "none";
}));
$("#nova-btn").onclick = async () => {
  const p = { t: "abrir", tipo: tipoNovo };
  if (tipoNovo === "serial") { p.porta = $("#nova-porta").value; p.baud = +$("#nova-baud").value; if (!p.porta) return msg("#nova-msg", "Nenhuma porta COM no PC.", true); }
  if (tipoNovo === "ssh") { p.destino = $("#nova-destino").value.trim(); if (!p.destino) return msg("#nova-msg", "Informe usuario@ip.", true); }
  $("#nova-btn").disabled = true; msg("#nova-msg", "Abrindo no PC…");
  const r = await pedir(p);
  $("#nova-btn").disabled = false;
  if (!r.ok) return msg("#nova-msg", r.erro || "Falhou", true);
  msg("#nova-msg", "");
  const sid = limpa(r.sid, 32);
  cel.abas = cel.abas.filter((a) => a.sid !== sid).concat([{ sid, nome: limpa(r.nome, 60) || "Nova aba", tipo: tipoNovo, alvo: "", meu: true }]);
  cel.atual = sid; cel.meu = true;
  mostrar("term"); cel.atual = sid; $("#term-nome").textContent = limpa(r.nome, 60) || "Nova aba"; desenharPapel(); ajustarTerm();
  toast("Aba aberta no PC — você está com o controle");
};

// pareamento / conexão
$("#par-btn").onclick = async () => {
  const nome = $("#par-nome").value.trim().slice(0, 40) || "Celular";
  $("#par-btn").disabled = true; msg("#par-msg", "Pareando com segurança…");
  try {
    const d = await parear($("#par-codigo").value, nome);
    msg("#par-msg", "");
    mostrar("sessoes"); desenharPc();
    $("#sas").textContent = d.sas; $("#sas-caixa").style.display = "";
    msg("#con-msg", `Pareado com ${d.pc.nome}. Agora toque em Conectar (o PC precisa estar “disponível para meus aparelhos”).`);
  } catch (e) { msg("#par-msg", e.message, true); }
  $("#par-btn").disabled = false;
};
$("#btn-conectar").onclick = async () => {
  $("#btn-conectar").disabled = true; msg("#con-msg", "");
  try { await conectar(); desenharPc(); $("#sas-caixa").style.display = "none"; }
  catch (e) { setEstado("", "Desconectado"); msg("#con-msg", e.message, true); }
  $("#btn-conectar").disabled = false;
};
$("#btn-desconectar").onclick = () => { desconectar(); desenharPc(); mostrar("sessoes"); };
$("#btn-esquecer").onclick = () => {
  if (!confirm("Esquecer este PC? Para voltar a usar, será preciso parear de novo (e revogar o antigo no PC).")) return;
  desconectar(true); gravar(null); setEstado("", "Desconectado"); mostrar("parear");
};
addEventListener("beforeunload", () => { if (cel.sess) enviar({ t: "sair" }); });

// início: código do #fragmento (nunca vai a servidor) é lido e apagado da barra de endereços e do histórico
(function iniciar() {
  let cod = "";
  const m = /(?:^|[#&])par=([A-Za-z0-9-]{1,20})/.exec(location.hash);
  if (m) cod = m[1];
  if (location.hash) try { history.replaceState(null, "", location.pathname + location.search); } catch {}
  $("#par-codigo").value = cod;
  $("#par-nome").value = /iPhone/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Celular";
  if (ler() && !cod) { mostrar("sessoes"); desenharPc(); } else mostrar("parear");
  cel.pronto = true;
})();
