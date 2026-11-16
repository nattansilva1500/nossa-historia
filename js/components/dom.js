/**
 * Helpers de DOM compartilhados pelos componentes do scrapbook.
 * Todo texto vindo de dados entra via textContent (nunca innerHTML).
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TONES = ['sage', 'rose', 'butter', 'blush', 'lavender'];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /** Cria um <svg><use href="#id"></svg> a partir do sprite do index.html. */
  function icon(id, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (className) svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const symbol = document.getElementById(id);
    if (symbol && symbol.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
    }
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /** Retorna `value` se estiver na lista permitida; caso contrário, `fallback`. */
  function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  /**
   * Aceita link de compartilhamento do Google Drive, só o ID do arquivo,
   * ou qualquer outra URL comum.
   *   https://drive.google.com/file/d/<ID>/view?usp=sharing
   *   https://drive.google.com/open?id=<ID>
   *   <ID>
   */
  const DRIVE_LINK = /(?:\/d\/|[?&]id=)([\w-]{20,})/;
  const DRIVE_ID = /^[\w-]{25,}$/;

  function driveId(src) {
    const value = String(src || '').trim();
    if (DRIVE_ID.test(value)) return value;
    if (!/(^|\.)google(usercontent)?\.com\//.test(value)) return null;
    const match = value.match(DRIVE_LINK);
    return match ? match[1] : null;
  }

  /** Lista de URLs a tentar, em ordem. Fotos do Drive têm um endereço reserva. */
  function imageSources(src, width) {
    const id = driveId(src);
    if (!id) return src ? [String(src)] : [];
    return [
      `https://lh3.googleusercontent.com/d/${id}=w${width}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    ];
  }

  /** Moldura de foto com lazy-loading, endereço reserva e fallback visual. */
  function photo(src, alt, wrapperClass, width = 1200) {
    const wrap = el('div', wrapperClass);
    const img = el('img');
    const sources = imageSources(src, width);
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      const next = sources.shift();
      if (next) img.src = next;
      else wrap.classList.add('is-broken');
    });
    const first = sources.shift();
    if (first) img.src = first;
    else wrap.classList.add('is-broken');
    wrap.appendChild(img);
    return wrap;
  }

  window.Scrapbook = Object.assign(window.Scrapbook || {}, { el, icon, oneOf, photo, TONES });
})();
