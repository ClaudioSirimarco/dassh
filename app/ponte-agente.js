// Ponte do DASSH CONECTOR: roda a interface REAL do DASSH Console (a mesma `ui/` do app) no navegador.
// No app local (pywebview) este arquivo não faz nada. Na web, substitui `window.pywebview.api` por chamadas ao Conector local
// (127.0.0.1, WebSocket com segredo): o backend é o MESMO Python do app, então as ~90 funções são as mesmas.
// ACIONAMENTO AUTOMÁTICO: a página gera um segredo, abre `dassh-conector://iniciar?s=<segredo>` (o Windows inicia o Conector ou
// entrega o segredo ao que já está rodando) e procura o Conector nas portas locais. Nada para digitar.
// NO CELULAR (ou com #par= / #celular no link): "📱 Conectar ao meu computador" — a mesma `api` vai pelo canal cifrado do
// pareamento até o PC (ponte-remota.js + conectado.py), e a interface inteira passa a operar o PC pareado.
(function () {
  if (window.pywebview) return;   // app local: nada a fazer
  const ws_ = { sock: null, id: 0, pend: new Map(), pronto: false, tentativas: 0, acionando: false, acionou: false };
  const PORTAS = Array.from({ length: 20 }, (_, i) => 8977 + i);
  const lerSessao = () => { try { return sessionStorage.getItem("dassh.agente") || ""; } catch (_) { return ""; } };
  const gravarSessao = (v) => { try { sessionStorage.setItem("dassh.agente", v); } catch (_) {} };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  // PLANO B (Safari e navegadores que bloqueiam ws://127.0.0.1 vindo de página https): o próprio Conector serve esta interface
  // em http://127.0.0.1:<porta>/app/ (mesma origem, sem conteúdo misto); a página oferece "Abrir pela janela local".
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);   // já estamos na janela local do Conector
  const UA = navigator.userAgent || "";
  const SAFARI = /safari/i.test(UA) && !/chrome|chromium|crios|fxios|edg|opr|android/i.test(UA);
  const URL_CONECTOR = LOCAL ? "https://claudiosirimarco.github.io/dassh/agente/" : "../agente/";
  const abrirProtocolo = (u) => {   // abre o protocolo sem sair da página
    try { const a = document.createElement("a"); a.href = u; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove(); } catch (_) {}
  };
  const segredoNovo = () => { const b = crypto.getRandomValues(new Uint8Array(24)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };

  // ---- credenciais: #agente=PORTA.SEGREDO (o fragmento nunca vai a servidor) ou a sessão do navegador ----
  let cred = "";
  const m = /(?:^|[#&])agente=(\d{2,5})\.([A-Za-z0-9_-]{16,})/.exec(location.hash);
  if (m) { cred = m[1] + "." + m[2]; gravarSessao(cred); history.replaceState(null, "", location.pathname + location.search); }
  else cred = lerSessao();

  // ---- tela de conexão ----
  const tela = document.createElement("div");
  tela.id = "pareamento";
  tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-labelledby", "par-tit");
  tela.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0d1117;color:#e6edf3;font:14px/1.45 'Segoe UI',system-ui,sans-serif;padding:16px";
  tela.innerHTML = `<div style="width:min(460px,100%);background:#161b22;border:1px solid #30363d;border-radius:14px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <h2 id="par-tit" style="margin:0 0 6px;font-size:18px">DASSH Console na web</h2>
      <p style="margin:0 0 12px;color:#8b949e">Para usar serial, SSH, PowerShell e o resto direto do navegador, a página usa o <b>DASSH Conector</b>:
        um programa leve que roda só neste computador. Ele é chamado sozinho.</p>
      <div id="par-msg" role="status" aria-live="polite" style="min-height:22px;margin-bottom:12px;color:#c9d1d9"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button id="par-abrir" style="background:#00a884;color:#04201a;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer">Abrir o DASSH Conector</button>
        <button id="par-local" hidden style="background:#21262d;color:#e6edf3;border:1px solid #3fb9a0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer"
          title="O Conector abre esta mesma plataforma em http://127.0.0.1 (necessário no Safari)">Abrir pela janela local</button>
        <a href="${URL_CONECTOR}" style="color:#3fb9a0;align-self:center">Ainda não tenho o Conector</a></div>
      <div id="par-local-dica" hidden style="margin:-4px 0 12px;font-size:12.5px;color:#8b949e"></div>
      <details style="color:#8b949e"><summary style="cursor:pointer">Conectar com código (avançado)</summary>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="par-cred" placeholder="8977.código" autocomplete="off" spellcheck="false" aria-label="Porta e código do Conector"
            style="flex:1;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:9px 11px;font:13px Consolas,monospace">
          <button id="par-ir" style="background:#21262d;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:0 14px;cursor:pointer">Conectar</button></div></details>
      <p style="margin:12px 0 0;font-size:12px;color:#6e7681">Se o navegador perguntar "Abrir DASSH Conector?", clique em <b>Abrir</b> (marque "sempre permitir" para não perguntar de novo).
        Se perguntar sobre <b>acesso à rede local</b>, clique em <b>Permitir</b>. O Conector só escuta em 127.0.0.1 e só aceita este site.</p></div>`;
  const msg = (t, erro) => { const e = tela.querySelector("#par-msg"); e.textContent = t; e.style.color = erro ? "#ff8b8b" : "#c9d1d9"; };
  const mostrar = () => { if (!tela.isConnected) document.body.appendChild(tela); };
  tela.querySelector("#par-abrir").onclick = () => acionar(true);
  tela.querySelector("#par-local").onclick = () => abrirLocal();
  const mostrarLocal = () => { if (!LOCAL) { mostrar(); tela.querySelector("#par-local").hidden = false; } };
  function abrirLocal() {   // plano B: a mesma interface, servida pelo Conector em http://127.0.0.1 (segredo no #fragmento)
    const [porta, token] = (cred || "").split(".");
    if (porta && token) { location.href = "http://127.0.0.1:" + porta + "/app/#agente=" + porta + "." + token; return; }
    const S = segredoNovo();
    abrirProtocolo("dassh-conector://iniciar?s=" + S + "&local=1");   // o Conector abre a janela local já pareada
    msg("O DASSH Conector vai abrir a plataforma numa janela local (http://127.0.0.1)…");
    const d = tela.querySelector("#par-local-dica");
    setTimeout(() => {
      d.hidden = false;
      d.innerHTML = 'Não abriu? <a style="color:#3fb9a0" href="http://127.0.0.1:8977/app/#agente=8977.' + S + '">Abrir a janela local manualmente</a> (o Conector precisa estar aberto).';
    }, 4000);
  }
  tela.querySelector("#par-ir").onclick = () => { ws_.manual = true; const v = tela.querySelector("#par-cred").value.trim(); if (/^\d{2,5}\.[A-Za-z0-9_-]{16,}$/.test(v)) { cred = v; gravarSessao(v); conectar(); } else msg("Formato: PORTA.CÓDIGO (ex.: 8977.abc…)", true); };
  tela.querySelector("#par-cred").onkeydown = (e) => { if (e.key === "Enter") tela.querySelector("#par-ir").click(); };

  // ---- RPC ----
  function rpc(metodo, args) {
    return new Promise((ok, falha) => {
      if (!ws_.sock || ws_.sock.readyState !== 1) return falha(new Error("Conector desconectado"));
      const id = ++ws_.id; ws_.pend.set(id, { ok, falha });
      ws_.sock.send(JSON.stringify({ t: "rpc", id, m: metodo, a: args }));
    });
  }
  const EXTRAS = {   // o que no navegador é feito pelo próprio navegador (o resto vai ao Conector)
    tela_cheia: async (on) => { try { if (on) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); } catch (_) {} return true; },
    abrir_link: async (u) => { window.open(u, "_blank", "noopener"); return true; },
  };
  const api = new Proxy({}, { get: (_, nome) => (typeof nome === "string" && nome !== "then") ? (...a) => (EXTRAS[nome] ? EXTRAS[nome](...a) : rpc(nome, a)) : undefined });

  // ---- acionamento automático do Conector ----
  function testar(porta, token, ms) {   // true se o Conector desta porta aceita o segredo
    return new Promise((ok) => {
      let s, fim = false; const pronto = (v) => { if (fim) return; fim = true; try { s.close(); } catch (_) {} ok(v); };
      try { s = new WebSocket("ws://127.0.0.1:" + porta + "/ws"); } catch (_) { return ok(false); }
      const t = setTimeout(() => pronto(false), ms);
      s.onopen = () => s.send(JSON.stringify({ t: "auth", token }));
      s.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.t === "ok") { clearTimeout(t); pronto(true); } } catch (_) {} };
      s.onerror = s.onclose = () => { clearTimeout(t); pronto(false); };
    });
  }
  async function acionar(peloBotao) {
    if (ws_.acionando) return;
    ws_.acionando = true; ws_.acionou = true; mostrar();
    const S = window.__segredoConector || segredoNovo();   // (o gancho só é usado pelos testes automáticos)
    msg("Abrindo o DASSH Conector neste computador…");
    abrirProtocolo("dassh-conector://iniciar?s=" + S);
    const ate = Date.now() + 30000;
    ws_.manual = false;
    while (Date.now() < ate && !ws_.manual) {
      for (const p of PORTAS) {
        if (ws_.manual) { ws_.acionando = false; return; }   // o usuário preferiu digitar o código: para a busca automática
        if (await testar(p, S, 600)) { cred = p + "." + S; gravarSessao(cred); ws_.acionando = false; msg("Conectado. Carregando…"); return conectar(); }
      }
      if (ws_.manual) { ws_.acionando = false; return; }
      msg("Aguardando o DASSH Conector responder… (se o navegador perguntou, clique em Abrir)");
      await dormir(700);
    }
    ws_.acionando = false;
    if (ws_.manual) return;
    mostrarLocal();
    if (SAFARI && !LOCAL) return msg("O Safari não deixa esta página segura falar com o Conector local. Clique em \"Abrir pela janela local\".", true);
    msg(peloBotao ? "O Conector não respondeu. Ele está instalado? Veja \"Ainda não tenho o Conector\"." :
      "Não encontrei o DASSH Conector. Clique em \"Abrir o DASSH Conector\" ou instale-o pelo link ao lado.", true);
  }

  // ---- conexão principal ----
  function conectar() {
    const [porta, token] = cred.split(".");
    if (!porta || !token) return acionar(false);
    mostrar(); msg("Conectando ao DASSH Conector…");
    let sock; try { sock = new WebSocket("ws://127.0.0.1:" + porta + "/ws"); } catch (_) { mostrarLocal(); msg("O navegador impediu a conexão local. Use \"Abrir pela janela local\".", true); return; }
    ws_.sock = sock; let autenticado = false;
    sock.onopen = () => sock.send(JSON.stringify({ t: "auth", token }));
    sock.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
      if (d.t === "ok") {
        autenticado = true; ws_.tentativas = 0; tela.remove();
        if (!ws_.pronto) {
          ws_.pronto = true; window.pywebview = { api };
          // só avisa a interface depois que TODA a página carregou (app.js incluso): se o Conector respondesse antes,
          // o aviso se perdia e a abertura ficava ~20 s esperando
          const avisar = () => window.dispatchEvent(new Event("pywebviewready"));
          if (document.readyState === "complete") setTimeout(avisar, 0); else window.addEventListener("load", avisar, { once: true });
        }
      } else if (d.t === "res") {
        const p = ws_.pend.get(d.id); if (!p) return; ws_.pend.delete(d.id);
        d.e ? p.falha(new Error(d.e)) : p.ok(d.r);
      } else if (d.t === "ev" && /^[A-Za-z_$][\w$]*$/.test(d.fn || "") && typeof window[d.fn] === "function") {
        try { window[d.fn](...(d.a || [])); } catch (e) { console.error("evento", d.fn, e); }
      } else if (d.t === "erro") { msg(d.e || "recusado", true); }
    };
    sock.onclose = (ev) => {
      ws_.pend.forEach((p) => p.falha(new Error("Conector desconectado"))); ws_.pend.clear();
      if (!ws_.pronto && !autenticado) {   // credencial velha ou Conector parado: aciona sozinho (uma vez)
        cred = ""; gravarSessao("");
        if (!ws_.acionou) return acionar(false);
        mostrar(); msg(ev.code === 4401 ? "Código recusado pelo Conector." : "Não consegui falar com o Conector.", true); return;
      }
      mostrar(); msg("Conexão com o Conector perdida. Reconectando… (os terminais continuam abertos no Conector)", true);
      if (ws_.tentativas++ < 40) setTimeout(() => location.reload(), Math.min(1000 * ws_.tentativas, 5000));
    };
  }
  // =================================================================================================================
  // 📱 CELULAR: "Conectar ao meu computador" — a MESMA interface operando o PC pareado, com a mesma ponte (RPC api.* + eventos
  // window[fn](...)) indo pelo canal cifrado de ponta a ponta do pareamento (ponte-remota.js + conectado.py) em vez de 127.0.0.1.
  // =================================================================================================================
  const CELULAR = /iPhone|iPad|iPod|Android|Mobile/i.test(UA);
  const lerPar = () => { try { const d = JSON.parse(localStorage.getItem("dassh-cel-v1") || "null"); return d && d.pc ? d : null; } catch (_) { return null; } };
  const lerRem = () => { try { return sessionStorage.getItem("dassh.remoto") === "1"; } catch (_) { return false; } };
  const gravarRem = (v) => { try { v ? sessionStorage.setItem("dassh.remoto", "1") : sessionStorage.removeItem("dassh.remoto"); } catch (_) {} };
  const mPar = /(?:^|[#&])par=([A-Za-z0-9-]{1,20})/.exec(location.hash);
  const codPar = mPar ? mPar[1].toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  const pedeCel = /(?:^|[#&])celular(?:$|&)/.test(location.hash);
  if (codPar || pedeCel) try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}   // código fora do histórico
  const JANELA_CONECTOR = LOCAL && /^\/app(\/|$)/.test(location.pathname);   // a janela local servida pelo próprio Conector
  const MODO_CEL = !JANELA_CONECTOR && !m && (CELULAR || !!codPar || pedeCel || lerRem());
  const escH = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rem = { R: null, info: null, minhas: new Set(), anexadas: new Set(), soltas: new Set(), prontoUI: false, ativo: false };
  window.__remoto = rem;   // (testes) estado visível — nenhuma chave fica aqui

  function carregarCanal() {   // mqtt.min.js (script comum) + ponte-remota.js (módulo com a criptografia), só quando precisa
    if (rem.R) return Promise.resolve(rem.R);
    return new Promise((ok, falha) => {
      if (window.mqtt) return ok();
      const s = document.createElement("script"); s.src = "vendor/mqtt.min.js"; s.onload = ok;
      s.onerror = () => falha(new Error("não consegui carregar o canal (vendor/mqtt.min.js)")); document.head.appendChild(s);
    }).then(() => import("./ponte-remota.js")).then((R) => { rem.R = R; prepararCanal(R); return R; });
  }

  const telaCel = document.createElement("div");
  telaCel.id = "tela-celular";
  telaCel.setAttribute("role", "dialog"); telaCel.setAttribute("aria-modal", "true"); telaCel.setAttribute("aria-labelledby", "rc-tit");
  telaCel.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0b0f14;color:#e6edf3;font:15px/1.45 -apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;padding-top:calc(16px + env(safe-area-inset-top))";
  const BTN = "border:0;border-radius:14px;padding:16px;font:700 17px inherit;cursor:pointer;width:100%";
  const CAMPO = "width:100%;box-sizing:border-box;background:#0e141b;color:#e6edf3;border:1px solid #233041;border-radius:10px;padding:12px;font-size:16px";
  telaCel.innerHTML = `<div style="width:min(440px,100%);text-align:center">
      <div style="font-weight:800;font-size:22px;letter-spacing:.5px;margin-bottom:4px">D<span style="color:#00dc78">A</span>SSH Console</div>
      <p id="rc-tit" style="margin:0 0 22px;color:#8b98a8">Use o seu computador daqui: abas, shell, serial no cabo console, evidências e Biblioteca.</p>
      <button id="rc-conectar" style="${BTN};background:#00dc78;color:#04140d">📱 Conectar ao meu computador</button>
      <div id="rc-msg" role="status" aria-live="polite" style="min-height:24px;margin:14px 0 0;color:#c9d1d9"></div>
      <div id="rc-sas" hidden style="margin:10px 0 0;color:#8b98a8">Número de conferência (confira no PC):
        <div id="rc-sas-n" style="font:700 26px Consolas,monospace;letter-spacing:4px;color:#5ee0b5;margin-top:4px"></div></div>
      <div id="rc-par" hidden style="text-align:left;background:#131a22;border:1px solid #233041;border-radius:14px;padding:16px;margin-top:16px">
        <b style="display:block;margin-bottom:6px">Primeira vez neste celular?</b>
        <p style="margin:0 0 10px;color:#8b98a8;font-size:14px">No computador, abra o DASSH Console e toque em <b>📱 Celular → Parear celular</b>.
          Aponte a câmera do celular para o QR — ou digite o código abaixo.</p>
        <input id="rc-codigo" placeholder="ABCD-EFGH-JKLM" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de pareamento"
          style="${CAMPO};font:600 20px Consolas,monospace;letter-spacing:2px;text-align:center;text-transform:uppercase">
        <input id="rc-nome" maxlength="40" placeholder="Nome deste aparelho" aria-label="Nome deste aparelho" style="${CAMPO};margin-top:8px">
        <button id="rc-parear" style="${BTN};margin-top:12px;background:#00dc78;color:#04140d">Parear e conectar</button></div>
      <div id="rc-acoes" style="margin-top:18px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:13px">
        <a id="rc-esquecer" href="#" hidden style="color:#8b98a8">Esquecer este computador</a>
        <a id="rc-conector" href="#" style="color:#8b98a8">Usar o DASSH Conector deste aparelho</a></div>
      <p style="margin:18px 0 0;font-size:12px;color:#6e7681">🔒 Cifrado de ponta a ponta com as chaves do pareamento (criadas aqui, nunca saem do celular).
        O servidor de retransmissão só vê dados cifrados. O PC precisa estar com “Disponível para meus aparelhos” ligado.</p></div>`;
  const cmsg = (t, erro) => { const e = telaCel.querySelector("#rc-msg"); e.textContent = t || ""; e.style.color = erro ? "#ff8b8b" : "#c9d1d9"; };
  const q = (s) => telaCel.querySelector(s);
  function mostrarCel(paraParear) {
    tela.remove(); if (!telaCel.isConnected) document.body.appendChild(telaCel);
    const d = lerPar(), par = !!paraParear || !d || d.revogado;
    q("#rc-par").hidden = !par;
    q("#rc-conectar").hidden = par;
    q("#rc-esquecer").hidden = !d;
    if (d && !par) q("#rc-conectar").textContent = "📱 Conectar a " + d.pc.nome;
    if (par && !q("#rc-nome").value) q("#rc-nome").value = /iPhone/.test(UA) ? "iPhone" : /iPad/.test(UA) ? "iPad" : /Android/.test(UA) ? "Android" : "Celular";
  }
  q("#rc-conectar").onclick = () => conectarCel();
  q("#rc-parear").onclick = () => parearCel(q("#rc-codigo").value);
  q("#rc-codigo").onkeydown = (e) => { if (e.key === "Enter") q("#rc-parear").click(); };
  q("#rc-conector").onclick = (e) => { e.preventDefault(); gravarRem(false); telaCel.remove(); mostrar(); if (cred) conectar(); else acionar(true); };
  q("#rc-esquecer").onclick = (e) => {
    e.preventDefault();
    if (!confirm("Esquecer este computador? Para voltar a usar, será preciso parear de novo (e revogar o antigo no PC).")) return;
    try { localStorage.removeItem("dassh-cel-v1"); } catch (_) {}
    gravarRem(false); mostrarCel(true); cmsg("");
  };

  async function parearCel(codigo) {
    const cod = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cod.length !== 12) return cmsg("O código tem 12 caracteres (ex.: ABCD-EFGH-JKLM).", true);
    q("#rc-parear").disabled = true; cmsg("Pareando com segurança…");
    try {
      const R = await carregarCanal();
      const d = await R.parear(cod, (q("#rc-nome").value || "").trim().slice(0, 40) || "Celular");
      q("#rc-sas-n").textContent = d.sas; q("#rc-sas").hidden = false;
      q("#rc-par").hidden = true; q("#rc-conectar").hidden = false; q("#rc-conectar").textContent = "📱 Conectar a " + d.pc.nome;
      q("#rc-esquecer").hidden = false;
      await conectarCel(true);
    } catch (e) { cmsg(e.message || String(e), true); }
    q("#rc-parear").disabled = false;
  }

  async function conectarCel(insistir) {
    const d = lerPar();
    if (!d || d.revogado) { mostrarCel(true); return cmsg(d && d.revogado ? "Este celular foi revogado no PC. Pareie de novo." : ""); }
    if (rem.conectando) return;
    rem.conectando = true; q("#rc-conectar").disabled = true;
    const ate = Date.now() + (insistir ? 180000 : 0);
    try {
      const R = await carregarCanal();
      for (;;) {
        cmsg("Conectando a " + d.pc.nome + "…");
        try { await R.conectar(); break; }
        catch (e) {
          if (Date.now() > ate) throw e;
          cmsg("Aguardando o PC… No computador, ligue 📱 Celular → “Disponível para meus aparelhos”.");
          await dormir(4000);
        }
      }
      if (!rem.info) throw new Error("O PC não abriu a interface (atualize o DASSH Console no PC).");
      gravarRem(true); entrarRemoto();
    } catch (e) { cmsg(e.message || String(e), true); }
    rem.conectando = false; q("#rc-conectar").disabled = false;
  }

  // ---- a ponte: mesma API que a interface usa com o Conector, executada no Api do PC ----
  const apiRemota = new Proxy({}, { get: (_, nome) => (typeof nome === "string" && nome !== "then") ? (...a) => chamarRemoto(nome, a) : undefined });
  function chamarRemoto(nome, a) {
    if (EXTRAS[nome]) return EXTRAS[nome](...a);
    const sid = typeof a[0] === "string" ? a[0] : "";
    if ((nome === "desconectar" || nome === "aba_fechar") && sid.startsWith("pc_")) {   // fechar no celular uma aba DO PC: só solta (ela continua no PC)
      rem.anexadas.delete(sid); rem.soltas.add(sid); return Promise.resolve(true);
    }
    if (nome === "conectar" && sid) rem.minhas.add(sid);
    // sem canal (caiu/revogado): a tela de reconexão está à frente; a chamada fica parada em vez de virar erro solto na interface
    if (!rem.R.cel.sess) { rem.semCanal = (rem.semCanal || 0) + 1; return new Promise(() => {}); }
    return rem.R.rpc(nome, a);
  }
  function aoMsgRemota(m) {
    if (m.t === "ev" && Array.isArray(m.l)) {
      for (const it of m.l) {
        const fn = Array.isArray(it) ? it[0] : "", args = Array.isArray(it) && Array.isArray(it[1]) ? it[1] : [];
        if (/^[A-Za-z_$][\w$]*$/.test(fn || "") && typeof window[fn] === "function") { try { window[fn](...args); } catch (e) { console.error("evento", fn, e); } }
      }
    } else if (m.t === "abas" && Array.isArray(m.lista)) anexarAbasDoPc(m.lista);
    else if (m.t === "tela" && typeof m.sid === "string") {   // tela atual de uma aba do PC: a aba aparece aqui já com o conteúdo
      const id = idCel(m.sid);
      if (!id || rem.anexadas.has(id) || rem.soltas.has(id) || typeof window.onCelAba !== "function") return;
      const a = rem.pend && rem.pend.get(m.sid); if (!a) return;
      rem.pend.delete(m.sid); rem.anexadas.add(id);
      const nome = "🖥 " + (a.nome || "Aba do PC"), tipo = a.tipo || "powershell";
      if (typeof window.novaAba === "function" && typeof window.setConectado === "function") {   // como o onCelAba, sem o aviso "aberta pelo celular"
        const ab = window.novaAba(tipo, id);
        if (ab) { ab.tipo = tipo; ab.alvo = a.alvo || ""; ab.term.write("\x1bc"); window.setConectado(ab, true, nome); }
      } else window.onCelAba(id, nome, tipo, a.alvo || "", false);
      if (m.d && typeof window.termWrite === "function") window.termWrite(id, m.d);
    } else if (m.t === "aviso" && m.msg) cmsg(String(m.msg).slice(0, 200), true);
  }
  function idCel(sidPc) {   // id da aba do PC visto do celular (as abertas por ESTE celular voltam ao id original)
    const p = rem.info && rem.info.prefixo;
    if (p && sidPc.startsWith(p)) { const meu = sidPc.slice(p.length); return rem.minhas.has(meu) ? null : "pc_" + sidPc; }
    return "pc_" + sidPc;
  }
  function anexarAbasDoPc(lista) {   // abas já abertas no PC aparecem no celular (marcadas "pc_"): operar o PC é ver as abas dele
    if (!rem.prontoUI) return;
    rem.pend = rem.pend || new Map();
    for (const a of lista.slice(0, 8)) {
      if (!a || typeof a.sid !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(a.sid)) continue;
      const id = idCel(a.sid);
      if (!id || rem.anexadas.has(id) || rem.soltas.has(id) || rem.pend.has(a.sid)) continue;
      rem.pend.set(a.sid, { nome: String(a.nome || "").slice(0, 60), tipo: String(a.tipo || "").slice(0, 20), alvo: String(a.alvo || "").slice(0, 80) });
      rem.R.pedir({ t: "assistir", sid: a.sid }).then((r) => { if (!r.ok) rem.pend.delete(a.sid); });
    }
  }

  const barra = document.createElement("div");
  barra.id = "barra-remoto";
  barra.setAttribute("role", "status");
  barra.style.cssText = "flex:none;display:flex;align-items:center;gap:8px;padding:calc(4px + env(safe-area-inset-top)) 12px 4px;background:#0f2a20;color:#00dc78;border-bottom:1px solid #1d5f45;font:600 13px/1.3 -apple-system,'Segoe UI',Roboto,sans-serif;z-index:40";
  function desenharBarra(on, texto) {
    if (!barra.isConnected) document.body.insertBefore(barra, document.body.firstChild);
    barra.style.background = on ? "#0f2a20" : "#2a240f"; barra.style.color = on ? "#00dc78" : "#f0c674";
    barra.innerHTML = `<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="barra-remoto-txt">${escH(texto)}</span>
      <button id="barra-remoto-sair" style="background:transparent;color:inherit;border:1px solid currentColor;border-radius:8px;padding:3px 9px;font:inherit;cursor:pointer">Desconectar</button>`;
    barra.querySelector("#barra-remoto-sair").onclick = () => {
      if (!confirm("Desconectar do computador? As abas continuam abertas no PC.")) return;
      gravarRem(false); try { rem.R.desconectar(); } catch (_) {} location.reload();
    };
  }

  function entrarRemoto() {
    const R = rem.R, nomePc = (rem.info && rem.info.pc) || (lerPar() || { pc: {} }).pc.nome || "PC";
    telaCel.remove(); tela.remove();
    desenharBarra(true, "📱 Conectado a " + nomePc + " · usando o shell desse computador");
    if (!rem.ativo) {
      rem.ativo = true;
      const est = document.createElement("style");   // no celular, quem gerencia aparelhos é o PC
      est.textContent = "body.remoto-cel #btn-celular{display:none!important}";
      document.head.appendChild(est); document.body.classList.add("remoto-cel");
      window.pywebview = { api: apiRemota };
      const avisar = () => {
        window.dispatchEvent(new Event("pywebviewready"));
        setTimeout(() => { rem.prontoUI = true; R.enviar({ t: "listar" }); }, 1500);   // depois que a interface montou: traz as abas do PC
      };
      if (document.readyState === "complete") setTimeout(avisar, 0); else window.addEventListener("load", avisar, { once: true });
    }
  }
  function prepararCanal(R) {
    R.cel.aoMsg = aoMsgRemota;
    R.cel.aoConectado = async () => {   // a cada (re)conexão: abre a interface completa no PC
      const r = await R.pedir({ t: "ui" });
      if (r && r.ok) { rem.info = r; if (rem.ativo) { desenharBarra(true, "📱 Conectado a " + (r.pc || "PC") + " · usando o shell desse computador"); R.enviar({ t: "listar" }); } }
    };
    R.cel.aviso = (t, erro) => { if (rem.ativo) desenharBarra(false, t); else cmsg(t, erro); };
    R.cel.aoFim = (motivo, revogado) => {
      if (!rem.ativo) return cmsg(motivo, true);
      desenharBarra(false, revogado ? "Revogado no PC" : "Desconectado do PC");
      mostrarCel(revogado);
      if (revogado) { gravarRem(false); cmsg("Este celular foi revogado no PC — perdeu o acesso. Para voltar, pareie de novo.", true); }
      else cmsg((motivo || "Conexão perdida") + " — toque para reconectar.", true);
    };
  }
  addEventListener("visibilitychange", () => {   // celular volta do bloqueio: se o canal ficou mudo, reconecta sozinho
    if (document.visibilityState !== "visible" || !rem.ativo || !rem.R) return;
    if (!rem.R.cel.sess || Date.now() - rem.R.cel.ultimoRx > 15000) rem.R.conectar().catch(() => {});
  });

  // começa depois que a página carregou por inteiro (o protocolo externo aberto antes disso pode segurar o carregamento)
  const iniciar = () => {
    if (MODO_CEL) {   // celular: nada de procurar Conector local; 1 toque para operar o PC pareado
      mostrarCel(!!codPar);
      if (codPar) { q("#rc-codigo").value = codPar; return cmsg("Toque em “Parear e conectar” para ligar este celular ao computador."); }
      if ((pedeCel || lerRem()) && lerPar()) return conectarCel(pedeCel);
      return;
    }
    if (SAFARI && !LOCAL) mostrarLocal();   // Safari: a janela local é o caminho garantido (o automático é tentado mesmo assim)
    if (!LOCAL && lerPar()) {   // computador com um PC pareado (raro): oferece também operar o outro computador
      const b = document.createElement("button"); b.textContent = "📱 Conectar ao computador pareado";
      b.style.cssText = "background:#21262d;color:#e6edf3;border:1px solid #3fb9a0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;margin-top:10px";
      b.onclick = () => { ws_.manual = true; gravarRem(true); mostrarCel(false); conectarCel(); };
      tela.querySelector("#par-msg").after(b);
    }
    if (cred) conectar(); else acionar(false);
  };
  if (document.readyState === "complete") setTimeout(iniciar, 0); else window.addEventListener("load", () => setTimeout(iniciar, 0), { once: true });
})();
