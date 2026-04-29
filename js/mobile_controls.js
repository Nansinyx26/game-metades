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
    setupVisibilityObserver();
  }

  function setupVisibilityObserver() {
    // Lista de telas onde os controles devem ser visíveis
    const allowedScreens = ['screen-game', 'screen-narrative', 'screen-pause', 'screen-level-win', 'screen-ending'];
    
    const updateVisibility = () => {
      const activeScreen = document.querySelector('.screen.active');
      const id = activeScreen ? activeScreen.id : '';
      
      // Atualiza classe do personagem ativo no body
      if (typeof Game !== 'undefined') {
        if (Game.state.activePlayer === 'light') {
          document.body.classList.add('player-light');
          document.body.classList.remove('player-heavy');
        } else {
          document.body.classList.add('player-heavy');
          document.body.classList.remove('player-light');
        }
      }

      if (allowedScreens.includes(id)) {
        document.body.classList.add('show-controls');
      } else {
        document.body.classList.remove('show-controls');
      }
    };

    // Observa mudanças de classe em qualquer elemento .screen
    const observer = new MutationObserver((mutations) => {
      updateVisibility();
    });

    document.querySelectorAll('.screen').forEach(screen => {
      observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
    });

    // Executa uma vez no início
    updateVisibility();
  }

  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --mc-color: rgba(90, 158, 255, 0.65);
        --mc-bg: rgba(50, 110, 220, 0.25);
        --mc-border: rgba(140, 195, 255, 0.5);
      }
      body.player-heavy {
        --mc-color: rgba(200, 168, 92, 0.7);
        --mc-bg: rgba(140, 100, 20, 0.25);
        --mc-border: rgba(240, 210, 120, 0.5);
      }

      body.is-mobile #screen-game {
        padding-bottom: 90px !important;
        align-items: center;
        justify-content: flex-start;
      }
      body.is-mobile #gameCanvas {
        height: calc(100vh - 90px) !important;
        width: 100vw;
        object-fit: fill;
      }

      #mobile-controls {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 100px;
        background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
        display: none;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px 10px;
        box-sizing: border-box;
        z-index: 9999;
        pointer-events: none;
      }
      body.is-mobile.show-controls #mobile-controls { display: flex; }

      .mc-side {
        display: flex;
        align-items: center;
        gap: 15px;
        pointer-events: all;
      }

      .mc-btn {
        width: 65px;
        height: 65px;
        border-radius: 50%;
        border: 2px solid var(--mc-border);
        background: var(--mc-bg);
        color: var(--mc-color);
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.1s;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      }
      .mc-btn.active {
        background: var(--mc-color);
        color: #fff;
        transform: scale(0.92);
        box-shadow: 0 0 15px var(--mc-color);
      }

      .mc-btn.jump-btn { width: 80px; height: 80px; font-size: 2.2rem; }
      .mc-btn.action-btn { width: 70px; height: 70px; }
      
      .mc-btn.pause-btn {
        width: 44px; height: 32px;
        border-radius: 8px;
        font-size: 0.8rem;
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.3);
        color: #fff;
      }

      /* Ícone do poder muda dinamicamente via JS ou classe */
      .power-icon::after { content: "⚡"; }
      body.player-heavy .power-icon::after { content: "💥"; }

      @media (orientation: landscape) and (max-height: 500px) {
        #mobile-controls { height: 85px; padding-bottom: 5px; }
        .mc-btn { width: 55px; height: 55px; font-size: 1.5rem; }
        .mc-btn.jump-btn { width: 65px; height: 65px; }
        .mc-btn.action-btn { width: 60px; height: 60px; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectDOM() {
    const container = document.createElement('div');
    container.id = 'mobile-controls';
    container.innerHTML = `
      <!-- LADO ESQUERDO: PULAR -->
      <div class="mc-side">
        <div class="mc-btn jump-btn" data-btn="unifiedJump">&#9650;</div>
      </div>

      <!-- CENTRO: PAUSE -->
      <div class="mc-center">
        <div class="mc-btn pause-btn" data-btn="pause">&#9646;&#9646;</div>
      </div>

      <!-- LADO DIREITO: MOVER + AÇÃO -->
      <div class="mc-side">
        <div class="mc-btn" data-btn="unifiedLeft">&#9664;</div>
        <div class="mc-btn" data-btn="unifiedRight">&#9654;</div>
        <div class="mc-btn action-btn power-icon" data-btn="unifiedAction"></div>
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
      // Reseta todos os estados virtuais (exceto pause)
      for (const key in virtual) {
        if (key !== 'pause') virtual[key] = false;
      }
      btns.forEach(b => {
        if (b.getAttribute('data-btn') !== 'pause') b.classList.remove('active');
      });

      // Determina prefixo baseado no jogador ativo
      const prefix = (typeof Game !== 'undefined' && Game.state.activePlayer === 'heavy') ? 'heavy' : 'light';

      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const el = getButtonAtPoint(t.clientX, t.clientY) || 
                   getButtonAtPoint(t.clientX + 15, t.clientY) || 
                   getButtonAtPoint(t.clientX - 15, t.clientY) ||
                   getButtonAtPoint(t.clientX, t.clientY + 15) ||
                   getButtonAtPoint(t.clientX, t.clientY - 15);

        if (el) {
          const rawBtn = el.getAttribute('data-btn');
          let action = null;

          // Mapeamento unificado
          if (rawBtn === 'unifiedJump') action = prefix + 'Jump';
          if (rawBtn === 'unifiedLeft') action = prefix + 'Left';
          if (rawBtn === 'unifiedRight') action = prefix + 'Right';
          if (rawBtn === 'unifiedAction') action = (prefix === 'light') ? 'lightDash' : 'heavySlam';

          if (action && action in virtual) {
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