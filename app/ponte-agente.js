// Ponte do DASSH CONECTOR: roda a interface REAL do DASSH Console (a mesma `ui/` do app) no navegador.
// No app local (pywebview) este arquivo não faz nada. Na web, substitui `window.pywebview.api` por chamadas ao Conector local
// (127.0.0.1, WebSocket com segredo): o backend é o MESMO Python do app, então as ~90 funções são as mesmas.
// ACIONAMENTO AUTOMÁTICO: a página gera um segredo, abre `dassh-conector://iniciar?s=<segredo>` (o Windows inicia o Conector ou
// entrega o segredo ao que já está rodando) e procura o Conector nas portas locais. Nada para digitar.
(function () {
  if (window.pywebview) return;   // app local: nada a fazer
  const ws_ = { sock: null, id: 0, pend: new Map(), pronto: false, tentativas: 0, acionando: false, acionou: false };
  const PORTAS = Array.from({ length: 20 }, (_, i) => 8977 + i);
  const lerSessao = () => { try { return sessionStorage.getItem("dassh.agente") || ""; } catch (_) { return ""; } };
  const gravarSessao = (v) => { try { sessionStorage.setItem("dassh.agente", v); } catch (_) {} };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
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
        <a href="../agente/" style="color:#3fb9a0;align-self:center">Ainda não tenho o Conector</a></div>
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
  tela.querySelector("#par-ir").onclick = () => { const v = tela.querySelector("#par-cred").value.trim(); if (/^\d{2,5}\.[A-Za-z0-9_-]{16,}$/.test(v)) { cred = v; gravarSessao(v); conectar(); } else msg("Formato: PORTA.CÓDIGO (ex.: 8977.abc…)", true); };
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
    try {   // abre o protocolo sem sair da página
      const a = document.createElement("a"); a.href = "dassh-conector://iniciar?s=" + S; a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (_) {}
    const ate = Date.now() + 30000;
    while (Date.now() < ate) {
      for (const p of PORTAS) {
        if (await testar(p, S, 600)) { cred = p + "." + S; gravarSessao(cred); ws_.acionando = false; msg("Conectado. Carregando…"); return conectar(); }
      }
      msg("Aguardando o DASSH Conector responder… (se o navegador perguntou, clique em Abrir)");
      await dormir(700);
    }
    ws_.acionando = false;
    msg(peloBotao ? "O Conector não respondeu. Ele está instalado? Veja \"Ainda não tenho o Conector\"." :
      "Não encontrei o DASSH Conector. Clique em \"Abrir o DASSH Conector\" ou instale-o pelo link ao lado.", true);
  }

  // ---- conexão principal ----
  function conectar() {
    const [porta, token] = cred.split(".");
    if (!porta || !token) return acionar(false);
    mostrar(); msg("Conectando ao DASSH Conector…");
    let sock; try { sock = new WebSocket("ws://127.0.0.1:" + porta + "/ws"); } catch (_) { msg("O navegador impediu a conexão local.", true); return; }
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
  // começa depois que a página carregou por inteiro (o protocolo externo aberto antes disso pode segurar o carregamento)
  const iniciar = () => { if (cred) conectar(); else acionar(false); };
  if (document.readyState === "complete") setTimeout(iniciar, 0); else window.addEventListener("load", () => setTimeout(iniciar, 0), { once: true });
})();
