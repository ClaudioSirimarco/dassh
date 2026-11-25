// 📱 DASSH Conectado — canal do CELULAR com o PC do dono (pareamento, aperto de mão e sessão E2E pelo relé MQTT/WebSocket).
// Protocolo: conectado.py e docs/CONECTADO-CELULAR.md. Bibliotecas locais (sem CDN): vendor/noble (x25519, ed25519, scrypt, hkdf,
// sha256) e vendor/mqtt.min.js (carregado antes deste módulo).
// Dois usos:
//  1) MÓDULO do canal (exporta parear/conectar/pedir/rpc…): a plataforma web (index.html + ponte-agente.js) importa este arquivo
//     e passa a operar o PC pareado com a interface COMPLETA — a mesma ponte RPC + eventos do Conector, só que pelo canal cifrado.
//  2) Página conectar.html (passo de pareamento + modo simples: lista de abas, assistir/assumir, abrir aba).
import { x25519, ed25519 } from "./vendor/noble/curves/ed25519.js";
import { scryptAsync } from "./vendor/noble/hashes/scrypt.js";
import { hkdf } from "./vendor/noble/hashes/hkdf.js";
import { sha256 } from "./vendor/noble/hashes/sha256.js";

const SERVIDORES = ["wss://broker.emqx.io:8084/mqtt", "wss://test.mosquitto.org:8081/mqtt"];
const RECUOS = [1000, 2000, 4000, 8000, 15000, 30000];
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
// Vários PCs pareados: {pcs:[{dev, nome, ed, x, pc:{nome,ed,x,topico,srv}, sas, criado, visto?, apelido?, revogado?}], ativo:"<dev>"}.
// Cada PC tem as suas próprias chaves e o seu tópico. O formato antigo (um objeto só) vira lista de 1 na primeira leitura.
const gravarArm = (a) => { try { a.pcs.length ? localStorage.setItem(CHAVE_LS, JSON.stringify(a)) : localStorage.removeItem(CHAVE_LS); } catch {} };
function lerArm() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_LS) || "null");
    if (d && typeof d === "object") {
      if (Array.isArray(d.pcs)) return { pcs: d.pcs.filter((p) => p && p.dev && p.pc), ativo: d.ativo || null };
      if (d.pc && d.dev) { const a = { pcs: [d], ativo: d.dev }; gravarArm(a); return a; }   // migração do formato antigo
    }
  } catch {}
  return { pcs: [], ativo: null };
}
export const listar = () => lerArm().pcs;
export const ler = () => { const a = lerArm(); return a.pcs.find((p) => p.dev === a.ativo) || null; }   // o PC ativo
export const nomeDe = (p) => limpa(p?.apelido, 40) || p?.pc?.nome || "PC";
export function gravar(d) {   // atualiza o PC (pelo dev); um PC novo entra na lista e vira o ativo; null esquece o ativo
  const a = lerArm();
  if (!d) { a.pcs = a.pcs.filter((p) => p.dev !== a.ativo); a.ativo = null; return gravarArm(a); }
  const i = a.pcs.findIndex((p) => p.dev === d.dev);
  if (i >= 0) a.pcs[i] = d;
  else { a.pcs = a.pcs.filter((p) => p.pc?.ed !== d.pc?.ed).concat([d]); a.ativo = d.dev; }   // parear de novo o MESMO PC troca o registro dele
  gravarArm(a);
}
export const pareado = () => { const d = ler(); return !!(d && d.pc && !d.revogado); };
function alterar(dev, f) { const a = lerArm(), p = a.pcs.find((x) => x.dev === dev); if (!p) return false; f(p); gravarArm(a); return true; }
export const renomear = (dev, nome) => alterar(dev, (p) => { const n = limpa(nome, 40).trim(); if (n) p.apelido = n; else delete p.apelido; });
let vistoEm = 0;
const marcarVisto = (dev, forcar) => { if (!forcar && Date.now() - vistoEm < 30000) return; vistoEm = Date.now(); alterar(dev, (p) => { p.visto = Date.now(); }); };

// ---------------- relé (MQTT) ----------------
class Rele {
  constructor(servidores, aoReceber, aoCair) {
    this.servidores = servidores; this.aoReceber = aoReceber; this.aoCair = aoCair;
    this.c = null; this.subs = new Set(); this.fechado = false; this.cancelar = null;
  }
  async abrir() {
    let ultimo;
    for (const url of this.servidores) {
      if (this.fechado) break;
      try {
        await new Promise((ok, falha) => {
          const c = this.c = mqtt.connect(url, { clientId: "dassh-cel-" + hex(rnd(6)), reconnectPeriod: 0, connectTimeout: 10000 });
          const falhou = (e) => {
            if (this.c !== c) return;
            clearTimeout(t); this.cancelar = null; this.c = null;
            try { c.end(true); } catch {}
            falha(e);
          };
          const t = setTimeout(() => falhou(new Error("tempo")), 11000);
          this.cancelar = falhou;
          c.once("connect", () => {
            if (this.c !== c) return;
            clearTimeout(t); this.cancelar = null;
            this.subs.forEach((s) => c.subscribe(s, { qos: 1 })); ok();
          });
          c.on("message", (top, m) => { if (this.c === c) this.aoReceber(top, new Uint8Array(m)); });
          c.on("error", (e) => { if (this.cancelar === falhou) falhou(e); });
          c.once("close", () => {
            if (this.c !== c) return;
            if (this.cancelar === falhou) falhou(new Error("Relé desconectado."));
            else if (this.aoCair) this.aoCair();
          });
        });
        return;
      } catch (e) { ultimo = e; }
    }
    throw new Error("Sem acesso ao servidor de retransmissão (internet/firewall). " + (ultimo ? ultimo.message : ""));
  }
  assinar(t) { this.subs.add(t); if (this.c) this.c.subscribe(t, { qos: 1 }); }
  publicar(t, blob) { if (this.c && this.c.connected) this.c.publish(t, blob, { qos: 1, retain: false }); }
  fechar() {
    this.fechado = true;
    if (this.cancelar) this.cancelar(new Error("Conexão cancelada."));
    const c = this.c; this.c = null; this.subs.clear();
    try { c?.end(true); } catch {}
  }
}

