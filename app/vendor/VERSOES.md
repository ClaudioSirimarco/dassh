# Bibliotecas de terceiros (cópias locais, sem CDN)

Tudo aqui foi baixado do registro público do npm (`registry.npmjs.org`) em 2026-11-18. Os tarballs foram conferidos contra o
`shasum` (SHA-1) publicado pelo registro. Nada é carregado de `esm.sh` nem de `unpkg` em tempo de execução.

| Arquivo | Origem | Versão | SHA-256 do arquivo aqui |
|---|---|---|---|
| `mqtt.min.js` | pacote `mqtt`, `dist/mqtt.min.js` (idêntico byte a byte ao servido por unpkg) | 5.10.1 | `b088a7f9045df4e478dbc378f41125066e43d9c602755ee4c5cda0f3e9380ba0` |
| `noble/curves/**` | pacote `@noble/curves`, pasta `esm/` (só os módulos necessários ao `ed25519`/`x25519`) | 1.6.0 | ver lista abaixo |
| `noble/hashes/**` | pacote `@noble/hashes`, pasta `esm/` (`scrypt`, `hkdf`, `sha256` e dependências) | 1.5.0 | ver lista abaixo |
| `noble/index.js` | arquivo nosso: 4 linhas que reexportam `x25519`, `scryptAsync`, `hkdf`, `sha256` | — | `3d431c4aab09a1749bfdb0f8dd1af00c039fd7ba44662fc9ab661306438fed24` |

Tarballs de origem (SHA-1 do registro):
- `@noble/curves@1.6.0` — `be5296ebcd5a1730fccea4786d420f87abfeb40b` (integrity `sha512-TlaHRXDehJuRNR9TfZDNQ45mMEd5dwUwmicsafcIX4SsNiqnCHKjE/1alYPd/lDRVhxdhUAlv8uEhMCI5zjIJQ==`)
- `@noble/hashes@1.5.0` — `abadc5ca20332db2b1b2aa3e496e9af1213570b0` (integrity `sha512-1j6kQFb7QRru7eKN3ZDvRcP13rugwdxZqCjbiAVZfIJwgj2A65UmT4TgARXGlXgnRkORLTDTrO19ZErt7+QXgA==`)
- `mqtt@5.10.1` — `d4f45ffdd825bad331c18f08796a744dabbe16de` (integrity `sha512-hXCOki8sANoQ7w+2OzJzg6qMBxTtrH9RlnVNV8panLZgnl+Gh0J/t4k6r8Az8+C7y3KAcyXtn0mmLixyUom8Sw==`)

Como os módulos noble foram preparados: os arquivos `esm/` do pacote foram copiados sem alteração de código; só os especificadores
de import (`@noble/hashes/sha256` etc.) foram trocados por caminhos relativos (`../hashes/sha256.js`) e os comentários
`sourceMappingURL` removidos. Licença MIT (cópias em `noble/LICENSE-*.txt`; `mqtt` também é MIT).

## SHA-256 dos módulos noble

```
74948944323ecee2fe3d5b5269cc5f03336fc3dc3db20ffd01ab905ee3293acf  noble/curves/abstract/curve.js
9649cf64458bba6d7661f959e938dfcad8db9a09baff7ac1c71b85711744376c  noble/curves/abstract/edwards.js
e4f3ba4fdbaf3f9d73cc023461986990fac3800a2b43a97f34ef36bd6871802a  noble/curves/abstract/hash-to-curve.js
5130e15fae088e990b3b9335c092193d1f773dc5561eb90a78912a6523473471  noble/curves/abstract/modular.js
ce04f2de163edabc0d67ca1afde4e9363199b9202ff3e09e8b250197e7167577  noble/curves/abstract/montgomery.js
0bb6c187b9e16d4dfe399809cf8f0f2aa296acb221a3ed9ee323b01d09fed9f3  noble/curves/abstract/utils.js
d07004d1d692f95684a8fe619e4d16ecd3b58308ad50844f88c76a24664d6a46  noble/curves/ed25519.js
23ddd80410a8bfec88d9962e41d5d8160f7e250313050203e224006ffdc355d8  noble/hashes/_assert.js
e1d62c6147be0a445132248f358263086161aa5d498bf841df516eddd46731f8  noble/hashes/_md.js
45235902ea7c2b4d8e3531cc73f3c09c887bac8472ab2d36b1a0415f18431e91  noble/hashes/_u64.js
87bea3ec8d754506a254c1bd8a311d68e97893ab856a435556b6508025aabdd7  noble/hashes/crypto.js
3077fca4afec8ef2a4e0fd67043e95966dfa4362e67237d6238180ed5a15b061  noble/hashes/hkdf.js
5475bc8c4db2484ecebf094e3e3cf8360ed9d11a3e16ebc03f14b77f03feb89a  noble/hashes/hmac.js
02b9f132c0f832b4840618fbe1462dd2569a832f1b5d50874d6c6cfd81044077  noble/hashes/pbkdf2.js
a1a7f00701a3cd8c6cc1a5b1db7001ce6aa884f98f9d5fa605ac4bf96d29a526  noble/hashes/scrypt.js
bf3c50e36c3b5ad2e943380b1cdcb3a46ecf8abc30818750de2f2dbaa49da4d3  noble/hashes/sha2.js
26728d868e23b2bd60a457c89176dcabc50fc7d2bf7d84f6a1cbf39b28a37a82  noble/hashes/sha256.js
697dde6f8480dfae8c9453d0f744cc8031f9b5582dcdbdbbfaa2d910c7a7b2f4  noble/hashes/sha512.js
69c01d3009a26845c709f1e12a5afb0168ce4c813d9ff00235a54aef8c2567f9  noble/hashes/utils.js
```

## SRI (sha384) para as tags `<script>`

- `app/vendor/mqtt.min.js` — `sha384-u4uqeACkFcoKl57rBQJHVGDd1pqhW4w8X3WjTu1ZksPdxoLqdt34jpoNkJisE25W`
- `app/ponte-web.js` — o hash muda a cada edição do arquivo; recalcule com
  `openssl dgst -sha384 -binary app/ponte-web.js | openssl base64 -A` antes de publicar (valor na entrega: ver relatório).

Para atualizar uma biblioteca: baixe o tarball da nova versão, confira o `shasum`/`integrity`, refaça a cópia, atualize esta tabela
e rode o teste de interoperabilidade com o `compartilhar.py` (derivação de chave e AES-GCM devem continuar idênticos).

Os arquivos `xterm.js`, `xterm.css` e `addon-serialize.js` desta pasta são anteriores a este registro (origem/versão a documentar pelo coordenador).
