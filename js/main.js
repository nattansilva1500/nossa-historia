/**
 * Tela da chave de acesso + montagem da página (colagem, Páginas Recentes e busca).
 *
 * A chave nunca é salva: fica só na memória até a página ser recarregada.
 */
(function () {
  'use strict';

  const S = window.Scrapbook;

  /* ==========================================================
     Tela da chave
     ========================================================== */
  const gate = document.getElementById('gate');
  const gateForm = document.getElementById('gate-form');
  const gateInput = document.getElementById('gate-key');
  const gateError = document.getElementById('gate-error');
  const gateButton = gateForm.querySelector('button[type="submit"]');
  const page = document.getElementById('page');

  const WRONG_KEY_DELAY = 1200;

  function showError(message) {
    gateError.textContent = message;
    gate.classList.remove('is-wrong');
    void gate.offsetWidth; // reinicia a animação
    gate.classList.add('is-wrong');
  }

  function setBusy(busy) {
    gateButton.disabled = busy;
    gateInput.disabled = busy;
    gateButton.textContent = busy ? 'abrindo…' : 'abrir o álbum';
  }

  gateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = gateInput.value;
    if (!key.trim()) {
      showError('digite a nossa chave ♡');
      gateInput.focus();
      return;
    }

    setBusy(true);
    gateError.textContent = '';

    let data;
    try {
      data = await S.Vault.open(window.SCRAPBOOK_VAULT, key);
    } catch (error) {
      const wrong = error.message === 'wrong-key';
      // Pequena espera após erro para dificultar tentativas em sequência
      await new Promise((resolve) => setTimeout(resolve, wrong ? WRONG_KEY_DELAY : 0));
      setBusy(false);
      showError(wrong ? 'hmm… essa não é a nossa chave' : 'não consegui abrir o álbum (arquivo de dados ausente)');
      gateInput.select();
      return;
    }

    gateInput.value = '';
    page.hidden = false;
    mount(data);
    gate.classList.add('is-leaving');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    setTimeout(() => gate.remove(), 800); // garantia caso a transição não dispare
  });

  gateInput.focus();

  /* ==========================================================
     Página
     ========================================================== */
  function mount({ memories = [], albums = [], timeline: moments }) {
    /* ---------- Colagem ---------- */
    const collage = document.getElementById('collage');
    const emptyMessage = document.getElementById('collage-empty');

    const cards = document.createDocumentFragment();
    memories.forEach((memory, i) => cards.appendChild(S.MemoryCard.create(memory, i)));
    collage.replaceChildren(cards);

    /* ---------- Páginas Recentes ---------- */
    const track = document.getElementById('recent-track');
    const scrollButtons = document.querySelectorAll('[data-scroll]');

    const items = document.createDocumentFragment();
    albums.forEach((album) => {
      const li = document.createElement('li');
      li.appendChild(S.AlbumCard.create(album));
      items.appendChild(li);
    });
    track.replaceChildren(items);

    /* ---------- Visualizador de fotos ---------- */

    function albumTitle(album) {
      return [album.heading, album.date].filter(Boolean).join(' · ');
    }

    // Colagem: abre a foto clicada e permite navegar pelas memórias visíveis (respeita a busca)
    collage.addEventListener('click', (event) => {
      const zoom = event.target.closest('.polaroid__zoom');
      if (!zoom) return;
      const visible = [...collage.querySelectorAll('memory-card:not([hidden])')];
      const card = zoom.closest('memory-card');
      S.Viewer.open(visible.map((c) => c.photoItem), visible.indexOf(card));
    });

    // Páginas Recentes: abre todas as fotos do álbum
    track.addEventListener('click', (event) => {
      const card = event.target.closest('album-card');
      if (card) S.Viewer.open(card.photos, 0, card.viewerTitle);
    });

    /* ---------- Linha do Tempo ---------- */

    // Usa a lista própria "timeline". Sem ela, cai nos álbuns (comportamento antigo).
    const timeline = document.getElementById('timeline');
    const timelineList = document.getElementById('timeline-list');
    const timelineNavItem = document.querySelector('.nav a[href="#timeline"]')?.closest('li');
    const steps = document.createDocumentFragment();

    const entries = Array.isArray(moments)
      ? moments
      : albums.map((album) => ({ album: album.heading }));

    entries.forEach((entry) => {
      const album = entry.album ? albums.find((a) => a.heading === entry.album) : null;
      const photos = Array.isArray(entry.photos)
        ? entry.photos
        : album && Array.isArray(album.photos) ? album.photos : [];
      const heading = entry.title || (album && album.heading) || 'sem título';
      const date = entry.date || (album && album.date) || '';
      const tone = entry.tape || (album && album.tape);
      const viewerTitle = albumTitle({ heading, date });
      const cover = entry.cover || (photos[0] && photos[0].src);

      const li = S.el('li', 'timeline__item');
      li.style.setProperty('--tone', `var(--${S.oneOf(tone, S.TONES, 'rose')})`);

      // Com fotos, o cartão abre o visualizador. Sem fotos, é só um bilhete.
      const card = photos.length ? S.el('button', 'timeline__card') : S.el('div', 'timeline__card timeline__card--static');
      if (photos.length) {
        card.type = 'button';
        card.setAttribute('aria-label', 'abrir fotos: ' + viewerTitle);
        card.addEventListener('click', () => S.Viewer.open(photos, 0, viewerTitle));
      }
      if (cover) card.appendChild(S.photo(cover, '', 'timeline__photo', 400));

      const text = S.el('span', 'timeline__text');
      if (date) text.appendChild(S.el('span', 'timeline__date', date));
      const title = S.el('span', 'timeline__heading', heading);
      if (entry.emoji) {
        const doodle = S.el('span', 'timeline__emoji', entry.emoji);
        doodle.setAttribute('aria-hidden', 'true');
        title.appendChild(doodle);
      }
      text.appendChild(title);
      if (entry.text) text.appendChild(S.el('span', 'timeline__note', entry.text));
      if (photos.length) {
        text.appendChild(S.el('span', 'timeline__count', photos.length === 1 ? '1 foto' : `${photos.length} fotos`));
      }
      card.appendChild(text);

      li.appendChild(card);
      steps.appendChild(li);
    });

    timelineList.replaceChildren(steps);
    timeline.hidden = entries.length === 0;
    if (timelineNavItem) timelineNavItem.hidden = entries.length === 0;

    function updateScrollButtons() {
      const max = track.scrollWidth - track.clientWidth - 2;
      scrollButtons.forEach((btn) => {
        const dir = Number(btn.dataset.scroll);
        btn.disabled = dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
      });
    }

    scrollButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        track.scrollBy({ left: Number(btn.dataset.scroll) * track.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    updateScrollButtons();

    /* ---------- Busca ---------- */
    const search = document.getElementById('search');
    const searchInput = document.getElementById('search-input');
    const searchToggle = document.getElementById('search-toggle');

    function filterMemories(term) {
      const query = term.trim().toLowerCase();
      let visible = 0;
      collage.querySelectorAll('memory-card').forEach((card) => {
        const match = !query || card.caption.toLowerCase().includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      });
      emptyMessage.hidden = visible > 0;
    }

    function setSearchOpen(open) {
      search.classList.toggle('is-open', open);
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        filterMemories('');
      }
    }

    searchToggle.addEventListener('click', () => {
      const open = !search.classList.contains('is-open');
      setSearchOpen(open);
      if (open) document.getElementById('memories').scrollIntoView({ block: 'start' });
    });
    searchInput.addEventListener('input', () => filterMemories(searchInput.value));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        searchToggle.focus();
      }
    });
  }
})();
