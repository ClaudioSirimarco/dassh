// Ponte do DASSH CONECTOR: roda a interface REAL do DASSH Code (a mesma `ui/` do app) no navegador.
// No app local (pywebview) este arquivo não faz nada. Na web, substitui `window.pywebview.api` por chamadas ao Conector local
// (127.0.0.1, WebSocket com segredo): o backend é o MESMO Python do app, então as ~90 funções são as mesmas.
// ACIONAMENTO AUTOMÁTICO: procura o Conector nas portas locais com a autorização deste navegador.
// Se precisar parear ou iniciar o Conector, chama o protocolo uma vez e procura novamente enquanto ele sobe.
// NO CELULAR (ou com #par= / #celular no link): "📱 Conectar ao meu computador" — a mesma `api` vai pelo canal cifrado do
// pareamento até o PC (ponte-remota.js + conectado.py), e a interface inteira passa a operar o PC pareado.
(function () {
  if (window.pywebview) return;   // app local: nada a fazer
  const ws_ = { sock: null, id: 0, pend: new Map(), pronto: false, tentativas: 0, busca: null, protocolo: "" };
  const CHAVE_NAVEGADOR = "dassh.agente.navegador";
  const RE_SEGREDO = /^[A-Za-z0-9_-]{16,128}$/;
  const lerPersistente = () => { try { return localStorage.getItem(CHAVE_NAVEGADOR) || ""; } catch (_) { return ""; } };
  const gravarPersistente = (v) => { try { localStorage.setItem(CHAVE_NAVEGADOR, v); } catch (_) {} };
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
  function abrirProtocolo(token, local = false) {
    if (ws_.protocolo) return;
    ws_.protocolo = token;
    const a = document.createElement("a");
    a.href = "dassh-conector://iniciar?s=" + encodeURIComponent(token) + (local ? "&local=1" : "");
    a.style.display = "none";
    document.body.appendChild(a);
    try { a.click(); } catch (_) {} finally { a.remove(); }
  }
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
  tela.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--fundo);color:var(--texto);font:14px/1.45 'Segoe UI',system-ui,sans-serif;padding:16px";
  tela.innerHTML = `<div style="width:min(460px,100%);background:var(--conector-painel);border:1px solid var(--borda-neutra);border-radius:14px;padding:22px;box-shadow:0 20px 60px var(--sombreado-50)">
      <h2 id="par-tit" style="margin:0 0 6px;font-size:18px">DASSH Code na web</h2>
      <p style="margin:0 0 12px;color:var(--conector-suave)">Para usar serial, SSH, PowerShell e o resto direto do navegador, a página usa o <b>DASSH Conector</b>:
        um programa leve que roda só neste computador. Ele é chamado sozinho.</p>
      <div id="par-msg" role="status" aria-live="polite" style="min-height:22px;margin-bottom:12px;color:var(--conector-texto)"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button id="par-abrir" style="background:var(--verde);color:var(--sobre-acento-conta);border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer">Abrir o DASSH Conector</button>
        <button id="par-local" hidden style="background:var(--conector-botao);color:var(--texto);border:1px solid var(--link);border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer"
          title="O Conector abre esta mesma plataforma em http://127.0.0.1 (necessário no Safari)">Abrir pela janela local</button>
        <a href="${URL_CONECTOR}" style="color:var(--link);align-self:center">Ainda não tenho o Conector</a></div>
      <div id="par-local-dica" hidden style="margin:-4px 0 12px;font-size:12.5px;color:var(--conector-suave)"></div>
      <details style="color:var(--conector-suave)"><summary style="cursor:pointer">Conectar com código (avançado)</summary>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="par-cred" placeholder="8977.código" autocomplete="off" spellcheck="false" aria-label="Porta e código do Conector"
            style="flex:1;background:var(--fundo);color:var(--texto);border:1px solid var(--borda-neutra);border-radius:8px;padding:9px 11px;font:13px Consolas,monospace">
          <button id="par-ir" style="background:var(--conector-botao);color:var(--texto);border:1px solid var(--borda-neutra);border-radius:8px;padding:0 14px;cursor:pointer">Conectar</button></div></details>
      <p style="margin:12px 0 0;font-size:12px;color:var(--conector-ajuda)">Se o navegador perguntar "Abrir DASSH Conector?", clique em <b>Abrir</b> (marque "sempre permitir" para não perguntar de novo).
        Se perguntar sobre <b>acesso à rede local</b>, clique em <b>Permitir</b>. O Conector só escuta em 127.0.0.1 e só aceita este site.</p></div>`;
  const msg = (t, erro) => { const e = tela.querySelector("#par-msg"); e.textContent = t; e.style.color = erro ? "var(--erro-detalhe)" : "var(--conector-texto)"; };
  const mostrar = () => { if (!tela.isConnected) document.body.appendChild(tela); };
  tela.querySelector("#par-abrir").onclick = () => acionar(true);
  tela.querySelector("#par-local").onclick = () => abrirLocal();
  const mostrarLocal = () => { if (!LOCAL) { mostrar(); tela.querySelector("#par-local").hidden = false; } };
  function abrirLocal() {   // plano B: a mesma interface, servida pelo Conector em http://127.0.0.1 (segredo no #fragmento)
    const alvo = lerCredencial(cred);
    if (alvo) { location.href = "http://127.0.0.1:" + alvo.porta + "/app/#agente=" + cred; return; }
    if (ws_.protocolo) return msg("Abra o DASSH Conector para usar a janela local.", true);
    const S = segredoNovo();
    abrirProtocolo(S, true);
    msg("O DASSH Conector vai abrir a plataforma numa janela local (http://127.0.0.1)…");
    const d = tela.querySelector("#par-local-dica");
    setTimeout(() => {
      d.hidden = false;
      d.innerHTML = 'Não abriu? <a style="color:var(--link)" href="http://127.0.0.1:8977/app/#agente=8977.' + S + '">Abrir a janela local manualmente</a> (o Conector precisa estar aberto).';
    }, 4000);
  }
  tela.querySelector("#par-ir").onclick = async () => {
    const v = tela.querySelector("#par-cred").value.trim();
    const alvo = lerCredencial(v);
    if (!alvo) return msg("Confira o código do Conector.", true);
    ws_.manual = true;
    const achou = await sondar(alvo.token, false, [alvo.porta]);
    if (achou) aceitarConector(achou);
    else msg("O Conector não aceitou o código.", true);
  };
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
  const nunca = () => new Promise(() => {});

  // =================================================================================================================
  // ☁ CONTA DASSH NO NAVEGADOR (portal): o login acontece aqui, direto no servidor de contas (Supabase Auth, chave PUBLICÁVEL),
  // sem precisar do Conector. É a MESMA conta do app e do Conector (nuvem.py). Quando o computador conecta (Conector ou celular
  // pareado), a página entrega o access token e o computador o confere no servidor e abre a mesma conta: um login só.
  // "Lembrar de mim" = localStorage; sem lembrar = só esta aba (sessionStorage).
  // =================================================================================================================
  const NUVEM_URL = "https://hxrdhetvrejiyrfdcfjo.supabase.co", NUVEM_CHAVE = "sb_publishable_v8iFSJ-BblooLQidj2XXyw_iQ63m5GR";
  const K_NV = "dassh.nuvem.web", K_PKCE = "dassh.pkce";
  const VOLTA = location.origin + location.pathname;
  const PROVS = [["google", "Google"], ["azure", "Microsoft"], ["apple", "Apple"], ["github", "GitHub"]];
  const VINCULAVEIS = ["google", "github"], RECENTE_MS = 10 * 60 * 1000;   // = nuvem.py (VINCULAVEIS, SESSAO_RECENTE_MIN)
  const MSG_OUTRA_CONTA = "Este login já está vinculado a OUTRA conta DASSH. Nada foi mesclado. Para usá-lo aqui: entre na outra conta, desvincule esse login lá, volte a esta conta e vincule de novo.";
  const TRADUZ = [["invalid login credentials", "E-mail ou senha incorretos."],
    ["email not confirmed", "Confirme o seu e-mail (abra o link que enviamos) e entre de novo."],
    ["user already registered", "Já existe uma conta com este e-mail. Use \"Entrar\"."],
    ["password should be at least", "A senha precisa ter pelo menos 8 caracteres."],
    ["unable to validate email address", "E-mail inválido."],
    ["email rate limit exceeded", "Muitos e-mails enviados agora. Tente de novo em alguns minutos."],
    ["for security purposes", "Aguarde alguns segundos e tente de novo."],
    ["provider is not enabled", "Este tipo de login ainda não está ativado."],
    ["already linked to another user", MSG_OUTRA_CONTA], ["identity_already_exists", MSG_OUTRA_CONTA],
    ["manual linking is disabled", "O vínculo de logins ainda não está habilitado no servidor (o responsável precisa ligar \"Allow manual linking\" no Supabase)."],
    ["at least 1 identity", "Este é o seu último método de login: vincule outro antes de remover este."]];
  const nv = {
    ler() { for (const st of [sessionStorage, localStorage]) { try { const d = JSON.parse(st.getItem(K_NV) || "null"); if (d && d.access_token) return d; } catch (_) {} } return null; },
    gravar(d) {
      try { sessionStorage.removeItem(K_NV); localStorage.removeItem(K_NV); } catch (_) {}
      if (d) try { (d.lembrar ? localStorage : sessionStorage).setItem(K_NV, JSON.stringify(d)); } catch (_) {}
    },
    async req(metodo, caminho, corpo, token) {
      let r;
      try {
        r = await fetch(NUVEM_URL + caminho, { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo),
          headers: { apikey: NUVEM_CHAVE, "Content-Type": "application/json", Authorization: "Bearer " + (token || NUVEM_CHAVE) } });
      } catch (_) { const e = new Error("Sem conexão com o servidor de contas."); e.semRede = true; throw e; }
      const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch (_) {}
      if (!r.ok) {
        const m = (String(d.error_description || d.msg || d.message || d.error || "") + " " + String(d.error_code || "")).toLowerCase();
        const tr = TRADUZ.find(([k]) => m.includes(k));
        throw new Error(tr ? tr[1] : "O servidor de contas recusou (" + r.status + ")" + (m ? ": " + m : "."));
      }
      return d;
    },
    aceitar(r, lembrar, interativo) {   // `interativo`: a pessoa acabou de provar quem é (senha/provedor) -> sessão RECENTE (vínculo de logins)
      const u = r.user || {}, meta = u.user_metadata || {};
      if (!r.access_token || !u.id) throw new Error("Resposta inesperada do servidor de contas.");
      const d = { access_token: r.access_token, refresh_token: r.refresh_token || "", expira: Date.now() + ((+r.expires_in || 3600) - 60) * 1000,
        uid: u.id, email: String(u.email || meta.email || "").toLowerCase(), nome: meta.full_name || meta.name || meta.user_name || "", lembrar: !!lembrar };
      const ant = nv.ler(); d.entrou = interativo ? Date.now() : (ant && ant.uid === d.uid ? ant.entrou || 0 : 0);
      nv.gravar(d); return d;
    },
    async valida() {   // sessão válida (renova sozinha perto de expirar) ou null
      await nv.retorno;
      const d = nv.ler(); if (!d) return null;
      if (Date.now() < d.expira) return d;
      if (!d.refresh_token) { nv.gravar(null); return null; }
      try { return nv.aceitar(await nv.req("POST", "/auth/v1/token?grant_type=refresh_token", { refresh_token: d.refresh_token }), d.lembrar); }
      catch (e) { if (!e.semRede) nv.gravar(null); return null; }
    },
    async provedores() {
      if (!nv._prov) nv._prov = nv.req("GET", "/auth/v1/settings").then((x) => x.external || {}).catch(() => ({}));
      const ext = await nv._prov;
      return PROVS.map(([id, nome]) => ({ id, nome, disponivel: !!ext[id] }));
    },
    retorno: null, erroRetorno: "",
  };
  const b64url = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  (function retornoDoLogin() {   // volta do Google/GitHub (PKCE): troca o código pela sessão e limpa a barra de endereços
    const qs = new URLSearchParams(location.search), code = qs.get("code"), err = qs.get("error_description") || qs.get("error"), errCod = qs.get("error_code") || "";
    if (!code && !err) return;
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (_) {}
    let pk = null; try { pk = JSON.parse(sessionStorage.getItem(K_PKCE) || "null"); sessionStorage.removeItem(K_PKCE); } catch (_) {}
    if (err || !pk) {
      const t = (err || "") + " " + errCod;
      if (pk && pk.vinculo) nv.aviso = { texto: /already|exists/i.test(t) ? MSG_OUTRA_CONTA : "Vínculo não concluído: " + (err || "cancelado") + ".", tipo: "erro" };
      else nv.erroRetorno = err ? "Login não concluído: " + err : "Login não concluído. Tente de novo.";
      return;
    }
    nv.retorno = nv.req("POST", "/auth/v1/token?grant_type=pkce", { auth_code: code, code_verifier: pk.v })
      .then((r) => {
        if (pk.vinculo) {   // voltou de um VÍNCULO: tem de ser a mesma conta; nunca troca de conta nem mescla
          if ((r.user || {}).id !== pk.uid) { nv.aviso = { texto: "O login escolhido abriu OUTRA conta DASSH e não foi vinculado a esta. Nada foi mesclado.", tipo: "erro" }; return; }
          nv.aceitar(r, pk.lembrar, false); nv.aviso = { texto: "Login vinculado à sua conta.", tipo: "ok" };
        } else nv.aceitar(r, pk.lembrar, true);
      }).catch((e) => { if (pk.vinculo) nv.aviso = { texto: e.message, tipo: "erro" }; else nv.erroRetorno = e.message; });
  })();
  const contaOk = (d) => ({ ok: true, token: "web", email: d.email, nome: d.nome });
  const tentar = (f) => f().catch((e) => ({ ok: false, erro: e.message, sem_rede: !!e.semRede, ...(e.reaut ? { reautenticar: e.reaut } : {}) }));
  const CONTA_WEB = {   // as MESMAS chamadas da tela de conta já aprovada (app.js), atendidas no navegador
    conta_estado: async () => {
      const d = await nv.valida(), prov = await nv.provedores();
      if (d) return { existe: true, logado: true, usuario: d.email, kdf: "Conta DASSH (nuvem)", criada: "", ultimo_login: "",
        sessao: { expira_ociosa_s: 0, expira_idade_s: 0 }, nuvem: { provedores: prov, lembrado: d.email, ligada: d.email } };
      return { existe: true, usuario: "", nuvem: { provedores: prov, lembrado: "" } };
    },
    conta_retomar: async (tok) => ({ ok: tok === "web" && !!(await nv.valida()) }),
    conta_nuvem_retomar: async () => { const d = await nv.valida(); return d ? contaOk(d) : { ok: false, erro: nv.erroRetorno || "Nada lembrado." }; },
    conta_nuvem_entrar: (email, senha, lembrar) => tentar(async () =>
      contaOk(nv.aceitar(await nv.req("POST", "/auth/v1/token?grant_type=password", { email: String(email || "").trim(), password: senha || "" }), lembrar, true))),
    conta_nuvem_criar: (email, senha, lembrar, nome) => tentar(async () => {
      const r = await nv.req("POST", "/auth/v1/signup?redirect_to=" + encodeURIComponent(VOLTA), { email: String(email || "").trim(), password: senha || "", data: { full_name: nome || "" } });
      if (r.access_token) return contaOk(nv.aceitar(r, lembrar, true));
      return { ok: false, confirmar: true, erro: "Enviamos um link de confirmação para " + String(email).trim().toLowerCase() + ". Abra o e-mail, confirme e depois toque em Entrar." };
    }),
    conta_nuvem_oauth: async (prov, lembrar) => {
      const v = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const c = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
      try { sessionStorage.setItem(K_PKCE, JSON.stringify({ v, lembrar: !!lembrar })); } catch (_) {}
      location.href = NUVEM_URL + "/auth/v1/authorize?" + new URLSearchParams({ provider: prov, redirect_to: VOLTA, code_challenge: c, code_challenge_method: "s256" });
      return nunca();
    },
    conta_nuvem_recuperar: (email) => tentar(async () => {
      await nv.req("POST", "/auth/v1/recover?redirect_to=" + encodeURIComponent(VOLTA), { email: String(email || "").trim() });
      return { ok: true, msg: "Se existir uma conta com " + email + ", enviamos um link para criar uma senha nova." };
    }),
    conta_sair: async (_tok, todas) => {
      const d = nv.ler(); nv.gravar(null);
      if (d) nv.req("POST", "/auth/v1/logout" + (todas ? "" : "?scope=local"), {}, d.access_token).catch(() => {});
      return { ok: true };
    },
    conta_tocar: async () => ({ ok: true }),
    conta_trocar_senha: (_tok, atual, nova) => tentar(async () => {
      const d = await nv.valida(); if (!d) throw new Error("Entre de novo.");
      await nv.req("POST", "/auth/v1/token?grant_type=password", { email: d.email, password: atual || "" });   // confere a atual
      await nv.req("PUT", "/auth/v1/user", { password: nova || "" }, d.access_token);
      return { ok: true };
    }),
    conta_oauth_estado: async () => ({}),
    conta_nuvem_admin: async () => ({ admin: false }),
    conta_entrar: async () => ({ ok: false, erro: "No portal, entre com o e-mail da sua conta DASSH (ou Google/GitHub)." }),
    conta_criar: async () => ({ ok: false, erro: "Use o seu e-mail para criar a conta DASSH." }),
    conta_recuperar: async () => ({ ok: false, erro: "Use o e-mail da sua conta DASSH para recuperar o acesso." }),
    conta_nuvem_ligar: async () => ({ ok: false, erro: "Entre com a sua conta DASSH." }),
    // ---- conta ÚNICA: métodos de login (as mesmas chamadas do app; aqui falam direto com o servidor de contas) ----
    conta_nuvem_identidades: (_tok) => tentar(async () => {
      const d = await nv.valida(); if (!d) throw new Error("Entre na sua conta DASSH primeiro.");
      const r = await identidadesWeb(d), av = nv.aviso; nv.aviso = null;
      return { ok: true, nuvem: true, email: d.email, ...r, ...(av ? { aviso: av.texto, aviso_tipo: av.tipo } : {}) };
    }),
    conta_nuvem_vincular: (_tok, provedor, senha) => tentar(async () => {
      if (!VINCULAVEIS.includes(provedor)) throw new Error("Este tipo de login não pode ser vinculado.");
      let d = await nv.valida(); if (!d) throw new Error("Entre na sua conta DASSH primeiro.");
      d = await exigirRecente(d, senha);
      const atual = await identidadesWeb(d);
      if (atual.metodos.some((m) => m.id === provedor && m.vinculado)) throw new Error("Este login já está vinculado a esta conta.");
      const v = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const c = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
      const r = await nv.req("GET", "/auth/v1/user/identities/authorize?" + new URLSearchParams({ provider: provedor, redirect_to: VOLTA,
        code_challenge: c, code_challenge_method: "s256", skip_http_redirect: "true" }), undefined, d.access_token);
      if (!r || typeof r.url !== "string" || !/^https:\/\//.test(r.url)) throw new Error("O servidor de contas não devolveu o endereço de vínculo.");
      try { sessionStorage.setItem(K_PKCE, JSON.stringify({ v, lembrar: d.lembrar, vinculo: provedor, uid: d.uid })); } catch (_) {}
      location.href = r.url;
      return nunca();   // a página sai para o provedor e volta com o código (retornoDoLogin)
    }),
    conta_nuvem_desvincular: (_tok, identityId, senha) => tentar(async () => {
      const iid = String(identityId || "");
      if (!/^[0-9A-Za-z-]{8,64}$/.test(iid)) throw new Error("Método de login inválido.");
      let d = await nv.valida(); if (!d) throw new Error("Entre na sua conta DASSH primeiro.");
      d = await exigirRecente(d, senha);
      const atual = await identidadesWeb(d), alvo = atual.metodos.find((m) => m.identity_id === iid && m.vinculado);
      if (!alvo) throw new Error("Este método de login não existe mais nesta conta. Atualize a lista.");
      if (atual.total < 2) throw new Error("Este é o seu último método de login: vincule outro antes de remover este.");
      await nv.req("DELETE", "/auth/v1/user/identities/" + encodeURIComponent(iid), undefined, d.access_token);
      return { ok: true, nuvem: true, email: d.email, ...(await identidadesWeb(d)) };
    }),
  };
  async function identidadesWeb(d) {   // espelho de nuvem.identidades()
    const u = await nv.req("GET", "/auth/v1/user", undefined, d.access_token), vistos = {};
    for (const it of (u.identities || [])) if (it && it.provider && it.identity_id) vistos[it.provider] = it;
    const nomes = Object.fromEntries(PROVS), ordem = ["email", ...VINCULAVEIS, ...Object.keys(vistos).filter((p) => p !== "email" && !VINCULAVEIS.includes(p))];
    const metodos = ordem.map((p) => { const it = vistos[p], dados = (it && it.identity_data) || {};
      return { id: p, nome: p === "email" ? "E-mail e senha" : nomes[p] || p, vinculado: !!it, identity_id: it ? it.identity_id : "",
        email: it ? String(dados.email || "").toLowerCase() : "", desde: it ? String(it.created_at || "").slice(0, 10) : "", vinculavel: p !== "email" }; });
    const total = metodos.filter((m) => m.vinculado).length, atual = nv.ler() || d;
    return { metodos, total, pode_desvincular: total >= 2, conta: String(u.email || "").toLowerCase(), uid: u.id || "",
      recente: Date.now() - (atual.entrou || 0) <= RECENTE_MS, recente_min: RECENTE_MS / 60000, tem_senha: !!vistos.email };
  }
  async function exigirRecente(d, senha) {   // vincular/desvincular exige sessão recente: senão confirma a senha (ou entrar de novo)
    if (Date.now() - (d.entrou || 0) <= RECENTE_MS) return d;
    if (!senha) {
      const tem = (await identidadesWeb(d)).metodos.some((m) => m.id === "email" && m.vinculado);
      const e = new Error(tem ? "Por segurança, confirme a sua senha para mexer nos métodos de login."
                              : "Por segurança, saia e entre de novo (com o Google ou o GitHub que já usa) e então volte aqui.");
      e.reaut = tem ? "reautenticar" : "reentrar"; throw e;
    }
    let r;
    try { r = await nv.req("POST", "/auth/v1/token?grant_type=password", { email: d.email, password: senha }); }
    catch (e) { if (e.semRede) throw e; throw new Error("Senha incorreta."); }
    if ((r.user || {}).id !== d.uid) throw new Error("Esta senha não é da conta aberta.");
    return nv.aceitar(r, d.lembrar, true);
  }
  // o computador conectou (Conector ou celular): abre nele a MESMA conta que a página já abriu (um login só)
  async function entregarConta(chamar) {
    try {
      const d = await nv.valida(); if (!d) return;
      const r = await Promise.race([chamar("conta_nuvem_sessao", [d.access_token]), dormir(15000).then(() => null)]);
      if (r && r.ok && r.token) sessionStorage.setItem("dassh.conta", r.token);
    } catch (_) {}   // Conector antigo (sem o método) ou sem rede: segue para a tela de conta de sempre
  }
  // ---- acionamento automático do Conector ----
  const statusConector = document.createElement("div");
  statusConector.id = "status-conector";
  statusConector.setAttribute("role", "status");
  statusConector.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:99997;pointer-events:none;background:var(--conector-painel);color:var(--texto);border:1px solid var(--borda-neutra);border-radius:8px;padding:8px 12px;font:14px 'Segoe UI',system-ui,sans-serif";
  function mostrarBusca(texto) {
    if (!texto) return statusConector.remove();
    statusConector.textContent = texto;
    if (!statusConector.isConnected) document.body.appendChild(statusConector);
  }

  function lerCredencial(v) {
    const [p, token, ...sobra] = v.split(".");
    const porta = Number(p);
    return !sobra.length && /^\d{2,5}$/.test(p) && porta <= 65535 && RE_SEGREDO.test(token || "") ? { porta, token } : null;
  }
  const portasSondagem = () => JANELA_CONECTOR ? [Number(location.port)] : PORTAS;
  const codificador = new TextEncoder();
  const paraHex = (v) => Array.from(new Uint8Array(v), (b) => b.toString(16).padStart(2, "0")).join("");

  async function sondar(token, persistente, portas = portasSondagem(), ms = 300) {
    if (!RE_SEGREDO.test(token) || !crypto.subtle || ms <= 0) return null;
    const hash = await crypto.subtle.digest("SHA-256", codificador.encode(token));
    const chave = await crypto.subtle.importKey("raw", hash, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    return new Promise((ok) => {
      const abertos = new Set();
      let faltam = portas.length, concluido = false;
      const fechar = (s) => {
        s.onopen = s.onmessage = s.onerror = s.onclose = null;
        if (s.readyState < 2) s.close();
      };
      const concluir = (resultado) => {
        if (concluido) return;
        concluido = true;
        clearTimeout(limite);
        for (const s of abertos) {
          if (resultado && s === resultado.sock) s.onopen = s.onmessage = s.onerror = s.onclose = null;
          else fechar(s);
        }
        abertos.clear();
        ok(resultado);
      };
      const limite = setTimeout(() => concluir(null), ms);
      const recusar = (s) => {
        if (s) {
          if (!abertos.delete(s)) return;
          fechar(s);
        }
        if (--faltam === 0) concluir(null);
      };
      for (const porta of portas) {
        let sock;
        try { sock = new WebSocket("ws://127.0.0.1:" + porta + "/ws"); }
        catch (_) { recusar(); continue; }
        abertos.add(sock);
        let contexto = "";
        sock.onopen = () => sock.send(JSON.stringify({ t: "desafio", persistente }));
        sock.onerror = sock.onclose = () => recusar(sock);
        sock.onmessage = async (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (d.t === "desafio" && !contexto && RE_SEGREDO.test(d.nonce || "")) {
              contexto = d.nonce + "|" + location.origin + "|" + porta;
              const prova = paraHex(await crypto.subtle.sign("HMAC", chave, codificador.encode("navegador|" + contexto)));
              if (abertos.has(sock)) sock.send(JSON.stringify({ t: "prova", prova }));
              return;
            }
            if (d.t === "ok" && contexto && /^[a-f0-9]{64}$/.test(d.prova || "")) {
              const prova = Uint8Array.from(d.prova.match(/../g), (v) => parseInt(v, 16));
              const valido = await crypto.subtle.verify("HMAC", chave, prova, codificador.encode("conector|" + contexto));
              if (valido && abertos.has(sock) && sock.readyState === 1)
                return concluir({ sock, porta, token, persistente, navegador: d.navegador });
            }
          } catch (_) {}
          recusar(sock);
        };
      }
    });
  }

  function acionar(peloBotao) {
    if (ws_.pronto || portal.conector) return Promise.resolve(true);
    if (ws_.busca) return ws_.busca;
    ws_.manual = false;
    mostrarBusca("Procurando o Conector…");
    ws_.busca = procurarConector(peloBotao).finally(() => {
      ws_.busca = null;
      mostrarBusca("");
    });
    return ws_.busca;
  }

  async function procurarConector(peloBotao) {
    const inicioBusca = performance.now();
    const cache = lerPersistente(), anterior = lerCredencial(cred);
    const lancamento = ws_.protocolo || window.__segredoConector || segredoNovo();
    const pararBusca = () => ws_.manual || ws_.pronto || portal.conector;
    let achou = null;
    if (anterior && (m || !cache)) {
      achou = await sondar(anterior.token, false, [anterior.porta]);
      if (!achou && !ws_.manual) { cred = ""; gravarSessao(""); }
    }
    if (!achou && !pararBusca()) achou = await sondar(cache || lancamento, !!cache);
    if (!achou && !pararBusca() && cache && ws_.protocolo) achou = await sondar(lancamento, false);
    if (!achou && !pararBusca()) {
      if (!JANELA_CONECTOR && !MODO_CEL) entrarPortal();
      if (!ws_.protocolo && !JANELA_CONECTOR) {
        await dormir(Math.max(0, 300 - (performance.now() - inicioBusca)));
        if (!pararBusca()) abrirProtocolo(lancamento, SAFARI && !LOCAL);
        const ate = performance.now() + 30000;
        let pausa = 200;
        while (performance.now() < ate && !pararBusca() && !achou) {
          const inicio = performance.now();
          const novoCache = lerPersistente();
          achou = novoCache && novoCache !== cache ? await sondar(novoCache, true, portasSondagem(), Math.min(2500, ate - performance.now())) : null;
          if (!achou && !pararBusca()) achou = await sondar(lancamento, false, portasSondagem(), Math.min(300, ate - performance.now()));
          if (!achou && !pararBusca()) {
            await dormir(Math.max(0, Math.min(ate - performance.now(), pausa - (performance.now() - inicio))));
            pausa = Math.min(pausa + 50, 1000);
          }
        }
      }
    }
    if (pararBusca()) { achou?.sock.close(); return ws_.pronto || !!portal.conector; }
    if (achou) { aceitarConector(achou); return true; }
    if (JANELA_CONECTOR || MODO_CEL || (peloBotao && !portal.ativo)) {
      mostrarLocal();
      mostrar();
      msg("O Conector não respondeu.", true);
    }
    return false;
  }

  function aceitarConector(achou) {
    const { sock, porta, token, persistente, navegador } = achou;
    if (RE_SEGREDO.test(navegador || "")) gravarPersistente(navegador);
    if (!persistente) { cred = porta + "." + token; gravarSessao(cred); }
    else { cred = ""; gravarSessao(""); }
    mostrarBusca("");
    if (portal.avisado) {
      sock.close();
      const persistido = persistente || (!!navegador && lerPersistente() === navegador);
      if (performance.now() < 1000 && !portal.interagiu && (persistido || (cred && lerSessao() === cred)))
        return location.reload();
      portal.conector = location.pathname + location.search + (!persistido && cred ? "#agente=" + cred : "");
      portal.card?.remove();
      tela.remove();
      barraPortal();
      return;
    }

    ws_.sock = sock;
    ws_.alvo = { porta, token: navegador || token, persistente: !!navegador || persistente };
    ws_.tentativas = 0;
    tela.remove();
    sock.onmessage = (ev) => {
      let d; try { d = JSON.parse(ev.data); } catch (_) { return; }
      if (d.t === "res") {
        const p = ws_.pend.get(d.id); if (!p) return; ws_.pend.delete(d.id);
        d.e ? p.falha(new Error(d.e)) : p.ok(d.r);
      } else if (d.t === "ev" && /^[A-Za-z_$][\w$]*$/.test(d.fn || "") && typeof window[d.fn] === "function") {
        try { window[d.fn](...(d.a || [])); } catch (e) { console.error("evento", d.fn, e); }
      }
    };
    sock.onclose = () => {
      if (ws_.sock !== sock) return;
      ws_.sock = null;
      ws_.pend.forEach((p) => p.falha(new Error("Conector desconectado"))); ws_.pend.clear();
      agendarReconexao();
    };
    if (!ws_.pronto) {
      ws_.pronto = true;
      if (portal.ativo) {
        portal.ativo = false;
        delete window.__portal;
        barra.remove();
      }
      window.pywebview = { api };
      entregarConta(rpc).finally(() => window.dispatchEvent(new Event("pywebviewready")));
    } else {
      let tok = "";
      try { tok = sessionStorage.getItem("dassh.conta") || ""; } catch (_) {}
      if (tok) rpc("conta_retomar", [tok]).then((r) => {
        if (!r?.ok && typeof window.contaBloqueada === "function") window.contaBloqueada("expirou");
      }).catch(() => {});
    }
  }

  function agendarReconexao() {
    if (ws_.tentativas >= 40) return mostrarBusca("Conector desconectado.");
    mostrarBusca("Reconectando ao Conector…");
    const primeira = ws_.tentativas === 0;
    setTimeout(async () => {
      const { porta, token, persistente } = ws_.alvo;
      const achou = await sondar(token, persistente, primeira && persistente ? portasSondagem() : [porta]);
      if (achou) aceitarConector(achou);
      else agendarReconexao();
    }, Math.min(1000 * ++ws_.tentativas, 5000));
  }

  // =================================================================================================================
  // 📱 CELULAR: "Conectar ao meu computador" — a MESMA interface operando o PC pareado, com a mesma ponte (RPC api.* + eventos
  // window[fn](...)) indo pelo canal cifrado de ponta a ponta do pareamento (ponte-remota.js + conectado.py) em vez de 127.0.0.1.
  // =================================================================================================================
  const CELULAR = /iPhone|iPad|iPod|Android|Mobile/i.test(UA);
  // O portal decide se precisa carregar o canal antes de importar o módulo.
  const lerParesGuardados = () => {
    try { return JSON.parse(localStorage.getItem("dassh-cel-v1") || "null"); } catch (_) { return null; }
  };
  const lerPar = () => {
    if (rem.R) return rem.R.ler();
    const d = lerParesGuardados();
    const a = Array.isArray(d?.pcs) ? d.pcs.find((p) => p?.dev === d.ativo) : d;
    return a?.pc ? a : null;
  };
  const lerRem = () => { try { return sessionStorage.getItem("dassh.remoto") === "1"; } catch (_) { return false; } };
  const gravarRem = (v) => { try { v ? sessionStorage.setItem("dassh.remoto", "1") : sessionStorage.removeItem("dassh.remoto"); } catch (_) {} };
  const mPar = /(?:^|[#&])par=([A-Za-z0-9-]{1,20})/.exec(location.hash);
  const codPar = mPar ? mPar[1].toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  const pedeCel = /(?:^|[#&])celular(?:$|&)/.test(location.hash);
  if (codPar || pedeCel) try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}   // código fora do histórico
  const JANELA_CONECTOR = LOCAL && /^\/app(\/|$)/.test(location.pathname);   // a janela local servida pelo próprio Conector
  const MODO_CEL = !JANELA_CONECTOR && !m && (CELULAR || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) || !!codPar || pedeCel || lerRem());
  const escH = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rem = { R: null, info: null, minhas: new Set(), anexadas: new Set(), soltas: new Set(), prontoUI: false, ativo: false };
  window.__remoto = rem;   // (testes) estado visível — nenhuma chave fica aqui

  let canalCarregando;
  function carregarCanal() {   // mqtt.min.js (script comum) + ponte-remota.js (módulo com a criptografia), só quando precisa
    if (rem.R) return Promise.resolve(rem.R);
    if (canalCarregando) return canalCarregando;
    canalCarregando = new Promise((ok, falha) => {
      if (window.mqtt) return ok();
      const s = document.createElement("script"); s.src = "vendor/mqtt.min.js"; s.onload = ok;
      s.onerror = () => falha(new Error("não consegui carregar o canal (vendor/mqtt.min.js)")); document.head.appendChild(s);
    }).then(() => import("./ponte-remota.js")).then((R) => { prepararCanal(R); rem.R = R; return R; })
      .finally(() => { canalCarregando = null; });
    return canalCarregando;
  }

  const telaCel = document.createElement("div");
  telaCel.id = "tela-celular";
  telaCel.setAttribute("role", "dialog"); telaCel.setAttribute("aria-modal", "true"); telaCel.setAttribute("aria-labelledby", "rc-tit");
  telaCel.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--superficie-recuada);color:var(--texto);font:15px/1.45 -apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;padding-top:calc(16px + env(safe-area-inset-top))";
  const BTN = "border:0;border-radius:14px;padding:16px;font:700 17px inherit;cursor:pointer;width:100%";
  const CAMPO = "width:100%;box-sizing:border-box;background:var(--cel-campo);color:var(--texto);border:1px solid var(--cel-borda);border-radius:10px;padding:12px;font-size:16px";
  telaCel.innerHTML = `<div style="width:min(440px,100%);text-align:center">
      <div style="font-weight:800;font-size:22px;letter-spacing:.5px;margin-bottom:4px">D<span style="color:var(--cel-acento)">A</span>SSH Code</div>
      <p id="rc-tit" style="margin:0 0 22px;color:var(--cel-suave)">Use o seu computador daqui: abas, shell, serial no cabo console, evidências e Biblioteca.</p>
      <button id="rc-conectar" style="${BTN};background:var(--cel-acento);color:var(--cel-sobre-acento)">📱 Conectar ao meu computador</button>
      <div id="rc-msg" role="status" aria-live="polite" style="min-height:24px;margin:14px 0 0;color:var(--conector-texto)"></div>
      <div id="rc-sas" hidden style="margin:10px 0 0;color:var(--cel-suave)">Número de conferência (confira no PC):
        <div id="rc-sas-n" style="font:700 26px Consolas,monospace;letter-spacing:4px;color:var(--verde-cl);margin-top:4px"></div></div>
      <div id="rc-par" hidden style="text-align:left;background:var(--cel-painel);border:1px solid var(--cel-borda);border-radius:14px;padding:16px;margin-top:16px">
        <b style="display:block;margin-bottom:6px">Primeira vez neste celular?</b>
        <p style="margin:0 0 10px;color:var(--cel-suave);font-size:14px">No computador, abra o DASSH Code e toque em <b>📱 Celular → Parear celular</b>.
          Aponte a câmera do celular para o QR — ou digite o código abaixo.</p>
        <input id="rc-codigo" placeholder="ABCD-EFGH-JKLM" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de pareamento"
          style="${CAMPO};font:600 20px Consolas,monospace;letter-spacing:2px;text-align:center;text-transform:uppercase">
        <input id="rc-nome" maxlength="40" placeholder="Nome deste aparelho" aria-label="Nome deste aparelho" style="${CAMPO};margin-top:8px">
        <button id="rc-parear" style="${BTN};margin-top:12px;background:var(--cel-acento);color:var(--cel-sobre-acento)">Parear e conectar</button></div>
      <button id="rc-meus" hidden aria-haspopup="dialog" aria-controls="dialogo-meus-pcs">Meus PCs</button>
      <div id="rc-acoes" style="margin-top:18px;display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:13px">
        <a id="rc-esquecer" href="#" hidden style="color:var(--cel-suave)">Esquecer este computador</a>
        <a id="rc-conector" href="#" style="color:var(--cel-suave)">Usar o DASSH Conector deste aparelho</a></div>
      <p style="margin:18px 0 0;font-size:12px;color:var(--conector-ajuda)">🔒 Cifrado de ponta a ponta com as chaves do pareamento (criadas aqui, nunca saem do celular).
        O servidor de retransmissão só vê dados cifrados. O PC precisa estar com “Disponível para meus aparelhos” ligado.</p></div>`;
  const cmsg = (t, erro) => { const e = telaCel.querySelector("#rc-msg"); e.textContent = t || ""; e.style.color = erro ? "var(--erro-detalhe)" : "var(--conector-texto)"; };
  const formularioPar = telaCel.querySelector("#rc-par");
  const q = (s) => telaCel.querySelector(s) || formularioPar.querySelector(s);
  const atualizarAtalhoCel = () => {
    const R = rem.R, dados = R ? { pcs: R.listar(), ativo: R.ler()?.dev } : lerParesGuardados();
    const temOutro = Array.isArray(dados?.pcs) && dados.pcs.some((p) => p?.pc && p.dev !== dados.ativo);
    q("#rc-meus").hidden = !MODO_CEL || !temOutro;
  };
  const preencherNomeCel = () => {
    if (!q("#rc-nome").value) q("#rc-nome").value = /iPhone/.test(UA) ? "iPhone" : /iPad/.test(UA) ? "iPad" : /Android/.test(UA) ? "Android" : "Celular";
  };
  function mostrarCel(paraParear) {
    tela.remove(); if (!telaCel.isConnected) document.body.appendChild(telaCel);
    const d = lerPar(), par = !!paraParear || !d || d.revogado;
    if (!dialogoPcs.contains(formularioPar)) formularioPar.hidden = !par;
    q("#rc-conectar").hidden = par;
    q("#rc-esquecer").hidden = !d;
    if (d && !par) q("#rc-conectar").textContent = "📱 Conectar a " + (rem.R?.nomeDe(d) || d.pc.nome);
    atualizarAtalhoCel();
    if (par) preencherNomeCel();
  }
  q("#rc-conectar").onclick = () => conectarCel();
  q("#rc-parear").onclick = () => parearCel(q("#rc-codigo").value);
  q("#rc-codigo").onkeydown = (e) => { if (e.key === "Enter") q("#rc-parear").click(); };
  q("#rc-conector").onclick = (e) => { e.preventDefault(); gravarRem(false); telaCel.remove(); acionar(true); };
  q("#rc-meus").onclick = async (e) => {
    const botao = e.currentTarget;
    botao.disabled = true;
    try {
      await carregarCanal();
      if (botao.isConnected) abrirMeusPcs();
    } catch (_) { cmsg("Não foi possível abrir Meus PCs.", true); }
    finally { botao.disabled = false; }
  };
  q("#rc-esquecer").onclick = async (e) => {
    e.preventDefault();
    const d = lerPar();
    if (!d || !confirm("Esquecer este computador? Para voltar a usar, será preciso parear de novo (e revogar o antigo no PC).")) return;
    try {
      const R = await carregarCanal();
      await R.esquecer(d.dev);
      limparContaRemota();
      gravarRem(false); mostrarCel(true); cmsg("");
      if (R.listar().length && MODO_CEL) abrirMeusPcs();
    } catch (_) { cmsg("Não foi possível esquecer este PC.", true); }
  };

  async function parearCel(codigo) {
    const outroPc = dialogoPcs.contains(formularioPar);
    const mensagem = outroPc ? mensagemPcs : cmsg;
    const cod = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cod.length !== 12) return mensagem("O código tem 12 caracteres (ex.: ABCD-EFGH-JKLM).", true);
    if (outroPc) {
      rem.mudandoPc = true;
      q("#rc-codigo").value = "";
      q("#rc-codigo").disabled = q("#rc-nome").disabled = true;
      fecharPcs.disabled = true;
    }
    q("#rc-parear").disabled = true; mensagem("Pareando com segurança…");
    try {
      const R = await carregarCanal();
      const d = await R.parear(cod, (q("#rc-nome").value || "").trim().slice(0, 40) || "Celular");
      if (outroPc) return reabrirParaPc();
      q("#rc-sas-n").textContent = d.sas; q("#rc-sas").hidden = false;
      formularioPar.hidden = true; q("#rc-conectar").hidden = false; q("#rc-conectar").textContent = "📱 Conectar a " + d.pc.nome;
      q("#rc-esquecer").hidden = false;
      await conectarCel(true);
    } catch (e) { mensagem(e.message || String(e), true); }
    finally {
      q("#rc-parear").disabled = false;
      if (outroPc) {
        rem.mudandoPc = fecharPcs.disabled = false;
        q("#rc-codigo").disabled = q("#rc-nome").disabled = false;
        q("#rc-codigo").focus();
      }
    }
  }

  async function conectarCel(insistir) {
    const d = lerPar();
    if (!d || d.revogado) { mostrarCel(true); return cmsg(d && d.revogado ? "Este celular foi revogado no PC. Pareie de novo." : ""); }
    if (rem.conectando) return;
    rem.conectando = true; q("#rc-conectar").disabled = true;
    const ate = Date.now() + (insistir ? 180000 : 0);
    try {
      const R = await carregarCanal();
      atualizarAtalhoCel();
      for (;;) {
        if (rem.mudandoPc || listaPcs?.ocupada) { await dormir(4000); continue; }
        if (R.ler()?.dev !== d.dev) return;
        cmsg("Conectando a " + R.nomeDe(d) + "…");
        try { await Promise.race([R.conectar(), dormir(30000).then(() => { throw new Error("O PC não respondeu a tempo."); })]); break; }
        catch (e) {
          if (Date.now() > ate) throw e;
          cmsg("Aguardando o PC… No computador, ligue 📱 Celular → “Disponível para meus aparelhos”.");
          await dormir(4000);
        }
      }
      if (!rem.info) throw new Error("O PC não abriu a interface (atualize o DASSH Code no PC).");
      gravarRem(true); entrarRemoto();
    } catch (e) { cmsg(e.message || String(e), true); }
    finally { rem.conectando = false; q("#rc-conectar").disabled = false; }
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

  const dialogoPcs = document.createElement("dialog");
  dialogoPcs.id = "dialogo-meus-pcs";
  dialogoPcs.setAttribute("aria-labelledby", "titulo-meus-pcs");
  dialogoPcs.innerHTML = `<div class="meus-pcs-topo">
      <h2 id="titulo-meus-pcs">Meus PCs</h2><button id="fechar-meus-pcs" autofocus>Fechar</button>
    </div>
    <div id="estado-meus-pcs" role="status"></div>
    <div id="painel-meus-pcs">
      <div id="lista-remoto-pcs" role="list" aria-label="PCs pareados"></div>
      <button id="parear-outro-pc">Parear outro PC</button>
    </div>`;
  const fecharPcs = dialogoPcs.querySelector("#fechar-meus-pcs");
  const tituloPcs = dialogoPcs.querySelector("#titulo-meus-pcs");
  const painelPcs = dialogoPcs.querySelector("#painel-meus-pcs");
  const parearOutro = dialogoPcs.querySelector("#parear-outro-pc");
  const statusPcs = dialogoPcs.querySelector("#estado-meus-pcs");
  let listaPcs, origemPcs;

  function mensagemPcs(texto, erro) {
    statusPcs.textContent = texto;
    statusPcs.classList.toggle("erro", !!erro);
  }

  function limparContaRemota() {
    try { sessionStorage.removeItem("dassh.conta"); } catch (_) {}
  }

  function reabrirParaPc() {
    // A interface começa com as abas e a conta do PC escolhido.
    limparContaRemota();
    gravarRem(true);
    location.reload();
  }

  function abrirMeusPcs(e) {
    if (dialogoPcs.open) return;
    const R = rem.R;
    origemPcs = e?.currentTarget || q("#rc-meus");
    if (!listaPcs) listaPcs = R.criarListaPcs(dialogoPcs.querySelector("#lista-remoto-pcs"), {
      async conectarPc(dev) {
        if (R.cel.sess?.dev === dev && rem.ativo) return dialogoPcs.close();
        rem.mudandoPc = fecharPcs.disabled = parearOutro.disabled = true;
        mensagemPcs("Trocando de PC…");
        try {
          await R.trocar(dev, { reconectar: false });
          reabrirParaPc();
        } finally { rem.mudandoPc = fecharPcs.disabled = parearOutro.disabled = false; }
      },
      aposAlterar(eraAtivo) {
        atualizarAtalhoCel();
        if (eraAtivo) {
          gravarRem(false);
          limparContaRemota();
          if (rem.ativo) desenharBarra(false, "Desconectado do PC");
          else mostrarCel(true);
          mensagemPcs("Escolha um PC ou faça um novo pareamento.");
        } else if (rem.ativo && R.cel.sess) desenharBarraConectada();
      },
      aoErro: () => mensagemPcs("Não foi possível atualizar a lista de PCs.", true),
      focoVazio: parearOutro,
    });
    mensagemPcs("");
    listaPcs.abrir();
    dialogoPcs.showModal();
  }

  parearOutro.onclick = () => {
    if (listaPcs.ocupada || rem.mudandoPc) return;
    mensagemPcs("");
    painelPcs.hidden = true;
    tituloPcs.textContent = "Parear outro PC";
    fecharPcs.textContent = "Voltar";
    preencherNomeCel();
    q("#rc-codigo").value = "";
    dialogoPcs.appendChild(formularioPar);
    formularioPar.hidden = false;
    q("#rc-codigo").focus();
  };
  fecharPcs.onclick = () => {
    if (listaPcs.ocupada || rem.mudandoPc) return;
    if (!dialogoPcs.contains(formularioPar)) return dialogoPcs.close();
    q("#rc-codigo").value = "";
    telaCel.firstElementChild.insertBefore(formularioPar, q("#rc-meus"));
    formularioPar.hidden = !telaCel.isConnected || !q("#rc-conectar").hidden;
    tituloPcs.textContent = "Meus PCs";
    fecharPcs.textContent = "Fechar";
    painelPcs.hidden = false;
    mensagemPcs("");
    listaPcs.abrir();
    parearOutro.focus();
  };
  dialogoPcs.oncancel = (e) => { e.preventDefault(); fecharPcs.click(); };
  dialogoPcs.onclose = () => {
    if (!rem.R.ler() && rem.ativo) return location.reload();
    if (origemPcs?.isConnected && !origemPcs.hidden) origemPcs.focus();
    else if (telaCel.isConnected) (q("#rc-conectar").hidden ? q("#rc-codigo") : q("#rc-conectar")).focus();
    else barra.querySelector("#barra-remoto-meus")?.focus();
  };

  const barra = document.createElement("div");
  barra.id = "barra-remoto";
  barra.style.cssText = "flex:none;display:flex;align-items:center;gap:8px;padding:calc(4px + env(safe-area-inset-top)) 12px 4px;background:var(--cel-sucesso-fundo);color:var(--cel-acento);border-bottom:1px solid var(--cel-sucesso-borda);font:600 13px/1.3 -apple-system,'Segoe UI',Roboto,sans-serif;z-index:40";
  barra.innerHTML = `<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="barra-remoto-txt" role="status"></span>
    <button id="barra-remoto-meus" hidden aria-haspopup="dialog" aria-controls="dialogo-meus-pcs">Meus PCs</button>
    <button id="barra-remoto-sair">Desconectar</button>`;
  barra.querySelector("#barra-remoto-meus").hidden = !MODO_CEL;
  barra.querySelector("#barra-remoto-meus").onclick = abrirMeusPcs;
  barra.querySelector("#barra-remoto-sair").onclick = () => {
    if (!confirm("Desconectar do computador? As abas continuam abertas no PC.")) return;
    gravarRem(false); try { rem.R.desconectar(); } catch (_) {} location.reload();
  };
  function desenharBarra(on, texto) {
    if (!barra.isConnected) document.body.insertBefore(barra, document.body.firstChild);
    barra.style.background = on ? "var(--cel-sucesso-fundo)" : "var(--cel-aviso-fundo)"; barra.style.color = on ? "var(--cel-acento)" : "var(--cel-aviso)";
    barra.querySelector("#barra-remoto-txt").textContent = texto;
  }
  function desenharBarraConectada() {
    const d = rem.R.ler();
    const nome = d?.apelido ? rem.R.nomeDe(d) : rem.info?.pc || rem.R.nomeDe(d);
    desenharBarra(true, "📱 Conectado a " + nome);
  }

  function entrarRemoto() {
    if (portal.ativo) { gravarRem(true); return location.reload(); }   // pareou/conectou a partir do portal: recarrega já pelo túnel
    const R = rem.R;
    telaCel.remove(); tela.remove();
    desenharBarraConectada();
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
      const quando = () => { if (document.readyState === "complete") setTimeout(avisar, 0); else window.addEventListener("load", avisar, { once: true }); };
      entregarConta((m, a) => R.rpc(m, a)).finally(quando);
    }
  }
  function prepararCanal(R) {
    if (MODO_CEL && !dialogoPcs.isConnected) document.body.appendChild(dialogoPcs);
    R.cel.aoMsg = aoMsgRemota;
    R.cel.aoEstado = () => { if (dialogoPcs.open) listaPcs.atualizar(); };
    R.cel.aoConectado = async () => {   // a cada (re)conexão: abre a interface completa no PC
      const r = await R.pedir({ t: "ui" });
      if (r && r.ok) { rem.info = r; if (rem.ativo) { desenharBarraConectada(); R.enviar({ t: "listar" }); } }
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

  // =================================================================================================================
  // 🌐 MODO PORTAL: a MESMA interface abre na hora, sem Conector e sem pareamento. Nada muda no layout: as abas mostram um
  // shell próprio do portal (só para não ficar vazio) e, quando a pessoa pede algo que precisa de um computador, aparece o
  // convite: no PC "Conectar este computador" (chama o Conector; se não responder, oferece baixar); no celular/tablet usa o
  // pareamento já aprovado (túnel cifrado até o PC) ou oferece parear.
  // =================================================================================================================
  const TABLET = /Macintosh/.test(UA) && navigator.maxTouchPoints > 1;   // iPadOS se apresenta como Mac
  const MOVEL = CELULAR || TABLET;
  const portal = { ativo: false, avisado: false, interagiu: false, conector: false, ultimoGesto: 0, card: null };
  for (const tipo of ["pointerdown", "keydown", "wheel", "input"]) {
    addEventListener(tipo, (e) => { if (e.isTrusted) portal.interagiu = true; }, { capture: true, passive: true });
  }
  addEventListener("pointerdown", () => { portal.ultimoGesto = Date.now(); }, true);
  addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") portal.ultimoGesto = Date.now(); }, true);
  // chamadas que a interface faz sozinha (início, temporizadores): respondem vazio/esperam, nunca abrem o convite
  const PASSIVA = /^(inicial|portas|clientes|historico|conta_|verificar|area_transferencia|redimension|tamanho|config|envio_estado|fila_status|evid_status|pdf_ultimo|skills?_lista|listar|lista)|(_status|_estado|_listar|_lista|_ultimo)$/;
  const PADRAO = {
    inicial: () => ({ cfg: {}, portas: [], evid: null, cofre: [], clientes: null, rede_temp: [], teste: "", versao: "" }),
    fila_status: () => ({ atual: null, fila: [], lote: { total: 0, feitos: 0 } }),
    portas: () => { if (Date.now() - portal.ultimoGesto < 2000) oferecer(); return []; },
    verificar_atualizacao: () => null,
  };
  const apiPortal = new Proxy({}, { get: (_, nome) => {
    if (typeof nome !== "string" || nome === "then") return undefined;
    return (...a) => {
      if (EXTRAS[nome]) return EXTRAS[nome](...a);
      if (CONTA_WEB[nome]) return CONTA_WEB[nome](...a);
      if (PADRAO[nome]) return Promise.resolve(PADRAO[nome](...a));
      if (!PASSIVA.test(nome) && Date.now() - portal.ultimoGesto < 2000) oferecer();
      return nunca();   // operação do portal que depende do computador
    };
  } });

  // ---- convite para conectar (cartão discreto, no mesmo visual da tela de conexão) ----
  function oferecer(motivo) {
    if (portal.conector) motivo = "Conector pronto";
    if (portal.card && portal.card.isConnected) return;
    const parOk = lerPar();
    if (MOVEL && parOk && !parOk.revogado) { gravarRem(true); return location.reload(); }   // já aprovado: usa o túnel na hora
    const c = document.createElement("div");
    c.id = "portal-convite"; c.setAttribute("role", "dialog"); c.setAttribute("aria-labelledby", "pc-tit");
    c.style.cssText = "position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:var(--sombreado-55);padding:16px;font:14px/1.45 'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--texto)";
    const par = lerPar();
    const BT = "border:0;border-radius:8px;padding:11px 16px;font-weight:600;cursor:pointer;font-size:14px";
    let corpo;
    if (MOVEL) corpo = par && !par.revogado
      ? `<p style="margin:0 0 14px;color:var(--conector-suave)">Isso roda no seu computador. Este aparelho já está pareado com <b>${escH(par.pc.nome)}</b>.</p>
         <button id="pc-ir" style="${BT};background:var(--cel-acento);color:var(--cel-sobre-acento);width:100%">📱 Conectar a ${escH(par.pc.nome)}</button>`
      : `<p style="margin:0 0 14px;color:var(--conector-suave)">Isso roda no seu computador. Pareie este aparelho uma vez e depois é só um toque.</p>
         <button id="pc-ir" style="${BT};background:var(--cel-acento);color:var(--cel-sobre-acento);width:100%">📱 Parear com meu computador</button>`;
    else corpo = `<p style="margin:0 0 14px;color:var(--conector-suave)">Serial, SSH, PowerShell e o resto rodam neste computador pelo <b>DASSH Conector</b>,
         um programa leve que só escuta em 127.0.0.1 e só aceita este site.</p>
       <div id="pc-msg" role="status" aria-live="polite" style="min-height:20px;margin-bottom:10px;color:var(--conector-texto)"></div>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button id="pc-ir" style="${BT};background:var(--verde);color:var(--sobre-acento-conta)">Conectar este computador</button>
         <a id="pc-baixar" href="${URL_CONECTOR}" target="_blank" rel="noopener" hidden style="${BT};background:var(--conector-botao);color:var(--texto);border:1px solid var(--link);text-decoration:none">Baixar o Conector</a></div>`;
    c.innerHTML = `<div style="width:min(440px,100%);background:var(--conector-painel);border:1px solid var(--borda-neutra);border-radius:14px;padding:20px;box-shadow:0 20px 60px var(--sombreado-50)">
        <h2 id="pc-tit" style="margin:0 0 6px;font-size:17px">${escH(motivo || "Conectar para continuar")}</h2>${corpo}
        <div style="margin-top:12px;text-align:right"><a id="pc-fechar" href="#" style="color:var(--conector-suave);font-size:13px">Continuar navegando</a></div></div>`;
    document.body.appendChild(c); portal.card = c;
    const fechar = () => c.remove();
    c.querySelector("#pc-fechar").onclick = (e) => { e.preventDefault(); fechar(); };
    c.onclick = (e) => { if (e.target === c) fechar(); };
    c.onkeydown = (e) => { if (e.key === "Escape") fechar(); };
    const ir = c.querySelector("#pc-ir"); ir.focus();
    if (MOVEL) ir.onclick = () => {
      fechar();
      if (par && !par.revogado) { gravarRem(true); location.reload(); }   // recarrega já pelo túnel aprovado
      else mostrarCel(true);
    };
    else if (portal.conector) {
      ir.textContent = "Abrir plataforma conectada";
      ir.onclick = () => window.open(portal.conector, "_blank", "noopener");
    } else ir.onclick = () => conectarPeloPortal(c);
  }
  async function conectarPeloPortal(c) {
    const m = c.querySelector("#pc-msg");
    m.textContent = "Procurando o Conector…";
    if (await acionar(true) || !c.isConnected) return;
    c.querySelector("#pc-baixar").hidden = false;
    c.querySelector("#pc-ir").textContent = "Tentar novamente";
    m.textContent = SAFARI ? "Abra o Conector para usar a janela local." : "O Conector não respondeu.";
  }

  // ---- shell próprio do portal (dentro das abas que já existem: mesmo visual, só para não ficar vazio) ----
  const PROMPT = "\x1b[1;32mvisitante@dassh-portal\x1b[0m:\x1b[1;34m~\x1b[0m$ ";
  const linhas = new Map();
  const AJUDA = ["Comandos do portal (rodam aqui no navegador):",
    "  ajuda | help       esta lista",
    "  conectar           liga este " + (MOVEL ? "aparelho ao seu computador pareado" : "computador (DASSH Conector)"),
    "  limpar | clear     limpa a tela",
    "  sobre              o que é o portal",
    "Qualquer outro comando precisa de um computador conectado."];
  function boasVindas(a) {
    a.term.write("\x1b[38;2;94;224;181mDASSH Code\x1b[0m — portal web. Navegue à vontade; para rodar comandos, digite \x1b[1mconectar\x1b[0m.\r\n" +
      "\x1b[90mDigite ajuda para ver os comandos do portal.\x1b[0m\r\n" + PROMPT);
  }
  function tecla(a, d) {
    let l = linhas.get(a.id) || "";
    for (const ch of d.replace(/\x1b\[[0-9;]*[A-Za-z~]|\x1bO./g, "")) {
      if (ch === "\r") {
        a.term.write("\r\n"); executar(a, l.trim()); l = "";
      } else if (ch === "\x7f" || ch === "\b") {
        if (l) { l = l.slice(0, -1); a.term.write("\b \b"); }
      } else if (ch === "\x03") { a.term.write("^C\r\n" + PROMPT); l = ""; }
      else if (ch >= " ") { l += ch; a.term.write(ch); }
    }
    linhas.set(a.id, l);
  }
  function executar(a, cmd) {
    const c = cmd.toLowerCase();
    const sai = (t) => a.term.write(t.replace(/\n/g, "\r\n") + "\r\n");
    if (!c) {}
    else if (c === "ajuda" || c === "help" || c === "?") sai(AJUDA.join("\n"));
    else if (c === "limpar" || c === "clear" || c === "cls") { a.term.write("\x1b[2J\x1b[3J\x1b[H"); }
    else if (c === "sobre") sai("Portal web do DASSH Code: a mesma plataforma do app.\nO que roda em equipamentos (serial, SSH, shell, nuvem, evidências) usa o seu computador,\npelo DASSH Conector ou pelo celular pareado.");
    else if (c === "conectar") { sai("\x1b[36mAbrindo a conexão…\x1b[0m"); oferecer(); }
    else { sai("\x1b[33m⚡ “" + cmd.slice(0, 60) + "” precisa de um computador conectado.\x1b[0m"); oferecer("Conectar para rodar este comando"); }
    a.term.write(PROMPT);
  }

  // ---- barra fina no topo (mesmo estilo da barra do celular): lembra que dá para conectar ----
  function barraPortal() {
    barra.style.background = "var(--conector-painel)"; barra.style.color = "var(--conector-texto)"; barra.style.borderBottom = "1px solid var(--borda-neutra)";
    if (!barra.isConnected) document.body.insertBefore(barra, document.body.firstChild);
    barra.innerHTML = `<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🌐 Portal web · sem computador conectado</span>
      <button id="barra-portal-ir" style="background:var(--verde);color:var(--sobre-acento-conta);border:0;border-radius:8px;padding:3px 10px;font:inherit;cursor:pointer">${MOVEL ? "📱 Conectar ao computador" : "Conectar este computador"}</button>`;
    const botao = barra.querySelector("#barra-portal-ir");
    if (portal.conector) {
      barra.firstElementChild.textContent = "Conector pronto";
      const link = document.createElement("a");
      link.style.cssText = botao.style.cssText;
      link.href = portal.conector;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Abrir plataforma conectada";
      botao.replaceWith(link);
    } else botao.onclick = () => oferecer();
  }

  function entrarPortal() {
    if (portal.ativo) return;
    portal.ativo = true; tela.remove(); telaCel.remove();
    window.__portal = { tecla, boasVindas, oferecer };
    window.pywebview = { api: apiPortal };
    barraPortal();
    if (!MODO_CEL) window.addEventListener("storage", async (ev) => {
      if (ev.key !== CHAVE_NAVEGADOR || portal.conector || ws_.manual || !portal.ativo) return;
      const token = lerPersistente();
      if (!token || ev.newValue !== token) return;
      // A autorização de outra aba também pode chegar enquanto a busca inicial aguarda o próximo recuo.
      // o segredo já foi aceito por outra aba: o Conector existe, então dá tempo para um loopback lento (antivírus/carga)
      const achou = await sondar(token, true, portasSondagem(), 4000);
      if (!achou) return;
      if (portal.ativo && !portal.conector && !ws_.manual && lerPersistente() === token) aceitarConector(achou);
      else achou.sock.close();
    });
    setTimeout(() => {
      if (!portal.ativo) return;
      portal.avisado = true;
      window.dispatchEvent(new Event("pywebviewready"));
    }, 0);
  }
  // nas telas de conexão: voltar ao portal em vez de ficar preso nelas
  const voltar = (onde) => {
    const a = document.createElement("a"); a.href = "#"; a.textContent = "Voltar ao portal (navegar sem conectar)";
    a.style.cssText = "color:var(--cel-suave);display:inline-block;margin-top:14px;font-size:13px";
    a.onclick = (e) => {
      e.preventDefault();
      gravarRem(false);
      cred = ""; gravarSessao("");
      ws_.manual = true;
      if (onde === telaCel.firstElementChild) return location.reload();
      tela.remove();
      entrarPortal();
    };
    onde.appendChild(a);
  };
  voltar(tela.firstElementChild); voltar(telaCel.firstElementChild);

  // Depois de app.js registrar os ouvintes, procura o Conector sem esperar imagens ou fontes.
  const iniciar = () => {
    if (MODO_CEL) {   // celular/tablet: com conexão pedida nesta sessão usa o túnel aprovado; senão abre o portal
      if (codPar) { mostrarCel(true); q("#rc-codigo").value = codPar; return cmsg("Toque em “Parear e conectar” para ligar este celular ao computador."); }
      if ((pedeCel || lerRem()) && lerPar()) { mostrarCel(false); return conectarCel(true); }
      if (pedeCel) return mostrarCel(true);
      return entrarPortal();
    }
    if (SAFARI && !LOCAL) tela.querySelector("#par-local").hidden = false;
    if (!LOCAL && lerPar()) {   // computador com um PC pareado (raro): oferece também operar o outro computador
      const b = document.createElement("button"); b.textContent = "📱 Conectar ao computador pareado";
      b.style.cssText = "background:var(--conector-botao);color:var(--texto);border:1px solid var(--link);border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;margin-top:10px";
      b.onclick = () => { ws_.manual = true; gravarRem(true); mostrarCel(false); conectarCel(); };
      tela.querySelector("#par-msg").after(b);
    }
    acionar(false);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else setTimeout(iniciar, 0);
})();