// ---------------- protocolo do aparelho ----------------
// Ganchos (quem usa o canal preenche): aoMsg(m) mensagens da sessão · aoEstado(cls, texto) · aoFim(motivo) · aoConectado(r)
// (reconexão automática inclusa) · aviso(texto, erro).
export const cel = {
  rele: null, sess: null, seq: 0, rastro: null, vistos: new Set(), rid: 0, espera: new Map(), partes: new Map(),
  rx: [], estado: "desconectado", ultimoRx: 0, filaTx: Promise.resolve(), filaRx: Promise.resolve(),
  aoMsg: null, aoEstado: null, aoFim: null, aoConectado: null, aviso: null,
};
window.__cel = cel;   // estado inspecionado pelos testes de navegador
const setEstado = (cls, t) => { cel.estado = t; if (cel.aoEstado) cel.aoEstado(cls, t); };
let automatico = false, emCurso = null, retomada = null, releEmSaida = null;
let falhas = 0, indiceRele = 0, pcIndisponivel = false, recuoLongo = false;

function novoRele(srv, aoCair) {
  if (cel.rele) cel.rele.fechar();
  if (releEmSaida) { releEmSaida.fechar(); releEmSaida = null; }
  // recepção EM ORDEM (a decifragem é assíncrona: sem a fila, pedaços do terminal podiam chegar trocados)
  const rele = new Rele(srv, (t, m) => {
    cel.filaRx = cel.filaRx.then(() => { if (cel.rele === rele) return receber(t, m); }).catch(() => {});
  }, () => { if (cel.rele === rele && aoCair) aoCair(); });
  return cel.rele = rele;
}

export async function parear(codigo, nome) {
  if (normalizar(codigo).length !== 12) throw new Error("O código tem 12 caracteres (ex.: ABCD-EFGH-JKLM).");
  const retomar = automatico && ler()?.dev;
  if (automatico || cel.sess || emCurso) await soltar();   // o relé é um só: o PC atual sai de forma limpa antes de parear outro
  try { return await parearNovo(codigo, nome); }
  catch (e) { if (retomar && ler()?.dev === retomar && pareado()) conectar().catch(() => {}); throw e; }
}
async function parearNovo(codigo, nome) {
  const cod = normalizar(codigo);
  const P = await scryptAsync(te.encode(cod), te.encode("dassh-parear-v1"), { N: 2 ** 15, r: 8, p: 1, dkLen: 32 });
  const topico = topicoDe(P, "dassh-parear-topico");
  const edPriv = ed25519.utils.randomPrivateKey(), xPriv = x25519.utils.randomPrivateKey();
  const ed = b64(ed25519.getPublicKey(edPriv)), x = b64(x25519.getPublicKey(xPriv)), dev = hex(rnd(8)), ts = Date.now();
  const msg = { t: "parear", id: dev, nome, ed, x, ts };
  msg.sig = assinar(`dassh-parear|${topico}|${dev}|${ed}|${x}|${ts}`, edPriv);
  const pacote = juntar([0], await cifrar(P, msg, aad(topico, "-", "c")));
  const rele = novoRele(SERVIDORES);
  let prazo;
  try {
    cel.topicoPar = topico + "/h";
    rele.assinar(cel.topicoPar);
    await rele.abrir();
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
      prazo = setTimeout(() => falha(new Error("O PC não respondeu. Confira o código (vale 5 min, uma vez só) e se o PC está com a janela de pareamento aberta.")), 30000);
    });
    rele.publicar(topico + "/c", pacote);
    const r = await resposta;
    const srv = Array.isArray(r.srv) ? r.srv.filter((s) => typeof s === "string" && /^wss?:\/\//.test(s)).slice(0, 4) : [];
    const d = { dev, nome, ed: b64(edPriv), x: b64(xPriv), pc: { nome: String(r.pc_nome || "PC").slice(0, 40), ed: r.pc_ed, x: r.pc_x, topico: r.topico, srv },
                sas: await sas(unb64(r.pc_ed), unb64(ed), unb64(x)), criado: Date.now() };
    gravar(d);   // ACRESCENTA à lista de PCs e passa a ser o ativo
    return d;
  } finally {
    clearTimeout(prazo);
    cel.aoParear = null; cel.topicoPar = null;
    if (cel.rele === rele) cel.rele = null;
    rele.fechar();
  }
}

export function conectar() {
  const d = ler();
  if (!d?.pc || d.revogado) return Promise.reject(new Error(d?.revogado ? "Este aparelho foi revogado no PC." : "Aparelho não pareado."));
  if (emCurso) return emCurso.promessa;
  if (!automatico) zerarRecuo();
  automatico = true;
  if (cel.sess) limparCanal("Reconectando");
  return tentar();
}

