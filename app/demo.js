// ================= 🎬 Modo demonstração =================
// "Filme de hacker" para mostrar o app: a aba anima comandos, painéis e gráficos sozinha.
// É SÓ ANIMAÇÃO: nada é executado, nada sai do computador, não grava, não gera evidência, não usa o Python.
// Todos os nomes, endereços (10.x, 192.0.2.x, 198.51.100.x, 203.0.113.x) e alvos são FICTÍCIOS.
// Economiza recursos: só avança enquanto a aba está à vista (outra aba / app minimizado = pausa).
// Acesso: botão direito na aba → escolha a simulação. Esc para · qualquer tecla acelera.
//
// Padrão de nomes: "<Categoria> · <Nome curto>" + descrição de 1 linha. O id é curto e estável.

const DEMO = (() => {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (l) => l[r(0, l.length - 1)];
  const hex = (n) => [...Array(n)].map(() => "0123456789abcdef"[r(0, 15)]).join("");
  const ip = () => `10.${r(10, 60)}.${r(0, 254)}.${r(2, 250)}`;
  const ipDoc = () => pick(["192.0.2.", "198.51.100.", "203.0.113."]) + r(2, 254);   // faixas de documentação (RFC 5737)
  const C = { v: "\x1b[1;32m", vc: "\x1b[32m", a: "\x1b[1;33m", az: "\x1b[1;34m", ci: "\x1b[36m", vm: "\x1b[1;31m",
              mg: "\x1b[35m", c: "\x1b[90m", b: "\x1b[1m", z: "\x1b[0m" };
  const PROMPT = () => `${C.v}root@dassh-ops${C.z}:${C.az}~${C.z}# `;
  const HOSTS = ["core-sw01", "dist-sw02", "edge-fw01", "srv-db-07", "srv-app-12", "bkp-nas01", "wlc-ctrl03", "lb-vip-02"];
  // cidades inventadas, só com coordenadas aproximadas para o mapa
  const CIDADES = [["Nova Aurora", -74, 41], ["Vale Cinza", -122, 38], ["Borealis", -100, 56], ["Porto Ventura", -46, -23],
    ["Atalaia", -60, -33], ["Fjordheim", -20, 65], ["Miravel", 2, 47], ["Solvang", 18, 60], ["Kaldera", 38, 55], ["Qadira", 54, 24],
    ["Sahel Alto", 4, 12], ["Ombara", 27, -26], ["Veridia", 78, 18], ["Linhai", 117, 32], ["Tarsis", 138, 37], ["Austrina", 147, -32],
    ["Taiga-9", 100, 62]];
  return { r, pick, hex, ip, ipDoc, C, PROMPT, HOSTS, CIDADES };
})();

// Catálogo: id → categoria, nome curto e descrição de 1 linha. O menu agrupa por categoria nesta ordem.
const DEMO_CATEGORIAS = ["Cinema", "Inteligência", "Operações", "Espaço", "Ciência", "Rede"];
const SIMULACOES = {
  cinema:     { cat: "Cinema", nome: "Invasão clássica", desc: "Varredura, \"quebra\" de chave, logs e ACCESS GRANTED — o clássico de filme" },
  matrix:     { cat: "Cinema", nome: "Chuva de código", desc: "Cascata de glifos em tela cheia que revela uma mensagem" },
  cofre:      { cat: "Cinema", nome: "Cofre biométrico", desc: "Digital e íris escaneadas até o ACESSO CONCEDIDO" },
  quantico:   { cat: "Cinema", nome: "Quebra quântica", desc: "Matriz de qubits em superposição colapsando na chave" },
  mainframe:  { cat: "Cinema", nome: "Mainframe 1983", desc: "Fósforo verde, logon negado e override autorizado" },
  mapa:       { cat: "Inteligência", nome: "Mapa de ataques", desc: "Mapa-múndi com rotas de ataque acendendo entre cidades" },
  trace:      { cat: "Inteligência", nome: "Rastreio de origem", desc: "Salto a salto pelo mundo até localizar o invasor" },
  radar:      { cat: "Inteligência", nome: "Radar de varredura", desc: "Feixe girando, contatos acendendo e tabela de alvos" },
  soc:        { cat: "Operações", nome: "SOC ao vivo", desc: "Painel de alertas com correlação e resposta do defensor" },
  guerra:     { cat: "Operações", nome: "Sala de guerra", desc: "Quatro painéis ao vivo: tráfego, alertas, nós e ameaça" },
  contencao:  { cat: "Operações", nome: "Contenção de incidente", desc: "Contagem regressiva e checklist até INCIDENTE CONTIDO" },
  datacenter: { cat: "Operações", nome: "Telemetria de datacenter", desc: "Racks piscando, mapa de calor, energia e rede" },
  satelite:   { cat: "Espaço", nome: "Uplink de satélite", desc: "Globo girando, órbita, feixe de enlace e telemetria" },
  estelar:    { cat: "Espaço", nome: "Salto hiperespacial", desc: "Campo estelar, contagem, salto e chegada a um planeta" },
  dna:        { cat: "Ciência", nome: "Sequenciamento de DNA", desc: "Dupla hélice girando, leituras e perfil compatível" },
  rosto:      { cat: "Ciência", nome: "Reconstrução facial", desc: "Malha 3D, varredura e identificação de um rosto fictício" },
  falha:      { cat: "Rede", nome: "Falha de stack", desc: "Membro do stack cai: sintomas, diagnóstico e conclusão (treino)" },
  portas:     { cat: "Rede", nome: "Auditoria de portas", desc: "Portas expostas num laboratório fictício, com recomendações" },
};
const demoNomeCompleto = (id) => { const s = SIMULACOES[id] || SIMULACOES.cinema; return `${s.cat} · ${s.nome}`; };

function demoAtivo(a) { return a && a.demo && a.demo.on && abas.has(a.id); }

function demoTecla(a, d) {
  if (d === "\x1b") return demoParar(a);
  a.demo.turbo = Date.now() + 1500;   // "digitação de hacker": apertar teclas acelera
}

function demoParar(a) {
  if (!a.demo) return;
  a.demo.on = false; a.demo = null;
  a.term.write("\x1b[0m\x1b[r\x1b[?25h\x1b[2J\x1b[H\x1b[90m[demonstração encerrada]\x1b[0m\r\n");
  a.nome = "Nova aba"; a.tipo = tipoTopo(); setConectado(a, false);
  toast("Demonstração encerrada");
}

function demoIniciar(a, tipo = "cinema") {
  if (!SIMULACOES[tipo]) tipo = "cinema";
  if (a.conectado) a = novaAba("powershell");        // nunca em cima de uma sessão real
  if (!a) return;
  a.demo = { on: true, turbo: 0, tipo };
  a.nome = "🎬 " + SIMULACOES[tipo].nome; a.btn.querySelector(".nome").textContent = a.nome;
  a.btn.querySelector(".ponto").classList.add("on");
  arrumarAbas(); ativar(a.id);
  toast(`🎬 ${demoNomeCompleto(tipo)} — simulação, dados FICTÍCIOS · Esc para parar · qualquer tecla acelera`);
  demoRodar(a);
}

// ---------- utilidades das demos gráficas ----------
const DEMO_BR = [[1, 8], [2, 16], [4, 32], [64, 128]];   // bits do braille por (linha, coluna) do subpixel
const demoHash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const demoSemAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
// fonte 3x5 (cada "pixel" vira 2 colunas) para letreiros grandes
const DEMO_FONTE = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111",
  9: "111101111001110", ":": "000010000010000", "-": "000000111000000", ".": "000000000000010", "!": "010010010000010",
  " ": "000000000000000",
};

// continentes em polígonos grosseiros (lon, lat) → bitmap 1° para mapa plano e globo
const DEMO_TERRA = (() => {
  const P = [
    [[-168, 66], [-162, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 73], [-65, 62], [-55, 52], [-66, 45], [-75, 36], [-81, 25],
     [-90, 29], [-97, 26], [-97, 20], [-88, 15], [-83, 9], [-78, 8], [-90, 14], [-105, 20], [-112, 30], [-118, 34], [-124, 40],
     [-125, 48], [-135, 58], [-150, 60], [-165, 60]],
    [[-55, 60], [-42, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 77], [-55, 70]],
    [[-24, 63.5], [-13, 63.5], [-13, 66.5], [-24, 66.5]],
    [[-78, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -55], [-75, -50], [-72, -30],
     [-70, -18], [-80, -5], [-80, 2]],
    [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [3, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [60, 70], [80, 73],
     [100, 77], [120, 73], [140, 72], [160, 70], [180, 68], [180, 65], [170, 60], [160, 58], [155, 50], [140, 47], [130, 42], [127, 35],
     [122, 30], [120, 22], [108, 20], [105, 10], [100, 13], [98, 8], [93, 20], [88, 22], [80, 15], [77, 8], [72, 20], [66, 25],
     [57, 25], [52, 27], [48, 30], [50, 25], [56, 22], [52, 15], [43, 13], [35, 28], [35, 34], [30, 37], [27, 40], [20, 40], [15, 38],
     [12, 44], [3, 42], [-5, 36]],
    [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 13], [51, 12], [40, -5], [40, -15], [35, -25],
     [20, -35], [17, -30], [12, -15], [13, -5], [9, 4], [-5, 5], [-15, 10]],
    [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [130, -32], [115, -35]],
    [[-5, 50], [2, 51], [0, 54], [-3, 59], [-6, 57]],
    [[130, 31], [135, 34], [141, 36], [142, 43], [140, 41], [132, 34]],
    [[95, 5], [105, -6], [115, -8], [120, -5], [110, 0], [100, 3]],
    [[44, -25], [50, -15], [47, -13], [43, -20]],
    [[166, -46], [174, -41], [178, -38], [172, -34], [168, -44]],
  ];
  const caixa = P.map((p) => [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[1]))]);
  const dentro = (x, y, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  let bm = null;
  return (lat, lon) => {
    if (!bm) {
      bm = new Uint8Array(180 * 360);
      for (let la = 0; la < 180; la++) for (let lo = 0; lo < 360; lo++) {
        const y = la - 89.5, x = lo - 179.5;
        bm[la * 360 + lo] = P.some((p, k) => x >= caixa[k][0] && x <= caixa[k][1] && y >= caixa[k][2] && y <= caixa[k][3] && dentro(x, y, p)) ? 1 : 0;
      }
    }
    lon = (((lon + 180) % 360) + 360) % 360;
    const la = Math.max(0, Math.min(179, Math.floor(lat + 90)));
    return bm[la * 360 + Math.floor(lon)] === 1;
  };
})();

// mapa plano em braille: costa contínua, interior pontilhado
const demoMapa = (() => {
  const cache = {};
  return (w, h, topo, base) => {
    const k = [w, h, topo, base].join();
    if (cache[k]) return cache[k];
    const PW = w * 2, PH = h * 4, px = [];
    for (let y = 0; y < PH; y++) {
      const lin = [];
      for (let x = 0; x < PW; x++) lin.push(DEMO_TERRA(topo - (y + 0.5) / PH * (topo - base), -180 + (x + 0.5) / PW * 360));
      px.push(lin);
    }
    const terra = (x, y) => y >= 0 && y < PH && x >= 0 && x < PW && px[y][x];
    const out = [];
    for (let cy = 0; cy < h; cy++) {
      let s = "";
      for (let cx = 0; cx < w; cx++) {
        let b = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 2; sx++) {
          const x = cx * 2 + sx, y = cy * 4 + sy;
          if (!px[y][x]) continue;
          const costa = !terra(x - 1, y) || !terra(x + 1, y) || !terra(x, y - 1) || !terra(x, y + 1);
          if (costa || (x % 2 === 0 && y % 2 === 0)) b |= DEMO_BR[sy][sx];
        }
        s += b ? String.fromCharCode(0x2800 + b) : " ";
      }
      out.push(s);
    }
    return (cache[k] = out);
  };
})();

// globo ortográfico em braille, girando (lon0 em radianos)
function demoGlobo(T, gx, gy, R, lon0, tilt = 0.35, cores = { terra: 34, sombra: 22, borda: 37, grade: 24 }) {
  const sp = Math.sin(tilt), cp = Math.cos(tilt), cw = Math.ceil(R / 2) + 1, chh = Math.ceil(R / 4) + 1, G = 180 / Math.PI;
  for (let j = -chh; j <= chh; j++) for (let i = -cw; i <= cw; i++) {
    let bt = 0, bg = 0, terra = 0, borda = 0, dentro = 0, sx2 = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 2; sx++) {
      const px = (i * 2 + sx - 0.5) / R, py = (j * 4 + sy - 1.5) / R, rr = px * px + py * py;
      if (rr > 1) continue;
      dentro++; sx2 += px;
      const rho = Math.sqrt(rr);
      if (rho > 0.96) { bt |= DEMO_BR[sy][sx]; borda++; continue; }
      const y = -py, c = Math.asin(rho), sc = Math.sin(c), cc = Math.cos(c);
      const lat = rho ? Math.asin(cc * sp + y * sc * cp / rho) : tilt;
      const lon = lon0 + Math.atan2(px * sc, rho * cc * cp - y * sc * sp);
      const la = lat * G, lo = lon * G;
      if (DEMO_TERRA(la, lo)) { bt |= DEMO_BR[sy][sx]; terra++; }
      else {
        const ma = ((la % 30) + 30) % 30, mo = ((lo % 30) + 30) % 30;
        if ((ma < 1.3 || mo < 1.3) && (sx + sy) % 2 === 0) bg |= DEMO_BR[sy][sx];
      }
    }
    if (!dentro) continue;
    const bits = terra || borda ? bt : bg;
    const cor = terra ? (sx2 / dentro > 0.45 ? cores.sombra : cores.terra) : borda ? cores.borda : cores.grade;
    T.put(gx + i, gy + j, bits ? String.fromCharCode(0x2800 + bits) : " ", cor);
  }
}

