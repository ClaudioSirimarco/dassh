// DASSH Code — interface (abas de sessão, cofre, histórico, evidências, WhatsApp)
const $ = (s) => document.querySelector(s);
const pad2 = (n) => String(Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0).padStart(2, "0"); // M05: sempre dígitos (nunca marcação do manifesto)
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Temas do terminal: o atual + os esquemas de cor mais usados por devs/suporte (Windows Terminal, VS Code, iTerm2).
// O tema muda só a TELA. A evidência continua no padrão aprovado (preto/cinza estilo PuTTY).
const ANSI = (c) => Object.fromEntries(["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightMagenta", "brightCyan", "brightWhite"]
  .map((k, i) => [k, c[i]]));
const TEMAS = {
  dassh: { nome: "DASSH (padrão)", fonte: "Consolas", t: { background: "#0b0f14", foreground: "#d8dee9", cursor: "#00dc78",
    selectionBackground: "#2d5a4f", ...ANSI(["#1c2128", "#ff6b6b", "#5ee0b5", "#f0c674", "#6cb6ff", "#d2a8ff", "#56d4dd", "#d8dee9",
    "#6e7681", "#ff8f8f", "#8df0cc", "#ffd98a", "#9ccfff", "#e2c5ff", "#8be6ec", "#ffffff"]) } },
  putty: { nome: "PuTTY clássico", fonte: "'Courier New'", t: { background: "#000000", foreground: "#bbbbbb", cursor: "#00ff00",
    selectionBackground: "#555555", ...ANSI(["#000000", "#bb0000", "#00bb00", "#bbbb00", "#0000bb", "#bb00bb", "#00bbbb", "#bbbbbb",
    "#555555", "#ff5555", "#55ff55", "#ffff55", "#5555ff", "#ff55ff", "#55ffff", "#ffffff"]) } },
  campbell: { nome: "Windows Terminal (Campbell)", fonte: "'Cascadia Mono', Consolas", t: { background: "#0c0c0c", foreground: "#cccccc",
    cursor: "#ffffff", selectionBackground: "#3a3a3a", ...ANSI(["#0c0c0c", "#c50f1f", "#13a10e", "#c19c00", "#0037da", "#881798",
    "#3a96dd", "#cccccc", "#767676", "#e74856", "#16c60c", "#f9f1a5", "#3b78ff", "#b4009e", "#61d6d6", "#f2f2f2"]) } },
  dracula: { nome: "Dracula", fonte: "Consolas", t: { background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2",
    selectionBackground: "#44475a", ...ANSI(["#21222c", "#ff5555", "#50fa7b", "#f1fa8c", "#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2",
    "#6272a4", "#ff6e6e", "#69ff94", "#ffffa5", "#d6acff", "#ff92df", "#a4ffff", "#ffffff"]) } },
  onedark: { nome: "One Dark", fonte: "Consolas", t: { background: "#282c34", foreground: "#abb2bf", cursor: "#528bff",
    selectionBackground: "#3e4451", ...ANSI(["#282c34", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#abb2bf",
    "#5c6370", "#e06c75", "#98c379", "#e5c07b", "#61afef", "#c678dd", "#56b6c2", "#ffffff"]) } },
  solarized: { nome: "Solarized Dark", fonte: "Consolas", t: { background: "#002b36", foreground: "#839496", cursor: "#93a1a1",
    selectionBackground: "#073642", ...ANSI(["#073642", "#dc322f", "#859900", "#b58900", "#268bd2", "#d33682", "#2aa198", "#eee8d5",
    "#002b36", "#cb4b16", "#586e75", "#657b83", "#839496", "#6c71c4", "#93a1a1", "#fdf6e3"]) } },
  papel: { nome: "Papel claro", claro: true, fonte: "Consolas", t: { background: "#f7fafb", foreground: "#1c303b", cursor: "#005741",
    selectionBackground: "#a9d3e5", selectionForeground: "#142b38", ...ANSI(["#172c36", "#a3283c", "#216436", "#795400", "#215897", "#7c3e86", "#106575", "#53626b",
    "#465862", "#b0213e", "#00703f", "#855300", "#174da7", "#873672", "#006979", "#45515c"]) } },
  marfim: { nome: "Marfim", claro: true, fonte: "'Cascadia Mono', Consolas", t: { background: "#fff7e6", foreground: "#362f25", cursor: "#714318",
    selectionBackground: "#e6cf9d", selectionForeground: "#372914", ...ANSI(["#31291e", "#a13425", "#426129", "#795013", "#355489", "#783d74", "#1d6261", "#615c51",
    "#524a40", "#a02f38", "#346529", "#82500a", "#284d96", "#82356d", "#006865", "#534e43"]) } },
  fosforo: { nome: "Retrô (fósforo verde)", fonte: "'Courier New'", t: { background: "#050a05", foreground: "#33ff66", cursor: "#33ff66",
    selectionBackground: "#1f4d2a", ...ANSI(["#050a05", "#66ff99", "#33ff66", "#99ff99", "#22cc55", "#55ee88", "#88ffaa", "#33ff66",
    "#1f7a3a", "#88ffaa", "#66ff99", "#ccffcc", "#44dd77", "#77ffaa", "#aaffcc", "#e6ffe6"]) } },
};
let temaAtual = "dassh", TEMA = TEMAS.dassh.t, PALETA = paleta(TEMA);
function paleta(T) {
  const n = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  const p = [...n.map((k) => T[k]), ...n.map((k) => T["bright" + k[0].toUpperCase() + k.slice(1)])];
  const h = (v) => v.toString(16).padStart(2, "0"), lv = [0, 95, 135, 175, 215, 255];
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) p.push("#" + h(lv[r]) + h(lv[g]) + h(lv[b]));
  for (let i = 0; i < 24; i++) { const v = 8 + i * 10; p.push("#" + h(v) + h(v) + h(v)); }
  return p;
}
// Vitrine: cada tema com uma telinha de terminal nas cores reais
function abrirTemas() {
  const pop = $("#tema-pop"), g = $("#tp-grade");
  if (!pop.classList.contains("oculto")) return pop.classList.add("oculto");
  g.innerHTML = "";
  Object.entries(TEMAS).forEach(([id, tm]) => {
    const t = tm.t, d = document.createElement("button");
    d.type = "button";
    d.setAttribute("aria-label", tm.nome);
    const emUso = (A() && A().tema) || temaAtual;   // tema POR ABA: marca o da aba ativa
    d.className = "tp-item" + (id === emUso ? " sel" : "");
    d.setAttribute("aria-pressed", String(id === emUso));
    d.innerHTML = `<div class="tp-prev" style="background:${t.background};color:${t.foreground};font-family:${tm.fonte},monospace">` +
      `<span style="color:${t.green}">&lt;SW-CORE&gt;</span>display version\n` +
      `Huawei <span style="color:${t.cyan}">YunShan OS</span> 1.24\n` +
      `<span style="color:${t.yellow}">Warning</span>: <span style="color:${t.red}">fan 2 failed</span>\n` +
      `<span style="color:${t.green}">PS C:\\&gt;</span> <span style="color:${t.blue}">Get-Date</span><span style="background:${t.cursor}"> </span></div>` +
      `<div class="tp-nome"><span>${esc(tm.nome)}</span>${id === emUso ? '<span class="ok">✔ nesta aba</span>' : ""}</div>`;
    d.onclick = () => { aplicarTema(id, true); abrirTemas(); abrirTemas(); A() && A().term.focus();
      toast(`Tema desta aba: ${tm.nome}`); };
    g.appendChild(d);
  });
  const r = $("#btn-tema").getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.right - 620, innerWidth - 628)) + "px"; pop.style.top = r.bottom + 8 + "px";
  pop.classList.remove("oculto");
}
// Tema POR ABA: cada aba guarda o seu (a.tema, a.T, a.P). temaAtual = o último escolhido (aba nova sem origem e próxima abertura).
// TEMA/PALETA acompanham a aba ativa (usados pelo player e como padrão).
function temaDaAba(a, id) {
  const tm = TEMAS[id] || TEMAS.dassh;
  a.tema = TEMAS[id] ? id : "dassh"; a.T = { ...tm.t, cursorAccent: tm.t.background }; a.P = paleta(a.T);
  if (a.term) { a.term.options.theme = a.T; a.term.options.fontFamily = tm.fonte + ", 'Courier New', monospace"; }
  if (a.pane) a.pane.style.background = a.T.background;
}
function mostrarTemaAtivo() {
  const a = A(); if (!a || !a.T) return;
  TEMA = a.T; PALETA = a.P;
  document.documentElement.style.setProperty("--term", a.T.background);
  document.documentElement.style.setProperty("--term-escuro", TEMAS[a.tema].claro ? "var(--superficie-recuada)" : a.T.background);
  const sel = document.querySelector("#tema"); if (sel) sel.value = a.tema;
}
function aplicarTema(id, salvar) {
  temaAtual = TEMAS[id] ? id : "dassh";
  const a = A();
  if (a) { temaDaAba(a, temaAtual); mostrarTemaAtivo(); ajustarDepois(); }
  else { const tm = TEMAS[temaAtual]; TEMA = { ...tm.t, cursorAccent: tm.t.background }; PALETA = paleta(TEMA);
    document.documentElement.style.setProperty("--term", TEMA.background); }
  if (salvar && api) api.salvar_pref("tema", temaAtual);
}
// Nomes OFICIAIS de cada tipo, num padrão só em toda a interface (filtros, cartões, títulos): siglas em maiúsculas (AWS, SSH, CMD),
// nomes próprios como o fabricante escreve (Azure, Google Cloud, PowerShell).
const NOMES_TIPO = { serial: "Serial", powershell: "PowerShell", cmd: "CMD", ssh: "SSH", web: "Web", remoto: "Remoto",
  aws: "AWS", azure: "Azure", gcp: "Google Cloud", gcloud: "Google Cloud",
  claude: "Claude Code", codex: "Codex", gemini: "Gemini CLI", copilot: "Copilot CLI",
  // Nuvem, DevOps e IA local (catálogo único: ferramentas_cli.py)
  oci: "Oracle Cloud", doctl: "DigitalOcean", ibmcloud: "IBM Cloud", wrangler: "Cloudflare", cloudflared: "Cloudflare Tunnel",
  terraform: "Terraform", kubectl: "kubectl", helm: "Helm", docker: "Docker", pwsh: "PowerShell 7", ollama: "Ollama" };
const nomeTipo = (t) => NOMES_TIPO[String(t || "").toLowerCase()] || (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : "");
let NOME = "";  // nome do técnico (aparece no compartilhamento)
const RE_USER = /(user ?name|login|usu[aá]rio)\s*:\s*$/i;
const RE_PASS = /(password|senha)[^:]*:\s*$/i;

let api = null, ocupado = false, cofre = [], seq = 0, ativa = null;
const abas = new Map();
const A = () => abas.get(ativa);

// ================= utilidades =================
// Avisos: há UM só toast. Um aviso novo SUBSTITUI o anterior; o de progresso ({ fixo: true }) fica até ser substituído ou fechado.
function toast(msg, cls = "", { fixo = false } = {}) {
  const t = $("#toast"); t.textContent = msg; t.className = "mostrar " + cls;
  clearTimeout(toast._t); toast._fixo = fixo;
  if (!fixo) toast._t = setTimeout(() => (t.className = cls), 3800);
}
function toastFechar() { const t = $("#toast"); clearTimeout(toast._t); toast._fixo = false; t.className = ""; }
// plural em português: pl(1, "evidência") -> "1 evidência"; pl(0, "evidência") -> "0 evidências"; pl(2, "gravação", "gravações")
const pl = (n, sing, plur) => `${n} ${n === 1 ? sing : plur || sing + "s"}`;
// nome de arquivo longo com reticências no MEIO (mantém o começo e a extensão); o nome inteiro vai no title e no botão "Copiar nome"
function nomeNoMeio(nome, max = 30) {
  if (nome.length <= max) return nome;
  const fim = Math.max(10, Math.floor(max / 3)); return nome.slice(0, max - fim - 1) + "…" + nome.slice(-fim);
}
document.addEventListener("click", (ev) => {
  const b = ev.target.closest && ev.target.closest("[data-copiar-nome]"); if (!b) return;
  navigator.clipboard.writeText(b.dataset.copiarNome).then(() => toast("📋 Nome do arquivo copiado"), () => toast("Não foi possível copiar", "erro"));
});
const abrirModal = (id) => $(id).classList.remove("oculto");
const fecharModal = (el) => el.closest(".modal").classList.add("oculto");

// ================= terminal sempre inteiro na tela =================
// Em guia única, a fonte se ajusta ao espaço e a grade fica em 100 × 30.
// Nos painéis, a grade também se adapta para preservar a leitura.
function ajustarFonte() {
  const box = $("#terminal"); if (!box || !box.clientWidth) return;
  const cs = getComputedStyle(box);
  const larguraTotal = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 6;
  const alturaTotal = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 3;
  if (paineis.length && !cabeDivisao()) mostrarPaineis([]);
  const W = larguraTotal, H = alturaTotal;
  // celular em pé: fonte legível fixa e o terminal (100 colunas) vira uma faixa larga que se arrasta para os lados
  const retrato = matchMedia("(max-width: 600px) and (orientation: portrait)").matches;
  abas.forEach((a) => {
    if (a.tipo === "web" && a.conectado) return;
    if (paineis.includes(a.id)) { ajustarPainel(a); return; }
    redimensionarGuia(a, 100, 30);
    if (retrato) { if (a.term.options.fontSize !== 10) a.term.options.fontSize = 10; return; }
    const minimo = innerWidth < 700 ? 5 : 9;   // preserva a grade 100 × 30 em telas estreitas
    const alvo = calcularFonteTerminal(a.term, W, H, 100, 30, minimo);
    if (alvo !== a.term.options.fontSize) a.term.options.fontSize = alvo;
  });
}
function ajustarPainel(a) {
  const W = a.pane.offsetWidth - 20;
  const H = a.pane.offsetHeight - a.cabPainel.offsetHeight - 4;
  if (W < 1 || H < 1) return;
  // Prioriza 80 colunas e 30 linhas; sob pressão mantém 12 px e ajusta a grade.
  const fonte = calcularFonteTerminal(a.term, W, H, 80, 30, 12);
  const c = medirCelula(a.term, fonte);
  if (a.term.options.fontSize !== fonte) a.term.options.fontSize = fonte;
  redimensionarGuia(a, Math.max(2, Math.min(100, Math.floor(W / c.width))),
    Math.max(1, Math.min(30, Math.floor(H / c.height))));
}
function redimensionarGuia(a, cols, rows) {
  if (a.term.cols !== cols || a.term.rows !== rows) a.term.resize(cols, rows);
  if (!a.conectado || !a.histId || !api) return;
  const chave = a.histId + ":" + cols + "x" + rows;
  if (a.gradeEnviada === chave) return;
  const id = a.histId;
  a.gradeEnviada = chave;
  a.envioGrade = (a.envioGrade || Promise.resolve()).then(async () => {
    if (a.histId !== id || !a.conectado || a.gradeEnviada !== chave) return;
    if (await api.terminal_grade(a.id, id, cols, rows) === false && a.gradeEnviada === chave) a.gradeEnviada = null;
  }).catch(() => { if (a.gradeEnviada === chave) a.gradeEnviada = null; });
}
function calcularFonteTerminal(term, largura, altura, cols, rows, minimo) {
  for (let fonte = 17; fonte > minimo; fonte -= 0.25) {
    const c = medirCelula(term, fonte);
    if (Math.round(c.width * cols) <= largura && Math.round(c.height * rows) <= altura) return fonte;
  }
  return minimo;
}
function medirCelula(term, fonte) {
  const c = medirCelula.c || (medirCelula.c = document.createElement("canvas").getContext("2d"));
  const lh = term.options.lineHeight || 1;
  c.font = `${fonte}px ${term.options.fontFamily}`;
  const m = c.measureText("W");
  const altura = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) || fonte * 1.17;
  // Em escalas a partir de DPR 1, o arredondamento do xterm acrescenta até 1 px CSS por linha,
  // antes de aplicar o lineHeight. Reserve essa folga em todas as escalas.
  return { width: m.width, height: (altura + 1) * lh };
}
let _ajTimer = null;
const ajustarDepois = () => { clearTimeout(_ajTimer); _ajTimer = setTimeout(ajustarFonte, 60); };

// ================= logo vivo: cursor sincronizado com o do terminal + batida de coração =================
function iniciarLogo() {
  const cur = document.getElementById("logo-cursor"), logo = document.getElementById("logo");
  if (!cur || !logo || !cur.animate) return;
  // mesmo ritmo do cursor do xterm: 1 s, aceso na 1ª metade, apagado na 2ª
  const pisca = cur.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
                            { duration: 1000, iterations: Infinity });
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const brilho = (a) => `drop-shadow(0 2px ${4 + a * 8}px rgba(0,200,150,${0.3 + a * 0.45}))`;
  const bate = calmo ? null : logo.animate([      // "tum-tum" e pausa, a cada vez que o cursor acende
    { transform: "scale(1)", filter: brilho(0) },
    { transform: "scale(1.10)", filter: brilho(1), offset: 0.08 },
    { transform: "scale(1)", filter: brilho(0.2), offset: 0.18 },
    { transform: "scale(1.06)", filter: brilho(0.7), offset: 0.26 },
    { transform: "scale(1)", filter: brilho(0), offset: 0.42 },
    { transform: "scale(1)", filter: brilho(0) }], { duration: 1000, iterations: Infinity, easing: "ease-out" });
  window.__logoDif = () => {   // (autoteste) diferença, em ms, entre o cursor do logo e o do terminal
    const c = A() && A().pane.querySelector(".xterm-cursor-blink"), x = c && c.getAnimations()[0];
    return x ? Math.round(Math.abs((x.currentTime % 1000) - (pisca.currentTime % 1000))) : "sem cursor piscando";
  };
  setInterval(() => {   // acompanha o relógio do cursor da aba ativa (ele reinicia a cada saída na tela)
    const a = A(), c = a && a.pane.querySelector(".xterm-cursor-blink");
    const x = c && c.getAnimations && c.getAnimations()[0];
    if (!x || x.currentTime == null) return;
    const alvo = x.currentTime % 1000;
    if (Math.abs(alvo - (pisca.currentTime % 1000)) > 25) {
      pisca.currentTime = x.currentTime; if (bate) bate.currentTime = x.currentTime;
    }
  }, 120);
}

// ================= atendimento/destino POR ABA: o sid da aba ativa vai junto =================
// Nº de parâmetros ANTES do sid em cada função do backend. Quem já passa o sid (chamada com mais argumentos) não é alterado.
const POR_ABA = { evid_lista: 0, evid_excluir: 1, evid_status: 0, usar_cliente: 1, novo_cliente: 2, dados_visita: 3,
  nova_visita: 1, renomear_visita: 1, relatorio_gerar: 0, pdf_ler: 1, pdf_ultimo: 0, wa_enviar_arquivo: 2, importar_arquivos: 0,
  abrir_pasta: 0, wa_usar_conversa: 0, wa_status: 0, wa_esquecer: 0, wa_abrir: 0, biblioteca_relatorios: 0, clientes: 0,
  destino_definir: 2 };
function comAba(base) {
  return new Proxy(base, { get(t, nome) {
    const f = t[nome];
    if (typeof f !== "function") return f;
    if (!Object.prototype.hasOwnProperty.call(POR_ABA, nome)) return f.bind(t);
    return (...args) => {
      const n = POR_ABA[nome];
      if (args.length > n) return f.apply(t, args);
      while (args.length < n) args.push(null);
      args.push(ativa || null);
      if (nome === "relatorio_gerar") args.push(A()?.etiqueta || null);
      return f.apply(t, args);
    };
  } });
}

// ================= chamadas vindas do Python =================
window.termWrite = (sid, d) => {
  const a = abas.get(sid);
  if (!a) return;
  a.ultimaEscrita = Date.now();
  a.term.write(d, () => {
    if (a.conectado && !a.demo) chatFamiliaDetectada(a);
    if (!TIPOS_IA.includes(a.tipo)) return observarSessao(a);
    if (a.timerCota) return;
    a.timerCota = setTimeout(() => {
      a.timerCota = null;
      if (abas.has(a.id)) observarSessao(a);
    }, 180);
  });
};
window.onAviso = (sid, msg) => { const a = abas.get(sid); if (a) a.term.write(`\r\n\x1b[33m[${msg}]\x1b[0m\r\n`); toast(msg, "aviso"); };
window.onDesconectado = (sid, motivo) => {
  const a = abas.get(sid); if (!a) return;
  a.versaoFechamento = (a.versaoFechamento || 0) + 1;
  setConectado(a, false); a.term.write(`\r\n\x1b[33m[${motivo}]\x1b[0m\r\n`); toast(`${a.nome}: ${motivo}`, "aviso");
  if (!/^(?:Sessão (?:SSH )?encerrada\.?|Conexão cancelada\.|O dono encerrou o compartilhamento\.)$/i.test(motivo)) { estadoDaSessao(a, "falha"); ilhaQueda(a, motivo); }
  if (a.tipo === "serial" && /lixo|perdida/i.test(motivo)) diagnosticarCabo();
};

// ================= abas =================
// Organização: número (= Ctrl+Alt+N), largura que encolhe por igual, arrastar para reordenar, botão do meio fecha,
// e o botão ▾ com a lista de todas as abas (estado, tempo, gravação) quando há 3 ou mais.
const ordemAbas = () => [...document.querySelectorAll("#abas-sessao .aba")].map((b) => b.dataset.id).filter((id) => abas.has(id));
function arrumarAbas() {
  const ordem = ordemAbas();
  const resumo = $("#divisao-resumo"), botaoDivisao = $("#dividir-guias");
  resumo.hidden = !paineis.length;
  const descricao = paineis.map((id, i) => {
    const n = ordem.indexOf(id) + 1, foco = id === ativa;
    const selo = resumo.children[i];
    selo.textContent = `${i === 0 ? "E" : "D"}${n}`;
    selo.classList.toggle("painel-foco", foco);
    return `Painel ${i === 0 ? "esquerdo" : "direito"}, guia ${n}${foco ? " com foco" : ""}`;
  }).join(". ");
  if (descricao) botaoDivisao.setAttribute("aria-description", descricao);
  else botaoDivisao.removeAttribute("aria-description");
  ordem.forEach((id, i) => { const a = abas.get(id); a.btn.querySelector(".num").textContent = i + 1;
    const painel = paineis.indexOf(id);
    a.btn.title = `${a.nome}${a.equip ? " — " + a.equip : ""}  (Ctrl+Alt+${i + 1})`;
    if (painel >= 0) {
      const lado = painel === 0 ? "Esquerdo" : "Direito";
      a.btn.title += ` · Painel ${lado.toLowerCase()}${id === ativa ? " com foco" : ""}`;
      a.cabPainel.textContent = `${lado} · guia ${i + 1} · ${a.nome}${id === ativa ? " · em foco" : ""}`;
    }
  });
  $("#abas-sessao").classList.toggle("muitas", abas.size >= 4);
  document.querySelector(".term-barra").classList.toggle("muitas", abas.size >= 4);
  $("#lista-abas").classList.toggle("oculto", abas.size < 3);
  $("#lista-abas").textContent = `▾ ${abas.size}`;
  $("#nova-aba").disabled = abas.size >= 8;
  $("#nova-aba").title = abas.size >= 8 ? "Limite de 8 abas — feche uma para abrir outra" : "Nova aba (Ctrl+Alt+T)";
  const at = A() && A().btn; if (at) at.scrollIntoView({ block: "nearest", inline: "nearest" });
  rotuloAbaLateral(A()); desenharGuia(A());
}
function arrastavel(b) {
  b.draggable = true;
  b.addEventListener("dragstart", (e) => { b.classList.add("arrastando"); e.dataTransfer.effectAllowed = "move"; });
  b.addEventListener("dragend", () => { b.classList.remove("arrastando"); arrumarAbas(); if (b.classList.contains("fixada")) salvarFixadas(); });
  b.addEventListener("dragover", (e) => {
    const arr = document.querySelector(".aba.arrastando"); if (!arr || arr === b || arr.classList.contains("fixada") !== b.classList.contains("fixada")) return;
    e.preventDefault();
    const r = b.getBoundingClientRect();
    b.parentNode.insertBefore(arr, e.clientX < r.left + r.width / 2 ? b : b.nextSibling);
  });
}
function listaAbas() {
  const m = $("#menu-abas");
  if (!m.classList.contains("oculto")) return m.classList.add("oculto");
  const fmt = (a) => { if (!a.inicio) return ""; const s = Math.floor((Date.now() - a.inicio) / 1000);
    return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  m.innerHTML = ordemAbas().map((id, i) => { const a = abas.get(id);
    return `<div class="ma-item ${id === ativa ? "ativa" : ""}" data-id="${id}"><span class="num">${i + 1}</span>
      <span class="ponto" data-estado="${a.estadoSessao || "encerrada"}" title="${ESTADOS_SESSAO[a.estadoSessao || "encerrada"]}"></span><span class="ma-nome">${esc(a.nome)}${a.equip ? `<small>${esc(a.equip)}</small>` : ""}</span>
      <span class="ma-tempo">${fmt(a)}</span>${a.conectado && a.tipo !== "web" ? `<span class="ma-rec ${a.gravando ? "on" : ""}">${a.gravando ? "REC" : "sem REC"}</span>` : ""}
      <button class="fecha" data-x="${id}" title="Fechar">✕</button></div>`; }).join("") +
    `<div class="ma-rodape">Ctrl+Alt+1…8 troca · arraste para reordenar · botão do meio fecha</div>`;
  m.querySelectorAll(".ma-item").forEach((el) => (el.onclick = (e) => {
    if (e.target.dataset.x) { fecharAba(e.target.dataset.x); m.classList.add("oculto"); return; }
    ativar(el.dataset.id); m.classList.add("oculto");
  }));
  const r = $("#lista-abas").getBoundingClientRect();
  m.style.left = Math.max(8, r.left) + "px"; m.style.top = r.bottom + 4 + "px";
  m.classList.remove("oculto");
}
document.addEventListener("mousedown", (e) => {
  const m = $("#menu-abas"); if (m && !m.contains(e.target) && e.target.id !== "lista-abas") m.classList.add("oculto");
});

function novaAba(tipo, idFixo) {
  if (abas.size >= 8) return toast("Máximo de 8 abas", "aviso");
  const id = idFixo || "t" + (++seq);   // idFixo: aba aberta pelo celular (o Python já criou a sessão com esse id)
  const pane = document.createElement("div"); pane.className = "term-pane"; $("#terminal").appendChild(pane);
  const cabPainel = document.createElement("div");
  cabPainel.className = "term-painel-cab"; pane.append(cabPainel);
  const fsAtual = [...abas.values()].find(x => x.tipo !== "web" && !paineis.includes(x.id))?.term.options.fontSize || 15;
  const origem = A();   // aba nova herda da ativa: tema, atendimento (cliente/visita/chamado) e destino de envio
  const ocupados = new Set([...abas.values()].map(aba => aba.lugar));
  const lugar = [1, 2, 3, 4, 5, 6, 7, 8].find(n => !ocupados.has(n));
  const temaIni = (origem && origem.tema) || temaAtual;
  const term = new Terminal({ cols: 100, rows: 30, fontFamily: TEMAS[temaIni].fonte + ", 'Courier New', monospace", fontSize: fsAtual,
    lineHeight: 1.05, cursorBlink: true, scrollback: 5000, theme: TEMA, allowProposedApi: true });
  const a = { id, term, pane, cabPainel, tipo: tipo || tipoTopo(), conectado: false, nome: "Nova aba", alvo: null, params: null,
              lugar, limparApos: preferenciasLimpeza[`limpar_guia_${lugar}`] ?? LIMPAR_APOS,
              loginPend: null, ultimoPrompt: "", sugestao: null, herdar: origem ? origem.id : null, evLis: [] };
  temaDaAba(a, temaIni);
  abas.set(id, a);
  const b = document.createElement("div"); b.className = "aba"; b.dataset.id = id;
  b.innerHTML = `<span class="num"></span><span class="ponto"></span><span class="guia-painel" role="img" hidden></span><span class="nome">Nova aba</span><span class="tempo" title="Tempo de sessão"></span><span class="ativa-tg" title="⏱ Manter esta sessão ativa (evita desconexão por inatividade) — clique para ligar/desligar">⏱</span><span class="rec" title="Gravação desta aba — clique para parar, gravar ou assistir">REC</span><button class="fecha" title="Fechar aba">✕</button>`;
  b.onclick = (e) => { if (!e.target.classList.contains("fecha") && !e.target.classList.contains("rec") && !e.target.classList.contains("ativa-tg")) ativar(id); };
  b.onauxclick = (e) => { if (e.button === 1) { e.preventDefault(); fecharAba(id); } };   // botão do meio fecha (como no navegador)
  b.querySelector(".rec").classList.add("selo-rec");
  b.querySelector(".rec").onclick = () => menuGravacao(a);
  b.querySelector(".ativa-tg").onclick = (e) => { e.stopPropagation(); alternarAtiva(a); };
  b.querySelector(".fecha").onclick = () => fecharAba(id);
  arrastavel(b);
  $("#abas-sessao").appendChild(b); a.btn = b;
  estadoDaSessao(a, "encerrada");
  ativar(id); arrumarAbas();
  term.open(pane);
  a.ser = new SerializeAddon.SerializeAddon(); term.loadAddon(a.ser);
  term.attachCustomKeyEventHandler((e) => !atalho(e));
  term.onData((d) => {
    if (a.demo) return demoTecla(a, d);   // modo demonstração: Esc para, qualquer tecla acelera
    if (!a.conectado) { if (window.__portal) window.__portal.tecla(a, d); return; }   // portal web sem computador: shell do portal
    if (a.share && !a.share.souAtivo) return avisoControle(a);  // observando: não digita
    if (a.celCtrl) return avisoCel(a);   // 📱 o celular do dono está com o controle desta aba
    api.escrever(id, d); if (a.sugestao && /\r/.test(d)) esconderSugestao(a);
  });
  term.onSelectionChange(() => { const s = term.getSelection(); if (s) navigator.clipboard.writeText(s).catch(() => {}); });
  term.onWriteParsed(() => verificarLogin(a));
  const focarPainel = () => { if (paineis.includes(id) && ativa !== id) ativar(id); };
  pane.addEventListener("pointerdown", focarPainel, true);
  pane.addEventListener("focusin", focarPainel);
  pane.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    // colar pelo Python (área de transferência do Windows): o navegador interno não pede mais permissão
    try { const t = await api.area_transferencia(); if (t && a.conectado) api.escrever(id, t.replace(/\r?\n/g, "\r")); } catch (_) {}
  });
  if (window.__portal && !idFixo) window.__portal.boasVindas(a); else boasVindas(a);
  b.oncontextmenu = (e) => { e.preventDefault(); menuAba(a, e.clientX, e.clientY); };
  b.onpointerenter = () => {
    if (a.id === ativa && !a.fixada) return;
    const dica = document.createElement("div"); dica.className = "guia-previa";
    dica.textContent = [a.nome, a.etiqueta].filter(Boolean).join(" · ");
    const r = b.getBoundingClientRect(); dica.style.left = Math.max(4, Math.min(r.left, innerWidth - 224)) + "px";
    dica.style.top = r.bottom + "px"; document.body.append(dica);
    b.onpointerleave = () => dica.remove();
    dicaGuiaAtual?.remove(); dicaGuiaAtual = dica;
  };
  b.tabIndex = 0;
  b.onkeydown = e => {
    if (e.target !== b) return;
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault(); const r = b.getBoundingClientRect(); menuAba(a, r.left, r.bottom);
    } else if (e.key === "Enter") ativar(a.id);
  };
  term.focus();
  return a;
}

// frase de boas-vindas digitada (como num terminal de verdade); para sozinha se a aba conectar
async function boasVindas(a) {
  const partes = [["\x1b[38;2;94;224;181m", "DASSH Code"], ["\x1b[0m", " — escolha a conexão no topo e clique em "],
                  ["\x1b[1m", "Conectar"], ["\x1b[0m", "."]];
  await new Promise((r) => setTimeout(r, 250));
  for (const [cor, txt] of partes) {
    a.term.write(cor);
    for (const ch of txt) {
      if (a.conectado || a.demo || !abas.has(a.id)) { a.term.write("\x1b[0m"); return; }
      a.term.write(ch);
      await new Promise((r) => setTimeout(r, ch === " " ? 22 : 16 + Math.random() * 30));
    }
  }
  a.term.write("\r\n");
}

let paineis = [];
function cabeDivisao() {
  return innerWidth >= 800 && $("#terminal").clientWidth >= 700;
}
function mostrarPaineis(ids) {
  paineis = ids;
  $("#terminal").classList.toggle("dividido", !!ids.length);
  const botao = $("#dividir-guias");
  botao.setAttribute("aria-pressed", String(!!ids.length));
  botao.title = ids.length ? "Desfazer divisão" : "Dividir guias lado a lado";
  botao.setAttribute("aria-label", botao.title);
  botao.title += " (Ctrl+Alt+D)";
  atualizarPaineis();
  arrumarAbas();
  ajustarDepois();
}
function atualizarPaineis() {
  for (const a of abas.values()) {
    const i = paineis.indexOf(a.id), visivel = i >= 0, foco = visivel && a.id === ativa;
    const selo = a.btn.querySelector(".guia-painel");
    a.pane.classList.toggle("em-painel", visivel);
    a.pane.style.order = visivel ? i : "";
    a.btn.classList.toggle("guia-em-painel", visivel);
    a.btn.classList.toggle("painel-foco", foco);
    selo.hidden = !visivel;
    if (visivel) {
      const esquerdo = i === 0;
      selo.textContent = (esquerdo ? "E" : "D") + (foco ? " ›" : "");
      selo.setAttribute("aria-label", `Painel ${esquerdo ? "esquerdo" : "direito"}${foco ? " com foco" : ""}`);
    }
  }
}
function dividirGuias(a, outra) {
  if (paineis.length) return mostrarPaineis([]);
  if (!cabeDivisao()) return toast("Amplie a janela para ver duas guias lado a lado.", "aviso");
  if (a.tipo === "web") return toast("Escolha uma guia de terminal para dividir.", "aviso");
  outra = outra || [...abas.values()].find(b => b !== a && b.tipo !== "web");
  if (!outra) outra = novaAba("powershell");
  if (outra) { mostrarPaineis([a.id, outra.id]); ativar(a.id); }
}
$("#dividir-guias").onclick = () => { if (A()) dividirGuias(A()); };

function ativar(id) {
  const ant = abas.get(ativa);
  if (ant && ant.id !== id) guardarHistorico(ant);   // "Últimas evidências" da aba que sai ficam guardadas nela
  const trocou = !ant || ant.id !== id;
  if (paineis.length && !paineis.includes(id)) {
    mostrarPaineis(abas.get(id).tipo === "web" ? [] : paineis.map(p => p === ativa ? id : p));
  }
  ativa = id;
  abas.forEach((a) => { a.pane.classList.toggle("ativa", a.id === id); a.btn.classList.toggle("ativa", a.id === id); });
  atualizarPaineis();
  const a = A();
  if (trocou) montarHistorico(a);
  mostrarTemaAtivo();
  carregarLateral(a);   // lateral inteira DESTA aba: cliente, visita, chamado, Próxima Nº, destino
  selecionarTipo(a.tipo, true);
  if (a.params) {
    if (a.params.porta) $("#porta").value = a.params.porta;
    if (a.params.baud) $("#baud").value = a.params.baud;
    if (a.params.destino) $(a.tipo === "web" ? "#web-url" : "#ssh-destino").value = a.params.destino;
  }
  atualizarBotaoConectar();
  $("#aba-alvo").textContent = a.conectado ? a.nome : "";
  if (a.sugestao) mostrarSugestao(a, a.sugestao); else $("#sugestao").classList.add("oculto");
  desenharAtiva(a);
  if (a.equip && a.conectado) $("#aba-alvo").textContent = `${a.nome} · ${a.equip}`;
  desenharShare(a); desenharGuia(a);
  setTimeout(() => { if (ativa === id) a.term.focus(); ajustarFonte(); arrumarAbas(); }, 0);
}

// ---------- lateral direita POR ABA ----------
function guardarHistorico(a) {
  const ul = $("#historico");
  a.evLis = [...ul.querySelectorAll("li.ev-item")];
  a.evLis.forEach((li) => li.remove());
}
function montarHistorico(a) {
  const ul = $("#historico"); ul.innerHTML = "";
  (a.evLis || []).forEach((li) => ul.appendChild(li));
  if (!ul.children.length) ul.innerHTML = `<li class="vazio">Nenhuma ainda nesta aba</li>`;
}
function rotuloAbaLateral(a) {
  const el = $("#lat-aba"); if (!el || !a) return;
  const n = ordemAbas().indexOf(a.id) + 1;
  el.textContent = `aba ${n || "?"}${a.conectado ? " · " + a.nome : ""}`;
  el.title = "A lateral mostra o atendimento e o destino DESTA aba — cada aba tem os seus";
}
async function carregarLateral(a = A()) {
  if (!a || !api) return;
  rotuloAbaLateral(a);
  let r;
  try { r = await api.aba_contexto(a.id, a.herdar || null); } catch (e) { return; }
  a.herdar = null;
  if (!r || !r.ok || ativa !== a.id) return;   // trocou de aba no meio: a outra já carregou a dela
  a.destino = r.destino;
  desenharClientes(r.clientes); atualizarEvid(r.evid);
  atualizarWa({ sid: a.id, conversa: r.conversa, destino: r.destino });
}
// ---------- ⏱ manter a sessão ativa POR ABA (botão na própria aba; o chip da lateral age na aba ativa) ----------
function desenharAtiva(a) {
  if (!a || !a.btn) return;
  const t = a.btn.querySelector(".ativa-tg");
  if (t) { t.classList.toggle("mostra", !!a.conectado && !a.demo); t.classList.toggle("on", !!a.manterAtiva && !!a.conectado); }
  if (a.id === ativa) desenharGuia(a);
}
async function alternarAtiva(a = A()) {
  if (!a || !a.conectado) return toast("Conecte a aba primeiro", "aviso");
  const r = await api.manter_ativa(a.id, !a.manterAtiva);
  a.manterAtiva = !!r.ativo; desenharAtiva(a); toast(r.msg);
}
// ---------- barra DA GUIA (opções que valem só para a guia ativa: 📡 ⏺ ⏱ 🧹 🎨 ⚡) ----------
let GRAVAR = true;   // ⏺ padrão para as guias que ainda vão conectar (preferência gravar_auto)
const limparDaAba = (a) => (a && a.limparApos !== undefined ? a.limparApos : LIMPAR_APOS);
function desenharGuia(a = A()) {
  if (!a || a.id !== ativa) return;
  const n = ordemAbas().indexOf(a.id) + 1, rot = $("#gb-rot");
  const painel = paineis.indexOf(a.id);
  if (rot) { rot.textContent = painel >= 0 ? `Foco · ${painel === 0 ? "E" : "D"}` : `aba ${n || ""}`.trim(); rot.title = `Os botões ao lado valem só para a aba ${n} (${a.nome}) — cada aba (guia) tem os seus`; }
  const term = a.tipo !== "web", con = !!a.conectado;
  const g = $("#tg-gravar");
  if (g) {
    const on = con ? !!a.gravando : GRAVAR;
    g.classList.toggle("on", on); g.classList.toggle("rec-on", con && on);
    g.disabled = con && !term;
    g.title = !term && con ? "⏺ Guia Web não grava terminal (as evidências continuam valendo)"
      : con ? (a.gravando ? "⏺ Gravando esta guia — clique para parar ou assistir até agora" : "⏺ Esta guia NÃO está gravando — clique para gravar a partir de agora")
      : (GRAVAR ? "⏺ Gravar ao conectar: LIGADO — esta guia (e as próximas) gravam a sessão ao conectar. Clique para desligar"
                : "⏺ Gravar ao conectar: DESLIGADO — só o log em texto. Clique para ligar");
  }
  const t = $("#tg-ativa");
  if (t) { t.classList.toggle("on", con && !!a.manterAtiva); t.classList.toggle("inativo", !con);
    t.title = !con ? "⏱ Manter esta guia ativa (evita desconexão por inatividade) — conecte a guia para ligar"
      : a.manterAtiva ? "⏱ Mantendo ESTA guia ativa (evita desconexão por inatividade) — clique para desligar"
      : "⏱ Manter ESTA guia ativa (evita desconexão por inatividade) — clique para ligar"; }
  const l = $("#tg-limpar");
  if (l) { const on = limparDaAba(a); l.classList.toggle("on", on);
    l.title = on ? "🧹 Limpar a tela desta guia depois de cada evidência: LIGADO — clique para desligar"
                 : "🧹 Limpar a tela desta guia depois de cada evidência: DESLIGADO — clique para ligar"; }
  desenharSaldo();
  const s = $("#btn-compartilhar");
  if (s) { const vivo = a.share && a.share.papel === "dono"; s.classList.toggle("on", !!vivo);
    s.title = vivo ? `📡 Esta guia está AO VIVO (código ${a.share.codigo}) — clique para ver o código` : "📡 Compartilhar ESTA guia ao vivo (convite pelo WhatsApp)"; }
}
function alternarGravar() {
  const a = A(); if (!a) return;
  if (a.conectado) return menuGravacao(a);   // guia conectada: grava/para ESTA guia
  GRAVAR = !GRAVAR; api.salvar_pref("gravar_auto", GRAVAR); desenharGuia(a);
  toast(GRAVAR ? "⏺ Esta guia e as próximas vão gravar ao conectar (pare em cada uma pelo ⏺)"
               : "Ao conectar, as guias NÃO vão gravar — só log em texto (grave pelo ⏺ se precisar)");
}
function alternarLimpar() {
  const a = A(); if (!a) return;
  const novo = !limparDaAba(a);
  const chave = `limpar_guia_${a.lugar}`;
  a.limparApos = preferenciasLimpeza[chave] = novo;
  gravacaoLimpeza = gravacaoLimpeza.then(() => api.salvar_pref(chave, novo))
    .catch(() => toast("Falha ao guardar a vassoura para a próxima abertura", "erro"));
  desenharGuia(a);
  shareAbaPublicar(a);
  toast(novo ? "🧹 Esta guia limpa a tela depois de cada evidência" : "🧹 Esta guia não limpa mais a tela sozinha");
}

let gravacaoFixadas = Promise.resolve(), dicaGuiaAtual = null;
function salvarFixadas() {
  const guias = ordemAbas().map(id => abas.get(id)).filter(a => a.fixada).map(a => {
    const tipo = a.tipo, p = a.params || {};
    const params = {};
    if (tipo === "serial") { params.porta = p.porta; params.baud = p.baud; }
    if (tipo === "ssh") params.destino = p.destino;
    if (tipo === "web" && p.destino) {
      try {
        const u = new URL(p.destino.includes("://") ? p.destino : "https://" + p.destino);
        if (["http:", "https:"].includes(u.protocol)) params.destino = u.origin + u.pathname;
      } catch (_) {}
    }
    return { tipo, params, etiqueta: a.etiqueta || "" };
  });
  gravacaoFixadas = gravacaoFixadas.then(async () => {
    if (await api.salvar_pref("guias_fixadas", guias) === false) throw new Error();
  }).catch(() => toast("Não foi possível guardar as guias fixadas.", "aviso"));
}
const CORES_GUIA = { Azul: "var(--etiqueta-azul)", Verde: "var(--etiqueta-verde)", Âmbar: "var(--etiqueta-ambar)", Rosa: "var(--etiqueta-rosa)", Roxo: "var(--etiqueta-roxo)", Coral: "var(--etiqueta-coral)" };
function etiquetarGuia(a, cor) {
  a.etiqueta = Object.hasOwn(CORES_GUIA, cor) ? cor : "";
  a.btn.style.borderTopColor = CORES_GUIA[a.etiqueta] || "";
  if (a.histId && a.conectado) guardarEtiquetaSessao(a);
}
let gravacaoEtiquetas = Promise.resolve();
function guardarEtiquetaSessao(a) {
  const id = a.histId, cor = a.etiqueta || "";
  gravacaoEtiquetas = gravacaoEtiquetas.then(async () => {
    if (await api.hist_etiquetar(id, cor) !== true) throw new Error();
  }).catch(() => toast("Não foi possível guardar a etiqueta da sessão.", "erro"));
}
function restaurarGuiasFixadas(guias) {
  if (!Array.isArray(guias)) return;
  for (const g of guias.slice(0, 8)) {
    if (!g || !["serial", "ssh", "web", ...DIRETOS].includes(g.tipo)) continue;
    const a = novaAba(g.tipo);
    if (!a) break;
    a.params = g.params || {};
    a.nome = a.params.destino || a.params.porta || g.tipo;
    a.btn.querySelector(".nome").textContent = a.nome;
    a.fixada = true; a.btn.classList.add("fixada");
    etiquetarGuia(a, g.etiqueta);
  }
  if (abas.size) ativar(ordemAbas()[0]);
}
function fixarGuia(a) {
  a.fixada = !a.fixada;
  a.btn.classList.toggle("fixada", a.fixada);
  const barra = $("#abas-sessao");
  barra.insertBefore(a.btn, [...barra.children].find(b => b !== a.btn && !b.classList.contains("fixada")) || null);
  arrumarAbas(); salvarFixadas();
}
function perguntarGuia(texto, acao) {
  return new Promise(resolve => pedido(texto, acao, "Cancelar", resolve, undefined, true));
}
async function reabrirGuia(a) {
  if (a.reabrindo || a.roteiro) return;
  a.reabrindo = true;
  try {
    const params = a.params && { ...a.params };
    if (a.conectado) {
      if (!(await perguntarGuia(`Encerrar a sessão de <b>${esc(a.nome)}</b> e abrir outra na mesma guia? Os processos e o compartilhamento desta sessão serão encerrados.`, "Reiniciar sessão"))) return;
      if (!abas.has(a.id)) return;
      await api.desconectar(a.id);
      setConectado(a, false);
    }
    if (abas.has(a.id)) { ativar(a.id); await conectar(a, false, params); }
  } finally { a.reabrindo = false; }
}
function menuAba(a, x, y) {
  dicaGuiaAtual?.remove();
  $("#menu-ctx")?.remove();
  const m = document.createElement("div"); m.id = "menu-ctx"; m.className = "menu-abas";
  m.setAttribute("role", "group");
  m.setAttribute("aria-label", "Opções da guia");
  const titulo = document.createElement("strong"); titulo.textContent = a.nome;
  const estado = document.createElement("small"); estado.textContent = a.tipo + " · " + ESTADOS_SESSAO[a.estadoSessao];
  m.append(titulo, estado);
  function grupo(nome, classe = "") {
    const g = document.createElement("div"); g.className = "ctx-grupo " + classe;
    g.setAttribute("role", "group"); g.setAttribute("aria-label", nome);
    return g;
  }
  function item(g, icone, nome, fn, atalho = "", ativarGuia = true) {
    const b = document.createElement("button"); b.type = "button";
    b.innerHTML = `<span class="ctx-icone" aria-hidden="true">${icone}</span><span>${nome}</span>${atalho ? `<kbd aria-hidden="true">${atalho}</kbd>` : ""}`;
    if (atalho) b.setAttribute("aria-keyshortcuts", "Control+Alt+D");
    b.onclick = async () => {
      m.remove(); if (!abas.has(a.id)) return;
      if (ativarGuia) ativar(a.id); else a.btn.focus();
      try { await fn(); } catch (e) { toast(e.message || "Falha na ação da guia", "erro"); }
    };
    g.append(b);
  }
  const conexao = grupo("Sessão"), ferramentas = grupo("Ferramentas"), organizacao = grupo("Organização");
  const encerrar = grupo("Encerramento", "ctx-perigo");
  if (!a.demo && a.tipo !== "remoto") {
    if (!a.roteiro && !a.reabrindo) {
      const reconectar = ["login", "silenciosa", "encerrada"].includes(a.estadoSessao);
      const nome = a.conectado ? (reconectar ? "Reconectar sessão…" : "Reiniciar sessão…")
        : a.params ? "Reconectar sessão" : "Conectar sessão";
      item(a.conectado ? encerrar : conexao, "↻", nome, () => reabrirGuia(a));
    }
    if (a.conectado && a.tipo !== "web") {
      item(conexao, "◷", a.manterAtiva ? "Desligar manter ativa" : "Manter sessão ativa", () => alternarAtiva(a));
      item(ferramentas, "⏺", a.gravando ? "Gerenciar gravação" : "Gravar sessão", () => menuGravacao(a));
    }
    if (["serial", "ssh", "powershell", "cmd"].includes(a.tipo))
      item(ferramentas, "⚡︎", "Skills desta guia", () => abrirRoteiros(a));
    if (a.tipo !== "web")
      item(ferramentas, "◇", limparDaAba(a) ? "Desligar limpeza após evidência" : "Limpar após evidência", alternarLimpar);
    item(organizacao, "⚑", a.fixada ? "Desafixar guia" : "Fixar guia", () => fixarGuia(a));
  }
  const antes = A();
  if (paineis.length) item(organizacao, "◫", "Desfazer divisão", () => mostrarPaineis([]), "Ctrl+Alt+D", false);
  else if (a.tipo !== "web")
    item(organizacao, "◫", "Dividir lado a lado", () => dividirGuias(a, antes !== a && antes?.tipo !== "web" ? antes : null), "Ctrl+Alt+D", false);
  const etiqueta = document.createElement("label"); etiqueta.className = "ctx-etiqueta";
  etiqueta.innerHTML = '<span class="ctx-icone" aria-hidden="true">⬡</span><span>Etiqueta da guia</span>';
  const cor = document.createElement("select");
  cor.setAttribute("aria-label", "Etiqueta da guia");
  cor.append(new Option("Sem etiqueta", ""), ...Object.keys(CORES_GUIA).map(c => new Option(c, c)));
  cor.value = a.etiqueta || "";
  cor.onchange = () => { etiquetarGuia(a, cor.value); if (a.fixada) salvarFixadas(); m.remove(); a.btn.focus(); };
  etiqueta.append(cor); organizacao.append(etiqueta);
  if (a.demo) item(encerrar, "■", "Parar demonstração", async () => {
    if (await perguntarGuia(`Parar a demonstração de <b>${esc(a.nome)}</b>?`, "Parar demonstração")) demoParar(a);
  });
  item(encerrar, "×", "Fechar guia", () => fecharAba(a.id, true), "", false);
  m.append(...[conexao, ferramentas, organizacao, encerrar].filter(g => g.childElementCount));
  const rodape = document.createElement("div"); rodape.className = "ctx-atalhos";
  rodape.innerHTML = "<kbd>↑ ↓</kbd> Navegar <kbd>Esc</kbd> Voltar";
  m.append(rodape);
  m.onkeydown = e => {
    if (e.key === "Escape") { e.stopPropagation(); m.remove(); a.btn.focus(); return; }
    const divisao = organizacao.querySelector("[aria-keyshortcuts]");
    if (divisao && e.ctrlKey && e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault(); e.stopPropagation(); divisao.click(); return;
    }
    if (e.target === cor || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const botoes = [...m.querySelectorAll("button")], i = botoes.indexOf(e.target);
    const j = e.key === "Home" ? 0 : e.key === "End" ? botoes.length - 1 :
      (i + (e.key === "ArrowDown" ? 1 : -1) + botoes.length) % botoes.length;
    botoes[j].focus();
  };
  document.body.append(m);
  m.style.left = Math.max(4, Math.min(x, innerWidth - m.offsetWidth - 4)) + "px";
  m.style.top = Math.max(4, Math.min(y, innerHeight - m.offsetHeight - 4)) + "px";
  m.querySelector("button").focus();
}
document.addEventListener("pointerdown", e => { const m = $("#menu-ctx"); if (m && !m.contains(e.target)) m.remove(); });
async function fecharAba(id, confirmar = false) {
  const a = abas.get(id); if (!a) return;
  if (confirmar || a.fixada) {
    const aviso = a.conectado ? " A conexão e os processos desta sessão serão encerrados." : "";
    if (!(await perguntarGuia(`Fechar a guia <b>${esc(a.nome)}</b>?${aviso}`, "Fechar guia")) || !abas.has(id)) return;
  }
  if (a.conectado) { await api.desconectar(id); if (["web", "ssh"].includes(a.tipo)) oferecerRemoverRede(); }
  const vizinha = paineis.includes(id) && paineis.find(p => p !== id);
  if (vizinha) mostrarPaineis([]);
  a.term.dispose(); a.pane.remove(); a.btn.remove(); abas.delete(id); ilhaSync();
  if (a.fixada) salvarFixadas();
  try { api.aba_fechar(id); } catch (_) {}
  const eraAtiva = ativa === id;
  if (eraAtiva) { $("#historico").innerHTML = ""; ativa = null; }   // as evidências da aba fechada saem da lateral
  if (!abas.size) novaAba("serial");
  else if (eraAtiva) ativar(vizinha || ordemAbas().pop());
  arrumarAbas();
}

const ESTADOS_SESSAO = {
  ativa: "Sessão ativa", aguardando: "Aguardando confirmação do shell", login: "Aguardando login",
  encerrada: "Sessão encerrada ou desconectada", falha: "Falha de conexão", demo: "Demonstração",
  silenciosa: "Sem confirmação recente do equipamento"
};
const TIPOS_IA = ["codex", "claude", "gemini", "copilot"];
function estadoDaSessao(a, estado) {
  a.estadoSessao = estado;
  const p = a.btn.querySelector(".ponto");
  p.dataset.estado = estado;
  p.title = ESTADOS_SESSAO[estado];
  p.setAttribute("role", "img");
  p.setAttribute("aria-label", p.title);
}
let cotasLocais = {}, proximaCota = 0, consultandoCota = false;
function desenharSaldo() {
  ilhaSync();
  for (const tipo of TIPOS_IA) {
    const botao = document.querySelector(`#tipos [data-tipo="${tipo}"]`);
    const selo = botao.querySelector(".cota-ia");
    const local = cotasLocais[tipo] || {};
    const recentes = [...abas.values()].filter(a => a.tipo === tipo && a.conectado && !a.demo &&
      Date.now() - a.instanteSaldo < 300000).sort((a,b) => b.instanteSaldo - a.instanteSaldo);
    const valor = (chave, campo) => {
      const j = local[chave];
      if (Number.isFinite(j?.livre) && j.fim * 1000 > Date.now()) return j.livre + "%";
      return recentes.find(a => a[campo])?.[campo];
    };
    const sessao = valor("sessao", "saldoSessao"), semana = valor("semana", "saldoSemana");
    let saldo = sessao;
    if (tipo === "claude") {
      const janelas = [sessao, semana].filter(Boolean).map(v => parseFloat(v));
      if (janelas.length) saldo = Math.min(...janelas) + "%";
    }
    selo.textContent = saldo || "—";
    selo.classList.toggle("conhecida", !!saldo);
    const hora = local.instante ? " · leitura às " + new Date(local.instante * 1000).toLocaleTimeString() : "";
    const limite = tipo === "claude" && saldo ? " · Disponível nas janelas conhecidas: " + saldo : "";
    botao.title = botao.querySelector("b").textContent + limite + " · Sessão disponível: " + (sessao || "sem informação") +
      " · Semana disponível: " + (semana || "sem informação") + hora;
    botao.setAttribute("aria-label", botao.title);
  }
}
async function consultarCotas() {
  if (document.hidden || !document.querySelector('#tipos [data-cat="ia"]:not(.oculto)')) return;
  desenharSaldo();
  if (!api || window.__portal || !api.cotas_assistentes || consultandoCota || Date.now() < proximaCota) return;
  consultandoCota = true;
  proximaCota = Date.now() + 15000;
  try { cotasLocais = await api.cotas_assistentes() || {}; }
  catch (_) { cotasLocais = {}; }
  finally { consultandoCota = false; desenharSaldo(); }
}
setInterval(consultarCotas, 15000);
document.addEventListener("visibilitychange", consultarCotas);
function observarSessao(a) {
  if (!a.conectado || a.demo) return;
  const linha = linhaCursor(a.term).trim();
  if (!["web", "remoto"].includes(a.tipo)) {
    if (/^(?:session (?:expired|timed out)|sessão expirada)[.!]?$/i.test(linha)) estadoDaSessao(a, "login");
    else if (RE_USER.test(linha) || (a.estadoSessao === "aguardando" && RE_PASS.test(linha))) estadoDaSessao(a, "login");
    else if (RE_PROMPT.test(linha)) estadoDaSessao(a, "ativa");
    else if (a.estadoSessao === "silenciosa" && linha) estadoDaSessao(a, "ativa");
  }
  if (!TIPOS_IA.includes(a.tipo)) return;
  if (a.estadoSessao === "login") {
    a.saldoSessao = a.saldoSemana = null;
    desenharSaldo();
    return;
  }
  if (/^PS [^>]+>\s*$/.test(linha)) {
    estadoDaSessao(a, "encerrada");
    a.saldoSessao = a.saldoSemana = null;
  } else {
    const b = a.term.buffer.active;
    let janela = "";
    for (let y = b.baseY; y < b.baseY + a.term.rows; y++) {
      const txt = b.getLine(y)?.translateToString(true) || "";
      // Reconhece apenas linhas que identificam a janela de uso.
      const m = txt.match(/^\s*[│┃]?\s*(?:5h limit|session limit|limite da sessão)\s*:\s*(?:\[[^\]]*\]\s*)?(100|\d{1,2})%\s*(?:left|remaining|restante)/i);
      if (m) { a.saldoSessao = m[1] + "%"; a.instanteSaldo = Date.now(); }
      const semanal = txt.match(/^\s*[│┃]?\s*(?:weekly limit|limite semanal)\s*:\s*(?:\[[^\]]*\]\s*)?(100|\d{1,2})%\s*(?:left|remaining|restante)/i);
      if (semanal) { a.saldoSemana = semanal[1] + "%"; a.instanteSaldo = Date.now(); }
      if (/^\s*Current session\s*$/i.test(txt)) janela = "sessao";
      else if (/^\s*Current week(?:\s*\(all models\))?\s*$/i.test(txt)) janela = "semana";
      else if (/Current week/i.test(txt)) janela = "";
      else if (janela) {
        const usado = txt.match(/^\s*[█▏▎▍▌▋▊▉░▒▓\s]*(100|\d{1,2})% used\s*$/i);
        if (usado) { a[janela === "semana" ? "saldoSemana" : "saldoSessao"] = (100 - Number(usado[1])) + "%"; a.instanteSaldo = Date.now(); janela = ""; }
      }
    }
  }
  desenharSaldo();
}
setInterval(() => abas.forEach(a => {
  if (a.conectado && ["serial", "ssh"].includes(a.tipo) && a.estadoSessao === "ativa" &&
      Date.now() - a.ultimaEscrita > 120000) estadoDaSessao(a, "silenciosa");
}), 5000);
function setConectado(a, on, nome) {
  a.conectado = on;
  a.inicio = on ? (a.inicio && a.conectado ? a.inicio : Date.now()) : null;
  if (nome) a.nome = nome;
  if (!on) {
    a.histId = null; a.loginPend = null; esconderSugestao(a); a.share = null;
    a.chatFamiliaBanner = a.chatFamiliaPrompt = null;
    desenharShare(a);
  }
  a.saldoSessao = a.saldoSemana = null;
  estadoDaSessao(a, !on ? "encerrada" : ["serial", "ssh"].includes(a.tipo) ? "aguardando" : "ativa");
  if (on && ["serial", "ssh"].includes(a.tipo)) observarSessao(a);
  desenharRec(a);
  a.btn.querySelector(".nome").textContent = on || a.nome !== "Nova aba" ? a.nome : "Nova aba";
  a.btn.title = a.nome;
  if (paineis.includes(a.id)) mostrarPaineis(paineis);
  // ⏱ é preferência DA ABA: reconectou com ele ligado? liga de novo na sessão nova
  if (on && a.manterAtiva && api && !a.demo) api.manter_ativa(a.id, true).then((r) => { a.manterAtiva = !!r.ativo; desenharAtiva(a); }).catch(() => {});
  desenharAtiva(a);
  if (a.id === ativa) { atualizarBotaoConectar(); $("#aba-alvo").textContent = on ? a.nome : ""; rotuloAbaLateral(a); }
  ilhaSync();
  arrumarAbas(); atualizarEstadosEquip();
}

// ---------- gravação por aba: REC vermelho = gravando · REC cinza riscado = sem gravar (clique para mudar) ----------
function desenharRec(a) {
  ilhaSync();
  const r = a.btn && a.btn.querySelector(".rec"); if (!r) return;
  const mostra = a.conectado && a.tipo !== "web";   // aba Web não grava terminal
  r.classList.toggle("on", mostra && !!a.gravando);
  r.classList.toggle("off", mostra && !a.gravando);
  r.title = a.gravando ? "Gravando esta sessão — clique para parar ou assistir" : "Esta aba NÃO está gravando — clique para gravar";
  if (a.id === ativa) desenharGuia(a);
}
function menuGravacao(a) {
  if (!a.conectado) return;
  if (a.mudandoRec) return toast("Aguarde — mudando a gravação desta aba…");
  const mudar = async (ligar) => {
    a.mudandoRec = true;
    a.gravando = ligar; desenharRec(a);   // resposta NA HORA no selo REC; o Python confirma em seguida
    toast(ligar ? "⏺ Gravando esta aba" : "⏸ Gravação parada — daqui em diante só o log em texto (leve)");
    try {
      const r = await api.gravacao_ligar(a.id, ligar);
      a.gravando = !!(r.ok ? r.gravando : !ligar); desenharRec(a);
      if (!r.ok) toast(r.erro, "erro");
    } finally { a.mudandoRec = false; }
  };
  const chave = "rec-" + a.id;   // um aviso por aba: cliques repetidos no REC não empilham
  if (a.gravando)
    pedido(`⏺ <b>${esc(a.nome)}</b> está sendo gravada.<br><small>Parar economiza espaço e deixa o PC mais leve; o log em texto continua.</small>`,
      "⏸ Parar gravação", "▶ Assistir até agora", async (parar) => {
        if (parar) return mudar(false);
        const g = await api.gravacao_aba(a.id); if (g) tocarGravacao(g, `${a.nome} — gravação até agora`);
      }, chave);
  else
    pedido(`○ <b>${esc(a.nome)}</b> não está gravando.<br><small>Gravar agora cria uma gravação nova a partir deste momento.</small>`,
      "⏺ Gravar agora", "Agora não", (sim) => sim && mudar(true), chave);
}

function atualizarBotaoConectar() {
  const a = A(), b = $("#conectar");
  b.textContent = a && a.conectado ? "Desconectar" : "Conectar";
  b.classList.toggle("perigo", !!(a && a.conectado));
}

// ================= conexão =================
function tipoTopo() { const b = document.querySelector("#abas button.ativa"); return b ? b.dataset.tipo : "serial"; }
// barra de categorias: só troca os tipos à vista (não conecta nem muda o tipo da aba)
function mostrarCategoria(cat) {
  document.querySelectorAll("#abas .cat").forEach((c) => { const s = c.dataset.cat === cat; c.classList.toggle("sel", s); c.setAttribute("aria-selected", s); });
  document.querySelectorAll("#abas .tipos-grupo").forEach((g) => {
    const v = g.dataset.cat === cat; if (v && g.classList.contains("oculto")) $("#tipos").scrollLeft = 0; g.classList.toggle("oculto", !v); });
  fecharMais();
  ajustarTipos();
  const ab = document.querySelector("#abas [data-tipo].ativa"), ca = ab?.closest(".tipos-grupo")?.dataset.cat;
  if (ca && cat !== "demos") camposDoTipo(ca === cat ? ab.dataset.tipo : null);
  if (cat === "ia") consultarCotas();
}
// faixa dos tipos estreita (celular): o tipo ativo fica à vista e a borda esmaece quando há mais à direita/esquerda
function ajustarTipos() {
  const t = $("#tipos"); if (!t) return;
  const ab = $("#abas");   // categoria com tipos demais para a largura: as categorias NÃO selecionadas ficam só com o ícone (o nome vai no título), em vez de rolar de lado
  if (ab) { ab.classList.remove("cats-curtas"); if (t.scrollWidth > t.clientWidth + 1 && window.innerWidth > 900) ab.classList.add("cats-curtas"); }
  const b = t.querySelector(".tipos-grupo:not(.oculto) button.ativa:not([role='menuitem'])");
  if (b) { const bl = b.offsetLeft, br = bl + b.offsetWidth;   // .tipos é position: relative
    if (bl < t.scrollLeft) t.scrollLeft = bl - 8; else if (br > t.scrollLeft + t.clientWidth) t.scrollLeft = br - t.clientWidth + 8; }
  bordasTipos();
}
function bordasTipos() {
  const t = $("#tipos"); if (!t) return;
  const rola = t.scrollWidth > t.clientWidth + 1;
  t.classList.toggle("mais-dir", rola && t.scrollLeft + t.clientWidth < t.scrollWidth - 2);
  t.classList.toggle("mais-esq", rola && t.scrollLeft > 2);
}
// abrem na hora: não têm destino a preencher. Vêm dos botões data-direto do seletor (gerados do catálogo ferramentas_cli.py);
// botões "a confirmar" estão desligados e não entram.
const DIRETOS = [...document.querySelectorAll("#tipos [data-direto]")].map((b) => b.dataset.tipo);
// campos específicos do tipo (porta, SSH, URL, dica); tipo null = a categoria à vista não contém o tipo ativo: nada de campos órfãos
function camposDoTipo(tipo) {
  if (!tipo) {
    $("#conectar").classList.add("invisivel");
    ["serial", "ssh", "web"].forEach((t) => $("#campos-" + t).classList.add("oculto"));
    $("#campos-livre").classList.remove("oculto"); $("#livre-txt").textContent = "Escolha uma opção deste grupo";
    return;
  }
  $("#conectar").classList.toggle("invisivel", !!document.querySelector(`#tipos [data-direto][data-tipo="${tipo}"]`));   // some (mas guarda o lugar) quando não há o que conectar
  $("#campos-serial").classList.toggle("oculto", tipo !== "serial");
  $("#campos-ssh").classList.toggle("oculto", tipo !== "ssh");
  $("#campos-web").classList.toggle("oculto", tipo !== "web");
  const LIVRE = { powershell: "Terminal local — abre ao clicar", cmd: "Terminal local — abre ao clicar",
                  azure: "Azure CLI — instala sozinho se faltar", gcp: "Google Cloud CLI — instala sozinho se faltar",
                  aws: "AWS CLI — instala sozinho se faltar", claude: "Assistente de IA (Claude Code)", codex: "Assistente de IA (Codex)",
                  gemini: "Assistente de IA (Gemini CLI)", copilot: "Assistente de IA (Copilot CLI)" };
  $("#campos-livre").classList.toggle("oculto", ["serial", "ssh", "web"].includes(tipo));   // o espaço do destino nunca some: não há "pulo" de layout
  $("#livre-txt").textContent = LIVRE[tipo] || document.querySelector(`#tipos [data-tipo="${tipo}"]`)?.dataset.livre || "";
}
function selecionarTipo(tipo, silencioso) {
  document.querySelectorAll("#abas [data-tipo]").forEach((x) => x.classList.toggle("ativa", x.dataset.tipo === tipo));
  atualizarMais();
  const it = document.querySelector(`#abas [data-tipo="${tipo}"]`), g = it && it.closest(".tipos-grupo");
  const cat = silencioso && A()?.demo ? "demos" : g?.dataset.cat;
  if (cat) {
    mostrarCategoria(cat);
    document.querySelectorAll("#abas .cat").forEach((c) => {
      c.classList.toggle("tem-ativo", c.dataset.cat === cat);
      if (cat !== "demos" && c.dataset.cat === cat) c.dataset.ultimo = tipo;
    });
  }
  camposDoTipo(tipo);
  const a = A(); if (a && !silencioso) {
    if (a.tipo !== tipo) a.params = null;
    if (tipo === "web" && paineis.includes(a.id)) mostrarPaineis([]);
    a.tipo = tipo;
    if (a.fixada) salvarFixadas();
  }
}

async function conectar(a = A(), pularRede = false, parametros = null) {
  if (!a) return;
  if (a.demo) demoParar(a);   // conectar de verdade encerra a demonstração
  if (window.__portal && !a.conectado) return window.__portal.oferecer();   // portal web sem computador: convida a conectar
  if (a.conectado) {
    await api.desconectar(a.id); setConectado(a, false); a.term.write("\r\n\x1b[90m[desconectado]\x1b[0m\r\n");
    if (["web", "ssh"].includes(a.tipo)) oferecerRemoverRede();   // fim da sessão: tira o IP temporário
    return;
  }
  const tipo = a.tipo;
  const { porta, baud, destino } = parametros || { porta: $("#porta").value, baud: $("#baud").value,
    destino: $(tipo === "web" ? "#web-url" : "#ssh-destino").value.trim() };
  if (tipo === "ssh" && !pularRede && destino) {
    const av = await api.rede_avaliar(destino, [22]);
    if (av.ok && !av.alcanca) return abrirRede("ssh", () => {
      if (abas.get(a.id) === a && !a.conectado && a.tipo === tipo) conectar(a, true, { porta, baud, destino });
    }, av);
  }
  if (tipo === "serial" && !porta) return toast("Conecte o cabo console e clique em ⟳", "aviso");
  if (tipo === "serial" && [...abas.values()].some((x) => x !== a && x.conectado && x.tipo === "serial" && x.alvo === porta))
    return toast(`A ${porta} já está aberta em outra aba`, "aviso");
  if (tipo === "ssh" && !destino) return toast("Informe usuario@ip", "aviso");
  if (tipo === "web") return conectarWeb(a, false, destino);
  a.term.write("\x1bc");
  const versaoFechamento = a.versaoFechamento;
  const r = await api.conectar(a.id, tipo, porta, baud, destino);
  if (a.versaoFechamento !== versaoFechamento || abas.get(a.id) !== a) return;
  if (!r.ok) {
    a.term.write(`\x1b[31m${r.erro}\x1b[0m\r\n`);
    estadoDaSessao(a, "falha");
    if (tipo === "serial" && r.porta_ocupada) {   // porta presa: oferece destravar na hora (e reconecta sozinho)
      a.term.write(`\x1b[33mA ${porta} está ocupada ou travada — tentando liberar…\x1b[0m\r\n`);
      return liberarPorta(porta, a);
    }
    toast(r.erro, "erro");
    // problema típico de cabo/driver: já abre o diagnóstico com a correção
    if (tipo === "serial" && /31|não está funcionando|not functioning/i.test(r.erro)) {
      a.term.write("\x1b[33mAbrindo o diagnóstico do cabo…\x1b[0m\r\n"); diagnosticarCabo();
    }
    return;
  }
  a.alvo = r.alvo; a.params = { porta, baud, destino }; a.ultimoPrompt = ""; a.gravando = !!r.gravando;
  a.histId = r.hist_id;
  if (a.histId && a.etiqueta) guardarEtiquetaSessao(a);
  setConectado(a, true, r.nome); a.term.focus();
  if (a.fixada) salvarFixadas();
  if (tipo === "serial") api.escrever(a.id, "\r");  // mostra o prompt / tela de login
}

// ---------- 🔓 destravar porta COM (sem reiniciar o app e sem enviar nada ao equipamento) ----------
async function liberarPorta(porta = $("#porta").value, reconectarEm = null) {
  if (!porta) return toast("Escolha a porta COM", "aviso");
  const pronto = (msg) => {
    toast(msg);
    if (reconectarEm && abas.has(reconectarEm.id) && !reconectarEm.conectado) conectar(reconectarEm);
  };
  const r = await api.porta_liberar(porta);
  if (r.ok) return pronto(r.acao === "ja_livre" ? `A ${porta} está livre` : `🔓 ${porta} liberada (estava presa no app)`);
  if (r.aba) {
    const x = abas.get(r.aba);
    return pedido(`🔓 ${esc(r.erro)}<br><small>Uma porta COM só pode estar em uma aba por vez.</small>`, "Ir para a aba", "Desconectar ela",
      async (ir) => { if (ir) { if (x) ativar(x.id); return; } if (x) { await conectar(x); } setTimeout(() => liberarPorta(porta, reconectarEm), 600); });
  }
  if (r.programas && r.programas.length) {
    const p = r.programas[0];
    return pedido(`🔓 A <b>${esc(porta)}</b> parece estar com outro programa: <b>${esc(r.programas.map((x) => x.nome).join(", "))}</b>.<br>
      <small>Feche-o (o que estiver aberto nele será perdido) para o DASSH Code usar a porta.</small>`, `Fechar ${esc(p.nome)}`, "Cancelar",
      async (sim) => { if (!sim) return; const f = await api.porta_fechar_programa(p.pid, p.nome);
        if (!f.ok) return toast(f.erro || "Não foi possível fechar", "erro"); setTimeout(() => liberarPorta(porta, reconectarEm), 800); });
  }
  pedido(`🔓 A <b>${esc(porta)}</b> continua travada (nenhum programa conhecido está com ela).<br>
    <small>Posso <b>reiniciar o adaptador USB</b> pelo Windows — é o mesmo que tirar e pôr o cabo. Não troca o driver.
    O Windows vai pedir permissão.</small>`, "Reiniciar adaptador", "Cancelar", async (sim) => {
    if (!sim) return;
    toast("Reiniciando o adaptador USB…");
    const x = await api.porta_liberar(porta, "reiniciar");
    if (x.ok) { await carregarPortas(); return pronto(`🔓 ${porta} liberada (adaptador reiniciado)`); }
    toast(`Ainda travada: ${x.erro || ""} — tire e ponha o cabo USB`, "erro"); diagnosticarCabo();
  });
}

// ---------- aba Web: navegador controlado sobre a área do terminal ----------
async function conectarWeb(a, pularRede = false, url = $("#web-url").value.trim()) {
  if (!url) return toast("Informe o endereço do iDRAC / iLO / iBMC", "aviso");
  if (!pularRede) {  // equipamento não responde? oferece o IP temporário na faixa dele
    toast("Verificando a rede do equipamento…");
    const av = await api.rede_avaliar(url, [443, 80, 8443]);
    if (av.ok && !av.alcanca) return abrirRede("web", () => conectarWeb(a, true, url), av);
  }
  const el = $("#terminal").getBoundingClientRect(), barra = outerHeight - innerHeight;
  const rect = { x: screenX + el.left, y: screenY + barra + el.top, w: el.width, h: el.height };
  toast("Abrindo o navegador…");
  const r = await api.conectar(a.id, "web", null, null, url, rect);
  if (!r.ok) return toast(r.erro, "erro");
  a.alvo = r.alvo; a.params = { destino: url }; a.navegador = r.navegador;
  a.histId = r.hist_id;
  if (a.histId && a.etiqueta) guardarEtiquetaSessao(a);
  a.pane.classList.add("web"); a.painel = false; a.janelas = [];
  setConectado(a, true, r.nome);
  montarWeb(a); desenharWeb(a);
  if (a.fixada) salvarFixadas();
  toast(`${r.navegador} aberto DENTRO do DASSH Code — use 📸 / 📤 na barra acima da página`);
}

// ---------- janelas encaixadas: barra da aba Web, tela cheia e sincronização da posição ----------
function montarWeb(a) {
  if (a.pane.querySelector(".web-barra")) return;
  a.pane.insertAdjacentHTML("afterbegin", `<div class="web-barra">
      <input class="wb-url" spellcheck="false" title="Endereço da página à vista — clique, digite outro e tecle Enter para abrir" placeholder="Endereço">
      <div class="wb-janelas" title="Subabas: cada janela que o equipamento abre (console virtual, popups) aparece aqui"></div>
      <span class="wb-modo" title="O que o print captura">
        <button data-modo="tela" class="on" title="Só o que está visível na janela (padrão)">Tela</button><button data-modo="inteira" title="A página inteira, inclusive o que está abaixo da dobra (páginas compridas viram partes legíveis)">Página inteira</button></span>
      <button class="btn mini primario" data-wb="cap" title="Salvar a evidência da janela à vista (no modo escolhido ao lado)">📸</button>
      <button class="btn mini" data-wb="env" title="Capturar e enviar ao WhatsApp">📤</button>
      <button class="btn mini" data-wb="painel" title="Mostrar/ocultar o painel da aba (janelas, Java, última captura)">☰ Painel</button>
      <button class="btn mini" data-wb="cheia" title="Usar a tela inteira para o equipamento">⤢ Tela cheia</button>
    </div><div class="web-area"></div>`);
  const url = a.pane.querySelector(".wb-url");
  url.onkeydown = async (ev) => {
    if (ev.key !== "Enter") return;
    const r = await api.web_navegar(a.id, url.value); if (!r.ok) return toast(r.erro, "erro");
    a.painel = false; desenharBarraWeb(a); url.blur();
  };
  a.pane.querySelectorAll("[data-modo]").forEach((b) => (b.onclick = () => {
    a.modoWeb = b.dataset.modo; desenharBarraWeb(a);
    toast(a.modoWeb === "inteira" ? "🖥 Os prints desta aba vão capturar a PÁGINA INTEIRA" : "📸 Os prints desta aba vão capturar só a TELA visível");
  }));
  if (!a.timerUrl) a.timerUrl = setInterval(async () => {   // mantém a barra de endereço igual à página à vista
    if (!a.conectado || a.id !== ativa || document.activeElement === url) return;
    const r = await api.web_url(a.id); if (r && r.ok && r.url !== url.value) url.value = r.url;
  }, 1500);
  const area = a.pane.querySelector(".web-area"), velho = a.pane.querySelector(".web-painel");
  if (velho) area.appendChild(velho);
  a.pane.querySelector("[data-wb=cap]").onclick = () => capturarWeb(a, false);
  a.pane.querySelector("[data-wb=env]").onclick = () => capturarWeb(a, true);
  a.pane.querySelector("[data-wb=painel]").onclick = () => { a.painel = !a.painel; desenharBarraWeb(a); if (a.painel) desenharWeb(a); };
  a.pane.querySelector("[data-wb=cheia]").onclick = () => telaCheia(!document.body.classList.contains("tela-cheia"));
  desenharBarraWeb(a);
}
function desenharBarraWeb(a) {
  const b = a.pane.querySelector(".web-barra"); if (!b) return;
  b.querySelectorAll("[data-modo]").forEach((x) => x.classList.toggle("on", x.dataset.modo === (a.modoWeb || "tela")));
  if (!b.querySelector(".wb-url").value) b.querySelector(".wb-url").value = a.alvo || "";
  b.querySelector("[data-wb=painel]").classList.toggle("on", !!a.painel);
  b.querySelector("[data-wb=cheia]").innerHTML = document.body.classList.contains("tela-cheia") ? "↩ Voltar ao normal" : "⤢ Tela cheia";
  const j = b.querySelector(".wb-janelas"), js = a.janelas || [];
  j.innerHTML = js.map((x, i) => `<div class="wb-jan ${x.ativa ? "ativa" : ""}" data-h="${x.h}" title="${esc(x.titulo)}">
      <span class="wb-jt">${x.java ? "☕" : "🗔"} ${esc((x.titulo || (i === 0 ? "Principal" : "Janela")).slice(0, 22))}</span>${i ? `<button class="wb-x" data-x="${x.h}" title="Fechar esta subaba">✕</button>` : ""}</div>`).join("");
  j.querySelectorAll("[data-h]").forEach((e) => (e.onclick = async (ev) => {
    if (ev.target.closest("[data-x]")) return;
    a.painel = false; await api.web_mostrar(a.id, +e.dataset.h); a.janelas = await api.web_janelas(a.id); desenharBarraWeb(a);
  }));
  j.querySelectorAll("[data-x]").forEach((e) => (e.onclick = async () => {
    await api.web_fechar_janela(a.id, +e.dataset.x); setTimeout(async () => { a.janelas = await api.web_janelas(a.id); desenharBarraWeb(a); }, 600);
  }));
}
window.onJanelas = (sid, lista) => {
  const a = abas.get(sid); if (!a) return;
  const nova = (lista || []).length > (a.janelas || []).length;
  a.janelas = lista || []; if (nova) a.painel = false;
  desenharBarraWeb(a);
  if (nova && a.janelas.some((x) => x.ativa && x.java)) toast("☕ Console virtual (Java) aberto aqui dentro — capture pela barra 📸");
};
function capturarWeb(a, enviar) {
  const at = (a.janelas || []).find((x) => x.ativa);
  evidencia(enviar, "", a, "", at && at.java ? "java" : undefined);
}
async function telaCheia(on) {
  document.body.classList.toggle("tela-cheia", on);
  try { await api.tela_cheia(on); } catch (_) {}
  abas.forEach(desenharBarraWeb);
  if (on) toast("Tela cheia — clique em ↩ Voltar ao normal na barra para sair");
}
// a cada 0,3 s: diz ao Python onde fica a área da aba Web e se ela está à vista (some sob painéis/modais do app)
setInterval(() => {
  const sobre = document.querySelector(".modal:not(.oculto), .popover:not(.oculto), .tema-pop:not(.oculto), .menu-abas:not(.oculto)") ||
                ($("#pedidos") && $("#pedidos").children.length);
  abas.forEach((a) => {
    if (a.tipo !== "web" || !a.conectado) return;
    const area = a.pane.querySelector(".web-area"); if (!area) return;
    const el = area.getBoundingClientRect(), d = devicePixelRatio || 1;
    const rect = { x: Math.round(el.left * d), y: Math.round(el.top * d), w: Math.round(el.width * d), h: Math.round(el.height * d) };
    const vis = a.id === ativa && !sobre && !a.painel && el.width > 50 && !document.hidden;
    const u = a.ultRect, mudou = !u || vis !== a.ultVis || ["x", "y", "w", "h"].some((c) => Math.abs(rect[c] - u[c]) >= 3);
    if (mudou) { a.ultRect = rect; a.ultVis = vis; api.web_layout(a.id, rect, vis); }
  });
}, 300);
window.onEquip = (sid, rot) => {   // modelo / nº de série reconhecidos sozinhos na tela
  const a = abas.get(sid); if (!a || !rot || a.equip === rot) return;
  a.equip = rot; toast("🏷 Equipamento identificado: " + rot);
  if (a.id === ativa) $("#aba-alvo").textContent = `${a.nome} · ${rot}`;
  a.btn.title = `${a.nome} — ${rot}`;
};
window.onJava = (sid, estado, msg) => {
  toast(msg, estado === "erro" ? "erro" : "");
  const a = abas.get(sid); if (!a) return;
  if (estado === "aberto") a.javaAtivo = true;
  desenharWeb(a);
};
async function desenharWeb(a) {
  let p = a.pane.querySelector(".web-painel");
  if (!p) { p = document.createElement("div"); p.className = "web-painel"; (a.pane.querySelector(".web-area") || a.pane).appendChild(p); }
  if (!a.conectado) { p.innerHTML = `<h3>🌐 Navegador fechado</h3><p class="url">Clique em Conectar para abrir de novo.</p>`; return; }
  const r = await api.web_paginas(a.id), pags = r.ok ? r.paginas : [];
  p.innerHTML = `<h3>🌐 ${esc(a.alvo || "")}</h3><div class="url">Navegador: ${esc(a.navegador || "")} · ${pl(pags.length, "janela")}</div>
    <div class="web-acoes"><button class="btn primario" data-cap>📸 Capturar evidência <small>Ctrl+Alt+P</small></button>
      <button class="btn" data-env>📤 Capturar e enviar <small>Ctrl+Alt+E</small></button>
      <button class="btn" data-fr>🗔 Voltar ao navegador</button><button class="btn" data-at>⟳ Atualizar lista</button></div>
    ${a.javaAtivo ? `<ul class="web-janelas"><li class="ativa"><span>☕ Console Java do equipamento<br><small>aberto com o Java próprio do DASSH Code
      (sem Java instalado, sem lista de exceções)</small></span><button class="btn primario" data-java="0">📸 Capturar</button>
      <button class="btn" data-java="1">📤 Capturar e enviar</button></li></ul>` : ""}
    <ul class="web-janelas">${pags.map((g) => `<li class="${g.ativa ? "ativa" : ""}"><span>${esc(g.titulo)}<br><small>${esc(g.url)}</small></span>
      <button class="btn" data-capi="${g.i}">📸 Capturar esta</button><button class="btn" data-fri="${g.i}">Mostrar</button></li>`).join("")}</ul>
    <div class="web-dica">💡 O navegador e o <b>console virtual</b> (HTML5 ou Java) abrem <b>dentro do DASSH Code</b>, nesta área.
      Cada janela vira um botão na barra de cima — clique para alternar. 📸 captura a janela à vista. <b>⤢ Tela cheia</b> usa a tela
      inteira para o equipamento; <b>↩ Voltar ao normal</b> restaura. Certificados próprios desses equipamentos são aceitos.</div>
    ${a.ultimaWeb ? `<img class="web-ultima" src="${a.ultimaWeb}" alt="">` : ""}`;
  p.querySelector("[data-cap]").onclick = () => evidencia(false);
  p.querySelector("[data-env]").onclick = () => evidencia(true);
  p.querySelector("[data-fr]").onclick = () => { a.painel = false; desenharBarraWeb(a); };
  p.querySelector("[data-at]").onclick = () => desenharWeb(a);
  p.querySelectorAll("[data-capi]").forEach((b) => (b.onclick = () => evidencia(false, "", a, "", +b.dataset.capi)));
  p.querySelectorAll("[data-fri]").forEach((b) => (b.onclick = async () => {
    await api.web_frente(a.id, +b.dataset.fri); a.painel = false; a.janelas = await api.web_janelas(a.id); desenharBarraWeb(a);
  }));
  p.querySelectorAll("[data-java]").forEach((b) => (b.onclick = () => evidencia(b.dataset.java === "1", "", a, "", "java")));
}

async function carregarPortas(lista) {
  const sel = $("#porta"), atual = sel.value; sel.innerHTML = "";
  (lista || (await api.portas())).forEach((p) => {
    const o = document.createElement("option"); o.value = p.porta; o.textContent = `${p.porta} — ${p.descricao}`; sel.appendChild(o);
  });
  if (!sel.options.length) { const o = document.createElement("option"); o.textContent = "Nenhuma porta COM"; o.value = ""; sel.appendChild(o); }
  if ([...sel.options].some((o) => o.value === atual)) sel.value = atual;
}

// ================= cofre: detectar login e sugerir =================
function linhaCursor(term) {
  const b = term.buffer.active, ln = b.getLine(b.baseY + b.cursorY);
  return ln ? ln.translateToString(true) : "";
}
function verificarLogin(a) {
  if (!a.conectado) return;
  const txt = linhaCursor(a.term), b = a.term.buffer.active, chave = `${b.baseY + b.cursorY}|${txt}`;
  const user = RE_USER.test(txt), pass = !user && RE_PASS.test(txt);
  if (!user && !pass) { if (a.sugestao) esconderSugestao(a); return; }  // o prompt de login passou
  if (chave === a.ultimoPrompt) return;
  a.ultimoPrompt = chave;
  if (pass && a.loginPend && Date.now() - a.loginPend.t < 30000) {  // usuário veio do cofre: completa a senha
    const id = a.loginPend.id; a.loginPend = null;
    preencherDoCofre(a, id, "senha").then((r) => r.ok ? toast("Senha preenchida pelo cofre") : toast(r.erro, "erro"));
    esconderSugestao(a); return;
  }
  mostrarSugestao(a, user ? "usuario" : "senha");
}
function ordenarCofre(a, modo) {
  const alvo = (a.alvo || "").toLowerCase();
  return cofre.filter((c) => modo !== "usuario" || c.usuario)
    .map((c) => ({ c, s: c.alvo && alvo && (alvo.includes(c.alvo.toLowerCase()) || c.alvo.toLowerCase().includes(alvo)) ? 0 : c.alvo ? 2 : 1 }))
    .sort((x, y) => x.s - y.s || x.c.nome.localeCompare(y.c.nome)).map((x) => x.c);
}
function mostrarSugestao(a, modo) {
  a.sugestao = modo;
  if (a.id !== ativa) { a.btn.classList.add("alerta"); return; }
  $("#sug-tit").textContent = modo === "usuario" ? "🔑 Pediu usuário" : "🔑 Pediu senha";
  const box = $("#sug-itens"); box.innerHTML = "";
  if (!COFRE.token) {   // cofre trancado: as credenciais (nem os nomes) não vêm sem o PIN
    const d = document.createElement("button");
    d.innerHTML = `🔒 Destrancar o cofre<small>pede o PIN do cofre</small>`;
    d.onclick = async () => { if (await garantirCofre("O equipamento pediu " + (modo === "usuario" ? "o usuário" : "a senha") + ".")) mostrarSugestao(a, modo); a.term.focus(); };
    box.appendChild(d);
  }
  ordenarCofre(a, modo).slice(0, 6).forEach((c) => {
    const bt = document.createElement("button");
    bt.innerHTML = `${esc(c.nome)}<small>${esc(modo === "usuario" ? c.usuario : c.usuario ? c.usuario : "senha")}</small>`;
    bt.onclick = async () => {
      const r = await preencherDoCofre(a, c.id, modo);
      if (!r.ok) return toast(r.erro, "erro");
      if (modo === "usuario") a.loginPend = { id: c.id, t: Date.now() }; else toast("Senha preenchida pelo cofre");
      esconderSugestao(a); a.term.focus();
    };
    box.appendChild(bt);
  });
  const g = document.createElement("button"); g.className = "gerenciar";
  g.textContent = !COFRE.token || cofre.length ? "Gerenciar cofre" : "Adicionar ao cofre"; g.onclick = abrirCofre; box.appendChild(g);
  $("#sugestao").classList.remove("oculto");
}
async function preencherDoCofre(a, id, campo) {   // trancado (venceu)? pede o PIN e tenta de novo uma vez
  let r = await cofreChamar("cofre_preencher", a.id, id, campo);
  if (r && r.trancado && await garantirCofre("O equipamento pediu " + (campo === "usuario" ? "o usuário" : "a senha") + "."))
    r = await cofreChamar("cofre_preencher", a.id, id, campo);
  return r || { ok: false, erro: "Cofre indisponível" };
}
function esconderSugestao(a) {
  a.sugestao = null; a.btn && a.btn.classList.remove("alerta");
  if (a.id === ativa) $("#sugestao").classList.add("oculto");
}

// ================= 🔢 cofre: PIN próprio (token do cofre) =================
// O backend só entrega/usa o cofre com o token devolvido pelo PIN (cofre_pin_abrir/definir); o token fica SÓ em memória
// desta janela, vence após X min sem uso e cai ao sair da seção 🔑 Cofre ou fechar a Biblioteca.
const COFRE = { token: null, min: 5, timer: null, ate: 0 };
function cofreEsquecer() { COFRE.token = null; cofre = []; clearTimeout(COFRE.timer); COFRE.ate = 0; }
async function cofreTrancar() {
  const t = COFRE.token; cofreEsquecer();
  if (t && api) try { await api.cofre_pin_trancar(t); } catch (e) { /* já vencido */ }
}
function cofreArmarTimer() {
  clearTimeout(COFRE.timer); COFRE.ate = Date.now() + COFRE.min * 60000;
  COFRE.timer = setTimeout(() => {
    cofreEsquecer(); toast("🔒 Cofre trancado por inatividade");
    if (BIB.sec === "cofre" && !$("#modal-bib").classList.contains("oculto")) desenharBib();
  }, COFRE.min * 60000 + 300);
}
function cofreAberto(r) { COFRE.token = r.token; COFRE.min = r.ocioso_min || COFRE.min; cofre = r.itens || []; cofreArmarTimer(); }
async function cofreChamar(metodo, ...args) {   // chamada do cofre COM o token; trancado no backend -> esquece aqui também
  const r = await (api || contaApi())[metodo](...args, COFRE.token);
  if (r && r.trancado) cofreEsquecer();
  else if (COFRE.token) { cofreArmarTimer(); if (r && Array.isArray(r.itens)) cofre = r.itens; }
  return r;
}
const PIN_TXT = {
  definir: ["🔢 Criar o PIN do cofre", "Criar e abrir"], abrir: ["🔒 Cofre trancado", "Destrancar"],
  trocar: ["🔢 Trocar o PIN do cofre", "Trocar PIN"], esqueci: ["🔑 Esqueci o PIN do cofre", "Redefinir PIN"],
};
function pinCamposHtml(est, modo, motivo) {
  const min = (est && est.pin_min) || 6, campo = (k, rot, ph = "") =>
    `<label>${rot} <input type="password" data-p="${k}" autocomplete="new-password" spellcheck="false" placeholder="${ph}"></label>`;
  const trava = est && est.travado_s ? `<p class="pin-msg erro">Muitas tentativas erradas: aguarde ${est.travado_s} s.</p>` : `<p class="pin-msg"></p>`;
  const topo = motivo ? `<p class="ajuda">${esc(motivo)}</p>` : "";
  if (modo === "definir") return topo + `<p class="ajuda"><b>Primeiro acesso:</b> crie um PIN só do cofre (mín. ${min} caracteres, números ou letras).
      Ele é pedido ao abrir o cofre, <b>além</b> da senha da conta, e o cofre tranca sozinho após ${est && est.ocioso_min || 5} min sem uso.</p>
      ${campo("novo", "Novo PIN")}${campo("conf", "Repita o PIN")}` + trava;
  if (modo === "trocar") return `${campo("atual", "PIN atual")}${campo("novo", "Novo PIN", `mín. ${min} caracteres`)}${campo("conf", "Repita o novo PIN")}` + trava;
  if (modo === "esqueci") return `<p class="ajuda">Com a <b>senha da sua conta</b> o PIN é redefinido e as credenciais ficam. Sem ela, só apagando
      todas as credenciais do cofre (não há como recuperá-las).</p>${campo("conta", "Senha da conta")}
      ${campo("novo", "Novo PIN", `mín. ${min} caracteres`)}${campo("conf", "Repita o novo PIN")}
      <label class="pin-apagar"><input type="checkbox" data-p="apagar"> Não sei a senha da conta: <b>apagar as credenciais</b> e recomeçar</label>` + trava;
  return topo + `${campo("atual", "PIN do cofre")}` + trava + `<a href="#" class="pin-esqueci" data-esqueci>Esqueci o PIN</a>`;
}
async function pinEnviar(box, modo) {
  const v = (k) => { const i = box.querySelector(`[data-p="${k}"]`); return i ? (i.type === "checkbox" ? i.checked : i.value) : ""; };
  const msg = box.querySelector(".pin-msg");
  const falha = (t) => { msg.textContent = "✖ " + t; msg.className = "pin-msg erro"; const i = box.querySelector("input[type=password]"); if (i) i.select(); return false; };
  if (modo !== "abrir" && v("novo") !== v("conf")) return falha("Os dois PINs não conferem.");
  msg.textContent = "Conferindo…"; msg.className = "pin-msg";
  const ponte = api || contaApi();
  const r = modo === "abrir" ? await ponte.cofre_pin_abrir(v("atual")) : modo === "definir" ? await ponte.cofre_pin_definir(v("novo"))
    : modo === "trocar" ? await ponte.cofre_pin_definir(v("novo"), v("atual")) : await ponte.cofre_pin_redefinir(v("conta"), v("novo"), !!v("apagar"));
  if (!r || !r.ok) return falha((r && r.erro) || "não foi possível");
  cofreAberto(r);
  if (modo !== "abrir") toast(modo === "definir" ? "🔢 PIN do cofre criado" : "🔢 PIN do cofre atualizado");
  return true;
}
function pinLigar(box, est, modo, aoTrocarModo) {
  const e = box.querySelector("[data-esqueci]"); if (e) e.onclick = (ev) => { ev.preventDefault(); aoTrocarModo("esqueci"); };
  const i = box.querySelector("input[type=password]"); if (i) setTimeout(() => i.focus(), 30);
}
// Fluxos internos (preencher login no terminal, Skill com senha do cofre): pede o PIN numa janelinha e segue.
async function garantirCofre(motivo, modoForcado) {
  const ponte = api || contaApi();
  if (!ponte.cofre_pin_estado) return false;
  if (COFRE.token && !modoForcado) { const r = await cofreChamar("cofre_listar"); if (r && r.ok) return true; }
  const est = await ponte.cofre_pin_estado(null);
  let modo = modoForcado || (est.definido ? "abrir" : "definir");
  const m = $("#modal-pin"), box = $("#pin-campos");
  return new Promise((res) => {
    let feito = false;
    const desenhar = () => {
      $("#pin-tit").textContent = PIN_TXT[modo][0]; $("#pin-ok").textContent = PIN_TXT[modo][1];
      box.innerHTML = pinCamposHtml(est, modo, modo === "abrir" || modo === "definir" ? motivo : "");
      pinLigar(box, est, modo, (n) => { modo = n; desenhar(); });
    };
    const obs = new MutationObserver(() => { if (m.classList.contains("oculto")) fim(false); });
    const fim = (v) => { if (feito) return; feito = true; obs.disconnect(); m.classList.add("oculto"); res(v); };
    $("#pin-form").onsubmit = async (ev) => { ev.preventDefault(); if (await pinEnviar(box, modo)) fim(true); };
    desenhar(); abrirModal("#modal-pin"); obs.observe(m, { attributes: true, attributeFilter: ["class"] });
  });
}
function limparFormCofre() {
  ["#cf-id", "#cf-nome", "#cf-usuario", "#cf-senha", "#cf-alvo"].forEach((s) => ($(s).value = ""));
  $("#cofre-form-tit").textContent = "Nova credencial"; $("#cofre-form").classList.add("oculto");
}
function formCofre(c) {
  $("#cofre-form").classList.remove("oculto");
  $("#cf-id").value = c ? c.id : ""; $("#cf-nome").value = c ? c.nome : ""; $("#cf-usuario").value = c ? c.usuario : "";
  $("#cf-senha").value = ""; $("#cf-senha").placeholder = c ? "Senha (vazio = manter a atual)" : "Senha";
  const a = A(); $("#cf-alvo").value = c ? c.alvo : (a && a.alvo) || "";
  $("#cofre-form-tit").textContent = c ? "Editar credencial" : "Nova credencial"; $("#cf-nome").focus();
}
const abrirCofre = () => abrirBiblioteca("cofre");   // 🔑 da tela principal, "Gerenciar cofre" da sugestão…

// ================= gerador de senha =================
const GS_INICIOS = "abacaxi abeto acaju amora aveia bambu banana batata bezerro biscoito bota brejo broto cacau caju canoa capim castanha cedro cera coco cometa cravo duna erva farofa figo foca favo goiaba grama gruta".split(" ");
const GS_FINS = "aberto aceso ativo atento bravo breve certo chato checo chique chuvoso curto direto divino doce dourado exato firme fofo forte fosco fresco farto denso gordo imenso macio maduro manso marrom morno novo".split(" ");
function sorteioSenha(total, dado) {
  const teto = 256 - (256 % total);
  do { crypto.getRandomValues(dado); } while (dado[0] >= teto);
  return dado[0] % total;
}
function gerarSenha(tamanho, simbolos, frase) {
  const dado = new Uint8Array(1);
  const pegar = (grupo) => grupo[sorteioSenha(grupo.length, dado)];
  if (frase) return Array.from({ length: 8 }, () => pegar(GS_INICIOS) + pegar(GS_FINS)).join("-");
  const grupos = ["abcdefghijkmnopqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789"];
  if (simbolos) grupos.push("!#$%&()*+,-.:=?@^_~");
  const todos = grupos.join("");
  let senha;
  do { senha = Array.from({ length: tamanho }, () => pegar(todos)).join(""); }
  while (!grupos.every((grupo) => [...senha].some((c) => grupo.includes(c))));
  return senha;
}

{
  const pin = $("#modal-pin");
  const dialogo = $("#gs-dialog"), valor = $("#gs-valor"), tamanho = $("#gs-tamanho"),
    simbolos = $("#gs-simbolos"), frase = $("#gs-frase"), status = $("#gs-status"), mostrar = $("#gs-mostrar"),
    cofreForm = $("#gs-cofre");
  let campo = null, origem = null, salvando = false;
  const ocultar = () => {
    valor.type = "password";
    mostrar.textContent = "Mostrar";
    mostrar.setAttribute("aria-pressed", "false");
  };
  const gerar = () => {
    $("#gs-tamanho-l").classList.toggle("oculto", frase.checked);
    $("#gs-simbolos-l").classList.toggle("oculto", frase.checked);
    if (!frase.checked && !tamanho.reportValidity()) { valor.value = ""; return; }
    valor.value = gerarSenha(tamanho.valueAsNumber, simbolos.checked, frase.checked);
    status.textContent = "";
    return true;
  };
  const fechar = () => {
    valor.value = "";
    ocultar();
    dialogo.close();
  };
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-gerar-senha]");
    if (!b || salvando || dialogo.open) return;
    const destino = b.dataset.gerarSenha;
    campo = destino ? document.getElementById(destino) : b.parentElement.querySelector("input[data-var]");
    if (!campo || campo.disabled) return;
    origem = b;
    tamanho.value = 20;
    simbolos.checked = true;
    frase.checked = false;
    $("#gs-nome").value = "";
    cofreForm.classList.toggle("oculto", NA_WEB || !contaApi().cofre_salvar || destino === "cf-senha");
    ocultar();
    gerar();
    dialogo.showModal();
  });
  pin.addEventListener("click", (ev) => {
    if (salvando && (ev.target === pin || ev.target.closest("[data-fecha]"))) fecharModal(pin);
  });
  pin.addEventListener("keydown", (ev) => {
    if (salvando && ev.key === "Escape") fecharModal(pin);
  });
  dialogo.addEventListener("cancel", (ev) => { ev.preventDefault(); fechar(); });
  dialogo.addEventListener("close", () => {
    const foco = origem;
    campo = null;
    origem = null;
    if (!salvando) foco?.focus();
  });
  $("#gs-gerar").onclick = gerar;
  frase.onchange = gerar;
  simbolos.onchange = gerar;
  tamanho.onchange = gerar;
  $("#gs-fechar").onclick = fechar;
  mostrar.onclick = () => {
    if (valor.type === "text") return ocultar();
    valor.type = "text";
    mostrar.textContent = "Ocultar";
    mostrar.setAttribute("aria-pressed", "true");
  };
  $("#gs-copiar").onclick = async () => {
    if (!valor.value) return;
    try {
      await navigator.clipboard.writeText(valor.value);
      status.textContent = "Copiada para a área de transferência.";
    } catch (_) { status.textContent = "Não foi possível copiar a senha."; }
  };
  $("#gs-usar").onclick = () => {
    if (!valor.value) return;
    const destino = campo;
    const repetir = { "ct-senha": "#ct-senha2", "cs-nova": "#cs-nova2" }[destino.id];
    destino.value = valor.value;
    destino.dispatchEvent(new Event("input", { bubbles: true }));
    if (repetir) $(repetir).value = valor.value;
    origem = destino;
    fechar();
  };
  cofreForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = $("#gs-nome").value.trim();
    if (!nome || !valor.value || NA_WEB || salvando) return;
    const foco = origem;
    const item = { nome, senha: valor.value, alvo: campo.dataset.var ? (A()?.alvo || "") : "" };
    salvando = true;
    fechar();
    pin.classList.add("gs-pin");
    try {
      if (await garantirCofre("Guardar a senha gerada.")) {
        const r = await cofreChamar("cofre_salvar", item);
        toast(r?.ok ? "Credencial salva no cofre" : "Não foi possível guardar a senha.", r?.ok ? "" : "erro");
      }
    } catch (_) {
      toast("Não foi possível guardar a senha.", "erro");
    } finally {
      item.senha = "";
      salvando = false;
      pin.classList.remove("gs-pin");
      foco?.focus();
    }
  };
}

// ================= histórico de sessões =================
function duracao(ini, fim) {
  if (!fim) return "<span style='color:var(--verde-cl)'>em andamento</span>";
  const s = Math.max(0, (new Date(fim.replace(" ", "T")) - new Date(ini.replace(" ", "T"))) / 1000);
  return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
}
// ================= paginação PADRÃO (todas as listas que crescem): 20 por página, mesmo visual =================
const POR_PAG = 20;
function paginador(el, total, pag, ir, rotulo = "item(ns)") {
  const paginas = Math.max(1, Math.ceil(total / POR_PAG)), p = Math.min(Math.max(0, pag), paginas - 1);
  el.className = "paginas";
  el.innerHTML = paginas > 1 ? `<button class="btn mini" data-p="${p - 1}" ${p ? "" : "disabled"}>‹ Anterior</button>
      <span>Página <b>${p + 1}</b> de ${paginas} · ${total} ${rotulo}</span>
      <button class="btn mini" data-p="${p + 1}" ${p < paginas - 1 ? "" : "disabled"}>Próxima ›</button>`
    : total ? `<span>${total} ${rotulo}</span>` : "";
  el.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => ir(+b.dataset.p)));
  return [p * POR_PAG, (p + 1) * POR_PAG, p];
}
// confirmação padrão de exclusão (sempre para a Lixeira)
const confirmarExclusao = (oque, cb) => pedido(`🗑 Excluir <b>${oque}</b>?<br><small>Vai para a <b>Lixeira</b> do Windows — dá para recuperar de lá.</small>`,
  "🗑 Excluir", "Cancelar", (sim) => sim && cb(), "excluir");

let HIST = [], histPag = 0;
async function abrirHistorico() { HIST = await api.historico(); histPag = 0; desenharHist(); abrirModal("#modal-hist"); }
function desenharHist() {
  const tb = $("#hist-linhas"); tb.innerHTML = "";
  const [ini, fim, p] = paginador($("#hist-pag"), HIST.length, histPag, (n) => { histPag = n; desenharHist(); }, "sessão(ões)");
  histPag = p;
  if (!HIST.length) tb.innerHTML = `<tr class="vazio"><td colspan="5">Nenhuma sessão registrada ainda.</td></tr>`;
  HIST.slice(ini, fim).forEach((r) => {
    const [d, t] = r.inicio.split(" "), [y, m, dd] = d.split("-");
    const ev = r.evidencias && r.evidencias.length ? r.evidencias.map((n) => "Nº " + pad2(n)).join(", ") : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${dd}/${m} ${t.slice(0, 5)}</td><td><span class="tipo">${esc(nomeTipo(r.tipo))}</span>${esc(r.nome)}</td>
      <td>${duracao(r.inicio, r.fim)}</td><td>${ev}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn" data-rc>Reconectar</button>
        <button class="btn" data-grav ${r.grav_existe ? "" : "disabled"}>▶ Gravação</button>
        <button class="btn" data-log ${r.log_existe ? "" : "disabled"}>Log</button>
        <button class="btn" data-x title="${r.ativa ? "Sessão aberta agora — desconecte antes" : "Excluir gravação e logs (vão para a Lixeira)"}" ${r.ativa ? "disabled" : ""}>🗑</button></td>`;
    tr.querySelector("[data-rc]").onclick = () => reconectar(r);
    tr.querySelector("[data-grav]").onclick = () => tocarGravacao(r.gravacao, `${r.nome} — ${dd}/${m} ${t.slice(0, 5)}`);
    tr.querySelector("[data-log]").onclick = () => api.abrir_arquivo(r.log);
    tr.querySelector("[data-x]").onclick = () => excluirSessao(r, async () => {
      HIST = await api.historico(); desenharHist();
    });
    tb.appendChild(tr);
  });
}
function excluirSessoes(rs, depois) {
  confirmarExclusao(`${rs.length} sessões (gravações e logs)`, async () => {
    let feitas = 0, arquivos = 0;
    for (const r of rs) {
      const x = await api.hist_excluir(r.id);
      if (x.ok) { feitas++; arquivos += x.arquivos || 0; } else toast(x.erro, "erro");
    }
    if (feitas) toast(`🗑 ${pl(feitas, "sessão excluída", "sessões excluídas")} — ${pl(arquivos, "arquivo")} na Lixeira`);
    await depois();
  });
}
function excluirSessao(r, depois) {
  confirmarExclusao(`a sessão ${esc(r.nome)} de ${esc(_dt(r.inicio))} (gravação e logs)`, async () => {
    const x = await api.hist_excluir(r.id);
    if (!x.ok) return toast(x.erro, "erro");
    toast(`🗑 Sessão excluída — ${pl(x.arquivos, "arquivo")} na Lixeira`);
    await depois();
  });
}

// ---------- 🖼 todas as evidências do atendimento: ver, abrir, excluir (com páginas) ----------
let EVS = [], evPag = 0;
async function abrirEvidencias() {
  const r = await api.evid_lista(); if (!r.ok) return toast(r.erro, "erro");
  EVS = r.itens; evPag = 0; desenharEvidencias(); abrirModal("#modal-evid");
}
function desenharEvidencias() {
  const g = $("#ev-grade");
  const [ini, fim, p] = paginador($("#ev-pag"), EVS.length, evPag, (n) => { evPag = n; desenharEvidencias(); }, "evidência(s)");
  evPag = p;
  g.innerHTML = EVS.length ? "" : `<p class="vazio">Nenhuma evidência neste atendimento ainda.</p>`;
  EVS.slice(ini, fim).forEach((e) => {
    const c = document.createElement("div"); c.className = "ev-card";
    const dh = (e.data_hora || "").slice(0, 16).replace("T", " ");
    c.innerHTML = `<div class="ev-mini"><img alt=""></div><div class="ev-info"><b>Nº ${pad2(e.num || 0)}</b> <small>${esc(e.id || "")}</small>
        <span>${esc(e.comando || e.host || e.arquivo)}</span><small>${esc(dh)}${e.serial ? " · SN " + esc(e.serial) : ""}</small></div>
      <div class="ev-acoes"><button class="btn mini" data-v>Ver</button><button class="btn mini" data-x title="Excluir (vai para a Lixeira)">🗑</button></div>`;
    api.miniatura(e.caminho).then((m) => { if (m) c.querySelector("img").src = m; });
    c.querySelector("[data-v]").onclick = () => verEvidencia({ ...e, cmd: e.comando, mini: "" }, null);
    c.querySelector("[data-x]").onclick = () => excluirEvidencia(e);
    g.appendChild(c);
  });
}
function excluirEvidencias(es) {
  confirmarExclusao(`${es.length} evidências`, async () => {
    const feitas = []; let ultima = null;
    for (const e of es) {
      const x = await api.evid_excluir(e.caminho);
      if (x.ok) { feitas.push(e.caminho); ultima = x.evid || ultima; } else toast(x.erro, "erro");
    }
    if (ultima) atualizarEvid(ultima);
    BIB.evs = BIB.evs.filter((item) => !feitas.includes(item.caminho)); bibContagens(); desenharBib();
    document.querySelectorAll("#historico li.ev-item").forEach((li) => { if (feitas.includes(li.dataset.arq)) li.classList.add("excluida"); });
    if (feitas.length) toast(`🗑 ${pl(feitas.length, "evidência")} na Lixeira — exclusões registradas no manifesto de custódia`);
  });
}
function excluirEvidencia(e, depois) {
  confirmarExclusao(`a evidência Nº ${pad2(e.num || 0)} (${esc(e.arquivo)})`, async () => {
    const x = await api.evid_excluir(e.caminho);
    if (!x.ok) return toast(x.erro, "erro");
    toast(`🗑 Evidência Nº ${pad2(e.num || 0)} na Lixeira — exclusão registrada no manifesto de custódia`);
    if (x.evid) atualizarEvid(x.evid);
    if (bibDesktop.matches && BIB.sec === "evidencias" && !$("#modal-bib").classList.contains("oculto")) {
      BIB.evs = BIB.evs.filter((item) => item.caminho !== e.caminho);
      bibContagens(); desenharBib();
    }
    document.querySelectorAll("#historico li.ev-item").forEach((li) => { if (li.dataset.arq === e.caminho) li.classList.add("excluida"); });
    if (depois) depois();
    if (!$("#modal-evid").classList.contains("oculto")) { const r = await api.evid_lista(); EVS = r.itens || []; desenharEvidencias(); }
  });
}
async function reconectar(r) {
  $("#modal-hist").classList.add("oculto");
  let a = A();
  if (!a || a.conectado) a = novaAba(r.tipo); else { a.tipo = r.tipo; selecionarTipo(r.tipo); }
  if (r.tipo === "serial") { await carregarPortas(); $("#porta").value = r.alvo; $("#baud").value = String(r.baud || 9600); }
  if (r.tipo === "ssh") $("#ssh-destino").value = r.alvo;
  if (r.tipo === "web") $("#web-url").value = r.alvo;
  conectar(a);
}

// ================= evidências =================
function cor(cell, fg, T = TEMA, P = PALETA) {
  if (fg ? cell.isFgDefault() : cell.isBgDefault()) return fg ? T.foreground : T.background;
  const v = fg ? cell.getFgColor() : cell.getBgColor();
  if (fg ? cell.isFgPalette() : cell.isBgPalette()) return P[v] || (fg ? T.foreground : T.background);
  return "#" + v.toString(16).padStart(6, "0");
}
function snapshot(term) {
  // A evidência tem fundo preto. Para terminais claros, use a paleta ANSI padrão da evidência.
  const ab = [...abas.values()].find((x) => x.term === term);
  const claro = TEMAS[ab?.tema || temaAtual].claro;
  const T = claro ? TEMAS.dassh.t : (ab?.T || TEMA);
  const P = claro ? paleta(T) : (ab?.P || PALETA);
  const b = term.buffer.active, linhas = [];
  for (let y = 0; y < term.rows; y++) {
    const ln = b.getLine(b.viewportY + y), runs = [];
    let cur = null;
    for (let x = 0; x < term.cols; x++) {
      const c = ln && ln.getCell(x);
      if (c && c.getWidth() === 0) continue;
      const ch = (c && c.getChars()) || " ", bold = !!(c && c.isBold());
      let fg = c ? cor(c, true, T, P) : T.foreground, bg = c ? cor(c, false, T, P) : T.background;
      if (c && c.isInverse()) [fg, bg] = [bg, fg];
      if (cur && cur[1] === fg && cur[2] === bg && cur[3] === bold) cur[0] += ch;
      else { cur = [ch, fg, bg, bold]; runs.push(cur); }
    }
    linhas.push(runs);
  }
  const ini = Math.max(0, b.length - 400), txt = [];
  for (let i = ini; i < b.length; i++) {   // junta linhas quebradas pelo terminal (comandos longos)
    const ln = b.getLine(i);
    if (ln.isWrapped && txt.length) txt[txt.length - 1] += ln.translateToString(true); else txt.push(ln.translateToString(true));
  }
  return { cols: term.cols, rows: term.rows, bg: T.background, fg: T.foreground, linhas,
           texto: txt.join("\n"), cursor: { x: b.cursorX, y: b.baseY + b.cursorY - b.viewportY } };
}
function limpar() {
  const a = A(); if (!a) return;
  if (a.tipo === "web") return toast("Na aba Web não há tela para limpar — use 📸 Capturar", "aviso");
  a.term.clear(); a.term.focus(); toast("Tela limpa");
}

// Captura: a tela é "fotografada" NO INSTANTE do clique (snapshot) e entra numa fila local de processamento,
// em ordem. Nenhum clique é descartado, por mais rápido que seja. O envio ao WhatsApp vai para a fila do
// backend (um por vez, em segundo plano, salva em disco) — a captura nunca espera o WhatsApp.
let filaCaptura = Promise.resolve(), capturasPendentes = 0;
let LIMPAR_APOS = true;   // 🧹 limpar a tela depois de cada evidência (configurável no cartão Evidência)
let preferenciasLimpeza = {};
let gravacaoLimpeza = Promise.resolve();
function evidencia(enviar, roteiro = "", aba = null, comando = "", indiceWeb = null, segredos = null) {
  const a = aba || A(); if (!a) return Promise.resolve();
  if (a.demo) { toast("🎬 Aba de demonstração: é uma simulação — não gera evidência", "aviso"); return Promise.resolve(); }
  if (a.tipo === "web" && !a.conectado) { toast("Conecte a aba Web primeiro", "aviso"); return Promise.resolve(); }
  const snap = a.tipo === "web" ? null : snapshot(a.term);
  if (snap && segredos && segredos.length) { SKL.mascararSnap(snap, segredos); comando = SKL.mascarar(comando, segredos); }   // senha da Skill nunca vai para a evidência
  capturasPendentes++;
  const bt = $(enviar ? "#enviar" : "#salvar");   // o botão "bate" como um coração enquanto o print é gerado (só transform: leve)
  if (bt) { bt.dataset.pulsos = String((+bt.dataset.pulsos || 0) + 1); bt.classList.add("pulsando"); }
  const limparAoCapturar = limparDaAba(a);
  const p = filaCaptura.then(() => processarCaptura(a, snap, enviar, roteiro, comando, indiceWeb, limparAoCapturar)).finally(() => {
    capturasPendentes--;
    if (!bt) return;
    const resta = Math.max(0, (+bt.dataset.pulsos || 1) - 1);
    bt.dataset.pulsos = String(resta);
    if (!resta) bt.classList.remove("pulsando");
  });
  filaCaptura = p.catch(() => {});
  return p;
}
const ENVIOS = new Map();   // job -> <li> da lista de últimas evidências
async function processarCaptura(a, snap, enviar, roteiro, comando, indiceWeb, limparAoCapturar) {
  try {
    const r = a.tipo === "web" ? (indiceWeb === "java" ? await api.java_evidencia(a.id, enviar)   // console Java
                                                      : await api.web_evidencia(a.id, enviar, indiceWeb, a.modoWeb === "inteira"))   // página / console remoto
                               : await api.evidencia(a.id, snap, enviar, roteiro, comando);
    if (!r.ok) { toast(r.erro, "erro"); return; }
    if (a.tipo === "web") { a.ultimaWeb = r.mini; desenharWeb(a); if (r.partes > 1) toast(`🖥 Página inteira: ${r.partes} partes salvas (nº ${pad2(r.num - r.partes + 1)} a ${pad2(r.num)})`); }
    atualizarEvid(r.evid);   // só mexe na lateral se a aba da evidência for a ativa (r.evid.sid)
    let st = "salva", cls = "";
    if (enviar) {
      if (r.enviado && r.enviado.fila) { st = "na fila"; cls = "fila"; toast(`Evidência nº ${pad2(r.num)} salva e na fila de envio (${r.enviado.posicao}º)`); }
      else { st = "não enviada"; cls = "erro"; toast(`Nº ${pad2(r.num)} salva e copiada, mas NÃO enviada: ${(r.enviado && r.enviado.erro) || "erro"}`, "erro"); }
    } else toast(`Evidência nº ${pad2(r.num)} salva e copiada (Ctrl+V no WhatsApp)`);
    if (ILHA_ON()) ilha.publicar("evidencia", { tipo: "evidencia", titulo: `Evidência nº ${pad2(r.num)} salva`, dado: `Evidência nº ${pad2(r.num)}`,
      detalhe: enviar ? "Salva e enviada para a fila de envio." : "Salva e copiada: cole no WhatsApp com Ctrl+V.", acoes: [{ id: "fila", rotulo: "Ver a fila", icone: "envio", aoClicar: () => abrirFila() }] });
    const naTela = a.id === ativa, ul = $("#historico");
    if (naTela) { const v = ul.querySelector(".vazio"); if (v) v.remove(); }
    // tela limpa para o próximo comando (Salvar e Enviar, botão ou atalho) — não vale para Skills e aba Web
    if (limparAoCapturar && limparDaAba(a) && abas.get(a.id) === a && !roteiro && a.tipo !== "web" && a.conectado) {
      // "cls" só quando o cursor está no PROMPT do shell: com um programa rodando na aba (ex.: Claude Code, vim, top)
      // o texto iria para o programa — nesse caso limpa só a tela do app
      const noPrompt = /^\s*(PS [^>]*>|[A-Za-z]:\\[^>]*>)\s*$/.test(linhaCursor(a.term)) && a.term.buffer.active.type !== "alternate";
      if (SHELL_WIN.includes(a.tipo) && noPrompt) api.escrever(a.id, "cls\r"); else a.term.clear();
    }
    const li = document.createElement("li"); li.className = "ev-item";
    li.innerHTML = `<img class="mini" alt=""><div class="ev-txt"><b>Nº ${pad2(r.num)}</b><span></span></div><i class="${cls}">${st}</i>`;
    li.querySelector("img").src = r.mini || "";
    li.querySelector("span").textContent = r.cmd || r.host; li.title = `${a.nome} — ${r.arquivo} — clique para ampliar`;
    li.onclick = () => verEvidencia(r, li);
    if (r.enviado && r.enviado.job) { ENVIOS.set(r.enviado.job, li); li.dataset.job = r.enviado.job; }
    if (naTela) { ul.prepend(li); while (ul.children.length > 30) ul.lastChild.remove(); }
    else { a.evLis = [li, ...(a.evLis || [])].slice(0, 30); }   // aba em segundo plano: guarda na lista DELA
  } catch (e) { toast("Falha: " + e, "erro"); }
}
window.onEnvio = (job, estado, msg) => {
  const li = ENVIOS.get(job);
  const rot = { enviando: ["enviando…", "fila"], enviada: ["enviada", "ok"], "tentando de novo": ["tentando…", "fila"],
                falhou: ["falhou ↻", "erro"], aguardando: ["aguardando WhatsApp", "fila"] }[estado] || [estado, ""];
  if (li) { const i = li.querySelector("i"); i.textContent = rot[0]; i.className = rot[1]; i.title = msg || ""; }
  if (estado === "falhou") toast(`Envio falhou após 3 tentativas: ${msg || ""} — clique na evidência para reenviar`, "erro");
  if (estado === "aguardando") toast(msg, "aviso");
};
let FALHAS = [], FILA = { pendentes: 0, jobs: [], falhas: [], atual: null }, filaTimer = null;
const CANAL_ROT = { email: "📧 e-mail", telegram: "✈ Telegram" };   // WhatsApp (padrão) não ganha rótulo
const rotuloJob = (j) => (j.tipo === "texto" ? `✉ Convite para a sessão ao vivo` : j.tipo === "doc" ? `📄 ${(j.legenda || "Relatório").slice(0, 60)}` : `🖼 Evidência nº ${pad2(j.num || 0)}`) +
  (CANAL_ROT[j.canal] ? ` · ${CANAL_ROT[j.canal]}` : "");
window.onFila = (f) => {
  FILA = f; FALHAS = f.falhas || [];
  const el = $("#wa-fila"), and = $("#wa-andamento");
  const n = f.pendentes + FALHAS.length;
  el.textContent = f.pendentes ? `Fila: ${f.pendentes}` : (FALHAS.length ? `Falhas: ${FALHAS.length}` : "");
  el.classList.toggle("oculto", !n);
  // linha de andamento: o que está acontecendo AGORA + progresso do lote
  const a = f.atual, L = f.lote || { total: 0, feitos: 0 }, pct = L.total ? Math.round((L.feitos / L.total) * 100) : 0;
  const barra = L.total > 1 ? `<span class="fila-barra"><i style="width:${pct}%"></i></span>` : "";
  if (a && a.estado === "enviando") {
    and.className = "wa-andamento enviando";
    and.innerHTML = `<span class="giro"></span>Enviando ${esc(rotuloJob(a))}… ${a.segundos || 0}s` +
      (L.total > 1 ? ` · ${L.feitos} de ${L.total} (${pct}%)` : "") + barra;
  } else if (a && a.estado === "aguardando") {
    and.className = "wa-andamento";
    and.innerHTML = `⏳ ${f.pendentes} na fila — ` + (CANAL_ROT[a.canal] ? `configure o ${CANAL_ROT[a.canal]} em 📨 Canais` : "abra o WhatsApp");
  } else if (FALHAS.length) {
    and.className = "wa-andamento erro"; and.innerHTML = `⚠ ${FALHAS.length === 1 ? "1 envio falhou" : `${FALHAS.length} envios falharam`} — clique para reenviar`;
  } else if (f.pendentes) {
    and.className = "wa-andamento"; and.innerHTML = `⏳ ${f.pendentes} na fila…`;
  } else and.className = "wa-andamento oculto";
  // enquanto houver envio em andamento, atualiza o cronômetro a cada segundo
  clearTimeout(filaTimer);
  if (f.pendentes) filaTimer = setTimeout(async () => onFila(await api.fila_status()), 1000);
  if (!$("#modal-fila").classList.contains("oculto")) desenharFila();
  ilhaFila(f);
};
function desenharFila() {
  const f = FILA, tb = $("#fila-linhas"); tb.innerHTML = "";
  const a = f.atual, L = f.lote || { total: 0, feitos: 0 }, pct = L.total ? Math.round((L.feitos / L.total) * 100) : 0;
  $("#fila-agora").innerHTML = (a && a.estado === "enviando"
    ? `<b style="color:var(--verde-cl)">Agora:</b> enviando ${esc(rotuloJob(a))} há ${a.segundos || 0}s (tentativa ${(a.tentativas || 0) + 1} de 3)`
    : a && a.estado === "aguardando" ? (CANAL_ROT[a.canal]
      ? `<b style="color:var(--aviso)">Agora:</b> aguardando o ${CANAL_ROT[a.canal]} — configure em <b>📨 Canais de envio</b>`
      : `<b style="color:var(--aviso)">Agora:</b> aguardando o WhatsApp — clique em <b>Abrir WhatsApp</b>`)
    : f.pendentes ? "Preparando o próximo envio…" : `<b style="color:var(--verde-cl)">Tudo enviado.</b> Nada na fila.`) +
    (L.total ? `<div style="margin-top:6px;display:flex;gap:10px;align-items:center"><span class="fila-barra" style="flex:1;height:8px">` +
      `<i style="width:${pct}%"></i></span><b>${L.feitos} de ${L.total} (${pct}%)</b></div>` : "");
  const linhas = [...f.jobs.map((j, i) => ({ ...j, pos: i + 1, sit: a && a.id === j.id && a.estado === "enviando" ? "env" : "esp" })),
                  ...FALHAS.map((j) => ({ ...j, pos: "—", sit: "err" }))];
  if (!linhas.length) tb.innerHTML = `<tr class="vazio"><td colspan="4">Fila vazia.</td></tr>`;
  const [ini, fim, p] = paginador($("#fila-pag"), linhas.length, desenharFila.pag || 0, (n) => { desenharFila.pag = n; desenharFila(); }, "envio(s)");
  desenharFila.pag = p;
  linhas.slice(ini, fim).forEach((j) => {
    const tr = document.createElement("tr");
    const sit = { env: `<span class="chip env">enviando…</span>`, esp: `<span class="chip esp">na fila${j.tentativas ? ` · ${pl(j.tentativas, "falha")}` : ""}</span>`,
                  err: `<span class="chip err">falhou</span>` }[j.sit];
    tr.innerHTML = `<td>${j.pos}</td><td>${esc(rotuloJob(j))}${j.erro ? `<br><small style="color:var(--erro)">${esc(j.erro)}</small>` : ""}</td><td>${sit}</td>
      <td style="text-align:right;white-space:nowrap">${j.sit === "err" ? `<button class="btn" data-re>↻ Reenviar</button>` : ""}
      ${j.sit !== "env" ? `<button class="btn" data-rm>Remover</button>` : ""}</td>`;
    const re = tr.querySelector("[data-re]"), rm = tr.querySelector("[data-rm]");
    if (re) re.onclick = async () => { await api.reenviar(j.id); onFila(await api.fila_status()); };
    if (rm) rm.onclick = async () => { await api.remover_envio(j.id); onFila(await api.fila_status()); };
    tb.appendChild(tr);
  });
}
async function abrirFila() { onFila(await api.fila_status()); desenharFila(); abrirModal("#modal-fila"); }
let LB_LISTA = [], LB_IDX = -1;
async function lbIr(delta) {   // ‹ anterior / próxima › entre as evidências do atendimento
  const n = LB_IDX + delta; if (n < 0 || n >= LB_LISTA.length) return;
  const e = LB_LISTA[n]; await verEvidencia({ ...e, cmd: e.comando, mini: "" }, null, true);
}
document.addEventListener("keydown", (ev) => {
  if ($("#modal-lb").classList.contains("oculto") || /INPUT|TEXTAREA/.test((ev.target || {}).tagName || "")) return;
  if (ev.key === "ArrowLeft") { ev.preventDefault(); lbIr(-1); } else if (ev.key === "ArrowRight") { ev.preventDefault(); lbIr(1); }
});
async function verEvidencia(r, li, mantemLista = false) {
  if (!mantemLista) {
    try { LB_LISTA = ((await api.evid_lista()).itens || []).slice().sort((x, y) => (x.num || 0) - (y.num || 0) || (x.parte || 1) - (y.parte || 1)); } catch (_) { LB_LISTA = []; }
  }
  LB_IDX = LB_LISTA.findIndex((e) => e.caminho === r.caminho);
  $("#lb-ant").disabled = LB_IDX <= 0; $("#lb-prox").disabled = LB_IDX < 0 || LB_IDX >= LB_LISTA.length - 1;
  $("#lb-ant").onclick = () => lbIr(-1); $("#lb-prox").onclick = () => lbIr(1);
  $("#lb-pos").textContent = LB_IDX >= 0 ? `${LB_IDX + 1} de ${LB_LISTA.length}` : "";
  $("#lb-img").src = r.mini || ""; $("#lb-tit").textContent = `Evidência nº ${pad2(r.num)} — ${r.id || ""} — ${r.cmd || r.host}`;
  $("#lb-arq").textContent = r.arquivo;
  const job = li && li.dataset.job, falhou = FALHAS.some((f) => f.id === job);
  $("#lb-reenviar").classList.toggle("oculto", !falhou);
  $("#lb-reenviar").onclick = async () => { if (await api.reenviar(job)) { toast("Reenviando…"); $("#modal-lb").classList.add("oculto"); } };
  $("#lb-pasta").onclick = () => api.abrir_pasta();
  $("#lb-abrir").onclick = () => api.abrir_arquivo(r.caminho);
  $("#lb-excluir").onclick = () => excluirEvidencia({ ...r, arquivo: r.arquivo || (r.caminho || "").split("\\").pop() },
                                                     () => $("#modal-lb").classList.add("oculto"));
  abrirModal("#modal-lb");
  const full = await api.imagem(r.caminho); if (full) $("#lb-img").src = full;   // troca a miniatura pela imagem cheia
}

// ================= painéis =================
function atualizarEvid(e) {
  if (!e) return;
  if (e.sid && ativa && e.sid !== ativa) return;   // resposta de outra aba: a lateral mostra só a aba ativa
  if (!e.ok) { $("#visita-nome").textContent = e.erro; return; }
  $("#visita-nome").textContent = e.visita_nome; $("#visita-nome").parentElement.title = e.visita;
  $("#proximo").textContent = "Nº " + pad2(e.proximo);
  const sel = $("#cliente-sel");
  if (e.cliente_nome && ![...sel.options].some((o) => o.value === e.cliente_nome)) {   // cliente criado em outra aba
    const o = document.createElement("option"); o.value = o.textContent = e.cliente_nome; sel.appendChild(o);
  }
  if (sel.value !== e.cliente_nome) sel.value = e.cliente_nome;
  // dados do atendimento: chamado/mudança vai no rodapé de cada evidência e no relatório
  const ch = e.info && e.info.chamado;
  $("#renomear-visita").innerHTML = ch ? `✎ <span class="chamado-tag">Chamado ${esc(ch)}</span>`
    : "✎ nome e nº do chamado";
  ULTIMO_EVID = e;
}
let ULTIMO_EVID = null;
function desenharClientes(c) {
  if (!c || !c.clientes) return;
  const sel = $("#cliente-sel"); sel.innerHTML = "";
  c.clientes.forEach((n) => { const o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o); });
  sel.value = c.atual; sel.title = c.raiz + "\\" + c.atual;
}

// formulário rápido (modal) -> Promise com os valores ou null
function pedir(titulo, campos, ok = "Salvar") {
  return new Promise((res) => {
    $("#fr-tit").textContent = titulo; $("#fr-ok").textContent = ok;
    $("#fr-campos").innerHTML = campos.map((c) =>
      `<label>${esc(c.label)} <input id="fr-${c.id}" value="${esc(c.valor || "")}" placeholder="${esc(c.ph || "")}" ${c.max ? `maxlength="${c.max}"` : ""}></label>`).join("");
    const m = $("#modal-form"), f = $("#form-rapido");
    const fim = (v) => { m.classList.add("oculto"); f.onsubmit = null; m.querySelectorAll("[data-fecha]").forEach((b) => (b.onclick = null)); res(v); };
    f.onsubmit = (e) => { e.preventDefault(); fim(Object.fromEntries(campos.map((c) => [c.id, $("#fr-" + c.id).value.trim()]))); };
    m.querySelectorAll("[data-fecha]").forEach((b) => (b.onclick = () => fim(null)));
    m.classList.remove("oculto"); setTimeout(() => $("#fr-" + campos[0].id).focus(), 30);
  });
}
async function novoCliente() {
  const v = await pedir("Novo cliente", [{ id: "sigla", label: "Sigla", ph: "ex.: CEF, TRT1, PETRO", max: 12 },
                                         { id: "nome", label: "Nome", ph: "ex.: Caixa Econômica Federal" }], "Criar pasta");
  if (!v) return;
  const r = await api.novo_cliente(v.sigla, v.nome);
  if (!r.ok) return toast(r.erro, "erro");
  desenharClientes(r); atualizarEvid(r.evid); toast(`Cliente criado: ${r.atual}`);
}
// ＋ Nova visita: outro atendimento hoje (ex.: um por equipamento), com pasta e PDF próprios
async function novaVisita() {
  const v = await pedir("Nova visita hoje (pasta e relatório próprios)", [
    { id: "desc", label: "Nome da visita", ph: "ex.: SW4 – coleta PoE para a Huawei" },
    { id: "chamado", label: "Nº do chamado / mudança (opcional)", ph: "ex.: INC0012345" }]);
  if (!v || !v.desc) return;
  const r = await api.nova_visita(v.desc);
  if (!r.ok) return toast(r.erro, "erro");
  if (v.chamado) { const x = await api.dados_visita(v.desc, v.chamado, ""); if (x.ok) r.evid = x.evid; }
  atualizarEvid(r.evid);
  if (!r.sid || r.sid === ativa) $("#historico").innerHTML = `<li class="vazio">Nenhuma ainda nesta visita</li>`;
  toast(`📁 Nova visita: ${r.evid.visita_nome}` + (r.conectadas.length ? " — reconecte a aba para o log também ir para ela" : ""));
}
async function renomearVisita() {
  const atual = ($("#visita-nome").textContent || "").replace(/^\d{4}-\d{2}-\d{2} - /, "");
  const info = (ULTIMO_EVID && ULTIMO_EVID.info) || {};
  const v = await pedir("Dados do atendimento de hoje", [
    { id: "desc", label: "Descrição (nome da pasta)", valor: atual === "Atendimento" ? "" : atual, ph: "ex.: Troca SW agência Centro" },
    { id: "chamado", label: "Nº do chamado / mudança (vai em cada evidência)", valor: info.chamado || "", ph: "ex.: INC0012345, CHG0004567, RDM 2026/118" },
    { id: "resp", label: "Responsável no cliente (para o aceite do relatório)", valor: info.responsavel || "", ph: "ex.: Fulano — Gerência de Redes" }]);
  if (!v) return;
  const r = await api.dados_visita(v.desc, v.chamado, v.resp);
  if (!r.ok) return toast(r.erro, "erro");
  atualizarEvid(r.evid); toast("Atendimento: " + r.evid.visita_nome + (v.chamado ? " · Chamado " + v.chamado : ""));
}
const NOME_CANAL = { whatsapp: "WhatsApp", email: "E-mail", telegram: "Telegram" };
function atualizarWa(s) {
  if (s && s.ocupado) return;  // WhatsApp enviando: mantém o status atual
  if (s && ("aberto" in s)) ENVIO_UI.wa = { aberto: !!s.aberto, logado: !!s.logado };   // WhatsApp do app: um só para todas as abas
  if (s && s.sid && ativa && s.sid !== ativa) return envioUIRender();   // destino de outra aba: não mostra aqui
  // destino DESTA aba: conversa do WhatsApp, chat do Telegram ou destinatário do e-mail (cartão desenhado por envioUIRender)
  const d = (s && s.destino) || { canal: "whatsapp", alvo: s && s.conversa };
  const alvo = d.canal === "whatsapp" ? (s && s.conversa) || d.alvo : d.alvo;
  if (d.canal === "whatsapp" && alvo) ENVIO_UI.ultimaWa = alvo;
  const a = A();
  if (a && (!s || !s.sid || s.sid === a.id) && d.canal) {
    a.destino = { canal: d.canal, alvo, ...(d.nome ? { nome: d.nome } : {}) };
    if (alvo) envioUIMemoria(a)[d.canal] = { alvo, nome: d.nome || "" };
  }
  envioUIRender(d);
}

// ================= compartilhamento ao vivo =================
let MODO_TESTE = "";
async function garantirNome() {
  let ok = false; try { ok = localStorage.getItem("dassh_nome_ok") === "1"; } catch (_) {}
  if (ok && NOME) return true;
  if (MODO_TESTE) return true;
  const v = await pedir("Seu nome (aparece para quem estiver na sessão)", [{ id: "nome", label: "Nome", valor: NOME, max: 40 }], "Continuar");
  if (!v || !v.nome) return false;
  NOME = v.nome; await api.salvar_pref("nome", NOME);
  try { localStorage.setItem("dassh_nome_ok", "1"); } catch (_) {}
  return true;
}
function avisoControle(a) {
  const agora = Date.now(); if (agora - (a._avisoT || 0) < 2500) return; a._avisoT = agora;
  if (a.share.aguardando) return toast("Aguardando o dono da sessão aprovar a sua entrada…", "aviso");
  const quem = (a.share.participantes || []).find((p) => p.ativo);
  toast(a.share.papel === "dono"
    ? `${quem ? quem.nome : "Um convidado"} está com o controle — clique em “Retomar controle” para digitar`
    : "Você está só observando — clique em “Pedir controle” para digitar", "aviso");
}
// Aviso com 2 botões + ✕ (fecha sem fazer nada). "chave": o mesmo assunto nunca empilha — um clique repetido
// só destaca o aviso que já está aberto. Depois de escolher, o aviso some na hora (sem esperar a ação terminar).
function pedido(html, sim, nao, cb, chave, resolverFechar = false) {
  if (chave) {
    const ja = document.querySelector(`#pedidos .pedido[data-chave="${CSS.escape(chave)}"]`);
    if (ja) { ja.classList.remove("piscar"); void ja.offsetWidth; ja.classList.add("piscar"); return; }
  }
  const el = document.createElement("div"); el.className = "pedido"; if (chave) el.dataset.chave = chave;
  el.innerHTML = `<button class="pedido-x" title="Fechar sem fazer nada">✕</button><p>${html}</p>
    <div class="linha-btn"><button class="btn" data-n>${nao}</button><button class="btn primario" data-s>${sim}</button></div>`;
  let feito = false;
  const fim = (v) => { if (feito) return; feito = true; el.remove(); if (v !== null || resolverFechar) cb(v); };
  el.querySelector("[data-s]").onclick = () => fim(true); el.querySelector("[data-n]").onclick = () => fim(false);
  el.querySelector(".pedido-x").onclick = () => fim(null);
  $("#pedidos").appendChild(el);
  try { new AudioContext().resume(); } catch (_) {}
  if (MODO_TESTE === "share-host" || MODO_TESTE === "demo-dono") setTimeout(() => fim(true), 300);  // autoteste: aprova sozinho
}
window.onShare = (sid, tipo, d) => {
  const a = abas.get(sid); if (!a) return;
  if (tipo === "estado") return atualizarEstadoShare(a, d);
  if (tipo === "pedido_entrada")
    return pedido(`🔗 <b>${esc(d.nome)}</b> quer entrar na sessão <b>${esc(a.nome)}</b> e ver a tela ao vivo.`, "Permitir", "Recusar",
      async (ok) => { await api.share_responder(sid, d.id, ok); if (ok) { api.share_tela(sid, d.id, a.ser.serialize()); toast(`${d.nome} entrou (observando)`); } });
  if (tipo === "pedido_controle")
    return pedido(`⌨️ <b>${esc(d.nome)}</b> pediu o controle de <b>${esc(a.nome)}</b>. Ele vai digitar e você fica observando (pode retomar a qualquer momento).`,
      "Passar controle", "Negar", (ok) => ok && api.share_controle(sid, d.id));
  if (tipo === "saiu") return toast(`${d.nome} saiu da sessão (${d.motivo})`, "aviso");
  if (tipo === "aprovado") { a.share = { ...(a.share || {}), aguardando: false }; toast("Entrada aprovada — você está observando"); desenharShare(a); }
};
function atualizarEstadoShare(a, d) {
  const dono = !d.eu, souAtivo = dono ? d.controle === "host" : d.controle === d.eu, antes = a.share && a.share.souAtivo;
  a.share = { ...(a.share || {}), ...d, papel: dono ? "dono" : "convidado", souAtivo, aguardando: false };
  if (antes !== undefined && antes !== souAtivo) toast(souAtivo ? "Você está com o controle (ATIVO)" : "Agora você está observando", souAtivo ? "" : "aviso");
  desenharShare(a);
}
function desenharShare(a) {
  ilhaSync();
  if (a.btn) {
    a.btn.classList.toggle("aba-ao-vivo", !!(a.share && a.share.papel === "dono"));   // destaque fica NA guia compartilhada
    a.btn.classList.toggle("aba-remota", !!(a.share && a.share.papel === "convidado"));
  }
  if (a.id !== ativa) return;
  desenharGuia(a);
  const bar = $("#share-barra"), s = a.share;
  $("#btn-compartilhar .rot").textContent = s && s.papel === "dono" ? " Ao vivo" : " Compartilhar";
  // só a guia compartilhada (e o que é dela) fica "ao vivo"; as outras guias seguem normais
  document.body.classList.toggle("ao-vivo", !!(s && s.papel === "dono"));
  if (!s) { bar.classList.add("oculto"); bar.innerHTML = ""; return; }
  bar.classList.remove("oculto"); bar.classList.toggle("convidado", s.papel === "convidado");
  const chips = (s.participantes || []).map((p) => {
    const eu = s.papel === "dono" ? p.id === "host" : p.id === s.eu;
    const acoes = s.papel === "dono" && p.id !== "host"
      ? `${p.ativo ? "" : `<button data-ctrl="${esc(p.id)}" title="Passar o controle">⇄</button>`}<button data-rm="${esc(p.id)}" title="Remover da sessão">✕</button>` : "";
    return `<span class="pessoa ${p.ativo ? "ativo" : "passivo"}" title="${p.ativo ? "ATIVO: está digitando" : "OBSERVANDO"}">
      <span class="bola"></span>${esc(p.nome)}${eu ? " (você)" : ""} <small>${p.ativo ? "digitando" : "observando"}</small>${acoes}</span>`;
  }).join("");
  if (s.papel === "dono") {
    bar.innerHTML = `<span class="ao-vivo">AO VIVO</span><span class="codigo" id="sh-codigo" title="Clique para copiar">${esc(s.codigo)}</span>
      ${chips || ""}${(s.participantes || []).length <= 1 ? `<small style="color:var(--suave)">passe o código para o colega (🔗 Entrar)</small>` : ""}
      <div class="dir"><button class="btn destaque" id="sh-convidar" title="Mandar o convite com link e código pelo WhatsApp">✉ Convidar</button>
      ${s.souAtivo ? "" : `<button class="btn primario" id="sh-retomar">Retomar controle</button>`}
      <button class="btn" id="sh-encerrar">Encerrar</button></div>`;
  } else {
    bar.innerHTML = `<span class="ao-vivo">SESSÃO REMOTA</span>${s.aguardando ? `<small>aguardando o dono aprovar a entrada…</small>` : chips + shareAbaInfo(s)}
      <div class="dir">${s.aguardando ? "" : s.souAtivo ? `<button class="btn" id="sh-devolver">Devolver controle</button>`
        : `<button class="btn primario" id="sh-pedir">Pedir controle</button>`}<button class="btn" id="sh-sair">Sair</button></div>`;
  }
  const on = (id, fn) => { const el = bar.querySelector(id); if (el) el.onclick = fn; };
  on("#sh-codigo", () => { navigator.clipboard.writeText(s.codigo).catch(() => {}); toast("Código copiado: " + s.codigo); });
  on("#sh-retomar", () => api.share_controle(a.id, "host"));
  on("#sh-convidar", () => abrirConvite(a));
  on("#sh-encerrar", async () => { await api.share_encerrar(a.id); a.share = null; desenharShare(a); toast("Compartilhamento encerrado"); });
  on("#sh-pedir", () => { api.share_pedir(a.id); toast("Pedido de controle enviado ao dono"); });
  on("#sh-devolver", () => api.share_devolver(a.id));
  on("#sh-sair", () => fecharAba(a.id));
  bar.querySelectorAll("[data-ctrl]").forEach((b) => (b.onclick = () => api.share_controle(a.id, b.dataset.ctrl)));
  bar.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => api.share_remover(a.id, b.dataset.rm)));
}
async function compartilhar() {
  const a = A();
  if (!a || !a.conectado) return toast("Conecte a aba antes de compartilhar", "aviso");
  if (a.tipo === "remoto") return toast("Esta aba já é uma sessão remota", "aviso");
  if (a.tipo === "web") return toast("O compartilhamento ao vivo é para abas de terminal", "aviso");
  if (a.share) return toast("Esta aba já está ao vivo — código: " + a.share.codigo);
  if (!(await garantirNome())) return;
  toast("Abrindo sessão ao vivo…");
  const r = await api.share_iniciar(a.id);
  if (!r.ok) return toast(r.erro, "erro");
  a.share = { ...r, papel: "dono", souAtivo: true }; desenharShare(a); shareAbaPublicar(a);
  navigator.clipboard.writeText(r.codigo).catch(() => {});
  toast(`Ao vivo! Código ${r.codigo} copiado — use ✉ Convidar para mandar pelo WhatsApp`);
  return r.codigo;
}
// ---------- convite pelo WhatsApp (contato/grupo escolhido na hora, pode ser outro que não o das evidências) ----------
async function abrirConvite(a = A()) {
  if (!a || !a.conectado) return toast("Conecte a aba antes de convidar", "aviso");
  if (!a.share) { const c = await compartilhar(); if (!c) return; }
  const r = await api.convite_texto(a.id);
  if (!r.ok) return toast(r.erro, "erro");
  $("#cv-codigo").textContent = r.codigo; $("#cv-link").value = r.link || "";
  $("#cv-texto").value = r.texto; $("#cv-para").value = "";
  $("#cv-para").placeholder = r.conversa ? `ex.: ${r.conversa}` : "Nome do contato ou grupo, como aparece no WhatsApp";
  abrirModal("#modal-convite"); setTimeout(() => $("#cv-para").focus(), 50);
  $("#cv-link").oninput = () => {   // troca a linha do link na prévia (função: "$&"/"$1" na URL não viram padrão)
    const l = $("#cv-link").value.trim(), t = $("#cv-texto").value;
    const nova = l ? `1️⃣ Baixe o DASSH Code (Windows):\n${l}` : "1️⃣ Instale o DASSH Code (Windows) — peça o instalador a quem convidou";
    $("#cv-texto").value = t.replace(/1️⃣[^\n]*(\n(?!2️⃣)[^\n]*)?/, () => nova);
  };
  $("#cv-copiar").onclick = () => { navigator.clipboard.writeText($("#cv-texto").value).catch(() => {}); toast("Convite copiado — cole onde quiser"); };
  $("#cv-enviar").onclick = async () => {
    const para = $("#cv-para").value.trim();
    if (!para) { $("#cv-para").focus(); return toast("Escolha o contato ou grupo", "aviso"); }
    const x = await api.convidar(para, $("#cv-texto").value, $("#cv-link").value);
    if (!x.ok) return toast(x.erro, "erro");
    $("#modal-convite").classList.add("oculto");
    toast(`✉ Convite na fila para ${x.conversa} (${x.posicao}º)`);
  };
  // a lista de conversas vem por último (o WhatsApp pode demorar): os botões acima já funcionam
  $("#cv-chips").innerHTML = `<small style="color:var(--suave)">carregando conversas do WhatsApp…</small>`;
  const lista = await api.wa_conversas();
  $("#cv-lista").innerHTML = lista.map((n) => `<option value="${esc(n)}">`).join("");
  $("#cv-chips").innerHTML = lista.slice(0, 8).map((n) => `<button class="wb-jan" data-n="${esc(n)}">${esc(n)}</button>`).join("") ||
    `<small style="color:var(--suave)">Abra o WhatsApp para escolher da lista — ou digite o nome.</small>`;
  $("#cv-chips").querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => { $("#cv-para").value = b.dataset.n; }));
}
// ================= 📱 conectado pelo celular (aparelhos do dono) =================
let CEL = null, celTimer = null;
function avisoCel(a) {
  const agora = Date.now(); if (agora - (a._avisoT || 0) < 2500) return; a._avisoT = agora;
  toast(`📱 ${a.celCtrl} está com o controle desta aba — clique em “Retomar” no indicador 📱`, "aviso");
}
function desenharCel() {
  ilhaSync();
  const e = CEL || { conectados: [], aparelhos: [], controles: {} };
  abas.forEach((a) => { a.celCtrl = (e.controles || {})[a.id] || null; if (a.btn) a.btn.classList.toggle("cel-ctrl", !!a.celCtrl); });
  const chip = $("#cel-chip"), con = e.conectados || [];
  chip.classList.toggle("oculto", !con.length);
  const at = A(), ctrlAt = at && at.celCtrl;
  chip.innerHTML = con.length ? `<span class="bola"></span>📱 conectado: <b>${esc(con.map((c) => c.nome).join(", "))}</b>` +
    (ctrlAt ? `<button class="btn mini" id="cel-retomar" title="Voltar a digitar no PC">Retomar</button>` : "") +
    con.map((c) => `<button class="cel-x" data-dx="${esc(c.id)}" title="Desconectar ${esc(c.nome)}">✕</button>`).join("") : "";
  chip.onclick = (ev) => { if (!ev.target.closest("button")) abrirCelular(); };
  celModoRemoto(con);
  if (typeof ajustarSistema === "function") ajustarSistema();
  const r = chip.querySelector("#cel-retomar"); if (r) r.onclick = () => api.cel_retomar(at.id);
  chip.querySelectorAll("[data-dx]").forEach((b) => (b.onclick = () => api.cel_desconectar(b.dataset.dx)));
  if ($("#modal-cel").classList.contains("oculto")) return;
  $("#cel-disp").checked = !!e.disponivel;
  $("#cel-aparelhos").innerHTML = (e.aparelhos || []).map((ap) => {
    const c = con.find((x) => x.id === ap.id);
    return `<div class="cel-ap"><span class="cel-ic">📱</span><div class="cel-ap-txt"><b>${esc(ap.nome)}</b>${c ? ` <span class="cel-on">● conectado desde ${esc(c.desde)}</span>` : ""}
      <small>pareado em ${esc(ap.criado)} · último acesso ${esc(ap.ultimo || "nunca")} · conferência <b>${esc(ap.sas || "")}</b></small></div>
      ${c ? `<button class="btn" data-dx="${esc(ap.id)}">Desconectar</button>` : ""}<button class="btn perigo" data-rv="${esc(ap.id)}" data-nome="${esc(ap.nome)}">Revogar</button></div>`;
  }).join("") || `<p class="ajuda">Nenhum aparelho pareado ainda.</p>`;
  $("#cel-aparelhos").querySelectorAll("[data-dx]").forEach((b) => (b.onclick = () => api.cel_desconectar(b.dataset.dx)));
  $("#cel-aparelhos").querySelectorAll("[data-rv]").forEach((b) => (b.onclick = () =>
    pedido(`Revogar <b>${esc(b.dataset.nome)}</b>? Ele perde o acesso a este PC na hora (para usar de novo, será preciso parear).`, "Revogar", "Cancelar",
      async (ok) => { if (!ok) return; const r = await api.cel_revogar(b.dataset.rv); CEL = r; desenharCel(); celAuditoria(); toast("Aparelho revogado"); })));
  const p = e.pareando;
  if (!p) { $("#cel-par").classList.add("oculto"); $("#cel-parear").classList.remove("oculto"); clearInterval(celTimer); }
}
async function celAuditoria() {
  const lista = (await api.cel_auditoria(60)) || [];
  const ROT = { pareado: "pareou", conectado: "conectou", desconectado: "desconectou", assumir: "assumiu o controle", devolver: "devolveu o controle",
    assistir: "começou a assistir", digitou: "digitou", abrir: "pediu aba nova", aberta: "abriu a aba", abrir_falhou: "falhou ao abrir aba",
    revogado: "foi revogado", recusado: "foi recusado", disponivel_ligado: "PC ficou disponível", disponivel_desligado: "PC ficou indisponível" };
  $("#cel-aud").innerHTML = lista.map((r) => `<div><span class="q">${esc(r.quando.slice(5))}</span> <b>${esc(r.nome || "")}</b> ${esc(ROT[r.acao] || r.acao)}` +
    `${r.aba ? ` <i>${esc(r.aba)}</i>` : r.sid ? ` <i>${esc(r.sid)}</i>` : ""}${r.tipo ? ` (${esc(r.tipo)}${r.destino ? " " + esc(r.destino) : r.porta ? " " + esc(r.porta) : ""})` : ""}` +
    `${r.n ? ` <code>${esc(r.n)} caracteres${r.senha ? ", possível senha" : ""}</code>` : ""}${r.motivo ? ` — ${esc(r.motivo)}` : ""}</div>`).join("") || `<p class="ajuda">Nada registrado ainda.</p>`;
}
async function abrirCelular() {
  abrirModal("#modal-cel");
  const r = await api.cel_estado();
  if (r && r.ok) CEL = r; else if (r) toast(r.erro, "erro");
  desenharCel(); celAuditoria();
}
async function celParear() {
  const r = await api.cel_parear();
  if (!r.ok) return toast(r.erro, "erro");
  $("#cel-qr").innerHTML = r.qr;   // SVG gerado pelo próprio app (qr.py), sem dados de terceiros
  $("#cel-codigo").textContent = r.codigo;
  $("#cel-par").classList.remove("oculto"); $("#cel-parear").classList.add("oculto");
  const fim = Date.now() + r.expira_em * 1000;
  clearInterval(celTimer);
  celTimer = setInterval(() => {
    const s = Math.max(0, Math.round((fim - Date.now()) / 1000));
    $("#cel-expira").textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`;
    if (!s) { clearInterval(celTimer); $("#cel-par").classList.add("oculto"); $("#cel-parear").classList.remove("oculto"); }
  }, 500);
}
window.onCelular = (tipo, d) => {
  if (tipo === "estado") { CEL = d; desenharCel(); if (!$("#modal-cel").classList.contains("oculto")) celAuditoria(); return; }
  if (tipo === "pareado") { $("#cel-par").classList.add("oculto"); $("#cel-parear").classList.remove("oculto"); clearInterval(celTimer);
    return toast(`📱 ${d.nome} pareado — confira o número de conferência no celular`); }
  if (tipo === "conectado") return toast(`📱 ${d.nome} conectou a este PC`);
  if (tipo === "atividade") return celPulso(d);
};

// ---- 📱 GESTÃO REMOTA: o app inteiro mostra que está sendo operado pelo celular (diferente do vermelho da aba compartilhada) ----
// Moldura viva em volta da janela (não bloqueia nada) + "ilha" no rodapé com quem está operando e, ao vivo, o que acabou de fazer.
// Sem atividade, a ilha recolhe para um ponto discreto; passar o mouse mostra tudo. Só no PC (no próprio celular não aparece).
const CEL_ILHA = { t: 0 };
const CEL_RPC = { evidencia: "gerou uma evidência", web_evidencia: "gerou uma evidência", java_evidencia: "gerou uma evidência",
  relatorio_gerar: "gerou o relatório", desconectar: "desconectou uma aba", aba_fechar: "fechou uma aba", roteiros: "abriu os roteiros",
  evid_excluir: "excluiu uma evidência", historico: "abriu o histórico", biblioteca_relatorios: "abriu a Biblioteca",
  equip_listar: "abriu Equipamentos", envio_enviar: "enviou uma evidência", wa_enviar: "enviou pelo WhatsApp" };
const CEL_TIPO = { serial: "Serial", ssh: "SSH", powershell: "PowerShell", cmd: "CMD", web: "Web", azure: "Azure", gcp: "GCP" };
const celAba = (d) => d.aba || ((d.sid && abas.get(d.sid)) || {}).nome || "";
const CEL_ACOES = {
  digitou: (d) => "digitando" + (celAba(d) ? " em " + celAba(d) : ""),
  abrir: (d) => "abrindo " + (CEL_TIPO[d.tipo] || d.tipo || "uma aba") + (d.porta ? " " + d.porta : d.destino ? " " + d.destino : ""),
  aberta: (d) => "abriu " + (celAba(d) || "uma aba"),
  assumir: (d) => "assumiu " + (celAba(d) || "uma aba"),
  devolver: () => "devolveu o controle",
  assistir: (d) => "assistindo " + (celAba(d) || "uma aba"),
  interface: () => "abriu a interface completa",
  rpc: (d) => CEL_RPC[d.m] || null,
};
function celModoRemoto(con) {
  const on = con.length > 0 && !document.body.classList.contains("remoto-cel");
  document.body.classList.toggle("cel-remoto", on);
  let m = $("#cel-moldura"), il = $("#cel-ilha");
  if (!on) { if (m) m.remove(); if (il) il.remove(); clearTimeout(CEL_ILHA.t); return; }
  if (!m) { m = document.createElement("div"); m.id = "cel-moldura"; m.setAttribute("aria-hidden", "true"); document.body.appendChild(m); }
  if (!il) {
    il = document.createElement("div"); il.id = "cel-ilha"; il.setAttribute("role", "status"); il.setAttribute("aria-live", "polite");
    document.body.appendChild(il);
  }
  const nomes = con.map((c) => c.nome).join(", ");
  il.innerHTML = `<span class="ponto"></span><span class="txt"><b>📱 ${esc(nomes)}</b><span class="longo"> está operando este computador · desde ${esc(con[0].desde)}</span><span class="cel-acao"></span></span>` +
    `<button class="cel-enc" title="Encerrar agora o acesso remoto (o aparelho continua pareado)">Encerrar</button>`;
  il.title = `${nomes} está operando este computador pelo celular — clique para ver os aparelhos`;
  il.onclick = (e) => { if (e.target.closest(".cel-enc")) return con.forEach((c) => api.cel_desconectar(c.id)); abrirCelular(); };
  celIlhaRecolher();
}
function celPulso(d) {
  const f = CEL_ACOES[d && d.acao], t = f && f(d), il = $("#cel-ilha"), m = $("#cel-moldura");
  if (!t || !il) return;
  il.classList.remove("recolhida");
  il.querySelector(".longo").hidden = true; il.querySelector(".cel-acao").textContent = " · " + t;
  if (m) { m.classList.remove("pulso"); void m.offsetWidth; m.classList.add("pulso"); }
  celIlhaRecolher();
}
function celIlhaRecolher() {
  clearTimeout(CEL_ILHA.t);
  CEL_ILHA.t = setTimeout(() => {
    const il = $("#cel-ilha"); if (!il) return;
    il.querySelector(".cel-acao").textContent = ""; il.querySelector(".longo").hidden = false;
    il.classList.add("recolhida");
  }, 7000);
}
window.onCelAba = (sid, nome, tipo, alvo, gravando, histId) => {   // aba aberta PELO CELULAR: o Python já conectou, aqui só aparece a aba
  if (abas.has(sid)) return;
  const a = novaAba(tipo, sid); if (!a) return;
  a.tipo = tipo; a.alvo = alvo; a.gravando = !!gravando; a.histId = histId; a.term.write("\x1bc");
  setConectado(a, true, nome); desenharCel();
  toast(`📱 Aba “${nome}” aberta pelo celular`);
};
function iniciarCelular() {
  $("#btn-celular").onclick = abrirCelular;
  $("#cel-parear").onclick = celParear;
  $("#cel-cancelar").onclick = () => api.cel_parear_cancelar();
  $("#cel-disp").onchange = async (e) => {
    const r = await api.cel_disponivel(e.target.checked);
    if (!r.ok) { e.target.checked = !e.target.checked; return toast(r.erro, "erro"); }
    CEL = r; desenharCel(); celAuditoria();
    toast(r.disponivel ? "📱 PC disponível para os seus aparelhos pareados" : "PC indisponível para aparelhos — ninguém entra");
  };
  api.cel_estado().then((r) => { if (r && r.ok) { CEL = r; desenharCel(); } }).catch(() => {});
}

async function entrarSessao(codigo) {
  if (!(await garantirNome())) return;
  if (!codigo) {
    const v = await pedir("Entrar na sessão de um colega", [{ id: "codigo", label: "Código da sessão", ph: "ABCD-EFGH-JKLM", max: 16 }], "Entrar");
    if (!v || !v.codigo) return; codigo = v.codigo;
  }
  const a = novaAba("remoto"); a.tipo = "remoto";
  a.term.write("\x1bcConectando à sessão " + codigo.toUpperCase() + "…\r\n");
  const r = await api.conectar(a.id, "remoto", null, null, codigo);
  if (!r.ok) { a.term.write(`\x1b[31m${r.erro}\x1b[0m\r\n`); return toast(r.erro, "erro"); }
  a.alvo = r.alvo; a.histId = r.hist_id; setConectado(a, true, r.nome);
  a.share = { papel: "convidado", aguardando: true, souAtivo: false }; desenharShare(a);
  a.term.write("Pedido enviado — aguardando o dono aprovar…\r\n");
  return a;
}

// ================= assistente de rede do equipamento =================
async function abrirRede(tipo, continuar, av) {
  const campo = tipo === "ssh" ? "#ssh-destino" : "#web-url", alvo = $(campo).value.trim();
  abrirModal("#modal-rede");
  const c = $("#rede-corpo");
  if (!av) {
    if (!alvo) return (c.innerHTML = `<div class="rede-st ruim">Informe o endereço do equipamento no topo (ou escolha um padrão de fábrica).</div>` + padroesHtml());
    c.innerHTML = `<div class="rede-st">⏳ Testando ${esc(alvo)}…</div>`;
    av = await api.rede_avaliar(alvo, tipo === "ssh" ? [22] : [443, 80, 8443]);
  }
  if (!av.ok) return (c.innerHTML = `<div class="rede-st ruim">${esc(av.erro)}</div>` + padroesHtml());
  const s = av.sugestao;
  let h = av.alcanca ? `<div class="rede-st ok">✔ ${esc(av.ip)} responde (porta ${av.porta}). Pode conectar.</div>`
    : `<div class="rede-st ruim">✖ ${esc(av.ip)} não respondeu.${av.mesma_rede && !av.conflito ? ` O notebook já está na rede pela placa ${esc(av.mesma_rede.placa)} — confira o cabo e se o equipamento está ligado.` : ""}</div>`;
  if (av.conflito) h += `<div class="rede-conf">⚠ ${esc(av.conflito)} O DASSH Code resolve com uma <b>rota exclusiva</b> para ${esc(av.ip)} pela placa do cabo (Wi-Fi e internet continuam funcionando).</div>`;
  if (s) {
    const opts = (av.placas || []).map((p) => `<option ${p.nome === s.placa ? "selected" : ""} value="${esc(p.nome)}">${esc(p.nome)} — ${p.status === "Up" ? "conectada" : "sem cabo"}</option>`).join("");
    h += `<p style="margin:4px 0">O notebook precisa de um IP na rede <b>${esc(s.rede)}</b>. Sugestão (IP <b>adicional</b> e temporário — não altera sua configuração atual):</p>
      <div class="rede-form"><label>Placa de rede<select id="rd-placa">${opts}</select></label>
        <label>IP do notebook<input id="rd-ip" value="${esc(s.ip)}"></label>
        <label>Máscara<select id="rd-pref"><option value="24" selected>255.255.255.0 (/24)</option><option value="16">255.255.0.0 (/16)</option>
          <option value="25">255.255.255.128 (/25)</option><option value="26">255.255.255.192 (/26)</option></select></label></div>
      ${s.cabo_desconectado ? `<div class="rede-conf" style="border-color:var(--aviso-borda);background:var(--aviso-painel);color:var(--aviso)">🔌 A placa ${esc(s.placa)} está <b>sem cabo</b>: ligue o cabo de rede do notebook na porta de gerência do equipamento.</div>` : ""}`;
  }
  h += `<div class="rede-acoes">${s ? `<button class="btn primario" id="rd-aplicar">Aplicar IP temporário${continuar ? " e conectar" : ""}</button>` : ""}
    <button class="btn" id="rd-testar">⟳ Testar de novo</button>${continuar ? `<button class="btn" id="rd-seguir">Conectar mesmo assim</button>` : ""}</div>` + padroesHtml();
  const temp = av.temporarios || [];
  if (temp.length) h += `<div class="rede-temp"><b>IPs temporários ativos</b>${temp.map((t) => `<div><span>${esc(t.ip)} na placa ${esc(t.placa)}${t.rota ? ` · rota ${esc(t.rota)}` : ""}</span>
      <button class="btn" data-rmip="${esc(t.ip)}">Remover</button></div>`).join("")}</div>`;
  c.innerHTML = h;
  const on = (sel, fn) => { const e = c.querySelector(sel); if (e) e.onclick = fn; };
  on("#rd-testar", () => abrirRede(tipo, continuar));
  on("#rd-seguir", () => { $("#modal-rede").classList.add("oculto"); continuar(); });
  on("#rd-aplicar", async () => {
    const b = c.querySelector("#rd-aplicar"); b.disabled = true; b.textContent = "Aguardando a permissão do Windows (administrador)…";
    const r = await api.rede_aplicar($("#rd-placa").value, $("#rd-ip").value.trim(), +$("#rd-pref").value, s.rota);
    if (!r.ok) { b.disabled = false; b.textContent = "Aplicar IP temporário"; return toast(r.erro || "Não foi possível configurar", "erro"); }
    toast(`IP ${$("#rd-ip").value} aplicado na placa ${$("#rd-placa").value} — será removido no fim da sessão`);
    b.textContent = "Aguardando o equipamento responder…";
    for (let i = 0; i < 6; i++) {
      const n = await api.rede_avaliar(alvo, tipo === "ssh" ? [22] : [443, 80, 8443]);
      if (n.alcanca) { $("#modal-rede").classList.add("oculto"); toast(`${n.ip} respondeu`); return continuar && continuar(); }
      await new Promise((ok) => setTimeout(ok, 1500));
    }
    abrirRede(tipo, continuar);
    toast("IP aplicado, mas o equipamento ainda não respondeu — confira o cabo e se ele está ligado", "aviso");
  });
  c.querySelectorAll("[data-rmip]").forEach((b) => (b.onclick = async () => {
    const r = await api.rede_remover(b.dataset.rmip); toast(r.ok ? "IP temporário removido" : r.erro, r.ok ? "" : "erro"); abrirRede(tipo, continuar);
  }));
  const sel = c.querySelector("#rd-padrao");
  if (sel) sel.onchange = () => {
    if (!sel.value) return;
    $(campo).value = tipo === "ssh" ? `admin@${sel.value}` : `https://${sel.value}`;
    abrirRede(tipo, continuar);
  };
}
function padroesHtml() {
  const P = [["Dell iDRAC", "192.168.0.120"], ["Huawei iBMC", "192.168.2.100"], ["Lenovo XClarity (XCC)", "192.168.70.125"],
             ["Switch Huawei — gerência MEth", "192.168.1.253"], ["FortiGate — gerência", "192.168.1.99"]];
  return `<div class="rede-temp"><label style="display:flex;gap:8px;align-items:center;color:var(--suave)">Padrões de fábrica:
    <select id="rd-padrao"><option value="">— escolher —</option>${P.map(([n, ip]) => `<option value="${ip}">${n} (${ip})</option>`).join("")}</select></label></div>`;
}
async function oferecerRemoverRede() {
  const t = await api.rede_temporarios(); if (!t.length) return;
  pedido(`🛜 O IP temporário <b>${esc(t.map((x) => x.ip).join(", "))}</b> ainda está configurado na placa de rede. Remover agora?`,
    "Remover", "Manter", async (ok) => { if (ok) { const r = await api.rede_remover(); toast(r.ok ? "IP temporário removido" : r.erro, r.ok ? "" : "erro"); } });
}

// ================= diagnóstico do cabo console =================
async function diagnosticarCabo() {
  abrirModal("#modal-cabo");
  const c = $("#cabo-corpo");
  c.innerHTML = `<div class="cabo-vazio"><span class="giro" style="display:inline-block;width:14px;height:14px;border:2px solid var(--verde);border-right-color:transparent;border-radius:50%;animation:giro .8s linear infinite"></span>
    <br><br>Procurando cabos console e testando as portas…</div>`;
  const r = await api.cabo_diagnostico();
  if (!r.ok) { c.innerHTML = `<div class="cabo-vazio">${esc(r.erro)}</div>`; return; }
  if (!r.adaptadores.length) {
    c.innerHTML = `<div class="cabo-vazio"><b>Nenhum cabo console USB conectado.</b><br><br>Conecte o cabo na porta USB e clique em
      <b>⟳ Testar de novo</b>.<br><small>Reconhecidos: WCH CH340/CH341, FTDI, Prolific PL2303, Silicon Labs CP210x.</small></div>`;
    return;
  }
  c.innerHTML = "";
  r.adaptadores.forEach((a) => {
    const t = a.teste || {}, cls = t.ok ? "ok" : (a.acoes.some((x) => x.id === "driver_ch340") || !a.porta) ? "ruim" : "aviso";
    const d = document.createElement("div"); d.className = "cabo " + cls;
    d.innerHTML = `<h4>🔌 ${esc(a.chip)} <small>${esc(a.porta || "sem porta COM")} · driver ${esc(a.versao || "—")} ${esc(a.fornecedor || "")}</small></h4>
      <div class="ver">${t.ok ? "✔" : "✖"} ${esc(a.veredito)}</div>
      ${a.aviso ? `<div class="det">⚠ ${esc(a.aviso)}</div>` : ""}
      <div class="linha-btn"></div>`;
    const lb = d.querySelector(".linha-btn");
    a.acoes.forEach((x) => {
      const b = document.createElement("button"); b.className = "btn" + (x.id === "driver_ch340" ? " primario" : ""); b.textContent = x.rotulo;
      b.onclick = async () => {
        if (x.id === "link") return api.abrir_link(x.url);
        if (x.id === "reconectar") return toast("Desconecte o cabo, espere 3 segundos, reconecte e clique em ⟳ Testar de novo");
        b.disabled = true; b.textContent = "Aguardando a permissão do Windows (administrador)…";
        const res = await api.cabo_corrigir(x.id, a.hwid);
        if (!res.ok) { b.disabled = false; b.textContent = x.rotulo; return toast(res.erro || "Não foi possível corrigir", "erro"); }
        toast(x.id === "driver_ch340" ? "Driver instalado — testando de novo…" : "Pronto: o Windows não vai mais trocar o driver sozinho");
        if (res.reiniciar) toast("O Windows pediu para reiniciar o computador para concluir", "aviso");
        diagnosticarCabo(); carregarPortas();
      };
      lb.appendChild(b);
    });
    c.appendChild(d);
  });
}

// ================= roteiros de coleta =================
const RE_MORE = /(-{2,}\s*More\s*-{2,}|--\s*More\s*--|<---\s*More\s*--->|Press any key to continue|\(more\))/i;
const RE_PROMPT = /([<\[][^\s<>\[\]]+[>\]]|[\w\-.()]+[#>$]|PS [A-Z]:\\[^>]*>|[A-Z]:\\[^>]*>|\$|#)\s*$/;
// segurança: roteiro "somente leitura" só aceita comandos de consulta
const RE_LEITURA = /^\s*(display|dis |show |dir |get |get-|ping |tracert |traceroute |ipconfig|systeminfo|hostname|hostnamectl|uname|uptime|df |free|ip -br|ip a|ss -|systemctl --failed|systemctl status|cat \/proc|\/[a-z0-9\- \/]+ print|esxcli [a-z0-9 \-]+ (list|get)|(switchshow|switchstatusshow|fabricshow|nsshow|nscamshow|firmwareshow|sfpshow|porterrshow|portperfshow|portshow|zoneshow|cfgshow|sensorshow|psshow|fanshow|tempshow|errdump|licenseshow|islshow|trunkshow|slotshow|chassisshow|ipaddrshow|hashow|version)\b|iscsiadm -m (session|node)|multipath -ll|lsblk)/i;
let ROTEIROS = [], rotSel = null;

// ---- Skills de CONFIGURAÇÃO: funções puras (as mesmas regras de skills.py; tools/test_skills_config.py confere as duas) ----
const SKL = (() => {
  const RE_MARC = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
  const RE_IP = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const RE_WWN = /^([0-9A-Fa-f]{2}:){7}[0-9A-Fa-f]{2}$/;
  const MASC = "********";
  const mascaraValida = (v) => {
    if (!RE_IP.test(v || "")) return false;
    const n = v.split(".").reduce((x, p) => ((x << 8) | +p) >>> 0, 0), inv = (~n) >>> 0;
    return n !== 0 && ((inv & (inv + 1)) >>> 0) === 0;
  };
  const opcoes = (v) => (v.opcoes || []).map((o) => (o && typeof o === "object" ? { valor: String(o.valor ?? ""), rotulo: o.rotulo || String(o.valor ?? "") } : { valor: String(o), rotulo: String(o) }));
  function validarValor(v, valor) {
    const s = valor == null ? "" : String(valor), t = v.tipo || "texto", rot = v.rotulo || v.id;
    if (!s.trim()) return v.obrigatorio ? `${rot}: obrigatório` : "";
    if (t === "ip" && !RE_IP.test(s.trim())) return `${rot}: IP inválido (ex.: 192.168.10.2)`;
    if (t === "mascara" && !mascaraValida(s.trim())) return `${rot}: máscara inválida (ex.: 255.255.255.0)`;
    if (t === "wwn" && !RE_WWN.test(s.trim())) return `${rot}: WWN inválido (ex.: 10:00:00:90:fa:12:34:56)`;
    if (t === "vlan" || t === "numero") {
      if (!/^\d+$/.test(s.trim())) return `${rot}: use só números`;
      const n = +s, [mi, ma] = t === "vlan" ? [1, 4094] : [v.min, v.max];
      if ((mi != null && n < mi) || (ma != null && n > ma)) return t === "numero" ? `${rot}: fora da faixa ${mi}–${ma}` : `${rot}: VLAN deve ser de 1 a 4094`;
    }
    if (t === "lista" && v.opcoes && v.opcoes.length && !opcoes(v).some((o) => o.valor === s)) return `${rot}: escolha uma das opções`;
    if (v.regex && !new RegExp(v.regex).test(s)) return `${rot}: ${v.ajuda || "formato inválido"}`;
    if (t !== "senha" && /[\r\n]/.test(s)) return `${rot}: não use quebra de linha`;
    return "";
  }
  function validar(vars, valores, ignorar = []) {
    const e = {};
    (vars || []).forEach((v) => { if (ignorar.includes(v.id)) return; const m = validarValor(v, (valores || {})[v.id]); if (m) e[v.id] = m; });
    return e;
  }
  const preencher = (txt, valores) => String(txt || "").replace(RE_MARC, (m, id) => (valores && id in valores ? String(valores[id]) : m));
  const marcadores = (txt) => [...String(txt || "").matchAll(RE_MARC)].map((m) => m[1]);
  const segredos = (vars, valores) => [...new Set((vars || []).filter((v) => v.tipo === "senha").map((v) => String((valores || {})[v.id] || "")).filter(Boolean))].sort((a, b) => b.length - a.length);
  const ordenar = (l) => [...new Set((l || []).filter(Boolean))].sort((a, b) => b.length - a.length);
  const mascarar = (txt, segs) => ordenar(segs).reduce((t, s) => t.split(s).join(MASC), String(txt || ""));
  const mesmoTam = (txt, segs) => ordenar(segs).reduce((t, s) => t.split(s).join("*".repeat(s.length)), String(txt || ""));
  function mascararSnap(snap, segs) {   // tela capturada: oculta mantendo as colunas
    if (!snap || !segs || !segs.length) return snap;
    (snap.linhas || []).forEach((runs) => {
      const lin = runs.map((r) => r[0]).join(""), nova = mesmoTam(lin, segs);
      if (nova !== lin) { let p = 0; runs.forEach((r) => { const n = r[0].length; r[0] = nova.slice(p, p + n); p += n; }); }
    });
    if ("texto" in snap) snap.texto = mesmoTam(snap.texto, segs);
    return snap;
  }
  // monta os comandos finais: cmd (o que é digitado; senha do cofre fica como {{id}} e o backend completa),
  // mostra (o que aparece na prévia/evidência/barra, senhas como ********)
  function montar(rot, valores, cofreRefs = {}) {
    const vars = rot.variaveis || [], segs = segredos(vars, valores);
    const real = {}, mostra = {};
    vars.forEach((v) => {
      if (cofreRefs[v.id]) { mostra[v.id] = MASC; return; }
      const x = (valores || {})[v.id] == null ? "" : String(valores[v.id]);
      real[v.id] = x; mostra[v.id] = v.tipo === "senha" && x ? MASC : x;
    });
    return (rot.comandos || []).map((c, i) => {
      const usados = [...marcadores(c.cmd), ...(c.respostas || []).flatMap((r) => marcadores(r.enviar))];
      const cofre = {}; usados.forEach((id) => { if (cofreRefs[id]) cofre[id] = cofreRefs[id]; });
      return { ...c, i, modelo: c.cmd, cmd: preencher(c.cmd, real), mostra: preencher(c.cmd, mostra), cofre, segredos: segs,
               respostas: (c.respostas || []).map((r) => ({ ...r, modelo: r.enviar, enviar: preencher(r.enviar, real), mostra: preencher(r.enviar, mostra) })) };
    });
  }
  return { validarValor, validar, preencher, marcadores, segredos, mascarar, mascararSnap, montar, opcoes, mascaraValida, MASC };
})();

// Espera o comando TERMINAR: saída parada + cursor num prompt ou num "---- More ----".
// Sem prompt reconhecível (equipamento diferente), aceita após 8 s parado. Limite geral: max.
function esperarSaida(a, desde, quieto = 900, max = 120000) {
  return new Promise((res) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const ult = a.ultimaEscrita || 0, parado = Date.now() - Math.max(ult, desde);
      const ln = linhaCursor(a.term), fim = RE_MORE.test(ln) || RE_PROMPT.test(ln);
      if ((ult > desde && parado >= quieto && fim) || parado >= 8000 || Date.now() - t0 > max || !a.conectado || (a.roteiro && a.roteiro.parar)) {
        clearInterval(iv); res();
      }
    }, 150);
  });
}
const SHELL_WIN = ["powershell", "cmd", "azure", "gcp"];   // (abas de IA ficam de fora: não se digita "cls" no prompt do assistente)
function desenharRoteiro(a) {
  if (a.id !== ativa) return;
  const bar = $("#roteiro-barra"), r = a.roteiro;
  if (!r) { bar.classList.add("oculto"); return; }
  bar.classList.remove("oculto");
  bar.innerHTML = `<b>▶ ${esc(r.nome)}</b><span>${r.i}/${r.total}</span><code>${esc(r.atual || "")}</code>
    <span class="prog"><i style="width:${Math.round((r.i / r.total) * 100)}%"></i></span>
    <span>${pl(r.evid, "evidência")}</span><button class="btn" id="rot-parar">${r.parar ? "Parando…" : "■ Parar"}</button>`;
  bar.querySelector("#rot-parar").onclick = () => { r.parar = true; desenharRoteiro(a); };
}
// Saída maior que a tela e sem paginação (PowerShell, Linux): captura tela por tela rolando o terminal.
async function capturarRolando(a, ini, c, nomeRot, enviar) {
  const b = a.term.buffer.active, R = a.term.rows, fim = b.baseY + b.cursorY, total = fim - ini + 1;
  if (total <= R || ini < 0) { await evidencia(enviar, nomeRot, a, c.mostra || c.cmd, null, c.segredos); a.roteiro.evid++; desenharRoteiro(a); return; }
  const n = Math.min(Math.ceil(total / R), c.paginas || 8);
  for (let k = 0; k < n && !a.roteiro.parar; k++) {
    a.term.scrollToLine(Math.min(ini + k * R, b.baseY));
    await new Promise((r) => setTimeout(r, 120));
    await evidencia(enviar, nomeRot, a, c.mostra || c.cmd, null, c.segredos); a.roteiro.evid++; desenharRoteiro(a);
  }
  a.term.scrollToBottom();
}
async function executarRoteiro(rot, enviar) {
  const a = A();
  if (!a || !a.conectado) return toast("Conecte a aba e faça o login no equipamento antes de rodar o roteiro", "aviso");
  if (a.share && !a.share.souAtivo) return toast("Você está observando: peça o controle para rodar um roteiro", "aviso");
  if (a.roteiro) return toast("Já há um roteiro rodando nesta aba", "aviso");
  if (a.tipo === "web") return toast("Roteiros são para abas de terminal (Serial, SSH, PowerShell…)", "aviso");
  const proibidos = rot.somente_leitura ? rot.comandos.filter((c) => !RE_LEITURA.test(c.cmd)) : [];
  if (proibidos.length) return toast(`Roteiro bloqueado: "${proibidos[0].cmd}" não é comando de consulta`, "erro");
  const config = rot.tipo_skill === "configuracao";
  const versao = a.versaoFechamento;
  if (config && !(await confirmar(`⚠ <b>ESTA SKILL ALTERA A CONFIGURAÇÃO DO EQUIPAMENTO</b><br><b>${esc(rot.nome)}</b>: ${rot.comandos.length === 1 ? "1 comando será digitado" : `${rot.comandos.length} comandos serão digitados`} na aba <b>${esc(a.nome || "")}</b>, um por vez, com evidência de cada tela. Confirma a execução?`))) return;
  if (!config && !rot.somente_leitura && !(await confirmar(`⚠ <b>${esc(rot.nome)}</b> GRAVA arquivos (ex.: cópia para o pendrive). Não altera a configuração do equipamento. Executar?`))) return;
  if (a.roteiro || !a.conectado || !abas.has(a.id) || a.versaoFechamento !== versao) return;
  // Skill de configuração: digita pelo backend (completa a senha do cofre e passa a ocultá-la no log/gravação/evidência)
  const digitar = async (c, texto) => {
    if (!config) { api.escrever(a.id, texto + "\r"); return true; }
    if (api.skill_escrever) {
      let r = await cofreChamar("skill_escrever", a.id, texto, c.cofre || {}, c.segredos || []);
      if (r && r.trancado && await garantirCofre("A Skill usa uma senha do cofre."))
        r = await cofreChamar("skill_escrever", a.id, texto, c.cofre || {}, c.segredos || []);
      if (r && r.ok === false) { toast(r.erro || "Falha ao digitar o comando", "erro"); return false; }
      return true;
    }
    if (Object.keys(c.cofre || {}).length || c.segredos?.length) {
      toast("A proteção de senhas da Skill está indisponível nesta versão.", "erro"); return false;
    }
    api.escrever(a.id, texto + "\r"); return true;
  };
  const r = a.roteiro = { nome: rot.nome, i: 0, total: rot.comandos.length, evid: 0, parar: false };
  let id = null, resultado = "Falha na execução";
  try {
    try { id = await api.skill_iniciar_registro?.(a.id, rot.nome); } catch (_) {}
    await rodarPassosSkill(a, rot, enviar, digitar);
    resultado = r.parar || !a.conectado || !abas.has(a.id) ? "Interrompida" : "Fluxo concluído";
  } catch (_) {
    resultado = "Falha na execução";
  } finally {
    a.roteiro = null;
    desenharRoteiro(a);
    if (id) {
      try { await api.skill_finalizar_registro(a.id, id, resultado); } catch (_) {}
    }
  }
  toast(`${resultado}: ${pl(r.evid, "evidência")} — gere o 📄 Relatório quando quiser`);
}
async function rodarPassosSkill(a, rot, enviar, digitar) {
  const passos = [...rot.comandos];
  for (let k = 0; k < passos.length; k++) {
    let c = passos[k];
    if (a.roteiro.parar || !a.conectado) break;
    if (c.copiar_pasta) {   // lista a pasta, lê os nomes dos arquivos e vira um "copy" (com confirmação) para cada um
      if (limparDaAba(a)) a.term.clear();
      const inicioDir = a.term.registerMarker(0);
      let desde = Date.now(); api.escrever(a.id, `dir ${c.copiar_pasta}\r`); await esperarSaida(a, desde, 1500, 30000);
      const nomes = arquivosDoDir(a.term, Math.max(0, inicioDir?.line ?? 0));
      inicioDir?.dispose();
      const pasta = c.copiar_pasta.includes("*") ? c.copiar_pasta.replace(/[^/]*$/, "") : c.copiar_pasta.replace(/\/?$/, "/");   // curinga: copia da pasta-mãe
      passos.splice(k + 1, 0, ...nomes.map((n) => ({ cmd: `copy ${pasta}${n} ${c.destino}`, confirmar: true, paginas: 2 })));
      a.roteiro.total = passos.length; toast(`📂 ${c.copiar_pasta}: ${pl(nomes.length, "arquivo")} para copiar`);
      c = { cmd: `dir ${c.copiar_pasta}`, paginas: 6 };   // a listagem também vira evidência
    }
    a.roteiro.i++; a.roteiro.atual = c.mostra || c.cmd; desenharRoteiro(a);
    const env = enviar && (!rot.whatsapp || rot.whatsapp.includes(c.modelo || c.cmd));   // só as evidências-chave vão para o WhatsApp
    let desde = Date.now();
    if (limparDaAba(a) && SHELL_WIN.includes(a.tipo)) {        // shells do Windows: limpar no próprio shell (o ConPTY redesenha a tela)
      api.escrever(a.id, "cls\r"); await esperarSaida(a, desde, 600, 10000);
    } else if (limparDaAba(a)) a.term.clear();
    const buf0 = a.term.buffer.active, ini = buf0.baseY + buf0.cursorY;   // linha onde o comando começa
    desde = Date.now();
    if (!(await digitar(c, c.cmd))) throw new Error("Falha ao executar comando da Skill");
    await esperarSaida(a, desde);
    for (let n = 0; c.confirmar && n < 3 && /\[\s*Y\s*\/\s*N\s*\]\s*:?\s*$/i.test(linhaCursor(a.term)); n++) {   // "Copy ...? [Y/N]:"
      desde = Date.now(); api.escrever(a.id, "y\r"); await esperarSaida(a, desde, 1500, 120000);
    }
    // perguntas do equipamento previstas na Skill ("[Y/N]", "modulus", "[sudo] password"…): responde o que o modelo manda
    for (let n = 0; (c.respostas || []).length && n < 4 && !a.roteiro.parar; n++) {
      const ln = linhaCursor(a.term), r = c.respostas.find((x) => { try { return new RegExp(x.padrao, "i").test(ln); } catch (_) { return false; } });
      if (!r) break;
      if (!r.enviar && SKL.marcadores(r.modelo || "").length && !Object.keys(c.cofre || {}).length) {
        toast(`O equipamento perguntou "${ln.trim().slice(-60)}" e o campo da Skill está vazio — Skill interrompida`, "erro");
        a.roteiro.parar = true; break;
      }
      desde = Date.now();
      if (!(await digitar(c, r.enviar))) throw new Error("Falha ao responder pela Skill");
      await esperarSaida(a, desde, 1200, 60000);
    }
    for (let pag = 1; ; pag++) {
      if (a.roteiro.parar || !a.conectado || !abas.has(a.id)) break;
      const ln = linhaCursor(a.term);
      if (!RE_MORE.test(ln)) {                            // comando terminou (prompt)
        await capturarRolando(a, ini, c, rot.nome, env); break;
      }
      // até o limite: evidência de cada página; depois do limite NÃO corta a saída (o fabricante quer tudo):
      // continua paginando até o fim e o conteúdo integral fica no log da sessão (anexado ao PDF)
      if (pag <= (c.paginas || 8)) { await evidencia(env, rot.nome, a, c.mostra || c.cmd, null, c.segredos); a.roteiro.evid++; desenharRoteiro(a); }
      else if (pag > 2000) { desde = Date.now(); api.escrever(a.id, "\x03"); await esperarSaida(a, desde, 800, 5000); a.roteiro.parar = true; break; }
      if (limparDaAba(a)) a.term.clear();
      desde = Date.now(); api.escrever(a.id, " ");   // próxima página
      await esperarSaida(a, desde);
    }
  }
}
// nomes de arquivo na saída do "dir" (Huawei: "  0  -rw-  12,345  Oct 06 2026 10:00:01   log.log.zip")
function arquivosDoDir(term, inicio) {
  const b = term.buffer.active, nomes = [];
  for (let y = inicio; y <= b.baseY + b.cursorY; y++) {
    const t = (b.getLine(y) && b.getLine(y).translateToString(true)) || "";
    const m = t.match(/^\s*\d+\s+-[rwx-]{3,}\s+[\d,]+\s+.+?\s+(\S+)\s*$/);
    if (m) nomes.push(m[1]);
  }
  return nomes;
}
const confirmar = (html) => new Promise((ok) => pedido(html, "Executar", "Cancelar", ok, "confirmar-roteiro"));
let guiaDasSkills = null;
async function abrirRoteiros(guia = null) {
  guiaDasSkills = guia && guia.term ? guia : null;
  ROTEIROS = await api.roteiros();
  if (guiaDasSkills) {
    const tipo = guiaDasSkills.tipo;
    ROTEIROS = ROTEIROS.filter(r => r.tipo === tipo || (tipo === "ssh" && r.tipo === "serial"));
    if (!ROTEIROS.length) return toast("Nenhuma Skill cadastrada para este tipo de guia", "aviso");
  }
  const fab = [...new Set(ROTEIROS.map((r) => r.fabricante).filter(Boolean))].sort(), f = $("#rot-filtro");
  f.innerHTML = `<option value="">Todos os fabricantes</option>` + fab.map((x) => `<option>${esc(x)}</option>`).join("");
  const fin = [...new Set(ROTEIROS.flatMap((r) => r.finalidade || []))].sort((x, y) => x.localeCompare(y)), g = $("#rot-cat");
  if (g) {
    g.innerHTML = `<option value="">Toda finalidade</option><option value="@coleta">🔎 Só coleta (consulta)</option><option value="@configuracao">⚙ Só configuração</option>` +
      fin.map((x) => `<option>${esc(x)}</option>`).join("");
    g.onchange = desenharRoteiros;
  }
  $("#rot-busca").value = ""; $("#rot-busca").oninput = desenharRoteiros; f.onchange = desenharRoteiros;
  desenharRoteiros(); abrirModal("#modal-roteiro"); setTimeout(() => $("#rot-busca").focus(), 50);
}
const ehConfig = (r) => r && r.tipo_skill === "configuracao";
function desenharRoteiros() {
  const ul = $("#rot-lista"); ul.innerHTML = "";
  const a = A(), tipo = a && a.tipo, q = $("#rot-busca").value.trim().toLowerCase(), fab = $("#rot-filtro").value, cat = ($("#rot-cat") || {}).value || "";
  const lista = ROTEIROS.filter((r) => (!fab || r.fabricante === fab) &&
    (!cat || (cat === "@coleta" ? !ehConfig(r) : cat === "@configuracao" ? ehConfig(r) : (r.finalidade || []).includes(cat))) &&
    (!q || [r.nome, r.fabricante, r.descricao, ...(r.finalidade || []), ...r.comandos.map((c) => c.cmd)].join(" ").toLowerCase().includes(q)));
  if (!lista.length) ul.innerHTML = `<li class="rot-vazio">Nenhuma Skill encontrada com essa busca / filtro.</li>`;
  // agrupado por fabricante/plataforma (as que combinam com a aba atual primeiro), cartões uniformes
  const fabDe = (r) => r.fabricante || "Outros", comb = (r) => (r.tipo === tipo ? 0 : 1);
  let grupo = null;
  lista.sort((x, y) => comb(x) - comb(y) || fabDe(x).localeCompare(fabDe(y), "pt-BR") || x.nome.localeCompare(y.nome, "pt-BR")).forEach((r, i) => {
    const g = comb(r) === 0 ? "Combinam com esta aba" : fabDe(r);
    if (g !== grupo) { const h = document.createElement("li"); h.className = "rot-grupo"; h.textContent = g; ul.appendChild(h); grupo = g; }
    const li = document.createElement("li"); li.className = "rot-item";
    li.dataset.arquivo = r.arquivo; li.dataset.origem = r.origem || "";
    li.innerHTML = `<div class="rot-item-l1"><b>${esc(r.nome)}</b>${ehConfig(r) ? '<span class="tag tag-config">⚙ configuração</span>' : '<span class="tag tag-coleta">🔎 coleta</span>'}</div>
      <small>${esc(fabDe(r))} · ${pl(r.comandos.length, "comando")}${(r.finalidade || []).length ? " · " + esc(r.finalidade.join(", ")) : ""}</small>`;
    li.onclick = () => {
      rotSel = r; ul.querySelectorAll("li").forEach((x) => x.classList.remove("sel")); li.classList.add("sel");
      $("#rot-tit").textContent = r.nome; $("#rot-desc").textContent = (r.descricao || "") + (r.somente_leitura ? " · somente leitura" : "");
      mostrarSkill(r);
    };
    ul.appendChild(li); if (i === 0) li.click();
  });
}

// ---- Skill de configuração: 1) perguntas  2) prévia com caixa por comando  3) confirmação explícita ----
let skillCfg = null;   // { fase: "form"|"previa", valores, cofre, cmds }
function mostrarSkill(r) {
  const cfgS = ehConfig(r), el = (id) => $(id);
  el("#rot-aviso").classList.toggle("oculto", !cfgS);
  ["#rot-voltar", "#rot-copiar", "#rot-previa"].forEach((x) => el(x).classList.add("oculto"));
  el("#rot-ciente-l").classList.add("oculto"); el("#rot-ciente").checked = false;
  if (!cfgS) {
    skillCfg = null; el("#rot-form").classList.add("oculto"); el("#rot-form").innerHTML = "";
    el("#rot-executar").classList.remove("oculto");
    $("#rot-cmds").innerHTML = r.comandos.map((c, i) => `<li><label class="rot-cmd"><input type="checkbox" data-ci="${i}" checked> <span>${esc(c.cmd)}</span> ${c.paginas && c.paginas !== 8 ? `<small>(até ${c.paginas} pág.)</small>` : ""}</label></li>`).join("");
    $("#rot-cmds").querySelectorAll("[data-ci]").forEach((cb) => (cb.onchange = desenharSelecaoSkill));
    desenharSelecaoSkill();
    return;
  }
  skillCfg = { fase: "form", valores: {}, cofre: {}, cmds: [] };
  (r.variaveis || []).forEach((v) => (skillCfg.valores[v.id] = v.padrao == null ? "" : String(v.padrao)));
  desenharFormSkill(r);
}
function desenharFormSkill(r) {
  skillCfg.fase = "form";
  const f = $("#rot-form"); f.classList.remove("oculto");
  $("#rot-cmds").innerHTML = ""; $("#rot-sel").innerHTML = "";
  $("#rot-executar").classList.add("oculto"); $("#rot-voltar").classList.add("oculto"); $("#rot-copiar").classList.add("oculto");
  $("#rot-ciente-l").classList.add("oculto"); $("#rot-previa").classList.remove("oculto");
  const credenciais = (typeof cofre !== "undefined" && cofre) || [];
  f.innerHTML = `<div class="rot-form-tit">Responda às perguntas — os comandos serão montados com estas respostas</div>` + (r.variaveis || []).map((v) => {
    const val = skillCfg.valores[v.id] ?? "", obr = v.obrigatorio ? ' <b class="obr" title="obrigatório">*</b>' : "";
    let campo;
    if (v.tipo === "lista") campo = `<select data-var="${esc(v.id)}">${SKL.opcoes(v).map((o) => `<option value="${esc(o.valor)}"${o.valor === val ? " selected" : ""}>${esc(o.rotulo)}</option>`).join("")}</select>`;
    else if (v.tipo === "senha") campo = `<input type="password" data-var="${esc(v.id)}" value="${esc(val)}" autocomplete="new-password" spellcheck="false"${skillCfg.cofre[v.id] ? " disabled" : ""}><button type="button" class="btn mini" data-gerar-senha aria-label="Gerar senha para ${esc(v.rotulo || v.id)}" aria-haspopup="dialog"${skillCfg.cofre[v.id] ? " disabled" : ""}>🎲</button>` +
      (credenciais.length ? `<select data-cofre="${esc(v.id)}" title="Usar a senha de uma credencial do cofre (não passa pela interface)"><option value="">digitar</option>${credenciais.map((c) => `<option value="${esc(c.id)}"${skillCfg.cofre[v.id] === c.id ? " selected" : ""}>🔐 ${esc(c.nome)}</option>`).join("")}</select>`
        : !COFRE.token ? `<button type="button" class="btn mini" data-destrancar title="Destranca o cofre com o PIN para escolher uma credencial">🔒 Usar do cofre</button>` : "");
    else campo = `<input type="text" data-var="${esc(v.id)}" value="${esc(val)}" spellcheck="false" placeholder="${esc(v.tipo === "ip" ? "ex.: 192.168.10.2" : v.tipo === "mascara" ? "ex.: 255.255.255.0" : v.tipo === "vlan" ? "1 a 4094" : v.tipo === "wwn" ? "10:00:00:90:fa:12:34:56" : "")}">`;
    return `<label class="rot-campo"><span>${esc(v.rotulo || v.id)}${obr}</span><div class="rot-campo-in">${campo}</div>
      ${v.ajuda ? `<small>${esc(v.ajuda)}</small>` : ""}<em class="rot-erro" data-erro="${esc(v.id)}"></em></label>`;
  }).join("");
  f.querySelectorAll("[data-var]").forEach((i) => (i.oninput = i.onchange = () => {
    skillCfg.valores[i.dataset.var] = i.value; const e = f.querySelector(`[data-erro="${CSS.escape(i.dataset.var)}"]`); if (e) e.textContent = "";
  }));
  f.querySelectorAll("[data-cofre]").forEach((s) => (s.onchange = () => {
    const id = s.dataset.cofre; if (s.value) skillCfg.cofre[id] = s.value; else delete skillCfg.cofre[id];
    const inp = f.querySelector(`[data-var="${CSS.escape(id)}"]`); inp.disabled = !!s.value; inp.nextElementSibling.disabled = inp.disabled; if (s.value) inp.value = skillCfg.valores[id] = "";
  }));
  f.querySelectorAll("[data-destrancar]").forEach((b) => (b.onclick = async () => { if (await garantirCofre("A Skill pode usar uma senha do cofre.")) desenharFormSkill(r); }));
}
function gerarPreviaSkill(r) {
  const f = $("#rot-form");
  const erros = SKL.validar(r.variaveis, skillCfg.valores, Object.keys(skillCfg.cofre));
  f.querySelectorAll("[data-erro]").forEach((e) => (e.textContent = erros[e.dataset.erro] || ""));
  f.querySelectorAll("[data-var]").forEach((i) => i.classList.toggle("invalido", !!erros[i.dataset.var]));
  const ids = Object.keys(erros);
  if (ids.length) { toast(erros[ids[0]] + (ids.length > 1 ? ` (+${ids.length - 1})` : ""), "erro"); return false; }
  skillCfg.cmds = SKL.montar(r, skillCfg.valores, skillCfg.cofre); skillCfg.fase = "previa";
  f.classList.add("oculto"); $("#rot-previa").classList.add("oculto");
  $("#rot-voltar").classList.remove("oculto"); $("#rot-copiar").classList.remove("oculto"); $("#rot-executar").classList.remove("oculto");
  $("#rot-ciente-l").classList.remove("oculto"); $("#rot-ciente").checked = false;
  $("#rot-cmds").innerHTML = skillCfg.cmds.map((c) => `<li><label class="rot-cmd"><input type="checkbox" data-ci="${c.i}"${c.marcado === false ? "" : " checked"}> <span class="mono">${esc(c.mostra)}</span>${c.nota ? `<small class="rot-nota">${esc(c.nota)}</small>` : ""}</label></li>`).join("");
  $("#rot-cmds").querySelectorAll("[data-ci]").forEach((cb) => (cb.onchange = desenharSelecaoSkill));
  desenharSelecaoSkill();
  return true;
}
function copiarScriptSkill() {
  if (!skillCfg || skillCfg.fase !== "previa") return;
  const sel = [...$("#rot-cmds").querySelectorAll("[data-ci]")].filter((c) => c.checked).map((c) => +c.dataset.ci);
  const cmds = skillCfg.cmds.filter((c) => sel.includes(c.i));
  if (!cmds.length) return toast("Marque pelo menos um comando", "aviso");
  const copiar = (txt, msg) => navigator.clipboard.writeText(txt).then(() => toast(msg), () => toast("Não foi possível copiar", "erro"));
  const temSenha = cmds.some((c) => c.segredos.length && c.cmd !== c.mostra);
  const mascarado = cmds.map((c) => c.mostra).join("\n") + "\n";
  if (!temSenha) return copiar(cmds.map((c) => c.cmd).join("\n") + "\n", `📋 Script copiado (${cmds.length} comando(s))`);
  pedido(`📋 O script tem <b>senha</b>. Copiar com a senha digitada (fica na área de transferência — cuidado) ou com <b>********</b> (você digita a senha ao colar)?`,
    "Com ********", "Com a senha", (masc) => (masc ? copiar(mascarado, "📋 Script copiado com as senhas ocultas")
      : copiar(cmds.map((c) => SKL.preencher(c.cmd, {})).join("\n") + "\n", "📋 Script copiado COM a senha — limpe a área de transferência depois")));
}

// ================= relatório =================
async function gerarRelatorio() {
  toast("Gerando o relatório do atendimento (PDF)…", "", { fixo: true });
  ilhaTarefa("relatorio", "Gerando o relatório", "PDF do atendimento");
  $("#btn-relatorio").disabled = true;
  try {
    const r = await api.relatorio_gerar();
    if (!r.ok) return toast(r.erro, "erro");
    toastFechar();   // o progresso termina aqui: some junto com a conclusão
    gerarRelatorio.ok = true;
    const nome = r.pdf.split("\\").pop();
    pedido(`📄 <b>Relatório gerado</b> — ${pl(r.evidencias, "evidência")}, ${pl(r.logs, "log")}, ${pl(r.gravacoes, "gravação", "gravações")}.<br>
      <span class="nome-arq"><small title="${esc(nome)}">${esc(nomeNoMeio(nome))}</small><button type="button" class="nome-copiar" data-copiar-nome="${esc(nome)}" title="Copiar o nome do arquivo">Copiar nome</button></span>`, "Ver e assinar", "Enviar no WhatsApp", (abrir) => {
      if (abrir) abrirPdf(r.pdf);
      else api.wa_enviar_arquivo(r.pdf, `Relatório de atendimento ${r.id}`).then((x) =>
        x.ok ? toast(`Relatório na fila de envio para ${x.conversa} (${x.posicao}º)`) : toast(x.erro, "erro"));
    });
  } catch (err) { toast(`Não foi possível gerar o relatório: ${err && err.message || err}`, "erro"); }
  finally { $("#btn-relatorio").disabled = false; if (toast._fixo) toastFechar(); ilhaTarefaFim("relatorio", !!gerarRelatorio.ok, "Relatório pronto", "O PDF do atendimento foi gerado."); gerarRelatorio.ok = false; }
}

// ---------- equipamentos salvos ----------
let EQ = [], eqEdit = null;
const TIPO_NOME = NOMES_TIPO;
const novaSelecao = () => ({ selecionados: new Set(), recolhidos: new Set(), ancora: null, foco: null });
const EQ_LISTA = { ...novaSelecao(), pendente: null, ocupada: false };
async function abrirEquip() {
  await abrirBiblioteca("equipamentos");
  if (BIB.sec === "equipamentos" && !$("#modal-bib").classList.contains("oculto")) $("#bib-busca").focus();
}
function desenharEquip() {
  const n = $('#bib-nav [data-sec="equipamentos"] .bib-n'); if (n) n.textContent = EQ.length;
  if (BIB.sec === "equipamentos" && !$("#modal-bib").classList.contains("oculto")) desenharBib();
}
function ferramentaEquip(e) { return (e.origem || "").split(" · ")[0]; }
function partesGrupoEquip(grupo) { return (grupo || "").split("/").map((p) => p.trim()).filter(Boolean); }
function estadoEquip(e) {
  const ligado = [...abas.values()].some((a) => a.conectado && a.tipo === e.tipo &&
    (e.tipo === "serial" ? a.params?.porta === e.destino.split(":")[0] : !!e.destino && a.params?.destino === e.destino));
  return ligado ? "Em uso" : e.ultima ? `Último uso: ${e.ultima}` : "Nunca usado";
}
function atualizarEstadosEquip() {
  if ($("#modal-bib").classList.contains("oculto")) return;
  document.querySelectorAll("#eq-linhas .eq-linha").forEach((linha) => {
    const e = EQ.find((item) => item.id === linha.dataset.id);
    if (e) linha.querySelector(".eq-estado").textContent = estadoEquip(e);
  });
}
async function recarregarEquip() {
  const lista = await api.equip_listar();
  if (!Array.isArray(lista)) throw new Error("A lista de equipamentos não pôde ser atualizada");
  EQ = lista; desenharEquip();
}
function linhaEquip(e, agrupamento) {
  const linha = document.createElement("div"); linha.className = "eq-linha";
  const [ferramenta, data] = (e.origem || "").split(" · ");
  const origem = [ferramenta, data && new Date(data).toLocaleString("pt-BR")].filter(Boolean).join(" · ");
  linha.innerHTML = `<span class="eq-nome"><span class="eq-tipo">${esc(nomeTipo(e.tipo))}</span><b>${esc(e.nome)}</b></span>
    <span class="eq-destino">${esc(e.destino)}</span>
    <span class="eq-etiquetas">${e.grupo && !(bibDesktop.matches && agrupamento === "cliente") ? `<small>${esc(e.grupo)}</small>` : ""}
      ${origem ? `<small title="Origem da importação">${esc(origem)}</small>` : ""}</span>
    <small class="eq-estado">${esc(estadoEquip(e))}</small>`;
  return linha;
}
function nosVisiveis(lista) {
  return [...lista.querySelectorAll("[data-eq-no]")].filter((no) => !no.closest("[hidden]"));
}
function focoLista(lista, no, focar) {
  const anterior = lista.querySelector('[data-eq-no][tabindex="0"]');
  if (anterior) anterior.tabIndex = -1;
  lista.tabIndex = no ? -1 : 0;
  if (no) no.tabIndex = 0;
  lista.controle.estado.foco = no?.dataset.eqNo || null;
  if (focar) (no || lista).focus();
}
function mostrarSelecao(lista, nos = nosVisiveis(lista)) {
  const estado = lista.controle.estado;
  const ids = nos.filter((no) => no.dataset.id).map((no) => no.dataset.id);
  estado.selecionados = new Set(ids.filter((id) => estado.selecionados.has(id)));
  if (!ids.includes(estado.ancora)) estado.ancora = null;
  lista.querySelectorAll("[data-id]").forEach((no) => no.setAttribute("aria-selected", estado.selecionados.has(no.dataset.id)));
  lista.controle.atualizar();
}
function selecionarLinha(lista, no, { shiftKey, ctrlKey, metaKey }, alternar = false) {
  const estado = lista.controle.estado;
  const nos = nosVisiveis(lista), id = no.dataset.id, soma = ctrlKey || metaKey;
  lista.controle.cancelar?.();
  if (shiftKey) {
    const linhas = nos.filter((n) => n.dataset.id), ate = linhas.indexOf(no);
    const ancora = estado.ancora || nos.find((n) => n.dataset.eqNo === estado.foco)?.dataset.id;
    const indice = linhas.findIndex((n) => n.dataset.id === ancora), de = indice < 0 ? ate : indice;
    estado.ancora = linhas[de].dataset.id;
    if (!soma) estado.selecionados.clear();
    linhas.slice(Math.min(de, ate), Math.max(de, ate) + 1).forEach((n) => estado.selecionados.add(n.dataset.id));
  } else {
    if (!soma && !alternar) estado.selecionados = new Set([id]);
    else if (estado.selecionados.has(id)) estado.selecionados.delete(id);
    else estado.selecionados.add(id);
    estado.ancora = id;
  }
  focoLista(lista, no, true);
  mostrarSelecao(lista, nos);
}
function desenharListaSelecionavel(lista, itens, agrupamento, buscando, restaurarFoco, controle) {
  lista.controle = controle;
  const papel = agrupamento ? "treeitem" : "option", grupos = new Map();
  lista.setAttribute("role", agrupamento ? "tree" : "listbox");
  lista.setAttribute("aria-label", controle.titulo);
  lista.setAttribute("aria-multiselectable", "true");
  lista.setAttribute("aria-describedby", "bib-dica");
  for (const item of itens) {
    const partes = agrupamento ? controle.grupos(item, agrupamento) : [];
    let pai = lista;
    partes.forEach((p, i) => {
      const chave = `g:${agrupamento}:${JSON.stringify(partes.slice(0, i + 1))}`;
      if (!grupos.has(chave)) {
        const no = document.createElement("div"); no.className = "eq-ramo";
        no.dataset.eqNo = chave; no.tabIndex = -1;
        no.setAttribute("role", "treeitem");
        const rotulo = document.createElement("div"); rotulo.className = "eq-rotulo-grupo";
        rotulo.id = `eq-rotulo-${grupos.size}`; rotulo.textContent = p;
        no.setAttribute("aria-labelledby", rotulo.id);
        const filhos = document.createElement("div"); filhos.setAttribute("role", "group");
        no.append(rotulo, filhos); pai.appendChild(no); grupos.set(chave, filhos);
        expandirGrupoLista(no, buscando || !lista.controle.estado.recolhidos.has(chave));
      }
      pai = grupos.get(chave);
    });
    const linha = controle.linha(item, agrupamento);
    linha.dataset.id = controle.id(item);
    linha.dataset.eqNo = `e:${linha.dataset.id}`;
    linha.tabIndex = -1;
    linha.setAttribute("role", papel);
    linha.setAttribute("aria-selected", "false");
    pai.appendChild(linha);
  }
  const nos = nosVisiveis(lista);
  mostrarSelecao(lista, nos);
  focoLista(lista, nos.find((no) => no.dataset.eqNo === lista.controle.estado.foco) || nos[0], restaurarFoco);
  lista.onclick = (ev) => {
    const no = ev.target.closest("[data-eq-no]");
    if (!no) return;
    if (no.dataset.id) selecionarLinha(lista, no, ev);
    else { focoLista(lista, no, true); alternarGrupoLista(lista, no, buscando); }
  };
  lista.ondblclick = (ev) => {
    const id = ev.target.closest(".eq-linha")?.dataset.id;
    if (id) controle.abrir(id);
  };
  lista.onkeydown = (ev) => tecladoLista(lista, ev, buscando);
}
function expandirGrupoLista(no, aberto) {
  no.setAttribute("aria-expanded", aberto);
  no.lastElementChild.hidden = !aberto;
}
function alternarGrupoLista(lista, no, buscando) {
  if (buscando) return;
  const abrir = no.getAttribute("aria-expanded") === "false";
  if (abrir) lista.controle.estado.recolhidos.delete(no.dataset.eqNo); else lista.controle.estado.recolhidos.add(no.dataset.eqNo);
  expandirGrupoLista(no, abrir);
  lista.controle.cancelar?.();
  mostrarSelecao(lista);
}
function tecladoLista(lista, ev, buscando) {
  const estado = lista.controle.estado;
  if (ev.altKey) return;
  const atual = ev.target.closest("[data-eq-no]"), nos = nosVisiveis(lista), i = nos.indexOf(atual);
  const id = atual?.dataset.id, grupo = atual?.hasAttribute("aria-expanded"), soma = ev.ctrlKey || ev.metaKey;
  let destino;
  switch (ev.key.toLowerCase()) {
    case "arrowup": destino = nos[Math.max(0, i - 1)]; break;
    case "arrowdown": destino = nos[Math.min(nos.length - 1, i + 1)]; break;
    case "home": destino = nos[0]; break;
    case "end": destino = nos[nos.length - 1]; break;
    case "arrowright":
      if (!grupo) return;
      if (atual.getAttribute("aria-expanded") === "false") alternarGrupoLista(lista, atual, buscando);
      else destino = atual.lastElementChild.firstElementChild;
      break;
    case "arrowleft":
      if (grupo && !buscando && atual.getAttribute("aria-expanded") === "true") alternarGrupoLista(lista, atual, buscando);
      else destino = atual?.parentElement.closest(".eq-ramo");
      break;
    case "enter":
      if (grupo && !ev.repeat) alternarGrupoLista(lista, atual, buscando);
      else if (id && !ev.repeat) lista.controle.abrir(id);
      break;
    case " ":
      if (grupo && !ev.repeat) alternarGrupoLista(lista, atual, buscando);
      else if (id && !ev.repeat) selecionarLinha(lista, atual, ev, true);
      break;
    case "delete": if (!ev.repeat) lista.controle.remover?.(); break;
    case "a":
      if (!soma) return;
      lista.controle.cancelar?.();
      estado.selecionados = new Set(nos.map((no) => no.dataset.id).filter(Boolean));
      estado.ancora = id || null;
      mostrarSelecao(lista, nos);
      break;
    default: return;
  }
  ev.preventDefault();
  if (destino && destino !== atual) {
    if (destino.dataset.id && (!soma || ev.shiftKey)) selecionarLinha(lista, destino, ev);
    else focoLista(lista, destino, true);
  }
}
function selecionadosEquip() {
  const porId = new Map(EQ.map((e) => [e.id, e]));
  return [...EQ_LISTA.selecionados].map((id) => porId.get(id)).filter(Boolean);
}
function atualizaBarraEquip() {
  const itens = selecionadosEquip(), n = itens.length, origem = itens[0]?.origem;
  const habilitados = { conectar: n === 1, editar: n === 1, duplicar: n === 1, mover: n > 0, copiar: n > 0,
    remover: n > 0, desfazer: !!origem && itens.every((e) => e.origem === origem) };
  const contagem = n === 1 ? "1 selecionado" : `${n} selecionados`;
  if ($("#eq-selecao").textContent !== contagem) $("#eq-selecao").textContent = contagem;
  $("#eq-acoes").querySelectorAll("[data-eq-acao]").forEach((b) => {
    b.disabled = EQ_LISTA.ocupada || !habilitados[b.dataset.eqAcao];
  });
  $("#eq-acoes [data-desfazer-importacao]").classList.toggle("oculto", !itens.some((e) => e.origem));
}
function fecharLoteEquip() {
  EQ_LISTA.pendente = null;
  $("#eq-lote").classList.add("oculto");
}
function focarSelecaoEquip() {
  if (BIB.sec !== "equipamentos" || $("#modal-bib").classList.contains("oculto")) return;
  ($("#eq-linhas [data-eq-no][tabindex='0']") || $("#bib-busca")).focus();
}
async function acaoEquip(acao) {
  const botao = $(`#eq-acoes [data-eq-acao="${acao}"]`);
  if (botao.disabled) return;
  const itens = selecionadosEquip(), [e] = itens;
  fecharLoteEquip();
  if (acao === "conectar") return conectarEquip(e);
  if (acao === "editar") return formEquip(e);
  if (acao === "duplicar") return formEquip({ nome: `${e.nome} (cópia)`, tipo: e.tipo, destino: e.destino, grupo: e.grupo, obs: e.obs });
  if (acao === "copiar") {
    try {
      await navigator.clipboard.writeText(itens.map((item) => item.destino).join("\n"));
      toast(itens.length === 1 ? "Destino copiado" : "Destinos copiados");
    } catch (_) { toast("Não foi possível copiar o destino", "erro"); }
    return;
  }
  $("#eq-form").classList.add("oculto");
  const mover = acao === "mover", desfazer = acao === "desfazer";
  const alvo = itens.length === 1 ? `“${e.nome}”` : `${itens.length} equipamentos`;
  EQ_LISTA.pendente = { acao, itens };
  $("#eq-lote-msg").textContent = mover ? `Mover ${alvo}`
    : desfazer ? `Desfazer o lote de ${ferramentaEquip(e)}? Os equipamentos editados serão mantidos.` : `Remover ${alvo}?`;
  $("#eq-lote-ok").textContent = mover ? "Mover" : desfazer ? "Desfazer importação" : "Confirmar remoção";
  $("#eq-lote-grupo").classList.toggle("oculto", !mover);
  $("#eq-grupo-destino").value = mover && itens.every((item) => item.grupo === e.grupo) ? e.grupo || "" : "";
  $("#eq-lote").classList.remove("oculto");
  $(mover ? "#eq-grupo-destino" : "#eq-lote-cancelar").focus();
}
async function executarLoteEquip(ev) {
  ev.preventDefault();
  const pendente = EQ_LISTA.pendente;
  if (!pendente || EQ_LISTA.ocupada) return;
  const { acao, itens } = pendente;
  const grupo = partesGrupoEquip($("#eq-grupo-destino").value).join("/");
  fecharLoteEquip();
  EQ_LISTA.ocupada = true; atualizaBarraEquip();
  focarSelecaoEquip();
  try {
    if (acao === "desfazer") {
      const r = await api.equip_desfazer_importacao(itens[0].origem);
      if (!r?.ok) return toast("Não foi possível desfazer a importação", "erro");
      toast(`${r.removidos} removido(s) · ${r.editados} editado(s) mantido(s)`, r.editados ? "aviso" : "");
    } else {
      let sucesso = 0;
      for (const e of itens) {
        try {
          const ok = acao === "remover" ? await api.equip_remover(e.id)
            : (e.grupo || "") === grupo || (await api.equip_salvar({ ...e, grupo }))?.ok;
          if (ok) sucesso++;
        } catch (_) { /* atualiza a lista e informa quantos itens foram processados */ }
      }
      const resultado = acao === "remover" ? "removidos" : "movidos";
      toast(`${sucesso} de ${itens.length} ${resultado}`, sucesso < itens.length ? "erro" : "");
    }
    await recarregarEquip();
  } catch (_) {
    toast("Não foi possível concluir a ação ou atualizar a lista", "erro");
  } finally {
    EQ_LISTA.ocupada = false; atualizaBarraEquip();
  }
}
function formEquip(e) {
  if (EQ_LISTA.ocupada) return;
  fecharLoteEquip();
  eqEdit = e || {}; $("#eq-form").classList.remove("oculto");
  $("#eq-f-nome").value = eqEdit.nome || ""; $("#eq-f-tipo").value = eqEdit.tipo || "ssh"; $("#eq-f-destino").value = eqEdit.destino || "";
  $("#eq-f-grupo").value = eqEdit.grupo || ""; $("#eq-f-obs").value = eqEdit.obs || ""; $("#eq-f-nome").focus();
}
async function conectarEquip(e) {
  if (!e || $("#modal-bib").classList.contains("oculto")) return;
  let a = A(); if (!a || a.conectado) a = novaAba(e.tipo);
  if (!a) return;
  fecharLoteEquip();
  $("#modal-bib").classList.add("oculto");
  a.tipo = e.tipo; selecionarTipo(e.tipo);
  if (e.tipo === "serial") {
    const [porta, baud] = e.destino.split(":"); await carregarPortas();
    if (![...$("#porta").options].some((o) => o.value === porta)) return toast(`${porta} não está conectada neste computador`, "aviso");
    $("#porta").value = porta; if (baud) $("#baud").value = baud;
  } else if (e.tipo === "ssh") $("#ssh-destino").value = e.destino;
  else if (e.tipo === "web") $("#web-url").value = e.destino;
  api.equip_usado(e.id); toast(`Conectando: ${e.nome}`);
  await conectar(a);
}
function iniciarEquip() {
  $("#btn-equip").onclick = abrirEquip;
  $("#eq-novo").onclick = () => { importarUIModo(null); formEquip(null); };
  $("#eq-ocultar-origem").onchange = desenharBib;
  $("#eq-acoes").querySelectorAll("[data-eq-acao]").forEach((b) => { b.onclick = () => acaoEquip(b.dataset.eqAcao); });
  $("#eq-lote").onsubmit = executarLoteEquip;
  $("#eq-lote-cancelar").onclick = () => { fecharLoteEquip(); focarSelecaoEquip(); };
  $("#eq-lote").onkeydown = (ev) => {
    if (ev.key === "Escape") { ev.stopPropagation(); fecharLoteEquip(); focarSelecaoEquip(); }
  };
  $("#eq-f-cancelar").onclick = () => { $("#eq-form").classList.add("oculto"); focarSelecaoEquip(); };
  $("#eq-f-ok").onclick = async () => {
    if (EQ_LISTA.ocupada) return;
    const it = { ...eqEdit, nome: $("#eq-f-nome").value, tipo: $("#eq-f-tipo").value, destino: $("#eq-f-destino").value.trim(),
                 grupo: $("#eq-f-grupo").value, obs: $("#eq-f-obs").value };
    if (!it.destino && ["ssh", "serial", "web"].includes(it.tipo)) return toast("Informe o destino (IP, usuario@ip, URL ou COM)", "aviso");
    EQ_LISTA.ocupada = true; atualizaBarraEquip();
    $("#eq-f-ok").disabled = true;
    try {
      const r = await api.equip_salvar(it);
      if (r?.ok === false) return toast(r.erro, "erro");
      $("#eq-form").classList.add("oculto");
      await recarregarEquip();
      if (document.activeElement === document.body) focarSelecaoEquip();
    } catch (_) {
      toast("Não foi possível salvar o equipamento ou atualizar a lista", "erro");
    } finally {
      EQ_LISTA.ocupada = false; atualizaBarraEquip();
      $("#eq-f-ok").disabled = false;
    }
  };
  $("#eq-salvar-aba").onclick = () => {
    const a = A(), p = a.params || {};
    const destino = a.tipo === "serial" ? (p.porta ? `${p.porta}:${p.baud || 9600}` : "") : p.destino || "";
    if (!destino) return toast("Conecte a aba primeiro (Serial, SSH ou Web) para salvar", "aviso");
    formEquip({ tipo: a.tipo, destino, nome: a.equip ? `${a.equip}` : a.nome.replace(/^(SSH|Web|Serial)\s*/, "") });
  };
  $("#eq-importar").onclick = async () => {   // planilha CSV / backup JSON (as outras ferramentas têm cartão próprio)
    const r = await api.equip_importar("arquivo");
    if (!r || r.cancelado) return; if (!r.ok) return toast(r.erro, "erro");
    const avisos = (r.avisos || []).join(" · ");
    toast(`Importado: ${r.novos} novo(s), ${r.atualizados} atualizado(s) — total ${r.total}${avisos ? ` · ${avisos}` : ""}`, avisos ? "aviso" : "");
    EQ = await api.equip_listar(); irBib("equipamentos");
  };
  $("#eq-exportar").onclick = async () => {
    const r = await api.equip_exportar(); if (r.cancelado) return;
    toast(r.ok ? `Exportado: ${r.total} equipamento(s) → ${r.caminho.split("\\").pop()}` : r.erro, r.ok ? "" : "erro");
  };
}

// ---------- PDF dentro do app: ver, assinar e datar ----------
let PDF = null;
async function abrirPdf(caminho) {
  const r = await api.pdf_ler(caminho || "");
  if (!r.ok) return toast(r.erro, "erro");
  PDF = r;
  const bin = atob(r.b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  if (abrirPdf.url) URL.revokeObjectURL(abrirPdf.url);
  abrirPdf.url = URL.createObjectURL(new Blob([u8], { type: "application/pdf" }));
  $("#pdf-ver").src = abrirPdf.url + "#view=FitH";
  $("#pdf-tit").textContent = "📄 " + r.nome;
  const livre = r.quadros.find((q) => !q.assinado);
  $("#pdf-quadros").innerHTML = r.quadros.map((q) => `<div class="pdf-q ${q.assinado ? "ok" : ""}">
      ${q.assinado ? "✅" : "⬜"} <b>${esc(q.rotulo)}</b><br><small>${q.assinado ? `assinado por ${esc(q.assinado.nome)} · ${esc(q.assinado.quando)} · documento íntegro (identidade declarada pelo assinante, certificado autoassinado)` : q.invalida ? `⚠ assinatura INVÁLIDA: ${esc(q.invalida.motivo)}` : "aguardando assinatura"}</small></div>`).join("");
  if (livre) $("#pdf-papel").value = livre.papel;
  $("#pdf-assinar").disabled = !livre;
  preencherNomePdf();
  rubricaLimpar();
  clearInterval(abrirPdf.rel); const rel = () => ($("#pdf-agora").textContent = new Date().toLocaleString("pt-BR"));
  rel(); abrirPdf.rel = setInterval(rel, 1000);
  abrirModal("#modal-pdf");
}
function preencherNomePdf() {
  if (!PDF) return;
  $("#pdf-nome").value = $("#pdf-papel").value === "tecnico" ? PDF.nome_tecnico || "" : PDF.responsavel || "";
}
function rubricaLimpar() { const c = $("#pdf-rub"); c.getContext("2d").clearRect(0, 0, c.width, c.height); c.dataset.usada = ""; }
function iniciarRubrica() {
  const c = $("#pdf-rub"), g = c.getContext("2d");
  let des = false;
  const pt = (e) => { const b = c.getBoundingClientRect(); return [(e.clientX - b.left) * c.width / b.width, (e.clientY - b.top) * c.height / b.height]; };
  c.addEventListener("pointerdown", (e) => { des = true; c.setPointerCapture(e.pointerId); g.beginPath(); g.moveTo(...pt(e)); });
  c.addEventListener("pointermove", (e) => {
    if (!des) return; g.lineWidth = 4; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#1a2f8a"; g.lineTo(...pt(e)); g.stroke();
    c.dataset.usada = "1";
  });
  ["pointerup", "pointercancel"].forEach((ev) => c.addEventListener(ev, () => (des = false)));
  $("#pdf-rub-limpar").onclick = rubricaLimpar;
  $("#pdf-papel").onchange = preencherNomePdf;
  $("#pdf-fora").onclick = () => PDF && api.abrir_arquivo(PDF.caminho);
  $("#pdf-pasta").onclick = () => PDF && api.abrir_arquivo(PDF.caminho.replace(/\\[^\\]+$/, ""));
  $("#pdf-wa").onclick = () => PDF && api.wa_enviar_arquivo(PDF.caminho, `Relatório de atendimento — ${PDF.nome}`).then((x) =>
    x.ok ? toast(`Relatório na fila de envio para ${x.conversa} (${x.posicao}º)`) : toast(x.erro, "erro"));
  $("#pdf-assinar").onclick = async () => {
    const nome = $("#pdf-nome").value.trim();
    if (!nome) { $("#pdf-nome").focus(); return toast("Informe o nome de quem assina", "aviso"); }
    $("#pdf-assinar").disabled = true; toast("Assinando…");
    const r = await api.pdf_assinar(PDF.caminho, $("#pdf-papel").value, nome, c.dataset.usada ? c.toDataURL("image/png") : null,
                                    $("#pdf-local").value.trim());
    if (!r.ok) { $("#pdf-assinar").disabled = false; return toast(r.erro, "erro"); }
    toast(`✅ ${r.rotulo}: assinado e datado — ${r.pdf.split("\\").pop()}`);
    abrirPdf(r.pdf);
  };
}

// ================= player de gravação =================
let PL = null;
async function tocarGravacao(caminho, titulo) {
  const g = await api.ler_gravacao(caminho);
  if (!g.ok) return toast(g.erro, "erro");
  if (PL) { clearTimeout(PL.tm); PL.term.dispose(); }
  $("#pl-term").innerHTML = "";
  // fonte calculada para o terminal 100x30 caber inteiro na janela (sem barra de rolagem)
  const alt = innerHeight * 0.94 - 130, larg = Math.min(innerWidth * 0.96, 1040) - 40;
  const fs = Math.max(9, Math.min(14, Math.floor(Math.min(alt / (30 * 1.2), larg / (100 * 0.62)))));
  const tamanho = (cols, rows) => [
    Number.isInteger(cols) && cols >= 2 && cols <= 100 ? cols : 100,
    Number.isInteger(rows) && rows >= 1 && rows <= 30 ? rows : 30
  ];
  const [cols, rows] = tamanho(g.cols, g.rows);
  const term = new Terminal({ cols, rows, fontFamily: TEMAS[temaAtual].fonte + ", monospace", fontSize: fs, theme: TEMA, disableStdin: true });
  term.open($("#pl-term"));
  const aplicar = ([, tipo, dados]) => {
    if (tipo === "o") term.write(dados);
    if (tipo === "r" && /^\d+x\d+$/.test(dados)) {
      const grade = tamanho(...dados.split("x").map(Number));
      term.write("", () => term.resize(...grade));
    }
  };
  const reiniciar = () => term.write("", () => { term.reset(); term.resize(cols, rows); });
  // "Pular pausas": cada silêncio vira no máx. 2 s (uma sessão de 3 min parada não obriga a assistir 3 min)
  const limite = +$("#pl-pausa").value || Infinity, real = g.eventos.length ? g.eventos[g.eventos.length - 1][0] : 0;
  let t = 0, ant = 0; const ev = g.eventos.map((e) => { t += Math.min(limite, Math.max(0, e[0] - ant)); ant = e[0]; return [t, e[1], e[2]]; });
  PL = { term, ev, i: 0, pos: 0, total: ev.length ? ev[ev.length - 1][0] : 0, tocando: true, tm: null };
  const mm = (s) => `${Math.floor(s / 60)}min ${pad2(Math.floor(s % 60))}s`;
  $("#pl-tit").textContent = `▶ ${titulo || g.titulo} — duração real ${mm(real)}${limite !== Infinity && real - PL.total > 5 ? ` (pausas encurtadas: assiste em ${mm(PL.total)})` : ""}`;
  $("#pl-pausa").onchange = () => tocarGravacao(caminho, titulo);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const atual = () => { $("#pl-pos").value = PL.total ? Math.round((PL.pos / PL.total) * 1000) : 0; $("#pl-tempo").textContent = `${mmss(PL.pos)} / ${mmss(PL.total)}`; };
  const passo = () => {
    if (!PL.tocando) return;
    if (PL.i >= PL.ev.length) { PL.tocando = false; $("#pl-play").textContent = "▶"; return; }
    const ev = PL.ev[PL.i++], tt = ev[0]; aplicar(ev); PL.pos = tt; atual();
    const prox = PL.i < PL.ev.length ? (PL.ev[PL.i][0] - tt) * 1000 / +$("#pl-vel").value : 0;
    PL.tm = setTimeout(passo, Math.max(0, prox));
  };
  $("#pl-play").textContent = "⏸";
  $("#pl-play").onclick = () => { PL.tocando = !PL.tocando; $("#pl-play").textContent = PL.tocando ? "⏸" : "▶"; if (PL.tocando) { if (PL.i >= PL.ev.length) { PL.i = 0; reiniciar(); } passo(); } };
  $("#pl-pos").oninput = (e) => {   // pular para um ponto: redesenha tudo até lá
    clearTimeout(PL.tm); const alvo = (e.target.value / 1000) * PL.total;
    reiniciar(); let i = 0; while (i < PL.ev.length && PL.ev[i][0] <= alvo) aplicar(PL.ev[i++]);
    PL.i = i; PL.pos = alvo; atual(); if (PL.tocando) passo();
  };
  document.querySelector("#modal-player [data-fecha]").onclick = (e) => { PL.tocando = false; clearTimeout(PL.tm); fecharModal(e.target); };
  abrirModal("#modal-player"); passo();
}

// ================= informações (botões i) =================
const INFO = {
  whatsapp: ["Como conectar o WhatsApp", `
    <ol><li>Clique em <b>Abrir WhatsApp</b> — abre uma janela do navegador só do app (Chrome ou Edge).</li>
    <li><b>1ª vez:</b> no celular, WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e leia o QR code.
      Nas próximas vezes o app <b>abre sozinho, minimizado e logado</b> ao iniciar.</li>
    <li>Nessa janela, <b>clique na conversa ou grupo</b> que vai receber as evidências.</li>
    <li>Volte aqui e clique em <b>Conectar conversa</b> — o nome aparece com a bolinha verde.</li>
    <li>Pronto: <b>Enviar evidência</b> (<kbd>Ctrl+Alt+E</kbd>) salva, copia e envia a foto com a legenda.</li></ol>
    <p class="nota">Deixe a janela do WhatsApp aberta: ela abre pequena e fica por trás do app, e só vem para a frente quando você precisa escolher a conversa. Antes de anexar e antes de enviar o app confere
    o nome da conversa — se não bater, cancela. Não afeta o WhatsApp do seu Chrome/celular (é só mais um aparelho conectado).</p>
    <p class="nota"><b>Por que não usa o WhatsApp que já está aberto no meu Chrome?</b> O login do WhatsApp Web fica preso ao perfil
    do navegador e não pode ser copiado nem controlado com o Chrome aberto. Por isso o app tem o próprio “aparelho conectado”:
    você lê o QR code <b>uma única vez</b> e pronto.</p>`],
  evidencia: ["Evidências", `
    <ul><li><b>Limpar</b> <kbd>Ctrl+Alt+L</kbd>: limpa a tela mantendo o prompt — o print mostra só o próximo comando.</li>
    <li><b>Salvar</b> <kbd>Ctrl+Alt+P</kbd>: gera o print padronizado, salva na pasta do dia e copia (Ctrl+V onde quiser).</li>
    <li><b>Enviar evidência</b> <kbd>Ctrl+Alt+E</kbd>: faz o mesmo que Salvar <b>e</b> envia para a conversa conectada.</li></ul>
    <p>Saída longa com <b>---- More ----</b>: capture, aperte ESPAÇO e capture de novo (vira “parte 2”, “parte 3”…).
    Rolar o terminal para cima e capturar pega a tela que está visível.</p>
    <p><b>Padrão de auditoria</b> (ISO/IEC 27037, ISO 27001 A.5.28, ITIL): cada evidência leva <b>ID único</b>
    (ex.: BB-20261111-12), data/hora <b>com fuso</b>, <b>chamado/mudança</b>, <b>técnico</b>, <b>origem</b> da conexão e
    <b>equipamento</b> (modelo e nº de série reconhecidos <b>sozinhos</b> na tela — ex.: display version / esn, show version,
    Service Tag do iDRAC) e o <b>SHA-256 completo</b>. Tudo também vai para o <b>manifesto de custódia</b> (Evidencias\\manifesto.jsonl).</p>
    <p><b>🧹 auto</b>: limpa a tela depois de cada evidência (pronta para o próximo comando). <b>⏱ manter ativa</b>: evita que a
    sessão caia por inatividade (SSH, serial e páginas web) — sem executar nenhum comando.</p>
    <p><b>⚡ Skills</b>: procedimentos de coleta por fabricante. <b>📄 Relatório</b>: PDF do atendimento com capa, resumo,
    evidências, logs, hashes e aceite — abre <b>dentro do app</b> para ver e <b>✍ assinar e datar</b>.</p>
    <p class="nota">Vale sempre para a <b>aba ativa</b>. Informe o nº do chamado em <b>✎</b> no cartão Atendimento.</p>`],
  atendimento: ["Cliente e pasta do atendimento", `
    <p>Tudo é criado pelo app — não precisa criar pasta à mão:</p>
    <ul><li><b>Cliente</b>: escolha na lista. Cliente novo? <b>＋</b> → sigla e nome → cria <b>[SIGLA] Nome</b> na pasta raiz.</li>
    <li><b>Visita do dia</b>: criada sozinha no 1º print/conexão do dia (<b>AAAA-MM-DD - Atendimento</b>, com <b>Evidencias</b> e <b>Logs</b>).
      Clique em <b>✎ dar nome à visita</b> para virar, por ex., <b>2026-11-20 - Troca SW agência Centro</b>.</li>
    <li>A data é conferida <b>na hora de cada print</b>: virou o dia, vai para a pasta do novo dia.</li>
    <li>Numeração: continua do maior número da visita (apagou a última? o número é reaproveitado).</li></ul>
    <p class="nota">⚙ = pasta raiz dos atendimentos (configurada uma vez; hoje: “03 - Atendimentos”).</p>`],
  roteiro: ["Skills de coleta e de configuração", `
    <ul><li>Pesquise ou filtre por fabricante, escolha a Skill (Huawei, Cisco, HPE, Fortinet, Juniper, Aruba, Dell, MikroTik, ESXi, Windows, Linux) e clique em <b>Executar</b>.</li>
    <li>O app digita cada comando na aba ativa, espera a saída, <b>tira a evidência de cada tela</b> e avança o
      <b>---- More ----</b> sozinho (com limite de páginas por comando).</li>
    <li>Barra de progresso no terminal, com <b>■ Parar</b> a qualquer momento.</li>
    <li>Roteiros <b>somente leitura</b>: só aceitam comandos de consulta (display, show, get…). Nada de configuração.</li>
    <li>Skills <b>⚙ de configuração</b> (ALTERAM o equipamento): o app faz as <b>perguntas</b> (hostname, IP, VLAN, usuário…), valida as
      respostas, mostra a <b>prévia</b> dos comandos já preenchidos com caixa por comando e só aplica depois de você marcar
      “Revisei a prévia e autorizo” e confirmar. Senhas aparecem como <b>********</b> na prévia, nas evidências e no log; podem vir do <b>cofre</b>.
      <b>📋 Copiar script</b> copia o texto final para colar à mão.</li>
    <li>Filtre por <b>finalidade</b> (inventário, saúde, VLAN, SSH, zoning…) para achar a Skill pela necessidade.</li></ul>
    <p class="nota">Faça o login no equipamento antes. Automações próprias: arquivos .json na pasta <b>roteiros</b> do app
      (campos <code>tipo_skill</code>, <code>finalidade</code>, <code>variaveis</code> e marcadores <code>{{id}}</code> nos comandos).</p>`],
  ultimas: ["Últimas evidências", `<p>Evidências desta execução do app: número, comando e se foi <b>salva</b>, <b>enviada</b> ou
    <b>não enviada</b>. Passe o mouse para ver a aba e o arquivo.</p><p class="nota">Sessões anteriores: botão <b>🕘 Histórico</b>.</p>`],
  abas: ["Abas e conexões", `
    <ul><li><b>＋</b> ou <kbd>Ctrl+Alt+T</kbd>: nova aba. Escolha o tipo no topo (Serial, PowerShell, CMD, SSH) e <b>Conectar</b>.</li>
    <li><kbd>Ctrl+Alt+1…8</kbd>: troca de aba. Aba amarela = está pedindo login em segundo plano.</li>
    <li><b>Serial</b>: porta COM do cabo console + velocidade (Huawei = 9600). <b>SSH</b>: <b>usuario@ip</b>.</li>
    <li><b>Azure</b> / <b>GCP</b>: abre o terminal da nuvem já logado — se o CLI não estiver instalado, o app instala sozinho.</li>
    <li><b>🌐 Web</b>: iDRAC, iLO, iBMC, firewalls — o navegador e o <b>console virtual</b> (HTML5 ou Java) abrem <b>dentro</b> do app,
      com <b>⤢ Tela cheia</b> e <b>↩ Voltar ao normal</b>.</li>
    <li><b>📚 Equipamentos</b>: selecione uma conexão salva e use a barra de ações, Enter ou duplo clique para conectar. Importa CSV/JSON e sessões do PuTTY, exporta CSV.</li>
    <li>O relógio na aba mostra há quanto tempo a sessão está aberta. <kbd>Enter</kbd> no campo de endereço já conecta.</li>
    <li><b>Barra da guia</b> (à direita das guias) — vale só para a guia ativa: <b>📡</b> compartilhar ao vivo · <b>⏺</b> gravar/parar ·
      <b>⏱</b> manter ativa · <b>🧹</b> limpar a tela após cada evidência · <b>🎨</b> tema · <b>⚡ Skills</b>.</li>
    <li><b>Barra de sistema</b> (no alto) — vale para o app inteiro: Sessões (🔗 Entrar, 📱 Celular) · Biblioteca (🗂, ⏺ Gravações) ·
      Ferramentas (📚 Equipamentos, 🔑 Cofre) · Sistema (🪪 Licença, versão/atualização).</li>
    <li>Selecionar texto = copiar · botão direito = colar.</li></ul>
    <p><b>📡 Compartilhar</b> (ao vivo): gera um código <b>ABCD-EFGH-JKLM</b>. O colega abre o DASSH Code dele →
      <b>🔗 Entrar</b> → digita o código → você <b>aprova</b>. Ele vê tudo ao vivo; pode <b>pedir o controle</b> para digitar.
      <span style="color:var(--participante-ativo)">● verde = ATIVO (digitando)</span> · <span style="color:var(--participante-passivo)">● amarelo = observando</span>.
      Você retoma o controle ou remove alguém a qualquer momento. <b>✉ Convidar</b> manda pelo WhatsApp (para qualquer contato ou
      grupo) a mensagem pronta com o link de download e o código.</p>
    <p class="nota">Ponta a ponta cifrado (AES-256 + X25519): só quem você aprova consegue ler. Se o cabo USB-serial mandar lixo,
      o app reabre a porta sozinho.</p>`],
  cofre: ["Cofre de credenciais", `
    <ul><li>Cadastre <b>nome</b>, <b>usuário</b>, <b>senha</b> e <b>vale para</b> (ex.: COM8, 10.0.0.1).</li>
    <li>Quando o terminal pedir <b>Username/login</b>, aparece a barra <b>“Pediu usuário”</b>: escolha a credencial — o usuário
      é digitado e a senha é completada sozinha no <b>Password</b>.</li>
    <li>Se pedir só senha, a barra oferece a senha.</li>
    <li><b>PIN do cofre</b> (criado no 1º acesso), além da senha da conta: pedido ao abrir o cofre. Ele tranca sozinho após alguns
      minutos sem uso, ao trocar de seção ou fechar a Biblioteca. 5 erros seguidos bloqueiam por 30 s (o tempo dobra a cada novo erro).</li></ul>
    <p class="nota">Senhas cifradas pelo Windows (DPAPI) e, com a conta aberta, também pela chave da conta. Nunca aparecem na tela,
    em logs ou evidências.</p>`],
  historico: ["Sessões gravadas", `<p>Toda conexão é <b>gravada automaticamente</b> (selo <b style="color:var(--gravacao)">REC</b> na aba).</p>
    <ul><li><b>▶ Assistir a última sessão</b>: reproduz a mais recente.</li>
    <li><b>▶ Gravação</b> em cada linha: reproduz aquela sessão (1x/2x/4x/10x, barra para pular).</li>
    <li>Clicar no <b>REC</b> da aba: assiste a sessão atual até o momento.</li>
    <li><b>Log</b>: o texto completo da sessão · <b>Reconectar</b>: abre de novo a mesma conexão.</li></ul>`],
};
function abrirInfo(btn) {
  const pop = $("#popover"), [tit, corpo] = INFO[btn.dataset.info] || ["", ""];
  if (btn.classList.contains("aberto")) return fecharInfo();
  fecharInfo();
  $("#pop-tit").innerHTML = `<span class="info aberto">i</span>${tit}`; $("#pop-corpo").innerHTML = corpo;
  pop.classList.remove("oculto"); btn.classList.add("aberto");
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 8;
  if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);  // sem espaço embaixo: abre para cima
  pop.style.left = x + "px"; pop.style.top = y + "px";
}
function fecharInfo() {
  $("#popover").classList.add("oculto");
  document.querySelectorAll(".info.aberto").forEach((b) => b.classList.remove("aberto"));
}

// ================= barra de SISTEMA (plataforma) =================
// Sessões · Biblioteca · Ferramentas · Sistema (Conta, Armazenamento, Licença, Versão). Nunca passa da largura: se não couber,
// some primeiro o nome dos grupos, depois o texto dos botões (fica só o ícone, com o nome no title); no celular vira menu ☰.
const NA_WEB = !!document.querySelector('script[src*="ponte-agente"]');   // página web (Conector) x app Windows (pywebview)
let VERSAO_INFO = null;
function desenharVersao() {
  const b = $("#btn-versao"), t = $("#versao-txt"); if (!b || !t) return;
  const v = VERSAO_INFO || {}, atual = v.atual || VERSAO_INFO_ATUAL || "";
  const quem = NA_WEB ? "DASSH Conector (a página web se atualiza sozinha)" : "DASSH Code";
  b.classList.toggle("nova", !!v.tem);
  t.textContent = v.tem ? ` ${v.nova} disponível` : ` v${atual || "?"}`;
  b.firstChild.textContent = v.tem ? "⬆" : "ⓥ";
  b.title = v.tem ? `⬆ Atualização disponível: ${quem} ${v.nova} (você usa a ${atual}) — clique para ${NA_WEB ? "baixar" : "baixar e atualizar"}`
    : `ⓥ ${quem} ${atual}${v.ok ? " — está na versão mais recente" : ""}. Clique para verificar se há atualização`;
  ajustarSistema();
}
let VERSAO_INFO_ATUAL = "";
async function verificarVersao() {
  const v = await Promise.resolve().then(() => api.verificar_atualizacao()).catch(() => null);
  if (v && v.ok) VERSAO_INFO = v;
  desenharVersao();
  return v;
}
function avisarVersao(v) {
  if (NA_WEB)
    pedido(`⬆️ <b>DASSH Conector ${esc(v.nova)}</b> disponível (este computador usa a ${esc(v.atual)}). A página web já está sempre na versão nova; ` +
      `atualize o Conector para ter as mesmas funções — evidências, cofre e configurações são mantidos.`, "Baixar o Conector", "Depois",
      (ok) => ok && api.abrir_link(v.url), "atualizacao");
  else
    pedido(`⬆️ <b>DASSH Code ${esc(v.nova)}</b> disponível (você usa a ${esc(v.atual)}). Baixe e instale por cima — evidências, cofre e configurações são mantidos.`,
      api.atualizar_app ? "Baixar e atualizar" : "Baixar agora", "Depois",
      (ok) => ok && (typeof api.atualizar_app === "function" && !NA_WEB ? api.atualizar_app(v.url) : api.abrir_link(v.url)), "atualizacao");
}
async function abrirVersao() {
  toast("Verificando atualização…");
  const v = await verificarVersao();
  if (!v || !v.ok) return toast(`Versão ${VERSAO_INFO_ATUAL || "?"} — não consegui verificar agora (sem internet?)`, "aviso");
  if (v.tem) return avisarVersao(v);
  toast(`✔ ${NA_WEB ? "Conector" : "DASSH Code"} ${v.atual}: é a versão mais recente`);
}
// espaços reservados: aparecem só quando a função existe (outro módulo pode defini-las depois do app.js)
function ligarReservados() {
  [["#btn-conta", "abrirConta"], ["#btn-armazenamento", "abrirArmazenamento"]].forEach(([sel, fn]) => {
    const b = $(sel), existe = typeof window[fn] === "function" || (fn === "abrirConta" ? typeof abrirConta === "function" : typeof abrirArmazenamento === "function");
    if (!b) return;
    b.classList.toggle("oculto", !existe);
    b.onclick = existe ? () => (window[fn] || (fn === "abrirConta" ? abrirConta : abrirArmazenamento))() : null;
  });
  ajustarSistema();
}
function ajustarSistema() {
  const s = $("#sistema"), it = $("#sis-itens"); if (!s || !it) return;
  if (s.classList.contains("celular")) return;
  s.classList.remove("sem-grupo", "so-icone", "sem-marca");
  const cabe = () => it.scrollWidth <= it.clientWidth + 1;
  if (!cabe()) s.classList.add("sem-grupo");
  if (!cabe()) s.classList.add("so-icone");
  if (!cabe()) s.classList.add("sem-marca");
}
function iniciarSistema(ini) {
  VERSAO_INFO_ATUAL = (ini && ini.versao) || "";
  desenharVersao();
  $("#btn-versao").onclick = abrirVersao;
  const menu = $("#sis-menu"), s = $("#sistema");
  const fechar = () => { s.classList.remove("aberto"); menu.setAttribute("aria-expanded", "false"); };
  menu.onclick = (e) => { e.stopPropagation(); const ab = !s.classList.contains("aberto"); s.classList.toggle("aberto", ab); menu.setAttribute("aria-expanded", String(ab)); };
  $("#sis-itens").addEventListener("click", (e) => { if (e.target.closest("button") && s.classList.contains("aberto")) fechar(); });
  document.addEventListener("mousedown", (e) => { if (!e.target.closest("#sistema")) fechar(); });
  const mq = matchMedia("(max-width: 900px)");
  const modo = () => { s.classList.toggle("celular", mq.matches); if (!mq.matches) fechar(); ajustarSistema(); };
  (mq.addEventListener ? mq.addEventListener("change", modo) : mq.addListener(modo)); modo();
  addEventListener("resize", ajustarSistema);
  ligarReservados(); setTimeout(ligarReservados, 1500); setTimeout(ligarReservados, 5000);
}

// ================= atalhos =================
function atalho(e) {
  if (e.type !== "keydown" || !e.ctrlKey || !e.altKey) return false;
  // a MESMA tecla passa pelo terminal (xterm) e depois sobe até o documento: só a 1ª age (antes saíam 2 prints por atalho)
  if (e.__dasshAtalho) return true;
  e.__dasshAtalho = true;
  const k = e.key.toLowerCase();
  if (k === "d" && A()) { dividirGuias(A()); return true; }
  if (k === "l") { limpar(); return true; }
  if (k === "p") { evidencia(false); return true; }
  if (k === "e") { evidencia(true); return true; }
  if (k === "t") { novaAba(); return true; }
  if (/^[1-8]$/.test(k)) { const id = ordemAbas()[+k - 1]; if (id) ativar(id); return true; }
  return false;
}

// ================= início =================
window.addEventListener("pywebviewready", async () => {
  if (!CONTA.liberada) return;   // a porta da conta (mais abaixo) libera e dispara de novo; no window os ouvintes rodam na ordem de registro
  api = comAba(window.pywebview.api);   // chamadas do atendimento/destino levam o sid da aba ativa
  const ini = await api.inicial();
  preferenciasLimpeza = { ...ini.cfg };
  LIMPAR_APOS = ini.cfg.limpar_apos !== false;
  NOME = ini.cfg.nome || ""; MODO_TESTE = ini.teste || "";
  cofre = [];   // a lista do cofre só vem com o PIN do cofre (cofre_pin_abrir)
  await carregarPortas(ini.portas);
  $("#baud").value = String(ini.cfg.baud || 9600);
  $("#ssh-destino").value = ini.cfg.ssh || "";
  $("#web-url").value = ini.cfg.web || "";
  aplicarTema(ini.cfg.tema || "dassh");
  desenharClientes(ini.clientes);
  atualizarEvid(ini.evid);
  atualizarWa({ conversa: ini.cfg.conversa });
  onFila(await api.fila_status());   // envios que ficaram pendentes da última vez
  restaurarGuiasFixadas(ini.cfg.guias_fixadas);
  if (!abas.size) novaAba("serial");
  setTimeout(async () => {   // versão nova publicada? (GET anônimo ao GitHub; nada do usuário é enviado) — app E web
    const v = await verificarVersao();
    if (v && v.ok && v.tem) avisarVersao(v);
  }, 6000);
  if (ini.conflito_atalhos)
    toast("A janelinha antiga “Evidências PuTTY” está aberta e captura Ctrl+Alt+L/P. Feche-a ou use os botões.", "aviso");

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharInfo(); if (atalho(e)) e.preventDefault(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-info]");
    if (b) { e.stopPropagation(); abrirInfo(b); return; }
    if (!e.target.closest("#popover")) fecharInfo();
  });
  // tipos em menus por assunto: Equipamentos (precisam de destino) · Shell · Nuvem · IA. Os que não têm destino abrem NA HORA ao clicar.
  // (clique nos tipos de conexão: ligado no carregamento, ver o fim do arquivo)
  $("#porta").addEventListener("mousedown", () => carregarPortas());
  $("#atualizar-portas").onclick = () => carregarPortas();
  $("#diag-cabo").onclick = diagnosticarCabo;
  $("#liberar-porta").onclick = () => liberarPorta();
  // barra DA GUIA: tudo age só na guia ativa (⏱ e REC também ficam no botão de cada guia)
  GRAVAR = ini.cfg.gravar_auto !== false;
  $("#tg-limpar").onclick = alternarLimpar;
  $("#tg-gravar").onclick = alternarGravar;
  $("#tg-ativa").onclick = () => alternarAtiva(A());
  desenharGuia(A());
  iniciarSistema(ini);
  // Enter no endereço = Conectar
  ["#web-url", "#ssh-destino"].forEach((s) => $(s).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); conectar(); } }));
  // cronômetro de cada aba conectada
  setInterval(() => abas.forEach((a) => {
    const el = a.btn && a.btn.querySelector(".tempo"); if (!el) return;
    if (!a.conectado || !a.inicio) return (el.textContent = "");
    const s = Math.floor((Date.now() - a.inicio) / 1000), h = Math.floor(s / 3600);
    el.textContent = (h ? h + ":" : "") + pad2(Math.floor((s % 3600) / 60)) + ":" + pad2(s % 60);
  }), 1000);
  document.querySelectorAll("[data-rede]").forEach((b) => (b.onclick = () => abrirRede(b.dataset.rede, null)));
  if ((ini.rede_temp || []).length) setTimeout(oferecerRemoverRede, 1500);   // sobrou IP temporário de outra vez
  $("#cabo-de-novo").onclick = diagnosticarCabo;
  $("#conectar").onclick = () => conectar();
  $("#nova-aba").onclick = () => novaAba();
  $("#limpar").onclick = limpar;
  $("#salvar").onclick = () => evidencia(false);
  $("#enviar").onclick = () => evidencia(true);
  $("#abrir-pasta").onclick = () => api.abrir_pasta();
  $("#wa-fila").onclick = abrirFila;
  $("#wa-andamento").onclick = abrirFila;
  $("#hist-ultima").onclick = async () => {
    const h = (await api.historico()).find((r) => r.grav_existe);
    if (!h) return toast("Nenhuma sessão gravada ainda", "aviso");
    $("#modal-hist").classList.add("oculto"); tocarGravacao(h.gravacao, `${h.nome} — ${h.inicio.slice(8, 10)}/${h.inicio.slice(5, 7)} ${h.inicio.slice(11, 16)}`);
  };
  $("#btn-roteiro").onclick = abrirRoteiros;
  $("#btn-relatorio").onclick = async () => {   // já tem relatório? oferece ver/assinar o último ou gerar outro
    const ult = await api.pdf_ultimo();
    if (!ult) return gerarRelatorio();
    pedido(`📄 <b>Relatório do atendimento</b><br><small>Último: ${esc(ult.split("\\").pop())}</small>`, "Gerar novo",
      "Ver / assinar o último", (novo) => (novo ? gerarRelatorio() : abrirPdf(ult)));
  };
  iniciarRubrica(); iniciarEquip(); iniciarLogo();
  $("#btn-todas-ev").onclick = () => abrirBiblioteca("evidencias");
  $("#lista-abas").onclick = listaAbas;
  $("#abas-sessao").addEventListener("wheel", (e) => { if (e.deltaY) { e.preventDefault(); $("#abas-sessao").scrollLeft += e.deltaY; } }, { passive: false });
  new ResizeObserver(ajustarDepois).observe($("#terminal")); addEventListener("resize", ajustarDepois);
  setInterval(ajustarFonte, 2000);   // segurança: troca de tema/fonte
  $("#rot-executar").onclick = () => {
    if (!rotSel) return;
    if (guiaDasSkills && guiaDasSkills !== A()) return toast("Volte à guia em que abriu estas Skills.", "aviso");
    const marcados = [...$("#rot-cmds").querySelectorAll("[data-ci]")].filter((c) => c.checked).map((c) => +c.dataset.ci);
    if (!marcados.length) return toast("Marque pelo menos um comando da Skill", "aviso");
    if (ehConfig(rotSel)) {   // configuração: só depois da prévia + "revisei e autorizo" (e ainda confirma no executar)
      if (!skillCfg || skillCfg.fase !== "previa") return toast("Responda às perguntas e veja a prévia antes", "aviso");
      if (!$("#rot-ciente").checked) return toast("Marque “Revisei a prévia e autorizo” para aplicar", "aviso");
      $("#modal-roteiro").classList.add("oculto");
      return executarRoteiro({ ...rotSel, comandos: skillCfg.cmds.filter((c) => marcados.includes(c.i)) }, $("#rot-enviar").checked);
    }
    $("#modal-roteiro").classList.add("oculto");
    executarRoteiro({ ...rotSel, comandos: rotSel.comandos.filter((_, i) => marcados.includes(i)) }, $("#rot-enviar").checked);   // só os marcados
  };
  $("#rot-previa").onclick = () => rotSel && skillCfg && gerarPreviaSkill(rotSel);
  $("#rot-voltar").onclick = () => rotSel && skillCfg && desenharFormSkill(rotSel);
  $("#rot-copiar").onclick = copiarScriptSkill;
  $("#rot-ciente").onchange = desenharSelecaoSkill;
  $("#btn-compartilhar").onclick = () => compartilhar();
  $("#btn-entrar").onclick = () => entrarSessao();
  iniciarCelular();
  $("#btn-tema").onclick = (e) => { e.stopPropagation(); abrirTemas(); };
  document.addEventListener("mousedown", (e) => { if (!e.target.closest("#tema-pop, #btn-tema")) $("#tema-pop").classList.add("oculto"); });
  $("#cliente-sel").onchange = async (e) => {
    const r = await api.usar_cliente(e.target.value);
    if (!r.ok) return toast(r.erro, "erro");
    atualizarEvid(r.evid); toast("Cliente: " + r.atual);
  };
  $("#novo-cliente").onclick = novoCliente;
  $("#renomear-visita").onclick = renomearVisita; $("#nova-visita").onclick = novaVisita; $("#importar-arquivos").onclick = async () => { const r = await api.importar_arquivos(); if (r.cancelado) return; toast(r.ok ? `📥 ${r.arquivos} arquivo(s) importado(s) para o atendimento — entram no relatório com SHA-256` : r.erro, r.ok ? "" : "erro"); };
  $("#trocar-raiz").onclick = async () => { const c = await api.escolher_raiz(); desenharClientes(c); toast("Pasta raiz: " + c.raiz); };
  $("#btn-historico").onclick = () => abrirBiblioteca("gravacoes");
  $("#btn-biblioteca").onclick = () => abrirBiblioteca("sessoes");
  $("#btn-licenca").onclick = abrirLicenca;
  $("#btn-cofre").onclick = abrirCofre;
  $("#sug-fechar").onclick = () => { const a = A(); if (a) esconderSugestao(a); };
  document.querySelectorAll("[data-fecha]").forEach((b) => (b.onclick = () => fecharModal(b)));
  document.querySelectorAll(".modal").forEach((m) => m.addEventListener("mousedown", (e) => { if (e.target === m) m.classList.add("oculto"); }));
  $("#cf-limpar").onclick = limparFormCofre;
  $("#cf-nova").onclick = () => formCofre(null);
  $("#cf-trancar").onclick = async () => { await cofreTrancar(); toast("🔒 Cofre trancado"); desenharBib(); };
  $("#cf-trocar-pin").onclick = async () => { BIB.pinEst = await api.cofre_pin_estado(COFRE.token); BIB.pinModo = "trocar"; limparFormCofre(); desenharBib(); };
  $("#cofre-form").onsubmit = async (e) => {
    e.preventDefault();
    const r = await cofreChamar("cofre_salvar", { id: $("#cf-id").value || null, nome: $("#cf-nome").value, usuario: $("#cf-usuario").value,
                                                  senha: $("#cf-senha").value, alvo: $("#cf-alvo").value });
    if (!r.ok) { toast(r.erro, "erro"); if (r.trancado) desenharBib(); return; }
    limparFormCofre(); desenharBib(); toast("Credencial salva no cofre");
    const a = A(); if (a && a.sugestao) mostrarSugestao(a, a.sugestao);
  };
  $("#wa-abrir").onclick = async () => {
    toast("Abrindo o WhatsApp Web…");
    const r = await api.wa_abrir();
    if (!r.ok) return toast(r.erro, "erro");
    atualizarWa(r); if (!r.logado) toast("Leia o QR code no WhatsApp (só na primeira vez)", "aviso");
  };
  $("#wa-conectar").onclick = async () => {
    const r = await api.wa_usar_conversa();
    if (!r.ok) return toast(r.erro, "erro");
    atualizarWa(await api.wa_status()); toast("Conversa conectada: " + r.conversa);
  };
  setInterval(async () => { atualizarWa(await api.wa_status()); atualizarEvid(await api.evid_status()); }, 8000);
  // vigia as portas COM: cabo conectado/desconectado aparece sozinho (e o cabo console novo já fica selecionado)
  let assinaturaPortas = JSON.stringify(ini.portas.map((p) => p.porta));
  setInterval(async () => {
    const lista = await api.portas(), sig = JSON.stringify(lista.map((p) => p.porta));
    if (sig === assinaturaPortas) return;
    const antes = JSON.parse(assinaturaPortas); assinaturaPortas = sig;
    const nova = lista.find((p) => !antes.includes(p.porta));
    await carregarPortas(lista);
    if (nova) {
      const a = A();
      if (a && !a.conectado && a.tipo === "serial") $("#porta").value = nova.porta;
      toast(`Porta detectada: ${nova.porta} — ${nova.descricao}`);
    } else toast("Uma porta COM foi desconectada", "aviso");
  }, 3000);
  const sp = $("#splash"); sp.classList.add("sai"); setTimeout(() => sp.remove(), 300);   // pronto: some a abertura
  digitarMarca();
  if (!ini.teste) setTimeout(async () => {   // WhatsApp já logado antes: abre sozinho, minimizado (fila funciona sem cliques)
    const w = await api.wa_auto();
    if (w.ok) { atualizarWa(await api.wa_status()); if (w.logado) toast("WhatsApp pronto (aberto minimizado)"); }
  }, 2500);
  if (ini.teste === "1") autoteste();
  else if (ini.teste === "auditoria") testeAuditoria();
  else if (ini.teste === "visual") testeVisual();
  else if (ini.teste === "fila") testeFila();
  else if (ini.teste === "web") testeWeb();
  else if (ini.teste === "pdf") testePdf();
  else if (ini.teste === "convite") testeConvite();
  else if (ini.teste === "java") testeJava();
  else if (ini.teste === "layout") testeLayout();
  else if (ini.teste === "demo") (async () => { const e = (ms) => new Promise((r) => setTimeout(r, ms));
    await e(800); demoIniciar(A()); for (const s of [6, 14, 24, 36]) { await e(s === 6 ? 6000 : (s - 6) * 400); api.teste_fim("DEMO " + s); }
    const n = document.querySelectorAll("#historico li.ev-item").length; evidencia(false); await e(800);
    api.teste_fim("SEM_EVIDENCIA " + (document.querySelectorAll("#historico li.ev-item").length === n)); await e(500); api.teste_fim("TEMAS"); })();
  else if (ini.teste === "abas") testeAbas();
  else if (ini.teste === "excluir") (async () => {   // evidências: listar, excluir pela tela, custódia; sessão: excluir; PDF
    const e = (ms) => new Promise((r) => setTimeout(r, ms));
    selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await e(1500);
    for (const c of ["Get-Date", "hostname", "whoami"]) { api.escrever(A().id, c + "\r"); await e(1200); await evidencia(false); await e(1500); }
    await conectar(A()); await e(800);   // desconecta (a sessão fica no histórico)
    await abrirEvidencias(); await e(1200);
    const antes = EVS.length; api.teste_fim("LISTA " + antes); await e(1500);
    document.querySelector("#ev-grade .ev-card [data-x]").click(); await e(300);
    document.querySelector("#pedidos .pedido [data-s]").click(); await e(1500);
    const depois = EVS.length;
    try {
      $("#modal-evid").classList.add("oculto");
      await abrirHistorico(); await e(600); api.teste_fim("HIST " + HIST.length); await e(1200);
      const hx = await api.hist_excluir(HIST[0].id); HIST = await api.historico(); desenharHist(); await e(600);
      const rel = await api.relatorio_gerar();
      api.teste_fim(JSON.stringify({ evid_antes: antes, evid_depois: depois, sessao_excluida: hx.ok, arquivos_na_lixeira: hx.arquivos,
        hist_restante: HIST.length, pdf_ok: rel.ok, pdf_evidencias: rel.evidencias, pdf_erro: rel.erro || null }));
    } catch (err) { api.teste_fim(JSON.stringify({ erro_js: String(err && err.stack || err).slice(0, 400) })); }
  })();
  else if (ini.teste === "pedidos") (async () => {   // avisos sem empilhar, REC na hora, liberar porta inexistente
    const e = (ms) => new Promise((r) => setTimeout(r, ms)), n = () => document.querySelectorAll("#pedidos .pedido").length;
    selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await e(1500);
    menuGravacao(A()); menuGravacao(A()); menuGravacao(A()); await e(400);
    const tres = n(); document.querySelector("#pedidos .pedido [data-s]").click(); await e(100);
    const recNaHora = A().gravando === false && n() === 0; await e(1500);
    menuGravacao(A()); await e(300); document.querySelector("#pedidos .pedido-x").click(); await e(200);
    const x = n(); const t0 = Date.now(); const cl = await api.area_transferencia(); const ms = Date.now() - t0;
    const lp = await api.porta_liberar("COM99");
    api.teste_fim(JSON.stringify({ avisos_apos_3_cliques: tres, rec_parou_na_hora: recNaHora, rec_confirmado: A().gravando,
      x_fechou: x === 0, clipboard_ms: ms, clipboard_tipo: typeof cl, liberar_com99: lp.ok ? "livre?" : (lp.erro || "").slice(0, 60) }));
  })();
  else if (ini.teste === "tempo") testeTempo();
  else if (ini.teste === "ssh") testeSsh();
  else if (ini.teste === "share-host") testeDono();
  else if (ini.teste === "demo-dono") demoDono();
  else if (ini.teste === "visita") (async () => {   // ＋ nova visita: evidência cai na pasta nova; outra visita = outro PDF
    const e = (ms) => new Promise((r) => setTimeout(r, ms));
    selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await e(1500);
    api.escrever(A().id, "hostname\r"); await e(1000); await evidencia(false); await e(1500);
    const v1 = (await api.evid_status()).visita_nome;
    const r = await api.nova_visita("SW4 teste"); await e(300);
    api.escrever(A().id, "whoami\r"); await e(1000); await evidencia(false); await e(1500);
    const st = await api.evid_status(), ev = await api.evid_lista(), rel = await api.relatorio_gerar();
    api.teste_fim(JSON.stringify({ visita1: v1, nova_ok: r.ok, visita_atual: st.visita_nome, evid_na_nova: (ev.itens || []).length,
      pdf_ok: rel.ok, pdf_evid: rel.evidencias, pdf_na_nova: (rel.pdf || "").includes("SW4 teste") }));
  })();
  else if (ini.teste === "demo-assistir") entrarSessao(ini.codigo_teste);
  else if (ini.teste === "share-guest") testeConvidado(ini.codigo_teste);
});

// ---- autoteste SSH embutido (servidor público de testes) + diagnóstico do cabo ----
async function testeSsh() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("ssh"); $("#ssh-destino").value = "demo@test.rebex.net";
  await conectar();
  const a = A(); let t = Date.now();
  while (!/password:\s*$/.test(linhaCursor(a.term)) && Date.now() - t < 20000) await espera(100);
  await espera(600);
  const sug = !$("#sugestao").classList.contains("oculto");
  api.teste_fim("SENHA sugestao_cofre=" + sug);
  await espera(1500);
  api.escrever(a.id, "password\r"); t = Date.now();
  while (!/\$\s*$/.test(linhaCursor(a.term)) && Date.now() - t < 20000) await espera(100);
  api.escrever(a.id, "ls\r"); await espera(2000);
  await evidencia(false); await espera(1200);
  api.teste_fim("SHELL ok=" + /readme\.txt/.test(snapshot(a.term).texto));
  await espera(2500);
  selecionarTipo("serial"); diagnosticarCabo(); await espera(3500);
  api.teste_fim("DIAG");
}

// ---- autoteste de tempo: janela pronta -> conectar PowerShell -> prompt na tela ----
async function testeTempo() {
  const pronto = Date.now();
  api.teste_fim("PRONTO");
  selecionarTipo("powershell");
  const t0 = Date.now(); await conectar();
  const a = A();
  while (!/PS [A-Z]:\\.*>\s*$/.test(linhaCursor(a.term)) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 30));
  api.teste_fim(`PROMPT conectar->prompt=${Date.now() - t0}ms`);
}

// ---- estresse de abas: 8 abas (3 conectadas), lista ▾, tentativa da 9ª ----
async function testeAbas() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await espera(1500);
  api.escrever(A().id, "dir\r"); await espera(1200);
  api.teste_fim("UMA"); await espera(1500);
  for (let i = 0; i < 7; i++) {
    const a = novaAba(i % 2 ? "cmd" : "powershell");
    if (i < 2) { await conectar(a); await espera(1200); }
    await espera(300);
  }
  ativar(ordemAbas()[1]); await espera(800);
  api.teste_fim("OITO n=" + abas.size); await espera(1500);
  novaAba("cmd"); await espera(500);
  listaAbas(); await espera(800);
  api.teste_fim("LISTA n=" + abas.size); await espera(1500);
  $("#menu-abas").classList.add("oculto"); api.teste_fim("TEMAS");
}

// ---- autoteste do layout em janela pequena (DASSH_JANELA=LxA): terminal, barra e lista grande de equipamentos ----
async function testeLayout() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("serial"); await carregarPortas(); await espera(1200);
  api.teste_fim("SERIAL topo=" + Math.round($(".topo").getBoundingClientRect().height) + "px"); await espera(1500);
  selecionarTipo("web"); await espera(800);
  api.teste_fim("WEB topo=" + Math.round($(".topo").getBoundingClientRect().height) + "px"); await espera(1500);
  selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await espera(2500);
  api.escrever(A().id, "Get-ChildItem C:\\Windows | Select-Object -First 40\r"); await espera(2500);
  A().term.focus(); await espera(800);
  api.teste_fim(`TERM fonte=${A().term.options.fontSize} logo_dif_ms=${window.__logoDif()}`); await espera(1500);
  let g = await api.gravacao_ligar(A().id, false); A().gravando = g.gravando; desenharRec(A());
  api.escrever(A().id, "echo depois-de-parar\r"); await espera(1200);
  api.teste_fim("REC_OFF gravando=" + g.gravando); await espera(1200);
  g = await api.gravacao_ligar(A().id, true); A().gravando = g.gravando; desenharRec(A());
  api.teste_fim("REC_ON gravando=" + g.gravando + " arq=" + String(await api.gravacao_aba(A().id)).split("\\").pop()); await espera(1200);
  for (let i = 1; i <= 75; i++)
    await api.equip_salvar({ nome: `Equipamento ${String(i).padStart(2, "0")}`, tipo: ["ssh", "web", "serial"][i % 3],
      destino: i % 3 === 1 ? `https://10.0.${i}.20` : i % 3 === 2 ? `COM${i % 9 + 1}:9600` : `admin@10.0.${i}.1`, grupo: `Site ${i % 5}` });
  await abrirEquip(); await espera(1200);
  api.teste_fim("EQUIP"); await espera(2000);
  $("#modal-bib").classList.add("oculto"); abrirModal("#modal-hist"); await espera(1200);
  api.teste_fim("HIST"); await espera(1500); api.teste_fim("TEMAS");
}

// ---- autoteste do console Java encaixado (simulador BMC em https://127.0.0.1:8443) ----
async function testeJava() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("web"); A().tipo = "web"; $("#web-url").value = "https://127.0.0.1:8443";
  await conectarWeb(A(), true); await espera(3000);
  await api.teste_web_js(A().id, "() => { document.querySelector('[name=s]').value = 'calvin'; document.querySelector('form').submit(); }");
  await espera(3000);
  capturarWeb(A(), false); await espera(3000);
  api.teste_fim("PAINEL janelas=" + (A().janelas || []).length);
  await api.teste_web_js(A().id, "() => { location.href = '/viewer.jnlp'; }");
  for (let i = 0; i < 60 && !(A().janelas || []).some((x) => x.java); i++) await espera(1000);
  await espera(4000);
  api.teste_fim("JAVA " + JSON.stringify((A().janelas || []).map((x) => [x.titulo, x.java, x.ativa])));
  await espera(1500);
  capturarWeb(A(), false); await espera(4000);
  api.teste_fim("CAPTURA " + document.querySelectorAll("#historico li.ev-item").length);
  await espera(1500);
  const nav = (A().janelas || []).find((x) => !x.java);
  if (nav) { await api.web_mostrar(A().id, nav.h); A().janelas = await api.web_janelas(A().id); desenharBarraWeb(A()); }
  await espera(2500); api.teste_fim("ALTERNOU");
  await espera(2000); api.teste_fim("TEMAS");
}

// ---- autoteste: convite (sem enviar) e lista de equipamentos ----
async function testeConvite() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); A().tipo = "powershell"; await conectar(); await espera(2500);
  await abrirConvite(); await espera(1500);
  $("#cv-link").value = "https://github.com/dassh-it/dassh-code/releases/latest"; $("#cv-link").oninput(); $("#cv-para").value = "Cláudio";
  api.teste_fim("CONVITE"); await espera(2500);
  $("#modal-convite").classList.add("oculto");
  await api.equip_salvar({ nome: "iDRAC R750 (simulador)", tipo: "web", destino: "https://127.0.0.1:8443", grupo: "Bancada" });
  await api.equip_salvar({ nome: "SW Huawei S5732 bancada", tipo: "serial", destino: "COM8:9600", grupo: "Bancada" });
  await api.equip_salvar({ nome: "SW Core RJ", tipo: "ssh", destino: "admin@10.10.0.1", grupo: "Cliente X", obs: "VRP 8" });
  await abrirEquip(); await espera(1000);
  api.teste_fim("EQUIP"); await espera(2500); api.teste_fim("TEMAS");
}

// ---- autoteste do PDF: gera, abre dentro do app, desenha rubrica, assina e datar ----
async function testePdf() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = await api.relatorio_gerar();
  await abrirPdf(r.pdf); await espera(2500);
  $("#pdf-nome").value = "Fulano de Tal (teste)";
  const g = $("#pdf-rub").getContext("2d"); g.lineWidth = 5; g.strokeStyle = "#1a2f8a"; g.beginPath();
  [[30, 130], [120, 40], [200, 150], [300, 50], [420, 140], [530, 70]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke(); $("#pdf-rub").dataset.usada = "1";
  api.teste_fim("ABERTO"); await espera(2000);
  $("#pdf-assinar").click(); await espera(5000);
  const f = $("#pdf-ver").contentWindow; try { f.location.hash = "page=5"; } catch (_) {}
  $("#pdf-ver").src = abrirPdf.url + "#page=5&zoom=90"; await espera(2500);
  api.teste_fim("ASSINADO " + $("#pdf-tit").textContent + " | " + $("#pdf-quadros").textContent.replace(/\s+/g, " "));
  await espera(2000); api.teste_fim("TEMAS");
}

// ---- autoteste da aba Web: abre página, captura evidência, abre a vitrine de temas ----
async function testeWeb() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("web"); $("#web-url").value = "https://example.com";
  await conectar(); await espera(4000);
  api.teste_fim("ABERTO janelas=" + (A().janelas || []).length);
  await espera(2500);
  capturarWeb(A(), false); await espera(2500);
  const n = document.querySelectorAll("#historico li.ev-item").length;
  api.teste_fim("CAPTURA " + n);
  await espera(3000);
  await telaCheia(true); await espera(1500);
  api.teste_fim("CHEIA");
  await espera(3000);
  await telaCheia(false); await espera(1500);
  api.teste_fim("NORMAL");
  await espera(3000);
  abrirTemas(); await espera(800);
  api.teste_fim("TEMAS");
}

// ---- autoteste da fila: 3 envios com WhatsApp fechado -> andamento + painel da fila ----
async function testeFila() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); await conectar(); await espera(2500);
  api.escrever(ativa, "Get-Date\r"); await espera(1500);
  evidencia(true); evidencia(true); evidencia(true);
  await filaCaptura; await espera(4000);
  api.teste_fim("ANDAMENTO " + $("#wa-andamento").textContent.trim());
  await espera(1500); await abrirFila(); await espera(1500);
  api.teste_fim("FILA " + document.querySelectorAll("#fila-linhas tr").length);
}

// ---- autoteste visual: rajada de capturas, miniaturas, evidência ampliada e player ----
async function testeVisual() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); await conectar(); await espera(2500);
  api.escrever(ativa, "Get-Date; Get-Process | Select-Object -First 8 Name,Id,CPU | Format-Table -AutoSize\r"); await espera(3000);
  evidencia(false); evidencia(false); evidencia(false);          // 3 cliques seguidos (sem await)
  await filaCaptura; await espera(800);
  api.teste_fim("RAJADA " + document.querySelectorAll("#historico li.ev-item").length);
  await espera(2500);
  document.querySelector("#historico li.ev-item").click(); await espera(2500);
  api.teste_fim("LB");
  await espera(5000);
  $("#modal-lb").classList.add("oculto");
  const h = await api.historico(); await tocarGravacao(h[0].gravacao, "Teste"); await espera(4000);
  api.teste_fim("PLAYER");
}

// ---- autoteste: dados do atendimento -> roteiro completo -> relatório PDF ----
async function testeAuditoria() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const d = await api.dados_visita("Teste auditoria", "CHG0004567", "Fulano de Tal — Redes");
  atualizarEvid(d.evid);
  selecionarTipo("powershell"); await conectar(); await espera(3000);
  const rots = await api.roteiros(), rot = rots.find((r) => r.arquivo === "windows_servidor.json");
  await executarRoteiro(rot, false);
  const r = await api.relatorio_gerar();
  await espera(500);
  api.teste_fim(JSON.stringify({ roteiro: rot.nome, rel_ok: r.ok, pdf: r.pdf, evidencias: r.evidencias, logs: r.logs,
    gravacoes: r.gravacoes, erro: r.erro || null }));
}

// ---- autotestes do compartilhamento (duas instâncias do app conversando) ----
// ---- demonstração do compartilhamento: o "dono" digita sozinho, devagar; o convidado só assiste ----
async function demoDono() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); await conectar(); await espera(2500);
  const codigo = await compartilhar();
  api.teste_fim("CODIGO " + codigo);
  const digitar = async (txt) => { for (const ch of txt) { api.escrever(A().id, ch); await espera(90 + Math.random() * 120); } api.escrever(A().id, "\r"); };
  await espera(12000);   // tempo para o convidado entrar e ser aprovado
  const cmds = ["Write-Host 'Ola! Voce esta assistindo ao vivo a minha aba do DASSH Code' -ForegroundColor Green",
    "Get-Date", "hostname", "Get-ComputerInfo -Property OsName, OsVersion, CsProcessors | Format-List",
    "Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress | Format-Table",
    "Test-Connection 8.8.8.8 -Count 3 | Select-Object Address, Latency", "cls",
    "Write-Host 'Tudo o que eu digito aparece na sua tela, letra por letra.' -ForegroundColor Cyan",
    "Get-Process | Sort-Object CPU -Descending | Select-Object -First 8 Name, CPU | Format-Table"];
  for (let volta = 0; volta < 3; volta++) for (const c of cmds) { await digitar(c); await espera(4500); }
  api.teste_fim("TEMAS");
}
async function testeDono() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); await conectar(); await espera(2500);
  api.escrever(ativa, "Write-Host 'TELA-DO-DONO'\r"); await espera(1500);
  const codigo = await compartilhar();
  api.teste_fim("CODIGO " + codigo);                    // o script lê e passa para o convidado
  for (let i = 0; i < 90; i++) {                        // espera o convidado digitar algo
    await espera(1000);
    if (/REMOTO-OK/.test(snapshot(A().term).texto)) break;
  }
  const s = A().share || {};
  api.teste_fim(JSON.stringify({ papel: "dono", recebeu_digitacao_remota: /REMOTO-OK/.test(snapshot(A().term).texto),
    participantes: (s.participantes || []).map((p) => `${p.nome}:${p.ativo ? "ATIVO" : "observando"}`), sou_ativo: s.souAtivo }));
}
async function testeConvidado(codigo) {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const a = await entrarSessao(codigo);
  for (let i = 0; i < 60 && (!a.share || a.share.aguardando); i++) await espera(500);
  await espera(2500);
  const viuTela = /TELA-DO-DONO/.test(snapshot(a.term).texto);
  api.escrever(a.id, "echo SEM-CONTROLE\r"); await espera(1000);    // sem controle: deve ser ignorado
  api.share_pedir(a.id);
  for (let i = 0; i < 40 && !(a.share && a.share.souAtivo); i++) await espera(500);
  const ativo = !!(a.share && a.share.souAtivo);
  api.escrever(a.id, "Write-Host ('REMOTO' + '-OK')\r"); await espera(3000);
  const viuEco = /REMOTO-OK/.test(snapshot(a.term).texto);
  await new Promise((r) => setTimeout(r, 1500));
  api.teste_fim(JSON.stringify({ papel: "convidado", viu_tela_do_dono: viuTela, virou_ativo: ativo, viu_resultado: viuEco,
    participantes: (a.share.participantes || []).map((p) => `${p.nome}:${p.ativo ? "ATIVO" : "observando"}`) }));
}

// Autoteste (só com DASSH_TESTE=1): 2 abas (PowerShell + CMD), evidência em cada, login simulado no cofre
async function autoteste() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  selecionarTipo("powershell"); await conectar(); await espera(2500);
  api.escrever(ativa, "Get-Date -Format 'dd/MM/yyyy HH:mm'\r"); await espera(3000);
  await evidencia(false); await espera(1000);
  const b = novaAba("cmd"); selecionarTipo("cmd"); await conectar(b); await espera(2000);
  api.escrever(b.id, "ver\r"); await espera(2000);
  await evidencia(false); await espera(1000);
  // cofre: credencial de teste -> prompt Username -> clica na sugestão -> Password é completado sozinho
  {   // autoteste (dados de teste): abre o cofre com o PIN de teste (cria no 1º uso)
    let p = await api.cofre_pin_abrir("Teste-Pin-cofre-9");
    if (!p.ok) p = await api.cofre_pin_definir("Teste-Pin-cofre-9");
    if (p.ok) cofreAberto(p);
  }
  await cofreChamar("cofre_salvar", { nome: "TESTE", usuario: "usuario_teste", senha: "senha_teste_123", alvo: "" });
  api.escrever(b.id, "set /p U=Username: \r"); await espera(2000);
  const sug = !$("#sugestao").classList.contains("oculto");
  const bt = $("#sug-itens button"); if (bt) bt.click(); await espera(1500);
  api.escrever(b.id, "set /p P=Password: \r"); await espera(2500);
  const sumiu = $("#sugestao").classList.contains("oculto");
  api.escrever(b.id, "echo RESULTADO=[%U%][%P%]\r"); await espera(1500);
  const t = snapshot(b.term).texto, ms = [...t.matchAll(/^RESULTADO=\[([^\]]*)\]\[([^\]]*)\]/gm)], m = ms.pop();
  for (const c of [...cofre]) if (c.nome === "TESTE") await cofreChamar("cofre_remover", c.id);
  api.teste_fim(JSON.stringify({ abas: abas.size, sugestao: sug, sugestao_sumiu: sumiu,
    usuario_ok: !!m && m[1] === "usuario_teste", senha_ok: !!m && m[2] === "senha_teste_123" }));
}

// categorias dos tipos de conexão (barra segmentada): independente do resto da inicialização.
// Equipamentos já escolhe o tipo (Serial/SSH/Web só preenchem o destino); Shell/Nuvem/IA só mostram os tipos (abrem ao clicar no tipo).
document.querySelectorAll("#abas .cat").forEach((c) => {
  const ir = () => {
    const cat = c.dataset.cat; mostrarCategoria(cat);
    const ativo = document.querySelector(`#abas .tipos-grupo[data-cat="${cat}"] button.ativa`);
    if (cat === "equip" && !ativo) {
      const a = A(); if (a && a.conectado) return;   // aba conectada: só mostra; o tipo muda ao abrir uma aba nova
      selecionarTipo(c.dataset.ultimo || "serial");
    }
  };
  c.addEventListener("click", ir);
  c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); } });
});
$("#tipos").addEventListener("wheel", (e) => { const t = e.currentTarget; if (e.deltaY && t.scrollWidth > t.clientWidth) { e.preventDefault(); t.scrollLeft += e.deltaY; } }, { passive: false });
$("#tipos").addEventListener("scroll", bordasTipos, { passive: true });
window.addEventListener("resize", ajustarTipos);
ajustarTipos();

// ---- licença / convite: mostra o plano e ativa um código recebido (conferido offline pelo backend) ----
async function desenharLicenca() {
  const r = await api.licenca_estado(), el = $("#lic-estado");
  if (!r || !r.ok) { el.textContent = "Não foi possível ler a licença."; return; }
  const origem = r.origem === "licenca" ? `Convite/licença ativa${r.nome ? " de " + esc(r.nome) : ""}` : r.estado === "valida" ? "Teste gratuito" : "Plano Grátis";
  const dias = r.dias == null ? "sem data de validade" : (r.dias === 1 ? "1 dia restante" : `${r.dias} dias restantes`);
  el.innerHTML = `<div style="font-size:15px"><b>${origem}</b> — plano <b>${esc(String(r.plano || "grátis").toUpperCase())}</b></div>
    <div class="ajuda" style="margin-top:4px">${esc(r.motivo || "")} · ${r.estado === "valida" ? dias : "terminou"}</div>`;
}
async function abrirLicenca() { $("#lic-msg").textContent = ""; $("#lic-token").value = ""; await desenharLicenca(); abrirModal("#modal-lic"); }
$("#lic-ativar").onclick = async () => {
  const t = $("#lic-token").value.trim(); if (!t) { $("#lic-msg").textContent = "Cole o código do convite."; return; }
  const r = await api.licenca_ativar(t);
  $("#lic-msg").textContent = r.ok ? "✔ Ativado!" : "✖ " + (r.motivo || r.erro || "código inválido");
  $("#lic-msg").style.color = r.ok ? "var(--verde)" : "var(--erro-detalhe)";
  if (r.ok) { $("#lic-token").value = ""; desenharLicenca(); toast("Licença ativada"); }
};

// nome "DASSH Code" digitado letra a letra ao lado do logo (uma vez ao abrir; ~85 ms por letra). Sem animação com prefers-reduced-motion:
// o texto já está completo no HTML. data-pronto="1" marca o fim (testes e leitores de tela não dependem disso: o aria-label é do .marca).
function digitarMarca() {
  const box = $("#marca-nome"), alvo = $("#mn-digitado"); if (!box || !alvo) return;
  const texto = box.dataset.texto || "DASSH Code";
  if (box.dataset.iniciado) return;   // uma vez só por abertura
  box.dataset.iniciado = "1";
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { alvo.textContent = texto; box.dataset.pronto = "1"; return; }
  alvo.textContent = ""; let i = 0;
  const passo = () => { i++; alvo.textContent = texto.slice(0, i); if (i < texto.length) setTimeout(passo, 85); else box.dataset.pronto = "1"; };
  setTimeout(passo, 85);
}

// ---- botão "Mais ▾" (Nuvem e IA): lista (popover) com os tipos menos usados. Os itens continuam sendo botões data-tipo do
// MESMO seletor (mesmo handler, mesmo selecionarTipo/instalação/confirmação). A lista mora dentro do grupo; só ao abrir vai para o
// <body> com position: fixed (a barra de tipos tem overflow e máscara que cortariam o popover) e volta ao fechar. ----
let maisAberto = null;   // { btn, lista, grupo }
function atualizarMais() {   // o botão mostra o item ativo da sua lista ("Ollama ▾") e fica selecionado
  document.querySelectorAll("#tipos .mais-btn").forEach((btn) => {
    const lista = document.getElementById(btn.getAttribute("aria-controls")), at = lista && lista.querySelector("[data-tipo].ativa");
    const nome = at ? at.querySelector("b").textContent : "Mais";
    btn.classList.toggle("ativa", !!at);
    btn.querySelector("b").textContent = nome;
    btn.setAttribute("aria-label", at ? `${nome}, selecionado (mais opções)` : "Mais opções");
    if (at) btn.dataset.ativo = at.dataset.tipo; else delete btn.dataset.ativo;
  });
}
function posicionarMais() {
  if (!maisAberto) return;
  const { btn, lista } = maisAberto, r = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  lista.style.maxHeight = ""; lista.style.left = "0px"; lista.style.top = "0px";
  const w = lista.offsetWidth, h = lista.offsetHeight;
  let x = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8)), y = r.bottom + 6;
  if (y + h > vh - 8) { if (r.top - 6 - h >= 8) y = r.top - 6 - h; else lista.style.maxHeight = Math.max(120, vh - y - 8) + "px"; }
  lista.style.left = x + "px"; lista.style.top = y + "px";
}
function abrirMais(btn, foco) {
  if (maisAberto) fecharMais();
  const lista = document.getElementById(btn.getAttribute("aria-controls")); if (!lista) return;
  maisAberto = { btn, lista, grupo: lista.parentNode };
  document.body.appendChild(lista);
  lista.hidden = false; btn.setAttribute("aria-expanded", "true");
  posicionarMais();
  if (foco) { const it = [...lista.querySelectorAll("[role=menuitem]")], ativo = lista.querySelector(".ativa");
    (ativo || (foco === "fim" ? it[it.length - 1] : it[0]))?.focus(); }
}
function fecharMais(devolverFoco) {
  if (!maisAberto) return;
  const { btn, lista, grupo } = maisAberto; maisAberto = null;
  lista.hidden = true; lista.style.left = lista.style.top = lista.style.maxHeight = "";
  grupo.appendChild(lista);   // volta ao grupo: o resto do app encontra os itens onde sempre estiveram
  btn.setAttribute("aria-expanded", "false");
  if (devolverFoco) btn.focus();
}
document.querySelectorAll("#tipos .mais-btn").forEach((btn) => {
  btn.addEventListener("click", () => { if (maisAberto && maisAberto.btn === btn) fecharMais(true); else abrirMais(btn, null); });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); abrirMais(btn, e.key === "ArrowUp" ? "fim" : "inicio"); }
    else if (e.key === "Escape" && maisAberto) { e.preventDefault(); fecharMais(true); }
  });
});
document.querySelectorAll("#tipos .mais-lista").forEach((lista) => {
  lista.addEventListener("click", () => fecharMais(false), true);   // captura: a lista volta ao grupo ANTES do handler do item rodar
  lista.addEventListener("keydown", (e) => {
    const it = [...lista.querySelectorAll("[role=menuitem]")], i = it.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); it[(i + 1) % it.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); it[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); it[it.length - 1].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fecharMais(true); }
    else if (e.key === "Tab") fecharMais(true);
  });
});
document.addEventListener("pointerdown", (e) => { if (maisAberto && !maisAberto.lista.contains(e.target) && !maisAberto.btn.contains(e.target)) fecharMais(); }, true);
window.addEventListener("resize", () => fecharMais());
window.addEventListener("blur", () => fecharMais());
document.addEventListener("scroll", (e) => {   // a faixa dos tipos rolou (foco no botão): só reposiciona; qualquer outra rolagem fecha
  if (!maisAberto || maisAberto.lista.contains(e.target)) return;
  if (e.target === $("#tipos")) posicionarMais(); else fecharMais();
}, true);
atualizarMais();

// clique nos tipos de conexão (ligado no carregamento: funciona antes mesmo do backend responder)
document.querySelectorAll("#abas [data-tipo]").forEach((b) => b.addEventListener("click", async () => {
  const tipo = b.dataset.tipo;
  if (b.getAttribute("aria-disabled") === "true") return;   // item "a confirmar" da lista Mais: listado, mas desligado
  if (!DIRETOS.includes(tipo)) {   // Serial / SSH / Web: escolhe o tipo e preenche o destino ao lado
    const a = A(); if (a && a.conectado) return toast("Desconecte esta aba ou abra uma nova (＋) para outro tipo", "aviso");
    return selecionarTipo(tipo);
  }
  let a = A();
  if (!a || a.conectado || a.demo) a = novaAba(tipo);   // aba em uso: abre numa aba nova
  if (!a) return;
  selecionarTipo(tipo); conectar(a);
}));

// ---- Skills: escolher quais comandos executar (um a um, todos ou nenhum) ----
function desenharSelecaoSkill() {
  const cbs = [...$("#rot-cmds").querySelectorAll("[data-ci]")], n = cbs.filter((c) => c.checked).length;
  $("#rot-sel").innerHTML = cbs.length ? `<button class="btn mini" data-todos>☑ Marcar todos</button> <button class="btn mini" data-nenhum>☐ Desmarcar todos</button>
    <span class="rot-cont">${n} de ${cbs.length} ${cbs.length === 1 ? "comando selecionado" : "comandos selecionados"}</span>` : "";
  const t = $("#rot-sel").querySelector("[data-todos]"), z = $("#rot-sel").querySelector("[data-nenhum]");
  if (t) t.onclick = () => { cbs.forEach((c) => (c.checked = true)); desenharSelecaoSkill(); };
  if (z) z.onclick = () => { cbs.forEach((c) => (c.checked = false)); desenharSelecaoSkill(); };
  const cfgS = ehConfig(rotSel), ciente = $("#rot-ciente") && $("#rot-ciente").checked;
  $("#rot-executar").disabled = !n || (cfgS && (!skillCfg || skillCfg.fase !== "previa" || !ciente));
  $("#rot-executar").textContent = cfgS ? `⚠ Aplicar ${pl(n, "comando")} na aba ativa` : n === cbs.length ? "▶ Executar na aba ativa" : `▶ Executar ${pl(n, "comando")} na aba ativa`;
  $("#rot-executar").classList.toggle("perigo", !!cfgS);
}

// ================= 🗂 BIBLIOTECA: o lugar único — sessões, gravações, evidências, logs, relatórios, equipamentos, cofre e Skills =================
const bibDesktop = matchMedia("(min-width: 761px) and (pointer: fine)");
const BIB = { sec: "sessoes", hist: [], evs: [], rels: [], skills: [], log: null, filtroEv: null, ft: "", fc: "", tag: "", sel: null,
              selecao: novaSelecao(), limite: 150, pinModo: null, pinEst: null };
const _dt = (iso) => { const [d, t] = String(iso || "").replace("T", " ").split(" "); const [y, m, dd] = (d || "").split("-"); return dd ? `${dd}/${m}/${y} ${String(t || "").slice(0, 5)}` : "—"; };
function nomeHistorico(r) {
  const tipo = nomeTipo(r.tipo), nome = r.nome || tipo;
  return bibDesktop.matches && nome.toLowerCase().startsWith(tipo.toLowerCase() + " ") ? nome.slice(tipo.length).trimStart() : nome;
}
const _hist = (r) => ({ data: r.inicio, nome: nomeHistorico(r), tipo: nomeTipo(r.tipo), cliente: r.cliente || "",
                        busca: `${r.nome} ${r.tipo} ${r.inicio} ${r.alvo || ""} ${r.cliente || ""} ${r.etiqueta || ""}` });
const BIB_SEC = {
  sessoes: { lista: () => BIB.hist, campos: _hist, unid: "sessão(ões)", vazio: "Nenhuma sessão registrada ainda.", cartao: (r) => cartaoSessao(r) },
  gravacoes: { lista: () => BIB.hist.filter((r) => r.grav_existe), campos: _hist, unid: "gravação(ões)",
               vazio: "Nenhuma gravação ainda (ligue ⏺ gravar no cartão Evidência).", cartao: (r) => cartaoSessao(r) },
  evidencias: { lista: () => (BIB.filtroEv ? BIB.evs.filter((e) => BIB.filtroEv.includes(Number(e.num))) : BIB.evs),
                campos: (e) => ({ data: e.data_hora, nome: e.comando || e.host || e.arquivo, tipo: e.modelo || "", cliente: e.host || "",
                                  busca: `${e.num} ${e.id} ${e.comando} ${e.host} ${e.serial || ""} ${e.modelo || ""}` }),
                rot: { tipo: "Equipamento", cliente: "Host" }, unid: "evidência(s)", vazio: "Nenhuma evidência neste atendimento ainda.",
                cartao: (e) => cartaoEvidencia(e), grade: true },
  logs: { lista: () => BIB.hist.filter((r) => r.log_existe), campos: _hist, unid: "log(s) — clique para ler aqui, com busca",
          vazio: "Nenhum log ainda.", cartao: (r) => cartaoLog(r) },
  relatorios: { lista: () => BIB.rels, campos: (r) => ({ data: r.data, nome: r.arquivo, tipo: r.assinado ? "Assinado" : "Sem assinatura",
                                                         cliente: r.visita || "", busca: `${r.arquivo} ${r.visita}` }),
                rot: { tipo: "Assinatura", cliente: "Visita" }, unid: "relatório(s) do cliente",
                vazio: "Nenhum relatório gerado ainda (botão 📄 Relatório no cartão Evidência).", cartao: (r) => cartaoRelatorio(r) },
  equipamentos: { lista: () => EQ, campos: (e) => ({ data: e.ultima, nome: e.nome, tipo: nomeTipo(e.tipo), cliente: e.grupo || "",
                                                     origem: ferramentaEquip(e), busca: `${e.nome} ${e.destino} ${e.grupo} ${e.obs} ${ferramentaEquip(e)}` }),
                  rot: { cliente: "Grupo" }, padrao: { g: "cliente" }, novosNoFim: true, unid: "equipamento(s)",
                  vazio: "Nenhum equipamento salvo. Cadastre, salve a aba atual ou importe equipamentos." },
  cofre: { lista: () => cofre, campos: (c) => ({ data: c.atualizado || c.criado || "", nome: c.nome, tipo: "", cliente: c.alvo || "",
                                                 busca: `${c.nome} ${c.usuario} ${c.alvo} ${c.obs || ""}` }),
           rot: { cliente: "Vale para" }, novosNoFim: true, unid: "credencial(is)", vazio: "Nenhuma credencial ainda — ＋ Nova credencial.",
           cartao: (c) => cartaoCofre(c) },
  skills: { lista: () => BIB.skills, campos: (r) => ({ data: r.alterado, nome: r.nome, tipo: ehConfig(r) ? "⚙ Configuração" : "🔎 Coleta",
                                                       cliente: r.fabricante || "Outros", tags: r.finalidade || [],
                                                       busca: `${r.nome} ${r.fabricante} ${r.descricao} ${(r.finalidade || []).join(" ")} ${(r.comandos || []).map((c) => c.cmd).join(" ")}` }),
            rot: { tipo: "Tipo", cliente: "Fabricante", tags: "Finalidade" }, get semData() { return !bibDesktop.matches; }, padrao: { o: "nome", g: "cliente" },
            unid: "Skill(s)", vazio: "Nenhuma Skill encontrada.", cartao: (r) => cartaoSkill(r), detalhe: (r) => detalheSkill(r) },
  importar: { especial: true },
};
const BIB_TIT = { sessoes: "🕘 Sessões", gravacoes: "⏺ Gravações", evidencias: "🖼 Evidências", logs: "📜 Logs", relatorios: "📄 Relatórios",
                  equipamentos: "📚 Equipamentos", cofre: "🔑 Cofre de credenciais", skills: "⚡ Skills", importar: "⇅ Importar e exportar" };
const BIB_DICA = { equipamentos: "Use Ctrl ou Shift para selecionar mais itens. Use as setas para navegar e Enter ou duplo clique para conectar.",
                   cofre: "As senhas nunca aparecem na tela: são digitadas direto na conexão quando o equipamento pede.",
                   logs: "Clique num log para ler aqui mesmo, com busca e destaque." };
const BIB_ORD = "dassh.bib.ordem.v2";   // { seção: {o: "data"|"nome", inv, g} } — conveniência deste navegador
function bibOrdemLer(sec) {
  const S = BIB_SEC[sec] || {}, p = { o: S.semData ? "nome" : "data", inv: false, g: "", ...(S.padrao || {}) };
  try { return { ...p, ...((JSON.parse(localStorage.getItem(BIB_ORD) || "{}") || {})[sec] || {}) }; } catch (e) { return p; }
}
function bibOrdemGravar(sec, v) {
  try { const o = JSON.parse(localStorage.getItem(BIB_ORD) || "{}") || {}; o[sec] = v; localStorage.setItem(BIB_ORD, JSON.stringify(o)); } catch (e) { /* sem armazenamento */ }
}
async function abrirBiblioteca(sec = "sessoes", filtroEv = null) {
  BIB.filtroEv = filtroEv; BIB.log = null; $("#bib-busca").value = "";
  $("#eq-acoes").classList.add("oculto"); fecharLoteEquip();
  $("#bib-acoes").classList.add("oculto");
  abrirModal("#modal-bib"); $("#bib-lista").innerHTML = `<p class="vazio">Carregando…</p>`;
  const arr = (x) => (Array.isArray(x) ? x : []);
  const historico = gravacaoEtiquetas.then(() => api.historico());
  const [h, e, r, s, q] = await Promise.all([historico, api.evid_lista(), api.biblioteca_relatorios(), api.roteiros(), api.equip_listar()]);
  BIB.hist = arr(h); BIB.evs = arr(e && e.itens); BIB.rels = arr(r && r.itens); BIB.skills = arr(s); EQ = arr(q);
  $("#bib-sub").textContent = r && r.cliente ? "· " + r.cliente : "";
  irBib(sec, true);
}
function bibContagens() {
  const n = { sessoes: BIB.hist.length, gravacoes: BIB.hist.filter((x) => x.grav_existe).length, evidencias: BIB.evs.length,
              logs: BIB.hist.filter((x) => x.log_existe).length, relatorios: BIB.rels.length, equipamentos: EQ.length,
              cofre: COFRE.token ? cofre.length : "🔒", skills: BIB.skills.length, importar: "" };
  $("#bib-nav").querySelectorAll("[data-sec]").forEach((b) => (b.querySelector(".bib-n").textContent = n[b.dataset.sec]));
}
function irBib(sec, abrindo) {
  if (!abrindo && BIB.sec === "cofre" && sec !== "cofre" && COFRE.token) cofreTrancar();   // saiu da seção Cofre: tranca
  if (sec !== BIB.sec || abrindo) {
    BIB.ft = ""; BIB.fc = ""; BIB.tag = ""; BIB.sel = null; $("#eq-ocultar-origem").value = "";
    EQ_LISTA.selecionados.clear(); EQ_LISTA.foco = EQ_LISTA.ancora = null;
    BIB.selecao = novaSelecao();
  }
  fecharLoteEquip();
  $("#eq-acoes").classList.toggle("oculto", sec !== "equipamentos");
  $("#bib-acoes").classList.add("oculto");
  BIB.sec = sec; BIB.log = null; BIB.limite = 150; BIB.pinModo = null;
  $("#bib-nav").querySelectorAll("[data-sec]").forEach((b) => b.classList.toggle("ativa", b.dataset.sec === sec));
  document.querySelectorAll(".bib-ferr[data-ferr]").forEach((f) => f.classList.toggle("oculto", f.dataset.ferr !== sec));
  $("#bib-tit").textContent = BIB_TIT[sec] || ""; $("#bib-dica").textContent = BIB_DICA[sec] || "";
  $("#bib-dica").classList.toggle("oculto", !BIB_DICA[sec]);
  if (bibDesktop.matches && ACOES_BIB[sec]) {
    $("#bib-dica").textContent = "Selecione com as setas, Ctrl ou Shift. Enter abre a ação principal. Ctrl+A seleciona os itens visíveis.";
    $("#bib-dica").classList.remove("oculto");
  }
  importarUIModo(null); $("#eq-form").classList.add("oculto"); limparFormCofre();
  bibContagens();
  if (sec === "importar") { $("#bib-info").textContent = ""; return importarUIAbrir(); }
  if (sec === "cofre") return bibCofreEntrar();
  desenharBib();
}
async function bibCofreEntrar() {
  if (COFRE.token) { const r = await cofreChamar("cofre_listar"); if (r && r.ok) { bibContagens(); return desenharBib(); } }
  $("#bib-lista").innerHTML = `<p class="vazio">Conferindo o cofre…</p>`;
  BIB.pinEst = await api.cofre_pin_estado(null); BIB.pinModo = null; desenharBib();
}
function bibFiltro(sel, todos, campo, rotulo, atual) {
  const vals = [...new Set(todos.map((x) => x.f[campo]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
  sel.classList.toggle("oculto", vals.length < 2);
  sel.innerHTML = `<option value="">${esc(rotulo)}: todos</option>` + vals.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
  sel.value = vals.includes(atual) ? atual : "";
  return sel.value;
}
const _pt = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { sensitivity: "base", numeric: true });
function bibComparador(ord, S) {   // ord = { o: "data"|"nome", inv, g: ""|"cliente"|"tipo" }
  const dir = ord.inv ? -1 : 1;
  const seq = (a, b) => (S.novosNoFim ? b.i - a.i : a.i - b.i);   // sem data: a ordem natural da lista (mais novo primeiro)
  const base = ord.o === "nome" ? (a, b) => dir * _pt(a.f.nome, b.f.nome) || seq(a, b) : (a, b) => {
    const da = String(a.f.data || ""), db = String(b.f.data || "");
    if (da === db) return dir * seq(a, b) || _pt(a.f.nome, b.f.nome);
    if (!da) return 1; if (!db) return -1;   // sem data vai para o fim, nos dois sentidos
    return dir * db.localeCompare(da);
  };
  if (!ord.g) return base;
  const k = ord.g;
  return (a, b) => { const va = a.f[k] || "", vb = b.f[k] || ""; if (va !== vb) { if (!va) return 1; if (!vb) return -1; return _pt(va, vb); } return base(a, b); };
}
function bibChips(todos, rot) {   // filtros em chips: tipo (um por vez) e marcadores (ex.: finalidade das Skills)
  const uniq = (l) => [...new Set(l.filter(Boolean))].sort(_pt);
  const tipos = uniq(todos.map((x) => x.f.tipo)), tags = uniq(todos.flatMap((x) => x.f.tags || []));
  const mostraT = tipos.length >= 2 && tipos.length <= 12, mostraG = tags.length >= 2;
  if (!mostraT || !tipos.includes(BIB.ft)) BIB.ft = "";
  if (!mostraG || !tags.includes(BIB.tag)) BIB.tag = "";
  const box = $("#bib-chips"), chip = (k, v, t, on) => `<button type="button" aria-pressed="${!!on}" class="bib-fchip${on ? " ativo" : ""}" data-k="${k}" data-v="${esc(v)}">${esc(t)}</button>`;
  box.classList.toggle("oculto", !mostraT && !mostraG);
  box.innerHTML = (mostraT ? `<div class="bib-fgrupo"><em>${esc(rot.tipo || "Tipo")}</em>${chip("ft", "", "Todos", !BIB.ft)}${tipos.map((v) => chip("ft", v, v, BIB.ft === v)).join("")}</div>` : "") +
    (mostraG ? `<div class="bib-fgrupo"><em>${esc(rot.tags || "Marcadores")}</em>${chip("tag", "", "Todas", !BIB.tag)}${tags.map((v) => chip("tag", v, v, BIB.tag === v)).join("")}</div>` : "");
  box.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => { BIB[b.dataset.k] = b.dataset.v; BIB.limite = 150; BIB.sel = null; desenharBib(); }));
}
function bibBarraOrdem(ord, S, rot, tem) {
  const bd = $("#bib-o-data"), bn = $("#bib-o-nome");
  bd.classList.toggle("oculto", !!S.semData);
  bd.classList.toggle("ativo", ord.o === "data"); bn.classList.toggle("ativo", ord.o === "nome");
  bd.setAttribute("aria-pressed", ord.o === "data"); bn.setAttribute("aria-pressed", ord.o === "nome");
  bd.textContent = ord.o === "data" && ord.inv ? "🕘 Mais antigos primeiro" : "🕘 Alterados por último";
  bn.textContent = ord.o === "nome" && ord.inv ? "Z→A Ordem alfabética" : "A→Z Ordem alfabética";
  if (bibDesktop.matches) {
    bn.textContent = ord.o === "nome" && ord.inv ? "Z→A" : "A→Z";
    if (["sessoes", "gravacoes", "logs", "evidencias", "relatorios"].includes(BIB.sec) && !(ord.o === "data" && ord.inv)) bd.textContent = "Mais recentes";
  }
  bd.title = bn.title = "Clique de novo para inverter a ordem";
  const g = $("#bib-grupo"), ops = [["", "Sem agrupar"]];
  if (tem("cliente")) ops.push(["cliente", `Agrupar por ${(rot.cliente || "cliente").toLowerCase()}`]);
  if (tem("tipo")) ops.push(["tipo", `Agrupar por ${(rot.tipo || "tipo").toLowerCase()}`]);
  g.innerHTML = ops.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("");
  g.classList.toggle("oculto", ops.length < 2);
  if (!ops.some(([v]) => v === ord.g)) ord.g = "";
  g.value = ord.g;
}
function desenharBib() {
  const S = BIB_SEC[BIB.sec], L = $("#bib-lista"), info = $("#bib-info"), rot = S.rot || {};
  if (S.especial) return;
  const trancado = BIB.sec === "cofre" && (!COFRE.token || BIB.pinModo);
  $("#modal-bib").classList.toggle("bib-trancado", !!trancado);
  document.querySelector('.bib-ferr[data-ferr="cofre"]').classList.toggle("oculto", BIB.sec !== "cofre" || !!trancado);
  if (BIB.sec === "cofre") $("#bib-dica").textContent = COFRE.token ? `${BIB_DICA.cofre} Tranca sozinho após ${COFRE.min} min sem uso, ao trocar de seção ou fechar.` : BIB_DICA.cofre;
  const equipamentos = BIB.sec === "equipamentos", acoes = bibDesktop.matches && ACOES_BIB[BIB.sec];
  const tinhaFoco = L.contains(document.activeElement);
  $("#bib-acoes").classList.toggle("oculto", !acoes || !!BIB.log);
  L.className = "bib-lista"; L.innerHTML = "";
  if (trancado) return desenharPinBib();
  const q = $("#bib-busca").value.trim().toLowerCase();
  if (BIB.sec === "logs" && BIB.log) return desenharLogBib(q);
  const todos = S.lista().map((raw, i) => ({ raw, i, f: S.campos(raw) }));
  const tem = (k) => todos.some((x) => x.f[k]);
  bibChips(todos, rot);
  BIB.fc = bibFiltro($("#bib-f-cli"), todos, "cliente", rot.cliente || "Cliente", BIB.fc);
  let ocultarOrigem = "";
  if (equipamentos) {
    const sel = $("#eq-ocultar-origem"), anterior = sel.value;
    const ferramentas = [...new Set(todos.map((x) => x.f.origem).filter(Boolean))].sort(_pt);
    sel.classList.toggle("oculto", !ferramentas.length);
    sel.replaceChildren(new Option("Mostrar todas as origens", ""), ...ferramentas.map((f) => new Option(`Ocultar ${f}`, f)));
    if (ferramentas.includes(anterior)) sel.value = ocultarOrigem = anterior;
  }
  const ord = bibOrdemLer(BIB.sec); bibBarraOrdem(ord, S, rot, tem);
  const lista = todos.filter((x) => (!q || String(x.f.busca).toLowerCase().includes(q)) && (!BIB.ft || x.f.tipo === BIB.ft) &&
                                    (!BIB.fc || x.f.cliente === BIB.fc) && (!BIB.tag || (x.f.tags || []).includes(BIB.tag)) &&
                                    (!ocultarOrigem || x.f.origem !== ocultarOrigem));
  lista.sort(bibComparador(ord, S));
  info.innerHTML = `<b>${lista.length}</b> ${S.unid}` + (lista.length !== todos.length ? ` de ${todos.length}` : "") +
    (BIB.sec === "evidencias" && BIB.filtroEv ? ` da sessão · <a href="#" id="bib-tudo">ver todas</a>` : "");
  const t = $("#bib-tudo"); if (t) t.onclick = (ev) => { ev.preventDefault(); BIB.filtroEv = null; desenharBib(); };
  let alvo = L, det = null;
  if (S.detalhe && !acoes) {
    L.className = "bib-lista bib-split";
    alvo = document.createElement("div"); alvo.className = "bib-col"; det = document.createElement("aside"); det.className = "bib-det";
    L.append(alvo, det);
  }
  if (equipamentos) {
    fecharLoteEquip();
    const w = document.createElement("div"); w.id = "eq-linhas";
    L.appendChild(w); alvo = w;
    if (lista.length) {
      if (bibDesktop.matches) {
        const cab = document.createElement("div"); cab.className = "eq-linha bib-colunas";
        cab.setAttribute("aria-hidden", "true");
        cab.innerHTML = "<span>Tipo e nome</span><span>Destino</span><span>Grupo e origem</span><span>Último uso</span>";
        L.insertBefore(cab, w);
      }
      return desenharListaSelecionavel(w, lista, ord.g, !!q, tinhaFoco, {
        estado: EQ_LISTA, titulo: "Equipamentos salvos", id: ({ raw }) => raw.id,
        grupos: ({ raw, f }, g) => g === "cliente" ? partesGrupoEquip(raw.grupo) : [f.tipo],
        linha: ({ raw }, g) => linhaEquip(raw, g), atualizar: atualizaBarraEquip, cancelar: fecharLoteEquip,
        abrir: (id) => { if (!EQ_LISTA.ocupada) conectarEquip(EQ.find((e) => e.id === id)); }, remover: () => acaoEquip("remover")
      });
    }
    EQ_LISTA.selecionados.clear(); EQ_LISTA.ancora = null;
    atualizaBarraEquip();
    if (tinhaFoco) $("#bib-busca").focus();
  }
  if (acoes) {
    desenharLinhasBib(L, lista, ord.g, !!q, tinhaFoco, acoes);
    if (lista.length) return;
  }
  if (!lista.length) {
    const filtrado = todos.length > 0;
    alvo.innerHTML = `<div class="bib-vazio"><span>${filtrado ? "🔍" : "📭"}</span><b>${filtrado ? "Nada encontrado com essa busca / filtro" : esc(acoes ? VAZIO_BIB[BIB.sec] : S.vazio)}</b>
      ${filtrado ? `<button class="btn mini" data-limpar>Limpar busca e filtros</button>` : ""}</div>`;
    const lb = alvo.querySelector("[data-limpar]");
    if (lb) lb.onclick = () => { $("#bib-busca").value = ""; $("#eq-ocultar-origem").value = ""; BIB.ft = BIB.fc = BIB.tag = ""; desenharBib(); };
    if (acoes && !filtrado && !BIB.filtroEv && ["evidencias", "relatorios"].includes(BIB.sec)) {
      const b = document.createElement("button"), captura = BIB.sec === "evidencias";
      b.className = "btn mini"; b.textContent = captura ? "Ir para Salvar evidência" : "Ir para Relatório";
      b.onclick = () => { $("#modal-bib").classList.add("oculto"); $(captura ? "#salvar" : "#btn-relatorio").focus(); };
      alvo.querySelector(".bib-vazio").append(b);
    }
    if (det) det.remove();
    return;
  }
  if (S.grade) L.className = "bib-lista bib-grade";
  if (det && !lista.slice(0, BIB.limite).some((x) => x.f.nome === BIB.sel)) BIB.sel = lista[0].f.nome;
  let grupo = null;
  lista.slice(0, BIB.limite).forEach((x) => {
    if (ord.g) {
      const g = x.f[ord.g] || (ord.g === "cliente" ? `Sem ${(rot.cliente || "cliente").toLowerCase()}` : "Outros");
      if (g !== grupo) { const h = document.createElement("div"); h.className = "bib-grupo"; h.textContent = g; alvo.appendChild(h); grupo = g; }
    }
    const c = S.cartao(x.raw);
    if (det) {
      c.classList.add("bib-clic"); if (BIB.sel === x.f.nome) c.classList.add("sel");
      c.addEventListener("click", (ev) => { if (ev.target.closest("button")) return; BIB.sel = x.f.nome; L.querySelectorAll(".bib-item.sel").forEach((y) => y.classList.remove("sel")); c.classList.add("sel"); det.innerHTML = ""; det.appendChild(S.detalhe(x.raw)); });
    }
    alvo.appendChild(c);
  });
  bibMostrarMais(alvo, lista.length);
  if (det) det.appendChild(S.detalhe(lista.find((x) => x.f.nome === BIB.sel).raw));
}
function bibMostrarMais(alvo, total) {
  const restantes = total - BIB.limite;
  if (restantes <= 0) return;
  const b = document.createElement("button"); b.className = "btn bib-mais"; b.textContent = `Mostrar mais ${Math.min(150, restantes)} de ${restantes}`;
  b.onclick = () => { BIB.limite += 150; desenharBib(); }; alvo.appendChild(b);
}
const VAZIO_BIB = {
  sessoes: "O histórico reúne as conexões deste PC. Abra uma conexão para registrar a primeira sessão.",
  gravacoes: "Assista aqui às sessões gravadas. Ative Gravar no cartão Evidência antes de usar o terminal.",
  logs: "Leia aqui a saída registrada do terminal. Abra uma sessão com gravação para guardar o primeiro log.",
  evidencias: "As capturas deste atendimento aparecem aqui. Use Salvar evidência no terminal para guardar a primeira.",
  relatorios: "Os PDFs gerados para este cliente aparecem aqui. Use Relatório no cartão Evidência para criar o primeiro.",
  skills: "As Skills reúnem comandos por finalidade. Adicione uma Skill à pasta roteiros para começar."
};
const BIB_ACAO = {
  assistir: { nome: "Assistir", pode: r => r.grav_existe, usar: r => tocarGravacao(r.gravacao, `${r.nome} — ${_dt(r.inicio)}`) },
  log: { nome: "Ler o log", pode: r => r.log_existe, usar: verLogBib },
  reconectar: { nome: "Reconectar", usar: r => { $("#modal-bib").classList.add("oculto"); reconectar(r); } },
  capturas: { nome: "Ver evidências", pode: r => r.evidencias?.length, usar: r => {
    BIB.filtroEv = r.evidencias.map(Number); $("#bib-busca").value = ""; irBib("evidencias");
  } },
  excluirSessao: { nome: "Excluir", varios: true, pode: r => !r.ativa,
    usar: r => excluirSessao(r, async () => { BIB.hist = await api.historico(); bibContagens(); desenharBib(); }),
    usarVarios: rs => excluirSessoes(rs, async () => { BIB.hist = await api.historico(); bibContagens(); desenharBib(); }) },
  evidencia: { nome: "Ver evidência", usar: e => verEvidencia({ ...e, cmd: e.comando, mini: "" }, null) },
  excluirEvidencia: { nome: "Excluir", varios: true, usar: e => excluirEvidencia(e), usarVarios: es => excluirEvidencias(es) },
  pdf: { nome: "Abrir aqui", usar: r => { $("#modal-bib").classList.add("oculto"); abrirPdf(r.caminho); } },
  leitor: { nome: "Abrir no leitor de PDF", usar: r => api.abrir_arquivo(r.caminho) },
  nuvemEvidencia: { nome: "Enviar para minha nuvem", pode: e => !!e.caminho, usar: e => nuvEnviar(e.caminho, "evidencia") },
  nuvemRelatorio: { nome: "Enviar para minha nuvem", pode: r => !!r.caminho, usar: r => nuvEnviar(r.caminho, "relatorio") },
  nuvemGravacao: { nome: "Enviar gravação para minha nuvem", pode: r => !!(r.grav_existe && r.gravacao), usar: r => nuvEnviar(r.gravacao, "gravacao") },
  skill: { nome: "Abrir para executar na aba ativa", usar: async r => {
    $("#modal-bib").classList.add("oculto"); await abrirRoteiros();
    const li = [...$("#rot-lista").querySelectorAll(".rot-item")].find(x =>
      x.dataset.arquivo === String(r.arquivo) && x.dataset.origem === (r.origem || "") && x.querySelector("b").textContent === r.nome);
    if (li) li.click();
  } }
};
const ACOES_BIB = {
  sessoes: ["reconectar", "assistir", "log", "capturas", "excluirSessao"],
  gravacoes: ["assistir", "log", "reconectar", "capturas", "nuvemGravacao", "excluirSessao"], logs: ["log"],
  evidencias: ["evidencia", "nuvemEvidencia", "excluirEvidencia"], relatorios: ["pdf", "leitor", "nuvemRelatorio"], skills: ["skill"]
};
function linhaAtendimento({ raw: r, f }, agrupamento) {
  const linha = document.createElement("div"); linha.className = "eq-linha bib-linha";
  const nome = f.nome || f.tipo;
  const cliente = agrupamento === "cliente" ? "" : f.cliente;   // dentro do grupo o cliente já está no cabeçalho
  let selo = "", meta = [cliente, _dt(f.data)], extra = "";
  if (["sessoes", "gravacoes", "logs"].includes(BIB.sec)) {
    if (nome.toLowerCase() !== f.tipo.toLowerCase()) selo = `<span class="eq-tipo">${esc(f.tipo)}</span>`;
    else linha.classList.add("bib-so-tipo");
    meta.push(duracao(r.inicio, r.fim), r.ativa && "Aberta agora");
    if (BIB.sec !== "logs" && r.evidencias?.length) meta.push(r.evidencias.map(n => "Nº " + pad2(n)).join(", "));
    if (Object.hasOwn(CORES_GUIA, r.etiqueta)) extra = `<span class="bib-etiqueta" style="--cor-etiqueta:${CORES_GUIA[r.etiqueta]}"><span aria-hidden="true">◆</span>${esc(r.etiqueta)}</span>`;
  } else if (BIB.sec === "skills") {
    selo = _selo(r); meta = [cliente, pl(r.comandos.length, "comando")];
  } else if (BIB.sec === "evidencias") {
    selo = `<span class="eq-tipo">Nº ${esc(pad2(r.num))}</span>`;
  } else {
    selo = `<span class="eq-tipo">${esc(f.tipo)}</span>`; meta.push(`${Math.max(1, Math.round(r.tamanho / 1024))} KB`);
  }
  linha.innerHTML = `<span class="eq-nome">${selo}<b>${esc(nome)}</b>${extra}</span><small class="bib-meta">${esc(meta.filter(Boolean).join(" · "))}</small>`;
  if (BIB.sec === "evidencias") {
    const img = document.createElement("img"); img.alt = ""; linha.prepend(img);
    api.miniatura(r.caminho).then(m => { if (m) img.src = m; });
  }
  return linha;
}
function desenharLinhasBib(L, lista, grupo, buscando, tinhaFoco, acoes) {
  const barra = $("#bib-acoes"), estado = BIB.selecao, sec = BIB.sec;
  const itens = lista.slice(0, BIB.limite), chave = ({ raw, i }) => String(raw.caminho || raw.id || i);
  const porId = new Map(itens.map(x => [chave(x), x.raw]));
  const coluna = document.createElement("div"), linhas = document.createElement("div");
  coluna.className = "bib-col"; coluna.append(linhas); L.append(coluna);
  const det = sec === "skills" ? document.createElement("aside") : null;
  if (det) det.className = "bib-det";
  const escolhidos = () => [...estado.selecionados].map(id => porId.get(id)).filter(Boolean);
  const unico = () => { const rs = escolhidos(); return rs.length === 1 ? rs[0] : null; };
  const permitido = (acao, rs) => rs.length > 0 && (acao.varios || rs.length === 1) && rs.every(r => !acao.pode || acao.pode(r));
  barra.replaceChildren();
  const botoes = acoes.map((k, i) => {
    const b = document.createElement("button"), acao = BIB_ACAO[k];
    b.type = "button"; b.className = "btn mini" + (i === 0 ? " primario" : "") + (k.startsWith("excluir") ? " perigo" : "");
    b.dataset.acao = k; b.textContent = acao.nome;
    b.onclick = () => { const rs = escolhidos(); if (permitido(acao, rs)) (rs.length > 1 ? acao.usarVarios(rs) : acao.usar(rs[0])); };
    barra.append(b); return b;
  });
  const contagem = document.createElement("span"); contagem.id = "bib-selecao"; contagem.setAttribute("role", "status"); contagem.setAttribute("aria-atomic", "true");
  barra.append(contagem);
  const atualizar = () => {
    const rs = escolhidos(), r = rs.length === 1 ? rs[0] : null;
    botoes.forEach((b, i) => { b.disabled = !permitido(BIB_ACAO[acoes[i]], rs); });
    contagem.textContent = pl(estado.selecionados.size, "selecionado");
    if (det) {
      L.classList.toggle("bib-com-detalhe", !!r);
      if (r) { det.replaceChildren(detalheSkill(r, false)); L.append(det); } else det.remove();
    }
  };
  if (!itens.length) {
    estado.selecionados.clear(); estado.ancora = estado.foco = null; atualizar();
    if (tinhaFoco) $("#bib-busca").focus();
    return;
  }
  desenharListaSelecionavel(linhas, itens, grupo, buscando, tinhaFoco, {
    estado, titulo: BIB_TIT[sec], id: chave, grupos: ({ f }, g) => [f[g] || "Sem grupo"], linha: (x, g) => linhaAtendimento(x, g), atualizar,
    abrir: id => { const r = porId.get(id), acao = BIB_ACAO[acoes[0]]; if (r && permitido(acao, [r])) acao.usar(r); },
    remover: () => botoes.find(b => b.dataset.acao.startsWith("excluir"))?.click()
  });
  bibMostrarMais(coluna, lista.length);
}
// Cartões da interface de toque.
function cartaoSessao(r) {
  const c = document.createElement("div"); c.className = "bib-item";
  const etiqueta = Object.hasOwn(CORES_GUIA, r.etiqueta) ? r.etiqueta : "";
  const evs = (r.evidencias || []).map((n) => `<button class="bib-chip" data-ev="${esc(n)}" title="Ver a evidência Nº ${pad2(n)}">Nº ${pad2(n)}</button>`).join("");
  c.innerHTML = `<div class="bib-l1"><span class="tipo">${esc(nomeTipo(r.tipo))}</span> <b>${esc(r.nome)}</b>
      ${etiqueta ? `<span class="bib-etiqueta" style="--cor-etiqueta:${CORES_GUIA[etiqueta]}"><span aria-hidden="true">◆</span>${esc(etiqueta)}</span>` : ""}
      <span class="bib-meta">${_dt(r.inicio)} · ${duracao(r.inicio, r.fim)}${r.cliente ? " · " + esc(r.cliente) : ""}${r.ativa ? " · <b style='color:var(--verde)'>aberta agora</b>" : ""}</span></div>
    <div class="bib-l2">${evs || `<span class="bib-meta">sem evidências</span>`}</div>
    <div class="bib-acoes"><button class="btn mini" data-grav ${r.grav_existe ? "" : "disabled"}>▶ Assistir</button>
      <button class="btn mini" data-log ${r.log_existe ? "" : "disabled"}>📜 Ler o log</button>
      <button class="btn mini" data-rc>↻ Reconectar</button></div>`;
  c.querySelector("[data-grav]").onclick = () => BIB_ACAO.assistir.usar(r);
  c.querySelector("[data-log]").onclick = () => verLogBib(r);
  c.querySelector("[data-rc]").onclick = () => BIB_ACAO.reconectar.usar(r);
  c.querySelectorAll("[data-ev]").forEach((b) => (b.onclick = () => { BIB.filtroEv = (r.evidencias || []).map(Number); irBib("evidencias"); }));
  return c;
}
function cartaoEvidencia(e) {
  const c = document.createElement("button"); c.className = "bib-ev";
  c.innerHTML = `<div class="bib-mini"><img alt=""></div><b>Nº ${pad2(e.num || 0)}</b><span>${esc(e.comando || e.host || e.arquivo)}</span><small>${_dt(e.data_hora)}${e.host ? " · " + esc(e.host) : ""}</small>`;
  api.miniatura(e.caminho).then((m) => { if (m) c.querySelector("img").src = m; });
  c.onclick = () => BIB_ACAO.evidencia.usar(e);
  return c;
}
function cartaoLog(r) {
  const c = document.createElement("div"); c.className = "bib-item bib-clic";
  c.innerHTML = `<div class="bib-l1"><span class="tipo">${esc(nomeTipo(r.tipo))}</span> <b>${esc(r.nome)}</b>
      <span class="bib-meta">${_dt(r.inicio)} · ${duracao(r.inicio, r.fim)}${r.cliente ? " · " + esc(r.cliente) : ""}</span></div>
    <div class="bib-acoes"><button class="btn mini" data-ler>📜 Ler aqui</button></div>`;
  c.onclick = () => verLogBib(r);
  return c;
}
function cartaoRelatorio(r) {
  const c = document.createElement("div"); c.className = "bib-item";
  c.innerHTML = `<div class="bib-l1"><b>📄 ${esc(r.arquivo)}</b>${r.assinado ? ` <span class="bib-chip ok" title="Documento íntegro; identidade declarada pelo assinante">✍ assinado</span>` : r.assinatura_invalida ? ` <span class="bib-chip" title="O PDF foi alterado depois de assinado">⚠ assinatura inválida</span>` : ""}
      <span class="bib-meta">${esc(r.visita)} · ${_dt(r.data)} · ${Math.max(1, Math.round(r.tamanho / 1024))} KB</span></div>
    <div class="bib-acoes"><button class="btn mini" data-ver>Abrir aqui</button><button class="btn mini" data-ext>Abrir no leitor de PDF</button></div>`;
  c.querySelector("[data-ver]").onclick = () => BIB_ACAO.pdf.usar(r);
  c.querySelector("[data-ext]").onclick = () => BIB_ACAO.leitor.usar(r);
  return c;
}
const _selo = (r) => ehConfig(r) ? `<span class="bib-selo cfg">⚙ configuração</span>` : `<span class="bib-selo col">🔎 coleta</span>`;
function cartaoSkill(r) {
  const c = document.createElement("div"); c.className = "bib-item bib-skill";
  c.innerHTML = `<div class="bib-l1 bib-l1-sp"><b>${esc(r.nome)}</b>${_selo(r)}</div>
    <div class="bib-meta">${esc(r.fabricante || "Outros")} · ${(r.comandos || []).length} comando(s)</div>`;
  return c;
}
function detalheSkill(r, mostrarAcao = true) {
  const d = document.createElement("div"); d.className = "bib-det-in";
  const cmds = (r.comandos || []).slice(0, 40);
  d.innerHTML = `<div class="bib-det-cab">${_selo(r)}<h3>${esc(r.nome)}</h3>
      <div class="bib-meta">${esc(r.fabricante || "Outros")} · ${pl((r.comandos || []).length, "comando")}${r.somente_leitura ? " · somente leitura" : ""}</div></div>
    ${ehConfig(r) ? `<div class="bib-det-aviso">⚠ Altera a configuração do equipamento: o app mostra a prévia e pede autorização antes de aplicar.</div>` : ""}
    ${r.descricao ? `<p class="bib-det-desc">${esc(r.descricao)}</p>` : ""}
    ${(r.finalidade || []).length ? `<div class="bib-det-sec">Finalidade</div><div class="bib-l2">${r.finalidade.map((f) => `<span class="bib-chip">${esc(f)}</span>`).join("")}</div>` : ""}
    <div class="bib-det-sec">Comandos</div>
    <ol class="bib-det-cmds">${cmds.map((x) => `<li><code>${esc(x.cmd || "")}</code></li>`).join("")}${(r.comandos || []).length > cmds.length ? `<li class="bib-meta">… e mais ${(r.comandos || []).length - cmds.length}</li>` : ""}</ol>
    ${mostrarAcao ? '<div class="bib-acoes"><button class="btn primario" data-usar>▶ Abrir para executar na aba ativa</button></div>' : ""}`;
  if (mostrarAcao) d.querySelector("[data-usar]").onclick = () => BIB_ACAO.skill.usar(r);
  return d;
}
function cartaoCofre(c) {
  const d = document.createElement("div"); d.className = "bib-item";
  d.innerHTML = `<div class="bib-l1"><span class="tipo">🔑</span> <b>${esc(c.nome)}</b>
      <span class="bib-meta">usuário: ${esc(c.usuario) || "—"} · vale para: ${esc(c.alvo) || "qualquer"}${c.atualizado ? " · alterada " + _dt(c.atualizado) : ""}</span></div>
    <div class="bib-l2 bib-meta">senha: •••••••• (nunca aparece na tela; é digitada direto na conexão)</div>
    <div class="bib-acoes"><button class="btn mini" data-e>✎ Editar</button><button class="btn mini" data-r>🗑 Excluir</button></div>`;
  d.querySelector("[data-e]").onclick = () => formCofre(c);
  d.querySelector("[data-r]").onclick = async (ev) => {
    const b = ev.currentTarget; if (b.dataset.conf !== "1") { b.dataset.conf = "1"; b.textContent = "Confirmar?"; return; }
    const r = await cofreChamar("cofre_remover", c.id);
    if (!r.ok) toast(r.erro, "erro"); else toast(`Removida do cofre: ${c.nome}`);
    bibContagens(); desenharBib();
  };
  return d;
}
// ---- seção 🔑 Cofre trancada: pede o PIN aqui mesmo (ou cria no 1º acesso) ----
function desenharPinBib() {
  const L = $("#bib-lista"), est = BIB.pinEst || {}, modo = BIB.pinModo || (est.definido ? "abrir" : "definir");
  $("#bib-info").textContent = modo === "trocar" ? "" : "🔒 trancado";
  const voltar = modo === "trocar" || modo === "esqueci";
  L.innerHTML = `<form class="bib-pin" autocomplete="off"><b class="bib-pin-tit">${PIN_TXT[modo][0]}</b>
      <div class="form sem-borda">${pinCamposHtml(est, modo, modo === "abrir" ? "As credenciais (até os nomes) só aparecem depois do PIN do cofre." : "")}</div>
      <div class="linha-btn">${voltar ? `<button type="button" class="btn" data-voltar>Voltar</button>` : ""}<button type="submit" class="btn primario">${PIN_TXT[modo][1]}</button></div></form>`;
  const f = L.querySelector("form");
  pinLigar(f, est, modo, (n) => { BIB.pinModo = n; desenharBib(); });
  const v = f.querySelector("[data-voltar]");
  if (v) v.onclick = () => { BIB.pinModo = null; desenharBib(); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    if (await pinEnviar(f, modo)) { BIB.pinModo = null; bibContagens(); desenharBib(); }
    else BIB.pinEst = await api.cofre_pin_estado(null);
  };
}
new MutationObserver(() => {   // fechou a Biblioteca (✕, clique fora, conectar…): o cofre tranca
  if ($("#modal-bib").classList.contains("oculto") && BIB.sec === "cofre" && COFRE.token) { cofreTrancar(); limparFormCofre(); }
}).observe($("#modal-bib"), { attributes: true, attributeFilter: ["class"] });
$("#bib-f-cli").addEventListener("change", (e) => { BIB.fc = e.target.value; BIB.limite = 150; BIB.sel = null; desenharBib(); });
document.querySelectorAll(".bib-ord [data-o]").forEach((b) => b.addEventListener("click", () => {
  const o = bibOrdemLer(BIB.sec), novo = b.dataset.o;
  bibOrdemGravar(BIB.sec, { ...o, o: novo, inv: o.o === novo ? !o.inv : false }); desenharBib();
}));
$("#bib-grupo").addEventListener("change", (e) => { bibOrdemGravar(BIB.sec, { ...bibOrdemLer(BIB.sec), g: e.target.value }); desenharBib(); });
async function verLogBib(r) {
  if (BIB.sec !== "logs") irBib("logs");
  const selecao = BIB.selecao;
  $("#bib-acoes").classList.add("oculto");
  $("#bib-lista").innerHTML = `<p class="vazio">Abrindo o log…</p>`;
  const x = await api.log_ler(r.id);
  if (BIB.sec !== "logs" || BIB.selecao !== selecao) return;
  if (!x.ok) { toast(x.erro, "erro"); BIB.log = null; return desenharBib(); }
  BIB.log = { r, texto: x.texto, arquivo: x.arquivo, cortado: x.cortado }; $("#bib-busca").value = ""; desenharBib();
}
function desenharLogBib(q) {
  const { r, texto, arquivo, cortado } = BIB.log, L = $("#bib-lista");
  const linhas = texto.split(/\r?\n/), achadas = q ? linhas.filter((l) => l.toLowerCase().includes(q)).length : 0;
  $("#bib-info").innerHTML = `<a href="#" id="bib-voltar">← logs</a> · <b>${esc(r.nome)}</b> · ${esc(arquivo)} · ${linhas.length} linha(s)` + (q ? ` · <b>${achadas}</b> com "${esc(q)}"` : "") + (cortado ? " · (mostrando os primeiros 2 MB)" : "");
  $("#bib-voltar").onclick = (ev) => { ev.preventDefault(); BIB.log = null; $("#bib-busca").value = ""; desenharBib(); };
  const qe = esc(q || "");
  const marca = (l) => { const e = esc(l); if (!q) return e; const i = e.toLowerCase().indexOf(qe.toLowerCase()); return i < 0 ? e : e.slice(0, i) + "<mark>" + e.slice(i, i + qe.length) + "</mark>" + e.slice(i + qe.length); };
  L.className = "bib-lista"; L.innerHTML = `<pre class="bib-log">${linhas.map((l, i) => `<span class="${q && l.toLowerCase().includes(q) ? "achou" : ""}"><i>${i + 1}</i>${marca(l)}</span>`).join("\n")}</pre>`;
  const p = L.querySelector(".achou"); if (p) p.scrollIntoView({ block: "center" });
}
$("#bib-nav").querySelectorAll("[data-sec]").forEach((b) => (b.onclick = () => { BIB.filtroEv = null; irBib(b.dataset.sec); }));
$("#bib-busca").addEventListener("input", () => desenharBib());
bibDesktop.addEventListener("change", () => {
  if (!$("#modal-bib").classList.contains("oculto") && BIB.sec !== "cofre" && BIB.sec !== "importar") irBib(BIB.sec);
});
// ================= 📨 Canais de envio (e-mail / Telegram) =================
// Configura e testa os canais. Senha do e-mail e token do bot vão para o cofre DPAPI (Python) e NUNCA voltam
// para a tela: o campo fica vazio e "vazio = manter". O seletor de destino por aba usa api.enviar_destino().
const CANAIS = { atual: "email", lista: [] };
function canaisMsg(txt, cls = "") { const m = $("#canais-msg"); m.textContent = txt || ""; m.className = "canais-msg " + cls; }
function canaisCfg(nome) { return (CANAIS.lista.find((c) => c.canal === nome) || {}).config || {}; }
function canaisMostrar(nome) {
  CANAIS.atual = nome;
  document.querySelectorAll("#canais-abas [data-canal]").forEach((b) => b.classList.toggle("ativo", b.dataset.canal === nome));
  $("#cn-email").classList.toggle("oculto", nome !== "email");
  $("#cn-telegram").classList.toggle("oculto", nome !== "telegram");
  const item = CANAIS.lista.find((c) => c.canal === nome), sit = $("#canais-sit");
  sit.textContent = item && item.configurado ? "✔ configurado" : "não configurado";
  sit.className = "canais-sit" + (item && item.configurado ? " ok" : "");
  $("#cn-alvo-teste").placeholder = nome === "email" ? "e-mail (vazio = só confere o login)" : "chat_id (vazio = só confere o token)";
  document.querySelectorAll("#modal-canais .invalido").forEach((e) => e.classList.remove("invalido"));
  canaisMsg("");
}
function canaisPreencher() {
  const e = canaisCfg("email"), t = canaisCfg("telegram");
  $("#cn-em-servidor").value = e.servidor || ""; $("#cn-em-porta").value = e.porta || "";
  $("#cn-em-seguranca").value = e.seguranca || "starttls"; $("#cn-em-usuario").value = e.usuario || "";
  $("#cn-em-remetente").value = e.remetente || ""; $("#cn-em-nome").value = e.nome_remetente || "";
  $("#cn-em-padrao").value = e.padrao || ""; $("#cn-em-senha").value = "";
  $("#cn-em-senha").placeholder = e.tem_senha ? "•••••••• guardada no cofre (vazio = manter)" : "senha (ou senha de app)";
  $("#cn-tg-token").value = ""; $("#cn-tg-padrao").value = t.padrao || ""; $("#cn-tg-arquivo").checked = !!t.foto_como_arquivo;
  $("#cn-tg-token").placeholder = t.tem_token ? "•••••••• guardado no cofre (vazio = manter)" : "123456789:AA… (do @BotFather)";
  $("#cn-tg-chats").innerHTML = "";
}
function canaisDados() {
  if (CANAIS.atual === "email") {
    const seg = $("#cn-em-seguranca").value;
    return { servidor: $("#cn-em-servidor").value.trim(), porta: Number($("#cn-em-porta").value) || (seg === "ssl" ? 465 : 587),
             seguranca: seg, usuario: $("#cn-em-usuario").value.trim(), senha: $("#cn-em-senha").value,
             remetente: $("#cn-em-remetente").value.trim(), nome_remetente: $("#cn-em-nome").value.trim(),
             padrao: $("#cn-em-padrao").value.trim() };
  }
  return { token: $("#cn-tg-token").value.trim(), padrao: $("#cn-tg-padrao").value.trim(), foto_como_arquivo: $("#cn-tg-arquivo").checked };
}
// mesma validação do Python (envio.py) — aqui só para marcar o campo errado na hora
function canaisValidar(d) {
  const err = [], marca = (sel, msg) => { $(sel).classList.add("invalido"); err.push(msg); };
  document.querySelectorAll("#modal-canais .invalido").forEach((e) => e.classList.remove("invalido"));
  const email = (x) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(x);
  if (CANAIS.atual === "email") {
    if (!d.servidor) marca("#cn-em-servidor", "Informe o servidor SMTP.");
    if (!(d.porta >= 1 && d.porta <= 65535)) marca("#cn-em-porta", "Porta inválida.");
    const rem = d.remetente || d.usuario;
    if (!rem || !email(rem)) marca(d.remetente ? "#cn-em-remetente" : "#cn-em-usuario", "Informe o e-mail do remetente.");
    if (d.usuario && !d.senha && !canaisCfg("email").tem_senha) marca("#cn-em-senha", "Informe a senha (ou senha de app).");
    const ruins = d.padrao.split(/[,;]/).map((x) => x.trim()).filter(Boolean).filter((x) => !email(x));
    if (ruins.length) marca("#cn-em-padrao", "Destinatário inválido: " + ruins[0]);
  } else {
    if (d.token && !/^\d+:[\w-]{20,}$/.test(d.token)) marca("#cn-tg-token", "Token inválido (formato 123456789:AA…).");
    if (!d.token && !canaisCfg("telegram").tem_token) marca("#cn-tg-token", "Informe o token do bot.");
    if (d.padrao && !/^(-?\d{3,}|@\w{4,})$/.test(d.padrao)) marca("#cn-tg-padrao", "chat_id inválido (número ou @canal).");
  }
  return err;
}
async function abrirCanais() {
  abrirModal("#modal-canais");
  try { CANAIS.lista = api ? await api.envio_canais() : []; } catch (e) { CANAIS.lista = []; }
  canaisPreencher(); canaisMostrar(CANAIS.atual);
}
// Servidor/usuário/porta/API mudou sem o segredo: o backend não gravou nada; destaca o campo e pede de novo (o segredo só vive no campo)
function canaisSegredoNecessario() {
  const campo = $(CANAIS.atual === "email" ? "#cn-em-senha" : "#cn-tg-token");
  document.querySelectorAll("#modal-canais .invalido").forEach((e) => e.classList.remove("invalido"));
  campo.classList.add("invalido"); campo.value = ""; campo.focus();
  canaisMsg("Você mudou o servidor: por segurança, digite a " + (CANAIS.atual === "email" ? "senha" : "token") + " de novo.", "erro");
}
async function canaisSalvar() {
  const d = canaisDados(), err = canaisValidar(d);
  if (err.length) { canaisMsg(err[0], "erro"); return false; }
  if (!api) { canaisMsg("Indisponível fora do aplicativo.", "erro"); return false; }
  canaisMsg("Salvando…");
  const r = await api.envio_configurar(CANAIS.atual, d);
  if (r.segredo_necessario) { canaisSegredoNecessario(); return false; }   // servidor mudou: nada foi gravado
  if (!r.ok) { canaisMsg(r.erro || "Não foi possível salvar.", "erro"); return false; }
  CANAIS.lista = r.canais || CANAIS.lista; canaisPreencher(); canaisMostrar(CANAIS.atual);
  canaisMsg("✔ Salvo. Segredo guardado no cofre do Windows.", "ok"); return true;
}
(function ligarCanais() {
  if (!$("#modal-canais")) return;
  $("#btn-canais").onclick = (ev) => { ev.stopPropagation(); abrirCanais(); };
  $("#modal-canais [data-fecha]").onclick = (ev) => fecharModal(ev.target);
  document.querySelectorAll("#canais-abas [data-canal]").forEach((b) => (b.onclick = () => canaisMostrar(b.dataset.canal)));
  $("#cn-em-seguranca").onchange = () => { const p = $("#cn-em-porta");
    if (!p.value || p.value === "587" || p.value === "465") p.value = $("#cn-em-seguranca").value === "ssl" ? 465 : 587; };
  $("#cn-salvar").onclick = canaisSalvar;
  $("#cn-testar").onclick = async () => {
    const d = canaisDados();
    const cf = canaisCfg("email");
    const novo = CANAIS.atual === "email" ? !!(d.senha || d.servidor !== (cf.servidor || "") || d.usuario !== (cf.usuario || "")
                                             || d.porta !== (cf.porta || d.porta) || d.seguranca !== (cf.seguranca || d.seguranca)) : !!d.token;
    if (novo && !(await canaisSalvar())) return;       // testa o que está na tela
    if (!api) return canaisMsg("Indisponível fora do aplicativo.", "erro");
    canaisMsg("Testando…");
    const r = await api.envio_testar(CANAIS.atual, $("#cn-alvo-teste").value.trim());
    canaisMsg(r.ok ? "✔ " + (r.msg || "Funcionou.") : "✖ " + (r.erro || "Falhou."), r.ok ? "ok" : "erro");
  };
  $("#cn-remover").onclick = async () => {
    if (!api || !confirm("Remover a configuração deste canal (inclui o segredo no cofre)?")) return;
    const r = await api.envio_configurar(CANAIS.atual, { remover: true });
    if (r.ok) { CANAIS.lista = r.canais; canaisPreencher(); canaisMostrar(CANAIS.atual); canaisMsg("Canal removido.", "ok"); }
  };
  $("#cn-tg-descobrir").onclick = async () => {
    const d = canaisDados();
    if (d.token && !(await canaisSalvar())) return;
    if (!api) return canaisMsg("Indisponível fora do aplicativo.", "erro");
    canaisMsg("Lendo as mensagens recebidas pelo bot…");
    const r = await api.envio_telegram_chats(), ul = $("#cn-tg-chats"); ul.innerHTML = "";
    if (!r.ok) return canaisMsg("✖ " + r.erro, "erro");
    (r.chats || []).forEach((c) => { const li = document.createElement("li");
      li.textContent = `${c.nome} · ${c.chat_id}`; li.title = "Usar este chat_id";
      li.onclick = () => { $("#cn-tg-padrao").value = c.chat_id; $("#cn-alvo-teste").value = c.chat_id; canaisMsg("chat_id escolhido — clique em Salvar."); };
      ul.appendChild(li); });
    canaisMsg(r.chats && r.chats.length ? "Clique no chat para usar o chat_id." : r.dica, r.chats && r.chats.length ? "ok" : "");
  };
})();

// ---------- importarUI: importar sessões de outras ferramentas (PuTTY, KiTTY, MobaXterm, SecureCRT, mRemoteNG, Termius…) ----------
// Fluxo: lista das ferramentas (achadas neste PC / "escolher arquivo") -> prévia com caixas -> grava só as marcadas.
// Nada de senha chega aqui: o backend devolve só nome, tipo, destino (usuario@host:porta / COMx:baud / URL), grupo e obs.
const importarUI = { itens: [], ferr: null, ocupado: false, mesclas: new Map() };
const importarUISit = { novo: "Novo", existe: "Já existe — mantido", repetido: "Repetido" };
function importarUIModo(fase) {
  $("#modal-bib").classList.toggle("importarUI-ativo", !!fase);
  $("#importarUI").classList.toggle("oculto", !fase);
  $("#importarUI-fase-ferr").classList.toggle("oculto", fase !== "ferr");
  $("#importarUI-previa").classList.toggle("oculto", fase !== "previa");
  $("#importarUI-voltar").classList.toggle("oculto", fase !== "previa");
}
async function importarUIAbrir() {
  if (!api) return toast("Disponível no aplicativo", "aviso");
  $("#eq-form").classList.add("oculto");
  if (BIB.sec !== "importar") return irBib("importar");   // a área própria da Biblioteca
  $("#importarUI-titulo").textContent = "Equipamentos";   // o título da seção já diz "Importar e exportar"
  $("#importarUI-cont").textContent = "";
  $("#importarUI-ferr").innerHTML = `<p class="importarUI-msg">Procurando as ferramentas neste computador…</p>`;
  importarUIModo("ferr");
  const r = await api.equip_importadores();
  if (!r || !r.ok) { $("#importarUI-ferr").innerHTML = `<p class="importarUI-msg">${esc((r && r.erro) || "Falha ao procurar")}</p>`; return; }
  const l = [...r.ferramentas].sort((a, b) => (b.encontrado - a.encontrado) || _pt(a.nome, b.nome));
  const achadas = l.filter((f) => f.encontrado).length;
  $("#importarUI-cont").innerHTML = `<b>${l.length}</b> ferramentas · <b>${achadas}</b> encontrada(s) neste computador · <b>${EQ.length}</b> equipamento(s) salvos`;
  const cor = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 55% var(--importacao-luz))`; };
  const sigla = (n) => n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || n.slice(0, 2).toUpperCase();
  $("#importarUI-ferr").innerHTML = l.map((f) => `<div class="importarUI-card${f.encontrado ? " achou" : ""}" data-f="${esc(f.id)}">
      <span class="importarUI-ic" style="--c:${cor(f.id)}">${esc(f.nome.length <= 6 ? f.nome.slice(0, 2) : sigla(f.nome))}</span>
      <div class="importarUI-txt"><b>${esc(f.nome)}</b>
        <span class="importarUI-tag${f.encontrado ? "" : " nao"}">${f.encontrado ? `● encontrado neste computador${f.fontes.length > 1 ? ` · ${f.fontes.length} fontes` : ""}` : "não encontrado — escolha o arquivo"}</span>
        <small title="${esc(f.fontes.map((x) => x.caminho).join("\n"))}">${esc(f.encontrado ? f.fontes.map((x) => x.caminho).join(" · ") : f.dica)}</small></div>
      <span class="importarUI-botoes">${f.encontrado ? `<button class="btn mini primario" data-auto>Ler daqui</button>` : ""}
      <button class="btn mini" data-arq>Escolher arquivo…</button></span></div>`).join("");
  $("#importarUI-ferr").querySelectorAll("[data-f]").forEach((c) => {
    const f = l.find((x) => x.id === c.dataset.f);
    const a = c.querySelector("[data-auto]"); if (a) a.onclick = () => importarUIPrevia(f, false);
    c.querySelector("[data-arq]").onclick = () => importarUIPrevia(f, true);
  });
}
async function importarUIPrevia(f, escolher) {
  if (importarUI.ocupado) return;
  importarUI.ocupado = true;
  try {
    const r = await api.equip_importar_de(f.id, !!escolher);
    if (r.cancelado) return;
    if (!r.ok) return toast(r.erro || "Não foi possível ler", "erro");
    importarUI.ferr = f;
    importarUI.mesclas.clear();
    importarUI.itens = (r.itens || []).map((e, i) => ({ ...e, _i: i, _sel: e.situacao === "novo" }));
    $("#importarUI-titulo").textContent = `📥 ${f.nome}: ${importarUI.itens.length} sessão(ões) encontrada(s)`;
    const av = [...(r.avisos || [])]; if (r.ignorados) av.unshift(`${r.ignorados} sessão(ões) ignorada(s)`);
    $("#importarUI-avisos").textContent = av.join(" · ");
    importarUIModo("previa"); importarUIDesenhar();
  } finally { importarUI.ocupado = false; }
}
function importarUIDesenhar() {
  const l = importarUI.itens;
  const porHost = new Map();
  for (const e of l) {
    const chave = e.host || e._i;
    if (!porHost.has(chave)) porHost.set(chave, []);
    porHost.get(chave).push(e);
  }
  const linha = (e) => `<tr data-i="${e._i}" class="sit-${e.situacao}">
      <td><input type="checkbox" data-sel ${e._sel ? "checked" : ""}></td><td><b>${esc(e.nome)}</b>${e.obs ? `<br><small>${esc(e.obs)}</small>` : ""}</td>
      <td><span class="eq-tipo t-${esc(e.tipo)}">${esc(nomeTipo(e.tipo))}</span></td><td class="mono">${esc(e.destino)}</td>
      <td>${esc(e.grupo)}</td><td><small class="importarUI-sit">${importarUISit[e.situacao] || ""}</small></td></tr>`;
  $("#importarUI-linhas").innerHTML = l.length ? [...porHost.values()].map((sessoes) => {
    const { host, host_total, grupos_host } = sessoes[0];
    const opcoes = (grupos_host || []).map((g) => `<option value="${esc(g)}" ${importarUI.mesclas.get(host) === g ? "selected" : ""}>${esc(g || "Sem grupo")}</option>`).join("");
    const aviso = host_total > 1 ? `<tr><td colspan="6"><b>${esc(host)}</b> · Este host aparece ${host_total} vezes
      <select class="btn mini" data-mesclar-host="${esc(host)}" aria-label="Mesclar sessões de ${esc(host)}">
        <option>Mesclar no grupo…</option>${opcoes}</select></td></tr>` : "";
    return aviso + sessoes.map(linha).join("");
  }).join("")
    : `<tr><td colspan="6" class="vazio">Nenhuma sessão SSH, Serial ou Web encontrada nesse arquivo.</td></tr>`;
  $("#importarUI-linhas").querySelectorAll("[data-mesclar-host]").forEach((sel) => {
    sel.onchange = () => {
      if (sel.selectedIndex === 0) importarUI.mesclas.delete(sel.dataset.mesclarHost);
      else importarUI.mesclas.set(sel.dataset.mesclarHost, sel.value);
    };
  });
  $("#importarUI-linhas").querySelectorAll("tr[data-i]").forEach((tr) => {
    tr.querySelector("[data-sel]").onchange = (ev) => { l[+tr.dataset.i]._sel = ev.target.checked; importarUIConta(); };
  });
  importarUIConta();
}
function importarUIConta() {
  const l = importarUI.itens, n = l.filter((e) => e._sel).length;
  $("#importarUI-conta").textContent = `${n} de ${l.length} selecionada(s) · ${l.filter((e) => e.situacao === "novo").length} nova(s)`;
  $("#importarUI-todos").checked = !!l.length && n === l.length;
  $("#importarUI-ok").disabled = !n;
}
async function importarUIConfirmar() {
  if (importarUI.ocupado) return;
  const sel = importarUI.itens.filter((e) => e._sel).map(({ nome, tipo, destino, grupo, obs }) => ({ nome, tipo, destino, grupo, obs }));
  if (!sel.length) return toast("Marque pelo menos uma sessão", "aviso");
  importarUI.ocupado = true;
  try {
    const r = await api.equip_importar_itens(sel, importarUI.ferr.id, Object.fromEntries(importarUI.mesclas));
    if (!r || !r.ok) return toast((r && r.erro) || "Falha ao importar", "erro");
    toast(`Importado de ${importarUI.ferr.nome}: ${r.novos} novo(s), ${r.atualizados} atualizado(s) — total ${r.total}`);
    EQ = await api.equip_listar(); irBib("equipamentos");
  } finally { importarUI.ocupado = false; }
}
(function importarUIIniciar() {
  if (!$("#importarUI")) return;
  $("#importarUI-abrir").onclick = importarUIAbrir;
  $("#importarUI-fechar").onclick = () => irBib("equipamentos");
  $("#importarUI-voltar").onclick = importarUIAbrir;
  $("#importarUI-ok").onclick = importarUIConfirmar;
  $("#importarUI-todos").onchange = (ev) => { importarUI.itens.forEach((e) => (e._sel = ev.target.checked)); importarUIDesenhar(); };
  $("#importarUI-so-novos").onclick = () => { importarUI.itens.forEach((e) => (e._sel = e.situacao === "novo")); importarUIDesenhar(); };

})();

// ================= 📨 Envio: o canal DA ABA pelos emblemas (WhatsApp · Telegram · E-mail) =================
// Cada canal se conecta como o WhatsApp: "Conectar" → (Telegram: cola o token do bot UMA vez e escolhe o chat na lista;
// E-mail: configura a conta UMA vez e escolhe/digita o destinatário) → o cartão mostra "conectado: <destino>" e o Enviar
// evidência já vai para lá. Cada aba tem o seu destino ({canal, alvo, nome}); a aba 1 pode estar no Telegram e a aba 2 no e-mail.
// Token e senha vão para o cofre DPAPI (Python) e nunca voltam para a tela.
const ENVIO_UI = { wa: { aberto: false, logado: false }, est: null, ultimaWa: "", timer: null, tgPoll: null, passo: null };
POR_ABA.envio_estado = 0;   // o sid da aba ativa vai junto
const ENVIO_PROVEDORES = {
  gmail: { rot: "Gmail", servidor: "smtp.gmail.com", porta: 587, seguranca: "starttls",
    dica: `Use uma <b>senha de app</b> (não a senha normal): Conta Google → Segurança → <b>Verificação em duas etapas</b> ligada →
      <b>Senhas de app</b> (myaccount.google.com/apppasswords). Cole os 16 caracteres aqui.` },
  outlook: { rot: "Outlook.com / Hotmail", servidor: "smtp-mail.outlook.com", porta: 587, seguranca: "starttls",
    dica: `Com verificação em duas etapas, crie uma <b>senha de app</b> em account.microsoft.com → Segurança. Algumas contas
      pessoais da Microsoft só aceitam login moderno e podem recusar — se isso acontecer, use o Gmail ou o e-mail da empresa.` },
  office365: { rot: "Office 365 (empresa)", servidor: "smtp.office365.com", porta: 587, seguranca: "starttls",
    dica: `O administrador precisa permitir <b>SMTP autenticado</b> nesta caixa (o Microsoft 365 vem com ele desligado).
      Com MFA, use uma <b>senha de app</b> se a empresa permitir.` },
  outro: { rot: "Outro", servidor: "", porta: 587, seguranca: "starttls",
    dica: `Pegue servidor, porta e segurança com o seu provedor (ex.: Zoho smtp.zoho.com 465 SSL; Yahoo smtp.mail.yahoo.com 465 SSL,
      com senha de app). STARTTLS na 587 é o mais comum.` },
};
const envioUIEmailOk = (x) => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(x);
const envioUIEmails = (t) => String(t || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
function envioUIMemoria(a) { if (!a.envioMem) a.envioMem = {}; return a.envioMem; }   // último destino de cada canal NESTA aba
function envioUICanal(nome) { return (ENVIO_UI.est && ENVIO_UI.est.canais && ENVIO_UI.est.canais[nome]) || {}; }
// estado de um canal: on (conectado) | aviso (falta um passo) | erro | off (desconectado)
function envioUISituacao(nome) {
  if (nome === "whatsapp") {
    const e = envioUICanal("whatsapp");
    if (ENVIO_UI.wa.aberto && ENVIO_UI.wa.logado) return e.falhou ? { cls: "erro", txt: "erro", dica: e.erro } : { cls: "on", txt: "conectado" };
    if (ENVIO_UI.wa.aberto) return { cls: "aviso", txt: "leia o QR code" };
    return { cls: "off", txt: "fechado" };
  }
  const c = envioUICanal(nome);
  if (!c.configurado) return { cls: "off", txt: "desconectado" };
  if (c.estado === "erro") return { cls: "erro", txt: "erro", dica: c.erro };
  return { cls: "on", txt: "conectado", dica: nome === "telegram" && c.bot ? `bot @${c.bot}` : c.conta || "" };
}
function envioUIRotulo(d) {
  if (!d || !d.alvo) return "";
  if (d.nome) return d.nome;
  if (d.canal !== "whatsapp") { const r = (envioUICanal(d.canal).recentes || []).find((x) => x.alvo === d.alvo); if (r && r.nome) return r.nome; }
  return d.alvo;
}
function envioUIRender(dPassado) {
  const card = $("#card-envio"); if (!card) return;
  const a = A(), d = (a && a.destino) || dPassado || { canal: "whatsapp", alvo: ENVIO_UI.ultimaWa || null };
  const canal = d.canal || "whatsapp";
  card.dataset.canal = canal;
  card.querySelectorAll(".envio-canal").forEach((b) => {
    const s = envioUISituacao(b.dataset.canal), sel = b.dataset.canal === canal;
    b.classList.toggle("sel", sel); b.setAttribute("aria-checked", sel ? "true" : "false");
    b.querySelector(".envio-pt").className = "envio-pt " + s.cls;
    b.dataset.estado = s.cls;
    b.setAttribute("aria-label", `${NOME_CANAL[b.dataset.canal]}: ${s.txt}${sel ? " (canal desta aba)" : ""}`);
  });
  const s = envioUISituacao(canal), st = $("#wa-status");
  st.textContent = canal === "whatsapp" ? s.txt : `${NOME_CANAL[canal]} · ${s.txt}`;
  st.className = "status-wa " + ({ on: "ok", aviso: "aviso", erro: "erro" }[s.cls] || "");
  st.title = s.dica || `Situação do ${NOME_CANAL[canal]}`;
  const c = $("#conversa"), rot = envioUIRotulo(d);
  if (rot) {
    c.innerHTML = `<span class="envio-pre">conectado:</span> <b>${esc(rot)}</b>${d.canal === "telegram" && rot !== d.alvo ? ` <small>${esc(d.alvo)}</small>` : ""}`;
    c.classList.add("ok");
  } else {
    c.textContent = canal === "whatsapp" ? "Nenhuma conversa conectada" : canal === "telegram" ? "Telegram: nenhum chat escolhido" : "E-mail: nenhum destinatário";
    c.classList.remove("ok");
  }
  c.classList.toggle("erro", s.cls === "erro" && !!rot);
  c.title = `${NOME_CANAL[canal]} — destino das evidências DESTA aba${d.alvo ? ": " + d.alvo : ""}` + (s.dica && s.cls === "erro" ? `\nÚltimo erro: ${s.dica}` : "");
  $("#envio-linha-wa").classList.toggle("oculto", canal !== "whatsapp");
  $("#envio-linha-outro").classList.toggle("oculto", canal === "whatsapp");
  if (canal !== "whatsapp") {
    const cfg = envioUICanal(canal).configurado;
    $("#envio-conectar").textContent = !cfg ? `Conectar ${NOME_CANAL[canal]}` : canal === "telegram" ? (d.alvo ? "Trocar chat" : "Escolher chat") : (d.alvo ? "Trocar destinatário" : "Escolher destinatário");
    $("#envio-desconectar").classList.toggle("oculto", !d.alvo);
  }
}
async function envioUIEstado() {
  if (!api || typeof api.envio_estado !== "function") return;
  try { const r = await api.envio_estado(); if (r && r.ok) ENVIO_UI.est = r; } catch (_) { return; }
  envioUIRender();
}
async function envioUIDefinir(canal, alvo, nome) {
  const a = A(); if (!a || !api) return null;
  const r = await api.destino_definir(canal, alvo || "", a.id, nome || "");
  if (!r || !r.ok) { toast((r && r.erro) || "Não foi possível trocar o destino", "erro"); return null; }
  await envioUIEstado();   // recentes atualizados
  atualizarWa({ sid: a.id, destino: r.destino, conversa: r.conversa });
  return r;
}
// clique no emblema: troca o canal DESTA aba (volta ao último destino desse canal nesta aba, ou o mais recente)
async function envioUIEscolher(canal) {
  const a = A(); if (!a) return toast("Abra uma aba primeiro", "aviso");
  if (!api) return toast("Indisponível fora do aplicativo", "aviso");
  const d = a.destino || {};
  if (d.canal === canal) { if (canal !== "whatsapp") envioUIConectar(canal); return; }
  const mem = envioUIMemoria(a)[canal] || {};
  let alvo = mem.alvo || "", nome = mem.nome || "";
  if (!alvo && canal === "whatsapp") alvo = ENVIO_UI.ultimaWa || "";
  if (!alvo && canal !== "whatsapp" && envioUICanal(canal).configurado) {
    const r = (envioUICanal(canal).recentes || [])[0];
    if (r) { alvo = r.alvo; nome = r.nome || ""; } else if (envioUICanal(canal).padrao) alvo = envioUICanal(canal).padrao.split(/[,;]/)[0].trim();
  }
  const r = await envioUIDefinir(canal, alvo, nome); if (!r) return;
  const rot = envioUIRotulo(r.destino);
  if (canal === "whatsapp") {
    if (rot) toast(`Esta aba envia pelo WhatsApp: ${rot}`);
    else toast("WhatsApp: clique em Abrir, escolha a conversa e depois em Conectar conversa", "aviso");
  } else if (!envioUICanal(canal).configurado || !rot) envioUIConectar(canal);
  else toast(`Esta aba envia pelo ${NOME_CANAL[canal]}: ${rot}`);
}

// ---------- janela "Conectar" (Telegram / E-mail) ----------
function envioUIModal() {
  let m = $("#modal-envio");
  if (m) return m;
  m = document.createElement("div"); m.className = "modal oculto"; m.id = "modal-envio";
  m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "ev-tit");
  m.innerHTML = `<div class="janela pequena envio-jan"><div class="jan-topo"><b id="ev-tit"></b><button class="sug-x" data-fecha title="Fechar">✕</button></div>
    <div class="jan-corpo" id="ev-corpo"></div><div class="canais-msg envio-msg" id="ev-msg" role="status" aria-live="polite"></div>
    <div class="jan-rodape" id="ev-rodape"></div></div>`;
  document.body.appendChild(m);
  m.querySelector("[data-fecha]").onclick = () => envioUIFechar();
  m.addEventListener("mousedown", (e) => { if (e.target === m) envioUIFechar(); });
  m.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); envioUIFechar(); } });
  return m;
}
function envioUIFechar() {
  clearInterval(ENVIO_UI.tgPoll); ENVIO_UI.tgPoll = null; ENVIO_UI.passo = null;
  const m = $("#modal-envio"); if (m) { m.classList.add("oculto"); $("#ev-corpo").innerHTML = ""; }
}
function envioUIMsg(txt, cls = "") { const e = $("#ev-msg"); if (e) { e.textContent = txt || ""; e.className = "canais-msg envio-msg " + cls; } }
function envioUIJanela(titulo, corpo, botoes) {
  const m = envioUIModal();
  $("#ev-tit").innerHTML = titulo; $("#ev-corpo").innerHTML = corpo; envioUIMsg("");
  const rod = $("#ev-rodape"); rod.innerHTML = "";
  (botoes || []).forEach(([rot, fn, cls]) => { const b = document.createElement("button"); b.type = "button";
    b.className = "btn " + (cls || ""); b.innerHTML = rot; b.onclick = fn; rod.appendChild(b); });
  m.classList.remove("oculto");
  setTimeout(() => { const f = m.querySelector("#ev-corpo input:not([type=checkbox]), #ev-corpo .envio-item"); if (f) f.focus(); }, 40);
  return m;
}
async function envioUIConectar(canal) {
  if (!api) return toast("Indisponível fora do aplicativo", "aviso");
  await envioUIEstado();
  if (canal === "telegram") return envioUICanal("telegram").configurado ? envioUITgChat() : envioUITgToken();
  if (canal === "email") return envioUICanal("email").configurado ? envioUIEmDest() : envioUIEmConta();
}
const ENVIO_SVG = (canal) => (document.querySelector(`#envio-canais [data-canal="${canal}"] svg`) || {}).outerHTML || "";
// Telegram 1/2: token do bot (uma vez)
function envioUITgToken() {
  ENVIO_UI.passo = "tg-token";
  envioUIJanela(`${ENVIO_SVG("telegram")} Conectar o Telegram <small>1/2</small>`, `
    <ol class="envio-passos"><li>No Telegram, abra o <b>@BotFather</b> e mande <code>/newbot</code> (escolha um nome; ele cria o seu bot).</li>
      <li>Ele responde com o <b>token</b> (algo como <code>123456789:AA…</code>). Copie e cole aqui — só nesta vez.</li></ol>
    <form class="form sem-borda" id="ev-tg-form" autocomplete="off" novalidate>
      <label>Token do bot <input id="ev-tg-token" type="password" placeholder="123456789:AA…" spellcheck="false" autocomplete="off"></label></form>
    <p class="ajuda">O token fica guardado no cofre do Windows (cifrado) e nunca volta para a tela.</p>`,
    [["Cancelar", envioUIFechar], ["Conectar bot", envioUITgSalvar, "primario"]]);
  $("#ev-tg-form").onsubmit = (e) => { e.preventDefault(); envioUITgSalvar(); };
}
async function envioUITgSalvar() {
  const inp = $("#ev-tg-token"), tok = inp.value.trim();
  inp.classList.remove("invalido");
  if (!/^\d+:[\w-]{20,}$/.test(tok)) { inp.classList.add("invalido"); return envioUIMsg("Token inválido — confira se copiou inteiro (123456789:AA…).", "erro"); }
  envioUIMsg("Conectando o bot…");
  const r = await api.envio_configurar("telegram", { token: tok });
  inp.value = "";
  if (!r.ok) return envioUIMsg(r.erro || "Não foi possível salvar.", "erro");
  const t = await api.envio_testar("telegram", "");
  await envioUIEstado();
  if (!t.ok) return envioUIMsg("✖ " + (t.erro || "O Telegram recusou o token."), "erro");
  envioUITgChat("✔ " + (t.msg || "Bot conectado."));
}
// Telegram 2/2: escolher o chat (como se escolhe a conversa do WhatsApp)
function envioUITgChat(msg) {
  ENVIO_UI.passo = "tg-chat";
  const c = envioUICanal("telegram"), bot = c.bot ? `@${esc(c.bot)}` : "o seu bot";
  const link = c.bot ? ` <a href="https://t.me/${encodeURIComponent(c.bot)}" target="_blank" rel="noopener">abrir t.me/${esc(c.bot)}</a>` : "";
  envioUIJanela(`${ENVIO_SVG("telegram")} Escolher o chat <small>2/2</small>`, `
    <p class="envio-sub">Mande <b>qualquer mensagem</b> para ${bot}${link} — ou adicione-o ao grupo — e escolha o chat abaixo.</p>
    <div class="envio-lista-tit">Conversas com o bot <button type="button" class="btn mini" id="ev-tg-buscar" title="Ler as mensagens recebidas pelo bot">🔄 Procurar</button></div>
    <ul class="envio-lista" id="ev-tg-lista"><li class="vazio">procurando…</li></ul>
    ${(c.recentes || []).length ? `<div class="envio-lista-tit">Usados recentemente</div><ul class="envio-lista" id="ev-tg-rec"></ul>` : ""}
    <p class="ajuda">Bot conectado${c.bot ? ` (@${esc(c.bot)})` : ""}. <a href="#" id="ev-tg-trocar">Trocar o bot</a></p>`,
    [["Fechar", envioUIFechar]]);
  if (msg) envioUIMsg(msg, "ok");
  if ($("#ev-tg-rec")) envioUILista($("#ev-tg-rec"), c.recentes.map((x) => ({ alvo: x.alvo, nome: x.nome || x.alvo, sub: x.nome ? x.alvo : "" })), envioUITgUsar);
  $("#ev-tg-buscar").onclick = () => envioUITgBuscar(true);
  $("#ev-tg-trocar").onclick = (e) => { e.preventDefault(); envioUITgToken(); };
  const lk = $("#ev-corpo a[href^='https://t.me/']");   // no app abre no navegador padrão
  if (lk && typeof api.abrir_link === "function") lk.onclick = (e) => { e.preventDefault(); api.abrir_link(lk.href); };
  envioUITgBuscar(false);
  clearInterval(ENVIO_UI.tgPoll);   // enquanto a janela está aberta, a lista se atualiza sozinha (a mensagem chega a qualquer momento)
  let n = 0;
  ENVIO_UI.tgPoll = setInterval(() => { if (ENVIO_UI.passo !== "tg-chat" || ++n > 40) { clearInterval(ENVIO_UI.tgPoll); return; } envioUITgBuscar(false); }, 3000);
}
async function envioUITgBuscar(manual) {
  const ul = $("#ev-tg-lista"); if (!ul || ENVIO_UI._tgBuscando) return;
  ENVIO_UI._tgBuscando = true;
  let r; try { r = await api.envio_telegram_chats(); } catch (e) { r = { ok: false, erro: String(e) }; } finally { ENVIO_UI._tgBuscando = false; }
  if (ENVIO_UI.passo !== "tg-chat" || !$("#ev-tg-lista")) return;
  if (!r.ok) { ul.innerHTML = `<li class="vazio">não foi possível ler as conversas</li>`; return envioUIMsg("✖ " + (r.erro || "Falhou."), "erro"); }
  const chats = r.chats || [];
  if (!chats.length) { ul.innerHTML = `<li class="vazio">nenhuma conversa ainda — mande uma mensagem para o bot</li>`; if (manual) envioUIMsg(r.dica || "", ""); return; }
  const TIPO = { private: "pessoa", group: "grupo", supergroup: "grupo", channel: "canal" };
  envioUILista(ul, chats.map((c) => ({ alvo: c.chat_id, nome: c.nome, sub: `${TIPO[c.tipo] || c.tipo || ""} · ${c.chat_id}` })), envioUITgUsar);
  if (manual) envioUIMsg("Clique no chat que vai receber as evidências desta aba.", "ok");
}
function envioUILista(ul, itens, usar) {
  ul.innerHTML = "";
  itens.forEach((it) => {
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" class="envio-item"><b>${esc(it.nome)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>`;
    li.firstChild.onclick = () => usar(it.alvo, it.nome === it.alvo ? "" : it.nome);
    ul.appendChild(li);
  });
}
async function envioUITgUsar(chatId, nome) {
  const r = await envioUIDefinir("telegram", chatId, nome); if (!r) return;
  envioUIFechar(); toast(`Telegram conectado: ${envioUIRotulo(r.destino)} — o Enviar evidência desta aba já vai para lá`);
}
// E-mail 1/2: a conta (uma vez), com os provedores comuns
function envioUIEmConta(prov) {
  ENVIO_UI.passo = "em-conta";
  const c = envioUICanal("email");
  prov = prov || (c.servidor ? (Object.keys(ENVIO_PROVEDORES).find((k) => ENVIO_PROVEDORES[k].servidor === c.servidor) || "outro") : "gmail");
  const P = ENVIO_PROVEDORES[prov];
  envioUIJanela(`${ENVIO_SVG("email")} Conectar o e-mail <small>1/2</small>`, `
    <div class="envio-prov" role="radiogroup" aria-label="Provedor">${Object.entries(ENVIO_PROVEDORES).map(([k, p]) =>
      `<button type="button" class="btn mini${k === prov ? " ativo" : ""}" role="radio" aria-checked="${k === prov}" data-prov="${k}">${esc(p.rot)}</button>`).join("")}</div>
    <form class="form sem-borda" id="ev-em-form" autocomplete="off" novalidate>
      <label>Seu e-mail (remetente) <input id="ev-em-email" type="email" placeholder="voce@empresa.com" spellcheck="false" value="${esc(c.conta || "")}"></label>
      <label>Senha ${prov === "outro" ? "" : "de app"} <input id="ev-em-senha" type="password" autocomplete="off" placeholder="${c.configurado ? "•••••••• guardada no cofre (vazio = manter)" : "senha de app"}"></label>
      ${prov === "outro" ? `<div class="canais-2"><label>Servidor SMTP <input id="ev-em-servidor" placeholder="smtp.provedor.com" spellcheck="false" value="${esc(c.servidor || "")}"></label>
        <label>Porta <input id="ev-em-porta" type="number" min="1" max="65535" value="587"></label></div>
        <label>Segurança <select id="ev-em-seg"><option value="starttls">STARTTLS (587)</option><option value="ssl">SSL/TLS (465)</option>
          <option value="nenhuma">Nenhuma (só rede interna)</option></select></label>` : ""}
      <label>Nome que aparece <input id="ev-em-nome" placeholder="ex.: Suporte DASSH (opcional)"></label></form>
    <p class="ajuda envio-dica">💡 ${P.dica}</p>`,
    [["Cancelar", envioUIFechar], ...(c.configurado ? [["Voltar", () => envioUIEmDest()]] : []), ["Conectar conta", () => envioUIEmSalvar(prov), "primario"]]);
  document.querySelectorAll("#ev-corpo [data-prov]").forEach((b) => (b.onclick = () => envioUIEmConta(b.dataset.prov)));
  $("#ev-em-form").onsubmit = (e) => { e.preventDefault(); envioUIEmSalvar(prov); };
  const seg = $("#ev-em-seg"); if (seg) seg.onchange = () => { const p = $("#ev-em-porta"); if (["587", "465", ""].includes(p.value)) p.value = seg.value === "ssl" ? 465 : 587; };
}
async function envioUIEmSalvar(prov) {
  const P = ENVIO_PROVEDORES[prov], c = envioUICanal("email");
  const email = $("#ev-em-email").value.trim(), senha = $("#ev-em-senha").value;
  document.querySelectorAll("#ev-em-form .invalido").forEach((e) => e.classList.remove("invalido"));
  const erro = (sel, m) => { $(sel).classList.add("invalido"); envioUIMsg(m, "erro"); };
  if (!envioUIEmailOk(email)) return erro("#ev-em-email", "Informe o seu e-mail (remetente).");
  if (!senha && !(c.configurado && c.conta === email)) return erro("#ev-em-senha", "Informe a senha de app.");
  const d = { servidor: P.servidor, porta: P.porta, seguranca: P.seguranca, usuario: email, remetente: email, senha,
              nome_remetente: $("#ev-em-nome").value.trim() };
  if (prov === "outro") {
    d.servidor = $("#ev-em-servidor").value.trim(); d.seguranca = $("#ev-em-seg").value;
    d.porta = Number($("#ev-em-porta").value) || (d.seguranca === "ssl" ? 465 : 587);
    if (!d.servidor) return erro("#ev-em-servidor", "Informe o servidor SMTP.");
  }
  if (!d.nome_remetente) delete d.nome_remetente;
  envioUIMsg("Conectando ao servidor de e-mail…");
  const r = await api.envio_configurar("email", d);
  $("#ev-em-senha").value = "";
  if (r.segredo_necessario) { const c = $("#ev-em-senha"); c.classList.add("invalido"); c.focus(); return envioUIMsg("Você mudou o servidor: por segurança, digite a senha de novo.", "erro"); }
  if (!r.ok) return envioUIMsg(r.erro || "Não foi possível salvar.", "erro");
  const t = await api.envio_testar("email", "");
  await envioUIEstado();
  if (!t.ok) return envioUIMsg("✖ " + (t.erro || "O servidor recusou.") + " — confira a senha de app.", "erro");
  envioUIEmDest("✔ " + (t.msg || "Conta conectada."));
}
// E-mail 2/2: o destinatário (digita ou escolhe dos recentes)
function envioUIEmDest(msg) {
  ENVIO_UI.passo = "em-dest";
  const c = envioUICanal("email"), a = A(), atual = a && a.destino && a.destino.canal === "email" ? a.destino.alvo || "" : "";
  const rec = (c.recentes || []).map((x) => x.alvo);
  if (c.padrao && !rec.includes(c.padrao)) rec.push(c.padrao);
  envioUIJanela(`${ENVIO_SVG("email")} Para quem enviar <small>2/2</small>`, `
    <form class="form sem-borda" id="ev-ed-form" autocomplete="off" novalidate>
      <label>Destinatário(s) <input id="ev-ed-para" type="text" list="ev-ed-dl" placeholder="cliente@empresa.com, gestor@empresa.com" spellcheck="false" value="${esc(atual)}"></label>
      <datalist id="ev-ed-dl">${rec.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
      <label class="rot-opc"><input type="checkbox" id="ev-ed-teste"> Mandar um e-mail de teste agora</label></form>
    ${rec.length ? `<div class="envio-lista-tit">Recentes</div><ul class="envio-lista" id="ev-ed-rec"></ul>` : ""}
    <p class="ajuda">Enviando de <b>${esc(c.conta || "?")}</b>. <a href="#" id="ev-ed-conta">Trocar a conta</a></p>`,
    [["Cancelar", envioUIFechar], ["Usar este destinatário", envioUIEmUsar, "primario"]]);
  if (msg) envioUIMsg(msg, "ok");
  if ($("#ev-ed-rec")) envioUILista($("#ev-ed-rec"), rec.map((x) => ({ alvo: x, nome: x })), (alvo) => { $("#ev-ed-para").value = alvo; envioUIEmUsar(); });
  $("#ev-ed-conta").onclick = (e) => { e.preventDefault(); envioUIEmConta(); };
  $("#ev-ed-form").onsubmit = (e) => { e.preventDefault(); envioUIEmUsar(); };
}
async function envioUIEmUsar() {
  const inp = $("#ev-ed-para"), lst = envioUIEmails(inp.value), ruim = lst.find((x) => !envioUIEmailOk(x));
  inp.classList.remove("invalido");
  if (!lst.length || ruim) { inp.classList.add("invalido"); return envioUIMsg(ruim ? `E-mail inválido: ${ruim}` : "Informe o destinatário.", "erro"); }
  const alvo = lst.join(", "), teste = $("#ev-ed-teste").checked;
  if (teste) {
    envioUIMsg("Mandando o e-mail de teste…");
    const t = await api.envio_testar("email", alvo);
    if (!t.ok) { await envioUIEstado(); return envioUIMsg("✖ " + (t.erro || "Falhou."), "erro"); }
  }
  const r = await envioUIDefinir("email", alvo, ""); if (!r) return;
  envioUIFechar(); toast(`E-mail conectado: ${alvo}${teste ? " (teste enviado)" : ""} — o Enviar evidência desta aba já vai para lá`);
}
async function envioUIDesconectar() {
  const a = A(); if (!a || !a.destino) return;
  const canal = a.destino.canal; delete envioUIMemoria(a)[canal];
  const r = await envioUIDefinir(canal, "", "");
  if (r) toast(`Esta aba não envia mais pelo ${NOME_CANAL[canal]} até escolher um destino`, "aviso");
}
INFO.whatsapp = ["Como enviar: WhatsApp, Telegram ou E-mail", `
  <p>Os emblemas ao lado do <b>i</b> escolhem <b>para onde esta aba envia</b> (cada aba tem o seu: a aba 1 pode ir ao Telegram e a aba 2 ao e-mail).
  A bolinha mostra a situação: <b style="color:var(--verde-cl)">verde</b> conectado, <b style="color:var(--aviso)">amarela</b> falta um passo,
  <b style="color:var(--erro)">vermelha</b> erro no último envio, cinza desconectado.</p>
  <ol><li><b>WhatsApp:</b> <b>Abrir WhatsApp</b> → na 1ª vez leia o QR code (celular → Aparelhos conectados) → clique na conversa → <b>Conectar conversa</b>.</li>
  <li><b>Telegram:</b> <b>Conectar</b> → cole o token do seu bot (do @BotFather, só uma vez) → mande uma mensagem ao bot → <b>escolha o chat</b> na lista.</li>
  <li><b>E-mail:</b> <b>Conectar</b> → escolha Gmail/Outlook/Office 365/outro e use uma <b>senha de app</b> (só uma vez) → escolha ou digite o destinatário.</li></ol>
  <p>Depois disso o cartão mostra <b>conectado: …</b> e <b>Enviar evidência</b> (<kbd>Ctrl+Alt+E</kbd>) já manda para lá — pela fila, que
  tenta de novo se falhar e sobrevive a fechar o app.</p>
  <p class="nota">WhatsApp: deixe a janela do WhatsApp aberta (pode minimizar); o app confere o nome da conversa antes de enviar.
  Token do bot e senha do e-mail ficam no cofre do Windows (cifrados) e nunca voltam para a tela. ⚙ abre a configuração avançada.</p>`];
(function envioUILigar() {
  const card = $("#card-envio"); if (!card) return;
  card.querySelectorAll(".envio-canal").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); envioUIEscolher(b.dataset.canal); }));
  $("#envio-canais").addEventListener("keydown", (e) => {   // setas trocam o foco entre os canais (grupo de rádio)
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const bs = [...card.querySelectorAll(".envio-canal")], i = bs.indexOf(document.activeElement);
    if (i < 0) return; e.preventDefault(); bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length].focus();
  });
  $("#envio-conectar").onclick = () => { const a = A(); envioUIConectar((a && a.destino && a.destino.canal) || "email"); };
  $("#envio-desconectar").onclick = envioUIDesconectar;
  const antes = window.onEnvio;   // um envio terminou/falhou: atualiza a bolinha do canal
  window.onEnvio = (job, estado, msg) => { if (antes) antes(job, estado, msg); if (estado !== "enviando" && estado !== "aguardando") envioUIEstado(); };
  const ini = () => { envioUIEstado(); clearInterval(ENVIO_UI.timer); ENVIO_UI.timer = setInterval(envioUIEstado, 10000); };
  window.addEventListener("pywebviewready", () => setTimeout(ini, 300));
  envioUIRender();
})();

// ================= 👤 CONTA LOCAL: entrar antes de liberar a plataforma (app e web pelo Conector) =================
// Este ouvinte roda ANTES do início normal (captura no alvo) e o segura até o login. No Conector o backend também recusa
// qualquer chamada que não seja conta_* antes de entrar (agente.py): a tela é a porta, o Conector é a fechadura.
const CONTA = { token: "", liberada: false, modo: "entrar", existe: false, usuario: "", trava: null, toque: 0, vigia: null };
const contaTok = {
  ler() { try { return sessionStorage.getItem("dassh.conta") || ""; } catch (_) { return ""; } },
  gravar(v) { try { if (v) sessionStorage.setItem("dassh.conta", v); else sessionStorage.removeItem("dassh.conta"); } catch (_) {} },
};
const contaApi = () => (window.pywebview && window.pywebview.api) || {};

window.addEventListener("pywebviewready", async (ev) => {
  if (CONTA.liberada) return;   // re-disparo depois de entrar: segue para o início normal
  ev.stopImmediatePropagation();
  let e = null;
  try { e = await contaApi().conta_estado(contaTok.ler() || null); } catch (_) { e = null; }
  if (!e || e.dispensa || !("existe" in e)) return contaLiberar();   // sem contas no backend (antigo/simulado) ou autoteste   // backend sem contas (versão antiga) ou autotestes do app
  if (contaTok.ler()) {   // recarregou a página: a sessão desta aba ainda vale? (retomar também amarra a conexão do Conector)
    const r = await contaApi().conta_retomar(contaTok.ler()).catch(() => null);
    if (r && r.ok) { CONTA.token = contaTok.ler(); return contaLiberar(); }
    contaTok.gravar("");
  }
  if (e.nuvem && e.nuvem.lembrado) {   // "Lembrar de mim neste computador": entra sozinho (offline se preciso)
    const r = await contaApi().conta_nuvem_retomar().catch(() => null);
    if (r && r.ok) { CONTA.token = r.token; contaTok.gravar(r.token); if (r.offline) toast("Sem internet: modo offline deste computador.", "aviso"); return contaLiberar(); }
  }
  contaMostrarTela(e);
}, { capture: true });

// Web (Conector): enquanto a tela está trancada, as chamadas automáticas da plataforma ESPERAM o desbloqueio em vez de falhar
// (o Conector recusaria todas). No app local o backend não recusa, então nada é embrulhado.
function contaPortao() {
  const pw = window.pywebview;
  if (!pw || !pw.api || CONTA.portao === pw.api || !document.querySelector('script[src*="ponte-agente"]')) return;
  const orig = pw.api;
  CONTA.esperas = [];
  pw.api = CONTA.portao = new Proxy(orig, { get(t, nome) {
    const f = t[nome];
    if (typeof f !== "function" || String(nome).startsWith("conta_")) return f;
    return (...a) => (CONTA.trancada ? new Promise((ok) => CONTA.esperas.push(ok)) : Promise.resolve()).then(() => f.apply(t, a));
  } });
}
window.addEventListener("unhandledrejection", (e) => {   // chamada que já estava a caminho quando a sessão expirou
  if (/login necessário/.test(String((e.reason && e.reason.message) || e.reason || ""))) e.preventDefault();
});

function contaLiberar() {
  $("#conta-tela").classList.add("oculto");
  CONTA.liberada = true; CONTA.trancada = false;
  contaPortao();
  window.dispatchEvent(new Event("pywebviewready"));
  contaVigiar();
}

function contaMsg(t, tipo) { const m = $("#ct-msg"); m.textContent = t || ""; m.className = "ct-msg" + (tipo ? " " + tipo : ""); }

const CT_ICONES = {
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
  azure: '<svg viewBox="0 0 23 23" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.700 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.7.8-1.200 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z"/></svg>',
  github: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.7-3.7 3.9.3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4C13.7 14.5 16 11.5 16 8c0-4.4-3.6-8-8-8z"/></svg>',
};
const CT_LEMBRAR = "dassh.lembrar";
const ctTemEmail = (u) => !!CONTA.nuvem && /@/.test(u || "");   // Conector antigo (sem nuvem): tudo vai para a conta local

function contaModo(modo) {
  CONTA.modo = modo; CONTA.ligando = false;
  document.querySelectorAll("[data-ctm]").forEach((b) => { b.classList.toggle("on", b.dataset.ctm === (modo === "recuperar" ? "entrar" : modo)); b.setAttribute("aria-selected", b.classList.contains("on")); });
  const criar = modo === "criar", rec = modo === "recuperar";
  $("#ct-sub").textContent = criar ? "Crie a sua conta DASSH" : rec ? "Recuperar o acesso" : "Entre na sua conta DASSH";
  $("#ct-rot-usuario").textContent = criar ? "E-mail" : "E-mail (ou usuário local)";
  $("#ct-usuario").setAttribute("autocomplete", criar ? "email" : "username");
  $("#ct-sociais").classList.toggle("oculto", rec || !CONTA.nuvem);
  $("#ct-linha").classList.toggle("oculto", rec);
  $("#ct-esqueci").classList.toggle("oculto", criar);
  $("#ct-voltar").classList.toggle("oculto", !rec);
  $("#ct-senha").setAttribute("autocomplete", criar || rec ? "new-password" : "current-password");
  $("#ct-l-local").classList.add("oculto"); $("#ct-senha-local").value = "";
  $("#ct-ajuda").textContent = criar
    ? "A mesma conta vale no site, no app instalado e no portátil. Senha com pelo menos 10 caracteres."
    : rec ? "" : "A mesma conta do site, do app instalado e do portátil.";
  ctRecCampos();
  contaMsg("");
}

// recuperar: com e-mail -> link por e-mail (conta DASSH); com usuário local -> chave de recuperação + senha nova
function ctRecCampos() {
  const criar = CONTA.modo === "criar", rec = CONTA.modo === "recuperar", email = ctTemEmail($("#ct-usuario").value);
  $("#ct-l-senha").classList.toggle("oculto", rec && email);
  $("#ct-rot-senha").textContent = rec ? "Senha nova" : "Senha";
  $('[data-gerar-senha="ct-senha"]').classList.toggle("oculto", !(criar || (rec && !email)));
  $("#ct-l-senha2").classList.toggle("oculto", !(criar || (rec && !email)));
  $("#ct-l-rec").classList.toggle("oculto", !(rec && !email));
  if (CONTA.bloqueada) { $("#ct-ir").textContent = "Desbloquear"; return; }
  $("#ct-ir").textContent = criar ? "Criar conta" : rec ? (email ? "Enviar link para criar senha nova" : "Trocar a senha e entrar") : "Entrar";
}
$("#ct-usuario").addEventListener("input", ctRecCampos);
$("#ct-olho").onclick = () => {
  const i = $("#ct-senha"), ver = i.type === "password";
  i.type = ver ? "text" : "password"; $("#ct-olho").title = ver ? "Esconder a senha" : "Mostrar a senha"; i.focus();
};
try { $("#ct-lembrar").checked = localStorage.getItem(CT_LEMBRAR) !== "0"; } catch (_) { $("#ct-lembrar").checked = true; }
$("#ct-lembrar").onchange = (e) => { try { localStorage.setItem(CT_LEMBRAR, e.target.checked ? "1" : "0"); } catch (_) {} };

function contaOauthHtml(e) {
  const ps = (e && e.nuvem && e.nuvem.provedores) || [];
  return ps.map((p) => `<button type="button" class="ct-soc${p.disponivel ? "" : " breve"}" data-oauth="${esc(p.id)}" title="${p.disponivel ? "" : "Em ativação — use o e-mail por enquanto"}">${CT_ICONES[p.id] || ""}<span>${esc(p.nome)}</span></button>`).join("");
}

function contaLigarOauth(raiz) {
  raiz.querySelectorAll("[data-oauth]").forEach((b) => (b.onclick = async () => {
    const nome = b.querySelector("span").textContent;
    if (b.classList.contains("breve")) return contaMsg(`O login com ${nome} está em ativação. Por enquanto, entre com o e-mail.`, "aviso");
    raiz.querySelectorAll("[data-oauth]").forEach((x) => (x.disabled = true));
    contaMsg(`Abrimos o ${nome} no seu navegador. Conclua lá e volte para cá…`);
    const logado = !!(CONTA.token && $("#conta-tela").classList.contains("oculto"));   // dentro da conta: associa
    const r = await contaApi().conta_nuvem_oauth(b.dataset.oauth, $("#ct-lembrar").checked, $("#ct-senha-local").value || null, logado ? CONTA.token : null)
      .catch((err) => ({ ok: false, erro: String(err.message || err) }));
    raiz.querySelectorAll("[data-oauth]").forEach((x) => (x.disabled = false));
    if (logado) { if (r && r.ok) { toast(`🔗 ${nome} associado à sua conta (${r.email})`); if (window.abrirConta) abrirConta(); } else toast((r && r.erro) || "Não foi possível associar.", "aviso"); return; }
    ctResultado(r);
  }));
}

function ctResultado(r) {
  if (r && r.ok) { if (r.offline) toast("Sem internet: entrou no modo offline deste computador.", "aviso"); return contaEntrou(r); }
  if (r && r.precisa_senha_local) {
    $("#ct-l-local").classList.remove("oculto"); $("#ct-rot-local").textContent = `Senha da conta local "${r.usuario_local}" (só desta vez)`;
    $("#ct-senha-local").focus(); CONTA.ligando = true; $("#ct-ir").textContent = "Ligar e entrar";
    $("#ct-l-senha").classList.add("oculto"); $("#ct-sociais").classList.add("oculto");
    return contaMsg("Este computador já tinha uma conta local. Digite a senha dela uma vez para ligar à sua conta DASSH — seus dados continuam.", "aviso");
  }
  if (r && r.confirmar) { contaModo("entrar"); return contaMsg(r.erro, "aviso"); }
  contaMsg((r && r.erro) || "Não foi possível entrar.", "erro");
  if (r && r.travado_s > 0) contaTravar(r.travado_s);
}

function contaMostrarTela(e, aviso) {
  CONTA.existe = !!e.existe; CONTA.usuario = e.usuario || ""; CONTA.senhaMin = e.senha_min; CONTA.nuvem = e.nuvem || null;
  $("#ct-form").classList.remove("oculto"); $("#ct-rec-mostra").classList.add("oculto");
  const lig = (e.nuvem && (e.nuvem.lembrado || e.nuvem.ligada)) || "";
  contaModo(e.existe ? "entrar" : "criar");
  $("#ct-usuario").value = lig || e.usuario || ""; $("#ct-senha").value = ""; $("#ct-senha2").value = ""; $("#ct-rec").value = "";
  $("#ct-oauth").innerHTML = contaOauthHtml(e); contaLigarOauth($("#ct-oauth"));
  ctRecCampos();
  contaAjustarBloqueio(!!CONTA.bloqueada, !!aviso);
  $("#conta-tela").classList.remove("oculto");
  if (aviso) contaMsg(aviso, "aviso");
  if (e.travado_s > 0) contaTravar(e.travado_s);
  setTimeout(() => (CONTA.bloqueada || $("#ct-usuario").value ? $("#ct-senha") : $("#ct-usuario")).focus(), 30);
}

// Tela bloqueada por inatividade: só a senha destranca. Some o que não serve (criar conta, entrar com outra conta, e-mail, esqueci)
// e o aviso vira destaque acima do formulário. Sessão encerrada: login normal, com o aviso também em destaque.
function contaAjustarBloqueio(bloq, comAviso) {
  $("#conta-tela").classList.toggle("ct-bloq", comAviso);
  $(".ct-abas").classList.toggle("oculto", bloq);
  $("#ct-usuario").closest("label").classList.toggle("oculto", bloq);
  if (bloq) {
    ["#ct-sociais", "#ct-linha", "#ct-l-senha2", "#ct-l-rec"].forEach((s) => $(s).classList.add("oculto"));
    $('[data-gerar-senha="ct-senha"]').classList.add("oculto");
    $("#ct-sub").textContent = CONTA.usuario ? `Tela bloqueada · ${CONTA.usuario}` : "Tela bloqueada";
    $("#ct-ajuda").textContent = "";
    $("#ct-ir").textContent = "Desbloquear";
    $("#ct-senha").setAttribute("autocomplete", "current-password");
  }
}

function contaTravar(s) {
  clearInterval(CONTA.trava);
  const b = $("#ct-ir"); b.disabled = true;
  const fim = Date.now() + s * 1000;
  const passo = () => {
    const r = Math.ceil((fim - Date.now()) / 1000);
    if (r <= 0) { clearInterval(CONTA.trava); b.disabled = false; contaMsg("Pode tentar de novo."); return; }
    contaMsg(`Muitas tentativas erradas. Aguarde ${r} s.`, "erro");
  };
  passo(); CONTA.trava = setInterval(passo, 1000);
}

async function contaEntrou(r) {
  CONTA.token = r.token; contaTok.gravar(r.token);
  if (r.cofre_protegidas) toast(`🔐 ${r.cofre_protegidas === 1 ? "1 senha do cofre agora também protegida" : `${r.cofre_protegidas} senhas do cofre agora também protegidas`} pela sua conta.`);
  if (r.recuperacao) {   // conta local nova: mostra a chave de recuperação UMA vez
    $("#ct-form").classList.add("oculto"); $("#ct-rec-mostra").classList.remove("oculto");
    $("#ct-rec-cod").textContent = r.recuperacao; $("#ct-rec-ok").checked = false; $("#ct-rec-seguir").disabled = true;
    return;
  }
  if (r.email) toast(`👤 Conectado como ${r.email}`);
  contaAberta();
}

function contaAberta() {
  $("#ct-senha").value = ""; $("#ct-senha2").value = ""; $("#ct-rec").value = ""; $("#ct-senha-local").value = "";
  if (!CONTA.liberada) return contaLiberar();
  $("#conta-tela").classList.add("oculto");   // desbloqueio: a plataforma já estava carregada por baixo
  CONTA.trancada = false; CONTA.bloqueada = false;
  (CONTA.esperas || []).splice(0).forEach((ok) => ok());   // as chamadas que esperavam seguem agora
  contaVigiar();
}

$("#ct-rec-ok").onchange = (e) => { $("#ct-rec-seguir").disabled = !e.target.checked; };
$("#ct-rec-seguir").onclick = () => { $("#ct-rec-cod").textContent = ""; contaAberta(); };
$("#ct-esqueci").onclick = (e) => { e.preventDefault(); contaModo("recuperar"); $("#ct-usuario").focus(); };
$("#ct-voltar").onclick = (e) => { e.preventDefault(); contaModo("entrar"); };
$("#ct-form").onsubmit = async (e) => {
  e.preventDefault();
  const u = $("#ct-usuario").value.trim(), s = $("#ct-senha").value, s2 = $("#ct-senha2").value, email = ctTemEmail(u);
  const lembrar = $("#ct-lembrar").checked, local = $("#ct-senha-local").value || null, modo = CONTA.modo;
  if (CONTA.ligando) {   // login na nuvem já feito: só falta a senha da conta local deste PC
    if (!local) return contaMsg("Digite a senha da conta local deste computador.", "erro");
    const r = await contaApi().conta_nuvem_ligar(local).catch((err) => ({ ok: false, erro: String(err.message || err) }));
    if (r && r.ok) { CONTA.ligando = false; return contaEntrou(r); }
    $("#ct-senha-local").value = ""; return contaMsg((r && r.erro) || "Senha incorreta.", "erro");
  }
  if (!u && !CONTA.bloqueada) return contaMsg("Digite o seu e-mail.", "erro");
  if (!(modo === "recuperar" && email) && !s) return contaMsg("Digite a senha.", "erro");
  if ((modo === "criar" || (modo === "recuperar" && !email)) && s !== s2) return contaMsg("As senhas não conferem.", "erro");
  if (modo === "criar" && s.length < 10) return contaMsg("A senha precisa ter pelo menos 10 caracteres.", "erro");
  const b = $("#ct-ir"); b.disabled = true; contaMsg(modo === "entrar" ? "Conferindo…" : "Um instante…");
  const api = contaApi();
  let r;
  try {
    if (CONTA.bloqueada) r = await api.conta_desbloquear(CONTA.token, s);   // tela bloqueada por inatividade: só a senha
    else if (modo === "criar") r = email || !CONTA.nuvem ? (CONTA.nuvem ? await api.conta_nuvem_criar(u, s, lembrar, "", local) : await api.conta_criar(u, s))
      : { ok: false, erro: "Use o seu e-mail para criar a conta DASSH (a mesma no site, no app e no celular)." };
    else if (modo === "recuperar") r = email ? await api.conta_nuvem_recuperar(u) : await api.conta_recuperar(u, $("#ct-rec").value, s);
    else if (email) {
      r = await api.conta_nuvem_entrar(u, s, lembrar, local);
      if (r && !r.ok && r.sem_rede && CONTA.existe) r = await api.conta_entrar(u, s);   // sem internet: a senha vale offline neste PC
    } else r = await api.conta_entrar(u, s);
  } catch (err) { r = { ok: false, erro: String(err.message || err) }; }
  b.disabled = false;
  if (CONTA.bloqueada && r && !r.ok && /expirada/i.test(r.erro || "")) { CONTA.bloqueada = false; CONTA.token = ""; contaTok.gravar(""); }   // passou da idade máxima: login completo
  if (modo === "recuperar" && email) return contaMsg((r && (r.msg || r.erro)) || "", r && r.ok ? "aviso" : "erro");
  if (!(r && r.ok)) { $("#ct-senha").value = ""; if (!(r && r.precisa_senha_local)) $("#ct-senha").focus(); }
  ctResultado(r);
};

// sessão: atividade real renova; expirou (ou outra tela bloqueou) -> volta a pedir a senha
function contaVigiar() {
  if (CONTA.vigia || !CONTA.token) return;
  const tocar = () => {
    if (!CONTA.token || $("#conta-tela").classList.contains("oculto") === false) return;
    if (Date.now() - CONTA.toque < 30000 && !ilhaBloqueio.ativo) return;   // com o aviso do bloqueio na Ilha, o primeiro gesto já renova
    CONTA.toque = Date.now();
    contaApi().conta_tocar(CONTA.token).then((r) => { if (r && r.ok === false) contaTrancar(r.bloqueada ? "bloqueada" : "expirou"); else ilhaBloqueio(0); }).catch(() => {});
  };
  ["keydown", "pointerdown", "wheel"].forEach((t) => document.addEventListener(t, tocar, { capture: true, passive: true }));
  CONTA.vigia = setInterval(async () => {
    if (!CONTA.token) return;
    const e = await contaApi().conta_estado(CONTA.token).catch(() => null);
    if (e && !e.dispensa && !e.logado) contaTrancar(e.bloqueada ? "bloqueada" : "expirou", e);
    else if (e && !e.dispensa && e.logado && e.sessao) ilhaBloqueio(e.sessao.expira_ociosa_s || 0);
  }, 20000);
}

async function contaTrancar(motivo, e) {
  if (!$("#conta-tela").classList.contains("oculto")) return;
  e = e || (await contaApi().conta_estado(null).catch(() => null)) || { existe: true, usuario: CONTA.usuario };
  if (e.existe === false) return;   // sem conta não há o que trancar nem senha para pedir: a tela de bloqueio nunca vira "Criar conta"
  toastFechar();   // nenhum aviso (ex.: progresso do relatório) fica preso por cima da tela de bloqueio
  if (ILHA_ON()) ["bloqueio", "relatorio", "nuvem", "evidencia"].forEach((i) => ilha.limpar(i));   // a Ilha também não fica por cima da tela de bloqueio
  const bloq = motivo === "bloqueada";   // inatividade: a sessão e as conexões ficam; só a senha destranca
  if (!bloq) { contaTok.gravar(""); CONTA.token = ""; }
  CONTA.trancada = true; CONTA.bloqueada = bloq;
  document.querySelectorAll(".modal:not(.oculto)").forEach((m) => m.classList.add("oculto"));
  contaMostrarTela(e, bloq ? "Tela bloqueada por inatividade. Digite a senha para continuar: suas conexões seguem abertas." : motivo === "expirou" ? "Sessão encerrada por inatividade. Entre de novo." : motivo === "bloqueio" ? "Tela bloqueada." : "");
}
window.contaBloqueada = (motivo) => contaTrancar(motivo || "expirou");   // evento do Conector (agente.py)

// ---- janela "Conta" (o botão fica na barra de sistema) ----
async function abrirConta() {
  const e = await contaApi().conta_estado(CONTA.token || null).catch(() => null);
  if (!e) return toast("Conta indisponível nesta versão.", "aviso");
  const min = (s) => (s > 0 ? Math.max(1, Math.round(s / 60)) + " min" : "—");
  $("#conta-info").innerHTML = !e.existe ? `<p><b>Nenhuma conta criada neste computador.</b></p>
    <p class="ajuda">Sem conta não há senha para pedir: bloquear a tela, encerrar sessões, definir a inatividade e trocar a senha só aparecem depois que você criar uma.</p>
    <p><button type="button" class="btn primario" id="conta-criar">Criar conta</button></p>` : `
    <div class="conta-linha"><span>Usuário</span><b>${esc(e.usuario)}</b></div>
    <div class="conta-linha"><span>Sessão</span><b>${e.logado ? `ativa · expira após ${min(e.sessao.expira_ociosa_s)} sem uso (máx. ${min(e.sessao.expira_idade_s)})` : e.dispensa ? "modo de teste (sem login)" : "não iniciada"}</b></div>
    <div class="conta-linha"><span>Proteção</span><b>${esc(e.kdf)} · chave de dados AES-256-GCM só em memória</b></div>
    <div class="conta-linha"><span>Criada</span><b>${esc((e.criada || "").replace("T", " "))}</b></div>
    <div class="conta-linha"><span>Último acesso</span><b>${esc((e.ultimo_login || "—").replace("T", " "))}</b></div>
    <p class="ajuda">Conta local (fase sem servidor): vale só neste computador. Senhas do cofre salvas com a conta aberta ganham uma
      2ª camada cifrada com a chave da sua conta, por dentro da proteção do Windows.</p>`;
  $("#conta-bloquear").disabled = $("#conta-sair-todas").disabled = !e.logado;
  $("#conta-troca").classList.toggle("oculto", !e.logado);
  // sem conta criada: nada que dependa de conta (bloquear, sair, inatividade, trocar senha, entrar com outra conta) é oferecido
  $("#conta-tit").textContent = e.existe ? "👤 Conta" : "👤 Criar conta";
  ["#conta-acoes", "#conta-politica", "#conta-metodos", "#conta-outra-tit", "#conta-oauth"].forEach((s) => $(s).classList.toggle("oculto", !e.existe));
  if (!e.existe) { $("#conta-troca").classList.add("oculto"); $("#conta-criar").onclick = () => { fecharModal($("#conta-criar")); contaMostrarTela(e); }; }
  $("#cs-msg").textContent = ""; ["#cs-atual", "#cs-nova", "#cs-nova2"].forEach((s) => ($(s).value = ""));
  $("#conta-oauth").innerHTML = contaOauthHtml(e); contaLigarOauth($("#conta-oauth"));
  const pol = e.politica || {};
  $("#cp-ociosa").value = String(pol.ociosa_min ?? 30); $("#cp-idade").value = String(pol.idade_h ?? 12);
  $("#cp-senha").value = ""; $("#cp-msg").textContent = ""; $("#cp-senha-bloco").classList.add("oculto");
  $("#conta-politica").querySelectorAll("select, input, button").forEach((x) => { x.disabled = !e.logado; });
  if (e.existe) cmCarregar(e.logado);
  abrirModal("#modal-conta");
}
window.abrirConta = abrirConta;

// ---- 🔗 Métodos de login da conta ÚNICA: e-mail, Google, GitHub (docs/CONTA-UNICA.md) ----
// Backend: nuvem.py (identidades) + app.py (conta_nuvem_identidades/vincular/desvincular). No portal as mesmas chamadas rodam no
// navegador (ponte-agente.js). Nenhuma senha nem token fica aqui: a senha de confirmação vai direto na chamada e o campo é limpo.
const CM = { dados: null, ocupado: new Set(), repetir: null };
const cmCelular = () => !!window.__cel;   // celular pareado: o login abre o navegador do PC, então só vê e desvincula
function cmMsg(t, tipo) { const m = $("#cm-msg"); if (m) { m.textContent = t || ""; m.className = "ajuda cm-msg" + (tipo ? " " + tipo : ""); } }
async function cmChamar(nome, ...a) {
  const f = contaApi()[nome];
  if (typeof f !== "function") return { ok: false, erro: "Esta versão ainda não gerencia os métodos de login." };
  return f.call(contaApi(), CONTA.token || null, ...a).catch((x) => ({ ok: false, erro: String(x.message || x) }));
}
async function cmCarregar(logado = true) {
  const lista = $("#cm-lista"); if (!lista) return;
  cmMsg(""); $("#cm-reaut").classList.add("oculto"); CM.repetir = null;
  if (!logado) { CM.dados = null; lista.innerHTML = `<p class="ajuda">Entre na conta para ver e mudar os métodos de login.</p>`; return; }
  lista.innerHTML = `<p class="ajuda">Carregando…</p>`;
  const r = await cmChamar("conta_nuvem_identidades");
  CM.dados = r && r.ok ? r : null;
  cmDesenhar(r);
  if (r && r.aviso) cmMsg(r.aviso, r.aviso_tipo || "");   // portal: resultado de um vínculo que voltou do provedor
}
function cmCartao(m, d) {
  const ocup = CM.ocupado.has(m.id), cel = cmCelular(), unico = m.vinculado && d.total < 2;
  const nome = esc(m.nome), quando = m.desde ? m.desde.split("-").reverse().join("/") : "";
  let det, bot = "";
  if (m.vinculado) {
    det = `Login: <b>${esc(m.email || "—")}</b>${quando ? ` · vinculado em ${esc(quando)}` : ""}${unico ? "<br><small>Último método de login: não pode ser removido.</small>" : ""}`;
    if (m.vinculavel || d.total > 1) bot = `<button class="btn" data-cm="desv" data-p="${esc(m.id)}" aria-label="Desvincular ${nome}"${ocup || unico ? " disabled" : ""}${unico ? ' title="Vincule outro método antes de remover o último."' : ""}>Desvincular</button>`;
  } else if (m.vinculavel) {
    det = `Vincule para entrar com ${nome} e cair nesta mesma conta.`;
    bot = `<button class="btn primario" data-cm="vinc" data-p="${esc(m.id)}" aria-label="Vincular ${nome}"${ocup || cel ? " disabled" : ""}${cel ? ' title="Só no computador: o login abre o navegador do PC."' : ""}>${ocup ? "Aguardando…" : "Vincular"}</button>`;
  } else {
    det = "Este método nasce no cadastro. Para usá-lo, saia e crie a conta com o seu e-mail na tela de entrada.";
  }
  return `<article class="armaz-serv nuv-card cm-card" role="listitem" aria-labelledby="cm-t-${esc(m.id)}" data-cm-id="${esc(m.id)}">
    <div class="armaz-cab"><span class="armaz-ic cm-ic" aria-hidden="true">${CT_ICONES[m.id] || "✉️"}</span><b id="cm-t-${esc(m.id)}">${nome}</b>
      <span class="armaz-st nuv-st ${m.vinculado ? "ok" : ""}">${m.vinculado ? "Vinculado" : "Não vinculado"}</span></div>
    <p class="nuv-det">${det}</p><div class="armaz-acoes">${bot}</div></article>`;
}
function cmDesenhar(r) {
  const lista = $("#cm-lista"); if (!lista) return;
  if (!r || !r.ok) { lista.innerHTML = `<p class="ajuda">${esc((r && r.erro) || "Métodos de login indisponíveis agora.")}</p>`; return; }
  let metodos, d = r;
  if (r.nuvem === false) {   // conta só local: vincular um login a ela é "associar à nuvem" (a mesma conta passa a abrir por ele)
    $("#cm-ajuda").textContent = "Esta conta existe só neste computador. Vincule o Google ou o GitHub para ter uma conta única: depois, entrando por qualquer método, você cai no mesmo perfil e nos mesmos dados.";
    metodos = [{ id: "email", nome: "E-mail e senha", vinculado: false, vinculavel: false }, ...(r.vinculaveis || []).map((v) => ({ id: v.id, nome: v.nome, vinculado: false, vinculavel: true }))];
    d = { total: 0 };
  } else {
    $("#cm-ajuda").textContent = `Conta DASSH: ${r.email}. Entrando por qualquer método vinculado, você cai no mesmo perfil e nos mesmos dados. Para vincular ou remover, pode ser pedida a sua senha.`;
    metodos = Array.isArray(r.metodos) ? r.metodos : [];
  }
  lista.innerHTML = metodos.map((m) => cmCartao(m, d)).join("");
  lista.querySelectorAll("[data-cm]").forEach((b) => (b.onclick = () => (b.dataset.cm === "vinc" ? cmVincular(b.dataset.p) : cmDesvincular(b.dataset.p))));
}
function cmResultado(r, repetir, okMsg) {
  if (r && r.ok) { CM.dados = r; cmDesenhar(r); cmMsg(okMsg, "ok"); toast("🔗 " + okMsg); return; }
  if (r && r.reautenticar === "reautenticar") {   // sessão antiga: confirma a senha e repete a ação
    CM.repetir = repetir; $("#cm-reaut").classList.remove("oculto"); $("#cm-senha").value = ""; $("#cm-senha").focus();
    cmMsg(r.erro, "aviso"); return;
  }
  cmMsg((r && r.erro) || "Não foi possível concluir.", r && r.reautenticar ? "aviso" : "erro");
  cmDesenhar(CM.dados || r);
}
async function cmVincular(id, senha = null) {
  const m = ((CM.dados && CM.dados.metodos) || []).find((x) => x.id === id), nome = m ? m.nome : (id === "github" ? "GitHub" : "Google");
  CM.ocupado.add(id); cmDesenhar(CM.dados || { ok: true, nuvem: false, vinculaveis: [{ id, nome }] });
  cmMsg(`Abrimos o ${nome} no seu navegador. Conclua lá e volte para cá…`);
  let r;
  if (CM.dados && CM.dados.nuvem === false || !CM.dados) {   // só local: associa o login à conta local (vira a mesma identidade)
    r = await contaApi().conta_nuvem_oauth(id, false, null, CONTA.token || null).catch((x) => ({ ok: false, erro: String(x.message || x) }));
    CM.ocupado.delete(id);
    if (r && r.ok) { cmMsg(`${nome} associado à sua conta (${r.email}).`, "ok"); toast(`🔗 ${nome} associado à sua conta`); return cmCarregar(true); }
    cmMsg((r && r.erro) || "Não foi possível associar.", "erro"); return cmCarregar(true);
  }
  r = await cmChamar("conta_nuvem_vincular", id, senha);
  CM.ocupado.delete(id);
  cmResultado(r, (s) => cmVincular(id, s), `${nome} vinculado à sua conta.`);
}
function cmDesvincular(id) {
  const m = ((CM.dados && CM.dados.metodos) || []).find((x) => x.id === id);
  if (!m || !m.identity_id) return;
  if (CM.dados.total < 2) return cmMsg("Este é o seu último método de login: vincule outro antes de remover.", "aviso");
  const fazer = async (senha = null) => {
    CM.ocupado.add(id); cmDesenhar(CM.dados); cmMsg("Desvinculando…");
    const r = await cmChamar("conta_nuvem_desvincular", m.identity_id, senha);
    CM.ocupado.delete(id);
    cmResultado(r, fazer, `${m.nome} desvinculado.`);
  };
  pedido(`Desvincular <b>${esc(m.nome)}</b>?<br><small>Você deixa de entrar por ele. Seus dados continuam na conta, e dá para vincular de novo depois.</small>`,
    "Desvincular", "Manter", (ok) => { if (ok) fazer(); }, "cm-desv-" + id);
}
$("#cm-reaut").onsubmit = (ev) => {
  ev.preventDefault();
  const s = $("#cm-senha").value, f = CM.repetir; $("#cm-senha").value = "";
  if (!s) return cmMsg("Digite a sua senha.", "erro");
  $("#cm-reaut").classList.add("oculto"); CM.repetir = null;
  if (f) f(s);
};
$("#cm-reaut-cancelar").onclick = () => { $("#cm-senha").value = ""; $("#cm-reaut").classList.add("oculto"); CM.repetir = null; cmMsg(""); };
$("#modal-conta [data-fecha]").onclick = (ev) => fecharModal(ev.target);
const cpTrava = () => $("#cp-senha-bloco").classList.toggle("oculto", $("#cp-ociosa").value !== "0" && $("#cp-idade").value !== "0");
$("#cp-ociosa").onchange = $("#cp-idade").onchange = cpTrava;
$("#conta-politica").onsubmit = async (ev) => {
  ev.preventDefault();
  const m = $("#cp-msg"); m.textContent = "Salvando…";
  const r = await contaApi().conta_definir_politica(CONTA.token, +$("#cp-ociosa").value, +$("#cp-idade").value, $("#cp-senha").value)
    .catch((err) => ({ ok: false, erro: String(err.message || err) }));
  $("#cp-senha").value = "";
  m.textContent = r && r.ok ? "Salvo. Vale já para esta sessão." : ((r && r.erro) || "Não foi possível salvar.");
};
$("#conta-bloquear").onclick = async () => { await contaApi().conta_sair(CONTA.token).catch(() => {}); fecharModal($("#conta-bloquear")); contaTrancar("bloqueio"); };
$("#conta-sair-todas").onclick = async () => { await contaApi().conta_sair(CONTA.token, true).catch(() => {}); fecharModal($("#conta-bloquear")); contaTrancar("bloqueio"); };
$("#conta-troca").onsubmit = async (ev) => {
  ev.preventDefault();
  const a = $("#cs-atual").value, n = $("#cs-nova").value, m = $("#cs-msg");
  if (n !== $("#cs-nova2").value) { m.textContent = "As senhas novas não conferem."; return; }
  m.textContent = "Trocando…";
  const r = await contaApi().conta_trocar_senha(CONTA.token, a, n).catch((e) => ({ ok: false, erro: String(e.message || e) }));
  m.textContent = r && r.ok ? "✔ Senha trocada. As outras sessões foram encerradas." : (r && r.erro) || "Falhou.";
  if (r && r.ok) ["#cs-atual", "#cs-nova", "#cs-nova2"].forEach((s) => ($(s).value = ""));
};

// ================= ☁ ARMAZENAMENTO CONECTADO (Google Drive · OneDrive · Dropbox · iCloud) =================
const ARMAZ = { estado: null };
async function abrirArmazenamento() {
  if (!api) return;
  abrirModal("#modal-armaz");
  await desenharArmaz();
}
window.abrirArmazenamento = abrirArmazenamento;
$("#modal-armaz [data-fecha]").onclick = (ev) => fecharModal(ev.target);

async function desenharArmaz(r) {
  const sid = ativa || null;
  const e = ARMAZ.estado = r || await api.armaz_estado(sid).catch((x) => ({ ok: false, erro: String(x.message || x) }));
  if (!e || !e.ok) { $("#armaz-lista").innerHTML = `<p class="ajuda">${esc((e && e.erro) || "Indisponível.")}</p>`; return; }
  if (e.evid && typeof atualizarEvid === "function") atualizarEvid(e.evid);
  if (e.clientes && typeof desenharClientes === "function") desenharClientes(e.clientes);
  const soAba = $("#armaz-so-aba").checked && !!sid;
  const con = soAba ? e.aba : (e.aba && e.aba.conectado ? e.aba : e.global);
  $("#armaz-sub").textContent = sid ? (soAba ? "· esta aba" : "· todas as abas") : "";
  const linha = (c, rot) => c && c.conectado
    ? `<div class="armaz-con ${c.pasta_ok ? "ok" : "aviso"}"><b>${esc(rot)}:</b> ${esc(c.nome)} — <code>${esc(c.pasta)}</code>${c.aviso ? `<br><small>⚠ ${esc(c.aviso)}</small>` : ""}</div>` : "";
  $("#armaz-atual").innerHTML = (linha(e.aba, "Esta aba") + linha(e.global, "Todas as abas"))
    || `<div class="armaz-con">Salvando no computador: <code>${esc(e.raiz)}</code></div>`;
  $("#armaz-lista").innerHTML = e.servicos.map((s) => {
    const ligado = con && con.conectado && con.servico === s.id;
    const pastas = s.pastas.map((p) => `<li><code>${esc(p.caminho)}</code> <small>${esc(p.rotulo)}</small></li>`).join("");
    return `<div class="armaz-serv ${s.existe ? "" : "ausente"}">
      <div class="armaz-cab"><span class="armaz-ic">${s.icone}</span><b>${esc(s.nome)}</b>
        <span class="armaz-st ${ligado ? "ok" : ""}">${ligado ? "● Conectado" : s.existe ? "Encontrado neste PC" : "Não encontrado"}</span></div>
      ${s.existe ? `<ul class="armaz-pastas">${pastas}</ul>` : `<p class="ajuda">Instale o <b>${esc(s.app)}</b> e entre na sua conta; depois clique em ↻.</p>`}
      <div class="armaz-acoes">${s.existe ? (ligado
        ? `<button class="btn" data-a="trocar" data-s="${s.id}">Trocar pasta…</button><button class="btn" data-a="desc" data-s="${s.id}">Desconectar</button>`
        : `<button class="btn primario" data-a="con" data-s="${s.id}" title="${esc(e.sugeridas[s.id])}">Conectar</button><button class="btn" data-a="trocar" data-s="${s.id}">Escolher pasta…</button>`) : ""}
        <button class="btn mini" data-a="rec" title="Procurar de novo">↻</button></div>
      ${s.existe && !ligado ? `<p class="ajuda">Conectar usa <code>${esc(e.sugeridas[s.id])}</code></p>` : ""}</div>`;
  }).join("");
  $("#armaz-lista").querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => armazAcao(b.dataset.a, b.dataset.s)));
  nuvAtualizar(true);
}
$("#armaz-so-aba").onchange = () => desenharArmaz(ARMAZ.estado);
// ---- ☁ Nuvens por login (OAuth): Google Drive · OneDrive · Dropbox (+ iCloud só por pasta) — docs/NUVENS-OAUTH-UI.md ----
// Backend: nuvem_oauth.py. Conectar/desconectar/testar/destino só na janela local do PC; celular e portal só veem o estado e pedem envio.
// Nenhum token chega aqui: a interface só recebe estado, conta, espaço e mensagens.
const NUV = { dados: null, timer: null, ocupado: new Set(), msg: "" };
const NUV_IC = { gdrive: "🟢", onedrive: "🔵", dropbox: "🟦" };
function nuvRemoto() { return NA_WEB || !!(window.__cel || window.__remoto || window.__portal); }
const nuvBytes = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
function nuvMsg(t) { NUV.msg = t || ""; const m = $("#nuv-msg"); if (m) m.textContent = NUV.msg; }
async function nuvAtualizar(espaco = false) {
  if (!api || typeof api.estado_nuvem !== "function") return;
  const r = await api.estado_nuvem(null, !!espaco).catch((x) => ({ ok: false, erro: String(x.message || x) }));
  NUV.dados = r && r.ok && Array.isArray(r.provedores) && r.icloud ? r : null;
  nuvDesenhar(r);
  clearTimeout(NUV.timer);
  const aguarda = NUV.dados && NUV.dados.provedores.some((p) => p.estado === "aguardando");
  if (aguarda && !$("#modal-armaz").classList.contains("oculto")) NUV.timer = setTimeout(() => nuvAtualizar(false), 1500);
}
function nuvCartao(p, remoto) {
  const id = p.id, nome = p.nome, ocup = NUV.ocupado.has(id);
  const st = { nao_conectado: ["Não conectado", ""], aguardando: ["Aguardando autorização…", "aviso"], conectado: [`Conectado como ${p.conta || p.nome_conta || "sua conta"}`, "ok"],
               sem_cliente: ["Cliente OAuth não configurado", "aviso"], erro: ["Erro", "erro"] }[p.estado] || ["Não conectado", ""];
  let det = "";
  if (p.estado === "conectado" && p.espaco) det = `Espaço usado: ${nuvBytes(p.espaco.usado)}${p.espaco.total ? " de " + nuvBytes(p.espaco.total) : ""}`;
  else if (p.estado === "aguardando") det = `Autorize no navegador que abriu. Tempo restante: ${Math.floor((p.expira_s || 0) / 60)} min ${String((p.expira_s || 0) % 60).padStart(2, "0")} s.`;
  else if (p.estado === "sem_cliente") det = `${esc(p.falta || "Falta o client_id.")} Veja o passo a passo em <b>${esc(NUV.dados.doc)}</b>.`;
  else if (p.estado === "erro") det = esc(p.erro || "Não foi possível conectar. Tente de novo.");
  else if (p.estado === "nao_conectado") det = "Envie evidências, relatórios e gravações para a sua nuvem, sem instalar nada.";
  if (p.aviso) det += ` <small>⚠ ${esc(p.aviso)}</small>`;
  const dis = (cond) => (cond ? " disabled" : "");
  const so = remoto ? ` title="Só no computador: a autorização abre o navegador do PC."` : "";
  let bot = "";
  if (p.estado === "aguardando") bot = `<button class="btn" data-n="cancelar" data-p="${id}" aria-label="Cancelar a conexão com ${esc(nome)}"${dis(remoto)}${so}>Cancelar</button>`;
  else if (p.estado === "conectado") bot = `<button class="btn primario" data-n="sync" data-p="${id}" aria-label="Sincronizar atendimentos com ${esc(nome)}"${dis(ocup)}>Sincronizar atendimentos</button>
      <button class="btn" data-n="testar" data-p="${id}" aria-label="Testar a conexão com ${esc(nome)}"${dis(ocup || remoto)}${so}>Testar</button>
      <button class="btn" data-n="desc" data-p="${id}" aria-label="Desconectar ${esc(nome)}"${dis(ocup || remoto)}${so}>Desconectar</button>`;
  else bot = `<button class="btn primario" data-n="con" data-p="${id}" aria-label="Conectar ${esc(nome)}"${dis(ocup || remoto)}${so}>Conectar</button>`;
  return `<article class="armaz-serv nuv-card" role="listitem" aria-labelledby="nuv-t-${id}" data-nuv="${id}">
    <div class="armaz-cab"><span class="armaz-ic" aria-hidden="true">${NUV_IC[id]}</span><b id="nuv-t-${id}">${esc(nome)}</b><span class="armaz-st nuv-st ${st[1]}">${esc(st[0])}</span></div>
    <p class="nuv-det">${det}</p><div class="armaz-acoes">${bot}</div></article>`;
}
function nuvDesenhar(r) {
  const lista = $("#nuv-lista"); if (!lista) return;
  const rem = nuvRemoto();
  if (!NUV.dados) { lista.innerHTML = `<p class="ajuda">${esc((r && r.erro) || "Nuvens indisponíveis agora.")}</p>`; $("#nuv-destino").innerHTML = ""; return; }
  const d = NUV.dados;
  $("#nuv-ajuda").textContent = rem ? "Você está pelo celular ou pelo portal: aqui dá para ver o estado e pedir envio. Para conectar ou desconectar uma nuvem, abra o DASSH Code no computador (a autorização acontece no navegador do PC)."
                                    : "Conecte pelo login da sua conta (autorização oficial no navegador). O DASSH Code só acessa a pasta que ele mesmo cria; a senha nunca passa por aqui.";
  lista.innerHTML = d.provedores.map((p) => nuvCartao(p, rem)).join("") + `<article class="armaz-serv nuv-card" role="listitem" aria-labelledby="nuv-t-icloud">
    <div class="armaz-cab"><span class="armaz-ic" aria-hidden="true">⚪</span><b id="nuv-t-icloud">iCloud Drive</b><span class="armaz-st nuv-st">Só por pasta</span></div>
    <p class="nuv-det">${esc(d.icloud.mensagem)} Escolha a pasta na lista de pastas sincronizadas logo abaixo.</p></article>`;
  lista.querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => nuvAcao(b.dataset.n, b.dataset.p)));
  const con = d.provedores.filter((p) => p.estado === "conectado");
  const op = [["", "Pasta local deste computador"], ...con.map((p) => [p.id, p.nome])];
  $("#nuv-destino").innerHTML = con.length ? `<fieldset class="nuv-destino"><legend>Destino padrão dos envios</legend>${op.map(([v, t]) =>
    `<label class="rot-opc"><input type="radio" name="nuv-dest" value="${v}" ${((d.destino || "") === v) ? "checked" : ""}${rem ? " disabled" : ""}> ${esc(t)}</label>`).join("")}</fieldset>` : "";
  $("#nuv-destino").querySelectorAll("input[name=nuv-dest]").forEach((i) => (i.onchange = async () => {
    const x = await api.definir_destino_nuvem(i.value).catch((e) => ({ ok: false, erro: String(e.message || e) }));
    nuvMsg(x && x.ok ? (x.destino ? "Destino padrão: sua nuvem." : "Destino padrão: pasta local.") : (x && x.erro) || "Não foi possível mudar o destino.");
    nuvAtualizar(false);
  }));
  $("#nuv-msg").textContent = NUV.msg;
}
async function nuvAcao(a, id) {
  if (NUV.ocupado.has(id) || !NUV.dados) return;
  const nome = (NUV.dados.provedores.find((p) => p.id === id) || {}).nome || id;
  const exec = async (fn) => {
    NUV.ocupado.add(id); nuvDesenhar({ ok: true });
    try { return await fn(); } catch (x) { return { ok: false, erro: String(x.message || x) }; } finally { NUV.ocupado.delete(id); }
  };
  if (a === "con") {
    const r = await exec(() => api.conectar_nuvem(id));
    if (!r || !r.ok) { nuvMsg((r && r.erro) || "Não foi possível iniciar a conexão."); toast((r && r.erro) || "Falhou.", "aviso"); return nuvAtualizar(false); }
    nuvMsg(`Autorize o ${nome} no navegador que abriu. Esta tela atualiza sozinha.`);
  } else if (a === "cancelar") { await exec(() => api.cancelar_nuvem(id)); nuvMsg("Conexão cancelada."); }
  else if (a === "desc") {
    const sim = await new Promise((ok) => pedido(`☁ Desconectar o <b>${esc(nome)}</b>?<br><small>O DASSH Code deixa de enviar e apaga a autorização guardada neste computador. Os arquivos que já estão na sua nuvem não são apagados.</small>`,
      "Desconectar", "Cancelar", ok, "excluir", true));
    if (!sim) return;
    const r = await exec(() => api.desconectar_nuvem(id));
    nuvMsg(r && r.ok ? (r.aviso || `${nome} desconectado.`) : (r && r.erro) || "Não foi possível desconectar."); if (r && r.ok) toast(`${nome} desconectado.`);
  } else if (a === "testar") {
    nuvMsg(`Testando o ${nome}…`);
    const r = await exec(() => api.testar_nuvem(id));
    nuvMsg(r && r.ok ? `✔ ${nome}: enviou e apagou um arquivo de teste em ${r.ms} ms.` : `${nome}: ${(r && r.erro) || "o teste falhou."}`);
  } else if (a === "sync") {
    nuvMsg(`Enviando os atendimentos para o ${nome}…`);
    const r = await exec(() => api.sincronizar_nuvem(id, ativa || null));
    nuvMsg(r && r.ok ? `✔ ${r.enviados} arquivo(s) enviado(s) ao ${nome}${r.restantes ? `; faltam ${r.restantes} (clique de novo)` : ""}${r.ignorados && r.ignorados.length ? `; ${r.ignorados.length} ignorado(s)` : ""}.`
                     : `${nome}: ${(r && r.erro) || "a sincronização falhou."}`);
  }
  nuvAtualizar(a === "testar" || a === "sync");
}
// "Enviar para minha nuvem" nos menus da Biblioteca (evidência, relatório, gravação): usa o destino padrão ou a única nuvem conectada
async function nuvEnviar(caminho, tipo) {
  if (!api || typeof api.estado_nuvem !== "function") return toast("A nuvem não está disponível aqui.", "aviso");
  const e = await api.estado_nuvem().catch(() => null), con = e && e.ok ? e.provedores.filter((p) => p.estado === "conectado") : [];
  const alvo = e && e.destino ? e.destino : con.length === 1 ? con[0].id : "";
  if (!con.length) return toast("Nenhuma nuvem conectada: conecte em ☁ Armazenamento (no computador).", "aviso");
  if (!alvo) return toast("Mais de uma nuvem conectada: escolha o destino padrão em ☁ Armazenamento.", "aviso");
  toast("☁ Enviando para a sua nuvem…"); ilhaTarefa("nuvem", "Enviando para a nuvem", "Arquivo do atendimento");
  const r = await api.enviar_para_nuvem(caminho, tipo, alvo).catch((x) => ({ ok: false, erro: String(x.message || x) }));
  toast(r && r.ok ? "☁ Enviado para a sua nuvem." : (r && r.erro) || "Não foi possível enviar.", r && r.ok ? "" : "aviso");
  ilhaTarefaFim("nuvem", !!(r && r.ok), "Enviado para a nuvem", "O arquivo já está na sua nuvem.");
}


async function armazAcao(a, s) {
  const sid = ativa || null, soAba = $("#armaz-so-aba").checked && !!sid;
  let r;
  try {
    if (a === "rec") return desenharArmaz();
    if (a === "desc") r = await api.armaz_desconectar(sid, soAba);
    else {
      let pasta = "";
      if (a === "trocar") {
        const p = await api.armaz_escolher(s, sid);
        if (!p || p.cancelado) return;
        if (!p.ok) return toast(p.erro, "aviso");
        pasta = p.pasta;
      }
      r = await api.armaz_conectar(s, pasta, sid, soAba);
    }
  } catch (x) { r = { ok: false, erro: String(x.message || x) }; }
  if (!r || !r.ok) return toast((r && r.erro) || "Falhou.", "aviso");
  toast(a === "desc" ? "Armazenamento desconectado: volta a salvar na pasta de antes." : "☁ Conectado: os atendimentos passam a ser salvos na pasta sincronizada.");
  desenharArmaz(r);
}

// ================= 💬 chat POR ABA compartilhada =================
// Cada aba ao vivo (dono) ou sessão remota (convidado) tem a sua conversa, com os participantes DAQUELA sessão. O painel fica na
// faixa livre à direita do texto do terminal (centralizado nela), nunca por cima do texto; recolhido vira uma bolha com contador.
// Não entra na evidência: a evidência é desenhada do BUFFER do xterm (snapshot), não da tela. Digitar aqui não vai ao shell;
// Esc volta ao terminal; os atalhos Ctrl+Alt (evidência etc.) continuam valendo.
const CHAT_MAX = 1000, CHAT_GUARDA = 300;
const CHAT_CORES = ["var(--tipo-ssh)", "var(--chat-laranja)", "var(--chat-lilas)", "var(--chat-rosa)", "var(--chat-amarelo)", "var(--chat-ciano)", "var(--chat-lima)", "var(--chat-orquidea)"];
function chatCor(quem) {
  if (quem === "host") return "var(--verde-cl)";
  // cor pela ORDEM de entrada na sessão (nunca repete entre as primeiras 8 pessoas); fora da lista, pelo hash
  const ps = ((A() || {}).share || {}).participantes || [], i = ps.filter((p) => p.id !== "host").findIndex((p) => p.id === quem);
  if (i >= 0) return CHAT_CORES[i % CHAT_CORES.length];
  let h = 0; for (const ch of String(quem)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHAT_CORES[h % CHAT_CORES.length];
}
function chatEstado(a) {
  const cod = (a.share && a.share.codigo) || "";
  if (!a.chat || (cod && a.chat.codigo && a.chat.codigo !== cod))   // outra sessão na mesma aba = conversa nova
    a.chat = { codigo: cod, itens: [], mids: new Set(), pend: [], novas: 0, aberto: null };
  if (cod && !a.chat.codigo) a.chat.codigo = cod;
  return a.chat;
}
const chatEu = (a) => (a.share && a.share.papel === "dono" ? "host" : a.share && a.share.eu) || "";
const chatVisivel = (a) => !!(a && a.share && a.conectado && !a.share.aguardando && a.tipo !== "web" && !a.demo);
function chatHora(ms) { const d = new Date(ms || Date.now()); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }

function chatReceber(sid, itens, doHistorico) {
  const a = abas.get(sid); if (!a) return;
  const c = chatEstado(a), eu = chatEu(a);
  let novas = 0;
  for (const m of itens || []) {
    if (!m || typeof m.txt !== "string" || typeof m.mid !== "string" || c.mids.has(m.mid)) continue;
    c.mids.add(m.mid);
    if (m.cm) c.pend = c.pend.filter((p) => p.cm !== m.cm);   // minha mensagem confirmada pelo dono: sai de "enviando…"
    c.itens.push({ mid: m.mid, quem: String(m.quem || ""), nome: String(m.nome || "Convidado").slice(0, 40),
                   txt: m.txt.slice(0, CHAT_MAX), hora: +m.hora || Date.now() });
    if (m.quem !== eu && !doHistorico) { novas++; if (a.id === ativa && c.aberto) c.digitar = m.mid; }
  }
  c.itens.sort((x, y) => x.hora - y.hora);
  while (c.itens.length > CHAT_GUARDA) c.itens.shift();
  const lendo = a.id === ativa && c.aberto && document.visibilityState !== "hidden";
  if (novas && !lendo) c.novas += novas;
  if (novas) chatSom();
  if (a.id === ativa) chatDesenhar(); else chatMarcaAba(a);
}
function chatMarcaAba(a) { if (a.btn) a.btn.classList.toggle("chat-novo", !!(a.chat && a.chat.novas)); }

function chatDesenhar() {
  const el = $("#chat"), a = A();
  if (!el) return;
  abas.forEach((x) => chatMarcaAba(x));
  if (!chatVisivel(a)) { el.classList.add("oculto"); return; }
  const c = chatEstado(a);
  if (c.aberto === null) c.aberto = chatLivre(a) >= 190;   // começa aberto só se houver faixa livre para ele
  el.classList.remove("oculto"); el.classList.toggle("aberto", c.aberto);
  $("#chat-bolha").setAttribute("aria-expanded", String(c.aberto));
  if (c.aberto) c.novas = 0;
  chatMarcaAba(a);
  const cont = $("#chat-cont");
  cont.textContent = c.novas > 99 ? "99+" : String(c.novas); cont.classList.toggle("oculto", !c.novas);
  $("#chat-bolha").title = c.novas ? `💬 ${c.novas === 1 ? "1 mensagem nova" : `${c.novas} mensagens novas`} nesta sessão` : "💬 Conversa desta sessão (só quem está nela vê)";
  const ps = (a.share.participantes || []);
  $("#chat-quem").innerHTML = ps.map((p) => `<i style="--cor:${chatCor(p.id)}" title="${esc(p.nome)}${p.id === chatEu(a) ? " (você)" : ""}${p.id === "host" ? " · dono" : ""}"></i>`).join("")
    + `<span>${ps.length} ${ps.length === 1 ? "pessoa" : "pessoas"}</span>`;
  const eu = chatEu(a), lista = $("#chat-lista");
  const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
  let ant = null;
  const html = c.itens.map((m) => {
    const meu = m.quem === eu, junta = ant && ant.quem === m.quem && m.hora - ant.hora < 120000; ant = m;
    return `<div class="chat-msg${meu ? " eu" : ""}${junta ? " junta" : ""}" style="--cor:${chatCor(m.quem)}">
      ${junta ? "" : `<div class="chat-cab"><b>${esc(meu ? "Você" : m.nome)}</b>${m.quem === "host" && !meu ? "<em>dono</em>" : ""}<time>${chatHora(m.hora)}</time></div>`}
      <div class="chat-corpo chat-term"><span class="chat-ps">${esc(chatUsuario(meu ? "voce" : m.nome))}@ops:~$</span> <span class="chat-txt"${!meu && m.mid === c.digitar ? ' data-digita="1"' : ""}>${esc(m.txt)}</span></div>
      ${!meu && chatPareceComando(m.txt) ? `<div class="chat-acoes"><button type="button" data-shell="${esc(m.mid)}" title="Coloca o comando no shell desta aba (sem Enter: você confere e aperta Enter)">▶ no shell</button><button type="button" data-copiar="${esc(m.mid)}" title="Copiar">⧉ copiar</button></div>` : ""}</div>`;
  }).join("") + c.pend.map((p) => `<div class="chat-msg eu pend${p.falhou ? " falhou" : ""}" style="--cor:${chatCor(eu)}">
      <div class="chat-corpo">${esc(p.txt)}</div><div class="chat-st">${p.falhou ? "não entregue — o dono usa uma versão sem chat" : "enviando…"}</div></div>`).join("");
  if (html !== lista._html || !html) lista.innerHTML = (lista._html = html) || `<div class="chat-vazio">Converse aqui com quem está nesta sessão.<br><small>Fica no histórico da sessão e nunca entra na evidência.</small></div>`;
  const dg = lista.querySelector('[data-digita="1"]'); if (dg && c.digitar) { c.digitar = null; chatEfeitoDigitar(dg); }
  if (noFim || c.rolar) lista.scrollTop = lista.scrollHeight;
  c.rolar = false;
  chatPosicionar();
  chatObservar(a);
}

// largura livre entre o fim do texto do terminal e a borda direita da área do terminal
function chatLivre(a) {
  const box = $("#terminal").getBoundingClientRect(), scr = a && a.pane && a.pane.querySelector(".xterm-screen");
  const fim = scr && scr.getBoundingClientRect().width ? scr.getBoundingClientRect().right : box.left;
  return Math.floor(box.right - fim - 20);
}
function chatPosicionar() {
  const el = $("#chat"), a = A();
  if (!el || el.classList.contains("oculto") || !a) return;
  const card = document.querySelector(".terminal-card").getBoundingClientRect(), box = $("#terminal").getBoundingClientRect();
  const livre = chatLivre(a), aberto = el.classList.contains("aberto"), estreito = livre < 170;
  el.classList.toggle("estreito", estreito);
  const fim = box.right - 20 - livre, vao = livre + 20;   // fim do texto e o vão inteiro até a borda
  const scr = a.pane && a.pane.querySelector(".xterm-screen"), baixo = scr ? box.bottom - scr.getBoundingClientRect().bottom - 4 : 0;
  let w, h, x, y;
  if (aberto) {   // proporções originais; transparente (ajustável) para não esconder o shell
    w = Math.min(330, box.width - 16);   // mesma dimensão no app e na web; sem faixa livre, fica por cima (transparente) na borda
    h = Math.max(160, Math.min(460, box.height - 24));
    x = livre >= w ? fim + 10 + (livre - w) / 2 : box.right - 8 - w;
    y = box.top + (box.height - h) / 2 - 20;
  } else {   // bolha: no vão à direita (encolhe até 30 px para caber); sem vão, embaixo do texto; em último caso, na borda
    w = h = vao >= 40 ? Math.min(46, vao - 10) : 46;
    x = vao >= 40 ? fim + (vao - w) / 2 : box.right - 8 - w;
    y = vao < 40 && baixo >= w + 4 ? box.bottom - baixo + (baixo - w) / 2 : box.top + (box.height - h) / 2;
  }
  el.style.setProperty("--chat-b", (aberto ? 46 : w) + "px");
  el.style.width = w + "px"; el.style.height = h + "px";
  el.style.left = Math.round(x - card.left) + "px";
  el.style.top = Math.round(y - card.top) + "px";
}
let chatRO = null, chatObs = null;
function chatObservar(a) {
  if (!window.ResizeObserver) return;
  if (!chatRO) { chatRO = new ResizeObserver(() => requestAnimationFrame(chatPosicionar)); chatRO.observe($("#terminal")); }
  const scr = a.pane && a.pane.querySelector(".xterm-screen");
  if (scr && scr !== chatObs) { if (chatObs) chatRO.unobserve(chatObs); chatRO.observe(scr); chatObs = scr; }
}
function chatAlternar(abrir) {
  const a = A(); if (!chatVisivel(a)) return;
  const c = chatEstado(a); c.aberto = abrir === undefined ? !c.aberto : abrir; c.rolar = c.aberto;
  chatDesenhar();
  if (c.aberto) setTimeout(() => $("#chat-txt").focus(), 0); else a.term.focus();
}
async function chatEnviar() {
  const a = A(), inp = $("#chat-txt"); if (!chatVisivel(a)) return;
  const txt = inp.value.replace(/\s+/g, " ").trim();
  if (!txt) return;
  if (txt.length > CHAT_MAX) return toast(`Mensagem longa demais (máx. ${CHAT_MAX} caracteres)`, "aviso");
  inp.value = "";
  let r;
  try { r = await api.share_chat_enviar(a.id, txt); } catch (e) { r = { ok: false, erro: String(e.message || e) }; }
  if (!r || !r.ok) { if (!inp.value) inp.value = txt; return toast((r && r.erro) || "Mensagem não enviada", "aviso"); }
  const c = chatEstado(a);
  if (r.mid) chatReceber(a.id, [r]);                   // dono: já é a mensagem final (o evento que chega depois é ignorado pelo mid)
  else if (r.cm) {                                     // convidado: aparece "enviando…" até o dono redistribuir (eco com o mesmo cm)
    const p = { cm: r.cm, txt: r.txt || txt };
    c.pend.push(p); c.rolar = true;
    setTimeout(() => { if (c.pend.includes(p)) { p.falhou = true; if (A() === a) chatDesenhar(); } }, 12000);
    chatDesenhar();
  }
}
// liga o painel (uma vez) e entra no fluxo do compartilhamento sem mexer nele: eventos "chat"/"chat_hist" e redesenho por aba
(function chatIniciar() {
  const el = $("#chat"); if (!el) return;
  $("#chat-bolha").onclick = () => chatAlternar(true);
  $("#chat-min").onclick = () => chatAlternar(false);
  $("#chat-form").onsubmit = (e) => { e.preventDefault(); chatEnviar(); };
  $("#chat-txt").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const a = A(); if (a) a.term.focus(); }
  });
  el.addEventListener("mousedown", (e) => e.stopPropagation());   // clique no chat não fecha/abre nada do resto da tela
  const onShareAnt = window.onShare;
  window.onShare = (sid, tipo, d) => {
    if (tipo === "chat") return chatReceber(sid, [d]);
    if (tipo === "chat_hist") return chatReceber(sid, (d && d.itens) || [], true);
    return onShareAnt(sid, tipo, d);
  };
  const desenharShareAnt = desenharShare;
  desenharShare = function (a) { desenharShareAnt(a); chatDesenhar(); };   // ativar(), estado, encerrar, sair: tudo passa por aqui
  addEventListener("resize", () => requestAnimationFrame(chatPosicionar));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") chatDesenhar(); });
})();

// abas da tela de entrada: "Entrar" e "Criar conta" sempre visíveis
document.querySelectorAll("[data-ctm]").forEach((b) => (b.onclick = () => contaModo(b.dataset.ctm)));

// plataforma web: link discreto de volta ao site (no app instalado não aparece)
if (document.querySelector('script[src*="ponte-agente"]')) {
  const m = document.querySelector("header .marca, .marca");
  if (m && !document.getElementById("volta-site")) {
    const a = document.createElement("a");
    a.id = "volta-site"; a.href = "../"; a.textContent = "← Site"; a.title = "Voltar ao site do DASSH";
    m.after(a);
  }
}

// ---------- chat moderno: comando -> shell, emojis, som, digitação ----------
function chatPareceComando(t) {
  t = String(t || "").trim();
  if (!t || t.length > 300 || /\n/.test(t)) return false;
  return CHAT_CMDS.mikrotik.includes(t.toLowerCase()) || /^(\$ |> |# )/.test(t) || /^[a-z][\w.-]*(\s+[-\/|\w.:@=$"'\\*]+)*$/i.test(t) && /[-|\/:.=]|\b(show|display|get-|set-|ping|ip|ls|cd|cat|grep|dir|ipconfig|netstat|systemctl|az|aws|gcloud|kubectl|docker|ssh|sudo)\b/i.test(t);
}
function chatTextoDe(mid) { const a = A(), c = a && chatEstado(a); const m = c && c.itens.find((x) => String(x.mid) === String(mid)); return m ? m.txt.replace(/^(\$ |> |# )/, "") : ""; }
$("#chat-lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-shell],[data-copiar]"); if (!b) return;
  const a = A(), t = chatTextoDe(b.dataset.shell || b.dataset.copiar); if (!t) return;
  if (b.dataset.copiar) { try { navigator.clipboard.writeText(t); toast("Comando copiado"); } catch (_) { toast("Não foi possível copiar", "aviso"); } return; }
  if (!a.conectado) return toast("Conecte a aba primeiro.", "aviso");
  if (a.share && a.share.papel === "convidado" && !a.share.souAtivo) return toast("Você está observando: peça o controle para digitar.", "aviso");
  api.escrever(a.id, t); a.term.focus(); toast("Comando no shell — confira e aperte Enter");
});
let chatAudio = null;
function chatSom() {
  try {
    chatAudio = chatAudio || new (window.AudioContext || window.webkitAudioContext)();
    const t = chatAudio.currentTime;
    [[880, 0], [1320, 0.09]].forEach(([f, d]) => {
      const o = chatAudio.createOscillator(), g = chatAudio.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(chatAudio.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
      o.start(t + d); o.stop(t + d + 0.2);
    });
  } catch (_) {}
}
function chatEfeitoDigitar(el) {   // como o topo do site: vai digitando, com o cursor piscando
  const txt = el.textContent; el.textContent = ""; el.classList.add("digitando"); let i = 0;
  const passo = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(passo, Math.min(45, Math.max(12, 900 / txt.length))); else setTimeout(() => el.classList.remove("digitando"), 1200); };
  passo();
}
function chatUsuario(nome) {   // "Ana Souza" -> "ana.souza" (sem acento, como num prompt)
  return String(nome || "convidado").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 20) || "convidado";
}
(function chatEmojis() {
  const f = $("#chat-form"); if (!f || $("#chat-emo")) return;
  const bar = document.createElement("div"); bar.id = "chat-emo"; bar.className = "chat-emo";
  bar.innerHTML = ["👍", "✅", "👀", "🙏", "😂", "🔥", "⚠️", "❌"].map((e) => `<button type="button" tabindex="-1">${e}</button>`).join("");
  bar.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; const i = $("#chat-txt"); i.value += b.textContent; i.focus(); };
  f.before(bar);
  const bt = document.createElement("button"); bt.type = "button"; bt.className = "chat-emo-btn"; bt.textContent = "😊"; bt.title = "Emojis";
  bt.onclick = () => { bar.classList.toggle("aberto"); $("#chat-txt").focus(); };
  f.insertBefore(bt, f.firstChild);
  bar.addEventListener("click", () => bar.classList.remove("aberto"));
})();
(function chatBolhaLogo() {
  const ic = document.querySelector(".chat-bolha-ic"), lg = document.getElementById("logo");   // logo embutido (vale em qualquer página)
  if (ic && lg) { const c = lg.cloneNode(true); c.removeAttribute("id"); c.setAttribute("class", "chat-logo"); ic.textContent = ""; ic.appendChild(c); }
})();

// ---------- transparência do chat (ajustável, lembrada) ----------
(function chatAlfa() {
  const topo = document.querySelector(".chat-topo"); if (!topo || $("#chat-alfa")) return;
  const r = document.createElement("input");
  r.type = "range"; r.id = "chat-alfa"; r.min = "25"; r.max = "100"; r.title = "Transparência do chat"; r.className = "chat-alfa";
  let v = 60; try { v = +localStorage.getItem("dassh.chatAlfa") || 60; } catch (_) {}
  const aplicar = (x) => document.documentElement.style.setProperty("--chat-alfa", (x / 100).toFixed(2));
  r.value = v; aplicar(v);
  r.oninput = () => { aplicar(+r.value); try { localStorage.setItem("dassh.chatAlfa", r.value); } catch (_) {} };
  r.onpointerdown = (e) => e.stopPropagation();
  topo.insertBefore(r, topo.lastElementChild);
})();

// ---------- opções da aba compartilhada: o dono publica, quem observa vê (só leitura) ----------
function shareAbaPublicar(a) {
  if (!a || !a.share || a.share.papel !== "dono" || !api || !api.share_aba) return;
  api.share_aba(a.id, { inicio: a.inicio || null, gravando: !!a.gravando, ativa: !!a.manterAtiva, tipo: a.tipo || "",
    alvo: (a.alvo && (a.alvo.nome || a.alvo.destino || a.alvo)) ? String(a.alvo.nome || a.alvo.destino || a.alvo).slice(0, 60) : "",
    limpar: !!limparDaAba(a) }).catch(() => {});
}
setInterval(() => abas.forEach((a) => { if (a.share && a.share.papel === "dono") shareAbaPublicar(a); }), 5000);
function shareAbaInfo(s) {
  const o = s && s.aba; if (!o) return "";
  const min = o.inicio ? Math.max(0, Math.floor((Date.now() - o.inicio) / 60000)) : null;
  const tempo = min === null ? "" : min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
  const chip = (on, ic, t, tit) => `<span class="sh-opc${on ? " on" : ""}" title="${tit}">${ic} ${t}</span>`;
  return `<span class="sh-opcs" title="Opções definidas por quem compartilha (só leitura)">
    ${tempo ? chip(true, "⏱", tempo, "Tempo de sessão de quem compartilha") : ""}
    ${chip(o.gravando, "⏺", o.gravando ? "gravando" : "sem gravação", "Gravação da sessão")}
    ${chip(o.ativa, "⏳", o.ativa ? "mantém ativa" : "pode expirar", "Manter a sessão ativa")}
    ${o.tipo ? chip(true, "🔌", esc(nomeTipo(o.tipo)) + (o.alvo ? " · " + esc(o.alvo) : ""), "Conexão") : ""}</span>`;
}


// ---------- chat inteligente: Tab completa comandos conforme o tipo da aba compartilhada (como no shell) ----------
const CHAT_CMDS = {
  huawei: ["display version", "display interface brief", "display ip interface brief", "display current-configuration", "display stack",
    "display lldp neighbor brief", "display eth-trunk", "display logbuffer", "display device", "display cpu-usage", "display memory-usage",
    "display vlan", "display mac-address", "display arp", "display ip routing-table", "system-view", "save"],
  ios: ["show version", "show running-config", "show ip interface brief", "show interfaces status", "show vlan brief", "show cdp neighbors",
    "show lldp neighbors", "show logging", "show inventory", "show spanning-tree", "show ip route", "show mac address-table",
    "configure terminal", "write memory", "ping", "traceroute"],
  nxos: ["show version", "show interface brief", "show inventory", "show running-config", "show vlan brief", "show ip route"],
  junos: ["show version", "show interfaces terse", "show chassis hardware", "show system alarms", "show route"],
  mikrotik: ["/system resource print", "/system routerboard print", "/interface print", "/ip address print", "/ip route print", "/log print"],
  linux: ["ip a", "ip route", "ss -tulpn", "systemctl status", "journalctl -xe", "df -h", "free -m", "top", "uname -a", "hostnamectl",
    "cat /etc/os-release", "sudo", "tail -f /var/log/syslog", "ping", "traceroute"],
  powershell: ["Get-NetIPConfiguration", "Get-NetAdapter", "Get-NetIPAddress", "Get-Service", "Get-Process", "Test-NetConnection -ComputerName ",
    "Get-EventLog -LogName System -Newest 50", "Get-WinEvent -LogName System -MaxEvents 50", "Get-ComputerInfo", "Get-Disk", "Get-Volume",
    "Restart-Service -Name ", "Get-HotFix", "Resolve-DnsName ", "ipconfig /all", "ping", "tracert"],
  cmd: ["ipconfig /all", "ipconfig /flushdns", "ping", "tracert", "netstat -ano", "nslookup", "systeminfo", "tasklist", "route print", "arp -a", "hostname"],
  azure: ["az login", "az account show", "az account list -o table", "az group list -o table", "az vm list -o table", "az vm show -g  -n ",
    "az network vnet list -o table", "az storage account list -o table"],
  aws: ["aws sts get-caller-identity", "aws ec2 describe-instances", "aws s3 ls", "aws iam list-users", "aws ec2 describe-vpcs", "aws configure list"],
  gcp: ["gcloud config list", "gcloud projects list", "gcloud compute instances list", "gcloud auth list", "gcloud container clusters list"],
  oci: ["oci iam region list", "oci iam compartment list", "oci compute instance list", "oci os ns get"],
  doctl: ["doctl account get", "doctl compute droplet list", "doctl kubernetes cluster list", "doctl compute domain list"],
  ibmcloud: ["ibmcloud login", "ibmcloud target", "ibmcloud resource groups", "ibmcloud resource service-instances"],
  wrangler: ["wrangler login", "wrangler whoami", "wrangler deploy", "wrangler tail"],
  cloudflared: ["cloudflared tunnel login", "cloudflared tunnel list", "cloudflared --version"],
  terraform: ["terraform init", "terraform validate", "terraform plan", "terraform apply", "terraform state list", "terraform version"],
  kubectl: ["kubectl config current-context", "kubectl get nodes", "kubectl get pods -A", "kubectl get svc -A", "kubectl describe pod ", "kubectl logs "],
  helm: ["helm list -A", "helm repo list", "helm repo update", "helm search repo ", "helm version"],
  docker: ["docker ps", "docker ps -a", "docker images", "docker logs ", "docker compose ps", "docker version"],
  ollama: ["ollama list", "ollama run ", "ollama pull ", "ollama ps"],
};
const CHAT_BANNERS = [
  ["nxos", /^(?:Cisco\s+(?:Nexus Operating System\s+\(NX-OS\)|NX-OS\b)|NX-OS Software\b)/i],
  ["ios", /^Cisco\s+IOS(?:[\s-]|$)/i],
  ["huawei", /^(?:Huawei\s+Versatile Routing Platform|Huawei\s+VRP\b|VRP\s+\(R\)\s+software)/i],
  ["junos", /^(?:---\s*JUNOS\b|Junos:\s*\S|Juniper Networks,\s*Inc\.\s+junos\b)/i],
  ["mikrotik", /^(?:MikroTik\s+RouterOS|RouterOS\s+v?\d)/i],
  ["linux", /^(?:Linux\s+\S+\s+\d|(?:Welcome to )?Ubuntu\s+\d|Debian GNU\/Linux\b|Red Hat Enterprise Linux\b)/i],
  ["windows", /^(?:Microsoft Windows\s+\[Version\b|Windows PowerShell\b)/i],
];
const CHAT_PROMPTS = [
  ["huawei", /^(?:<HUAWEI>|\[[~*]?HUAWEI\])$/i],
  ["junos", /^[\w.-]+@[\w.-]+>$/],
  ["mikrotik", /^\[[\w.-]+@[^@\]]+\]\s+(?:\/[\w /-]*\s+)?>$/],
  ["linux", /^(?:[\w.-]+@[\w.-]+:[^\r\n]*|\[[\w.-]+@[\w.-]+\s+[^@\]]+\])[$#]$/],
  ["windows", /^(?:PS )?[A-Z]:\\[^>\r\n]*>$/i],
];
const CHAT_SKILL_FAMILIA = {
  ios: /\bCisco\b.*\bIOS\b/i, nxos: /\bCisco\b.*\bNX-OS\b/i, huawei: /\bHuawei\b/i,
  junos: /\b(?:Juniper|Junos)\b/i, mikrotik: /\b(?:MikroTik|RouterOS)\b/i,
  linux: /\bLinux\b/i, windows: /\bWindows\b/i,
};
function chatTipo(a) {
  return String(a?.share?.aba?.tipo || a?.tipo || "").toLowerCase();
}
function chatFamiliaDetectada(a, tipo = chatTipo(a)) {
  if (!a?.conectado || a.demo || !["serial", "ssh", "remoto"].includes(tipo)) return null;
  if (a.chatFamiliaBanner) return a.chatFamiliaBanner;
  const b = a.term.buffer.active, y = b.baseY + b.cursorY;
  // O buffer já interpretou as sequências ANSI e reuniu as escritas parciais.
  for (let i = y; i >= Math.max(0, y - a.term.rows); i--) {
    const linha = b.getLine(i)?.translateToString(true).trim() || "";
    const banner = CHAT_BANNERS.find(([, re]) => re.test(linha));
    if (banner) {
      a.chatFamiliaBanner = banner[0];
      return a.chatFamiliaBanner;
    }
  }
  const prompt = CHAT_PROMPTS.find(([, re]) => re.test(linhaCursor(a.term).trim()));
  if (prompt) a.chatFamiliaPrompt = prompt[0];
  return a.chatFamiliaPrompt || null;
}
function chatFamilias(tipo, familia) {
  if (familia === "windows") return ["powershell", "cmd"];
  if (familia) return [familia];
  if (["powershell", "cmd", "azure", "aws", "oci", "doctl", "ibmcloud", "wrangler", "cloudflared", "terraform", "kubectl", "helm", "docker", "ollama"].includes(tipo)) return [tipo];
  if (tipo === "pwsh") return ["powershell"];
  if (tipo === "gcp" || tipo === "gcloud") return ["gcp"];
  return ["huawei", "ios", "linux"];   // lista genérica, na mesma ordem
}
function chatSugestoes(a, familia = chatFamiliaDetectada(a)) {
  const l = chatFamilias(chatTipo(a), familia).flatMap((f) => CHAT_CMDS[f]);
  const filtro = CHAT_SKILL_FAMILIA[familia];
  for (const sk of BIB.skills || []) {
    if (!Array.isArray(sk?.comandos) || (filtro && !filtro.test(sk.fabricante + " " + sk.nome))) continue;
    for (const c of sk.comandos) {
      const x = typeof c === "string" ? c : c && (c.cmd || c.comando);
      if (x) l.push(String(x));
    }
  }
  return [...new Set(l)];
}
(function chatTab() {
  const inp = $("#chat-txt"); if (!inp) return;
  const dica = document.createElement("div"); dica.id = "chat-dica"; dica.className = "chat-dica oculto";
  $("#chat-form").before(dica);
  let ciclo = null;
  const achar = (pre, a, familia) => {
    const p = pre.toLowerCase();
    return chatSugestoes(a, familia).filter((c) => c.toLowerCase().startsWith(p) && c.length > pre.length);
  };
  const mostrar = () => {
    const v = inp.value, m = v.trim() && !/\s$/.test(v) ? achar(v, A()) : [];
    dica.classList.toggle("oculto", !m.length);
    if (m.length) dica.innerHTML = `<kbd>Tab</kbd> ${m.slice(0, 3).map((c) => `<span>${esc(c)}</span>`).join("")}${m.length > 3 ? `<em>+${m.length - 3}</em>` : ""}`;
  };
  inp.addEventListener("input", () => { ciclo = null; mostrar(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const a = A(), familia = chatFamiliaDetectada(a), tipo = chatTipo(a);
    if (!ciclo || ciclo.a !== a || ciclo.familia !== familia || ciclo.tipo !== tipo) {
      const lista = achar(inp.value, a, familia);
      ciclo = null;
      if (!lista.length) { dica.classList.add("oculto"); return; }
      ciclo = { a, familia, tipo, lista, i: 0 };
    } else ciclo.i = (ciclo.i + 1) % ciclo.lista.length;   // Tab de novo: próxima sugestão
    inp.value = ciclo.lista[ciclo.i];
    dica.innerHTML = `<kbd>Tab</kbd> ${ciclo.lista.length > 1 ? `${ciclo.i + 1} de ${ciclo.lista.length} · Tab de novo para a próxima` : "completo"}`;
    dica.classList.remove("oculto");
  });
  inp.addEventListener("blur", () => setTimeout(() => dica.classList.add("oculto"), 150));
})();

// ---------- painel do dono: só números (aparece apenas para a conta proprietária) ----------
const ADM = { ult: null };
async function admAtualizar() {
  if (!api || !api.conta_nuvem_admin || !CONTA.token) return;
  const r = await api.conta_nuvem_admin().catch(() => null);
  const antigo = document.getElementById("adm-selo"); if (antigo) antigo.remove();   // os números do dono rodam na Ilha (repouso)
  window.__admIlha = r && r.admin ? r : null;
  if (typeof ilhaSync === "function") ilhaSync();
  if (!r || !r.admin) return;
  if (ADM.ult && r.contas > ADM.ult.contas) toast(`🎉 ${r.contas - ADM.ult.contas === 1 ? "1 nova conta criada" : `${r.contas - ADM.ult.contas} novas contas criadas`} — agora são ${r.contas}`);
  if (ADM.ult && r.online > ADM.ult.online) toast(`🟢 ${pl(r.online, "pessoa")} usando a plataforma agora`);
  ADM.ult = r;
}
setTimeout(admAtualizar, 8000);
setInterval(admAtualizar, 60000);

// ================= 📱 celular: deitado = gaveta do painel lateral (botão flutuante) · em pé = dica de arrastar/girar =================
(() => {
  const b = document.createElement("button");
  b.id = "btn-painel"; b.type = "button"; b.textContent = "☰";
  b.title = "Painel: atendimento, evidência e envio"; b.setAttribute("aria-label", b.title); b.setAttribute("aria-expanded", "false");
  const abrir = (on) => { document.body.classList.toggle("lateral-aberta", on); b.textContent = on ? "✕" : "☰"; b.setAttribute("aria-expanded", String(on)); };
  b.onclick = () => abrir(!document.body.classList.contains("lateral-aberta"));
  document.body.appendChild(b);
  document.addEventListener("pointerdown", (e) => {   // tocar fora da gaveta fecha
    if (document.body.classList.contains("lateral-aberta") && !e.target.closest(".lateral, #btn-painel, .modal, #popover")) abrir(false);
  }, true);
  let fechada = false; try { fechada = localStorage.getItem("dassh.dica-gire") === "1"; } catch (_) {}
  const t = $("#terminal");
  if (!fechada && t) {
    const d = document.createElement("div"); d.className = "dica-gire"; d.setAttribute("role", "note");
    d.innerHTML = '<span>↔ Arraste o terminal para os lados · gire o celular para usar em tela cheia</span><button type="button" aria-label="Fechar dica">✕</button>';
    d.querySelector("button").onclick = () => { d.remove(); try { localStorage.setItem("dassh.dica-gire", "1"); } catch (_) {} };
    t.parentNode.insertBefore(d, t);
  }
  addEventListener("orientationchange", () => setTimeout(() => { if (typeof ajustarFonte === "function") ajustarFonte(); }, 250));
})();


// ================= 🏝 Ilha DASSH: alimentação (ui/ilha.js · docs/ILHA-DASSH.md) =================
// A Ilha é só a vitrine: aqui os eventos que já existem (gravação, compartilhamento, IA, celular, envio, bloqueio, conexão) viram estados.
// ilhaSync() reconstrói os estados ambiente (gravando, compartilhando, IA, celular) a partir do estado real das abas; os eventos pontuais
// (envio, evidência, bloqueio, queda) chamam ilha.publicar direto. Nada aqui cria timer: o relógio é da própria Ilha.
function ILHA_ON() { return typeof ilha !== "undefined" && ilha; }
function ilhaSync() {
  if (!ILHA_ON() || ilhaSync.p) return;
  ilhaSync.p = true;
  Promise.resolve().then(() => { ilhaSync.p = false; try { ilhaSyncAgora(); } catch (err) { console.error("ilha", err); } });
}
// um único timer leve: só gira a presença quando ela é o que está na tela, a Ilha está recolhida e a janela visível
setInterval(() => { const e = ILHA_ON() && !document.hidden && ilha.estado(); if (e && e.topo === "presenca" && !e.expandida) { (window.__ilhaPres = window.__ilhaPres || { i: 0, ult: "" }).i++; ilhaSync(); } }, 5000);
function ilhaSyncAgora() {
  const todas = [...abas.values()], vivas = todas.filter((a) => a.conectado);
  // presença: a Ilha nunca some. Em repouso alterna (a cada 5 s) entre sessões ativas e os números do dono; qualquer outro estado passa por cima
  const P = (window.__ilhaPres = window.__ilhaPres || { i: 0, ult: "" }), adm = window.__admIlha;
  const slides = [vivas.length ? { t: "Sessões", d: pl(vivas.length, "sessão ativa", "sessões ativas"), x: "Conexões abertas neste momento." }
    : { t: "Sessões", d: "Nenhuma sessão", x: "Escolha um tipo de conexão para começar." }];
  // celular, IA (com saldo) e fila de envio já têm estado próprio na Ilha (prioridade maior que a presença): aparecem por cima quando existem
  if (adm) slides.push({ t: "Plataforma", d: pl(adm.contas, "conta", "contas"), x: "Contas criadas na plataforma (só você vê)." },
    { t: "Plataforma", d: `${adm.online} online agora`, x: "Pessoas usando a plataforma neste momento." },
    { t: "Plataforma", d: `${adm.ativos_24h} ativos em 24 h`, x: "Contas com atividade nas últimas 24 horas." },
    { t: "Plataforma", d: `+${adm.novas_hoje} novas hoje`, x: "Contas criadas hoje." });
  const sl = slides[P.i % slides.length];
  ilha.publicar("presenca", { tipo: "presenca", titulo: sl.t, dado: sl.d, detalhe: sl.x, acoes: [] });
  if (P.ult !== sl.d) { P.ult = sl.d; const e = document.querySelector("#ilha .ilha-dado"); if (e) { e.classList.remove("troca"); void e.offsetWidth; e.classList.add("troca"); } }
  // gravando
  const gr = vivas.filter((a) => a.gravando && a.tipo !== "web");
  if (gr.length) {
    const a = gr.find((x) => x.id === ativa) || gr[0], inicio = Math.min(...gr.map((x) => x.inicio || Date.now()));
    ilha.publicar("gravacao", { tipo: "gravando", titulo: gr.length === 1 ? "Gravando a sessão" : `Gravando ${gr.length} sessões`,
      dado: gr.length === 1 ? "REC {t}" : `REC {t} · ${gr.length}`, inicio,
      detalhe: gr.length === 1 ? `${a.nome}: a gravação fica na Biblioteca.` : "As gravações ficam na Biblioteca.",
      acoes: [{ id: "parar", rotulo: "Parar gravação", icone: "parar", perigo: true, aoClicar: () => ilhaPararGravacao(a) }] });
  } else ilha.limpar("gravacao");
  // compartilhando (só o dono)
  const sh = vivas.filter((a) => a.share && a.share.papel === "dono");
  if (sh.length) {
    const a = sh.find((x) => x.id === ativa) || sh[0];
    const obs = (a.share.participantes || []).filter((p) => p.id !== "host").length;
    ilha.publicar("compartilhando", { tipo: "compartilhando", titulo: "Sessão ao vivo", dado: obs ? pl(obs, "observador", "observadores") : "Ao vivo",
      detalhe: `${a.nome} · código ${a.share.codigo || ""}`.trim(),
      acoes: [{ id: "encerrar", rotulo: "Encerrar compartilhamento", icone: "parar", perigo: true,
        aoClicar: async () => { await api.share_encerrar(a.id); a.share = null; desenharShare(a); toast("Compartilhamento encerrado"); } },
        { id: "copiar", rotulo: "Copiar código", icone: "copiar", fechar: false, aoClicar: () => navigator.clipboard.writeText(String(a.share && a.share.codigo || "")).then(() => toast("Código copiado"), () => {}) },
        { id: "ver", rotulo: "Ver a guia", icone: "olho", aoClicar: () => ativar(a.id) }] });
  } else ilha.limpar("compartilhando");
  // IA (nome da CLI e cota)
  const ia = vivas.filter((a) => TIPOS_IA.includes(a.tipo));
  if (ia.length) {
    const a = ia.find((x) => x.id === ativa) || ia[0], nome = nomeTipo(a.tipo);
    const fazendo = Date.now() - (a.ultimaEscrita || 0) < 4000 && a.estadoSessao !== "login";
    const cota = a.saldoSessao ? ` · ${a.saldoSessao}` : "";
    ilha.publicar("ia", { tipo: "ia", titulo: `${nome} ${fazendo ? "executando" : "aguardando"}`, dado: `${nome}${cota}`,
      detalhe: `${fazendo ? "Trabalhando agora" : "Esperando você"}` + (a.saldoSessao ? ` · sessão ${a.saldoSessao} disponível` : "") + (a.saldoSemana ? ` · semana ${a.saldoSemana}` : ""),
      progresso: fazendo ? "indeterminado" : null,
      acoes: [{ id: "ir", rotulo: "Ir para a guia", icone: "olho", aoClicar: () => ativar(a.id) },
        { id: "evidencia", rotulo: "Salvar evidência", icone: "evidencia", aoClicar: () => { ativar(a.id); evidencia(false); } }] });
    if (fazendo) { clearTimeout(ilhaSync.t); ilhaSync.t = setTimeout(ilhaSync, 4200); }
  } else ilha.limpar("ia");
  // celular conectado
  const cel = (CEL && CEL.conectados) || [];
  if (cel.length) {
    ilha.publicar("celular", { tipo: "celular", titulo: "Celular conectado", dado: cel.length === 1 ? cel[0].nome : `${cel.length} celulares`,
      detalhe: "Este PC pode ser operado pelo celular pareado.",
      acoes: [{ id: "abrir", rotulo: "Abrir Celular", icone: "celular", aoClicar: () => abrirCelular() },
        { id: "desconectar", rotulo: "Desconectar", icone: "parar", perigo: true, aoClicar: () => cel.forEach((c) => api.cel_desconectar(c.id)) }] });
  } else ilha.limpar("celular");
  // queda de conexão: some quando a guia reconecta ou fecha
  for (const id of ilhaSync.quedas || []) {
    const a = abas.get(id.slice(8));
    if (!a || a.conectado) { ilha.limpar(id); ilhaSync.quedas.delete(id); }
  }
}
async function ilhaPararGravacao(a) {
  if (!a || !api || a.mudandoRec) return;
  a.mudandoRec = true; a.gravando = false; desenharRec(a);
  toast("⏸ Gravação parada — daqui em diante só o log em texto (leve)");
  try { const r = await api.gravacao_ligar(a.id, false); a.gravando = !!(r.ok ? r.gravando : true); desenharRec(a); if (!r.ok) toast(r.erro, "erro"); }
  finally { a.mudandoRec = false; ilhaSync(); }
}
function ilhaQueda(a, motivo) {
  if (!ILHA_ON() || !a) return;
  const id = "conexao:" + a.id; (ilhaSync.quedas = ilhaSync.quedas || new Set()).add(id);
  ilha.publicar(id, { tipo: "conexao", titulo: `${a.nome}: conexão encerrada`, dado: "Conexão caiu", detalhe: String(motivo || "").replace(/\s+/g, " ").slice(0, 120),
    acoes: [{ id: "ver", rotulo: "Ver a guia", icone: "olho", aoClicar: () => ativar(a.id) },
      ...(a.params ? [{ id: "reabrir", rotulo: "Reconectar", icone: "refazer", aoClicar: () => { ativar(a.id); reabrirGuia(a); } }] : []),
      { id: "gravacoes", rotulo: "Ver gravações", icone: "pasta", aoClicar: () => $("#btn-historico").click() }] });
}
function ilhaFila(f) {
  if (!ILHA_ON()) return;
  const a = f.atual, L = f.lote || { total: 0, feitos: 0 }, falhas = f.falhas || [];
  const verFila = { id: "fila", rotulo: "Ver a fila", icone: "envio", aoClicar: () => abrirFila() };
  if (a && a.estado === "enviando") {
    ilhaFila.ativo = true;
    ilha.publicar("envio", { tipo: "envio", titulo: "Enviando", dado: L.total > 1 ? `Enviando ${Math.min(L.feitos + 1, L.total)} de ${L.total}` : "Enviando…",
      detalhe: rotuloJob(a), progresso: L.total > 1 ? L.feitos / L.total : "indeterminado", acoes: [verFila] });
  } else if (a && a.estado === "aguardando") {
    ilhaFila.ativo = true;
    ilha.publicar("envio", { tipo: "envio", tom: "aviso", titulo: "Envio aguardando", dado: `${f.pendentes} na fila`,
      detalhe: CANAL_ROT[a.canal] ? `Configure o canal ${CANAL_ROT[a.canal]} para enviar.` : "Abra o WhatsApp para continuar o envio.", progresso: null, acoes: [verFila] });
  } else if (f.pendentes) {
    ilha.publicar("envio", { tipo: "envio", titulo: "Envio na fila", dado: `${f.pendentes} na fila`, detalhe: "Preparando o próximo envio.", progresso: "indeterminado", acoes: [verFila] });
  } else {
    ilha.limpar("envio");
    if (ilhaFila.ativo && !falhas.length) ilha.publicar("conclusao", { tipo: "conclusao", titulo: "Envio concluído", dado: "Enviado", detalhe: "Tudo o que estava na fila foi enviado.", acoes: [verFila] });
    ilhaFila.ativo = false;
  }
  if (falhas.length) ilha.publicar("envio-falha", { tipo: "envio", tom: "erro", prioridade: 75, persistente: true, dispensavel: true, titulo: "Falha no envio",
    dado: falhas.length === 1 ? "1 envio falhou" : `${falhas.length} envios falharam`, detalhe: "Abra a fila para reenviar.", progresso: null, acoes: [verFila] });
  else ilha.limpar("envio-falha");
}
// progresso sem número (relatório, nuvem): barra animada até acabar; na conclusão, aviso curto com atalho para a Biblioteca
function ilhaTarefa(id, titulo, detalhe) { if (ILHA_ON()) ilha.publicar(id, { tipo: "envio", titulo, dado: titulo, detalhe, progresso: "indeterminado" }); }
function ilhaTarefaFim(id, ok, titulo, detalhe, acoes) {
  if (!ILHA_ON()) return; ilha.limpar(id);
  if (ok) ilha.publicar("conclusao", { tipo: "conclusao", titulo, dado: titulo, detalhe: detalhe || "", acoes: acoes || [] });
}
function ilhaBloqueio(segundos) {
  if (!ILHA_ON()) return;
  if (segundos > 0 && segundos <= 90) {
    ilhaBloqueio.ativo = true;
    ilha.publicar("bloqueio", { tipo: "bloqueio", titulo: "Bloqueio por inatividade", dado: "Bloqueia em {t}", fim: Date.now() + segundos * 1000,
      detalhe: "Mexa no teclado ou no mouse para continuar com a sessão aberta.",
      acoes: [{ id: "continuar", rotulo: "Continuar usando", icone: "check", aoClicar: () => { CONTA.toque = 0; contaApi().conta_tocar(CONTA.token).catch(() => {}); ilhaBloqueio(0); } },
        { id: "bloquear", rotulo: "Bloquear agora", icone: "bloqueio", aoClicar: () => { const b = $("#conta-bloquear"); if (b) b.click(); } }] });
  } else { ilhaBloqueio.ativo = false; ilha.limpar("bloqueio"); }
}
