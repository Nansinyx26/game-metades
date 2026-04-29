// === MOBILE CONTROLS (DOM APPROACH) ===
// Controles virtuais usando elementos HTML sobrepostos (ou dividindo a tela).

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
      body.is-mobile {
        overflow: hidden;
      }
      body.is-mobile #screen-game {
        /* O jogo ocupa a parte superior (60%) e os controles a inferior (40%) */
        padding-bottom: 40vh !important;
        align-items: center;
        justify-content: flex-start;
      }
      body.is-mobile #gameCanvas {
        height: 60vh !important;
        max-height: 60vh;
        width: 100vw;
        object-fit: contain;
      }
      #mobile-controls {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 40vh;
        background: rgba(5, 5, 10, 0.95);
        border-top: 2px solid rgba(200, 168, 92, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        z-index: 9999;
        box-sizing: border-box;
      }
      .mc-group {
        display: grid;
        gap: 15px;
      }
      .mc-left {
        grid-template-areas:
          ". jump dash"
          "left right .";
      }
      .mc-right {
        grid-template-areas:
          "slam jump ."
          ". left right";
      }
      .mc-btn {
        width: 15vw;
        height: 15vw;
        max-width: 80px;
        max-height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        user-select: none;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.1s;
      }
      .mc-btn.light-btn {
        background: rgba(90, 158, 255, 0.2);
        border-color: rgba(90, 158, 255, 0.5);
      }
      .mc-btn.light-btn.active { background: rgba(90, 158, 255, 0.6); }
      
      .mc-btn.heavy-btn {
        background: rgba(200, 168, 92, 0.2);
        border-color: rgba(200, 168, 92, 0.5);
      }
      .mc-btn.heavy-btn.active { background: rgba(200, 168, 92, 0.6); }
      
      .mc-btn.pause-btn {
        width: 60px;
        height: 40px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        font-size: 1rem;
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      /* Grid assignments */
      [data-btn="lightJump"] { grid-area: jump; }
      [data-btn="lightLeft"] { grid-area: left; }
      [data-btn="lightRight"] { grid-area: right; }
      [data-btn="lightDash"] { grid-area: dash; }
      
      [data-btn="heavyJump"] { grid-area: jump; }
      [data-btn="heavyLeft"] { grid-area: left; }
      [data-btn="heavyRight"] { grid-area: right; }
      [data-btn="heavySlam"] { grid-area: slam; }
      
      @media (min-width: 768px) {
        .mc-btn {
          width: 80px; height: 80px; font-size: 2rem;
        }
      }
      @media (orientation: landscape) and (max-height: 500px) {
        body.is-mobile #screen-game { padding-bottom: 45vh !important; }
        body.is-mobile #gameCanvas { height: 55vh !important; max-height: 55vh; }
        #mobile-controls { height: 45vh; padding: 5px 20px; }
        .mc-btn { width: 12vh; height: 12vh; min-width: 50px; min-height: 50px; }
        .mc-group { gap: 8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectDOM() {
    const container = document.createElement('div');
    container.id = 'mobile-controls';
    container.innerHTML = \`
      <!-- Luxar (Esquerda) -->
      <div class="mc-group mc-left">
        <div class="mc-btn light-btn" data-btn="lightLeft">◀</div>
        <div class="mc-btn light-btn" data-btn="lightRight">▶</div>
        <div class="mc-btn light-btn" data-btn="lightJump">▲</div>
        <div class="mc-btn light-btn" data-btn="lightDash">⚡</div>
      </div>
      
      <!-- Pause -->
      <div class="mc-btn pause-btn" data-btn="pause">||</div>
      
      <!-- Tenebre (Direita) -->
      <div class="mc-group mc-right">
        <div class="mc-btn heavy-btn" data-btn="heavyLeft">◀</div>
        <div class="mc-btn heavy-btn" data-btn="heavyRight">▶</div>
        <div class="mc-btn heavy-btn" data-btn="heavyJump">▲</div>
        <div class="mc-btn heavy-btn" data-btn="heavySlam">💥</div>
      </div>
    \`;
    
    // Inserir na tela de jogo
    const screenGame = document.getElementById('screen-game');
    if (screenGame) {
      screenGame.appendChild(container);
    }
  }

  function setupListeners() {
    const container = document.getElementById('mobile-controls');
    if (!container) return;

    // Impede scroll ou zoom no container de controles
    container.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    
    const btns = container.querySelectorAll('.mc-btn');
    
    function updateVirtualState(touches) {
      // Reset all
      for (const key in virtual) virtual[key] = false;
      btns.forEach(b => b.classList.remove('active'));
      
      // Checar botões tocados
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && el.classList.contains('mc-btn')) {
          const action = el.getAttribute('data-btn');
          if (action) {
            virtual[action] = true;
            el.classList.add('active');
          }
        }
      }
    }

    container.addEventListener('touchstart', (e) => {
      if (navigator.vibrate) navigator.vibrate(10);
      
      // Lógica de pause imediato ao tocar
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && el.getAttribute('data-btn') === 'pause') {
          if (typeof Game !== 'undefined' && Game.pause) Game.pause();
        }
      }
      
      updateVirtualState(e.touches);
    });
    
    container.addEventListener('touchmove', (e) => {
      updateVirtualState(e.touches);
    });
    
    container.addEventListener('touchend', (e) => {
      updateVirtualState(e.touches);
    });
    
    container.addEventListener('touchcancel', (e) => {
      updateVirtualState(e.touches);
    });
  }

  // --- Função vazia de render para manter compatibilidade com input.js ---
  function render(ctx) {
    // Não desenha mais no canvas
  }

  return { init, virtual, render, isMobile: () => isMobileDevice };
})();

document.addEventListener('DOMContentLoaded', () => MobileControls.init());

