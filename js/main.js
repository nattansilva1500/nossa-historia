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
  function mount({ memories = [], albums = [] }) {
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
