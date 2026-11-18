// Acessibilidade da página ao vivo: enquanto o cartão de entrada está à frente, o resto da página (terminal, barras) fica "inerte" —
// o teclado (Tab) e leitores de tela só enxergam o cartão. Ao entrar na sessão (#vidro.aberto), tudo volta ao normal.
(function () {
  const vidro = document.getElementById("vidro");
  if (!vidro) return;
  const fundo = () => [...document.body.children].filter((e) => e !== vidro && !["SCRIPT", "STYLE", "LINK"].includes(e.tagName) && e.id !== "fim-sessao");
  function ajustar() {
    const entrada = !vidro.classList.contains("aberto");
    fundo().forEach((e) => { if (entrada) e.setAttribute("inert", ""); else e.removeAttribute("inert"); });
  }
  new MutationObserver(ajustar).observe(vidro, { attributes: true, attributeFilter: ["class"] });
  ajustar();
})();
