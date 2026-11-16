# Nossa História

Álbum digital protegido por uma chave de acesso, pedida a cada visita.

## Como funciona a proteção

- Os links das fotos e as legendas ficam em `private/memories.json`, que **não vai para o git** (está no `.gitignore`).
- `tools/encrypt.mjs` criptografa esse arquivo com a chave e gera `js/data.enc.js` (AES-GCM + PBKDF2 com 600 mil iterações).
- O site publicado só tem o arquivo criptografado. Sem a chave, ninguém consegue ler os links do Drive.
- A chave não é salva no navegador. Ao recarregar a página, ela é pedida de novo.

## Adicionar ou trocar fotos

1. No Google Drive, compartilhe a foto (ou a pasta inteira) como **"Qualquer pessoa com o link" → Leitor**.
2. Copie o link de compartilhamento e coloque no `src` da memória em `private/memories.json`.
   Funciona o link inteiro (`https://drive.google.com/file/d/<ID>/view?usp=sharing`) ou só o ID.
3. Na raiz do projeto, rode `node tools/encrypt.mjs` e digite a chave de vocês duas vezes.
4. Faça commit e push do `js/data.enc.js`.

Na primeira vez, copie `private/memories.example.json` para `private/memories.json` e edite.

## Campos de cada memória

- `src`, `caption` (obrigatórios), `alt`, `emoji`
- `rotate`: inclinação em graus, de -8 a 8
- `tape`: `sage`, `rose`, `butter`, `blush` ou `lavender`
- `tapePosition`: `top`, `top-left`, `top-right`, `bottom-left` ou `bottom-right`
- `clip`: `true` para colocar um clipe
- `backing`: `notebook` ou `note` (com `backingTone` para a cor do bilhete)
- `note`: anotação manuscrita acima da foto

Os álbuns (`albums`) têm `heading`, `date`, `tape` e até 3 `photos` com `src` e `caption`.

## Trocar a chave

Rode `node tools/encrypt.mjs` com a chave nova e faça commit do `js/data.enc.js`. A chave antiga para de funcionar.
