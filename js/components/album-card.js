/**
 * <album-card> — mini-card de álbum para a linha "Recent Pages".
 *
 * Atributos:
 *   heading   título do álbum
 *   date      data curta (ex.: "mar 2024")
 *   tape      cor da fita: sage | rose | butter | blush | lavender
 *   photos    JSON com as fotos: [{"src": "...", "caption": "..."}]
 *             O cartão mostra as 3 primeiras; ao clicar, todas abrem no visualizador.
 *
 * Também aceita a propriedade `photos` (array) via JS:
 *   Scrapbook.AlbumCard.create({ heading, date, tape, photos: [...] })
 */
(function () {
  'use strict';

  const S = window.Scrapbook;
  const PREVIEW_PHOTOS = 3;

  class AlbumCard extends HTMLElement {
    static get observedAttributes() {
      return ['heading', 'date', 'tape', 'photos'];
    }

    static create(data = {}) {
      const card = document.createElement('album-card');
      ['heading', 'date', 'tape'].forEach((key) => {
        if (data[key]) card.setAttribute(key, String(data[key]));
      });
      card.photos = data.photos || [];
      return card;
    }

    get photos() {
      if (this._photos) return this._photos;
      try {
        const parsed = JSON.parse(this.getAttribute('photos') || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    set photos(value) {
      this._photos = Array.isArray(value) ? value : [];
      if (this._rendered) this._render();
    }

    /** Título usado no visualizador (ex.: "o começo · mar 2023"). */
    get viewerTitle() {
      const heading = this.getAttribute('heading') || '';
      const date = this.getAttribute('date') || '';
      return [heading, date].filter(Boolean).join(' · ');
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback() {
      if (this._rendered) this._render();
    }

    _render() {
      const heading = this.getAttribute('heading') || 'página sem título';
      const date = this.getAttribute('date') || '';

      // Botão: o clique é tratado em main.js e abre o visualizador
      const link = S.el('button', 'album');
      link.type = 'button';
      link.setAttribute('aria-label', 'abrir álbum: ' + (date ? `${heading}, ${date}` : heading));

      const sheet = S.el('div', 'album__sheet');
      const tone = S.oneOf(this.getAttribute('tape'), S.TONES, 'rose');
      const tape = S.el('span', `tape tape--sm tape--${tone}`);
      tape.setAttribute('aria-hidden', 'true');
      sheet.appendChild(tape);

      this.photos.slice(0, PREVIEW_PHOTOS).forEach((item, i) => {
        const fig = S.el('figure', `mini-polaroid mini-polaroid--${i + 1}`);
        fig.appendChild(S.photo(item && item.src, '', 'mini-polaroid__photo', 400));
        if (item && item.caption) fig.appendChild(S.el('figcaption', '', item.caption));
        sheet.appendChild(fig);
      });

      const meta = S.el('span', 'album__meta');
      meta.setAttribute('aria-hidden', 'true');
      meta.append(S.el('span', 'album__title', heading));
      if (date) meta.append(S.el('span', 'album__date', date));

      link.append(sheet, meta);
      this.replaceChildren(link);
      this._rendered = true;
    }
  }

  customElements.define('album-card', AlbumCard);
  S.AlbumCard = AlbumCard;
})();
