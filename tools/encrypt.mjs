#!/usr/bin/env node
/**
 * Criptografa private/memories.json -> js/data.enc.js
 *
 * Uso (na raiz do projeto):
 *   node tools/encrypt.mjs                  -> pede a chave duas vezes
 *   node tools/encrypt.mjs outro-arquivo.json
 *
 * A chave não é salva em lugar nenhum. Use a MESMA chave que vocês digitam no site.
 * Trocar a chave = rodar de novo com a nova chave e fazer commit do js/data.enc.js.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'private', 'memories.json');
const OUTPUT = path.join(ROOT, 'js', 'data.enc.js');

// Precisam ser compatíveis com js/vault.js
const ITERATIONS = 600_000;
const MIN_KEY_LENGTH = 12;
const normalizeKey = (key) => String(key).trim().normalize('NFC');

const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function validate(data) {
  if (!data || !Array.isArray(data.memories)) fail('O JSON precisa ter uma lista "memories".');
  data.memories.forEach((m, i) => {
    if (!m || typeof m.src !== 'string' || !m.src.trim()) fail(`memories[${i}] está sem "src".`);
    if (typeof m.caption !== 'string') fail(`memories[${i}] está sem "caption".`);
  });
  if (data.albums != null && !Array.isArray(data.albums)) fail('"albums" precisa ser uma lista.');
  (data.albums || []).forEach((a, i) => {
    if (a.photos != null && !Array.isArray(a.photos)) fail(`albums[${i}].photos precisa ser uma lista.`);
  });
  const albums = data.albums || [];
  if (data.timeline != null && !Array.isArray(data.timeline)) fail('"timeline" precisa ser uma lista.');
  (data.timeline || []).forEach((t, i) => {
    if (!t || typeof t !== 'object') fail(`timeline[${i}] precisa ser um objeto.`);
    if (!t.title && !t.album) fail(`timeline[${i}] precisa de "title" ou "album".`);
    if (t.photos != null && !Array.isArray(t.photos)) fail(`timeline[${i}].photos precisa ser uma lista.`);
    if (t.album && !albums.some((a) => a.heading === t.album)) {
      fail(`timeline[${i}].album "${t.album}" não corresponde ao "heading" de nenhum álbum.`);
    }
  });

  const result = { memories: data.memories, albums };
  if (Array.isArray(data.timeline)) result.timeline = data.timeline;
  return result;
}

async function deriveKey(key, salt, usage) {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  );
}

async function main() {
  let raw;
  try {
    raw = await readFile(INPUT, 'utf8');
  } catch {
    fail(`Não encontrei ${path.relative(ROOT, INPUT)}. Copie private/memories.example.json para private/memories.json.`);
  }

  let data;
  try {
    data = validate(JSON.parse(raw.replace(/^\uFEFF/, '')));
  } catch (error) {
    fail(`JSON inválido em ${path.relative(ROOT, INPUT)}: ${error.message}`);
  }

  let key = process.env.SCRAPBOOK_KEY;
  if (!key) {
    key = await askHidden('Chave de acesso: ');
    const confirm = await askHidden('Repita a chave: ');
    if (key !== confirm) fail('As chaves não são iguais.');
  }
  key = normalizeKey(key);
  if (key.length < MIN_KEY_LENGTH) {
    fail(`Use uma chave com pelo menos ${MIN_KEY_LENGTH} caracteres (ex.: uma frase só de vocês).`);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(key, salt, 'encrypt'), payload);

  // Confere se dá para abrir de volta antes de salvar
  const check = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await deriveKey(key, salt, 'decrypt'), encrypted);
  if (new TextDecoder().decode(check) !== JSON.stringify(data)) fail('Falha na verificação da criptografia.');

  const vault = {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };

  const file =
    `/* Gerado por tools/encrypt.mjs em ${new Date().toISOString()}.\n` +
    `   Conteúdo criptografado: não edite à mão. Fonte: private/memories.json (fora do git). */\n` +
    `window.SCRAPBOOK_VAULT = ${JSON.stringify(vault)};\n`;

  await writeFile(OUTPUT, file, 'utf8');
  console.log(
    `\n✓ ${data.memories.length} memórias, ${data.albums.length} álbuns e ` +
      `${data.timeline ? data.timeline.length + ' momentos na linha do tempo' : 'linha do tempo a partir dos álbuns'} ` +
      `criptografados em ${path.relative(ROOT, OUTPUT)}\n`
  );
}

main();
