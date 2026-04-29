// === MOBILE CONTROLS (RENDERER APPROACH) ===
// Controles virtuais desenhados diretamente no Canvas.

const MobileControls = (() => {
  const virtual = {
    lightLeft: false, lightRight: false, lightJump: false, lightDash: false,
    heavyLeft: false, heavyRight: false, heavyJump: false, heavySlam: false,
    pause: false
  };

  let activeTouches = {};
  let buttons = [];
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

    console.log('[MobileControls] Mobile detectado. Inicializando controles via Canvas...');
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.warn('[MobileControls] Canvas não encontrado.');
      return;
    }

    // Configuração dos botões virtuais.
    // Usaremos posições fixas, mas que escalam se a tela mudar.
    // O canvas nativo é 1920x1080 (W, H interno).
    setupButtons(1920, 1080);

    // Evita scroll e gestures do navegador no canvas
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    console.log('[MobileControls] Touch listeners no Canvas registrados.');
  }

  function setupButtons(W, H) {
    buttons = [];
    
    // Configs gerais
    const btnSize = 120;
    const spacing = 140;
    
    // --- Luxar (Esquerda) ---
    const lCX = 250;
    const lCY = H - 250;

    // D-Pad Luxar
    buttons.push({ id: 'lightJump', x: lCX, y: lCY - spacing, r: btnSize / 2, color: 'rgba(90, 158, 255, 0.4)', icon: '▲' });
    buttons.push({ id: 'lightLeft', x: lCX - spacing, y: lCY, r: btnSize / 2, color: 'rgba(90, 158, 255, 0.4)', icon: '◀' });
    buttons.push({ id: 'lightRight', x: lCX + spacing, y: lCY, r: btnSize / 2, color: 'rgba(90, 158, 255, 0.4)', icon: '▶' });
    
    // Dash Luxar
    buttons.push({ id: 'lightDash', x: lCX + spacing * 2.5, y: lCY, r: btnSize / 1.5, color: 'rgba(90, 158, 255, 0.5)', icon: '⚡' });

    // --- Tenebre (Direita) ---
    const rCX = W - 250;
    const rCY = H - 250;

    // D-Pad Tenebre
    buttons.push({ id: 'heavyJump', x: rCX, y: rCY - spacing, r: btnSize / 2, color: 'rgba(200, 168, 92, 0.4)', icon: '▲' });
    buttons.push({ id: 'heavyLeft', x: rCX - spacing, y: rCY, r: btnSize / 2, color: 'rgba(200, 168, 92, 0.4)', icon: '◀' });
    buttons.push({ id: 'heavyRight', x: rCX + spacing, y: rCY, r: btnSize / 2, color: 'rgba(200, 168, 92, 0.4)', icon: '▶' });
    buttons.push({ id: 'heavySlam', x: rCX, y: rCY + spacing, r: btnSize / 2, color: 'rgba(200, 168, 92, 0.4)', icon: '▼' });

    // Slam Tenebre (Ação lateral)
    buttons.push({ id: 'heavySlam', x: rCX - spacing * 2.5, y: rCY, r: btnSize / 1.5, color: 'rgba(200, 168, 92, 0.5)', icon: '💥' });

    // --- Pause (Centro Topo) ---
    buttons.push({ id: 'pause', x: W / 2, y: 100, w: 100, h: 80, color: 'rgba(255, 255, 255, 0.3)', icon: '||', type: 'rect' });
  }

  // --- Conversão de Coordenadas (Tela -> Canvas Interno) ---
  function getCanvasPos(canvas, touch) {
    const rect = canvas.getBoundingClientRect();
    // Canvas é renderizado com object-fit ou escalado. Precisamos saber a escala.
    // O tamanho interno real é 1920x1080.
    const W = 1920;
    const H = 1080;

    const scaleX = W / rect.width;
    const scaleY = H / rect.height;

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }

  function getHitButton(cx, cy) {
    for (let b of buttons) {
      if (b.type === 'rect') {
        if (cx >= b.x - b.w/2 && cx <= b.x + b.w/2 && cy >= b.y - b.h/2 && cy <= b.y + b.h/2) {
          return b;
        }
      } else {
        const dist = Math.hypot(cx - b.x, cy - b.y);
        if (dist <= b.r) {
          return b;
        }
      }
    }
    return null;
  }

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function processTouches(e) {
    e.preventDefault();
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Reset virtual states to reconstruct them based on current touches
    for (const key in virtual) virtual[key] = false;

    let touchedAny = false;

    for (let i = 0; i < e.touches.length; i++) {
      const pos = getCanvasPos(canvas, e.touches[i]);
      const btn = getHitButton(pos.x, pos.y);
      if (btn) {
        if (btn.id === 'pause') {
          // Pause logic: toggle on start, prevent holding from toggling repeatedly
          // We handle this more carefully in handleTouchStart
        } else {
          virtual[btn.id] = true;
          touchedAny = true;
        }
      }
    }
    return touchedAny;
  }

  function handleTouchStart(e) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    haptic();
    
    // Check exclusively for pause button on start to avoid rapid toggling
    for (let i = 0; i < e.changedTouches.length; i++) {
      const pos = getCanvasPos(canvas, e.changedTouches[i]);
      const btn = getHitButton(pos.x, pos.y);
      if (btn && btn.id === 'pause') {
        if (typeof Game !== 'undefined' && Game.pause) Game.pause();
      }
    }

    processTouches(e);
  }

  function handleTouchMove(e) {
    processTouches(e);
  }

  function handleTouchEnd(e) {
    processTouches(e);
  }

  // --- Renderização no Canvas ---
  function render(ctx) {
    if (!isMobileDevice) return;

    ctx.save();
    // Setup da matriz para garantir que desenhe por cima de tudo em UI Space
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    for (let b of buttons) {
      const isPressed = virtual[b.id] || (b.id === 'pause' ? false : false); // Pause não tem visual de 'segurando'

      ctx.beginPath();
      
      // Cor de fundo
      ctx.fillStyle = isPressed ? b.color.replace('0.4', '0.8').replace('0.5', '0.9') : b.color;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = isPressed ? 4 : 2;

      if (b.type === 'rect') {
        ctx.rect(b.x - b.w/2, b.y - b.h/2, b.w, b.h);
      } else {
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      }
      
      ctx.fill();
      ctx.stroke();

      // Ícone
      ctx.fillStyle = isPressed ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${b.r ? b.r : b.h/2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.icon, b.x, b.y + 5);
    }

    ctx.restore();
  }

  return { init, virtual, render, isMobile: () => isMobileDevice };
})();

document.addEventListener('DOMContentLoaded', () => MobileControls.init());
