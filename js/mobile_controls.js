// === MOBILE CONTROLS (DOM APPROACH) ===
const MobileControls = (() => {
  const virtual = {
    lightLeft: false, lightRight: false, lightJump: false, lightDash: false,
    heavyLeft: false, heavyRight: false, heavyJump: false, heavySlam: false,
    pause: false
  };

  let isMobileDevice = false;

  function isMobile() {
    if (new URLSearchParams(window.location.search).get('mobile') === '1') return true;
    const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePtr = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
    const isSmall = Math.min(window.innerWidth, window.innerHeight) <= 1024;
    return hasMobileUA || coarsePtr || (hasTouch && isSmall);
  }

  function init() {
    isMobileDevice = isMobile();
    if (!isMobileDevice) return;
    console.log('[MobileControls] Mobile detectado. Inicializando controles DOM...');
    document.body.classList.add('is-mobile');
    injectCSS();
    injectDOM();
    setupListeners();
  }

  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      body.is-mobile #screen-game {
        /* Reduzido para 90px para dar mais espaço ao jogo */
        padding-bottom: 90px !important;
        align-items: center;
        justify-content: flex-start;
      }
      body.is-mobile #gameCanvas {
        height: calc(100vh - 90px) !important;
        width: 100vw;
        object-fit: contain;
      }

      /* Barra fixa na base, flutua SEM cobrir o jogo */
      #mobile-controls {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 90px;
        background: linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.40) 65%, transparent 100%);
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 0 14px 10px;
        box-sizing: border-box;
        z-index: 9999;
        pointer-events: none;
      }

      .mc-side {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        pointer-events: all;
      }

      /* D-pad: cima centralizado, esq/dir na linha de baixo */
      .mc-dpad {
        display: grid;
        grid-template-columns: repeat(3, 50px);
        grid-template-rows: repeat(2, 45px);
        grid-template-areas:
          ". up ."
          "lf .  rt";
        gap: 3px;
      }
      [data-btn="lightLeft"],
      [data-btn="heavyLeft"]  { grid-area: lf; }
      [data-btn="lightRight"],
      [data-btn="heavyRight"] { grid-area: rt; }
      [data-btn="lightJump"],
      [data-btn="heavyJump"]  { grid-area: up; }

      .mc-extra {
        display: flex;
        align-items: flex-end;
      }

      .mc-center {
        display: flex;
        align-items: flex-end;
        padding-bottom: 10px;
        pointer-events: all;
      }

      /* Base dos botões */
      .mc-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.22);
        background: rgba(0,0,0,0.30);
        color: rgba(255,255,255,0.85);
        font-size: 1.05rem;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.07s, transform 0.07s;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      }

      /* Luxar — azul */
      .mc-btn.light-btn {
        background: rgba(50, 110, 220, 0.30);
        border-color: rgba(90, 158, 255, 0.50);
      }
      .mc-btn.light-btn.active {
        background: rgba(90, 158, 255, 0.65);
        transform: scale(0.91);
        border-color: rgba(140, 195, 255, 0.80);
      }

      /* Tenebre — dourado */
      .mc-btn.heavy-btn {
        background: rgba(140, 100, 20, 0.30);
        border-color: rgba(200, 168, 92, 0.50);
      }
      .mc-btn.heavy-btn.active {
        background: rgba(200, 168, 92, 0.65);
        transform: scale(0.91);
        border-color: rgba(240, 210, 120, 0.80);
      }

      /* Botão de ação extra (dash / slam) */
      .mc-btn.extra-btn {
        width: 64px;
        height: 64px;
        font-size: 1.4rem;
      }

      /* Pause */
      .mc-btn.pause-btn {
        width: 36px;
        height: 24px;
        border-radius: 7px;
        font-size: 0.65rem;
        background: rgba(255,255,255,0.10);
        border-color: rgba(255,255,255,0.28);
      }
      .mc-btn.pause-btn.active {
        background: rgba(255,255,255,0.30);
      }

      /* Landscape estreito */
      @media (orientation: landscape) and (max-height: 460px) {
        body.is-mobile #screen-game { padding-bottom: 80px !important; }
        body.is-mobile #gameCanvas { height: calc(100vh - 80px) !important; }
        #mobile-controls   { height: 80px; padding: 0 10px 6px; }
        .mc-btn            { width: 38px; height: 38px; font-size: 0.9rem; }
        .mc-btn.extra-btn  { width: 44px; height: 44px; font-size: 1.1rem; }
        .mc-dpad           { grid-template-columns: repeat(3, 38px); grid-template-rows: repeat(2, 38px); gap: 2px; }
        .mc-side           { gap: 4px; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectDOM() {
    const container = document.createElement('div');
    container.id = 'mobile-controls';
    container.innerHTML = `
      <!-- Luxar (esquerda) -->
      <div class="mc-side">
        <div class="mc-dpad">
          <div class="mc-btn light-btn" data-btn="lightLeft">&#9664;</div>
          <div class="mc-btn light-btn" data-btn="lightJump">&#9650;</div>
          <div class="mc-btn light-btn" data-btn="lightRight">&#9654;</div>
        </div>
        <div class="mc-extra">
          <div class="mc-btn light-btn extra-btn" data-btn="lightDash">&#9889;</div>
        </div>
      </div>

      <!-- Pause (centro) -->
      <div class="mc-center">
        <div class="mc-btn pause-btn" data-btn="pause">&#9646;&#9646;</div>
      </div>

      <!-- Tenebre (direita) -->
      <div class="mc-side">
        <div class="mc-extra">
          <div class="mc-btn heavy-btn extra-btn" data-btn="heavySlam">&#128165;</div>
        </div>
        <div class="mc-dpad">
          <div class="mc-btn heavy-btn" data-btn="heavyLeft">&#9664;</div>
          <div class="mc-btn heavy-btn" data-btn="heavyJump">&#9650;</div>
          <div class="mc-btn heavy-btn" data-btn="heavyRight">&#9654;</div>
        </div>
      </div>
    `;

    // Injeta direto no body — NÃO mexe no layout do jogo
    document.body.appendChild(container);
  }

  function setupListeners() {
    const container = document.getElementById('mobile-controls');
    if (!container) {
      console.error('[MobileControls] Container não encontrado.');
      return;
    }

    container.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    const btns = container.querySelectorAll('.mc-btn');

    function getButtonAtPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return el.closest('.mc-btn');
    }

    function updateVirtualState(touches) {
      // Reseta apenas as teclas de movimento/ação (não o pause)
      for (const key in virtual) {
        if (key !== 'pause') virtual[key] = false;
      }
      btns.forEach(b => {
        if (b.getAttribute('data-btn') !== 'pause') b.classList.remove('active');
      });

      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        // Aumentamos a "sensibilidade" checando não só o ponto exato, 
        // mas também uma pequena margem ao redor (8px)
        const el = getButtonAtPoint(t.clientX, t.clientY) || 
                   getButtonAtPoint(t.clientX + 8, t.clientY) || 
                   getButtonAtPoint(t.clientX - 8, t.clientY) ||
                   getButtonAtPoint(t.clientX, t.clientY + 8) ||
                   getButtonAtPoint(t.clientX, t.clientY - 8);

        if (el) {
          const action = el.getAttribute('data-btn');
          // Ignoramos o pause aqui para evitar o loop de toggle infinito enquanto o dedo está parado
          if (action && action in virtual && action !== 'pause') {
            virtual[action] = true;
            el.classList.add('active');
          }
        }
      }
    }

    container.addEventListener('touchstart', (e) => {
      if (navigator.vibrate) navigator.vibrate(8);
      
      // Ativamos o sinal de pause apenas UMA VEZ no início do toque.
      // O Input.js irá ler virtual.pause e depois limpá-lo com consume().
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const el = getButtonAtPoint(t.clientX, t.clientY);
        if (el && el.getAttribute('data-btn') === 'pause') {
          virtual.pause = true;
          el.classList.add('active');
          // Removemos a classe active após um curto tempo para o feedback visual de clique
          setTimeout(() => el.classList.remove('active'), 150);
          break;
        }
      }
      
      updateVirtualState(e.touches);
    });
    container.addEventListener('touchmove', (e) => updateVirtualState(e.touches));
    container.addEventListener('touchend', (e) => {
      updateVirtualState(e.touches);
    });
    container.addEventListener('touchcancel', (e) => updateVirtualState(e.touches));
  }

  // Mantido para compatibilidade com input.js
  function render(ctx) { }

  return { init, virtual, render, isMobile: () => isMobileDevice };
})();

document.addEventListener('DOMContentLoaded', () => MobileControls.init());