// tela 100x30 desenhada por quadros (só reescreve as linhas que mudaram) + selo SIMULAÇÃO
function demoTela(t, vivo) {
  const W = 100, H = 30, T = { W, H };
  let ch, fg, bg, ant = [], fundo = -1;
  T.cls = (f = 252, b = -1) => {
    fundo = b; ch = []; fg = []; bg = [];
    for (let y = 0; y < H; y++) { ch.push(Array(W).fill(" ")); fg.push(Array(W).fill(f)); bg.push(Array(W).fill(b)); }
  };
  T.reset = () => { ant = []; t.write("\x1bc\x1b[?25l"); T.cls(); };
  T.put = (x, y, s, f = 252, b = fundo) => {
    x = Math.round(x); y = Math.round(y);
    if (y < 0 || y >= H) return;
    let i = 0;
    for (const c of String(s)) {
      const xx = x + i++;
      if (xx < 0 || xx >= W) continue;
      ch[y][xx] = c; if (f != null) fg[y][xx] = f; if (b != null) bg[y][xx] = b;
    }
  };
  T.ch = (x, y) => (ch[Math.round(y)] || [])[Math.round(x)];
  T.cen = (y, s, f, b) => T.put(Math.floor((W - [...String(s)].length) / 2), y, s, f, b);
  T.fill = (x, y, w, h, c = " ", f = 252, b = fundo) => { for (let j = 0; j < h; j++) T.put(x, y + j, c.repeat(Math.max(0, w)), f, b); };
  T.box = (x, y, w, h, f = 240, tit = "", tf = 252, dupla = false, b = null) => {
    const [a, bb, c, d, hz, vt] = dupla ? ["╔", "╗", "╚", "╝", "═", "║"] : ["┌", "┐", "└", "┘", "─", "│"];
    T.put(x, y, a + hz.repeat(w - 2) + bb, f, b);
    for (let j = 1; j < h - 1; j++) { T.put(x, y + j, vt, f, b); T.put(x + w - 1, y + j, vt, f, b); }
    T.put(x, y + h - 1, c + hz.repeat(w - 2) + d, f, b);
    if (tit) T.put(x + 2, y, ` ${tit} `, tf, b);
  };
  const cl = (v) => Math.max(0, Math.min(1, v));
  T.bar = (x, y, w, fr, f = 46, fu = 237) => {
    const tot = cl(fr) * w, n = Math.floor(tot), p = Math.floor((tot - n) * 8);
    T.put(x, y, "█".repeat(n), f);
    if (n < w) { T.put(x + n, y, p ? "▏▎▍▌▋▊▉"[p - 1] : "·", p ? f : fu); T.put(x + n + 1, y, "·".repeat(Math.max(0, w - n - 1)), fu); }
  };
  T.spark = (x, y, arr, f = 46) => T.put(x, y, arr.map((v) => "▁▂▃▄▅▆▇█"[Math.floor(cl(v) * 7.99)]).join(""), f);
  T.vcol = (x, yb, h, fr, f = 46) => {
    const tot = cl(fr) * h, n = Math.floor(tot), p = Math.floor((tot - n) * 8);
    for (let k = 0; k < n; k++) T.put(x, yb - k, "█", f);
    if (n < h && p) T.put(x, yb - n, "▁▂▃▄▅▆▇"[p - 1], f);
  };
  T.bigW = (s, pl = 2) => [...demoSemAcento(s)].length * pl * 4 - pl;
  T.big = (x, y, s, f = 46, px = "██", b) => {
    let cx = x;
    for (const c of demoSemAcento(s)) {
      const g = DEMO_FONTE[c] || DEMO_FONTE[" "];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") T.put(cx + i * px.length, y + j, px, f, b);
      cx += px.length * 4;
    }
  };
  T.bigC = (y, s, f, px = "██", b) => T.big(Math.floor((W - T.bigW(s, px.length)) / 2), y, s, f, px, b);
  T.linha = (x0, y0, x1, y1, fn) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, i = 0;
    for (;;) {
      fn(i++, x0, y0);
      if ((x0 === x1 && y0 === y1) || i > 400) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  };
  T.show = () => {
    if (!vivo()) return;
    T.put(W - 11, 0, "◆ SIMULAÇÃO", 214, 236);
    let out = "";
    for (let y = 0; y < H; y++) {
      let s = "", cf = null, cb = null;
      for (let x = 0; x < W; x++) {
        const f = fg[y][x], b = bg[y][x];
        if (f !== cf || b !== cb) { s += `\x1b[0;38;5;${f}${b >= 0 ? `;48;5;${b}` : ""}m`; cf = f; cb = b; }
        s += ch[y][x];
      }
      if (s !== ant[y]) { out += `\x1b[${y + 1};1H` + s; ant[y] = s; }
    }
    if (out) t.write(out + "\x1b[0m");
  };
  T.cls();
  return T;
}

