// Ponte do AGENTE LOCAL: roda a interface REAL do DASSH Console (a mesma `ui/` do app) no navegador.
// No app local (pywebview) este arquivo não é carregado/não faz nada. Na web, substitui `window.pywebview.api` por chamadas ao agente
// local (127.0.0.1, WebSocket pareado por código): o backend é o MESMO Python do app, então as ~85 funções são as mesmas.
(function () {
  if (window.pywebview) return;   // app local: nada a fazer
  const ws_ = { sock: null, id: 0, pend: new Map(), api: null, pronto: false, tentativas: 0 };
  const lerSessao = () => { try { return sessionStorage.getItem("dassh.agente") || ""; } catch (_) { return ""; } };
  const gravarSessao = (v) => { try { sessionStorage.setItem("dassh.agente", v); } catch (_) {} };

  // ---- credenciais: #agente=PORTA.CODIGO (o fragmento nunca vai a servidor) ou a sessão do navegador ----
  let cred = "";
  const m = /(?:^|[#&])agente=(\d{2,5})\.([A-Za-z0-9_-]{16,})/.exec(location.hash);
  if (m) { cred = m[1] + "." + m[2]; gravarSessao(cred); history.replaceState(null, "", location.pathname + location.search); }
  else cred = lerSessao();

  // ---- tela de pareamento ----
  const tela = document.createElement("div");
  tela.id = "pareamento";
  tela.setAttribute("role", "dialog"); tela.setAttribute("aria-modal", "true"); tela.setAttribute("aria-labelledby", "par-tit");
  tela.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0d1117;color:#e6edf3;font:14px/1.45 'Segoe UI',system-ui,sans-serif;padding:16px";
  tela.innerHTML = `<div style="width:min(440px,100%);background:#161b22;border:1px solid #30363d;border-radius:14px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <h2 id="par-tit" style="margin:0 0 6px;font-size:18px">DASSH Console — conectar ao agente local</h2>
      <p id="par-txt" style="margin:0 0 14px;color:#8b949e">A interface web usa o <b>agente local</b>: o DASSH Console rodando em segundo plano neste computador.</p>
      <ol style="margin:0 0 14px;padding-left:20px;color:#c9d1d9">
        <li>Abra o <b>DASSH Console (agente)</b> pelo Menu Iniciar — ou rode <code>DASSH Console.exe --agente</code>.</li>
        <li>Ele abre esta página já pareada. Se preferir, digite abaixo a porta e o código que ele mostra.</li>
        <li>Se o navegador perguntar sobre <b>acesso à rede local</b>, clique em <b>Permitir</b> (é só a conexão com o agente neste computador).</li></ol>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="par-cred" placeholder="8977.código-do-agente" autocomplete="off" spellcheck="false" aria-label="Porta e código do agente"
          style="flex:1;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:9px 11px;font:13px Consolas,monospace">
        <button id="par-ir" style="background:#00a884;color:#04201a;border:0;border-radius:8px;padding:0 16px;font-weight:600;cursor:pointer">Conectar</button></div>
      <div id="par-msg" role="status" aria-live="polite" style="min-height:20px;color:#8b949e"></div>
      <p style="margin:12px 0 0;font-size:12px;color:#6e7681">Tudo fica no seu computador: o agente só escuta em 127.0.0.1 e aceita apenas este site com o código de pareamento. <a href="../agente/" style="color:#3fb9a0">Saiba mais</a></p></div>`;
  const msg = (t, erro) => { const e = tela.querySelector("#par-msg"); e.textContent = t; e.style.color = erro ? "#ff8b8b" : "#8b949e"; };
  const mostrar = () => { if (!tela.isConnected) document.body.appendChild(tela); };
  tela.querySelector("#par-ir").onclick = () => { const v = tela.querySelector("#par-cred").value.trim(); if (/^\d{2,5}\.[A-Za-z0-9_-]{16,}$/.test(v)) { cred = v; gravarSessao(v); conectar(); } else msg("Formato: PORTA.CÓDIGO (ex.: 8977.abc…)", true); };
  tela.querySelector("#par-cred").onkeydown = (e) => { if (e.key === "Enter") tela.querySelector("#par-ir").click(); };

  // ---- RPC ----
  function rpc(metodo, args) {
    return new Promise((ok, falha) => {
      if (!ws_.sock || ws_.sock.readyState !== 1) return falha(new Error("agente desconectado"));
      const id = ++ws_.id; ws_.pend.set(id, { ok, falha });
      ws_.sock.send(JSON.stringify({ t: "rpc", id, m: metodo, a: args }));
    });
  }
  const EXTRAS = {   // o que no navegador é feito pelo próprio navegador (o resto vai ao agente)
    tela_cheia: async (on) => { try { if (on) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); } catch (_) {} return true; },
    abrir_link: async (u) => { window.open(u, "_blank", "noopener"); return true; },
  };
  const api = new Proxy({}, { get: (_, nome) => (typeof nome === "string" && nome !== "then") ? (...a) => (EXTRAS[nome] ? EXTRAS[nome](...a) : rpc(nome, a)) : undefined });

  // ---- conexão ----
  function conectar() {
    const [porta, token] = cred.split(".");
    if (!porta || !token) { mostrar(); return; }
    mostrar(); msg("Conectando ao agente em 127.0.0.1:" + porta + "…");
    let sock; try { sock = new WebSocket("ws://127.0.0.1:" + porta + "/ws"); } catch (_) { msg("Navegador impediu a conexão local.", true); return; }
    ws_.sock = sock; let autenticado = false;
    sock.onopen = () => sock.send(JSON.stringify({ t: "auth", token }));
    sock.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
      if (d.t === "ok") {
        autenticado = true; ws_.tentativas = 0; tela.remove();
        if (!ws_.pronto) { ws_.pronto = true; window.pywebview = { api }; window.dispatchEvent(new Event("pywebviewready")); }
      } else if (d.t === "res") {
        const p = ws_.pend.get(d.id); if (!p) return; ws_.pend.delete(d.id);
        d.e ? p.falha(new Error(d.e)) : p.ok(d.r);
      } else if (d.t === "ev" && /^[A-Za-z_$][\w$]*$/.test(d.fn || "") && typeof window[d.fn] === "function") {
        try { window[d.fn](...(d.a || [])); } catch (e) { console.error("evento", d.fn, e); }
      } else if (d.t === "erro") { msg(d.e || "recusado", true); }
    };
    sock.onclose = (ev) => {
      ws_.pend.forEach((p) => p.falha(new Error("agente desconectado"))); ws_.pend.clear();
      if (ev.code === 4401) { cred = ""; gravarSessao(""); mostrar(); msg("Código de pareamento inválido ou expirado. Abra o agente de novo.", true); return; }
      if (ws_.pronto) { mostrar(); msg("Conexão com o agente perdida. Tentando reconectar… (a sessão dos terminais continua no agente)", true); }
      else { mostrar(); msg(autenticado ? "Desconectado." : "Não consegui falar com o agente. Ele está aberto (DASSH Console --agente)? Se o navegador perguntou sobre acesso à rede local, permita e tente de novo.", true); }
      if (cred && ws_.tentativas++ < 40) setTimeout(() => { if (ws_.pronto) location.reload(); else conectar(); }, Math.min(1000 * ws_.tentativas, 5000));
    };
  }
  const iniciar = () => { if (cred) conectar(); else mostrar(); };
  if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar);
})();