// Troca o PC ativo: o atual sai de forma limpa (aviso "sair" ao PC) e só então o escolhido conecta.
export async function trocar(dev, { reconectar = true } = {}) {
  const p = listar().find((x) => x.dev === dev);
  if (!p) throw new Error("PC não encontrado.");
  if (p.revogado) throw new Error("Este aparelho foi revogado nesse PC.");
  if (ler()?.dev === dev && cel.sess?.dev === dev) return cel.sess;
  await soltar();
  const a = lerArm();
  if (!a.pcs.some((x) => x.dev === dev && !x.revogado)) throw new Error("Este PC não está mais disponível na lista.");
  a.ativo = dev; gravarArm(a);
  if (reconectar) return conectar();
}
async function soltar() {
  const tinha = !!cel.sess;
  await desconectar();
  if (tinha) await new Promise((r) => setTimeout(r, 350));   // deixa o "sair" ir ao relé antes de abrir outro
}
// Esquece um PC (só ele): se for o ativo, desconecta antes. Os outros PCs não são afetados.
export async function esquecer(dev) {
  if (ler()?.dev === dev) await soltar();
  const a = lerArm();
  a.pcs = a.pcs.filter((p) => p.dev !== dev);
  if (a.ativo === dev) a.ativo = null;
  gravarArm(a);
}
export const indisponivel = () => pcIndisponivel && !cel.sess;

function tentar(reconectando = false) {
  clearTimeout(retomada); retomada = null;
  if (emCurso) return emCurso.promessa;
  const d = ler();
  if (!automatico || !d?.pc || d.revogado) return Promise.reject(new Error("Conexão pausada."));
  if (!navigator.onLine) {
    mostrarEspera("Sem internet — reconexão pausada");
    return Promise.reject(new Error("Sem internet."));
  }
  const tentativa = emCurso = {};
  tentativa.promessa = abrirSessao(d, tentativa).catch((e) => {
    if (emCurso === tentativa) {
      limparCanal(e.message);
      if (tentativa.semResposta) pcIndisponivel = true;
      planejarRetomada();
    }
    throw e;
  }).finally(() => { if (emCurso === tentativa) emCurso = null; });
  if (falhas || reconectando) mostrarEspera(estadoRetomada());
  else setEstado("meio", "Conectando…");
  return tentativa.promessa;
}

async function abrirSessao(d, tentativa) {
  const topico = d.pc.topico, dev = d.dev;
  const xPriv = unb64(d.x), edPriv = unb64(d.ed), pcX = unb64(d.pc.x), pcEd = unb64(d.pc.ed);
  const segEst = x25519.getSharedSecret(xPriv, pcX);
  const kEst = hkdf(sha256, segEst, undefined, juntar(te.encode("dassh-conectado-estatica|" + dev), pcX, x25519.getPublicKey(xPriv)), 32);
  const eph = x25519.utils.randomPrivateKey(), e = b64(x25519.getPublicKey(eph)), ts = Date.now(), n = b64(rnd(16));
  const ola = { t: "ola", id: dev, e, ts, n };
  ola.sig = assinar(`dassh-ola|${topico}|${dev}|${e}|${ts}|${n}`, edPriv);
  const servidores = d.pc.srv?.length ? d.pc.srv : SERVIDORES;
  const rele = novoRele([servidores[indiceRele % servidores.length]], () => caiu("Relé desconectado."));
  const pacote = juntar([2], await cifrar(kEst, ola, aad(topico, dev, "ola")));
  rele.assinar(topico + "/h");
  await rele.abrir();
  if (emCurso !== tentativa) throw new Error("Conexão cancelada.");
  let prazo;
  const bemvindo = new Promise((ok, falha) => {
    tentativa.cancelar = falha;
    cel.aoOla = async (blob) => {
      try {
        const r = await decifrar(kEst, blob.slice(1), aad(topico, "pc", "bemvindo"));
        if (r.t !== "bemvindo" || r.para !== dev || r.n !== n || !/^[0-9a-f]{8}$/.test(r.s) || !tsOk(r.ts)) return;
        if (!confere(r.sig, `dassh-bemvindo|${topico}|${dev}|${e}|${r.e}|${r.s}|${n}`, pcEd)) return;
        ok(r);
      } catch {}
    };
    prazo = setTimeout(() => {
      tentativa.semResposta = true;
      falha(new Error("O PC não respondeu. Ele precisa estar ligado, com o DASSH Code aberto e “disponível para meus aparelhos”."));
    }, 15000);
  });
  let r;
  try {
    rele.publicar(topico + "/c", pacote);
    r = await bemvindo;
  } finally {
    clearTimeout(prazo); tentativa.cancelar = null;
    if (cel.rele === rele) cel.aoOla = null;
  }
  if (emCurso !== tentativa) throw new Error("Conexão cancelada.");
  const ePc = unb64(r.e);
  const transcr = sha256(te.encode(`${topico}|${dev}|${e}|${r.e}|${r.s}|${n}`));
  const k = hkdf(sha256, juntar(x25519.getSharedSecret(eph, ePc), segEst), transcr, te.encode("dassh-conectado-sessao"), 64);
  const s = cel.sess = { topico, dev, id: r.s, sidb: te.encode(r.s), kc: k.slice(0, 32), kh: k.slice(32) };
  cel.seq = 0; cel.rastro = new Janela(); cel.pc = r.pc_nome || d.pc.nome; cel.ultimoRx = Date.now(); cel.partes.clear();
  zerarRecuo();
  marcarVisto(dev, true);
  setEstado("on", "Conectado · " + cel.pc);
  cel.ping = setInterval(() => {
    if (Date.now() - cel.ultimoRx >= 40000) return caiu("Sem sinal do PC.");
    marcarVisto(dev);
    enviar({ t: "ping" });
  }, 10000);
  if (cel.aoConectado) { try { await cel.aoConectado(r); } catch {} }
  if (cel.sess !== s) throw new Error("Conexão interrompida.");
  return r;
}

