// === SCREEN MANAGER ===
// Gerencia transição entre telas do jogo

const Screen = (() => {
  let current = null;

  function show(id, instantOrDuration = false) {
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });

    const next = document.getElementById(id);
    console.log(`[Screen] Solicitando transição para: ${id}`);
    if (!next) { console.warn('Screen not found:', id); return; }

    if (instantOrDuration === true) {
      next.classList.add('active');
    } else {
      const duration = typeof instantOrDuration === 'number' ? instantOrDuration : 0.4;
      next.style.opacity = '0';
      next.classList.add('active');
      requestAnimationFrame(() => {
        next.style.transition = `opacity ${duration}s ease`;
        next.style.opacity = '1';
        setTimeout(() => { next.style.transition = ''; next.style.opacity = ''; }, duration * 1000);
      });
    }

    current = id;

    // Se estiver instanciado o AudioManager, toca o áudio do menu caso vá para a tela inicial
    // Se a duração for personalizada, supomos que o chamador cuidará do áudio (ex: fadeIn)
    if (id === 'screen-menu' && typeof AudioManager !== 'undefined' && typeof instantOrDuration !== 'number') {
      AudioManager.play('menu');
    }
  }

  function getCurrent() { return current; }

  // Mostra a introdução ao carregar
  show('screen-intro', true);

  return { show, getCurrent };
})();
