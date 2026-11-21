/**
 * Tela da chave de acesso + montagem da página (contador, álbuns, linha do tempo e busca).
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
  function mount({ since, albums = [], timeline: moments, ending }) {
    /* ---------- Contador de tempo juntos ---------- */
    startCounter(since);
    fillTimelineEnd(ending, since);

    /* ---------- Nossos Álbuns ---------- */
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

    // Álbuns: abre todas as fotos do álbum
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

    const searchEmpty = document.getElementById('search-empty');
    const normalize = (value) =>
      String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Filtra os álbuns (título, data e legendas) e os momentos da linha do tempo (texto visível)
    function filterMemories(term) {
      const query = normalize(term.trim());
      let visible = 0;

      track.querySelectorAll('li').forEach((li) => {
        const card = li.querySelector('album-card');
        const text = [card.getAttribute('heading'), card.getAttribute('date'), ...card.photos.map((p) => p && p.caption)];
        const match = !query || normalize(text.join(' ')).includes(query);
        li.hidden = !match;
        if (match) visible += 1;
      });

      timelineList.querySelectorAll('.timeline__item').forEach((item) => {
        const match = !query || normalize(item.textContent).includes(query);
        item.hidden = !match;
        if (match) visible += 1;
      });

      searchEmpty.hidden = visible > 0;
      updateScrollButtons();
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
      if (open) document.getElementById('scrapbook').scrollIntoView({ block: 'start' });
    });
    searchInput.addEventListener('input', () => filterMemories(searchInput.value));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        searchToggle.focus();
      }
    });
  }

  /* ==========================================================
     Contador
     ========================================================== */

  /**
   * Card final da linha do tempo. Textos padrão ficam no index.html;
   * "ending" (date, title, text) no memories.json substitui qualquer um deles.
   * Sem "ending.date", usa a data de início do contador ("since").
   */
  function fillTimelineEnd(ending = {}, since) {
    const dateEl = document.getElementById('timeline-end-date');
    const date = parseLocalDate(ending.date || since);
    if (date) {
      const text = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
      dateEl.textContent = 'desde ' + text; // o CSS coloca em caixa alta
      dateEl.hidden = false;
    }
    if (ending.title) document.getElementById('timeline-end-title').textContent = ending.title;
    if (ending.text) document.getElementById('timeline-end-text').textContent = ending.text;
  }

  /** Aceita "2026-08-14" ou "2026-08-14T19:30" e interpreta no horário local. */
  function parseLocalDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(value || '').trim());
    if (!m) return null;
    const [, y, mo, d, h = '0', mi = '0'] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
    return Number.isNaN(date.getTime()) || date.getMonth() !== Number(mo) - 1 ? null : date;
  }

  function startCounter(since) {
    const counter = document.getElementById('counter');
    const start = parseLocalDate(since);
    if (!start) {
      counter.hidden = true;
      return;
    }

    const $ = (id) => document.getElementById(id);
    const units = [
      { value: $('counter-days'), name: $('counter-days-name'), one: 'dia', many: 'dias' },
      { value: $('counter-hours'), name: $('counter-hours-name'), one: 'hora', many: 'horas' },
      { value: $('counter-minutes'), name: $('counter-minutes-name'), one: 'minuto', many: 'minutos' },
    ];

    const sinceEl = $('counter-since');
    sinceEl.dateTime = since;
    sinceEl.textContent = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(start);

    function render() {
      const diff = Date.now() - start.getTime();
      const future = diff < 0;
      const totalMinutes = Math.floor(Math.abs(diff) / 60000);
      const parts = [Math.floor(totalMinutes / 1440), Math.floor((totalMinutes % 1440) / 60), totalMinutes % 60];

      $('counter-label').textContent = future ? 'faltam' : 'juntos há';
      $('counter-since-prefix').textContent = future ? 'para' : 'desde';
      parts.forEach((n, i) => {
        const text = n.toLocaleString('pt-BR');
        if (units[i].value.textContent !== text) units[i].value.textContent = text;
        units[i].name.textContent = n === 1 ? units[i].one : units[i].many;
      });
    }

    render();
    counter.hidden = false;
    // Atualiza na virada de cada minuto
    setTimeout(() => {
      render();
      setInterval(render, 60000);
    }, 60000 - (Date.now() % 60000) + 50);
    // Ao voltar para a aba (celular suspende timers), corrige na hora
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });
  }
})();
