/**
 * <memory-card> — cartão Polaroid reutilizável.
 *
 * Atributos:
 *   src            URL da foto
 *   alt            texto alternativo (padrão: caption)
 *   caption        legenda manuscrita
 *   emoji          doodle opcional ao lado da legenda
 *   rotate         rotação em graus (ex.: -2, 3). Limitada a ±8
 *   tape           cor da fita: sage | rose | butter | blush | lavender
 *   tape-position  top | top-left | top-right | bottom-left | bottom-right
 *   clip           (booleano) adiciona um clipe de papel
 *   backing        notebook | note — papel atrás da foto
 *   backing-tone   cor do bilhete quando backing="note"
 *   note           anotação manuscrita acima do cartão (ex.: "love notes")
 *
 * Uso declarativo:
 *   <memory-card src="foto.jpg" caption="the beginning" emoji="✨" rotate="-2" tape="sage"></memory-card>
 * Uso via JS:
 *   Scrapbook.MemoryCard.create({ src, caption, rotate: 3, tape: 'rose', clip: true })
 */
(function () {
  'use strict';

  const S = window.Scrapbook;
  const TAPE_POSITIONS = ['top', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

  // Mapeia chaves camelCase dos dados para atributos.
  const ATTR_MAP = {
    src: 'src',
    alt: 'alt',
    caption: 'caption',
    emoji: 'emoji',
    rotate: 'rotate',
    tape: 'tape',
    tapePosition: 'tape-position',
    backing: 'backing',
    backingTone: 'backing-tone',
    note: 'note',
  };

  class MemoryCard extends HTMLElement {
    static get observedAttributes() {
      return [...Object.values(ATTR_MAP), 'clip'];
    }

    static create(data = {}, index = 0) {
      const card = document.createElement('memory-card');
      Object.entries(ATTR_MAP).forEach(([key, attr]) => {
        if (data[key] != null && data[key] !== '') card.setAttribute(attr, String(data[key]));
      });
      if (data.clip) card.setAttribute('clip', '');
      card.style.setProperty('--i', String(index));
      return card;
    }

    get caption() {
      return this.getAttribute('caption') || '';
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback() {
      if (this._rendered) this._render();
    }

    _render() {
      const caption = this.caption;
      const emoji = this.getAttribute('emoji') || '';
      const rotate = Number.parseFloat(this.getAttribute('rotate'));
      const rot = Number.isFinite(rotate) ? Math.max(-8, Math.min(8, rotate)) : 0;
      this.style.setProperty('--rot', rot + 'deg');

      const parts = [];

      // Papel de fundo (caderno ou bilhete)
      const backing = this.getAttribute('backing');
      if (backing === 'notebook') {
        parts.push(S.el('span', 'backing backing--notebook'));
      } else if (backing === 'note') {
        const note = S.el('span', 'backing backing--note');
        const tone = S.oneOf(this.getAttribute('backing-tone'), S.TONES, 'butter');
        note.style.setProperty('--note-color', `var(--${tone})`);
        parts.push(note);
      }

      // Anotação manuscrita
      const noteText = this.getAttribute('note');
      if (noteText) {
        const annotation = S.el('span', 'annotation', noteText);
        annotation.setAttribute('aria-hidden', 'true');
        annotation.appendChild(S.icon('i-arrow-down'));
        parts.push(annotation);
      }

      // Polaroid
      const figure = S.el('figure', 'polaroid');

      const tone = S.oneOf(this.getAttribute('tape'), S.TONES, 'sage');
      const position = S.oneOf(this.getAttribute('tape-position'), TAPE_POSITIONS, 'top');
      const tape = S.el('span', `tape tape--${tone} tape--${position}`);
      tape.setAttribute('aria-hidden', 'true');
      figure.appendChild(tape);

      if (this.hasAttribute('clip')) figure.appendChild(S.icon('i-clip', 'clip'));

      figure.appendChild(
        S.photo(this.getAttribute('src'), this.getAttribute('alt') || caption, 'polaroid__photo')
      );

      const figcaption = S.el('figcaption', 'polaroid__caption', caption);
      if (emoji) {
        const doodle = S.el('span', 'polaroid__emoji', emoji);
        doodle.setAttribute('aria-hidden', 'true');
        figcaption.append(' ', doodle);
      }
      figure.appendChild(figcaption);
      parts.push(figure);

      this.replaceChildren(...parts);
      this._rendered = true;
    }
  }

  customElements.define('memory-card', MemoryCard);
  S.MemoryCard = MemoryCard;
})();