export function enviar(obj) { return transmitir(obj); }
function transmitir(obj, saindo = false) {   // em fila: a cifra é assíncrona e a ordem importa (digitação)
  const s = cel.sess, rele = cel.rele;
  if (!s || !rele) return Promise.resolve();
  const m = { ...obj, v: 2, de: s.dev, seq: ++cel.seq, ts: Date.now() };
  cel.filaTx = cel.filaTx.then(async () => {
    if (!saindo && cel.sess !== s) return;
    const pacote = juntar([3], s.sidb, await cifrar(s.kc, m, aad(s.topico, s.id, "c")));
    if (saindo || cel.sess === s) rele.publicar(s.topico + "/c", pacote);
  }).catch(() => {});
  return cel.filaTx;
}
export function pedir(obj, ms = 20000) {   // ação com resposta (res)
  if (!cel.sess) return Promise.resolve({ ok: false, erro: "Desconectado do PC", desconectado: true });
  const rid = ++cel.rid;
  return new Promise((ok) => {
    const prazo = setTimeout(() => { if (cel.espera.delete(rid)) ok({ ok: false, erro: "O PC não respondeu.", e: "O PC não respondeu." }); }, ms);
    cel.espera.set(rid, (r) => { clearTimeout(prazo); ok(r); });
    enviar({ ...obj, rid });
  });
}
// a MESMA chamada `api.<m>(...a)` da plataforma web, executada no Api real do PC
export async function rpc(m, a) {
  if (!cel.sess) throw new Error("Desconectado do PC");
  const r = await pedir({ t: "rpc", m, a }, 180000);
  // uma chamada interrompida pela queda fica pendente enquanto a interface sinaliza a reconexão
  if (!r.ok && r.desconectado) return new Promise(() => {});
  if (!r.ok) throw new Error(r.e || r.erro || "falhou");
  return r.r;
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
  if (cel.sess !== s || !msg || typeof msg !== "object" || msg.de !== "pc" || !tsOk(msg.ts) || !cel.rastro.aceitar(msg.seq)) return;
  cel.vistos.add(chave); if (cel.vistos.size > 5000) cel.vistos.delete(cel.vistos.values().next().value);
  cel.ultimoRx = Date.now();
  tratar(msg);
}

function tratar(m) {
  if (m.t === "parte") {   // mensagem grande em partes (cada uma já autenticada): junta e trata como uma só
    if (!Number.isSafeInteger(m.n) || m.n < 1 || m.n > 32 || !Number.isSafeInteger(m.i) || m.i < 0 || m.i >= m.n || typeof m.d !== "string") return;
    const p = cel.partes.get(m.id) || { n: m.n, l: new Array(m.n), k: 0 };
    if (p.n !== m.n || p.l[m.i] !== undefined) return;
    p.l[m.i] = m.d; p.k++; cel.partes.set(m.id, p);
    if (cel.partes.size > 8) cel.partes.delete(cel.partes.keys().next().value);
    if (p.k < p.n) return;
    cel.partes.delete(m.id);
    let o; try { o = JSON.parse(p.l.join("")); } catch { return; }
    return o && typeof o === "object" && o.t !== "parte" ? tratar(o) : undefined;
  }
  if (m.t === "res") { const f = cel.espera.get(m.id); if (f) { cel.espera.delete(m.id); f(m); } return; }
  if (m.t === "fim") return fimSessao(limpa(m.motivo, 200));
  if (cel.aoMsg) cel.aoMsg(m);
}

function limparCanal(motivo, saida) {
  clearTimeout(retomada); retomada = null;
  clearInterval(cel.ping); cel.ping = null;
  if (cel.sess) marcarVisto(cel.sess.dev, true);
  const tentativa = emCurso, rele = cel.rele;
  emCurso = cel.sess = cel.rele = cel.aoOla = null;
  if (tentativa?.cancelar) tentativa.cancelar(new Error(motivo));
  cel.espera.forEach((f) => f({ ok: false, erro: motivo, e: motivo, desconectado: true }));
  cel.espera.clear();
  if (!rele) return;
  if (!saida) return rele.fechar();
  releEmSaida = rele;
  saida.then(() => setTimeout(() => {
    if (releEmSaida !== rele) return;
    releEmSaida = null;
    rele.fechar();
  }, 300));
}

export function desconectar() {
  automatico = false;
  const saida = cel.sess && transmitir({ t: "sair" }, true);
  limparCanal("Desconectado do PC", saida);
  setEstado("", "Desconectado");
  return Promise.resolve(saida).then(() => {});
}

function zerarRecuo() {
  falhas = 0;
  pcIndisponivel = recuoLongo = false;
}
function estadoRetomada() {
  return pcIndisponivel ? "PC indisponível — tentando de novo" : `Reconectando… (tentativa ${falhas || 1})`;
}
function mostrarEspera(texto) {
  setEstado("meio", texto);
  if (cel.aviso) cel.aviso(texto);
}
function planejarRetomada(alternar = true) {
  if (!automatico || !pareado()) return;
  if (!navigator.onLine) return mostrarEspera("Sem internet — reconexão pausada");
  const base = RECUOS[Math.min(falhas, RECUOS.length - 1)];
  const atraso = Math.min(30000, Math.round(Math.max(base, recuoLongo ? 15000 : 0) * (0.9 + Math.random() * 0.2)));
  falhas++;
  if (alternar) indiceRele++;
  mostrarEspera(estadoRetomada());
  retomada = setTimeout(() => tentar().catch(() => {}), atraso);
}
function caiu(motivo) {
  const duranteAperto = !cel.sess;
  limparCanal(motivo);
  planejarRetomada(duranteAperto);
}
function fimSessao(motivo) {
  if (!/revogado/i.test(motivo)) {
    if (/fechado no PC|indisponível|deixou de estar disponível|sem resposta/i.test(motivo)) pcIndisponivel = recuoLongo = true;
    return caiu(motivo || "Conexão perdida.");
  }
  automatico = false;
  const dev = cel.sess?.dev || ler()?.dev;   // revoga SÓ o PC dessa sessão; os outros continuam valendo
  const d = listar().find((p) => p.dev === dev); if (d) { d.revogado = true; gravar(d); }
  limparCanal(motivo);
  setEstado("", "Revogado");
  if (cel.aoFim) cel.aoFim(motivo, true);
}

