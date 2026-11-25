/* Ilha DASSH: pílula viva no topo da interface (inspirada na Dynamic Island e no notch dos Macs).
 *
 * Componente único. Mostra UM estado por vez (o de maior prioridade), guarda os demais numa fila e se expande para 2 a 4 ações rápidas.
 * API pública (global `ilha`):
 *   ilha.publicar(id, estado)   cria ou atualiza um estado (id estável; republicar com o mesmo id atualiza, sem duplicar)
 *   ilha.limpar(id)             remove o estado
 *   ilha.expandir() / ilha.recolher() / ilha.alternar({ foco })
 *   ilha.registrarTipo(nome, padroes)   acrescenta um tipo de estado (ícone, tom, prioridade, ttl...)
 *   ilha.estado()               fotografia somente leitura (para testes e para a casca nativa)
 * Lugar fixo: a pílula compacta mora no #ilha-slot (centro da barra de sistema) ou, sem slot (janela estreita, celular, tela cheia), no topo
 * da janela; a expandida é um painel flutuante que cresce a partir dela e NUNCA muda o layout. Documentação: docs/ILHA-DASSH.md. Sem dependências; sem cores literais (tudo por variáveis de tema em app.css).
 */
(function (global) {
  "use strict";
  const doc = document;
  if (global.ilha) return;

  // ---------------------------------------------------------------- ícones (24x24, traço 1,8, pontas redondas)
  const ICONES = {
    rec: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/>',
    share: '<circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/><path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>',
    ia: '<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    envio: '<path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 15.5v2.2A2.3 2.3 0 0 0 6.8 20h10.4a2.3 2.3 0 0 0 2.3-2.3v-2.2"/>',
    celular: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.7"/><path d="M10.6 18h2.8"/>',
    bloqueio: '<rect x="5" y="10.6" width="14" height="9.9" rx="2.6"/><path d="M8.2 10.6V8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
    conexao: '<path d="M2.8 9.2a14.4 14.4 0 0 1 18.4 0M5.7 12.6a10.2 10.2 0 0 1 12.6 0M8.6 16a6 6 0 0 1 6.8 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/><path d="M4 3.8l16 16.4"/>',
    evidencia: '<path d="M4 8.7A2.2 2.2 0 0 1 6.2 6.5h1.4l1.2-2h6.4l1.2 2h1.4A2.2 2.2 0 0 1 20 8.7v8.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.3z"/><circle cx="12" cy="13" r="3.5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.7 2.7 5.4-5.6"/>',
    chevron: '<path d="M6.5 14.5L12 9l5.5 5.5"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>',
    pasta: '<path d="M3.6 7.6a2 2 0 0 1 2-2h3.8l2 2.3h7a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z"/>',
    parar: '<rect x="6.8" y="6.8" width="10.4" height="10.4" rx="2.4"/>',
    olho: '<path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.7"/>',
    refazer: '<path d="M19.5 11.2A7.8 7.8 0 1 0 17.2 17"/><path d="M19.6 4.6v6.2h-6.2"/>',
    copiar: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.4"/><path d="M15.5 8.5V6.6a2 2 0 0 0-2-2H6.6a2 2 0 0 0-2 2v6.9a2 2 0 0 0 2 2h1.9"/>',
  };
  const svg = (nome) => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + (ICONES[nome] || ICONES.check) + "</svg>";

  // ---------------------------------------------------------------- catálogo de tipos (padrões de cada estado)
  // tom: define o brilho de acento (variável de tema). ambiente: estado de longa duração (vai ao repouso). ttl: some sozinho.
  const TIPOS = {
    bloqueio:        { icone: "bloqueio", tom: "aviso", prioridade: 90, persistente: true },
    conexao:         { icone: "conexao",  tom: "erro",  prioridade: 80, persistente: true, dispensavel: true },
    evidencia:       { icone: "evidencia", tom: "ok",   prioridade: 70, ttl: 5000 },
    conclusao:       { icone: "check",    tom: "ok",    prioridade: 65, ttl: 5000 },
    envio:           { icone: "envio",    tom: "info",  prioridade: 60 },
    compartilhando:  { icone: "share",    tom: "share",  prioridade: 55, ambiente: true },
    gravando:        { icone: "rec",      tom: "rec",   prioridade: 50, ambiente: true },
    ia:              { icone: "ia",       tom: "ia",    prioridade: 40, ambiente: true },
    celular:         { icone: "celular",  tom: "cel",     prioridade: 35, ambiente: true },
    presenca:        { icone: "check",    tom: "info",  prioridade: 10 },   // não é "ambiente": a presença rotativa nunca vira ponto
  };
  const TONS = ["rec", "ok", "aviso", "erro", "info", "ia", "share", "cel"];
  const MAX_ACOES = 4, MAX_FILA = 3;
  const CFG = { repousoMs: 8000, hoverMs: 140, saidaMs: 450, esfriaMs: 700, vozMs: 650 };

  // ---------------------------------------------------------------- estado interno
  const estados = new Map();      // id -> estado normalizado
  let seq = 0, fixadoId = null;   // fixadoId: estado escolhido pelo usuário na fila (vale até ele sumir)
  let expandida = false, modo = "", montada = false, visivel = false, repouso = false;
  let el = {}, topoAtual = null, focoAnterior = null, viaTeclado = false;
  let tTick = 0, tExp = 0, tRep = 0, tVoz = 0, tHover = 0, tSaida = 0, vozTexto = "", vozUltima = 0, esfriaAte = 0;
  let animCont = null, ro = null, rafPos = 0, ultimaAssinatura = "", larguraRef = 190, alturaRef = 0;

  const reduz = () => !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const toque = () => !!(global.matchMedia && global.matchMedia("(pointer: coarse)").matches);
  const mouseFino = () => !!(global.matchMedia && global.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const molaOk = (() => { try { return !!(global.CSS && CSS.supports("animation-timing-function", "linear(0, 1)")); } catch (_) { return false; } })();
  // mola leve (pequeno repique, sem exagero); quem não entende linear() usa uma curva suave equivalente
  const MOLA = molaOk ? "linear(0, 0.2 4%, 0.55 10%, 0.82 17%, 0.97 25%, 1.03 33%, 1.04 40%, 1.025 49%, 1.01 59%, 1.002 70%, 1)" : "cubic-bezier(.2,.9,.25,1)";
  const SUAVE = "cubic-bezier(.3,.7,.2,1)";

  // ---------------------------------------------------------------- normalização
  function texto(v, max) { v = v == null ? "" : String(v); return v.length > max ? v.slice(0, max - 1) + "…" : v; }
  function normalizar(id, e, anterior) {
    const base = TIPOS[(e && e.tipo) || ""] || {};
    const r = Object.assign({}, base, e || {});
    r.id = String(id);
    r.tipo = (e && e.tipo) || "";
    if (!TONS.includes(r.tom)) r.tom = "info";
    r.icone = ICONES[r.icone] ? r.icone : "check";
    r.prioridade = Number.isFinite(+r.prioridade) ? +r.prioridade : 50;
    r.titulo = texto(r.titulo, 48);
    r.dado = texto(r.dado, 44);
    r.detalhe = texto(r.detalhe, 140);
    r.acoes = (Array.isArray(r.acoes) ? r.acoes : []).filter((a) => a && a.rotulo && typeof a.aoClicar === "function").slice(0, MAX_ACOES)
      .map((a) => ({ id: String(a.id || a.rotulo), rotulo: texto(a.rotulo, 26), icone: ICONES[a.icone] ? a.icone : "", perigo: !!a.perigo,
        fechar: a.fechar !== false, aoClicar: a.aoClicar }));
    if (r.progresso != null && r.progresso !== "indeterminado") r.progresso = Math.max(0, Math.min(1, +r.progresso || 0));
    r.inicio = Number.isFinite(+r.inicio) && r.inicio ? +r.inicio : 0;
    r.fim = Number.isFinite(+r.fim) && r.fim ? +r.fim : 0;
    r.ttl = Number.isFinite(+r.ttl) && r.ttl > 0 ? +r.ttl : 0;
    r.expira = r.ttl ? Date.now() + r.ttl : 0;
    r.ts = anterior ? anterior.ts : ++seq;
    r.novoEm = anterior ? anterior.novoEm : Date.now();
    return r;
  }
  const assinatura = (r) => [r.tipo, r.tom, r.icone, r.prioridade, r.titulo, r.dado, r.detalhe, r.progresso, r.inicio, r.fim, r.ttl,
    r.dispensavel ? 1 : 0, r.acoes.map((a) => a.id + ":" + a.rotulo).join("|")].join("");

  // ---------------------------------------------------------------- relógio dos estados
  const dois = (n) => String(n).padStart(2, "0");
  function relogio(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${dois(m)}:${dois(s % 60)}` : `${m}:${dois(s % 60)}`;
  }
  function dadoDe(r) {
    let t = r.dado || "";
    if (t.includes("{t}")) {
      const agora = Date.now();
      t = t.replace("{t}", r.fim ? relogio(r.fim - agora) : r.inicio ? relogio(agora - r.inicio) : "");
    }
    return t;
  }
  const temRelogio = (r) => !!(r && (r.inicio || r.fim) && (r.dado || "").includes("{t}"));

  // ---------------------------------------------------------------- seleção: prioridade e fila
  function ordenados() {
    return [...estados.values()].sort((a, b) => (b.prioridade - a.prioridade) || (b.ts - a.ts));
  }
  // a presença ("DASSH Code · Pronto") é só o fundo: só aparece sozinha e nunca entra na fila nem na contagem
  const semBase = (x) => x.tipo !== "presenca";
  function escolher() {
    const lista = ordenados();
    if (fixadoId && estados.has(fixadoId)) {
      const f = estados.get(fixadoId);
      return { topo: f, fila: lista.filter((x) => x !== f && semBase(x)) };
    }
    fixadoId = null;
    return { topo: lista[0] || null, fila: lista.slice(1).filter(semBase) };
  }

  // ---------------------------------------------------------------- DOM
  function montar() {
    if (montada || !doc.body) return;
    const topo = doc.querySelector("#sistema");
    const zona = doc.createElement("div");
    zona.id = "ilha-zona"; zona.className = "ilha-zona"; zona.dataset.modo = "";
    zona.innerHTML =
      '<div class="ilha-sonda" aria-hidden="true"></div>' +
      '<div class="ilha-voz" id="ilha-voz" role="status" aria-live="polite" aria-atomic="true"></div>' +
      '<section class="ilha" id="ilha" aria-label="Ilha DASSH" hidden data-expandida="false" data-tom="info">' +
        '<button type="button" class="ilha-cab" id="ilha-cab" aria-expanded="false" aria-controls="ilha-painel">' +
          '<span class="ilha-ic" aria-hidden="true"></span>' +
          '<span class="ilha-dado"></span>' +
          '<span class="ilha-mais" aria-hidden="true" hidden></span>' +
          '<span class="ilha-seta" aria-hidden="true">' + svg("chevron") + "</span>" +
        "</button>" +
        '<div class="ilha-painel" id="ilha-painel" role="group" aria-label="Detalhes e ações rápidas">' +
          '<div class="ilha-linha-tit"><b class="ilha-tit"></b><button type="button" class="ilha-dispensar" aria-label="Dispensar aviso" hidden>' + svg("x") + "</button></div>" +
          '<p class="ilha-det"></p>' +
          '<div class="ilha-barra" hidden><i></i></div>' +
          '<div class="ilha-acoes"></div>' +
          '<ul class="ilha-fila" aria-label="Também acontecendo" hidden></ul>' +
          '<p class="ilha-dica">Esc recolhe · Ctrl+Alt+I</p>' +
        "</div>" +
      "</section>";
    if (topo && topo.parentNode) topo.parentNode.insertBefore(zona, topo.nextSibling);
    else doc.body.insertBefore(zona, doc.body.firstChild);
    el = { zona, sonda: zona.querySelector(".ilha-sonda"), voz: zona.querySelector("#ilha-voz"), ilha: zona.querySelector("#ilha"),
      cab: zona.querySelector("#ilha-cab"), ic: zona.querySelector(".ilha-ic"), dado: zona.querySelector(".ilha-dado"),
      mais: zona.querySelector(".ilha-mais"), painel: zona.querySelector("#ilha-painel"), tit: zona.querySelector(".ilha-tit"),
      det: zona.querySelector(".ilha-det"), barra: zona.querySelector(".ilha-barra"), acoes: zona.querySelector(".ilha-acoes"),
      fila: zona.querySelector(".ilha-fila"), disp: zona.querySelector(".ilha-dispensar") };
    ligarEventos();
    montada = true;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(() => agendarPosicao());
      ["#sistema", "#ilha-slot"].forEach((s) => { const n = doc.querySelector(s); if (n) ro.observe(n); });
    }
    global.addEventListener("resize", agendarPosicao);
    // celular: a barra de sistema rola com a página; a pílula flutuante acompanha o centro dela (sem ficar desalinhada)
    doc.addEventListener("scroll", () => { if (modo !== "slot") agendarPosicao(); }, { passive: true, capture: true });
    new MutationObserver(agendarPosicao).observe(doc.body, { attributes: true, attributeFilter: ["class"] });
    doc.addEventListener("visibilitychange", () => { if (doc.hidden) pararTick(); else programar(); });
  }

  function ligarEventos() {
    const { ilha: raiz, cab } = el;
    // Clicar na Ilha nunca tira o foco do terminal: o botão só recebe foco pelo teclado.
    raiz.addEventListener("mousedown", (ev) => { if (!ev.target.closest("input,textarea,select")) ev.preventDefault(); });
    cab.addEventListener("click", (ev) => { if (!expandida) viaTeclado = ev.detail === 0; alternar(); });
    // Histerese: entrar na Ilha (compacta ou expandida) cancela qualquer saída pendente; sair só recolhe depois de uma folga e,
    // depois de recolher, a Ilha "esfria" um instante antes de poder abrir de novo por hover. Assim nunca há abre-e-fecha em loop.
    raiz.addEventListener("pointerenter", () => {
      clearTimeout(tHover);
      if (!mouseFino() || expandida || Date.now() < esfriaAte) return;
      tHover = setTimeout(() => expandir({ origem: "mouse" }), CFG.hoverMs);
    });
    raiz.addEventListener("pointerleave", () => {
      clearTimeout(tHover);
      if (!expandida || viaTeclado || raiz.contains(doc.activeElement)) return;
      tHover = setTimeout(() => recolher({ origem: "mouse" }), CFG.saidaMs);
    });
    raiz.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && expandida) { ev.preventDefault(); ev.stopPropagation(); recolher({ devolverFoco: true }); }
    });
    raiz.addEventListener("focusout", (ev) => {
      if (!expandida || raiz.contains(ev.relatedTarget)) return;
      if (ev.relatedTarget || viaTeclado) recolher({ origem: "foco" });
    });
    doc.addEventListener("pointerdown", (ev) => { if (expandida && !raiz.contains(ev.target)) recolher({ origem: "fora" }); }, true);
    // atalho: Ctrl+Alt+I leva o foco até a Ilha (e Esc o devolve); o terminal não recebe a tecla
    doc.addEventListener("keydown", (ev) => {
      if (!(ev.ctrlKey && ev.altKey) || (ev.key || "").toLowerCase() !== "i") return;
      ev.preventDefault(); ev.stopImmediatePropagation(); ev.__dasshAtalho = true;
      if (!visivel) return;
      if (expandida && raiz.contains(doc.activeElement)) recolher({ devolverFoco: true });
      else { focoAnterior = doc.activeElement; expandir({ origem: "atalho" }); cab.focus({ preventScroll: true }); }
    }, true);
    el.disp.addEventListener("click", () => { if (topoAtual) { const r = topoAtual; limpar(r.id); if (typeof r.aoDispensar === "function") try { r.aoDispensar(r); } catch (_) {} } });
  }

  // ---------------------------------------------------------------- render
  function desenhar(opcoes) {
    if (!montada) return;
    const { topo, fila } = escolher();
    const mudouTopo = (topo && topo.id) !== (topoAtual && topoAtual.id);
    const sig = topo ? assinatura(topo) + "§" + fila.map((f) => f.id + f.dado + f.prioridade).join(",") : "";
    if (!topo) return sumir();
    if (!mudouTopo && sig === ultimaAssinatura && visivel && !(opcoes && opcoes.forcar)) return;
    ultimaAssinatura = sig;
    const eraVisivel = visivel;
    const aplicar = () => {
      if (mudouTopo || !topo.ambiente) repouso = false;
      topoAtual = topo;
      const { ilha: raiz } = el;
      raiz.hidden = false; visivel = true; el.zona.hidden = false;
      raiz.dataset.tom = topo.tom; raiz.dataset.tipo = topo.tipo || "";
      el.ic.innerHTML = svg(topo.icone);
      el.ic.dataset.pulso = topo.tom === "rec" || topo.tom === "erro" || topo.tom === "aviso" || topo.progresso === "indeterminado" ? "1" : "0";
      el.dado.textContent = dadoDe(topo);
      el.tit.textContent = topo.titulo || topo.dado;
      el.det.textContent = topo.detalhe; el.det.hidden = !topo.detalhe;
      desenharBarra(topo);
      desenharAcoes(topo);
      desenharFila(fila);
      el.mais.hidden = !fila.length; el.mais.textContent = fila.length ? "+" + fila.length : "";
      el.disp.hidden = !topo.dispensavel;
      raiz.dataset.repouso = repouso && !expandida ? "true" : "false";
      atualizarRotulo();
    };
    if (!eraVisivel) { entrar(aplicar); } else morph(aplicar, { trocouConteudo: mudouTopo });
    if (mudouTopo) { anunciar(topo); armarRepouso(topo); }
    programar();
  }

  function desenharBarra(r) {
    const b = el.barra;
    if (r.progresso == null) { b.hidden = true; return; }
    b.hidden = false;
    b.dataset.indeterminado = r.progresso === "indeterminado" ? "1" : "0";
    b.firstElementChild.style.transform = r.progresso === "indeterminado" ? "" : `scaleX(${r.progresso})`;
    b.setAttribute("role", "progressbar");
    if (r.progresso === "indeterminado") b.removeAttribute("aria-valuenow");
    else { b.setAttribute("aria-valuemin", "0"); b.setAttribute("aria-valuemax", "100"); b.setAttribute("aria-valuenow", String(Math.round(r.progresso * 100))); }
    b.setAttribute("aria-label", r.titulo || "Progresso");
  }
  function desenharAcoes(r) {
    el.acoes.textContent = "";
    el.acoes.hidden = !r.acoes.length;
    el.acoes.dataset.n = String(r.acoes.length);
    r.acoes.forEach((a) => {
      const b = doc.createElement("button");
      b.type = "button"; b.className = "ilha-acao" + (a.perigo ? " perigo" : ""); b.dataset.acao = a.id;
      b.innerHTML = (a.icone ? svg(a.icone) : "") + "<span></span>";
      b.lastChild.textContent = a.rotulo;
      b.addEventListener("click", () => {
        try { a.aoClicar(r); } catch (err) { if (global.console) console.error("ilha: ação falhou", err); }
        if (a.fechar) recolher({ devolverFoco: viaTeclado });
      });
      el.acoes.appendChild(b);
    });
  }
  function desenharFila(fila) {
    const ul = el.fila;
    ul.textContent = ""; const itens = fila.slice(0, MAX_FILA);
    ul.hidden = !itens.length;
    itens.forEach((f) => {
      const li = doc.createElement("li"), b = doc.createElement("button");
      b.type = "button"; b.className = "ilha-item"; b.dataset.id = f.id; b.dataset.tom = f.tom;
      b.innerHTML = '<span class="ilha-item-ic">' + svg(f.icone) + '</span><span class="ilha-item-t"></span><span class="ilha-item-d"></span>';
      b.children[1].textContent = f.titulo || f.dado; b.children[2].textContent = dadoDe(f);
      b.setAttribute("aria-label", `Mostrar: ${f.titulo || f.dado}`);
      b.addEventListener("click", () => { fixadoId = f.id; desenhar({ forcar: true }); });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function atualizarRotulo() {
    if (!topoAtual) return;
    const acao = expandida ? "Recolher ações" : "Expandir ações";
    el.cab.setAttribute("aria-label", `${topoAtual.titulo || "Ilha DASSH"}: ${dadoDe(topoAtual)}. ${acao}`);
    el.cab.setAttribute("aria-expanded", expandida ? "true" : "false");
    el.painel.setAttribute("aria-hidden", expandida ? "false" : "true");
    if ("inert" in el.painel) el.painel.inert = !expandida;
  }

  // ---------------------------------------------------------------- geometria (lugar fixo, sem reservar altura)
  // "slot": a pílula compacta mora no #ilha-slot, no centro da barra de sistema (largura > 900 px). "flutuante": sem slot (janela estreita,
  // celular, tela cheia) ela fica fixa no topo, centralizada e abaixo do recorte (safe-area). Em nenhum modo a Ilha ocupa espaço do layout.
  function seguro() {
    const v = parseFloat(getComputedStyle(el.sonda).paddingTop); return Number.isFinite(v) ? v : 0;
  }
  function barra() {
    const n = doc.querySelector("#sistema");
    if (!n || doc.body.classList.contains("tela-cheia")) return null;
    const r = n.getBoundingClientRect();
    return r.height > 0 ? { r, cs: getComputedStyle(n) } : null;
  }
  function slotRect() {
    const n = doc.querySelector("#ilha-slot"); if (!n) return null;
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  function decidirModo() {
    const sr = slotRect();
    return sr && global.innerWidth > 900 && sr.width >= 140 && barra() ? "slot" : "flutuante";
  }
  // centro (x, y) da pílula compacta e largura máxima: SEMPRE calculados a partir do lugar fixo, nunca da Ilha expandida,
  // então abrir ou fechar não muda o centro nem o topo e o ponteiro nunca fica fora dela.
  function ancora(m) {
    const vw = global.innerWidth, b = barra();
    if (m === "slot") { const r = slotRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, max: Math.min(r.width, 380) }; }
    let cy = 8 + seguro() + (alturaRef || 34) / 2, max = Math.min(340 * (parseFloat(getComputedStyle(doc.documentElement).getPropertyValue("--k")) || 1), vw - 24);
    if (b) {
      const pt = parseFloat(b.cs.paddingTop) || 0, pb = parseFloat(b.cs.paddingBottom) || 0;
      // no centro da barra; se ela já rolou para cima, para logo abaixo do recorte (nunca some sob a barra de status)
      cy = Math.max((b.r.top + pt + b.r.bottom - pb) / 2, cy);
      const lim = (s) => { const n = doc.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return r.width ? r : null; };
      // o cursor do nome digitado (.mn-cursor) passa da caixa da marca; o "← Site" (plataforma web) fica ao lado dela
      const marca = lim("#sistema .marca"), cursor = lim("#sistema .mn-cursor"), volta = lim("#sistema > #volta-site"), menu = lim("#sis-menu");
      const esq = Math.max(marca ? marca.right + 8 : 12, cursor ? cursor.right + 3 : 0, volta ? volta.right + 8 : 0), dir = menu ? menu.left - 8 : vw - 12;
      max = Math.min(max, 2 * Math.min(vw / 2 - esq, dir - vw / 2));
    }
    return { cx: vw / 2, cy, max: Math.max(max, 110) };
  }
  function geometria(w, h, exp) {
    const vw = global.innerWidth, margem = 12, a = ancora(modo || decidirModo());
    const href = alturaRef || h;
    const y = exp ? a.cy - href / 2 : a.cy - h / 2;
    return { x: Math.round(Math.min(Math.max(a.cx - w / 2, margem), Math.max(margem, vw - w - margem))), y: Math.round(Math.max(y, 2)) };
  }
  function aplicarPos(w, h) {
    const g = geometria(w, h, expandida); el.ilha.style.translate = `${g.x}px ${g.y}px`; return g;
  }
  function medir() {
    const r = el.ilha;
    if (!expandida) r.style.setProperty("--ilha-max", Math.floor(ancora(modo || decidirModo()).max) + "px");
    const antes = [r.style.width, r.style.height];
    r.style.width = ""; r.style.height = "";
    const w = r.offsetWidth, h = r.offsetHeight;
    r.style.width = antes[0]; r.style.height = antes[1];
    if (!expandida && r.dataset.repouso !== "true") { larguraRef = w; alturaRef = h; }
    return { w, h };
  }
  function agendarPosicao() {
    if (rafPos || !montada) return;
    rafPos = requestAnimationFrame(() => { rafPos = 0; if (visivel) posicionar(); else if (estados.size) desenhar({ forcar: true }); });
  }
  function posicionar() {
    cancelarAnim();
    const novo = expandida ? modo : decidirModo();
    if (novo !== modo) { modo = novo; el.zona.dataset.modo = modo; }
    el.zona.dataset.visivel = visivel ? "1" : "0";
    const { w, h } = medir(); aplicarPos(w, h);
    el.ilha.style.width = ""; el.ilha.style.height = "";
  }
  function raioPara(h, exp) { return exp ? 24 : Math.round(h / 2); }

  // ---------------------------------------------------------------- animação (FLIP em largura, altura, posição e raio; mola leve)
  function cancelarAnim() { if (animCont) { try { animCont.cancel(); } catch (_) {} animCont = null; } }
  function pode() { return !reduz() && typeof el.ilha.animate === "function" && visivel; }
  function medirPrimeiro() { const r = el.ilha.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left, y: r.top }; }
  function morph(mutar, op) {
    op = op || {};
    const animar = pode() && !el.ilha.hidden;
    const a = animar ? medirPrimeiro() : null;
    cancelarAnim();
    mutar();
    const novo = expandida ? modo : decidirModo();
    if (novo !== modo) { modo = novo; el.zona.dataset.modo = modo; }
    const { w, h } = medir();
    const g = aplicarPos(w, h);
    if (!animar || !a || (Math.abs(a.w - w) < 1 && Math.abs(a.h - h) < 1 && Math.abs(a.x - g.x) < 1 && Math.abs(a.y - g.y) < 1)) { if (animar && op.trocouConteudo) fadeConteudo(); return; }
    const k = (x, y, ww, hh, r) => ({ translate: `${x}px ${y}px`, width: ww + "px", height: hh + "px", borderRadius: r + "px" });
    const desde = k(a.x, a.y, a.w, a.h, raioPara(a.h, a.h > 60));
    const ate = k(g.x, g.y, w, h, raioPara(h, expandida));
    el.ilha.style.setProperty("--ilha-r", raioPara(h, expandida) + "px");
    const anim = el.ilha.animate([desde, ate], { duration: expandida ? 520 : 440, easing: MOLA });
    animCont = anim;
    anim.onfinish = anim.oncancel = () => { if (animCont === anim) animCont = null; };
    fadeConteudo();
  }
  function fadeConteudo() {
    if (!pode()) return;
    const alvo = expandida ? [el.painel] : [];
    [el.ic, el.dado, el.mais, ...alvo].forEach((n, i) => {
      try { n.animate([{ opacity: 0, transform: "translateY(3px)", filter: "blur(3px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
        { duration: 260, delay: 50 + i * 18, easing: SUAVE, fill: "backwards" }); } catch (_) {}
    });
  }
  function entrar(aplicar) {
    cancelarAnim();
    el.ilha.hidden = false; visivel = true;
    aplicar();
    modo = decidirModo(); el.zona.dataset.modo = modo; el.zona.dataset.visivel = "1";
    const { w, h } = medir(); aplicarPos(w, h);
    el.ilha.style.setProperty("--ilha-r", raioPara(h, false) + "px");
    if (!pode()) return;
    const g = geometria(w, h, false);
    const anim = el.ilha.animate([
      { opacity: 0, scale: "0.55", translate: `${g.x}px ${g.y - 10}px`, filter: "blur(4px)" },
      { opacity: 1, scale: "1", translate: `${g.x}px ${g.y}px`, filter: "blur(0)" }], { duration: 520, easing: MOLA });
    animCont = anim; anim.onfinish = anim.oncancel = () => { if (animCont === anim) animCont = null; };
  }
  function sumir() {
    if (!visivel) return;
    clearTimeout(tRep); pararTick(); clearTimeout(tExp);
    topoAtual = null; ultimaAssinatura = ""; fixadoId = null; visivel = false;
    const fim = () => { if (visivel) return; el.ilha.hidden = true; expandida = false; el.ilha.dataset.expandida = "false"; el.zona.dataset.modo = ""; el.zona.dataset.visivel = "0"; modo = ""; };
    if (!reduz() && typeof el.ilha.animate === "function") {
      cancelarAnim();
      const g = geometria(el.ilha.offsetWidth, el.ilha.offsetHeight, expandida);
      const anim = el.ilha.animate([{ opacity: 1, scale: "1", translate: `${g.x}px ${g.y}px` }, { opacity: 0, scale: "0.7", translate: `${g.x}px ${g.y - 8}px` }], { duration: 260, easing: SUAVE });
      animCont = anim; anim.onfinish = () => { animCont = null; fim(); }; anim.oncancel = () => { animCont = null; };
    } else fim();
  }

  // ---------------------------------------------------------------- expandir / recolher
  function expandir(op) {
    if (!montada || !visivel || expandida) return;
    op = op || {};
    viaTeclado = op.origem === "atalho" || op.origem === "teclado";
    morph(() => { expandida = true; el.ilha.dataset.expandida = "true"; el.ilha.dataset.repouso = "false"; atualizarRotulo(); });
    clearTimeout(tRep); programar();
  }
  function recolher(op) {
    if (!montada || !expandida) return;
    op = op || {};
    const volta = op.devolverFoco && focoAnterior && doc.contains(focoAnterior) ? focoAnterior : null;
    esfriaAte = Date.now() + CFG.esfriaMs;
    clearTimeout(tHover);
    morph(() => { expandida = false; el.ilha.dataset.expandida = "false"; atualizarRotulo(); });
    viaTeclado = false;
    if (volta) { try { volta.focus({ preventScroll: true }); } catch (_) {} }
    else if (op.devolverFoco && doc.activeElement !== el.cab && el.ilha.contains(doc.activeElement)) { try { el.cab.focus({ preventScroll: true }); } catch (_) {} }
    focoAnterior = null;
    armarRepouso(topoAtual);
    if (fixadoId) { fixadoId = null; desenhar({ forcar: true }); }
  }
  function alternar() { return expandida ? recolher({ devolverFoco: false }) : expandir({ origem: viaTeclado ? "teclado" : "clique" }); }

  // ---------------------------------------------------------------- repouso: estados ambiente descansam em um ponto discreto
  function armarRepouso(r) {
    clearTimeout(tRep);
    if (!r || !r.ambiente || expandida || CFG.repousoMs <= 0) return;
    tRep = setTimeout(() => {
      if (expandida || !topoAtual || !topoAtual.ambiente) return;
      morph(() => { repouso = true; el.ilha.dataset.repouso = "true"; });
    }, CFG.repousoMs);
  }

  // ---------------------------------------------------------------- relógio e expiração (UM timer de cada, só quando preciso)
  function pararTick() { if (tTick) { clearInterval(tTick); tTick = 0; } }
  function programar() {
    clearTimeout(tExp);
    const prox = [...estados.values()].filter((r) => r.expira).sort((a, b) => a.expira - b.expira)[0];
    if (prox) tExp = setTimeout(() => limpar(prox.id), Math.max(0, prox.expira - Date.now()) + 5);
    const precisa = !doc.hidden && visivel && [topoAtual, ...(expandida ? [...estados.values()].slice(0, MAX_FILA + 1) : [])].some(temRelogio);
    if (precisa && !tTick) tTick = setInterval(tique, 1000);
    else if (!precisa) pararTick();
  }
  function tique() {
    if (!topoAtual) return pararTick();
    const t = dadoDe(topoAtual);
    if (el.dado.textContent !== t) {
      el.dado.textContent = t;
      // o contêiner cresce quando o relógio ganha um dígito: reposiciona sem animar
      agendarPosicao();
    }
    if (expandida) el.fila.querySelectorAll(".ilha-item").forEach((b) => { const f = estados.get(b.dataset.id); if (f) b.children[2].textContent = dadoDe(f); });
  }

  // ---------------------------------------------------------------- leitor de tela: educado, sem repetir a cada tique
  function anunciar(r) {
    if (!r) return;
    clearTimeout(tVoz);
    const quando = Math.max(CFG.vozMs, 2400 - (Date.now() - vozUltima));
    tVoz = setTimeout(() => {
      const atual = topoAtual; if (!atual) return;
      const dado = (atual.dado || "").replace("{t}", "").replace(/\s+/g, " ").trim();
      const t = (atual.anunciar || [atual.titulo, dado].filter(Boolean).join(". ")).trim();
      if (t && t !== vozTexto) { vozTexto = t; vozUltima = Date.now(); el.voz.textContent = t; }
    }, quando);
  }

  // ---------------------------------------------------------------- API
  function publicar(id, estado) {
    if (id == null || id === "") throw new TypeError("ilha.publicar: id obrigatório");
    montar();
    const ant = estados.get(String(id));
    const novo = normalizar(id, estado, ant);
    if (ant && assinatura(ant) === assinatura(novo)) {   // nada mudou: o relógio da expiração não reinicia e nada é redesenhado
      novo.expira = ant.expira; estados.set(novo.id, Object.assign(ant, { acoes: novo.acoes, aoDispensar: novo.aoDispensar, ambiente: novo.ambiente }));
      return;
    }
    if (ant && !ant.ttl) novo.expira = 0;
    estados.set(novo.id, novo);
    desenhar();
    notificarNativo();
  }
  function limpar(id) {
    id = String(id);
    if (!estados.delete(id)) return;
    if (fixadoId === id) fixadoId = null;
    if (montada) desenhar({ forcar: true });
    notificarNativo();
  }
  function registrarTipo(nome, padroes) {
    if (!/^[a-z][a-z0-9_-]{1,30}$/.test(nome)) throw new TypeError("ilha.registrarTipo: nome inválido");
    TIPOS[nome] = Object.assign({ icone: "check", tom: "info", prioridade: 50 }, padroes || {});
  }
  function foto() {
    const { topo, fila } = escolher();
    return { visivel, expandida, modo, repouso: repouso && !expandida, topo: topo ? topo.id : null, tipo: topo ? topo.tipo : null,
      dado: topo ? dadoDe(topo) : "", fila: fila.map((f) => f.id), total: [...estados.values()].filter(semBase).length };
  }
  // Ponto de extensão da casca nativa (Live Activity no iPhone): não implementado nesta versão, só o gancho.
  // A cada mudança sai um evento "dassh:ilha" com um resumo sem funções; a casca pode ouvir ou ler window.ilha.estado().
  function notificarNativo() {
    try { global.dispatchEvent(new CustomEvent("dassh:ilha", { detail: foto() })); } catch (_) {}
  }
  global.ilha = Object.freeze({ publicar, limpar, expandir: () => expandir({ origem: "api" }), recolher: () => recolher({ devolverFoco: false }),
    alternar, registrarTipo, estado: foto, configurar: (c) => Object.assign(CFG, c || {}), tipos: () => Object.keys(TIPOS), _montar: montar });

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", montar); else montar();
})(window);
