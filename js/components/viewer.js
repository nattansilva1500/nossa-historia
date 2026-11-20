/**
 * Visualizador de fotos em tela cheia (popup), usado pela colagem,
 * pelos álbuns e pela linha do tempo.
 *
 * Uso:
 *   Scrapbook.Viewer.open(
 *     [{ src, alt, caption }, ...],   // fotos
 *     0,                              // índice inicial
 *     'o começo · mar 2023'           // título opcional (ex.: nome do álbum)
 *   )
 *
 * Teclado: ← → navegam, Esc fecha. No celular, arrastar para os lados navega.
 */
(function () {
  'use strict';
  const S = window.Scrapbook;
  const FULL_WIDTH = 1600;
  const SWIPE_MIN = 50;

  let dialog, frame, photoSlot, caption, meta, title, counter, prevBtn, nextBtn;
  let items = [];
  let index = 0;

  function button(className, label, iconId) {
    const btn = S.el('button', className);
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.appendChild(S.icon(iconId));
    return btn;
  }

  function build() {
    dialog = S.el('dialog', 'viewer');
    dialog.setAttribute('aria-label', 'foto ampliada');

    frame = S.el('figure', 'viewer__frame');
    const tape = S.el('span', 'tape tape--rose tape--top');
    tape.setAttribute('aria-hidden', 'true');
    photoSlot = S.el('div', 'viewer__slot');
    caption = S.el('figcaption', 'viewer__caption');
    meta = S.el('div', 'viewer__meta');
    title = S.el('span', 'viewer__title');
    counter = S.el('span', 'viewer__counter');
    counter.setAttribute('aria-live', 'polite');
    meta.append(title, counter);
    frame.append(tape, photoSlot, caption, meta);

    const closeBtn = button('round-btn viewer__close', 'fechar', 'i-close');
    prevBtn = button('round-btn viewer__nav viewer__nav--prev', 'foto anterior', 'i-chevron-left');
    nextBtn = button('round-btn viewer__nav viewer__nav--next', 'próxima foto', 'i-chevron-right');

    closeBtn.addEventListener('click', () => dialog.close());
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));

    // Clique fora da foto (no fundo escuro) fecha
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    });
    dialog.addEventListener('close', () => photoSlot.replaceChildren());

    // Arrastar para os lados (toque)
    let startX = null;
    frame.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') startX = event.clientX;
    });
    frame.addEventListener('pointerup', (event) => {
      if (startX == null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) >= SWIPE_MIN) go(dx < 0 ? 1 : -1);
    });

    dialog.append(closeBtn, prevBtn, frame, nextBtn);
    document.body.appendChild(dialog);
  }

  function render() {
    const item = items[index] || {};
    const photo = S.photo(item.src, item.alt || item.caption, 'viewer__photo is-loading', FULL_WIDTH);
    const img = photo.querySelector('img');
    img.loading = 'eager';
    img.addEventListener('load', () => photo.classList.remove('is-loading'));
    photoSlot.replaceChildren(photo);

    caption.textContent = item.caption || '';
    caption.hidden = !item.caption;

    const many = items.length > 1;
    counter.textContent = many ? `${index + 1} / ${items.length}` : '';
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === items.length - 1;
  }

  function go(step) {
    const next = index + step;
    if (next < 0 || next >= items.length) return;
    index = next;
    render();
  }

  function open(list, start = 0, heading = '') {
    items = (Array.isArray(list) ? list : []).filter((item) => item && item.src);
    if (!items.length) return;
    if (!dialog) build();
    index = Math.max(0, Math.min(items.length - 1, start));
    title.textContent = heading || '';
    meta.hidden = !heading && items.length < 2;
    render();
    if (!dialog.open) dialog.showModal();
  }

  S.Viewer = { open };
})();
