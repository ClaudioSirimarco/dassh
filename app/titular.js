// Direitos do titular, backup e encerramento de conta (tarefa 21; docs/DIREITOS-DO-TITULAR.md).
//  - Conta: "Exportar meus dados", "Solicitar exclusão na nuvem" e "Encerrar conta e apagar dados locais" (senha de novo).
//  - Biblioteca > Importar e exportar: "Fazer backup dos meus dados" e "Restaurar backup" (prévia, confirmação, cópia de segurança).
// Nenhum segredo passa por aqui: a senha digitada vai direto na chamada e o campo é limpo. Só roda no aplicativo do PC
// (no portal web e no celular o painel fica oculto: apagar e restaurar são só da janela do computador).
(() => {
  const ap = () => (typeof contaApi === "function" ? contaApi() : {});
  const tem = (nome) => typeof ap()[nome] === "function";
  const tk = () => (typeof CONTA !== "undefined" && CONTA.token) || null;
  const chamar = async (nome, ...a) => {
    try { return await ap()[nome](tk(), ...a); } catch (e) { return { ok: false, erro: String((e && e.message) || e) }; }
  };
  const bytes = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const lista = (itens) => `<ul class="ti-lista">${itens.map((i) => `<li><b>${esc(i.item)}</b>${i.detalhe || i.motivo ? ` <span>${esc(i.detalhe || i.motivo)}</span>` : ""}</li>`).join("")}</ul>`;
  const msg = (el, texto, tipo) => { if (el) { el.textContent = texto || ""; el.className = "ajuda ti-msg" + (tipo ? " " + tipo : ""); } };
  const abrirPasta = (p) => { try { ap().abrir_pasta && ap().abrir_pasta(p); } catch (e) { /* pasta indisponível */ } };

  // ------------------------------------------------------------------ Conta: seus dados e direitos
  const SEC = `
    <h4 class="cel-tit" id="ti-tit">Seus dados e direitos</h4>
    <p class="ajuda">Você pode levar uma cópia dos seus dados, pedir a exclusão do que está na nuvem ou encerrar a conta e apagar tudo deste computador.
      Nenhum arquivo leva senhas, chaves ou tokens.</p>
    <div class="ti-acoes">
      <button type="button" class="btn" id="ti-exportar">Exportar meus dados</button>
      <button type="button" class="btn" id="ti-pedido">Solicitar exclusão na nuvem</button>
      <button type="button" class="btn perigo" id="ti-encerrar">Encerrar conta e apagar dados locais…</button></div>
    <div id="ti-msg" class="ajuda ti-msg" role="status" aria-live="polite"></div>
    <div id="ti-resultado" class="ti-resultado oculto"></div>
    <form id="ti-form" class="ti-form oculto" autocomplete="off" novalidate>
      <div id="ti-previa"></div>
      <label id="ti-l-senha">Digite a sua senha para confirmar <input id="ti-senha" type="password" autocomplete="current-password"></label>
      <label id="ti-l-frase" class="oculto">Digite ENCERRAR para confirmar <input id="ti-frase" type="text" autocomplete="off" spellcheck="false"></label>
      <label class="ti-check"><input type="checkbox" id="ti-ciente"> Entendo que isto não pode ser desfeito</label>
      <div class="ti-acoes"><button type="submit" class="btn primario perigo" id="ti-confirmar" disabled>Apagar tudo e encerrar a conta</button>
        <button type="button" class="btn" id="ti-cancelar">Cancelar</button></div>
    </form>`;

  function montarConta() {
    const alvo = document.getElementById("conta-titular");
    if (!alvo || alvo.dataset.pronto) return;
    alvo.dataset.pronto = "1";
    alvo.innerHTML = SEC;
    const m = document.getElementById("ti-msg"), res = document.getElementById("ti-resultado"), form = document.getElementById("ti-form");
    const ocupado = (b, sim) => { b.disabled = sim; b.setAttribute("aria-busy", sim ? "true" : "false"); };
    document.getElementById("ti-exportar").onclick = async (ev) => {
      const b = ev.currentTarget; ocupado(b, true); msg(m, "Gerando a cópia dos seus dados…");
      const r = await chamar("conta_exportar_dados"); ocupado(b, false);
      if (!r.ok) return msg(m, r.erro || "Não foi possível exportar.", "erro");
      msg(m, `Pronto: ${r.resumo.equipamentos} equipamento(s), ${r.resumo.sessoes} sessão(ões), ${r.resumo.aparelhos} aparelho(s) pareado(s).`, "ok");
      res.classList.remove("oculto");
      res.innerHTML = `<p><b>Arquivo gerado</b><br><code>${esc(r.caminho)}</code></p><p class="ajuda"><b>O que não entra, e por quê</b></p>${lista(r.nao_inclui)}
        <button type="button" class="btn" id="ti-abrir-pasta">Abrir a pasta</button>`;
      document.getElementById("ti-abrir-pasta").onclick = () => abrirPasta(r.pasta);
    };
    document.getElementById("ti-pedido").onclick = async (ev) => {
      const b = ev.currentTarget; ocupado(b, true);
      const r = await chamar("nuvem_pedido_exclusao"); ocupado(b, false);
      if (!r.ok) return msg(m, r.erro || "Não foi possível gerar o pedido.", "erro");
      msg(m, "Pedido gerado. Envie-o do e-mail da sua conta para o canal privado indicado nele.", "ok");
      res.classList.remove("oculto");
      res.innerHTML = `<p><b>Destinatário</b>: ${esc(r.destinatario)}</p><pre class="ti-pedido">${esc(r.texto)}</pre>
        <button type="button" class="btn" id="ti-copiar">Copiar o texto</button> <button type="button" class="btn" id="ti-abrir-pasta">Abrir a pasta</button>`;
      document.getElementById("ti-copiar").onclick = () => navigator.clipboard && navigator.clipboard.writeText(r.texto).then(() => msg(m, "Texto copiado.", "ok"), () => msg(m, "Não foi possível copiar; abra o arquivo na pasta.", "erro"));
      document.getElementById("ti-abrir-pasta").onclick = () => abrirPasta(r.pasta);
    };
    const fechar = () => { form.classList.add("oculto"); document.getElementById("ti-senha").value = ""; document.getElementById("ti-frase").value = ""; document.getElementById("ti-ciente").checked = false; };
    const validar = () => {
      const frase = !document.getElementById("ti-l-frase").classList.contains("oculto");
      const ok = document.getElementById("ti-ciente").checked && (frase ? document.getElementById("ti-frase").value.trim().length > 0 : document.getElementById("ti-senha").value.length > 0);
      document.getElementById("ti-confirmar").disabled = !ok;
    };
    ["ti-senha", "ti-frase"].forEach((i) => (document.getElementById(i).oninput = validar));
    document.getElementById("ti-ciente").onchange = validar;
    document.getElementById("ti-cancelar").onclick = () => { fechar(); msg(m, ""); };
    document.getElementById("ti-encerrar").onclick = async () => {
      msg(m, "Conferindo o que será apagado…"); res.classList.add("oculto");
      const r = await chamar("conta_encerrar_previa");
      if (!r.ok) return msg(m, r.erro || "Não foi possível preparar o encerramento.", "erro");
      msg(m, "");
      document.getElementById("ti-previa").innerHTML = `<p class="ti-aviso"><b>Será apagado, sem volta</b></p>${lista(r.apaga)}<p class="ti-aviso"><b>NÃO será apagado</b></p>${lista(r.nao_apaga)}`;
      const frase = r.confirmacao === "frase";
      document.getElementById("ti-l-senha").classList.toggle("oculto", frase);
      document.getElementById("ti-l-frase").classList.toggle("oculto", !frase);
      form.classList.remove("oculto"); validar();
      (frase ? document.getElementById("ti-frase") : document.getElementById("ti-senha")).focus();
    };
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const b = document.getElementById("ti-confirmar"); ocupado(b, true); msg(m, "Encerrando a conta e apagando os dados…");
      const senha = document.getElementById("ti-senha").value, frase = document.getElementById("ti-frase").value;
      document.getElementById("ti-senha").value = "";
      const r = await chamar("conta_encerrar", senha, frase, true); ocupado(b, false); validar();
      if (!r.ok) return msg(m, r.erro || "Não foi possível encerrar.", "erro");
      fechar(); msg(m, "Conta encerrada.", "ok");
      res.classList.remove("oculto");
      res.innerHTML = `<p><b>O que foi feito</b></p><ul class="ti-lista">${r.relatorio.map((x) => `<li><b>${esc(x.etapa)}</b> <span>${esc(x.resultado)}</span></li>`).join("")}</ul>
        ${r.pedido_nuvem ? `<p class="ajuda">O servidor ainda não apaga a conta sozinho. O pedido para o canal privado está em <code>${esc(r.pedido_nuvem.caminho)}</code> (destinatário: ${esc(r.pedido_nuvem.destinatario)}).</p>` : ""}
        <button type="button" class="btn primario" id="ti-recomecar">Recomeçar</button>`;
      document.getElementById("ti-recomecar").onclick = () => location.reload();
    };
  }

  // ------------------------------------------------------------------ Biblioteca: backup e restauração
  const BK = { id: null };
  function montarBackup() {
    const fazer = document.getElementById("bk-fazer"), rest = document.getElementById("bk-restaurar"), area = document.getElementById("bk-area");
    if (!fazer || fazer.dataset.pronto) return;
    fazer.dataset.pronto = "1";
    const m = document.getElementById("bk-msg");
    fazer.onclick = async () => {
      fazer.disabled = true; msg(m, "Gerando o backup…");
      const r = await chamar("backup_criar", document.getElementById("bk-atend").checked);
      fazer.disabled = false;
      if (!r.ok) return msg(m, r.erro || "Não foi possível fazer o backup.", "erro");
      msg(m, `Backup pronto (${r.arquivos} arquivo(s), ${bytes(r.bytes)}).`, "ok");
      area.innerHTML = `<p class="ti-aviso"><b>Atenção:</b> ${esc(r.aviso)}</p><p><code>${esc(r.caminho)}</code></p>${lista(r.nao_inclui)}
        <button type="button" class="btn" id="bk-abrir">Abrir a pasta</button>${r.atendimentos_truncado ? '<p class="ajuda">Havia mais evidências do que o limite do backup: as mais antigas ficaram de fora. Copie a pasta de atendimentos para guardá-las.</p>' : ""}`;
      document.getElementById("bk-abrir").onclick = () => abrirPasta(r.pasta);
    };
    const mostrarPrevia = (p) => {
      if (!p.ok) { BK.id = null; return msg(m, p.erro || "Backup inválido.", "erro"); }
      BK.id = p.id; msg(m, "");
      const rot = { novo: "novo", diferente: "substitui (com cópia de segurança)", igual: "já é igual", ignorado: "ignorado" };
      area.innerHTML = `<p><b>${esc(p.nome)}</b> · feito em ${esc((p.criado || "").replace("T", " "))} · versão ${esc(p.aplicativo || "?")}</p>
        <table class="ti-tab"><thead><tr><th>Arquivo</th><th>Situação</th><th>Tamanho</th></tr></thead><tbody>${p.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td>${esc(rot[i.situacao] || i.situacao)}</td><td>${bytes(i.tamanho)}</td></tr>`).join("")}</tbody></table>
        <p class="ajuda">${p.substituira} arquivo(s) serão substituídos (a versão atual é copiada antes para a pasta <code>seguranca</code>), ${p.novos} novo(s), ${p.iguais} já igual(is).
          O backup <b>não traz</b> as senhas do cofre, os tokens das nuvens nem as chaves da conta e do celular, porque dependem do Windows deste computador.</p>
        <label class="ti-check"><input type="checkbox" id="bk-ciente"> Confirmo a restauração</label>
        <div class="ti-acoes"><button type="button" class="btn primario" id="bk-confirmar" disabled>Restaurar agora</button><button type="button" class="btn" id="bk-cancelar">Cancelar</button></div>`;
      const ck = document.getElementById("bk-ciente"), ok = document.getElementById("bk-confirmar");
      ck.onchange = () => { ok.disabled = !ck.checked || (p.substituira + p.novos) === 0; };
      document.getElementById("bk-cancelar").onclick = () => { area.innerHTML = ""; BK.id = null; };
      ok.onclick = async () => {
        ok.disabled = true; msg(m, "Restaurando…");
        const r = await chamar("backup_restaurar", BK.id, true);
        if (!r.ok) { ok.disabled = false; return msg(m, r.erro || "Não foi possível restaurar.", "erro"); }
        msg(m, `Restaurado: ${r.restaurados.length} arquivo(s).`, "ok");
        area.innerHTML = `<p>${r.copia_de_seguranca ? `A versão anterior foi guardada em <code>${esc(r.copia_de_seguranca)}</code>.` : "Nada precisou ser substituído."}</p>
          <button type="button" class="btn primario" id="bk-recarregar">Recarregar o aplicativo</button>`;
        document.getElementById("bk-recarregar").onclick = () => location.reload();
      };
    };
    rest.onclick = async () => {
      msg(m, "Procurando backups…");
      const l = await chamar("backup_listar");
      if (!l.ok) return msg(m, l.erro || "Não foi possível listar.", "erro");
      msg(m, "");
      area.innerHTML = `<p><b>Escolha o backup</b></p><div class="ti-acoes" id="bk-lista">${l.backups.map((b) => `<button type="button" class="btn" data-bk="${esc(b.nome)}">${esc(b.nome.replace("dassh-backup-", "").replace(".zip", ""))} · ${bytes(b.tamanho)}</button>`).join("")}
        <button type="button" class="btn" id="bk-outro">Escolher outro arquivo…</button></div>${l.backups.length ? "" : '<p class="ajuda">Nenhum backup nesta pasta ainda. Use “Escolher outro arquivo” para um backup de outro lugar.</p>'}`;
      area.querySelectorAll("[data-bk]").forEach((b) => (b.onclick = async () => mostrarPrevia(await chamar("backup_previa", b.dataset.bk))));
      document.getElementById("bk-outro").onclick = async () => { const p = await chamar("backup_escolher"); if (!p.cancelado) mostrarPrevia(p); };
    };
  }

  function iniciar() {
    const local = tem("conta_exportar_dados");   // portal web / celular: o painel não aparece (apagar e restaurar são só do PC)
    const s = document.getElementById("conta-titular"); if (s) s.classList.toggle("oculto", !local);
    document.querySelectorAll(".bk-card, #bk-area, #bk-msg").forEach((c) => c.classList.toggle("oculto", !local));
    if (!local) return;
    montarBackup();
    const modal = document.getElementById("modal-conta");
    if (modal) {
      const ver = () => { if (!modal.classList.contains("oculto")) montarConta(); };
      new MutationObserver(ver).observe(modal, { attributes: true, attributeFilter: ["class"] });
      ver();
    }
  }
  window.addEventListener("pywebviewready", iniciar);
  if (document.readyState !== "loading") setTimeout(iniciar, 0); else document.addEventListener("DOMContentLoaded", () => setTimeout(iniciar, 0));
})();
