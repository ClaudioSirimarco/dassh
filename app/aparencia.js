// Executado no head, depois das folhas de estilo e antes de o navegador construir a interface.
(() => {
  const chave = "dassh.aparencia";
  const sistema = matchMedia("(prefers-color-scheme: light)");
  const raiz = document.documentElement;
  const validar = valor => ["automatico", "claro", "escuro"].includes(valor) ? valor : "escuro";
  const nativa = /^#aparencia-nativa=(automatico|claro|escuro)$/.exec(location.hash);
  let modo = "escuro";
  try { modo = validar(localStorage.getItem(chave)); } catch {}
  if (nativa) {
    modo = nativa[1];
    try { localStorage.setItem(chave, modo); } catch {}
  }

  function aplicar() {
    const claro = modo === "claro" || (modo === "automatico" && sistema.matches);
    raiz.dataset.tema = claro ? "claro" : "escuro";
    const meta = (nome, valor) => document.querySelector('meta[name="' + nome + '"]')?.setAttribute("content", valor);
    meta("color-scheme", claro ? "light" : "dark");
    meta("theme-color", getComputedStyle(raiz).getPropertyValue("--cor-navegacao").trim());
    meta("apple-mobile-web-app-status-bar-style", claro ? "default" : "black-translucent");
    document.querySelectorAll("select[data-aparencia]").forEach(campo => { campo.value = modo; });
  }

  aplicar();
  document.addEventListener("DOMContentLoaded", aplicar, { once: true });
  sistema.addEventListener("change", () => { if (modo === "automatico") aplicar(); });
  addEventListener("storage", evento => {
    if (evento.key !== chave && evento.key !== null) return;
    modo = validar(evento.newValue);
    aplicar();
  });
  document.addEventListener("change", evento => {
    if (!evento.target.matches("select[data-aparencia]")) return;
    modo = validar(evento.target.value);
    aplicar();
    try { localStorage.setItem(chave, modo); } catch {}
    if (window.DASSH_CASCA) {
      window.dasshNativo?.aparencia?.(modo);
    } else if (nativa) {
      // O perfil privado do WebView2 ganha uma nova origem a cada abertura.
      history.replaceState(null, "", "#aparencia-nativa=" + modo);
      window.pywebview?.api?.salvar_pref("aparencia", modo);
    }
  });
})();