async function demoRodar(a) {
  const { r, pick, hex, ip, ipDoc, C, PROMPT, HOSTS, CIDADES } = DEMO, t = a.term, eu = a.demo;
  const vivo = () => demoAtivo(a) && a.demo === eu;
  const tick = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const pausa = async (ms) => {        // tempo só corre com a aba à vista (poupa CPU e bateria)
    let feito = 0;
    while (feito < ms && vivo()) {
      if (a.id === ativa && !document.hidden) feito += Date.now() < a.demo.turbo ? 160 : 40;
      await tick(40);
    }
  };
  const dig = async (txt, vel = 42) => { for (const ch of txt) { if (!vivo()) return; t.write(ch); await pausa(vel * (0.4 + Math.random())); } };
  const cmd = async (c, host) => { t.write(host ? `${C.v}admin@${host}${C.z}> ` : PROMPT()); await pausa(350); await dig(c); await pausa(300); t.write("\r\n"); };
  const ln = async (arr, ms = 45) => { for (const l of arr) { if (!vivo()) return; t.write(l + "\r\n"); await pausa(ms * (0.5 + Math.random())); } };
  const barra = async (rot, larg = 36, vel = 70) => {
    for (let p = 0; p <= 100 && vivo(); p += r(2, 9)) {
      const n = Math.round(larg * Math.min(p, 100) / 100);
      t.write(`\r${rot.padEnd(24)} ${C.vc}[${"█".repeat(n)}${C.c}${"░".repeat(larg - n)}${C.vc}]${C.z} ${String(Math.min(p, 100)).padStart(3)}%`);
      await pausa(vel);
    }
    t.write(`\r${rot.padEnd(24)} ${C.vc}[${"█".repeat(larg)}]${C.z} 100% ${C.v}OK${C.z}\r\n`);
  };
  // demos de texto: linha 1 fixa com o selo, o resto rola (região de rolagem 2–30)
  const limpa = () => t.write("\x1bc\x1b[2;30r\x1b[1;1H\x1b[0;38;5;240m  DASSH · modo demonstração · " + demoNomeCompleto(eu.tipo) +
    "\x1b[1;90H\x1b[0;38;5;214;48;5;236m◆ SIMULAÇÃO\x1b[0m\x1b[2;1H");
  // demos gráficas: quadros desenhados numa tela 100x30
  const T = demoTela(t, vivo);
  const quadros = async (n, ms, fn) => { for (let f = 0; f < n && vivo(); f++) { const fim = fn(f); T.show(); if (fim === true) break; await pausa(ms); } };
  const hora = () => new Date().toTimeString().slice(0, 8);
  const cl = (v, a0 = 0, b0 = 1) => Math.max(a0, Math.min(b0, v));
  const PI2 = Math.PI * 2;

  const CENAS = [
    async () => {   // abertura
      limpa(); await ln([
        `${C.v}  ██████╗  █████╗ ███████╗███████╗██╗  ██╗`, `  ██╔══██╗██╔══██╗██╔════╝██╔════╝██║  ██║`,
        `  ██║  ██║███████║███████╗███████╗███████║`, `  ██║  ██║██╔══██║╚════██║╚════██║██╔══██║`,
        `  ██████╔╝██║  ██║███████║███████║██║  ██║`, `  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝${C.z}`,
        `${C.c}  network operations · secure shell · v${r(3, 9)}.${r(0, 9)}.${r(0, 40)}${C.z}`, ""], 60);
      for (const m of ["kernel modules", "crypto engine (AES-256-GCM)", "packet capture driver", "telemetry collector", "secure tunnel"]) {
        t.write(`  [ ${C.a}....${C.z} ] loading ${m}`); await pausa(r(250, 700)); t.write(`\r  [  ${C.v}OK${C.z}  ] loading ${m}\r\n`);
      }
    },
    async () => {   // varredura da rede
      const rede = `10.${r(10, 60)}.${r(0, 254)}.0/24`;
      await cmd(`nmap -sS -sV -T4 --open ${rede}`);
      await ln([`${C.c}Starting Nmap 7.95 ( https://nmap.org )${C.z}`]);
      for (let i = 0; i < r(4, 7) && vivo(); i++) {
        const h = ip().replace(/\.\d+\.\d+$/, "") + `.${r(0, 254)}.${r(2, 250)}`;
        await ln([``, `Nmap scan report for ${C.b}${pick(HOSTS)}${C.z} (${h})`, `Host is up (0.00${r(10, 99)}s latency).`,
          `${C.c}PORT     STATE SERVICE  VERSION${C.z}`], 50);
        const portas = [["22/tcp", "ssh", "OpenSSH 9.6"], ["443/tcp", "https", "nginx 1.26"], ["161/udp", "snmp", "SNMPv3"],
                        ["3389/tcp", "ms-wbt", "Microsoft Terminal Services"], ["5432/tcp", "postgres", "PostgreSQL 16"], ["8443/tcp", "https-alt", "iDRAC 9"]];
        for (const [p, s, v] of portas.sort(() => Math.random() - 0.5).slice(0, r(2, 4)))
          await ln([`${p.padEnd(8)} ${C.v}open${C.z}  ${s.padEnd(8)} ${v}`], 40);
      }
      await ln(["", `${C.a}Nmap done:${C.z} 256 IP addresses (${r(18, 60)} hosts up) scanned in ${r(4, 19)}.${r(10, 99)} seconds`]);
    },
    async () => {   // switch core
      const host = pick(HOSTS.slice(0, 3));
      await cmd(`ssh admin@${host}`);
      await ln([`${C.c}Authenticated with key ed25519 SHA256:${hex(43)}${C.z}`, "", `Info: The max number of VTY users is 15.`, ""], 70);
      await cmd("display version", host);
      await ln([`Huawei YunShan OS`, `Version 1.${r(20, 24)}.0.1 (S5732 V200R0${r(20, 24)}C10)`, `Copyright (C) 2021-2026 Huawei Technologies Co., Ltd.`,
        `HUAWEI S5732-H48UM2CC Routing Switch uptime is ${r(10, 300)} days, ${r(1, 23)} hours, ${r(1, 59)} minutes`], 50);
      await cmd("display interface brief | include up", host);
      for (let i = 1; i <= r(6, 10) && vivo(); i++)
        await ln([`MultiGE0/0/${i}`.padEnd(22) + `${C.v}up${C.z}     ${C.v}up${C.z}      ${r(0, 40)}%  ${r(0, 40)}%   0   0`], 35);
    },
    async () => {   // descriptografando
      await cmd(`./decrypt --cipher aes-256-gcm --input capture_${hex(6)}.bin`);
      for (let i = 0; i < r(14, 22) && vivo(); i++) {
        const end = (0x7f3a0000 + i * 16).toString(16);
        const bytes = [...Array(16)].map(() => hex(2)).join(" ");
        const asc = [...Array(16)].map(() => String.fromCharCode(r(33, 126))).join("");
        await ln([`${C.c}${end}${C.z}  ${C.vc}${bytes}${C.z}  ${C.c}|${asc}|${C.z}`], 25);
      }
      await barra("  derivando chave");
      await barra("  validando integridade", 36, 45);
      await ln([`  ${C.v}✔ KEY MATCH${C.z}  ${C.b}${hex(8)}-${hex(4)}-${hex(4)}-${hex(12)}${C.z}`, ""]);
    },
    async () => {   // logs ao vivo
      await cmd("tail -f /var/log/secure-gateway.log");
      const ev = [[C.v, "INFO ", "session established"], [C.ci, "INFO ", "tunnel rekey completed"], [C.a, "WARN ", "latency above threshold"],
                  [C.v, "INFO ", "config backup stored"], [C.vm, "ALERT", "blocked inbound probe"], [C.ci, "INFO ", "health check passed"]];
      for (let i = 0; i < r(18, 30) && vivo(); i++) {
        const [cor, nv, msg] = pick(ev), d = new Date();
        await ln([`${C.c}${d.toTimeString().slice(0, 8)}.${String(r(0, 999)).padStart(3, "0")}${C.z} ${cor}${nv}${C.z} ${pick(HOSTS).padEnd(11)} ${msg} ${C.c}src=${ip()}${C.z}`], 90);
      }
      await ln([`${C.c}^C${C.z}`]);
    },
    async () => {   // implantação
      await cmd("deploy --cluster prod-edge --strategy rolling");
      for (const m of ["auth-service", "telemetry-agent", "policy-engine", "edge-proxy"]) await barra(`  ${m.padEnd(16)}`, 30, 50);
      await ln([`  ${C.v}✔ rollout concluído${C.z} — ${r(12, 48)}/${r(48, 48)} nós saudáveis · ${r(0, 2)} reinícios`, ""]);
    },
    async () => {   // acesso
      await pausa(400);
      const L = 46, lin = (s) => `${C.v}  ║${C.z}${s.padStart(Math.floor((L + s.length) / 2)).padEnd(L)}${C.v}║${C.z}`;
      await ln([`${C.v}  ╔${"═".repeat(L)}╗`, lin(""), `${C.v}  ║${C.z}${C.b}${"ACCESS GRANTED".padStart(30).padEnd(L)}${C.z}${C.v}║`,
        lin(`session ${hex(4)}-${hex(4)} · clearance level ${r(3, 5)}`), lin(""), `${C.v}  ╚${"═".repeat(L)}╝${C.z}`, ""], 90);
      await pausa(2200);
    },
  ];
  const SIM = (txt) => ln([`${C.a}  ╔═ SIMULAÇÃO ═╗ ${txt} · dados FICTÍCIOS, nada é executado${C.z}`, ""], 30);
  const OUTRAS = {
    soc: [
      async () => {
        limpa(); await SIM("SOC ao vivo");
        await ln([`${C.b}  DASSH SOC · painel de eventos · turno ${r(1, 3)}${C.z}`, `${C.c}  hora      sev    origem            alvo         evento${C.z}`], 50);
        const ev = [["ALTA", C.vm, "varredura de portas"], ["MÉDIA", C.a, "falhas de login SSH repetidas"], ["BAIXA", C.ci, "certificado perto de expirar"],
                    ["ALTA", C.vm, "tráfego anômalo para fora"], ["MÉDIA", C.a, "mudança de configuração fora da janela"]];
        let alta = 0, tot = 0;
        for (let i = 0; i < r(14, 20) && vivo(); i++) {
          const [sv, cor, m] = pick(ev); tot++; if (sv === "ALTA") alta++;
          await ln([`  ${new Date().toTimeString().slice(0, 8)}  ${cor}${sv.padEnd(5)}${C.z}  ${ip().padEnd(16)}  ${pick(HOSTS).padEnd(11)}  ${m}`], 120);
        }
        await ln(["", `  ${C.b}Resumo:${C.z} ${tot} eventos · ${C.vm}${alta} alta${C.z}`], 60);
      },
      async () => {
        await ln([`${C.a}  [correlação]${C.z} 3 eventos de alta gravidade com a mesma origem em 90 s`], 80);
        const alvo = ip(); await cmd(`dassh-defesa isolar --origem ${alvo} --simulado`);
        await barra("  aplicando bloqueio", 30, 50);
        await ln([`  ${C.v}✔ origem ${alvo} bloqueada${C.z} (simulação) · ticket ${hex(6)} aberto`, ""]);
      },
    ],
    falha: [
      async () => {
        limpa(); await SIM("treino: falha em stack de switches");
        const host = "SW-BANCADA"; await cmd("display stack", host);
        await ln([`${C.c}MemberID  Role     MAC             Priority  Device Type${C.z}`, `*1         Master   0200-0000-0001  200       S5732-H48UM4Y2CZ-V2`,
                  ` 2         ${C.vm}Absent${C.z}   0200-0000-0002  100       S5732-H48UM4Y2CZ-V2`], 120);
        await cmd("display logbuffer | include STACK", host);
        await ln([`${C.a}Nov 18 15:${r(10, 59)}:${r(10, 59)} ${host} %%01STACKMNG/4/STACK_LINK_DOWN: stack port 1/1 link down${C.z}`,
                  `${C.vm}Nov 18 15:${r(10, 59)}:${r(10, 59)} ${host} %%01STACKMNG/2/MEMBER_LEAVE: member 2 left the stack${C.z}`], 150);
      },
      async () => {
        const host = "SW-BANCADA";
        await ln([`${C.ci}  [diagnóstico]${C.z} 1) cabo/óptica do stack  2) energia do membro 2  3) mesma versão de software`], 90);
        await cmd("display stack port", host);
        await ln([`Stack-Port  Status   Neighbor`, `1/1         ${C.vm}down${C.z}     -`, `1/2         ${C.v}up${C.z}       2/2`], 120);
        await cmd("display device power", host);
        await ln([`PWR1  Present  ${C.v}Normal${C.z}`, `PWR2  ${C.vm}Absent / Abnormal${C.z}   ${C.a}← membro 2 sem energia${C.z}`], 120);
        await ln(["", `  ${C.b}Conclusão (simulada):${C.z} religar a fonte do membro 2; a stack volta a ${C.v}Standby${C.z} sozinha em ~${r(2, 4)} min.`, ""], 70);
      },
    ],
    portas: [
      async () => {
        limpa(); await SIM("auditoria de portas expostas (laboratório)");
        const rede = `192.0.2.0/24`; await cmd(`dassh-audit portas --escopo ${rede} --nivel diagnostico`);
        await ln([`${C.c}  escopo: ${rede} (RFC 5737, fictício) · nível: diagnóstico, sem exploração${C.z}`], 60);
        await barra("  descoberta de hosts", 32, 50);
        const portas = [["23/tcp", "telnet", "ALTA"], ["161/udp", "snmp v2c", "MÉDIA"], ["80/tcp", "http", "MÉDIA"], ["443/tcp", "https", "BAIXA"], ["3389/tcp", "rdp", "ALTA"], ["22/tcp", "ssh", "BAIXA"]];
        await ln([`${C.c}  host          porta     serviço      risco${C.z}`], 50);
        for (let i = 0; i < r(8, 12) && vivo(); i++) {
          const [pt, sv, rk] = pick(portas), cor = rk === "ALTA" ? C.vm : rk === "MÉDIA" ? C.a : C.v;
          await ln([`  192.0.2.${r(2, 250)}`.padEnd(16) + `${pt.padEnd(9)} ${sv.padEnd(12)} ${cor}${rk}${C.z}`], 90);
        }
      },
      async () => {
        await ln(["", `  ${C.b}Recomendações:${C.z}`, `   • desativar Telnet e usar SSH nos equipamentos de rede`, `   • restringir RDP à VPN/jump host`,
                  `   • migrar SNMP v2c para SNMPv3`, `   • publicar apenas 443 para fora`, "", `  ${C.v}✔ relatório gerado (simulação)${C.z}`, ""], 90);
        await pausa(1500);
      },
    ],

    // ===================== demos gráficas (quadros) =====================
    matrix: [async () => {
      T.reset();
      const G = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:.=*+<>|";
      const gl = () => G[r(0, G.length - 1)];
      const nova = (c) => { c.y = -r(0, 30); c.v = 0.25 + Math.random() * 0.85; c.n = r(6, 26); return c; };
      const cols = [...Array(100)].map(() => nova({}));
      const gli = [...Array(30)].map(() => [...Array(100)].map(gl));
      const frase = [...pick(["ACESSO AO NÚCLEO LIBERADO", "O SINAL VEM DE DENTRO DA REDE", "DASSH · TODOS OS CANAIS ONLINE",
        "NADA DISTO É REAL · SIMULAÇÃO", "SIGA O FLUXO DE DADOS", "BEM-VINDO AO OUTRO LADO DO TERMINAL"])];
      const L = frase.length, fx = Math.floor((100 - L) / 2);
      const RASTRO = [46, 46, 40, 34, 28, 22, 22];
      await quadros(460, 50, (f) => {
        T.cls(252, 16);
        for (let k = 0; k < 90; k++) gli[r(0, 29)][r(0, 99)] = gl();
        cols.forEach((c, x) => {
          c.y += c.v;
          if (c.y - c.n > 30) nova(c);
          const hy = Math.floor(c.y);
          for (let k = 0; k < c.n; k++) {
            const y = hy - k;
            if (y < 0 || y > 29) continue;
            const cor = k === 0 ? 231 : k === 1 ? 157 : RASTRO[Math.min(6, Math.floor((k - 2) / Math.max(1, c.n - 2) * 7))];
            T.put(x, y, k === 0 ? gl() : gli[y][x], cor);
          }
        });
        if (f > 140 && f < 400) {
          const n = Math.min(L, Math.floor((f - 140) / 3));
          T.fill(fx - 4, 12, L + 8, 5, " ", 46, 16);
          T.box(fx - 4, 12, L + 8, 5, f % 20 < 10 ? 34 : 28, "", 46, true);
          frase.forEach((c, i) => T.put(fx + i, 14, i < n ? c : i < n + 3 ? gl() : " ", i < n ? 231 : 46));
          T.put(fx - 2, 16, ` canal 0x${(f * 7919 % 65536).toString(16).padStart(4, "0")} `, 28);
        }
      });
    }],

    mapa: [async () => {
      T.reset();
      const X0 = 2, Y0 = 2, MW = 96, MH = 20, mapa = demoMapa(MW, MH, 80, -58);
      const pos = (c) => [X0 + (c[1] + 180) / 360 * MW, Y0 + (80 - c[2]) / 138 * MH];
      const TIPOS = [["DDoS", 196], ["varredura", 214], ["força bruta", 201], ["exfiltração", 51], ["botnet C2", 208]];
      const arcos = [], log = [];
      let tot = 0, blq = 0;
      const novo = () => {
        const a0 = pick(CIDADES); let b0 = pick(CIDADES);
        while (b0 === a0) b0 = pick(CIDADES);
        const [x0, y0] = pos(a0), [x1, y1] = pos(b0), [tp, cor] = pick(TIPOS);
        arcos.push({ a0, b0, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: Math.max(1.5, Math.min(y0, y1) - Math.abs(x1 - x0) * 0.16 - 1),
                     p: 0, v: 0.012 + Math.random() * 0.018, tp, cor, imp: -1 });
      };
      await quadros(700, 60, (f) => {
        T.cls();
        T.box(0, 1, 100, MH + 2, 238);
        mapa.forEach((s, j) => T.put(X0, Y0 + j, s, 23));
        CIDADES.forEach((c) => { const [x, y] = pos(c); T.put(x, y, "•", 244); });
        if (arcos.length < 8 && Math.random() < 0.14) novo();
        for (const A of arcos) {
          const bz = (u) => [(1 - u) * (1 - u) * A.x0 + 2 * (1 - u) * u * A.cx + u * u * A.x1, (1 - u) * (1 - u) * A.y0 + 2 * (1 - u) * u * A.cy + u * u * A.y1];
          if (A.imp < 0) {
            A.p = Math.min(1, A.p + A.v);
            for (let k = 0; k < 22; k++) {
              const u = A.p - k * 0.016;
              if (u < 0) break;
              const [x, y] = bz(u);
              T.put(x, y, k === 0 ? "●" : k < 4 ? "•" : "·", k < 7 ? A.cor : 239);
            }
            T.put(A.x0, A.y0, "◉", A.cor);
            if (A.p >= 1) {
              A.imp = 0; tot++;
              const bloq = Math.random() < 0.8; if (bloq) blq++;
              log.unshift([hora(), A.a0[0], A.b0[0], A.tp, ipDoc(), bloq, A.cor]);
              log.length = Math.min(log.length, 5);
            }
          } else {
            A.imp++;
            const rr = A.imp * 0.8;
            for (let k = 0; k < 16; k++) T.put(A.x1 + Math.cos(k / 16 * PI2) * rr * 2, A.y1 + Math.sin(k / 16 * PI2) * rr, "·", A.imp < 4 ? A.cor : 240);
            T.put(A.x1, A.y1, A.imp % 2 ? "◉" : "●", 231);
            const nm = A.b0[0], lx = A.x1 + 2 + nm.length > 97 ? A.x1 - nm.length - 2 : A.x1 + 2;
            T.put(lx, A.y1, nm, 252);
          }
        }
        for (let i = arcos.length - 1; i >= 0; i--) if (arcos[i].imp > 7) arcos.splice(i, 1);
        T.box(0, 23, 100, 7, 238, "EVENTOS", 46);
        T.put(60, 23, ` total ${tot} · bloqueados ${blq} · ativos ${arcos.length} `, 245);
        log.forEach(([h, o, d, tp, ipx, bloq, cor], i) => {
          T.put(2, 24 + i, h, 240);
          T.put(11, 24 + i, o.padEnd(14), 250); T.put(25, 24 + i, "→", cor); T.put(27, 24 + i, d.padEnd(14), 250);
          T.put(42, 24 + i, tp.padEnd(12), cor); T.put(55, 24 + i, ipx.padEnd(16), 245);
          T.put(72, 24 + i, bloq ? "BLOQUEADO" : "MONITORADO", bloq ? 46 : 214);
        });
        T.fill(0, 0, 88, 1, " ");
        T.put(1, 0, "DASSH THREATMAP", 46); T.put(17, 0, `· fluxo global de ameaças (simulado) · ${hora()}`, 245);
      });
    }],

    trace: [async () => {
      T.reset();
      const X0 = 2, Y0 = 2, MW = 96, MH = 19, mapa = demoMapa(MW, MH, 80, -58);
      const pos = (c) => [X0 + (c[1] + 180) / 360 * MW, Y0 + (80 - c[2]) / 138 * MH];
      const rota = [...CIDADES].sort(() => Math.random() - 0.5).slice(0, r(6, 8));
      let rtt = 1;
      const hops = rota.map((c, i) => ({ c, ip: i === 0 ? `10.${r(10, 60)}.${r(0, 254)}.${r(2, 250)}` : ipDoc(), ms: (rtt += i ? r(9, 38) : 0), asn: `AS645${r(10, 99)}` }));
      const N = hops.length - 1;
      const fundo = (n, fr, f) => {
        T.cls();
        T.box(0, 1, 100, MH + 2, 238);
        mapa.forEach((s, j) => T.put(X0, Y0 + j, s, 22));
        CIDADES.forEach((c) => { const [x, y] = pos(c); T.put(x, y, "·", 240); });
        for (let h = 1; h <= n; h++) {
          const [ax, ay] = pos(hops[h - 1].c), [bx, by] = pos(hops[h].c), lim = h < n ? 1 : fr;
          const len = Math.max(Math.abs(Math.round(bx) - Math.round(ax)), Math.abs(Math.round(by) - Math.round(ay)));
          T.linha(ax, ay, bx, by, (i, x, y) => { if (i <= len * lim) T.put(x, y, (i + f) % 4 === 0 ? "•" : "·", h < n || fr >= 1 ? 208 : 196); });
          if (h === n && fr < 1) T.put(ax + (bx - ax) * fr, ay + (by - ay) * fr, "◎", 231);
        }
        for (let h = 0; h <= Math.min(n, N); h++) {
          if (h === n && fr < 1) continue;
          const [x, y] = pos(hops[h].c), nm = hops[h].c[0];
          T.put(x, y, "◉", h === 0 ? 46 : 214);
          T.put(x + 2 + nm.length > 97 ? x - nm.length - 1 : x + 2, y, nm, 250);
        }
        T.box(0, MH + 3, 100, 30 - MH - 3, 238, "SALTOS", 214);
        T.put(2, MH + 4, "HOP  ENDEREÇO          LOCAL             RTT     ASN (fictício)  STATUS", 240);
        const vis = hops.slice(0, n + (fr >= 1 ? 1 : 0)).map((h, i) => [h, i]).slice(-5);
        vis.forEach(([h, i], k) => {
          const y = MH + 5 + k;
          T.put(2, y, String(i).padStart(2, "0"), 250); T.put(7, y, h.ip.padEnd(18), 51); T.put(25, y, h.c[0].padEnd(18), 252);
          T.put(43, y, `${h.ms} ms`.padEnd(8), 245); T.put(51, y, h.asn.padEnd(16), 245);
          T.put(67, y, i === 0 ? "vítima (lab)" : i === N ? "ORIGEM" : "salto", i === N ? 196 : i === 0 ? 46 : 214);
        });
        T.fill(0, 0, 88, 1, " ");
        T.put(1, 0, "DASSH TRACE", 214); T.put(13, 0, "· rastreando a origem da intrusão (simulado)", 245);
      };
      for (let h = 1; h <= N && vivo(); h++) await quadros(24, 55, (f) => fundo(h, f / 23, f));
      const [ox, oy] = pos(hops[N].c).map(Math.round), conf = (94 + Math.random() * 5).toFixed(1).replace(".", ",");
      await quadros(100, 55, (f) => {
        fundo(N, 1, f);
        for (let x = 1; x < 99; x++) if (T.ch(x, oy) === " ") T.put(x, oy, "─", 52);
        for (let y = 2; y < MH + 2; y++) if (T.ch(ox, y) === " ") T.put(ox, y, "│", 52);
        T.put(ox, oy, "╋", f % 6 < 3 ? 196 : 231);
        if (f > 12) {
          const bx = ox > 60 ? ox - 42 : ox + 4, by = oy > 11 ? oy - 8 : oy + 2;
          T.fill(bx, by, 38, 7, " ", 252, 234);
          T.box(bx, by, 38, 7, 196, "ORIGEM LOCALIZADA", 231, true, 234);
          T.put(bx + 2, by + 2, `local   ${hops[N].c[0]}`, 252, 234);
          T.put(bx + 2, by + 3, `endereço ${hops[N].ip}`, 51, 234);
          T.put(bx + 2, by + 4, `confiança ${conf}% · ${N} saltos`, 46, 234);
          T.put(bx + 2, by + 5, "(tudo fictício)", 240, 234);
        }
      });
      await pausa(600);
    }],

    satelite: [async () => {
      T.reset();
      const gx = 30, gy = 15, R = 24, D = Math.PI / 180, TILT = 0.35;
      const est = [-15 * D, -48 * D];
      const estrelas = [...Array(70)].map(() => [r(0, 60), r(1, 29), pick(["·", ".", "·", "+"])]);
      let lon0 = 10 * D, th = r(0, 6), prog = 0, fim = 0, pk = 0, mi = 0, ultimo = 0;
      const snr = [], log = [], tele = { az: r(90, 200), el: 20 };
      const MSG = [[0.01, "AOS · sinal adquirido"], [0.12, "portadora travada · 8PSK"], [0.25, "sincronizando relógio"],
        [0.4, "handshake de sessão OK"], [0.55, "chave de sessão trocada (fictícia)"], [0.7, "telemetria: 412 canais"],
        [0.85, "verificando integridade do enlace"], [1, "UPLINK ESTABELECIDO"]];
      const orb = (u) => [gx + Math.cos(u) * 27, gy + Math.sin(u) * 5.5 - Math.cos(u) * 3.5, Math.sin(u)];
      const noDisco = (x, y) => ((x - gx) / (R / 2)) ** 2 + ((y - gy) / (R / 4)) ** 2 < 1;
      await quadros(3000, 60, (f) => {
        T.cls();
        T.put(1, 0, "DASSH GROUNDLINK", 51); T.put(18, 0, "· estação TERRA-3 → satélite ORBITA-7 (fictícios)", 245);
        estrelas.forEach(([x, y, c]) => T.put(x, y, c, 238));
        lon0 += 0.008; th += 0.028;
        for (let u = 0; u < PI2; u += 0.035) { const [x, y, z] = orb(u); if (z < 0) T.put(x, y, "·", 237); }
        demoGlobo(T, gx, gy, R, lon0, TILT);
        for (let u = 0; u < PI2; u += 0.035) { const [x, y, z] = orb(u); if (z >= 0) T.put(x, y, "·", 241); }
        const [sx, sy, sz] = orb(th), satVis = !(sz < 0 && noDisco(sx, sy));
        const sp = Math.sin(TILT), cp = Math.cos(TILT), [la, lo] = est, dl = lo - lon0;
        const cosc = sp * Math.sin(la) + cp * Math.cos(la) * Math.cos(dl);
        const ex = gx + Math.cos(la) * Math.sin(dl) * R / 2, ey = gy - (cp * Math.sin(la) - sp * Math.cos(la) * Math.cos(dl)) * R / 4;
        const estVis = cosc > 0.15, enlace = satVis && estVis;
        if (enlace) T.linha(ex, ey, sx, sy, (i, x, y) => T.put(x, y, (i + f) % 3 === 0 ? "•" : "·", (i + f) % 3 === 0 ? 51 : 30));
        if (estVis) T.put(ex, ey, "▲", 214);
        if (satVis) { T.put(sx - 1, sy, "=", 250); T.put(sx, sy, "◆", 231); T.put(sx + 1, sy, "=", 250); T.put(sx + 2, sy - 1, "ORBITA-7", 245); }
        tele.az = (tele.az + 0.35) % 360; tele.el = 8 + 62 * Math.abs(Math.sin(th / 2));
        const sv = enlace ? 12 + 4 * Math.sin(f * 0.1) + Math.random() * 2 : 1 + Math.random() * 2;
        snr.push(sv / 20); if (snr.length > 34) snr.shift();
        if (enlace && prog < 1) { prog = Math.min(1, prog + 0.0055); pk += r(40, 140); }
        const tmp = `T+${String(Math.floor(f * 0.06 / 60)).padStart(2, "0")}:${String(Math.floor(f * 0.06) % 60).padStart(2, "0")}`;
        while (mi < MSG.length && prog >= MSG[mi][0]) { log.unshift(`${tmp} ${MSG[mi][1]}`); mi++; }
        if (enlace !== ultimo && f > 0) { log.unshift(`${tmp} ${enlace ? "visada direta: feixe ativo" : "perda de visada (LOS)"}`); ultimo = enlace; }
        log.length = Math.min(log.length, 8);
        if (prog >= 1) fim++;
        const P = 63;
        T.box(61, 1, 39, 29, 24, "TELEMETRIA", 51);
        T.put(P, 3, "SAT     ORBITA-7 · LEO · 548 km", 252);
        T.put(P, 4, `AZIMUTE    ${tele.az.toFixed(1).padStart(6)}°`, 250);
        T.put(P, 5, `ELEVAÇÃO   ${tele.el.toFixed(1).padStart(6)}°`, 250);
        T.put(P, 6, `VELOCIDADE   7.59 km/s`, 250);
        const dop = 12.4 * Math.cos(th);
        T.put(P, 7, `DOPPLER    ${(dop >= 0 ? "+" : "") + dop.toFixed(2)} kHz`, 250);
        T.put(P, 8, `SNR        ${sv.toFixed(1).padStart(5)} dB`, enlace ? 46 : 214);
        T.spark(P, 9, snr, enlace ? 46 : 214);
        T.put(P, 10, `BER        ${enlace ? (1e-7 * (1 + Math.random() * 9)).toExponential(1) : "—"}`, 250);
        T.put(P, 11, `PACOTES    ${pk}`, 250);
        T.put(P, 13, "ENLACE", 245); T.bar(P + 7, 13, 22, prog, prog >= 1 ? 46 : 51); T.put(P + 30, 13, `${Math.round(prog * 100)}%`.padStart(4), 252);
        T.put(P, 14, enlace ? "● FEIXE ATIVO" : estVis ? "○ AGUARDANDO SATÉLITE" : "○ ESTAÇÃO FORA DE VISADA", enlace ? 46 : 214);
        T.put(P, 16, "── registro ──────────────────────", 238);
        log.forEach((l, i) => T.put(P, 17 + i, l.slice(0, 35), i === 0 ? 252 : 244));
        if (prog >= 1) { T.fill(62, 26, 37, 3, " ", 231, 22); T.put(64, 27, "✔ UPLINK ESTABELECIDO", 231, 22); T.put(87, 27, hex(6), 157, 22); }
        return fim > 90;
      });
    }],

    radar: [async () => {
      T.reset();
      const cx = 30, cy = 15, RX = 26, RY = 13;
      const CL = [["HOSTIL?", 196], ["DESCONH.", 214], ["AMIGO", 46], ["CIVIL", 51]];
      const novo = () => { const [cl, cor] = pick(CL); return { id: `TK-${r(10, 99)}`, ang: Math.random() * PI2, d: 0.25 + Math.random() * 0.7,
        va: (Math.random() - 0.5) * 0.006, vd: (Math.random() - 0.6) * 0.004, br: 0, cl, cor, vel: r(120, 940), visto: false }; };
      const alvos = [...Array(6)].map(novo), log = [];
      let a = 0;
      await quadros(900, 50, (f) => {
        T.cls();
        a = (a + 0.075) % PI2;
        T.put(1, 0, "DASSH VIGIA", 46); T.put(13, 0, "· radar de vigilância de área (exercício) · banda X fictícia", 245);
        for (let x = cx - RX; x <= cx + RX; x++) T.put(x, cy, "·", 236);
        for (let y = cy - RY; y <= cy + RY; y++) T.put(cx, y, "·", 236);
        for (let y = 1; y < 30; y++) for (let x = 2; x < 59; x++) {
          const dx = (x - cx) / RX, dy = (y - cy) / RY;
          if (dx * dx + dy * dy > 1) continue;
          const dif = ((a - Math.atan2(dy, dx)) % PI2 + PI2) % PI2;
          if (dif < 1.3) { const k = dif / 1.3; T.put(x, y, k < 0.03 ? "▓" : " ", 46, k < 0.03 ? 40 : k < 0.12 ? 34 : k < 0.3 ? 28 : k < 0.6 ? 22 : 234); }
        }
        for (const k of [1 / 3, 2 / 3, 1]) for (let u = 0; u < PI2; u += 0.02) T.put(cx + Math.cos(u) * RX * k, cy + Math.sin(u) * RY * k, "·", k === 1 ? 40 : 34, null);
        T.put(cx, cy - RY - 1, "N", 46); T.put(cx, cy + RY + 1, "S", 46); T.put(cx - RX - 2, cy, "O", 46); T.put(cx + RX + 2, cy, "L", 46);
        T.put(cx + RX / 3 + 1, cy - 1, "27", 28); T.put(cx + RX * 2 / 3 + 1, cy - 1, "53", 28); T.put(cx + RX - 3, cy - 1, "80km", 28);
        for (let i = 0; i < alvos.length; i++) {
          const o = alvos[i];
          o.ang += o.va; o.d += o.vd;
          if (o.d > 1.0 || o.d < 0.06) { log.unshift([hora(), `${o.id} saiu do alcance`, 240]); alvos[i] = novo(); continue; }
          const dif = ((a - o.ang) % PI2 + PI2) % PI2;
          if (dif < 0.12) { if (!o.visto) { o.visto = true; log.unshift([hora(), `novo contato ${o.id} · ${o.cl}`, o.cor]); } o.br = 1; }
          o.br *= 0.975;
          if (o.br > 0.06) {
            const x = cx + Math.cos(o.ang) * o.d * RX, y = cy + Math.sin(o.ang) * o.d * RY;
            T.put(x, y, o.br > 0.55 ? "◆" : "◇", o.br > 0.55 ? o.cor : o.br > 0.25 ? 244 : 238, null);
            if (o.br > 0.3) T.put(x + 2, y, o.id, 250, null);
          }
        }
        if (Math.random() < 0.004 && alvos.length < 9) alvos.push(novo());
        log.length = Math.min(log.length, 9);
        T.box(61, 1, 39, 29, 28, "CONTATOS", 46);
        T.put(63, 3, "ID     RUMO   DIST   VEL  CLASSE", 240);
        alvos.filter((o) => o.visto).slice(0, 8).forEach((o, i) => {
          const brg = Math.round(((Math.atan2(Math.cos(o.ang), -Math.sin(o.ang)) * 180 / Math.PI) + 360) % 360);
          T.put(63, 4 + i, `${o.id.padEnd(6)} ${String(brg).padStart(3, "0")}° ${(o.d * 80).toFixed(1).padStart(5)}km ${String(o.vel).padStart(4)}`, o.br > 0.55 ? 252 : 245);
          T.put(90, 4 + i, o.cl, o.cor);
        });
        const host = alvos.filter((o) => o.visto && o.cl === "HOSTIL?").length;
        T.put(63, 13, `antena   ${"◐◓◑◒"[Math.floor(f / 4) % 4]} 6 rpm · alcance 80 km`, 250);
        T.put(63, 14, `contatos ${alvos.filter((o) => o.visto).length} · hostis? ${host}`, host ? 214 : 250);
        T.put(63, 15, "ameaça", 245); T.bar(70, 15, 20, Math.min(1, host / 3), host > 1 ? 196 : 214);
        T.put(63, 17, "── registro ──────────────────────", 238);
        log.forEach(([h, s, c], i) => { T.put(63, 18 + i, h, 240); T.put(72, 18 + i, s.slice(0, 26), c); });
        if (host > 1 && f % 10 < 5) T.put(63, 28, "! MÚLTIPLOS CONTATOS NÃO IDENTIFICADOS", 196);
      });
    }],

    cofre: [
      async () => {   // impressão digital
        T.reset();
        const X0 = 6, Y0 = 3, CW = 40, CH = 24, PW = CW * 2, PH = CH * 4;
        const cel = [];
        for (let cy = 0; cy < CH; cy++) {
          let s = "";
          for (let cx = 0; cx < CW; cx++) {
            let b = 0;
            for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 2; sx++) {
              const x = cx * 2 + sx, y = cy * 4 + sy, dx = x - PW / 2, dy = y - PH / 2 - 4;
              const e = (dx / 31) ** 2 + (dy / 44) ** 2;
              if (e >= 1) continue;
              const d = Math.hypot(dx, dy * 0.8 + 0.004 * dx * dx);
              const v = Math.sin(d * 0.8 + 0.9 * Math.sin(dx * 0.06) + (dy > 16 ? (dy - 16) * 0.22 : 0));
              if (v > 0.2 && demoHash(x, y) > (e > 0.75 ? 0.5 : 0.06)) b |= DEMO_BR[sy][sx];
            }
            s += b ? String.fromCharCode(0x2800 + b) : " ";
          }
          cel.push(s);
        }
        const minu = [];
        while (minu.length < 18) { const x = r(4, 35), y = r(2, 21); if (((x - 20) / 15) ** 2 + ((y - 12.5) / 10.5) ** 2 < 0.8) minu.push([x, y]); }
        const cand = [...Array(7)].map(() => ({ id: `AMOSTRA-${hex(4).toUpperCase()}`, p: Math.random() * 30, alvo: 20 + Math.random() * 55 }));
        cand[0].alvo = 98.6;
        await quadros(150, 55, (f) => {
          T.cls();
          T.put(1, 0, "DASSH VAULT", 51); T.put(13, 0, "· cofre 7-B · autenticação biométrica em 2 fatores (simulada)", 245);
          T.box(X0 - 2, Y0 - 1, CW + 4, CH + 2, 24, "SENSOR CAPACITIVO", 51);
          const s = Math.min(CH, f / 3);
          cel.forEach((l, y) => T.put(X0, Y0 + y, l, y < s ? 51 : 237));
          if (s < CH) T.put(X0 - 1, Y0 + Math.floor(s), "━".repeat(CW + 2), 46);
          let nm = 0;
          minu.forEach(([x, y]) => { if (y < s) { nm++; T.put(X0 + x, Y0 + y, "◇", 214); } });
          T.box(50, 2, 50, 26, 24, "ANÁLISE", 51);
          T.put(52, 4, "LEITURA     digital · indicador direito", 250);
          T.put(52, 5, "QUALIDADE", 250); T.spark(64, 5, [...Array(12)].map((_, i) => (i < s / 2 ? 0.6 + Math.random() * 0.4 : 0.1)), 46);
          T.put(52, 6, `MINÚCIAS    ${String(Math.round(nm * 32 / 18)).padStart(2)}/32`, 250);
          T.put(52, 7, "VARREDURA", 250); T.bar(64, 7, 26, s / CH, 51); T.put(91, 7, `${Math.round(s / CH * 100)}%`.padStart(4), 252);
          T.put(52, 9, "COMPARAÇÃO COM BASE LOCAL (fictícia)", 245);
          const m = f > 72 ? Math.min(1, (f - 72) / 50) : 0;
          cand.forEach((c) => (c.p = m >= 1 ? c.alvo : m ? c.p + (c.alvo - c.p) * 0.12 + (Math.random() - 0.5) * 2 : c.p));
          [...cand].sort((x, y) => y.p - x.p).forEach((c, i) => {
            const top = i === 0 && m >= 1;
            T.put(52, 10 + i, c.id, top ? 46 : 250); T.bar(66, 10 + i, 18, c.p / 100, top ? 46 : 31); T.put(86, 10 + i, `${cl(c.p, 0, 100).toFixed(1)}%`.padStart(6), top ? 46 : 245);
          });
          if (m >= 1) { T.fill(51, 19, 48, 3, " ", 231, 22); T.put(53, 20, "✔ DIGITAL CONFIRMADA · 98,6% · minúcias 32/32", 231, 22); }
          else T.put(53, 20, f % 10 < 5 ? "▶ posicione o dedo e aguarde…" : "", 214);
          T.put(52, 24, `sessão ${hex(4)}-${hex(4)} · ${hora()}`, 240);
          T.put(52, 25, "nada é gravado · dados FICTÍCIOS", 240);
        });
      },
      async () => {   // íris
        const cx = 26, cy = 15;
        const bits = [...Array(8)].map(() => [...Array(44)].map(() => pick(["▀", "▄", "█", " ", "▌", "▐"])));
        await quadros(130, 55, (f) => {
          T.cls();
          T.put(1, 0, "DASSH VAULT", 51); T.put(13, 0, "· fator 2 de 2 · leitura de íris (simulada)", 245);
          const Rr = Math.min(26, 8 + f * 0.7), cw = Math.ceil(Rr / 2) + 1, chh = Math.ceil(Rr / 4) + 1;
          for (let x = 1; x < 50; x++) T.put(x, cy, "─", 236);
          for (let y = 1; y < 30; y++) T.put(cx, y, "│", 236);
          for (let j = -chh; j <= chh; j++) for (let i = -cw; i <= cw; i++) {
            let b = 0, soma = 0, n = 0;
            for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 2; sx++) {
              const x = i * 2 + sx - 0.5, y = j * 4 + sy - 1.5, d = Math.hypot(x, y) / Rr;
              if (d > 1) continue;
              const an = Math.atan2(y, x);
              soma += d; n++;
              let on;
              if (d < 0.28) on = false;
              else if (d < 0.32) on = true;
              else if (d < 0.9) on = Math.sin(an * 38 + 3 * Math.sin(an * 5) + d * 4) + (demoHash(Math.floor(an * 60) + 999, Math.floor(d * 18)) - 0.5) * 0.9 > 0.15;
              else on = d > 0.93;
              if (on) b |= DEMO_BR[sy][sx];
            }
            if (!n) continue;
            const dm = soma / n;
            T.put(cx + i, cy + j, b ? String.fromCharCode(0x2800 + b) : " ", dm < 0.34 ? 245 : dm < 0.52 ? 136 : dm < 0.72 ? 37 : dm < 0.9 ? 31 : 24);
          }
          const rx = Rr / 2 * 1.25, ry = Rr / 4 * 1.25;
          for (let k = 0; k < 36; k++) { const u = k / 36 * PI2 + f * 0.04; T.put(cx + Math.cos(u) * rx, cy + Math.sin(u) * ry, k % 9 === 0 ? "◆" : "·", 214); }
          for (let k = 0; k < 30; k++) { const u = (k % 15) / 15 * 1.4 + (k < 15 ? 0 : Math.PI) - f * 0.03; T.put(cx + Math.cos(u) * rx * 1.15, cy + Math.sin(u) * ry * 1.15, "•", 51); }
          T.box(52, 2, 48, 26, 24, "ÍRIS · olho esquerdo", 51);
          T.put(54, 4, "CÓDIGO DE ÍRIS · 2048 bits", 245);
          const lin = Math.min(8, Math.floor(f / 6));
          for (let j = 0; j < lin; j++) { if (Math.random() < 0.3) bits[j][r(0, 43)] = pick(["▀", "▄", "█", " "]); T.put(54, 5 + j, bits[j].join(""), j === lin - 1 ? 51 : 31); }
          const hd = f < 50 ? 0.48 : Math.max(0.071, 0.48 - (f - 50) * 0.008);
          T.put(54, 15, `DISTÂNCIA DE HAMMING   ${hd.toFixed(3)}`, hd < 0.32 ? 46 : 214);
          T.bar(54, 16, 40, hd / 0.5, hd < 0.32 ? 46 : 214);
          T.put(54, 17, "limiar de decisão 0,320", 240);
          T.put(54, 19, `PUPILA  ${(3.1 + Math.sin(f * 0.1) * 0.2).toFixed(2)} mm · VIVACIDADE OK`, 250);
          T.put(54, 20, `FOCO    ${Math.min(100, Math.round(f * 1.6))}%`, 250);
          if (hd < 0.08) { T.fill(53, 23, 46, 3, " ", 231, 22); T.put(55, 24, "✔ ÍRIS COMPATÍVEL · fator 2 confirmado", 231, 22); }
        });
      },
      async () => {   // acesso
        const ses = `${hex(4)}-${hex(4)}`.toUpperCase();
        await quadros(120, 60, (f) => {
          T.cls();
          T.box(8, 3, 84, 24, f % 10 < 5 ? 46 : 28, "", 46, true);
          T.bigC(6, "ACESSO", 46); T.bigC(12, "CONCEDIDO", f % 20 < 14 ? 46 : 40);
          for (let i = 0; i < 6; i++) {
            const n = Math.round(cl((f - 20 - i * 8) / 12) * 4), x = 14 + i * 12;
            T.put(x, 19, `T${i + 1}[`, 245); T.put(x + 3, 19, "■".repeat(4 - n) + " ".repeat(n), n === 4 ? 46 : 214); T.put(x + 7, 19, "]", 245);
          }
          T.cen(21, f > 75 ? "cofre 7-B destravado · 6 travas recolhidas" : "recolhendo travas…", f > 75 ? 46 : 214);
          T.cen(23, `sessão ${ses} · ${hora()} · SIMULAÇÃO — nada real foi acessado`, 240);
        });
        await pausa(800);
      },
    ],

    quantico: [async () => {
      T.reset();
      const GX = 2, GY = 3, GW = 58, GH = 21, total = GW * GH;
      const quando = [...Array(GH)].map((_, y) => [...Array(GW)].map((_, x) => 30 + x * 3 + r(0, 25) + Math.abs(y - 10) * 2));
      const bit = [...Array(GH)].map(() => [...Array(GW)].map(() => r(0, 1)));
      const chave = [...Array(64)].map(() => "0123456789ABCDEF"[r(0, 15)]).join("");
      const RAMPA = [53, 54, 91, 92, 129, 165, 201, 207, 213], SUP = [" ", "·", ":", "░", "▒", "▓", "▒", "░", "·"];
      const fid = [];
      let fimF = 0, coer = 1, portas = 0;
      await quadros(3000, 55, (f) => {
        T.cls();
        T.put(1, 0, "DASSH-Q", 201); T.put(9, 0, "· processador quântico (fictício) · fatoração simulada de chave", 245);
        T.box(GX - 1, GY - 1, GW + 2, GH + 2, 54, "REGISTRO DE QUBITS", 207);
        let col = 0;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const q = quando[y][x];
          if (f >= q) { col++; const age = f - q; T.put(GX + x, GY + y, String(bit[y][x]), age < 3 ? 231 : age < 8 ? 120 : 46); }
          else if (q - f < 3) T.put(GX + x, GY + y, "▓", 231);
          else {
            const v = Math.sin(x * 0.33 + f * 0.31) + Math.sin(y * 0.52 - f * 0.23) + Math.sin((x + y) * 0.17 + f * 0.13);
            const k = Math.max(0, Math.min(8, Math.floor((v + 3) / 6 * 9)));
            if (demoHash(x + f * 131, y) > 0.94) T.put(GX + x, GY + y, String(r(0, 1)), 213);
            else T.put(GX + x, GY + y, SUP[k], RAMPA[k]);
          }
        }
        const prog = col / total;
        coer = Math.max(0.12, coer - 0.0018 + (Math.random() - 0.5) * 0.004); portas += r(900, 4000);
        fid.push(0.9 + Math.random() * 0.09); if (fid.length > 34) fid.shift();
        T.box(61, 2, 39, 23, 54, "ESTADO DA QPU", 207);
        T.put(63, 4, "QUBITS LÓGICOS         2048", 250);
        T.put(63, 5, `TEMPERATURA         ${(11.8 + Math.random() * 0.6).toFixed(2)} mK`, 250);
        T.put(63, 6, "COERÊNCIA", 250); T.bar(76, 6, 16, coer, coer > 0.4 ? 51 : 214);
        T.put(63, 7, `FIDELIDADE          ${(fid[fid.length - 1] * 100).toFixed(2)}%`, 250);
        T.spark(63, 8, fid.map((v) => (v - 0.88) / 0.12), 165);
        T.put(63, 9, `PORTAS APLICADAS ${String(portas).padStart(10)}`, 250);
        T.put(63, 10, `COLAPSADOS      ${String(col).padStart(5)}/${total}`, 250);
        T.bar(63, 11, 30, prog, prog >= 1 ? 46 : 201); T.put(94, 11, `${Math.round(prog * 100)}%`.padStart(4), 252);
        T.put(63, 13, "DISTRIBUIÇÃO DAS MEDIÇÕES", 245);
        const pico = 9;
        for (let i = 0; i < 16; i++) {
          const g = Math.exp(-((i - pico) ** 2) / (2 + 30 * (1 - prog))), ruido = Math.random() * 0.25 * (1 - prog);
          T.vcol(64 + i * 2, 22, 8, Math.min(1, g * (0.3 + prog * 0.7) + ruido), i === pico ? 46 : 165);
        }
        T.put(63, 23, "|0000⟩         ···         |1111⟩", 240);
        T.box(0, 25, 100, 5, 54, "CHAVE PRIVADA (fictícia)", 207);
        const nk = Math.floor(prog * 64);
        T.put(3, 26, chave.slice(0, nk), 46);
        T.put(3 + nk, 26, [...Array(64 - nk)].map(() => "0123456789ABCDEF"[r(0, 15)]).join(""), 54);
        T.put(70, 26, `${nk}/64 nibbles`, 245);
        T.put(3, 27, `algoritmo: shor-sim · iteração ${Math.floor(f / 3)} · erro corrigido ${(coer * 0.9).toFixed(3)} · nada real é decifrado`, 240);
        if (col === total) {
          fimF++;
          T.fill(9, 8, 44, 11, " ", 46, 234); T.box(9, 8, 44, 11, f % 10 < 5 ? 46 : 28, "", 46, true, 234);
          T.big(12, 10, "CHAVE", 46, "██", 234);
          T.put(13, 16, `RECUPERADA · ${chave.slice(0, 8)}…${chave.slice(-6)}`, 231, 234);
        }
        return fimF > 70;
      });
    }],

    guerra: [async () => {
      T.reset();
      const traf = [...Array(46)].map(() => 0.3 + Math.random() * 0.2), alertas = [], amea = [];
      const nos = [...Array(32)].map(() => (Math.random() < 0.85 ? 0 : 1));
      const cat = [["DDoS volumétrico", 0.3], ["phishing", 0.5], ["malware", 0.2], ["credenciais", 0.4], ["insider", 0.1]];
      const EV = [[196, "CRÍT", "pico de SYN na borda-3"], [214, "ALTO", "beacon suspeito em setor C"], [214, "ALTO", "login fora do horário"],
        [51, "INFO", "assinaturas IDS atualizadas"], [46, "OK  ", "nó D2 restaurado"], [196, "CRÍT", "tentativa de movimento lateral"],
        [51, "INFO", "backup imutável verificado"], [214, "ALTO", "DNS com entropia alta"], [46, "OK  ", "quarentena concluída"]];
      const tk = " ▶ exercício VIGÍLIA-26: equipe vermelha simulada iniciou a fase 2   ▶ setor C em quarentena preventiva   " +
        "▶ backup imutável verificado às 03:00   ▶ nenhum dado real é usado nesta simulação   ▶ turno SOC-2 assume em 4 h   " +
        "▶ endereços 192.0.2.0/24 e 198.51.100.0/24 são de documentação   ";
      let nivel = 2;
      await quadros(1200, 70, (f) => {
        T.cls();
        T.put(1, 0, "DASSH · SALA DE GUERRA CIBERNÉTICA", 214); T.put(37, 0, "· exercício VIGÍLIA-26", 245); T.put(62, 0, `${hora()} UTC-3`, 250);
        let v = traf[traf.length - 1];
        v += (0.42 - v) * 0.12 + (Math.random() - 0.5) * 0.14 + (Math.random() < 0.025 ? 0.45 : 0);
        v = cl(v, 0.06, 1); traf.push(v); traf.shift();
        T.box(0, 1, 50, 14, 238, "TRÁFEGO DE BORDA · Gb/s", 51);
        traf.forEach((q, i) => T.vcol(2 + i, 12, 10, q, q > 0.8 ? 196 : q > 0.6 ? 214 : 40));
        T.put(2, 13, `atual ${(v * 40).toFixed(1)} · pico ${(Math.max(...traf) * 40).toFixed(1)} · média ${(traf.reduce((s, q) => s + q, 0) / traf.length * 40).toFixed(1)}`, 245);
        if (f % 6 === 0) { const [c, s, m] = pick(EV); alertas.unshift([hora(), c, s, m]); alertas.length = Math.min(alertas.length, 11); }
        T.box(50, 1, 50, 14, 238, "ALERTAS", 214);
        alertas.forEach(([h, c, s, m], i) => { T.put(52, 2 + i, h, 240); T.put(61, 2 + i, s, c); T.put(66, 2 + i, m.slice(0, 32), i === 0 ? 252 : 246); });
        if (f % 10 === 0) {
          const i = r(0, 31);
          nos[i] = nos[i] === 2 ? 3 : nos[i] === 3 ? 0 : pick([0, 0, 0, 1, 1, 2]);
        }
        T.box(0, 15, 50, 13, 238, "MALHA DE NÓS · 8 setores", 51);
        for (let s = 0; s < 8; s++) {
          const x = 4 + s * 6;
          T.put(x, 17, "ABCDEFGH"[s], 245);
          for (let n = 0; n < 4; n++) {
            const st = nos[s * 4 + n];
            T.put(x - 1, 18 + n * 2, st === 3 ? "░░" : "██", st === 0 ? 34 : st === 1 ? 214 : st === 2 ? (f % 6 < 3 ? 196 : 52) : 240);
          }
        }
        T.put(2, 26, "██", 34); T.put(5, 26, "ok", 245); T.put(9, 26, "██", 214); T.put(12, 26, "atenção", 245);
        T.put(21, 26, "██", 196); T.put(24, 26, "crítico", 245); T.put(33, 26, "░░", 240); T.put(36, 26, "isolado", 245);
        const crit = nos.filter((q) => q === 2).length;
        const alvo = cl(Math.round(1 + crit * 0.8 + v * 2), 1, 5);
        if (f % 15 === 0) nivel += Math.sign(alvo - nivel);
        amea.push(nivel / 5); if (amea.length > 44) amea.shift();
        const corN = [0, 46, 190, 214, 208, 196][nivel];
        T.box(50, 15, 50, 13, 238, "NÍVEL DE AMEAÇA", 214);
        T.big(53, 17, String(nivel), nivel >= 4 && f % 8 < 4 ? 52 : corN);
        T.put(62, 18, ["", "BAIXO", "MODERADO", "ELEVADO", "ALTO", "CRÍTICO"][nivel], corN);
        T.put(62, 19, `nós críticos ${crit} · isolados ${nos.filter((q) => q === 3).length}`, 245);
        cat.forEach((c, i) => {
          c[1] = cl(c[1] + (Math.random() - 0.5) * 0.06, 0.05, 0.98);
          T.put(52, 21 + i, c[0].padEnd(17), 250); T.bar(69, 21 + i, 22, c[1], c[1] > 0.75 ? 196 : c[1] > 0.5 ? 214 : 40);
          T.put(92, 21 + i, `${Math.round(c[1] * 100)}%`.padStart(4), 245);
        });
        T.spark(53, 26, amea, corN);
        T.put(1, 28, `setores 8 · nós 32 · enlaces ativos ${r(118, 126)} · pacotes/s ${r(800, 990)}k`, 240);
        const ini = f % tk.length;
        T.put(0, 29, (tk + tk).slice(ini, ini + 100), 250, 236);
      });
    }],

    mainframe: [async () => {
      T.reset();
      const buf = [""], MAXL = 25;
      const desenha = () => {
        T.cls(40, 16);
        T.box(0, 0, 100, 30, 22, "", 22);
        const banda = Math.floor(Date.now() / 70) % 40, vis = buf.slice(-MAXL);
        vis.forEach((l, i) => { const y = 2 + i, dd = Math.abs(y - banda); T.put(3, y, l, dd < 1 ? 157 : dd < 3 ? 46 : 40); });
        if (Date.now() % 800 < 450) T.put(3 + [...vis[vis.length - 1]].length, 1 + vis.length, "█", 46);
        T.put(3, 28, "ORION-7 · TERMINAL 0x3F · LINHA 9600 BAUD · CONSÓRCIO FICTÍCIO", 28);
        T.show();
      };
      const nl = () => buf.push("");
      const esc = async (s, vel) => { for (const c of s) { if (!vivo()) return; buf[buf.length - 1] += c; desenha(); await pausa(vel == null ? r(12, 30) : vel); } };
      const digita = (s) => esc(s, r(70, 150));
      const linha = async (s, ms = 120) => { buf[buf.length - 1] += s; nl(); desenha(); await pausa(ms); };
      const espera = (ms) => quadros(Math.ceil(ms / 60), 60, desenha);
      const limpaTela = () => { buf.length = 0; buf.push(""); };
      await espera(500);
      await linha("ORION-7   SISTEMA DE TEMPO COMPARTILHADO   ·   REVISÃO 4.1", 220);
      await linha("(C) 1983 CONSÓRCIO ORION (FICTÍCIO) · USO RESTRITO", 220);
      await linha("", 200);
      for (const [it, res] of [["MEMÓRIA DE NÚCLEO 512K", "OK"], ["UNIDADES DE FITA 1-4", "OK"], ["DISCO A: 300 MB", "PRONTO"],
                               ["MODEM ACÚSTICO 300/1200", "OK"], ["IMPRESSORA DE LINHA", "OFFLINE"]]) {
        await esc(it.padEnd(36, "."), 8); await espera(r(200, 500)); await linha(" " + res, 150);
      }
      await linha("", 300);
      await esc("IDENTIFIQUE-SE: ", 20); await digita("OPERADOR"); nl(); desenha(); await espera(300);
      await esc("SENHA: ", 20); await digita("********"); nl(); await espera(800);
      await linha("*** ACESSO NEGADO · TENTATIVA 1 DE 3 ***", 1000);
      await linha("", 200);
      await esc("IDENTIFIQUE-SE: ", 20); await digita("OVERRIDE"); nl(); await espera(300);
      await esc("CÓDIGO DE OVERRIDE: ", 20); await digita("7-ALFA-9-ZULU"); nl(); await espera(400);
      await esc("VERIFICANDO ASSINATURA ", 20);
      for (let i = 0; i < 18 && vivo(); i++) { await esc("▓", 0); await espera(r(60, 220)); }
      nl(); await linha("", 100);
      await linha(">>> OVERRIDE AUTORIZADO · NÍVEL DE ACESSO 5 <<<", 1400);
      limpaTela();
      for (const l of ["                    MENU PRINCIPAL", "", "    1   LISTAR PROGRAMAS", "    2   DIAGNÓSTICO DE NÚCLEO",
                       "    3   SIMULAÇÃO GLOBAL", "    4   ENCERRAR SESSÃO", ""]) await linha(l, 90);
      await esc("OPÇÃO: ", 20); await espera(500); await digita("2"); nl(); await espera(400);
      await linha("INICIANDO DIAGNÓSTICO DE NÚCLEO · BANCOS 0-7", 300);
      for (let i = 0; i < 34 && vivo(); i++) {
        const end = (0o40000 + i * 8).toString(8).padStart(6, "0");
        const w = [...Array(6)].map(() => r(0, 65535).toString(8).padStart(6, "0")).join(" ");
        await linha(`${end}  ${w}   ${i % 9 === 4 ? "AVISO PARIDADE" : "OK"}`, 45);
      }
      await linha("DIAGNÓSTICO CONCLUÍDO · 0 FALHAS · 3 AVISOS", 700);
      await linha("", 100);
      await esc("> ", 20); await digita("ENVIAR RELATÓRIO PARA SALA DE CONTROLE"); nl(); await espera(500);
      await linha("RELATÓRIO 0x" + hex(4).toUpperCase() + " ENVIADO · TENHA UM BOM DIA, OPERADOR.", 1500);
      await quadros(70, 60, (f) => {
        T.cls(40, 16); T.box(0, 0, 100, 30, 22, "", 22);
        T.bigC(9, "ORION-7", f % 16 < 12 ? 46 : 40);
        T.cen(17, "OVERRIDE ATIVO · SESSÃO SEGURA", 40);
        T.cen(19, "(simulação — nenhum sistema real)", 28);
      });
    }],

    contencao: [async () => {
      T.reset();
      const id = `IR-${r(1000, 9999)}`;
      const passos = [[52, "isolar segmento VLAN 40 (laboratório)"], [45, "revogar sessões e tokens suspeitos"],
        [38, "bloquear indicadores no firewall de borda"], [31, "pausar replicação de arquivos"], [24, "snapshot forense dos hosts afetados"],
        [17, "restaurar 3 VMs a partir de backup imutável"], [11, "varredura de integridade pós-restauração"], [7, "liberar segmento com monitoramento reforçado"]];
      const hosts = [...Array(24)].map((_, i) => (i % 3 === 0 || i === 7 ? 2 : 0)), sus = [];
      let tr = 60, fimF = 0;
      await quadros(3000, 60, (f) => {
        T.cls();
        T.fill(0, 0, 100, 1, " ", 231, 52);
        T.put(1, 0, `▲ INCIDENTE ${id} · ransomware simulado em laboratório · contenção em andamento`, 231, 52);
        const feitos = passos.filter((p) => tr <= p[0]).length;
        if (feitos < passos.length) tr = Math.max(0, tr - 0.2);
        const txt = `00:${String(Math.floor(tr)).padStart(2, "0")}.${Math.floor((tr % 1) * 10)}`;
        if (feitos < passos.length) {
          T.bigC(2, txt, tr > 30 ? 214 : tr > 15 ? 208 : f % 8 < 4 ? 196 : 160);
          T.cen(8, "tempo estimado para propagação (simulado)", 245);
        } else {
          fimF++;
          T.bigC(2, "CONTIDO", f % 10 < 7 ? 46 : 40);
          T.cen(8, `contenção concluída com ${txt.slice(3)} s de margem`, 46);
        }
        passos.forEach(([lim, s], i) => {
          const ant = i === 0 ? 60 : passos[i - 1][0], ok = tr <= lim, at = !ok && tr <= ant, y = 10 + i;
          T.put(3, y, ok ? "[ OK ]" : at ? "[ >> ]" : "[ .. ]", ok ? 46 : at ? 214 : 240);
          T.put(10, y, s, ok ? 250 : at ? 231 : 242);
          if (at) { const p = (ant - tr) / (ant - lim); T.bar(60, y, 30, p, 214); T.put(91, y, `${Math.round(p * 100)}%`.padStart(4), 252); }
          else if (ok) T.put(60, y, "concluído", 34);
        });
        if (feitos >= 1 && f % 2 === 0) { const i = hosts.indexOf(2); if (i >= 0) hosts[i] = 1; }
        if (feitos >= 6 && f % 3 === 0) { const i = hosts.indexOf(1); if (i >= 0) hosts[i] = 0; }
        T.box(0, 19, 50, 10, 238, "HOSTS AFETADOS", 214);
        hosts.forEach((h, i) => T.put(3 + (i % 12) * 4, 21 + Math.floor(i / 12) * 2, "██", h === 2 ? (f % 6 < 3 ? 196 : 52) : h === 1 ? 214 : 34));
        const n2 = hosts.filter((h) => h === 2).length, n1 = hosts.filter((h) => h === 1).length;
        T.put(3, 25, `infectados ${n2} · isolados ${n1} · limpos ${24 - n1 - n2}`, 250);
        T.put(3, 26, "██", 196); T.put(6, 26, "infectado", 245); T.put(17, 26, "██", 214); T.put(20, 26, "isolado", 245); T.put(29, 26, "██", 34); T.put(32, 26, "limpo", 245);
        sus.push(cl((1 - feitos / 8) * 0.9 + Math.random() * 0.15)); if (sus.length > 44) sus.shift();
        T.box(50, 19, 50, 10, 238, "RISCO & ATIVIDADE", 214);
        const risco = 1 - feitos / 8 * 0.92;
        T.put(52, 21, "RISCO", 250); T.bar(60, 21, 30, risco, risco > 0.6 ? 196 : risco > 0.3 ? 214 : 46);
        T.put(52, 22, "conexões suspeitas/s", 245); T.spark(52, 23, sus, risco > 0.5 ? 196 : 46);
        T.put(52, 25, "criptografia de arquivos:", 250); T.put(78, 25, feitos >= 4 ? "INTERROMPIDA" : "ATIVA", feitos >= 4 ? 46 : 196);
        T.put(52, 26, "dados FICTÍCIOS · nada é executado", 240);
        return fimF > 90;
      });
    }],

    dna: [async () => {
      T.reset();
      const B = "ACGT", COR = { A: 196, C: 46, G: 220, T: 33 }, PAR = { A: "T", T: "A", C: "G", G: "C" };
      const seq = [...Array(30)].map(() => B[r(0, 3)]), reads = [], qual = [];
      const ref = [...Array(56)].map(() => B[r(0, 3)]), amo = ref.map((b) => (Math.random() < 0.06 ? B[r(0, 3)] : b));
      const loci = [...Array(8)].map((_, i) => [`LOCUS-${String(i + 1).padStart(2, "0")}`, r(8, 16), r(8, 16)]);
      let nread = 0, prog = 0, fimF = 0;
      await quadros(3000, 60, (f) => {
        T.cls();
        T.put(1, 0, "DASSH-GX", 46); T.put(10, 0, "· sequenciador genômico (fictício) · amostra K-2047", 245);
        const cx = 16;
        for (let y = 1; y < 30; y++) {
          const ph = y * 0.42 + f * 0.16, s = Math.sin(ph), c = Math.cos(ph);
          const x1 = cx + s * 11, x2 = cx - s * 11, b1 = seq[y], b2 = PAR[b1];
          const xa = Math.round(Math.min(x1, x2)), xb = Math.round(Math.max(x1, x2)), [bl, brr] = x1 < x2 ? [b1, b2] : [b2, b1];
          if (xb - xa > 2) {
            const m = Math.floor((xa + xb) / 2);
            T.put(xa + 1, y, "─".repeat(m - xa), c > 0 ? COR[bl] : 238); T.put(m + 1, y, "─".repeat(Math.max(0, xb - m - 1)), c > 0 ? COR[brr] : 238);
            if (xb - xa > 8) { T.put(xa + 2, y, bl, COR[bl]); T.put(xb - 2, y, brr, COR[brr]); }
          }
          const [fx, bx] = c > 0 ? [x1, x2] : [x2, x1];
          T.put(bx, y, "•", 24); T.put(fx, y, "●", 51);
        }
        if (f % 2 === 0) {
          nread++;
          reads.unshift([`R${String(nread).padStart(6, "0")}`, [...Array(46)].map(() => B[r(0, 3)]), r(30, 40)]);
          reads.length = Math.min(reads.length, 11);
          qual.push(0.6 + Math.random() * 0.4); if (qual.length > 40) qual.shift();
        }
        if (f % 5 === 0) { ref.shift(); ref.push(B[r(0, 3)]); amo.shift(); amo.push(Math.random() < 0.06 ? B[r(0, 3)] : ref[ref.length - 1]); }
        if (prog < 1) prog = Math.min(1, prog + 0.004); else fimF++;
        T.box(33, 1, 67, 29, 24, "LEITURAS", 51);
        reads.forEach(([id, bs, q], i) => {
          T.put(35, 2 + i, id, i === 0 ? 252 : 242);
          bs.forEach((b, k) => T.put(43 + k, 2 + i, b, i === 0 ? COR[b] : i < 4 ? COR[b] : 239));
          T.put(91, 2 + i, `Q${q}`, q > 35 ? 46 : 214);
        });
        T.put(35, 14, "ALINHAMENTO vs REFERÊNCIA (fictícia)", 245);
        T.put(35, 15, "REF", 240); T.put(35, 16, "AMO", 240);
        ref.forEach((b, k) => { T.put(40 + k, 15, b, 244); const d = amo[k] !== b; T.put(40 + k, 16, amo[k], d ? 231 : COR[amo[k]], d ? 52 : undefined); if (d) T.put(40 + k, 17, "^", 196); });
        T.put(35, 18, "COBERTURA", 250); T.bar(47, 18, 30, prog, 51); T.put(78, 18, `${(prog * 42).toFixed(1)}x`, 252);
        T.put(35, 19, "LOCI", 250); T.bar(47, 19, 30, prog, 46); T.put(78, 19, `${Math.floor(prog * 20)}/20`, 252);
        T.put(35, 20, "QUALIDADE", 250); T.spark(47, 20, qual, 46);
        if (prog < 1) {
          loci.forEach(([n, a1, a2], i) => {
            const y = 22 + (i % 4), x = 35 + Math.floor(i / 4) * 32, ok = prog > (i + 1) / 9;
            T.put(x, y, n, 245); T.put(x + 10, y, ok ? `${a1}/${a2}` : "··/··", ok ? 46 : 240);
            T.bar(x + 17, y, 10, ok ? 1 : prog * 9 - i, ok ? 46 : 31);
          });
        } else {
          T.big(36, 23, "MATCH", f % 10 < 7 ? 46 : 40);
          T.put(76, 23, "PERFIL COMPATÍVEL", 46); T.put(76, 24, "99,7% · K-2047", 231); T.put(76, 26, "(dados fictícios)", 240);
        }
        return fimF > 90;
      });
    }],

    rosto: [async () => {
      T.reset();
      const FX = 3, FW = 46, FH = 27, FY = 2, SH = " .:-=+*#%@", COR = [17, 18, 19, 25, 31, 38, 45, 51, 123, 159];
      const lum = [];
      for (let y = 0; y < FH; y++) {
        const lin = [];
        for (let x = 0; x < FW; x++) {
          const u = (x - FW / 2 + 0.5) / 21, v = (y - 13) / 12.5, e = (u / 0.7) ** 2 + (v / 0.9) ** 2;
          let L = -1;
          if (e < 1) {
            L = 0.25 + 0.75 * Math.max(0, Math.sqrt(1 - e) * 0.8 - u * 0.3 - v * 0.12);
            for (const s of [-1, 1]) {
              const eu = (u - s * 0.28) / 0.15, ev = (v + 0.12) / 0.07, de = eu * eu + ev * ev;
              if (de < 2.6) L *= 0.55;
              if (de < 1) L = Math.abs(eu) < 0.45 ? (Math.abs(eu) < 0.15 ? 0.02 : 0.12) : 0.55;
              if (Math.abs(eu) < 1 && ev > -1.7 && ev < -1.05) L = 0.12;
              const bv = v + 0.27 + 0.05 * eu * eu * 0.3;
              if (Math.abs(u - s * 0.28) < 0.17 && Math.abs(bv) < 0.028) L = 0.1;
            }
            if (Math.abs(u) < 0.045 && v > -0.08 && v < 0.2) L = Math.min(1, L + 0.18);
            if (u > 0.05 && u < 0.11 && v > -0.04 && v < 0.22) L *= 0.55;
            for (const s of [-1, 1]) if (Math.abs(u - s * 0.07) < 0.035 && v > 0.2 && v < 0.25) L = 0.08;
            if (Math.abs(u) < 0.11 && v >= 0.25 && v < 0.3) L *= 0.6;
            const mv = v - (0.44 + 0.25 * u * u);
            if (Math.abs(u) < 0.2 && Math.abs(mv) < 0.024) L = 0.07;
            else if (Math.abs(u) < 0.18 && mv < -0.024 && mv > -0.065) L *= 0.7;
            else if (Math.abs(u) < 0.17 && mv > 0.024 && mv < 0.075) L = Math.min(1, L * 0.9 + 0.08);
            L *= 1 - 0.3 * Math.max(0, Math.abs(u) - 0.45) / 0.25;
            if (v < -0.5 + 0.5 * u * u) L = 0.1 + 0.22 * demoHash(x, y);
          } else if (e < 1.25 && v < -0.15) L = 0.08 + 0.2 * demoHash(x, y);
          else if (e < 1.15 && Math.abs(v + 0.02) < 0.15 && Math.abs(u) > 0.6) L = 0.35;
          else if (Math.abs(u) < 0.3 && v > 0.75 && v < 1.05) L = 0.3 - u * 0.3;
          else if (v >= 1.0 && Math.abs(u) < 0.3 + (v - 1.0) * 3) L = 0.2;
          lin.push(L);
        }
        lum.push(lin);
      }
      const cel = (u, v) => [FX + u * 21 + FW / 2 - 0.5, FY + v * 12.5 + 13];
      const LM = [];
      for (let k = 0; k <= 10; k++) { const an = Math.PI * (0.1 + 0.8 * k / 10); LM.push([Math.cos(an) * 0.68, Math.sin(an) * 0.86]); }
      for (const s of [-1, 1]) {
        for (let k = 0; k < 5; k++) LM.push([s * (0.16 + k * 0.06), -0.27]);
        for (let k = 0; k < 6; k++) { const an = k / 6 * PI2; LM.push([s * 0.28 + Math.cos(an) * 0.14, -0.12 + Math.sin(an) * 0.06]); }
      }
      for (let k = 0; k < 5; k++) LM.push([0, -0.08 + k * 0.07]);
      for (let k = 0; k < 8; k++) { const uu = -0.2 + k * 0.4 / 7; LM.push([uu, 0.44 + 0.25 * uu * uu]); }
      const cand = [...Array(8)].map(() => ({ id: `SUJEITO-${hex(4).toUpperCase()}`, p: Math.random() * 20, alvo: 15 + Math.random() * 50 }));
      cand[0].alvo = 96.1; cand[0].id = "SUJEITO-K2047";
      const S0 = 45, S1 = S0 + FH * 3;
      await quadros(S1 + 130, 60, (f) => {
        T.cls();
        T.put(1, 0, "DASSH FORENSE", 51); T.put(15, 0, "· reconstrução facial a partir de quadros (simulada)", 245);
        const nl = Math.min(LM.length, Math.floor(f * 1.2)), sc = f < S0 ? -1 : Math.min(FH, (f - S0) / 3);
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
          const L = lum[y][x];
          if (L < 0) continue;
          if (y < sc) { const k = Math.max(0, Math.min(9, Math.floor(L * 9.99))); T.put(FX + x, FY + y, SH[k], COR[k]); }
          else if (x % 3 === 0 && y % 2 === 0) T.put(FX + x, FY + y, "+", 24);
          else if (x % 3 === 0 || y % 2 === 0) T.put(FX + x, FY + y, "·", 17);
        }
        if (sc >= 0 && sc < FH) T.put(FX, FY + Math.floor(sc), "━".repeat(FW), 51);
        if (f < S1 + 20) {
          for (let i = 1; i < nl; i++) {
            const [ax, ay] = cel(...LM[i - 1]), [bx, by] = cel(...LM[i]);
            if (Math.hypot(bx - ax, (by - ay) * 2) < 9) T.linha(ax, ay, bx, by, (_, x, y) => { if (T.ch(x, y) === " " || T.ch(x, y) === "·") T.put(x, y, "·", 37); });
          }
          for (let i = 0; i < nl; i++) { const [x, y] = cel(...LM[i]); if (y - FY >= sc - 1) T.put(x, y, "o", 51); }
        }
        if (f > S1) {
          const k = f % 10 < 6 ? 46 : 28;
          T.put(FX + 8, FY, "┌──", k); T.put(FX + FW - 11, FY, "──┐", k); T.put(FX + 8, FY + FH - 3, "└──", k); T.put(FX + FW - 11, FY + FH - 3, "──┘", k);
        }
        const pr = f < S0 ? f / S0 * 0.3 : Math.min(1, 0.3 + (f - S0) / (S1 - S0) * 0.7);
        T.box(51, 1, 49, 29, 24, "RECONSTRUÇÃO FACIAL", 51);
        T.put(53, 3, "FONTE      câmera 4 · quadro 18.442 (simulado)", 250);
        T.put(53, 4, `PONTOS     ${String(Math.round(nl / LM.length * 68)).padStart(2)}/68`, 250);
        T.put(53, 5, `POLÍGONOS  ${(pr * 12.4).toFixed(1)}k`, 250);
        T.put(53, 6, `RESOLUÇÃO  ${Math.round(100 + pr * 300)}%`, 250);
        T.put(53, 7, "PROGRESSO", 250); T.bar(64, 7, 26, pr, 51); T.put(91, 7, `${Math.round(pr * 100)}%`.padStart(4), 252);
        T.put(53, 9, "BUSCA NA BASE (fictícia)", 245);
        const m = f > S1 - 30 ? Math.min(1, (f - S1 + 30) / 60) : 0;
        cand.forEach((c) => { if (m >= 1) c.p = c.alvo; else if (m) c.p += (c.alvo - c.p) * 0.1 + (Math.random() - 0.5) * 2; else if (f % 3 === 0) c.p = Math.random() * 30; });
        [...cand].sort((x, y) => y.p - x.p).forEach((c, i) => {
          const top = i === 0 && m >= 1;
          T.put(53, 10 + i, c.id, top ? 46 : 250); T.bar(67, 10 + i, 18, c.p / 100, top ? 46 : 31); T.put(87, 10 + i, `${cl(c.p, 0, 100).toFixed(1)}%`.padStart(6), top ? 46 : 245);
        });
        T.put(53, 19, "distância interocular   6,2 u (normalizada)", 244);
        T.put(53, 20, "simetria                0,93", 244);
        if (m >= 1) {
          T.fill(52, 22, 47, 4, " ", 231, 22);
          T.put(54, 23, "✔ IDENTIFICADO · SUJEITO FICTÍCIO K-2047", 231, 22);
          T.put(54, 24, "confiança 96,1% · rosto gerado por fórmula", 157, 22);
        }
        T.put(53, 27, "nenhum rosto real · nada é gravado", 240);
      });
    }],

    datacenter: [async () => {
      T.reset();
      const NR = 8, cpu = [...Array(NR)].map(() => 0.3 + Math.random() * 0.4), temp = [...Array(NR)].map(() => 24 + Math.random() * 4);
      const pot = [...Array(46)].map(() => 0.55), rin = [...Array(30)].map(() => 0.4), rout = [...Array(30)].map(() => 0.3), log = [];
      const HEAT = [21, 27, 33, 39, 45, 49, 82, 118, 190, 226, 214, 208, 202, 196];
      let falha = -1, fu = 0;
      const ev = (s, c) => { log.unshift([hora(), s, c]); log.length = Math.min(log.length, 8); };
      ev("coleta de telemetria iniciada", 46);
      await quadros(900, 80, (f) => {
        T.cls();
        T.put(1, 0, "DASSH DCIM", 51); T.put(12, 0, "· sala 2 · corredor frio B (fictício)", 245); T.put(62, 0, hora(), 250);
        if (f % 300 === 100) { falha = r(0, 7); fu = r(0, 11); ev(`R${falha + 1} U${String(fu + 1).padStart(2, "0")} · ventoinha 3 abaixo de 2000 rpm`, 196); }
        if (f % 300 === 160 && falha >= 0) { ev(`failover: cargas de R${falha + 1} migradas p/ R${(falha + 2) % 8 + 1}`, 214); }
        if (f % 300 === 200 && falha >= 0) { ev(`R${falha + 1} normalizado · ticket ${hex(5)}`, 46); falha = -1; }
        if (f % 37 === 0) ev(pick(["backup incremental OK", "rotação de logs concluída", "sensor de umidade 45%", "UPS em teste automático OK", "snapshot de VMs concluído"]), 245);
        for (let i = 0; i < NR; i++) {
          cpu[i] = cl(cpu[i] + (Math.random() - 0.5) * 0.08, 0.08, 0.97);
          temp[i] += ((falha === i ? 38 : 22 + cpu[i] * 8) - temp[i]) * 0.05;
          const x = 1 + i * 12;
          T.box(x, 1, 11, 14, falha === i && f % 6 < 3 ? 196 : 239, `R${i + 1}`, 250);
          for (let u = 0; u < 12; u++) {
            const y = 2 + u;
            T.put(x + 1, y, u % 4 === 3 ? "─────" : "▬▬▬▬▬", 240);
            T.put(x + 7, y, "●", falha === i && u === fu ? (f % 4 < 2 ? 196 : 52) : Math.random() < 0.6 ? 46 : 22);
            T.put(x + 8, y, "●", Math.random() < 0.15 ? 214 : 236);
          }
          T.bar(x, 15, 7, cpu[i], cpu[i] > 0.85 ? 196 : cpu[i] > 0.65 ? 214 : 46);
          T.put(x + 8, 15, `${Math.round(cpu[i] * 100)}`.padStart(3), 245);
          T.put(x + 2, 16, `${temp[i].toFixed(1)}°C`, temp[i] > 32 ? 196 : temp[i] > 28 ? 214 : 51);
          for (let k = 0; k < 11; k++) {
            const tv = temp[i] + Math.sin(k * 0.7 + f * 0.1 + i) * 1.5;
            T.put(x + k, 17, " ", 252, HEAT[Math.max(0, Math.min(13, Math.floor((tv - 20) / 18 * 14)))]);
          }
        }
        T.put(1, 18, "CPU % · temperatura de exaustão · mapa de calor (20 °C ▸ 38 °C)", 240);
        const kw = cpu.reduce((s, q) => s + q, 0) / NR;
        pot.push(cl(kw + (Math.random() - 0.5) * 0.05)); pot.shift();
        rin.push(cl(rin[rin.length - 1] + (Math.random() - 0.5) * 0.15, 0.05, 1)); rin.shift();
        rout.push(cl(rout[rout.length - 1] + (Math.random() - 0.5) * 0.15, 0.05, 1)); rout.shift();
        T.box(0, 19, 56, 11, 238, "ENERGIA & REDE", 51);
        T.put(2, 20, `ENERGIA TI ${(kw * 180 + 40).toFixed(1)} kW · PUE ${(1.28 + kw * 0.12).toFixed(2)} · UPS 98%`, 250);
        pot.forEach((q, i) => T.vcol(2 + i, 25, 5, q, q > 0.8 ? 214 : 40));
        T.put(2, 26, "↓ ENTRADA", 245); T.spark(13, 26, rin, 51); T.put(44, 26, `${(rin[29] * 40).toFixed(1)} Gb/s`, 51);
        T.put(2, 27, "↑ SAÍDA", 245); T.spark(13, 27, rout, 165); T.put(44, 27, `${(rout[29] * 40).toFixed(1)} Gb/s`, 165);
        T.put(2, 28, "gerador em espera · umidade 45% · dados fictícios", 240);
        T.box(56, 19, 44, 11, 238, "EVENTOS", 214);
        log.forEach(([h, s, c], i) => { T.put(58, 20 + i, h, 240); T.put(67, 20 + i, s.slice(0, 32), c); });
      });
    }],

    estelar: [async () => {
      T.reset();
      const st = [...Array(170)].map(() => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
      const F1 = 90, F2 = 160, F3 = 270, F4 = 285;
      let vel = 0.005;
      await quadros(F4 + 190, 50, (f) => {
        T.cls();
        if (f < F1) vel = 0.005; else if (f < F2) vel = 0.005 + (f - F1) / (F2 - F1) * 0.035; else if (f < F3) vel = 0.05; else vel = Math.max(0.002, vel * 0.85);
        for (const s of st) {
          s.z -= vel;
          if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; continue; }
          const P = (z) => [50 + s.x / z * 22, 15 + s.y / z * 11], [x, y] = P(s.z);
          if (x < 0 || x >= 100 || y < 0 || y >= 30) continue;
          if (vel > 0.012) { const [x0, y0] = P(Math.min(1, s.z + vel * 3.5)); T.linha(x0, y0, x, y, (_, xx, yy) => T.put(xx, yy, "·", s.z < 0.4 ? 51 : 31)); }
          T.put(x, y, s.z < 0.2 ? "*" : s.z < 0.5 ? "+" : s.z < 0.75 ? "·" : ".", s.z < 0.2 ? 231 : s.z < 0.45 ? 252 : s.z < 0.7 ? 245 : 239);
        }
        if (f >= F4) {
          demoGlobo(T, 72, 15, 22, f * 0.012, 0.3, { terra: 135, sombra: 54, borda: 141, grade: 53 });
          if (f > F4 + 30) { T.put(4, 24, "CHEGADA: SETOR ÓRION-9", 141); T.put(4, 25, "planeta K2 (fictício) · órbita estável · desvio 0,003 UA", 245); }
        }
        if (f >= F3 && f < F4) { const k = f - F3; T.fill(0, 0, 100, 30, k < 3 ? "█" : k < 7 ? "▓" : k < 11 ? "▒" : "░", k < 3 ? 231 : k < 7 ? 159 : 51); }
        const fase = f < F1 ? "CRUZEIRO" : f < F2 ? "PREPARANDO SALTO" : f < F3 ? "HIPERESPAÇO" : "CHEGADA";
        T.put(1, 0, "NAVE DASSH-1", 51); T.put(14, 0, `· computador de navegação · ${fase}`, 245);
        T.put(1, 1, "┌──", 240); T.put(96, 1, "──┐", 240); T.put(1, 28, "└──", 240); T.put(96, 28, "──┘", 240);
        if (vel < 0.012) T.put(48, 15, "╶┼╴", 238);
        if (f >= F1 && f < F2) {
          const n = 3 - Math.floor((f - F1) / ((F2 - F1) / 3));
          T.bigC(11, String(Math.max(1, n)), 214); T.cen(18, "SALTO EM", 214);
        }
        const vc = vel >= 0.05 ? "SALTO ∞" : `${(vel * 18).toFixed(2)} c`;
        T.put(2, 29, `VELOCIDADE ${vc.padEnd(8)} · COORD ${(f * 0.37).toFixed(1)}/${(-13.9 + f * 0.01).toFixed(2)}/889.1 · ESCUDOS 100% · ENERGIA`, 245);
        T.bar(88, 29, 10, 1 - f / (F4 + 400), 46);
      });
    }],
  };
  const lista = OUTRAS[eu.tipo] || CENAS;
  let i = 0;
  while (vivo()) {
    await lista[i % lista.length]();
    i++;
    if (i % lista.length === 0) await pausa(1500);   // volta ao começo
    await pausa(r(500, 1100));
  }
}

