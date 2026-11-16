/**
 * Abre o cofre criptografado (js/data.enc.js) com a chave de acesso.
 *
 * Formato gerado por tools/encrypt.mjs:
 *   PBKDF2-SHA256 (chave -> chave AES de 256 bits) + AES-GCM.
 * Sem a chave correta, o conteúdo (links do Drive, legendas) não pode ser lido.
 * Os parâmetros precisam ser idênticos aos de tools/encrypt.mjs.
 */
(function () {
  'use strict';

  const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

  /** A mesma normalização é aplicada em tools/encrypt.mjs. */
  const normalizeKey = (key) => String(key).trim().normalize('NFC');

  async function open(vault, key) {
    if (!vault || vault.v !== 1 || !vault.data) throw new Error('vault-missing');
    if (!window.crypto || !window.crypto.subtle) throw new Error('crypto-unavailable');

    const subtle = window.crypto.subtle;
    const baseKey = await subtle.importKey(
      'raw',
      new TextEncoder().encode(normalizeKey(key)),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const aesKey = await subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(vault.salt), iterations: vault.iterations },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    let plain;
    try {
      plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(vault.iv) }, aesKey, fromBase64(vault.data));
    } catch {
      throw new Error('wrong-key');
    }
    return JSON.parse(new TextDecoder().decode(plain));
  }

  window.Scrapbook = Object.assign(window.Scrapbook || {}, { Vault: { open } });
})();
