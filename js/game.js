// ── Global State Persistence ────────────────────────
window.GlobalState = {
  activatedCrystals: new Set(),
  persistPositions: {}, // { id: { x, y } }
  lockedButtons: new Set(), // IDs de botões travados entre fases
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  },

  activateCrystal(id) {
    this.activatedCrystals.add(id);
    this.emit('crystal_activated', id);
    console.log(`Crystal activated: ${id}`);
  },

  isCrystalActivated(id) {
    return this.activatedCrystals.has(id);
  },

  lockButton(linkedId) {
    this.lockedButtons.add(linkedId);
    this.emit('button_locked', linkedId);
    console.log(`[GlobalState] Botão travado: linkedId=${linkedId}`);
  },

  isButtonLocked(linkedId) {
    return this.lockedButtons.has(linkedId);
  },

  saveObjectPos(id, pos) {
    this.persistPositions[id] = pos;
    this.emit('pos_saved', { id, pos });
  },

  getSavedPos(id) {
    return this.persistPositions[id];
  },

  reset() {
    this.activatedCrystals.clear();
    this.persistPositions = {};
    this.lockedButtons.clear();
    this._listeners = {};
    this.emit('reset', null);
  }
};

const Game = (() => {

  // ── Estado do jogo ───────────────────────────────────
  let state = {
    running: false,
    paused: false,
    currentLevel: 0,
    currentAct: 0,
    time: 0,
    levelTime: 0,
    activePlayer: 'light',

    // Entidades vivas
    light: null,
    heavy: null,
    tiles: [],
    boxes: [],
    buttons: [],
    platforms: [],
    crystals: [],      // Novos elementos
    echoPlatforms: [], // Novos elementos
    portal: null,

    // Flags
    merging: false,
    mergeProgress: 0,
    explosion: false,
    explosionTimer: 0,
    cinematic: { active: false, phase: 0, timer: 0, textAlpha: 0 },
    lastJumpLight: false,
    lastJumpHeavy: false,
  };

  let rafId = null;
  let lastTimestamp = 0;

  // ── Inicialização ────────────────────────────────────
  function init() {
    const canvas = document.getElementById('gameCanvas');
    Renderer.init(canvas);
    Renderer.loadAssets(() => {
      console.log('Images loaded');
      if (typeof DialogueManager !== 'undefined') DialogueManager.preload();
    });
  }

  // ── Começa o jogo ────────────────────────────────────
  function start() {
    console.log('[Game] Botão Continuar/Start pressionado.');
    try {
      if (typeof GlobalState !== 'undefined') GlobalState.reset();
      if (typeof Achievements !== 'undefined') Achievements.clearRun();
      state.currentLevel = 0;
      state.currentAct = 1; // Ajustado para 1 (Despertar)

      console.log('[Game] Iniciando música e narrativa...');
      if (typeof AudioManager !== 'undefined') {
        AudioManager.play('act1');
      } else {
        console.warn('[Game] AudioManager não detectado.');
      }

      showNarrativeForAct(1, () => {
        console.log('[Game] Narrativa concluída, carregando level 0.');
        loadLevel(0);
      });
    } catch (err) {
      console.error('[Game] Erro crítico ao iniciar o jogo:', err);
      // Fallback: Tenta carregar o level direto se a narrativa falhar
      loadLevel(0);
    }
  }

  function testLastLevel() {
    const lastIdx = LEVELS.length - 1;
    state.currentLevel = lastIdx;
    state.currentAct = LEVELS[lastIdx].act;
    if (typeof AudioManager !== 'undefined') AudioManager.play('act' + state.currentAct);
    loadLevel(lastIdx);
  }

  // ── Narrativa de ato ─────────────────────────────────
  let _narrativeLines = [];
  let _narrativeIdx = 0;
  let _narrativeDone = null;

  function showNarrativeForAct(act, done) {
    _narrativeLines = ACT_NARRATIVES[act] || [];
    _narrativeIdx = 0;
    _narrativeDone = done;
    if (_narrativeLines.length === 0) { done(); return; }
    showNextNarrativeLine();
  }

  function showNextNarrativeLine() {
    if (_narrativeIdx >= _narrativeLines.length) {
      _narrativeDone && _narrativeDone();
      return;
    }
    document.getElementById('narrative-text').textContent = _narrativeLines[_narrativeIdx];
    _narrativeIdx++;
    Screen.show('screen-narrative');
  }

  function nextNarrative() {
    console.log('[Game] Seguindo narrativa...');
    // Reinicia animação
    const el = document.getElementById('narrative-text');
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
    showNextNarrativeLine();
  }

  // ── Carrega uma fase ─────────────────────────────────
  function loadLevel(idx) {
    if (idx >= LEVELS.length) {
      showEnding();
      return;
    }

    const data = LEVELS[idx];

    // Toca música referente ao Ato atual
    if (state.currentAct !== data.act) {
      state.currentAct = data.act;
      if (typeof AudioManager !== 'undefined') {
        AudioManager.play('act' + data.act);
      }
    }

    state.currentLevel = idx;

    // Reset de estado
    state.running = true;
    state.paused = false;
    state.time = 0;
    state.levelTime = 0;
    state.merging = false;
    state.mergeProgress = 0;
    state.explosion = false;
    state.explosionTimer = 0;
    state.cinematic = { active: false, phase: 0, timer: 0, textAlpha: 0 };
    
    if (typeof Renderer !== 'undefined' && Renderer.resetCamera) {
      Renderer.resetCamera();
    }
    state.goalShownTimer = 9999;   // objetivo sempre visível
    state.lastJumpLight = false;
    state.lastJumpHeavy = false;
    state.tabWasDown = false;
    state.activePlayer = 'light';

    const SCALER = 2; // Faz o mundo ter 30x2x32=1920px de largura, preenchendo a tela
    const cols = 30 * SCALER, rows = 19 * SCALER;

    // Tiles
    state.tiles = data.tiles.map(([col, row, w, h]) => ({
      x: col * SCALER * TILE, y: row * SCALER * TILE,
      w: w * SCALER * TILE, h: h * SCALER * TILE,
    }));

    // Personagens
    const lp = data.players.light;
    const hp = data.players.heavy;

    state.light = new Player({
      x: lp.col * SCALER * TILE, y: lp.row * SCALER * TILE,
      w: 24 * SCALER, h: 32 * SCALER,
      type: 'light',
      speed: 600, // Aumentado (era 380)
      jumpForce: 1150, // Aumentado de 1000 para facilitar no mobile
      gravityScale: 0.65,
      mass: 2,
      maxJumps: 2, // Luxar pode dar salto duplo
    });

    state.heavy = new Player({
      x: hp.col * SCALER * TILE, y: hp.row * SCALER * TILE,
      w: 28 * SCALER, h: 40 * SCALER,
      type: 'heavy',
      speed: 500,       // velocidade aumentada // era 360
      jumpForce: 650,   // pulo mais alto
      gravityScale: 1.30,
      mass: 4,
      maxJumps: 1, // Tenebre pula apenas uma vez
    });

    // Limites do mundo calculados dos tiles (uma vez por fase)
    state.worldW = Math.max(1920, ...(state.tiles.length > 0 ? state.tiles.map(t => t.x + t.w) : [1920]));
    state.worldH = Math.max(1080, ...(state.tiles.length > 0 ? state.tiles.map(t => t.y + t.h) : [1080]));

    // Filtra personagem ativo (apenas na fase final ambos aparecem)
    if (!data.isFinal) {
      if (data.activeChar === 'light') state.heavy.alive = false;
      else if (data.activeChar === 'heavy') state.light.alive = false;
    }

    // Cristais (Luxar)
    state.crystals = (data.crystals || []).map(c => new Crystal({
      id: c.id,
      x: c.col * SCALER * TILE,
      y: c.row * SCALER * TILE,
    }));

    // Plataformas Eco (Tenebre)
    state.echoPlatforms = (data.echoPlatforms || []).map(ep => {
      const plat = new EchoPlatform({
        id: ep.id,
        x: ep.col * SCALER * TILE,
        y: ep.row * SCALER * TILE,
      });
      // Ativa se o cristal correspondente já foi ativado
      if (window.GlobalState.isCrystalActivated(ep.linkedCrystalId)) {
        plat.active = true;
      }
      return plat;
    });

    // Caixas com persistência
    state.boxes = (data.boxes || []).map(b => {
      const saved = b.id ? window.GlobalState.getSavedPos(b.id) : null;
      return new Box({
        id: b.id,
        x: saved ? saved.x : b.col * SCALER * TILE,
        y: saved ? saved.y : b.row * SCALER * TILE,
        w: 36 * SCALER, h: 36 * SCALER, // Tamanho ajustado (era 48 * SCALER)
      });
    });

    // Botões — restaura estado de fases anteriores via GlobalState
    state.buttons = (data.buttons || []).map(b => {
      const btn = new Button({
        x: b.col * SCALER * TILE,
        y: b.row * SCALER * TILE - 64,
        linkedId: b.linkedId,
        lockOnPress: b.lockOnPress ?? false,
      });
      // Se a fase anterior já travou esse linkedId, pré-ativa o botão
      if (b.linkedId && window.GlobalState.isButtonLocked(b.linkedId)) {
        btn.pressed = true;
        btn.locked = true;
        console.log(`[loadLevel] Botão pré-ativado por GlobalState: ${b.linkedId}`);
      }
      return btn;
    });

    // Plataformas — passa flags extras e pré-ativa se botão já estava travado
    state.platforms = (data.platforms || []).map(p => {
      const plat = new MovingPlatform({
        id: p.id,
        x: p.col * SCALER * TILE,
        y: p.row * SCALER * TILE,
        w: (p.w || 3) * SCALER * TILE,
        h: (p.h ? p.h * SCALER * TILE : 12 * SCALER),
        endX: (p.endCol ?? p.col) * SCALER * TILE,
        endY: (p.endRow ?? p.row) * SCALER * TILE,
        speed: (p.speed ?? 60) * SCALER,
        animSpeed: p.animSpeed ?? 0.7,
        isIronGate: p.isIronGate ?? false,
        isAnimatedGate: p.isAnimatedGate ?? false,
        isElevator: p.isElevator ?? false,
        isDoor: p.isDoor ?? false,
        elevatorMode: p.elevatorMode ?? false,
        autoTrigger: p.autoTrigger ?? false,
      });
      // Pré-ativa se o GlobalState já tinha este id travado
      if (p.id && window.GlobalState.isButtonLocked(p.id)) {
        plat.active = true;
        // Portáo e elevador: teleporta para posição final (já aberto)
        plat.x = plat.endX;
        plat.y = plat.endY;
        console.log(`[loadLevel] Plataforma pré-ativada por GlobalState: ${p.id}`);
      }
      return plat;
    });


    // Portal - Sistema Automático (Bottom-Left)
    // Conforme requisito: borda esquerda e na base do cenário
    const portalW = 192; // Quadrado para evitar distorção
    const portalH = 192;

    // Posição Horizontal: Prioriza LEVELS.js, senão usa AUTO (bottom-right)
    let autoX;
    if (data.portal) {
      autoX = data.portal.col * TILE * SCALER;
    } else {
      autoX = state.worldW - portalW - 350; // Alinhado com a área stone do Ato 1
    }

    // Busca automática por chão: Encontra o tile mais alto (Y mínimo) na posição do portal
    let floorY = state.worldH;
    state.tiles.forEach(t => {
      // Verifica se o portal está sobre este tile horizontalmente
      if (autoX + portalW / 2 >= t.x && autoX + portalW / 2 <= t.x + t.w) {
        if (t.y < floorY) floorY = t.y;
      }
    });

    const autoY = floorY - portalH; // Pousa exatamente sobre o topo do chão

    state.portal = new Portal({
      id: 'portal_exit',
      // Prioriza posicionamento automático bottom-left conforme novo requisito
      x: autoX,
      y: autoY,
      w: portalW,
      h: portalH,
      worldH: state.worldH
    });

    // ── Ponte Luminosa (Fase 2 / Fase 4) ────────────────────────────────
    state.lumaBridge = null;
    if (data.lumaBridge) {
      const lb = data.lumaBridge;
      const bx = lb.col * SCALER * TILE;
      const by = lb.row * SCALER * TILE;
      const bw = lb.widthCols * SCALER * TILE;
      const bh = (lb.heightRows || 1) * SCALER * TILE;
      
      // Adiciona tile físico para colisão real (marcado para filtro se necessário)
      state.tiles.push({ x: bx, y: by, w: bw, h: bh, _isBridge: true });
      
      // Objeto visual da ponte
      state.lumaBridge = { 
        x: bx, y: by, w: bw, h: bh, 
        visible: !lb.linkedCrystalId, // Inicia visível se não tiver trava
        linkedCrystalId: lb.linkedCrystalId,
        linkedButtonIdx: lb.linkedButtonIdx
      };
      
      // Recalcula limites do mundo com o novo tile
      state.worldW = Math.max(state.worldW, bx + bw);
      state.worldH = Math.max(state.worldH, by + bh);
    }

    // HUD
    document.getElementById('hud-act').textContent = data.actName || `Ato ${data.act}`;
    document.getElementById('hud-level').textContent = data.name;

    Screen.show('screen-game');
    startLoop();

    // Diálogos de início de fase e Transições de Ato
    if (state.currentLevel === 0) {
      if (state.light.alive !== false) {
        setTimeout(() => state.light.say("Onde... onde estamos?"), 1000);
      }
    } else if (data.isFinal) {
      // Diálogo final tem prioridade no nível final
      setTimeout(() => state.light.say("É hora de voltarmos a ser um."), 2000);
      setTimeout(() => state.heavy.say("Finalmente... a Unidade."), 5000);
    } else if (state.currentLevel === 5) {
      // Se o nível 5 não fosse o final (mas aqui é, então esse bloco raramente rodará agora)
      if (state.light.alive !== false) {
        setTimeout(() => state.light.say("O abismo parece mais profundo hoje."), 1000);
      }
    } else if (data.act === 2 && !state.act2IntroSeen) {
      state.act2IntroSeen = true;
      if (state.heavy.alive !== false) {
        setTimeout(() => state.heavy.say("A escuridão aqui é... pesada."), 1500);
      }
    } else if (data.act === 3 && !state.act3IntroSeen) {
      state.act3IntroSeen = true;
      if (state.light.alive !== false) {
        setTimeout(() => state.light.say("O fim está próximo, sinto o calor."), 1500);
      }
      if (state.heavy.alive !== false) {
        setTimeout(() => state.heavy.say("Juntos até a última centelha."), 4500);
      }
    }
  }

  // ── Loop de jogo ─────────────────────────────────────
  let accumulator = 0;
  const FIXED_DT = 1 / 60; // 60 FPS

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTimestamp = performance.now();
    accumulator = 0;
    rafId = requestAnimationFrame(loop); // salva ID
  }

  function loop(ts) {
    if (!state.running) return;
    if (state.paused) { 
      lastTimestamp = ts; // Previne salto de tempo ao despausar
      rafId = requestAnimationFrame(loop); 
      return; 
    }

    let frameTime = (ts - lastTimestamp) / 1000;
    lastTimestamp = ts;
    
    // Evita espiral da morte se o jogo travar
    if (frameTime > 0.1) frameTime = 0.1;

    accumulator += frameTime;

    // Atualiza a física em passos fixos (consistência perfeita de pulos/colisões)
    while (accumulator >= FIXED_DT) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    // A renderização ainda usa o tempo real do frame para partículas e interpolação da câmera
    if (state.running && !state.paused) render(frameTime);
    
    rafId = requestAnimationFrame(loop); // salva ID
  }

  // ── Atualização ──────────────────────────────────────
  function update(dt) {
    state.time += dt;
    state.levelTime += dt;
    // Objetivo sempre visível

    const data = LEVELS[state.currentLevel];

    if (state.cinematic.active) {
      updateCinematic(dt);

      // Plataformas continuam (caso estejam terminando o trajeto)
      for (const plat of state.platforms) {
        plat.update(dt);
      }

      // Morreu se cair longe mesmo no cinematic 
      const LH = (state.worldH || 1080) + 800;
      if (state.light.y > LH || state.heavy.y > LH) {
        restartLevel();
      }
      return;
    }

    // Input — Metade Leve (WASD)
    if (state.light.alive !== false) {
      if (Input.lightLeft()) state.light.moveLeft(dt);
      if (Input.lightRight()) state.light.moveRight(dt);
      const jumpLightNow = Input.lightJump();
      if (jumpLightNow && !state.lastJumpLight) state.light.jump();
      else if (!jumpLightNow && state.lastJumpLight && state.light.vy < 0) state.light.vy *= 0.5;
      state.lastJumpLight = jumpLightNow;

      if (Input.lightDash()) state.light.dash();
    }

    // Input — Metade Pesada (Setas)
    if (state.heavy.alive !== false) {
      if (Input.heavyLeft()) state.heavy.moveLeft(dt);
      if (Input.heavyRight()) state.heavy.moveRight(dt);
      const jumpHeavyNow = Input.heavyJump();
      if (jumpHeavyNow && !state.lastJumpHeavy) state.heavy.jump();
      else if (!jumpHeavyNow && state.lastJumpHeavy && state.heavy.vy < 0) state.heavy.vy *= 0.5;
      state.lastJumpHeavy = jumpHeavyNow;

      if (Input.heavySlam()) state.heavy.slam();
    }

    // TAB — alterna quem controla (modo alternado)
    const tabNow = Input.tabPressed();
    if (tabNow && !state.tabWasDown) {
      state.activePlayer = state.activePlayer === 'light' ? 'heavy' : 'light';
    }
    state.tabWasDown = tabNow;

    // ESC — pausa
    if (Input.pausePressed()) { Input.consume('Escape'); pause(); return; }

    // Reset botões (apenas os que não estão travados permanentemente)
    for (const btn of state.buttons) {
      if (!btn.locked) btn.pressed = false;
    }

    // Plataformas (antes dos personagens para carregamento correto)
    for (const plat of state.platforms) {
      plat.update(dt);
    }

    // Colisão de caixas com botões
    for (const box of state.boxes) {
      if (box.isLocked) continue;
      for (const btn of state.buttons) {
        if (Physics.overlaps(box, btn)) {
          btn.press();
          // Se o botão travar, a caixa também trava no lugar para um efeito premium
          if (btn.lockOnPress) {
            box.isLocked = true;
            box.vx = 0;
            box.vy = 0;
            // Centraliza no botão (X) e assenta sobre a placa pressionada (Y)
            box.x = btn.x + (btn.w - box.w) / 2;
            box.y = btn.y + btn.h - box.h; // Assenta no nível do chão (base do botão)
          }
        }
      }
    }
    // Personagens também ativam botões por pisada
    for (const btn of state.buttons) {
      if (!btn.locked) {
        if (state.light.alive !== false && Physics.overlaps(state.light, btn)) btn.press();
        if (state.heavy.alive !== false && Physics.overlaps(state.heavy, btn)) btn.press();
      }
    }

    // Persiste no GlobalState quando um botão lockOnPress é travado
    for (const btn of state.buttons) {
      if (btn.locked && btn.linkedId && !window.GlobalState.isButtonLocked(btn.linkedId)) {
        window.GlobalState.lockButton(btn.linkedId);
      }
    }

    // Vincula plataformas a botões (após checar todos os ativadores)
    for (const btn of state.buttons) {
      for (const plat of state.platforms) {
        if (plat.id === btn.linkedId) {
          plat.active = btn.pressed;
        }
      }
    }

    // Plataformas carregam personagens e auto-ativam (Elevadores Fase 9)
    for (const plat of state.platforms) {
      if (plat.autoTrigger) plat.active = false;
      // Usar a posição anterior da plataforma para detectar personagens pousados nela com estabilidade
      const pRect = { x: plat.prevX, y: plat.prevY, w: plat.w, h: plat.h };
      const onPlat = (e) =>
        e.x + e.w > pRect.x && e.x < pRect.x + pRect.w &&
        Math.abs((e.y + e.h) - pRect.y) < 6;

      let hasPassenger = false;
      if (onPlat(state.light)) { hasPassenger = true; plat.carryEntity(state.light); }
      if (onPlat(state.heavy)) { hasPassenger = true; plat.carryEntity(state.heavy); }
      
      // Suporte para caixas em plataformas móveis (evita que caiam)
      for (const box of state.boxes) {
        if (onPlat(box)) {
          hasPassenger = true;
          plat.carryEntity(box);
        }
      }

      if (plat.autoTrigger && hasPassenger) {
        plat.active = true;
      }
    }

    // Tiles combinados (estáticos + plataformas + ecos ativos + ponte ativa)
    const allTiles = [
      ...state.tiles.filter(t => !t._isBridge || (state.lumaBridge && state.lumaBridge.visible)),
      ...state.platforms
        .filter(p => {
          // Portões abertos (sliding ou animado) removidos da colisão
          if ((p.isDoor || p.isIronGate) && p.active) return false;
          if (p.isAnimatedGate && p._t >= 1) return false;
          return true;
        })
        .map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h })),
      ...state.echoPlatforms.filter(ep => ep.active).map(ep => ({ x: ep.x, y: ep.y, w: ep.w, h: ep.h })),
    ];

    // Atualiza visibilidade da Ponte Luminosa baseada em requisitos
    if (state.lumaBridge) {
      let crystalOk = true;
      if (state.lumaBridge.linkedCrystalId) {
        crystalOk = window.GlobalState.isCrystalActivated(state.lumaBridge.linkedCrystalId);
      }
      
      let buttonOk = true;
      if (state.lumaBridge.linkedButtonIdx !== undefined) {
        const btn = state.buttons[state.lumaBridge.linkedButtonIdx];
        buttonOk = btn && btn.pressed;
      }
      
      state.lumaBridge.visible = crystalOk && buttonOk;
    }

    // Força do vento (Ato 3)
    const wind = data.wind || 0;

    // Atualiza personagens
    state.light.update(dt, allTiles, state.boxes, state.buttons, wind, state.crystals);
    state.heavy.update(dt, allTiles, state.boxes, state.buttons, wind);

    // Atualiza ecos (visibilidade baseada no personagem ativo)
    const activePlayer = data.activeChar === 'light' ? state.light : state.heavy;
    for (const ep of state.echoPlatforms) ep.update(dt, activePlayer);

    // Atualiza caixas
    for (const box of state.boxes) box.update(dt, state.tiles);

    // Portal (passa players para detecção de sons de entrada)
    state.portal.update(dt, [state.light, state.heavy]);

    // Ativa o portal quando todos os cristais forem coletados
    // (Fases sem cristais abrem o portal automaticamente)
    if (!state.portal.active) {
      if (state.crystals.length === 0) {
        // Sem cristais: portal sempre aberto
        state.portal.active = true;
      } else {
        const allActivated = state.crystals.every(c => c.activated);
        if (allActivated) {
          state.portal.active = true;
          console.log('Portal aberto! Todos os cristais ativados.');
        }
      }
    }

    // Distância entre personagens (para atração no Ato 3 / Unum)
    const lx = state.light.x + state.light.w / 2;
    const ly = state.light.y + state.light.h / 2;
    const hx = state.heavy.x + state.heavy.w / 2;
    const hy = state.heavy.y + state.heavy.h / 2;
    const dist = Math.hypot(lx - hx, ly - hy);

    // Atração automática (Ato 3, fase final)
    if ((data.act === 3 || data.isFinal) && dist < 400 && !state.merging) {
      const strength = (400 - dist) / 400;
      const dx = (hx - lx) / (dist || 1);
      const dy = (hy - ly) / (dist || 1);
      const force = strength * 240;
      state.light.vx += dx * force * dt;
      state.light.vy += dy * force * dt;
      state.heavy.vx -= dx * force * dt * 0.5;
      state.heavy.vy -= dy * force * dt * 0.5;
    }

    // HUD: destaca personagem ativo
    const hudL = document.getElementById('hud-light');
    const hudH = document.getElementById('hud-heavy');
    if (hudL) hudL.className = 'hud-char' + (data.activeChar === 'light' ? ' active-char' : '');
    if (hudH) hudH.className = 'hud-char' + (data.activeChar === 'heavy' ? ' active-char' : '');

    // Condição de vitória
    checkWinCondition(data, dist, dt);

    // Limites horizontais do mundo (evita personagem sair da tela)
    const worldW = state.worldW || 1920;
    const worldH = state.worldH || 1080;

    const clamp = (p) => {
      const padding = 2;
      if (p.x < padding) { p.x = padding; p.vx = Math.max(0, p.vx); }
      if (p.x + p.w > worldW - padding) { p.x = worldW - p.w - padding; p.vx = Math.min(0, p.vx); }
    };
    if (state.light.alive !== false) clamp(state.light);
    if (state.heavy.alive !== false) clamp(state.heavy);

    // Morreu (caiu bem abaixo do nível) — ignora personagens inativos (alive === false)
    const LH = worldH + 800;
    const lightFell = state.light.alive !== false && state.light.y > LH;
    const heavyFell = state.heavy.alive !== false && state.heavy.y > LH;
    if (lightFell || heavyFell) {
      console.log(`Reset por queda detectado: y_light=${Math.round(state.light.y)}, y_heavy=${Math.round(state.heavy.y)}, LH=${LH}`);
      restartLevel();
    }
  }

  function restartLevel() {
    // Limpa diálogos pendentes para evitar sobreposição
    state.act2IntroSeen = false;
    state.act3IntroSeen = false;
    // Limpa qualquer timeout de transição que possa estar rodando
    if (typeof _glitchTimeout !== 'undefined') clearTimeout(_glitchTimeout);
    loadLevel(state.currentLevel);
  }

  // ── Condição de vitória ──────────────────────────────
  function updateCinematic(dt) {
    const c = state.cinematic;
    c.timer += dt;

    if (c.phase === 0) {
      // Detonação imediata pois ambos já estão dentro!
      c.phase = 1; // Inicia explosão
      c.timer = 0;
      
      // Reproduzir o som no momento exato da detonação
      try {
        const boom = new Audio('Music/SoundFX/explosao.mp3');
        boom.play();
      } catch (e) { console.warn(e); }
      if (typeof AudioManager !== 'undefined') AudioManager.stop();
      
    } else if (c.phase === 1) {
      // Explosão com spritesheet (assume ~2 segundos de frames)
      if (c.timer >= 2.0) {
        c.phase = 2;
        c.timer = 0;
        state.light.alive = false;
        state.heavy.alive = false;
        // Música só começa depois que as partículas acabam (fase 3)
      }
    } else if (c.phase === 2) {
      // Wait 10 seconds as requested!
      if (c.timer >= 10.0) {
        c.phase = 3;
        c.timer = 0;
        // Música do menu começa aqui, após a fase escura com partículas
        if (typeof AudioManager !== 'undefined') AudioManager.play('menu');
      }
    } else if (c.phase === 3) {
      // Finaliza o jogo automaticamente
      state.running = false;
      showEnding();
    }
  }

  // ── Condição de vitória ──────────────────────────────
  function checkWinCondition(data, dist, dt) {

    if (state.merging) {
      state.mergeProgress += dt * 0.4; // Transição suave e densa de fusão (~2.5s)
      if (state.mergeProgress >= 1) {
        state.merging = false;
        if (data.isFinal) {
          state.explosion = true;
          state.explosionTimer = 0;
          state.light.alive = false;
          state.heavy.alive = false;
        } else {
          state.running = false;
          showLevelWin(data);
        }
      }
      return;
    }

    // Portal só pode ser usado se estiver ativo (cristais coletados)
    if (!state.portal.active) return;

    // Hitbox do portal (x,y já são o canto superior esquerdo centrado no tile)
    const portalRect = {
      x: state.portal.x,
      y: state.portal.y,
      w: state.portal.w,
      h: state.portal.h,
    };

    const isCompletelyInside = (e, r) => {
      // Garantir de maneira muito robusta e segura: Checar colisão total mas com borda macia (30px)
      // Como o portal é grande (192), isso exige que o char esteja lá dentro, mas relaxa as bordas.
      return e.x >= r.x - 30 && (e.x + e.w) <= (r.x + r.w) + 30 && e.y >= r.y - 30 && (e.y + e.h) <= (r.y + r.h) + 15;
    };

    const lightIn = state.light.alive === false || isCompletelyInside(state.light, portalRect);
    const heavyIn = state.heavy.alive === false || isCompletelyInside(state.heavy, portalRect);

    // Ambos os personagens vivos precisam estar COMPLETAMENTE dentro do portal
    if (lightIn && heavyIn && !state.merging && (!state.cinematic || !state.cinematic.active)) {
      if (data.isFinal) {
        state.cinematic.active = true;
        state.cinematic.phase = 0;
        state.cinematic.timer = 0;
        state.cinematic.textAlpha = 0;
      } else {
        state.merging = true;
      }
    }
  }

  function showLevelWin(data) {
    if (data.isFinal) {
      showEnding();
      return;
    }
    document.getElementById('win-title').textContent = data.name + ' — Completo!';
    document.getElementById('win-msg').textContent = data.winMsg || '';
    Screen.show('screen-level-win');
  }

  function nextLevel() {
    console.log('[Game] nextLevel chamado. Nível atual:', state.currentLevel);
    state.running = false;

    // Remove portal antigo para a nova fase
    state.portal = null;

    const nextIdx = state.currentLevel + 1;
    console.log('[Game] Tentando carregar nível índice:', nextIdx);
    if (nextIdx >= LEVELS.length) { showEnding(); return; }

    // Verifica troca de ato
    const currAct = LEVELS[state.currentLevel].act;
    const nextAct = LEVELS[nextIdx].act;

    if (nextAct !== currAct) {
      showNarrativeForAct(nextAct, () => loadLevel(nextIdx));
    } else {
      const data = LEVELS[nextIdx];
      if (data.narrative) {
        _narrativeLines = [data.narrative];
        _narrativeIdx = 0;
        _narrativeDone = () => loadLevel(nextIdx);
        showNextNarrativeLine();
      } else {
        // Efeito Glitch na transição
        Renderer.drawGlitchEffect(1.0);
        setTimeout(() => loadLevel(nextIdx), 100);
      }
    }
  }

  function showEnding() {
    state.running = false;
    if (rafId) cancelAnimationFrame(rafId);
    Screen.show('screen-ending');
  }

  // ── Render ───────────────────────────────────────────
  function render(dt) {
    const { W, H } = Renderer.getDimensions();
    // Limpeza absoluta do canvas no início de cada frame
    const _canvas = document.getElementById('gameCanvas');
    if (_canvas) {
      const _ctx = _canvas.getContext('2d');
      _ctx.setTransform(1, 0, 0, 1, 0, 0);
      _ctx.clearRect(0, 0, 1920, 1080); // Clear real
      _ctx.globalAlpha = 1.0;
      _ctx.globalCompositeOperation = 'source-over';
      _ctx.shadowBlur = 0;
      _ctx.shadowColor = 'transparent';
    }
    const data = LEVELS[state.currentLevel] || {};

    const LW = Math.max(1920, ...(state.tiles.length > 0 ? state.tiles.map(t => t.x + t.w) : [1920]));
    const LH = Math.max(1080, ...(state.tiles.length > 0 ? state.tiles.map(t => t.y + t.h) : [1080]));

    // Câmera
    const { ox, oy } = Renderer.getCameraOffset(state.light, state.heavy, LW, LH, dt);

    // Fundo
    Renderer.drawBackground(data.act, ox, oy, state.time);

    // Tiles
    Renderer.drawTiles(state.tiles, ox, oy, data.act);

    // Cristais (Luxar)
    for (const c of state.crystals) Renderer.drawCrystal(c, ox, oy, state.time, dt);

    // Plataformas Eco (Tenebre)
    for (const ep of state.echoPlatforms) Renderer.drawEchoPlatform(ep, ox, oy);

    // Plataformas
    for (const plat of state.platforms) Renderer.drawPlatform(plat, ox, oy, data.act);

    // Botões
    for (const btn of state.buttons) Renderer.drawButton(btn, ox, oy);

    // Personagens
    if (state.light.alive !== false) Renderer.drawPlayer(state.light, ox, oy, state.time, state.activePlayer === 'light');
    if (state.heavy.alive !== false) Renderer.drawPlayer(state.heavy, ox, oy, state.time, state.activePlayer === 'heavy');

    // Diálogos
    if (state.light.dialogue.text) Renderer.drawDialogue(state.light, ox, oy);
    if (state.heavy.dialogue.text) Renderer.drawDialogue(state.heavy, ox, oy);

    if (typeof Renderer !== 'undefined' && Renderer.updateAndDrawDust) {
      const canvas = document.getElementById('gameCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.translate(ox, oy);
        Renderer.updateAndDrawDust(dt);
        ctx.restore();
      }
    }

    // Caixas
    for (const box of state.boxes) Renderer.drawBox(box, ox, oy);

    // Ponte Luminosa Etérea (Fase 2 / Fase 4)
    if (state.lumaBridge) Renderer.drawLumaBridge(state.lumaBridge, ox, oy, state.time);

    // Portal
    Renderer.drawPortal(state.portal, ox, oy, state.time);

    // ── PASSAGENS DE ILUMINAÇÃO E PÓS-PROCESSAMENTO ──────
    const lightEntities = [
      state.light, 
      state.heavy, 
      ...state.crystals, 
      state.portal,
      ...state.echoPlatforms.filter(ep => ep.active && ep.visible),
      state.lumaBridge && state.lumaBridge.visible ? {
        x: state.lumaBridge.x + state.lumaBridge.w / 2,
        y: state.lumaBridge.y,
        w: 0, h: 0,
        lightConfig: { radius: 300, intensity: 0.6, color: '#fffacd', pulse: 0.1 }
      } : null
    ].filter(Boolean);
    
    // Iluminação Dinâmica (Darkness + Point Lights)
    Renderer.drawLightingPass(lightEntities, data.act, ox, oy, state.time);

    // Bloom (Glow intenso para energia)
    Renderer.drawBloomPass(lightEntities, ox, oy, state.time);

    // Atmosfera (Vignette + Color Grading)
    Renderer.applyAtmosphere(data.act);

    // Ligação entre personagens (Ato 2+)
    if (data.act >= 2 && state.light.alive !== false && state.heavy.alive !== false) {
      const lx = state.light.x + state.light.w / 2;
      const ly = state.light.y + state.light.h / 2;
      const hx = state.heavy.x + state.heavy.w / 2;
      const hy = state.heavy.y + state.heavy.h / 2;
      const dist = Math.hypot(lx - hx, ly - hy);
      const str = Math.max(0, 1 - dist / 400);
      if (str > 0) Renderer.drawTether(state.light, state.heavy, ox, oy, str);
    }

    // Efeito de merge
    const mx = (state.light.x + state.heavy.x) / 2 + ox;
    const my = (state.light.y + state.heavy.y) / 2 + oy;

    if (state.merging) {
      Renderer.drawMergeEffect(mx, my, state.mergeProgress);
    }

    // Evento final cinematográfico
    if (state.cinematic && state.cinematic.active) {
      if (state.cinematic.phase === 1) {
        Renderer.drawCinematic(mx, my, state.cinematic.timer / 2.0); // pass progress 0 to 1
      } else if (state.cinematic.phase === 2) {
        Renderer.drawPostExplosion(state.cinematic.timer, dt);
      } else if (state.cinematic.phase === 3) {
        Renderer.drawFinalScreen(state.cinematic.textAlpha);
      }
    }

    // UI de fase (ocultar durante a cinemática final para imersão total)
    if (!state.cinematic || !state.cinematic.active) {
      Renderer.drawLevelUI(data, state.time, state.goalShownTimer > 0);
    }

    // Controles Mobile no Canvas
    if (typeof MobileControls !== 'undefined' && MobileControls.isMobile()) {
      if (_canvas && _canvas.getContext) {
        MobileControls.render(_canvas.getContext('2d'));
      }
    }
  }

  // ── Controles de fluxo ───────────────────────────────
  function pause() {
    state.paused = true;
    if (typeof AudioManager !== 'undefined' && AudioManager.setPaused) {
      AudioManager.setPaused(true);
    }
    Screen.show('screen-pause');
  }

  function resume() {
    state.paused = false;
    if (typeof AudioManager !== 'undefined' && AudioManager.setPaused) {
      AudioManager.setPaused(false);
    }
    lastTimestamp = performance.now();
    Screen.show('screen-game');
  }

  function restart() {
    Screen.show('screen-game');
    loadLevel(state.currentLevel);
  }

  function restartLevel() {
    console.log(`Chamada para restartLevel (Level ${state.currentLevel}, Tempo=${state.levelTime.toFixed(2)}s)`);
    // Para o loop atual imediatamente
    state.running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    // Aguarda o frame atual terminar antes de recarregar
    setTimeout(() => loadLevel(state.currentLevel), 0);
  }

  // ── Bootstrap ────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', init);

  return {
    start, pause, resume, restart,
    nextLevel, nextNarrative, testLastLevel,
    _getCurrentLevelIdx: () => state.currentLevel
  };
})();