// ---------- menu do botão direito na aba ----------
function menuAba(a, x, y) {
  let m = document.getElementById("menu-ctx");
  if (!m) { m = document.createElement("div"); m.id = "menu-ctx"; m.className = "menu-abas"; document.body.appendChild(m); }
  const it = [], html = [];
  const item = (rot, fn) => { html.push(`<div class="ma-item" data-i="${it.length}">${rot}</div>`); it.push(fn); };
  const cab = (txt) => html.push(`<div style="font:700 10px Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--suave);padding:9px 10px 3px">${txt}</div>`);
  if (a.demo) item("■ Parar demonstração", () => demoParar(a));
  else {
    cab(`🎬 Modo demonstração · ${Object.keys(SIMULACOES).length} simulações`);
    for (const cat of DEMO_CATEGORIAS) {
      const ids = Object.keys(SIMULACOES).filter((k) => SIMULACOES[k].cat === cat);
      if (!ids.length) continue;
      html.push(`<div style="margin:6px 8px 2px;padding-top:6px;border-top:1px solid var(--borda);font:700 11px Consolas,monospace;color:var(--verde)">${cat}</div>`);
      for (const k of ids) {
        const v = SIMULACOES[k];
        item(`<span style="display:block;min-width:0;flex:1"><span style="display:block">${v.nome}</span>` +
          `<small style="display:block;color:var(--suave);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.desc}</small></span>`, () => demoIniciar(a, k));
      }
    }
  }
  if (a.conectado && a.tipo !== "web" && !a.demo) item(a.gravando ? "⏸ Parar gravação…" : "⏺ Gravar esta aba…", () => menuGravacao(a));
  item("✕ Fechar aba", () => fecharAba(a.id));
  m.innerHTML = html.join("") +
    (a.demo ? "" : `<div class="ma-rodape">Demonstração: só animação — não executa nada, não grava, não gera evidência. Esc para · tecla acelera.</div>`);
  m.querySelectorAll("[data-i]").forEach((el) => (el.onclick = () => { m.classList.add("oculto"); it[+el.dataset.i](); }));
  m.style.width = "420px"; m.style.maxHeight = "78vh"; m.style.overflowY = "auto";
  m.style.left = Math.max(4, Math.min(x, innerWidth - 430)) + "px"; m.style.top = y + 6 + "px";
  m.classList.remove("oculto");
  m.style.top = Math.max(4, Math.min(y + 6, innerHeight - m.offsetHeight - 8)) + "px";
  setTimeout(() => document.addEventListener("mousedown", function fora(e) {
    if (!m.contains(e.target)) { m.classList.add("oculto"); document.removeEventListener("mousedown", fora); }
  }), 0);
}