function voltarAoCanal() {
  if (!automatico || !pareado() || !navigator.onLine) return;
  if (cel.sess && Date.now() - cel.ultimoRx <= 15000) return;
  if (!cel.sess && emCurso) return;
  limparCanal("Reconectando");
  zerarRecuo();
  tentar(true).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") voltarAoCanal(); });
for (const evento of ["pageshow", "online", "focus"]) addEventListener(evento, voltarAoCanal);
addEventListener("offline", () => {
  if (!automatico || !pareado()) return;
  limparCanal("Sem internet.");
  mostrarEspera("Sem internet — reconexão pausada");
});
export const limpa = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, "").slice(0, n);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function haQuanto(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? "há instantes" : s < 3600 ? `há ${Math.floor(s / 60)} min` : s < 86400 ? `há ${Math.floor(s / 3600)} h` : `há ${Math.floor(s / 86400)} d`;
}
function estadoDoPc(p, ativo) {
  if (p.revogado) return { cls: "erro", t: "Revogado nesse PC" };
  if (cel.sess?.dev === p.dev) return { cls: "", t: "Conectado" };
  if (ativo && automatico) return indisponivel() ? { cls: "aviso", t: "Indisponível — tentando de novo" } : { cls: "aviso", t: "Conectando…" };
  return { cls: "aviso", t: p.visto ? "Desconectado" : "Ainda não conectou" };
}

// A mesma lista atende o modo simples e a plataforma completa. Cada tela decide o que abrir após uma ação.
export function criarListaPcs(lista, { conectarPc, aposAlterar, aoErro, focoVazio }) {
  let renomeando = null, ocupada = false;

  function desenhar() {
    const ativo = ler()?.dev, pcs = listar(), foco = document.activeElement;
    const focado = lista.contains(foco) && foco.closest(".pc-card")?.dataset.dev;
    const acao = focado && foco.dataset.acao;
    lista.innerHTML = pcs.map((p) => {
      const atual = p.dev === ativo, estado = estadoDoPc(p, atual), conectado = cel.sess?.dev === p.dev;
      const visto = p.visto && !conectado ? " · Visto " + haQuanto(p.visto) : "";
      const editando = renomeando === p.dev, nome = esc(nomeDe(p));
      const campo = editando ? `<input class="pc-nome-campo" maxlength="40" value="${nome}" aria-label="Novo nome do PC">` : "";
      const acoes = editando
        ? '<button class="primario" data-acao="salvar">Salvar</button><button data-acao="cancelar">Cancelar</button>'
        : `${conectado ? "" : `<button class="primario" data-acao="conectar"${p.revogado ? " disabled" : ""}>Conectar</button>`}<button data-acao="renomear">Renomear</button><button class="perigo" data-acao="esquecer">Esquecer</button>`;
      return `<div class="pc-card${atual ? " ativo" : ""}" role="listitem" aria-label="${nome}" data-dev="${esc(p.dev)}"><div class="pc-cabecalho"><span class="ic" aria-hidden="true">🖥</span>
        <div class="txt"><b>${nome}</b><small class="estado-pc"><span class="selo ${estado.cls}" style="margin-left:0">${esc(estado.t)}</span>${visto}</small></div></div>${campo}<div class="acoes">${acoes}</div></div>`;
    }).join("");
    if (!pcs.length) lista.innerHTML = '<div class="vazio" role="listitem">Nenhum PC pareado neste celular.</div>';
    lista.querySelectorAll(".pc-card").forEach((c) => c.querySelectorAll("button").forEach((b) => {
      b.onclick = () => agir(c, b.dataset.acao);
    }));
    const campo = lista.querySelector(".pc-nome-campo");
    if (campo) {
      campo.focus(); campo.select();
      campo.onkeydown = (ev) => {
        if (ev.key !== "Enter" && ev.key !== "Escape") return;
        ev.preventDefault(); ev.stopPropagation();
        agir(campo.closest(".pc-card"), ev.key === "Enter" ? "salvar" : "cancelar");
      };
    } else if (focado) focarAcao(focado, acao);
  }

  function focarAcao(dev, acao) {
    const cartao = [...lista.querySelectorAll(".pc-card")].find((c) => c.dataset.dev === dev);
    const botao = cartao?.querySelector(`[data-acao="${acao}"]:enabled`) || lista.querySelector("button:enabled") || focoVazio;
    botao?.focus();
  }

  async function agir(cartao, acao) {
    if (ocupada) return;
    const dev = cartao.dataset.dev, p = listar().find((x) => x.dev === dev);
    if (!p) return desenhar();
    if (acao === "renomear") { renomeando = dev; return desenhar(); }
    if (acao === "salvar" || acao === "cancelar") {
      if (acao === "salvar") { renomear(dev, cartao.querySelector(".pc-nome-campo").value); aposAlterar(false); }
      renomeando = null; desenhar(); return focarAcao(dev, "renomear");
    }
    if (acao === "esquecer" && !confirm(`Esquecer “${nomeDe(p)}”? Para voltar a usar este PC, será preciso parear de novo e revogar o pareamento antigo no PC.`)) return;
    ocupada = true;
    try {
      if (acao === "conectar") await conectarPc(dev);
      if (acao === "esquecer") {
        const eraAtivo = ler()?.dev === dev;
        await esquecer(dev);
        renomeando = null; aposAlterar(eraAtivo); desenhar(); focarAcao(dev, "esquecer");
      }
    } catch (e) { aoErro(e); }
    finally { ocupada = false; }
  }

  return {
    abrir() { renomeando = null; desenhar(); },
    atualizar() { if (!renomeando && !ocupada) desenhar(); },
    get ocupada() { return ocupada; },
  };
}

