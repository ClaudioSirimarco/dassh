// DASSH Code — PWA do celular: registra o service worker (só na página do celular, em contexto seguro) e mostra a dica
// "Adicionar à Tela de Início" no Safari do iPhone (escondida no app instalado e depois de dispensada).
// Não faz rede, não guarda dados de sessão e não mexe na reconexão (isso é da ponte-remota.js: visibilitychange/pageshow).
(function () {
  "use strict";
  const CHAVE = "dassh.dica-instalar.dispensada";
  // "instalado": app da tela de início (standalone) ou a casca nativa do iPhone (window.DASSH_CASCA, injetado pelo app-iphone/)
  const standalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true || window.DASSH_CASCA === true;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const paginaCelular = !!document.getElementById("tela-parear");                       // conectar.html
  const entradaCelular = /(^|[#&])(par=|celular)/.test(location.hash) && ios;             // plataforma aberta pelo QR (iPhone)
  const base = (document.currentScript && document.currentScript.src) || location.href;

  function lerFlag() { try { return localStorage.getItem(CHAVE) === "1"; } catch (e) { return false; } }
  function gravarFlag() { try { localStorage.setItem(CHAVE, "1"); } catch (e) { /* sem armazenamento: só some nesta visita */ } }

  function dica() {
    if (!ios || standalone() || lerFlag() || document.getElementById("dica-instalar")) return;
    const d = document.createElement("div");
    d.id = "dica-instalar"; d.setAttribute("role", "note");
    const main = document.querySelector("main");   // na página do celular a dica entra no fluxo (não cobre botões); sem <main>, flutua embaixo
    const flutua = !main;
    if (flutua) Object.assign(d.style, { position: "fixed", left: "12px", right: "12px", bottom: "calc(12px + env(safe-area-inset-bottom))", zIndex: "50" });
    Object.assign(d.style, {
      display: "flex", gap: "10px", alignItems: "center", padding: "12px 14px", borderRadius: "14px", background: "var(--cel-painel)",
      border: "1px solid var(--cel-borda)", color: "var(--texto)", font: "14px/1.35 -apple-system, sans-serif", boxShadow: "0 6px 24px var(--sombreado-45)" });
    const t = document.createElement("span");
    t.style.flex = "1";
    t.textContent = "Para abrir como app: toque em Compartilhar e depois em “Adicionar à Tela de Início”.";
    const b = document.createElement("button");
    b.type = "button"; b.id = "dica-instalar-fechar"; b.textContent = "Entendi"; b.setAttribute("aria-label", "Dispensar a dica de instalação");
    Object.assign(b.style, { minWidth: "44px", minHeight: "44px", padding: "0 14px", border: "0", borderRadius: "12px", background: "var(--cel-botao)", color: "var(--texto)", font: "inherit" });
    b.onclick = () => { gravarFlag(); d.remove(); };
    d.append(t, b);
    if (flutua) document.body.appendChild(d); else main.insertBefore(d, main.firstChild);
  }

  function registrarSW() {
    if (!paginaCelular || !("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register(new URL("sw.js", base).href).then((reg) => {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
    }).catch(() => { /* sem service worker o app funciona igual, só sem o casco offline */ });
  }

  // o service worker só entra depois que a página abriu e o canal teve tempo de conectar: não disputa rede nem CPU com o pareamento
  function agendarSW() { const ir = () => setTimeout(registrarSW, 6000); if (document.readyState === "complete") ir(); else addEventListener("load", ir, { once: true }); }
  function iniciar() { if (paginaCelular || entradaCelular) { dica(); agendarSW(); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  addEventListener("appinstalled", () => { const d = document.getElementById("dica-instalar"); if (d) d.remove(); });
})();
