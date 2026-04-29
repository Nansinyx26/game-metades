// === INPUT HANDLER ===
// Gerencia entrada de teclado (desktop) E controles touch (mobile).
// O módulo MobileControls escreve em MobileControls.virtual;
// as funções abaixo combinam os dois estados via OR.

const Input = (() => {
  const keys = {};

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    e.preventDefault();   // evita scroll da página com setas
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  // ── Helper: lê o estado virtual do módulo mobile (se disponível) ──
  const virt = () =>
    (typeof MobileControls !== 'undefined' && MobileControls.virtual)
      ? MobileControls.virtual
      : {};

  // ── Mapeamento de teclas ──────────────────────────────
  // Metade Leve:   WASD + botões virtuais mobile
  // Metade Pesada: Setas + botões virtuais mobile
  // Ambos:         TAB (alternar ativo), ESC (pause)

  function lightLeft()  { return keys['KeyA']      || !!virt().lightLeft;  }
  function lightRight() { return keys['KeyD']      || !!virt().lightRight; }
  function lightJump()  { return keys['KeyW']      || !!virt().lightJump;  }
  function lightDash()  { return keys['ShiftLeft'] || keys['KeyK'] || !!virt().lightDash; }

  function heavyLeft()  { return keys['ArrowLeft']  || !!virt().heavyLeft;  }
  function heavyRight() { return keys['ArrowRight'] || !!virt().heavyRight; }
  function heavyJump()  { return keys['ArrowUp']    || !!virt().heavyJump;  }
  function heavySlam()  { return keys['ArrowDown']  || keys['KeyS'] || !!virt().heavySlam; }

  function pausePressed() { return keys['Escape'] || !!virt().pause; }
  function tabPressed()   { return keys['Tab']; }

  // Limpa uma tecla específica (uso único por frame)
  function consume(code) {
    keys[code] = false;
    // Limpa também o estado virtual correspondente
    const v = virt();
    if (code === 'Escape' && v) v.pause = false;
  }

  // Verifica se qualquer tecla ou botão virtual está pressionado
  function any() {
    if (Object.values(keys).some(v => v)) return true;
    const v = virt();
    return v && Object.values(v).some(Boolean);
  }

  return {
    lightLeft, lightRight, lightJump, lightDash,
    heavyLeft, heavyRight, heavyJump, heavySlam,
    pausePressed, tabPressed, consume,
    any,
    raw: keys,   // acesso direto ao teclado quando necessário
  };
})();