// =====================================================================================================================
// Página conectar.html (pareamento + modo simples). Só roda se a página tiver a tela de pareamento.
// =====================================================================================================================
if (document.getElementById("tela-parear")) paginaConectar();

function paginaConectar() {
  const $ = (s) => document.querySelector(s);
  const msg = (sel, t, erro) => { const el = $(sel); el.textContent = t || ""; el.className = "msg" + (t ? (erro ? " erro" : " ok") : ""); };
  function toast(t, cls = "") { const el = $("#toast"); el.textContent = t; el.className = "toast on " + cls; clearTimeout(toast.t); toast.t = setTimeout(() => (el.className = "toast " + cls), 3200); }
  const pag = { abas: [], portas: [], atual: null, meu: false, abrindo: false };
  cel.aoEstado = (cls, t) => { $("#estado").className = "pilula " + cls; $("#estado-txt").textContent = t; desenharPc(); if ($("#tela-pcs").classList.contains("ativa")) listaPcs.atualizar(); };
  cel.aoFim = (motivo) => {   // revogado: se sobrou outro PC valido, volta para a lista; senao, para o pareamento
    if (listar().some((p) => !p.revogado)) { mostrar("pcs"); toast(limpa(motivo, 200), "erro"); }
    else { mostrar("parear"); msg("#par-msg", motivo, true); }
  };
  cel.aoConectado = () => {
    enviar({ t: "listar" });
    if (pag.atual) {
      pag.meu = false; desenharPapel();
      enviar({ t: "assistir", sid: pag.atual });
    }
  };
  cel.aoMsg = tratarPagina;
  // a interface completa (plataforma web) fica ao lado desta página: no site /dassh/app/, na pasta ui/ index.html
  const URL_APP = /conectar\.html$/.test(location.pathname) ? "index.html" : "../app/";
  $("#btn-completa").href = URL_APP + "#celular";

  function mostrar(nome) {
    document.querySelectorAll(".tela").forEach((t) => t.classList.toggle("ativa", t.id === "tela-" + nome));
    if (nome !== "term") pag.atual = null;
    if (nome === "pcs") {
      $("#btn-pcs-voltar").hidden = !pareado();
      listaPcs.abrir();
    }
    if (nome === "parear") {   // "Parear outro PC" acrescenta; com PCs na lista, dá para cancelar
      const n = listar().length;
      $("#par-titulo").textContent = n ? "📱 Parear outro PC" : "📱 Parear este celular";
      $("#par-cancelar").hidden = !n;
    }
  }
  function tratarPagina(m) {
    if (m.t === "abas") {
      pag.abas = (Array.isArray(m.lista) ? m.lista : []).slice(0, 16).filter((a) => a && /^[A-Za-z0-9_-]{1,32}$/.test(a.sid))
        .map((a) => ({ sid: a.sid, nome: limpa(a.nome, 60), tipo: limpa(a.tipo, 20), alvo: limpa(a.alvo, 80), meu: a.meu === true, cel: a.cel ? limpa(a.cel, 40) : null, ao_vivo: !!a.ao_vivo }));
      pag.portas = (Array.isArray(m.portas) ? m.portas : []).slice(0, 32).map((p) => ({ porta: limpa(p.porta, 20), descricao: limpa(p.descricao, 60) }));
      desenharAbas();
      if (pag.atual) { const a = pag.abas.find((x) => x.sid === pag.atual); if (a) { pag.meu = a.meu; desenharPapel(); } }
      return;
    }
    const texto = typeof m.d === "string" ? m.d : "";
    if (m.t === "tela" && m.sid === pag.atual) { term.reset(); escreverTerm(texto); pag.meu = m.meu === true; desenharPapel(); return; }
    if (m.t === "out" && m.sid === pag.atual) return escreverTerm(texto);
    if (m.t === "controle") { if (m.sid === pag.atual) { pag.meu = m.meu === true; desenharPapel(); } if (m.meu === false) toast("O controle voltou para o PC — você está assistindo"); return; }
    if (m.t === "aviso") return toast(limpa(m.msg, 200), "erro");
  }

  const ICONES = { serial: "🔌", powershell: "⚡", cmd: "⌨️", ssh: "🔐" };
  function desenharPc() {
    const d = ler(), on = !!cel.sess, valido = !!d?.pc && !d.revogado;
    $("#pc-nome").textContent = "🖥 " + nomeDe(d);
    $("#btn-meus").textContent = "🖥 Meus PCs" + (listar().length > 1 ? ` (${listar().length})` : "");
    $("#pc-info").textContent = d ? (d.revogado ? "Este aparelho foi revogado no PC." : `Pareado como “${d.nome}”`) : "";
    $("#btn-conectar").hidden = !valido || automatico;
    $("#btn-desconectar").hidden = !valido || !automatico;
    $("#cartao-abas").hidden = !valido || !automatico;
    document.querySelectorAll("#lista-abas button").forEach((b) => { b.disabled = !on; });
    $("#cartao-nova").style.display = valido && automatico ? "" : "none";
    $("#nova-btn").disabled = !on || pag.abrindo;
    $("#btn-completa").style.display = valido ? "" : "none";
  }
  function desenharAbas() {
    const l = $("#lista-abas");
    if (!pag.abas.length) { l.innerHTML = `<div class="vazio">Nenhuma aba de terminal aberta no PC.<br>Abra uma nova abaixo.</div>`; }
    else l.innerHTML = pag.abas.map((a) => `<div class="aba-card" data-sid="${esc(a.sid)}"><span class="ic">${ICONES[a.tipo] || "▣"}</span>
      <div class="txt"><b>${esc(a.nome)}${a.meu ? '<span class="selo">você controla</span>' : a.cel ? `<span class="selo pc">${esc(a.cel)}</span>` : ""}</b>
      <small>${esc(a.tipo)}${a.alvo && a.alvo !== a.tipo ? " · " + esc(a.alvo) : ""}${a.ao_vivo ? " · 📡 ao vivo" : ""}</small></div>
      <div class="acoes"><button data-acao="assistir">Assistir</button><button class="primario" data-acao="assumir">Assumir</button></div></div>`).join("");
    l.querySelectorAll(".aba-card").forEach((c) => c.querySelectorAll("button").forEach((b) => (b.onclick = () => abrirAba(c.dataset.sid, b.dataset.acao === "assumir"))));
    const sel = $("#nova-porta"), atual = sel.value;
    sel.innerHTML = pag.portas.length ? pag.portas.map((p) => `<option value="${esc(p.porta)}">${esc(p.porta)} — ${esc(p.descricao)}</option>`).join("")
      : `<option value="">nenhuma porta COM no PC</option>`;
    if (atual && pag.portas.some((p) => p.porta === atual)) sel.value = atual;
    desenharPc();
  }
  async function abrirAba(sid, assumir) {
    const a = pag.abas.find((x) => x.sid === sid); if (!a || !cel.sess) return;
    pag.meu = a.meu;
    mostrar("term"); pag.atual = sid; $("#term-nome").textContent = a.nome; term.reset(); desenharPapel(); ajustarTerm();
    const r = await pedir({ t: assumir ? "assumir" : "assistir", sid });
    if (r.desconectado) return;
    if (!r.ok) { toast(r.erro || "Falhou", "erro"); return mostrar("sessoes"); }
    if (assumir) { pag.meu = true; desenharPapel(); toast("Você está com o controle desta aba"); }
  }
  function desenharPapel() {
    const p = $("#term-papel"); p.textContent = pag.meu ? "você controla" : "assistindo"; p.classList.toggle("ativo", pag.meu);
    const b = $("#btn-controle"); b.textContent = pag.meu ? "Devolver" : "Assumir"; b.classList.toggle("primario", !pag.meu);
    $("#cmd-linha").placeholder = pag.meu ? "digite o comando…" : "toque em Assumir para digitar";
  }

  // ---- Meus PCs ----
  const listaPcs = criarListaPcs($("#lista-pcs"), {
    conectarPc(dev) {
      try { sessionStorage.removeItem(chavePausa); } catch {}
      if (cel.sess?.dev === dev) return mostrar("sessoes");
      pag.abas = []; desenharAbas(); $("#sas-caixa").style.display = "none";
      mostrar("sessoes");
      trocar(dev).catch(() => {});
    },
    aposAlterar(eraAtivo) {
      if (eraAtivo) { pag.abas = []; desenharAbas(); }
      desenharPc();
      $("#btn-pcs-voltar").hidden = !pareado();
      if (!listar().length) { msg("#par-msg", ""); mostrar("parear"); }
    },
    aoErro: () => toast("Não foi possível atualizar a lista de PCs.", "erro"),
    focoVazio: $("#btn-parear-outro"),
  });
  $("#btn-meus").onclick = () => mostrar("pcs");
  $("#btn-pcs-voltar").onclick = () => mostrar("sessoes");
  $("#btn-parear-outro").onclick = () => { msg("#par-msg", ""); $("#par-codigo").value = ""; mostrar("parear"); };
  $("#par-cancelar").onclick = () => { msg("#par-msg", ""); mostrar(pareado() ? "sessoes" : "pcs"); };

  // terminal (xterm): mesmo tamanho do PC (100x30); a fonte encolhe para caber na largura e "A±" alterna o zoom
  const cores = getComputedStyle(document.documentElement);
  const term = new Terminal({ cols: 100, rows: 30, fontSize: 7, fontFamily: "Consolas, 'Courier New', monospace", scrollback: 3000, cursorBlink: true,
    theme: { background: cores.getPropertyValue("--midia-fundo").trim(), foreground: cores.getPropertyValue("--terminal-remoto-texto").trim(),
      cursor: cores.getPropertyValue("--terminal-remoto-cursor").trim() } });
  term.open($("#term"));
  let zoom = false;
  function ajustarTerm() {
    const w = $("#term-caixa").clientWidth - 10;
    term.options.fontSize = zoom ? 13 : Math.max(5, Math.min(14, Math.floor((w / 100 / 0.6) * 2) / 2));
  }
  addEventListener("resize", ajustarTerm);
  function escreverTerm(t) { if (!t) return; cel.rx.push(t); if (cel.rx.length > 2000) cel.rx.splice(0, 1000); term.write(t); }
  function digitar(d) {
    if (!cel.sess || !pag.atual) return;
    if (!pag.meu) return toast("Você está assistindo — toque em Assumir para digitar", "erro");
    enviar({ t: "in", sid: pag.atual, d });
  }
  term.onData((d) => digitar(d));
  const TECLAS = { ctrlc: "\x03", tab: "\t", esc: "\x1b", cima: "\x1b[A", baixo: "\x1b[B", dir: "\x1b[C", esq: "\x1b[D", enter: "\r",
                   ctrld: "\x04", ctrlz: "\x1a", ctrll: "\x0c", espaco: " ", q: "q" };
  document.querySelectorAll("[data-tecla]").forEach((b) => (b.onclick = () => {
    if (b.dataset.tecla === "zoom") { zoom = !zoom; return ajustarTerm(); }
    digitar(TECLAS[b.dataset.tecla]);
  }));
  const enviarLinha = () => { const i = $("#cmd-linha"); if (!cel.sess || !pag.meu) return digitar(""); digitar(i.value + "\r"); i.value = ""; };
  $("#cmd-enviar").onclick = enviarLinha;
  $("#cmd-linha").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviarLinha(); } });
  $("#btn-voltar").onclick = () => { mostrar("sessoes"); enviar({ t: "listar" }); };
  $("#btn-controle").onclick = async () => {
    if (!pag.atual || !cel.sess) return;
    if (pag.meu) { enviar({ t: "devolver", sid: pag.atual }); pag.meu = false; desenharPapel(); return; }
    const r = await pedir({ t: "assumir", sid: pag.atual });
    if (r.ok) { pag.meu = true; desenharPapel(); } else if (!r.desconectado) toast(r.erro || "Falhou", "erro");
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
    if (!cel.sess || pag.abrindo) return;
    const p = { t: "abrir", tipo: tipoNovo };
    if (tipoNovo === "serial") { p.porta = $("#nova-porta").value; p.baud = +$("#nova-baud").value; if (!p.porta) return msg("#nova-msg", "Nenhuma porta COM no PC.", true); }
    if (tipoNovo === "ssh") { p.destino = $("#nova-destino").value.trim(); if (!p.destino) return msg("#nova-msg", "Informe usuario@ip.", true); }
    pag.abrindo = $("#nova-btn").disabled = true; msg("#nova-msg", "Abrindo no PC…");
    const r = await pedir(p);
    pag.abrindo = false;
    $("#nova-btn").disabled = !cel.sess;
    if (r.desconectado) return msg("#nova-msg", "");
    if (!r.ok) return msg("#nova-msg", r.erro || "Falhou", true);
    msg("#nova-msg", "");
    const sid = limpa(r.sid, 32);
    pag.abas = pag.abas.filter((a) => a.sid !== sid).concat([{ sid, nome: limpa(r.nome, 60) || "Nova aba", tipo: tipoNovo, alvo: "", meu: true }]);
    pag.meu = true;
    mostrar("term"); pag.atual = sid; $("#term-nome").textContent = limpa(r.nome, 60) || "Nova aba"; desenharPapel(); ajustarTerm();
    toast("Aba aberta no PC — você está com o controle");
  };

  // pareamento / conexão
  const chavePausa = "dassh-cel-pausa";
  function iniciarConexao() {
    try { sessionStorage.removeItem(chavePausa); } catch {}
    conectar().catch(() => {});
  }
  $("#par-btn").onclick = async () => {
    const nome = $("#par-nome").value.trim().slice(0, 40) || "Celular";
    $("#par-btn").disabled = true; msg("#par-msg", "Pareando com segurança…");
    try {
      const d = await parear($("#par-codigo").value, nome);
      msg("#par-msg", "");
      pag.abas = []; desenharAbas();
      mostrar("sessoes");
      $("#sas").textContent = d.sas; $("#sas-caixa").style.display = "";
      iniciarConexao();
    } catch (e) { msg("#par-msg", e.message, true); }
    $("#par-btn").disabled = false;
  };
  $("#btn-conectar").onclick = iniciarConexao;
  $("#btn-desconectar").onclick = () => {
    try { sessionStorage.setItem(chavePausa, ler()?.dev); } catch {}
    desconectar(); mostrar("sessoes");
  };
  $("#btn-esquecer").onclick = async () => {
    const d = ler(); if (!d) return;
    if (!confirm("Esquecer este PC? Para voltar a usar, será preciso parear de novo (e revogar o antigo no PC).")) return;
    await esquecer(d.dev); pag.abas = []; desenharAbas(); msg("#par-msg", "");
    mostrar(listar().length ? "pcs" : "parear");
  };

  // início: código do #fragmento (nunca vai a servidor) é lido e apagado da barra de endereços e do histórico
  let cod = "";
  const m = /(?:^|[#&])par=([A-Za-z0-9-]{1,20})/.exec(location.hash);
  if (m) cod = m[1];
  if (location.hash) try { history.replaceState(null, "", location.pathname + location.search); } catch {}
  $("#par-codigo").value = cod;
  $("#par-nome").value = /iPhone/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Celular";
  const d = ler();
  if (d?.pc && !d.revogado && !cod) {
    mostrar("sessoes");
    let pausado = false;
    try { pausado = sessionStorage.getItem(chavePausa) === d.dev; } catch {}
    if (pausado) desenharPc(); else iniciarConexao();
  } else if (!cod && listar().some((p) => !p.revogado)) {
    mostrar("pcs");   // sem PC ativo valido, mas ha outros pareados: escolher onde conectar
  } else {
    mostrar("parear");
    if (d?.revogado) {
      setEstado("", "Revogado");
      msg("#par-msg", "Este aparelho foi revogado no PC.", true);
    }
  }
  cel.pronto = true;
}
