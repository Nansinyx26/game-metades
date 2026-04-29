// === RENDERER (VERSÃO PREMIUM) ===
// Motor Gráfico de Alta Fidelidade com Procedural FX

const Renderer = (() => {

  // Posição guardada do ponto de fusão para usar no drawPostExplosion
  let _fusionCX = null;
  let _fusionCY = null;


  let canvas, ctx;
  let W, H;

  // Buffers Offscreen para Pós-Processamento
  let lightingCanvas, lightingCtx;
  let bloomCanvas, bloomCtx;
  let vignetteCanvas, vignetteCtx;

  const ASSETS = {
    // Personagens (Ghostly Spirit Style)
    luxar_sheet: new Image(),
    tenebre_walk_sheet: new Image(),
    tenebre_jump_sheet: new Image(),
    tenebre_idle_sheet: new Image(),
    tenebre_idle_time: new Image(),

    // Elementos de Jogo
    crystal_idle: new Image(),
    crystal_active: new Image(),
    tile_ruin_light: new Image(),
    bg_abyss: new Image(),
    platform_echo: new Image(),
    heavy_box: new Image(),
    btn_pressure: new Image(),
    gate_iron: new Image(),
    portao_abrindo: new Image(),
    portao_fechando: new Image(),
    bg_unum: new Image(),
    fx_fusion: new Image(),
    anim_explosao: new Image(),
    img_cinematica_fusion: new Image(),
    elevator_ancestral: new Image(),
    aunidade: new Image(),

    // Backgrounds Individuais (Fidelity Mode)
    bg_act1_far: new Image(),
    bg_act1_mid_far: new Image(),
    bg_act1_mid: new Image(),
    bg_act1_near: new Image(),
    bg_act2_far: new Image(),
    bg_act2_mid: new Image(),
    bg_act2_near: new Image(),
    bg_act3_far: new Image(),
    bg_act3_mid: new Image(),
    bg_act3_near: new Image(),

    // Texturas de Chão/Plataforma (Act-based)
    act1_base: new Image(),
    act2_base: new Image(),
    act3_base: new Image(),
    act1_plat: new Image(),
    act2_plat: new Image(),
    act3_plat: new Image(),
    luxar_sheet: new Image(),
    tenebre_sheet: new Image(),
    crystal_idle: new Image(),
    crystal_active: new Image(),
    portal: new Image(),
    platform_echo: new Image()
  };

  const PATTERNS = {};

  function loadAssets(onComplete) {
    const keys = Object.keys(ASSETS);
    let loaded = 0;

    // Mapeamento EXATO para os arquivos de 4MB e subpastas
    const assetFiles = {
      luxar_sheet: 'sprites_blue/sprites_final',
      tenebre_walk_sheet: 'sprites_tenebre2/sprites_final_tenebre2_walk',
      tenebre_jump_sheet: 'sprites_tenebre2/sprites_final_tenebre2_jump',
      tenebre_idle_sheet: 'sprites_tenebre2/sprites_final_tenebre_idle',
      tenebre_idle_time: 'sprites_tenebre2/sprites_final_tenebre_idle_time',

      bg_act1_far: 'assets_background/act1/bg_act1_far',
      bg_act1_mid_far: 'assets_background/act1/bg_act1_mid_far',
      bg_act1_mid: 'assets_background/act1/bg_act1_mid',
      bg_act1_near: 'assets_background/act1/bg_act1_near',
      tile_ruin_light: 'assets_background/act1/tile_ruin_light',

      bg_act2_far: 'assets_background/act2/bg_act2_far',
      bg_act2_mid: 'assets_background/act2/bg_act2_mid',
      bg_act2_near: 'assets_background/act2/bg_act2_near',
      bg_abyss: 'assets_interativos/bg_abyss',

      bg_act3_far: 'assets_background/act3/bg_act3_far',
      bg_act3_mid: 'assets_background/act3/bg_act3_mid',
      bg_act3_near: 'assets_background/act3/bg_act3_near',
      bg_unum: 'assets_interativos/bg_unum',

      btn_pressure: 'assets_interativos/btn_pressure',
      gate_iron: 'assets_interativos/gate_iron',
      portao_abrindo: 'assets_interativos/portao/portao abrindo',
      portao_fechando: 'assets_interativos/portao/portao fechando',
      fx_fusion: 'assets_interativos/fx_fusion',
      anim_explosao: 'assets_explosao/cinematic_fusion',
      img_cinematica_fusion: 'assets_interativos/cinematic_fusion',
      elevator_ancestral: 'assets_interativos/elevador/elevator_ancestral',
      aunidade: 'assets_interativos/Unidade/Aunidade',

      crystal_idle: 'assets_interativos/crystal_idle',
      crystal_active: 'assets_interativos/crystal_active',
      act1_base: 'assets/act1_base',
      act2_base: 'assets/act2_base',
      act3_base: 'assets/act3_base',
      act1_plat: 'assets/act1_plat',
      act2_plat: 'assets/act2_plat',
      act3_plat: 'assets/act3_plat',
      platform_echo: 'assets/platform_echo',
      heavy_box: 'assets/heavy_box',
      portal: 'assets_background/portal/portal'
    };

    keys.forEach(key => {
      const filename = assetFiles[key];
      if (!filename) {
        loaded++;
        return;
      }
      ASSETS[key].onload = () => {
        loaded++;
        if (loaded === keys.length) onComplete();
      };
      ASSETS[key].onerror = () => {
        console.warn(`Failed to load asset: ${key} (path: ${filename}.png)`);
        loaded++;
        if (loaded === keys.length) onComplete();
      };
      // Força o caminho correto
      ASSETS[key].src = (filename.includes('/') ? '' : 'assets/') + `${filename}.png`;
    });

  }

  const COLOR = {
    bg: '#05050a',
    luxar: '#F2EDD7',
    tenebre: '#1A1A2E',
    luxarGlow: '#C8A85C',
    tenebreGlow: '#A85CFF', // Roxo vibrante para a aura de Tenebre
    crystal: '#9EC8D4',
    crystalActive: '#C8A85C',
    tile: '#2a2a3a',
    platform: '#555566'
  };

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');

    // Inicializa buffers secundários
    lightingCanvas = document.createElement('canvas');
    lightingCtx = lightingCanvas.getContext('2d');
    bloomCanvas = document.createElement('canvas');
    bloomCtx = bloomCanvas.getContext('2d');
    vignetteCanvas = document.createElement('canvas');
    vignetteCtx = vignetteCanvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    // Resolução Original Premium
    W = canvas.width = 1920;
    H = canvas.height = 1216;

    if (lightingCanvas) {
      lightingCanvas.width = W;
      lightingCanvas.height = H;
    }
    if (bloomCanvas) {
      bloomCanvas.width = W / 4;
      bloomCanvas.height = H / 4;
    }
    if (vignetteCanvas) {
      vignetteCanvas.width = W;
      vignetteCanvas.height = H;
      _preRenderVignette();
    }
  }

  function _preRenderVignette() {
    if (!vignetteCtx) return;
    vignetteCtx.clearRect(0, 0, W, H);
    const grad = vignetteCtx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    vignetteCtx.fillStyle = grad;
    vignetteCtx.fillRect(0, 0, W, H);
  }

  function glow(color, radius = 20) {
    ctx.shadowColor = color;
    ctx.shadowBlur = radius;
  }
  function noGlow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function drawBackground(act, ox, oy, time) {
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();

    const drawLayer = (key, parallaxSpeed, yCoord, customScale = 1.0, tile = true, blurPx = 0) => {
      const img = ASSETS[key];
      if (img && img.complete && img.naturalWidth > 0) {
        if (blurPx > 0 && typeof Settings !== 'undefined' && Settings.isLightingEnabled()) {
          ctx.filter = `blur(${blurPx}px)`;
        }

        if (!tile) {
          // Versão estável (Stretch): Estica a imagem para cobrir o fundo sem "costuras"
          // Usado para artes complexas que não são texturas repetíveis (Ato 2 e 3)
          const pX = (ox * parallaxSpeed) % W;
          ctx.drawImage(img, pX, yCoord, W + 400, H + 200);
          ctx.filter = 'none';
          return;
        }

        // Versão Tiling: Mantém a qualidade sem esticar (Ato 1)
        const targetW = img.naturalWidth * customScale;
        const targetH = img.naturalHeight * customScale;
        let pX = (ox * parallaxSpeed) % targetW;
        while (pX > 0) pX -= targetW;
        for (let x = pX; x < W; x += targetW) {
          ctx.drawImage(img, x, yCoord, targetW, targetH);
        }
        ctx.filter = 'none';
      }
    };

    if (act === 1) {
      // Camada Longe (Far) - Desfocada para profundidade (Depth of Field)
      drawLayer('bg_act1_far', 0.05, -300, 1.2, true, 4);
      drawLayer('bg_act1_mid_far', 0.10, -250, 1.3, true, 2);

      // Embers / Spores (Ato 1)
      glow('rgba(180, 255, 180, 0.5)', 15);
      ctx.fillStyle = 'rgba(200, 255, 200, 0.7)';
      for (let i = 0; i < 80; i++) {
        let px = (i * 137 + ox * 0.10 + time * 15 * (1 + i % 3)) % (W + 200) - 100;
        let py = (i * 251 + Math.sin(time * 0.5 + i) * 50 + time * 20 * (i % 2 + 1)) % (H + 200) - 100;
        ctx.beginPath(); ctx.arc(px, py, 2 + (i % 6), 0, Math.PI * 2); ctx.fill();
      }
      noGlow();

      // Camada Média (Mid) - Revertida para a posição original
      drawLayer('bg_act1_mid', 0.15, -50, 1.4);

      // Volumetric God Rays
      ctx.fillStyle = 'rgba(255, 255, 200, 0.04)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        let startX = (ox * 0.2 + i * 400) % (W + 1000) - 500;
        ctx.moveTo(startX, -200);
        ctx.lineTo(startX + 300, H + 200);
        ctx.lineTo(startX + 100, H + 200);
        ctx.fill();
      }
      // Camada Próxima (Near)
      drawLayer('bg_act1_near', 0.3, -50, 1.6);

      // ── Vagalumes (Luxar / Ato 1) ─────────────────────────────────────────
      // Pontos de luz suaves em verde-amarelo flutuando pelo cenário
      ctx.save();
      for (let i = 0; i < 60; i++) {
        // Posição orbitante flutuante: cada vagalume tem sua "célula" no espaço
        const seed = i * 137.508;
        const px = ((seed + ox * 0.08 + time * (8 + i % 5)) % (W + 400)) - 200;
        const py = (i * 197 + Math.sin(time * 0.7 + i * 0.9) * 60 + Math.cos(time * 0.4 + i * 1.3) * 30) % (H + 100) - 50;
        // Pisca suavemente
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i * 0.8));
        const size = 2 + (i % 3);
        // Glow amarelo-esverdeado
        ctx.shadowColor = `rgba(180, 255, 120, ${0.8 * pulse})`;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.5 * pulse;
        ctx.fillStyle = i % 3 === 0 ? '#c8ff70' : (i % 3 === 1 ? '#aaff44' : '#ffff88');
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();

    } else if (act === 2) {

      // ── OTIMIZAÇÃO (60 FPS FIX): 
      // 1. Sem ctx.filter (extremamente pesado)
      // 2. Sem gradientes procedurais pesados
      // 3. Paralax mais rápido para ser perceptível
      
      // ── LAYER 0: Fundo base abissal (Roxo Profundo) ─────────────────────
      ctx.fillStyle = '#0a0815'; // Um pouco mais vibrante que o preto puro
      ctx.fillRect(0, 0, W, H);

      // Função auxiliar super leve para paralax horizontal (tile infinito)
      const drawParallax = (img, speed, yOffset, globalAlpha = 1.0) => {
        if (!img || !img.complete || img.naturalWidth <= 0) return;
        ctx.save();
        ctx.globalAlpha = globalAlpha;
        
        // Calcula escala baseada na altura para preencher o canvas (com pequena margem)
        const scale = (H * 1.1) / img.naturalHeight;
        const imgW = img.naturalWidth * scale;
        const imgH = img.naturalHeight * scale;
        
        // pX em loop infinito usando a largura escalada real
        let pX = (ox * speed) % imgW;
        if (pX > 0) pX -= imgW;
        
        // Desenha quantas cópias forem necessárias para cobrir a tela (geralmente 2 ou 3)
        for (let x = pX; x < W; x += imgW) {
          ctx.drawImage(img, x, yOffset, imgW, imgH);
        }
        ctx.restore();
      };

      // ── LAYER 1 (FAR): Fundo abissal distante (Paralax Lento) ───────────
      const abyssFar = ASSETS.bg_act2_far || ASSETS.bg_abyss;
      drawParallax(abyssFar, 0.1, -50, 0.7); // Alpha levemente aumentado para destacar as nebulosas

      // ── LAYER 2 (MID): Caverna e estalactites médias (Paralax Médio) ────
      const abyssMid = ASSETS.bg_act2_mid;
      drawParallax(abyssMid, 0.4, -40, 0.85); // Aumentado velocidade e ajustado offset

      // ── LAYER 3 (NEAR): Rochas pontiagudas em primeiro plano (Paralax Rápido)
      const abyssNear = ASSETS.bg_act2_near;
      drawParallax(abyssNear, 0.8, 60, 1.0); // Aumentado velocidade e descido um pouco mais para profundidade

      // ── LAYER 4: Runas Místicas Flutuantes (Baixo Custo) ────────────────
      ctx.save();
      const runeSymbols = ['ᚱ', 'ᚦ', 'ᚢ', 'ᚾ', 'ᛁ', 'ᛊ', 'ᛏ', 'ᛚ', 'ᛗ'];
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 8; i++) { // Reduzido para 8
        const rx = ((i * 311 + ox * 0.2) % (W + 100)) - 50;
        const ry = 150 + (i * 137 % (H * 0.5)) + Math.sin(time * 0.8 + i) * 20;
        const rPulse = 0.3 + 0.3 * Math.abs(Math.sin(time * 1.2 + i));
        ctx.shadowColor = `rgba(140, 50, 255, ${rPulse})`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(180, 100, 255, ${rPulse * 0.8})`;
        ctx.fillText(runeSymbols[i % runeSymbols.length], rx, ry);
      }
      ctx.restore();

      // ── LAYER 5: Partículas leves de poeira roxa caindo ─────────────────
      ctx.save();
      ctx.fillStyle = 'rgba(120, 70, 200, 0.4)';
      for (let i = 0; i < 30; i++) { // Reduzido de 60 para 30 (dobro de performance)
        const px = ((i * 173 + ox * 0.25) % (W + 100)) - 50;
        const py = ((i * 311 + time * 25 * (1 + i % 2)) % (H + 100)) - 50;
        ctx.fillRect(px, py, 2 + (i % 2), 2 + (i % 2)); // fillRect é muito mais rápido que arc/fill
      }
      ctx.restore();

    } else if (act === 3) {
      drawLayer('bg_act3_far', 0.02, -150, 1.0, false, 4);
      // Cosmic Dust
      ctx.fillStyle = 'rgba(100, 150, 255, 0.04)';
      for (let i = 0; i < 25; i++) {
        let px = (i * 313 + ox * 0.05 + time * 10) % (W + 800) - 400;
        let py = (i * 151 + Math.sin(time + i) * 60) % (H + 200) - 100;
        ctx.beginPath(); ctx.arc(px, py, 150 + (i % 5) * 60, 0, Math.PI * 2); ctx.fill();
      }
      drawLayer('bg_act3_mid', 0.1, -100, 1.0, false, 2);
      drawLayer('bg_act3_near', 0.2, 0, 1.0, false);

      // ── Estrelas Cadentes (Ato 3 — Loop contínuo) ────────────────────────
      ctx.save();
      for (let i = 0; i < 8; i++) {
        // Cada estrela tem seu próprio ciclo de tempo, criando loop
        const period = 4 + (i * 1.7); // período diferente por estrela
        const t = (time * 0.5 + i * period * 0.13) % period / period; // 0→1 loop
        if (t > 0.7) { continue; } // Só aparece nos primeiros 70% do ciclo
        // Posição inicial na parte superior
        const startX = (i * 313 + ox * 0.02) % (W + 400) - 200;
        const startY = (i * 89) % (H * 0.4);
        const trailLen = 200 + (i % 3) * 80;
        const angle = Math.PI / 4; // 45° inclinada
        const ex = startX + Math.cos(angle) * trailLen * t;
        const ey = startY + Math.sin(angle) * trailLen * t;
        const alpha = t < 0.2 ? t / 0.2 : t > 0.6 ? 1 - (t - 0.6) / 0.1 : 1.0;
        // Cauda (gradiente)
        const trailGrad = ctx.createLinearGradient(
          ex - Math.cos(angle) * trailLen * 0.3, ey - Math.sin(angle) * trailLen * 0.3,
          ex, ey
        );
        trailGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
        trailGrad.addColorStop(1, `rgba(255, 255, 220, ${0.9 * alpha})`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(200, 220, 255, 0.8)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ex - Math.cos(angle) * trailLen * 0.3, ey - Math.sin(angle) * trailLen * 0.3);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Ponta brilhante
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.restore();
    }
    ctx.restore();
  }

  let currentCamX = null;
  let currentCamY = null;
  let shakeIntensity = 0;

  function resetCamera() {
    currentCamX = null;
    currentCamY = null;
    shakeIntensity = 0;
  }

  function addScreenShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
  }

  function getCameraOffset(light, heavy, levelW, levelH, dt = 0.016) {
    const lightAlive = light.alive !== false;
    const heavyAlive = heavy.alive !== false;
    let cx, cy;
    let focusX = 0;

    if (lightAlive && heavyAlive) {
      cx = (light.x + light.w / 2 + heavy.x + heavy.w / 2) / 2;
      cy = (light.y + light.h / 2 + heavy.y + heavy.h / 2) / 2;
    } else if (lightAlive) {
      cx = light.x + light.w / 2;
      cy = light.y + light.h / 2;
      focusX = light.vx * 0.4; // Look ahead based on speed
    } else if (heavyAlive) {
      cx = heavy.x + heavy.w / 2;
      cy = heavy.y + heavy.h / 2;
      focusX = heavy.vx * 0.4;
    } else {
      cx = W / 2; cy = H / 2;
    }

    let targetX = cx + focusX;
    let targetY = cy; // Sem look ahead vertical pra não enjoar

    // Snap no primeiro frame
    if (currentCamX === null || currentCamY === null) {
      currentCamX = targetX;
      currentCamY = targetY;
    } else {
      // Lerp suave
      currentCamX += (targetX - currentCamX) * 4 * dt;
      currentCamY += (targetY - currentCamY) * 6 * dt; // Vertical um pouco mais rápido para pulos
    }

    // Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity -= 100 * dt; // Decai rapidamente
      if (shakeIntensity < 0) shakeIntensity = 0;
    }

    let ox = W / 2 - currentCamX + shakeX;
    let oy = H / 2 - currentCamY + shakeY;
    ox = Math.min(0, Math.max(W - levelW, ox));
    oy = Math.min(0, Math.max(H - levelH, oy));
    return { ox, oy };
  }

  function getPan(worldX) {
    if (currentCamX === null) return 0;
    const dx = worldX - currentCamX;
    return Math.max(-1, Math.min(1, dx / (W / 2)));
  }

  function drawTiles(tiles, ox, oy, act) {
    ctx.save();
    ctx.translate(ox, oy);

    const baseKey = 'act' + act + '_base';
    const floorImg = (act === 1) ? ASSETS.act1_plat : ASSETS[baseKey];
    const floorKey = (act === 1) ? 'act1_plat' : baseKey;

    for (const tile of tiles) {
      if (tile._isBridge) continue;

      if (floorImg && floorImg.complete && floorImg.naturalWidth > 0) {
        if (!PATTERNS[floorKey]) PATTERNS[floorKey] = ctx.createPattern(floorImg, 'repeat');
        const pattern = PATTERNS[floorKey];

        ctx.save();
        const scaleVal = 1.0; // Mantém o tamanho original 1:1 para evitar que os blocos fiquem minúsculos
        const matrix = new DOMMatrix().translate(tile.x, tile.y).scale(scaleVal, scaleVal);
        pattern.setTransform(matrix);
        ctx.fillStyle = pattern;
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        ctx.restore();
      } else {
        // Fallback para cor sólida caso os assets falhem
        ctx.fillStyle = COLOR.tile;
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      }
    }
    ctx.restore();
  }

  function drawPlayer(player, ox, oy, time, isActive) {
    const cx = player.x + player.w / 2 + ox; const cy = player.y + player.h / 2 + oy;
    const isLight = player.type === 'light';
    const img = isLight ? ASSETS.luxar_sheet : ASSETS.tenebre_idle_sheet; // Tenebre uses dynamic

    if (isActive) {
      glow(isLight ? COLOR.luxarGlow : COLOR.tenebreGlow, 30);
    }

    if (!isLight) {
      // Aura de energia roxa (Radial Gradient) - Garante visibilidade real e mística
      ctx.save();
      const auraPulse = 0.35 + 0.1 * Math.sin(time * 3.5);
      const rad = 80;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(150, 60, 255, ${auraPulse})`);
      grad.addColorStop(0.6, `rgba(150, 60, 255, ${auraPulse * 0.4})`);
      grad.addColorStop(1, 'rgba(150, 60, 255, 0)');

      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = 'screen'; // Faz o roxo brilhar de forma mágica sobre o cenário
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);
    if (player.facing === -1) ctx.scale(-1, 1);

    if (isLight ? (img && img.complete && img.naturalWidth > 0) : true) {
      if (isLight) {
        // Luxar: sheet ORIGINAL com 30 colunas × 3 linhas (idle=0, walk=1, jump=2)
        // currentFrame vai de 0-29, cada linha tem 30 frames completos
        const totalCols = 30;
        const totalRows = 3;
        const sW = img.naturalWidth / totalCols;
        const sH = img.naturalHeight / totalRows;
        const frameIdx = Math.min(player.currentFrame || 0, 29);
        const rowIdx = Math.min(player.animState || 0, 2);
        const sx = frameIdx * sW;
        const sy = rowIdx * sH;
        const destH = player.h * 3.5;
        const destW = (sW / sH) * destH;
        ctx.drawImage(img, sx, sy, sW, sH, -destW / 2, (player.h / 2) - destH, destW, destH);
      } else {
        // Tenebre: assets individuais para cada ação (todas com 6 colunas)
        let currentImg = ASSETS.tenebre_idle_sheet;
        let totalCols = 6;
        let totalRows = 2;
        let rowIdxOffset = 0;

        if (player.animState === 0 && ASSETS.tenebre_idle_sheet.complete) {
          // IDLE normal
          currentImg = ASSETS.tenebre_idle_sheet;
          totalRows = 2;
        } else if (player.animState === 4 && ASSETS.tenebre_idle_time.complete) {
          // IDLE TIME especial
          currentImg = ASSETS.tenebre_idle_time;
          totalRows = 1;
        } else if (player.animState === 2 && ASSETS.tenebre_jump_sheet.complete) {
          // JUMP
          currentImg = ASSETS.tenebre_jump_sheet;
          totalRows = 2;
        } else if (player.animState === 1 && ASSETS.tenebre_walk_sheet.complete) {
          // WALK
          currentImg = ASSETS.tenebre_walk_sheet;
          totalRows = 2;
          rowIdxOffset = 0; // A animacao real esta exatamente na PRIMEIRA linha (indice 0)!
        }

        if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
          const sW = currentImg.naturalWidth / totalCols;
          const sH = currentImg.naturalHeight / totalRows;

          let safeFrame = player.currentFrame || 0;
          safeFrame = Math.min(safeFrame, (totalCols * totalRows) - 1); // Clamp no máximo de frames da planilha

          const frameCol = safeFrame % totalCols;
          let finalRowIdx = Math.floor(safeFrame / totalCols) + rowIdxOffset;
          finalRowIdx = Math.min(finalRowIdx, totalRows - 1);

          const sx = frameCol * sW;
          const sy = finalRowIdx * sH;

          // Mantém a proporção do frame (sW/sH)
          const destH = player.h * 3.5;
          const destW = (sW / sH) * destH;
          const yOffsetTenebre = 20; // Abaixa o sprite para colar no chão
          ctx.drawImage(currentImg, sx, sy, sW, sH, -destW / 2, (player.h / 2) - destH + yOffsetTenebre, destW, destH);
        } else {
          ctx.fillStyle = COLOR.tenebre;
          ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
        }
      }
    } else {
      ctx.fillStyle = isLight ? COLOR.luxar : COLOR.tenebre;
      ctx.fillRect(-player.w / 2, -player.h / 2, player.w, player.h);
    }
    ctx.restore();
    noGlow();
  }

  // ── Partículas dos cristais ───────────────────────────────────────────

  function drawLumaBridge(bridge, ox, oy, time) {
    if (!bridge || !bridge.visible) return;
    const x = bridge.x + ox;
    const y = bridge.y + oy;
    const w = bridge.w;

    // Altura visual é apenas uma linha fina e firme para Tenebre caminhar,
    // garantindo colisão sem preencher a tela com blocos embaixo.
    const h = 4;

    const pulse = 0.6 + 0.4 * Math.sin(time * 3.0);
    const pulse2 = 0.5 + 0.5 * Math.sin(time * 2.2 + 1.2);

    ctx.save();

    // ── Camada de glow de fundo amarela ──────────────────────────────────
    const glowGrad = ctx.createLinearGradient(x, y - 20, x, y + 20);
    glowGrad.addColorStop(0, `rgba(255, 200, 0, 0)`);
    glowGrad.addColorStop(0.5, `rgba(255, 220, 50, ${0.4 * pulse})`);
    glowGrad.addColorStop(1, `rgba(255, 200, 0, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x, y - 20, w, 40);

    // ── Linha central de luz firme (amarelo brilhante) ───────────────────
    ctx.shadowColor = `rgba(255, 215, 0, 0.9)`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 240, 150, ${0.8 + 0.2 * pulse})`;
    ctx.fillRect(x, y, w, h);

    // ── Linha de energia rasteira animada por cima ───────────────────────
    ctx.shadowColor = `rgba(255, 255, 100, 1.0)`;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(255, 255, 200, ${0.7 + 0.3 * pulse2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.lineDashOffset = -time * 100; // Corre para a direita
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Partículas subindo firmes (Douradas e Amarelas) ──────────────────
    noGlow();
    ctx.shadowColor = `rgba(255, 200, 0, 0.9)`;
    ctx.shadowBlur = 12;
    for (let i = 0; i < 14; i++) {
      const seed = i * 137.5;
      const px = x + ((seed + time * 40 * (1 + i % 3)) % w);
      const py = y - 6 - (i % 5) * 6 - Math.sin(time * 2.5 + i) * 8;
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.8 + i * 0.7));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 3 === 0 ? '#fffacd' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    noGlow();
    ctx.restore();
  }

  const crystalParticles = {};

  function spawnCrystalParticles(id, cx, cy) {
    if (!crystalParticles[id]) crystalParticles[id] = [];
    // Limpa e repovoa com burst inicial
    crystalParticles[id] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      crystalParticles[id].push({
        x: cx, y: cy,
        vx: Math.cos(angle) * (60 + Math.random() * 120),
        vy: Math.sin(angle) * (60 + Math.random() * 120) - 80,
        life: 1.0,
        decay: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 6,
        burst: true,  // partícula do burst inicial
      });
    }
  }

  function updateAndDrawCrystalParticles(id, cx, cy, time, dt) {
    if (!crystalParticles[id]) crystalParticles[id] = [];
    const parts = crystalParticles[id];

    // Emite partículas orbitais contínuas
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 20;
      parts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: Math.cos(angle) * 15,
        vy: -(30 + Math.random() * 50),
        life: 1.0,
        decay: 0.8 + Math.random() * 0.8,
        size: 2 + Math.random() * 4,
        burst: false,
      });
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.burst) p.vy -= 20 * dt; // leve flutuação para cima
      p.vx *= 0.97;

      const alpha = p.burst ? p.life * 0.8 : p.life;
      ctx.save();
      ctx.globalAlpha = alpha;
      glow(COLOR.crystalActive, 12);
      ctx.fillStyle = p.life > 0.5 ? '#ffffaa' : COLOR.crystalActive;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      noGlow();
      ctx.restore();
    }
  }

  // ── Partículas de Poeira (Movimento) ──────────────────────────────────
  const dustParticles = [];

  function spawnDust(x, y, color = 'rgba(200, 200, 200, 0.6)') {
    dustParticles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      vx: (Math.random() - 0.5) * 40,
      vy: -(10 + Math.random() * 20),
      life: 1.0,
      color: color,
      size: 2 + Math.random() * 4
    });
  }

  function updateAndDrawDust(dt) {
    ctx.save();
    noGlow();
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.life -= dt * 2.0; // Meio segundo de vida
      if (p.life <= 0) {
        dustParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCrystal(crystal, ox, oy, time, dt) {
    const cx = crystal.x + crystal.w / 2 + ox;
    const cy = crystal.y + crystal.h / 2 + oy;
    const x = crystal.x + ox;
    const y = crystal.y + oy;

    if (crystal.activated) {
      // ── Glow pulsante radial ────────────────────────────────
      const pulse = 1 + 0.25 * Math.sin(time * 5);
      const glowR = crystal.w * 1.2 * pulse;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grad.addColorStop(0, 'rgba(200, 168, 92, 0.55)');
      grad.addColorStop(0.5, 'rgba(200, 168, 92, 0.18)');
      grad.addColorStop(1, 'rgba(200, 168, 92, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // ── Cristal desenhado com glow forte ───────────────────
      glow(COLOR.crystalActive, 30 * pulse);
      const img = ASSETS.crystal_active;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, crystal.w, crystal.h);
      } else {
        ctx.fillStyle = COLOR.crystalActive;
        ctx.fillRect(x, y, crystal.w, crystal.h);
      }
      noGlow();

      // ── Anel de orbita ─────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = `rgba(200, 168, 92, ${0.3 + 0.2 * Math.sin(time * 4)})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, crystal.w * 0.75 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Partículas ─────────────────────────────────────────
      updateAndDrawCrystalParticles(crystal.id, cx, cy, time, dt || 0.016);

    } else {
      // Cristal inativo — levemente brilhante e pulsante para indicar interatividade
      const idlePulse = 0.6 + 0.4 * Math.sin(time * 2 + (crystal.x * 0.01));
      glow(COLOR.crystal, 8 * idlePulse);
      const img = ASSETS.crystal_idle;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.7 + 0.3 * idlePulse;
        ctx.drawImage(img, x, y, crystal.w, crystal.h);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = COLOR.crystal;
        ctx.globalAlpha = 0.7 + 0.3 * idlePulse;
        ctx.fillRect(x, y, crystal.w, crystal.h);
        ctx.globalAlpha = 1.0;
      }
      noGlow();
    }
  }

  function drawEchoPlatform(plat, ox, oy) {
    if (!plat.active) return;
    const x = plat.x + ox; const y = plat.y + oy;
    ctx.save();
    ctx.globalAlpha = plat.visible ? 1.0 : 0.25;
    if (ASSETS.platform_echo && ASSETS.platform_echo.complete && ASSETS.platform_echo.naturalWidth > 0) {
      ctx.drawImage(ASSETS.platform_echo, x, y, plat.w, plat.h);
    } else {
      ctx.fillStyle = COLOR.luxarGlow;
      ctx.fillRect(x, y, plat.w, plat.h);
    }
    ctx.restore();
  }

  function drawBox(box, ox, oy) {
    if (!box.active) return;
    const x = box.x + ox; const y = box.y + oy;
    if (ASSETS.heavy_box && ASSETS.heavy_box.complete && ASSETS.heavy_box.naturalWidth > 0) {
      ctx.drawImage(ASSETS.heavy_box, x, y, box.w, box.h);
    } else {
      ctx.fillStyle = COLOR.box;
      ctx.fillRect(x, y, box.w, box.h);
    }
  }

  function drawButton(btn, ox, oy) {
    const x = btn.x + ox; const y = btn.y + oy;
    if (ASSETS.btn_pressure && ASSETS.btn_pressure.complete && ASSETS.btn_pressure.naturalWidth > 0) {
      const drawY = btn.pressed ? y + btn.h * 0.2 : y;
      const drawH = btn.pressed ? btn.h * 0.8 : btn.h;
      ctx.drawImage(ASSETS.btn_pressure, x, drawY, btn.w, drawH);
    } else {
      ctx.fillStyle = btn.pressed ? COLOR.button : '#444';
      ctx.fillRect(x, y, btn.w, btn.h);
    }
  }

  function drawPlatform(plat, ox, oy, act) {
    ctx.save(); ctx.translate(ox, oy);
    ctx.globalAlpha = plat.active ? 1.0 : 0.5;

    // Portão Estático (isDoor: true)
    if (plat.isDoor) {
      if (plat.active) {
        ctx.restore();
        return;
      }
      if (ASSETS.gate_iron && ASSETS.gate_iron.complete && ASSETS.gate_iron.naturalWidth > 0) {
        if (!PATTERNS['gate_iron']) {
          PATTERNS['gate_iron'] = ctx.createPattern(ASSETS.gate_iron, 'repeat');
        }
        ctx.fillStyle = PATTERNS['gate_iron'];
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#222';
        ctx.fillRect(plat.x + 4, plat.y + 4, plat.w - 8, plat.h - 8);
      }
      ctx.restore();
      return;
    }

    // ── Portão Animado com Spritesheet (isAnimatedGate) ──────────────────────
    // Fica FIXO no chão. Usa "portao abrindo.png" (6 frames) ao abrir e
    // "portao fechando.png" (6 frames) ao fechar. Colisão controlada pelo caller.
    if (plat.isAnimatedGate) {
      ctx.globalAlpha = 1.0;

      const TOTAL_FRAMES = 6;
      const t = Math.max(0, Math.min(1, plat._t || 0));
      const prevT = (plat._prevT !== undefined) ? plat._prevT : t;
      const isOpening = (t >= prevT);

      // portao abrindo.png: frame0=fechado → frame5=aberto
      // portao fechando.png: frame0=aberto  → frame5=fechado
      let frameIdx;
      if (isOpening) {
        frameIdx = Math.min(TOTAL_FRAMES - 1, Math.floor(t * TOTAL_FRAMES));
      } else {
        frameIdx = Math.min(TOTAL_FRAMES - 1, Math.floor((1 - t) * TOTAL_FRAMES));
      }

      const img = isOpening ? ASSETS.portao_abrindo : ASSETS.portao_fechando;
      const gx = plat.startX;
      const gy = plat.startY;
      const gw = plat.w;
      const gh = plat.h;

      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = img.naturalWidth / TOTAL_FRAMES;
        const frameH = img.naturalHeight;
        ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, gx, gy, gw, gh);
      } else {
        ctx.fillStyle = `rgba(58,58,66,${0.2 + (1 - t) * 0.8})`;
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#555568';
        ctx.lineWidth = 4;
        const bars = Math.max(2, Math.floor(gw / 24));
        for (let i = 0; i <= bars; i++) {
          const bx2 = gx + (gw / bars) * i;
          ctx.beginPath(); ctx.moveTo(bx2, gy + 4); ctx.lineTo(bx2, gy + gh - 4); ctx.stroke();
        }
      }

      // Glow dourado enquanto animando
      if (t > 0.05 && t < 0.95) {
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = 'rgba(255,170,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      return;
    }

    // ── Portão de Ferro Deslizante (isIronGate: sobe verticalmente) ──────────
    if (plat.isIronGate) {
      ctx.globalAlpha = 1.0;

      // ── Trilhos verticais fixos ───────────────────────────────────────────
      const railX1 = plat.startX + 4;
      const railX2 = plat.startX + plat.w - 8;
      const railTop = Math.min(plat.startY, plat.endY) - 20;
      const railBot = plat.startY + plat.h;

      // Sombra dos trilhos
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(railX1, railTop); ctx.lineTo(railX1, railBot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(railX2, railTop); ctx.lineTo(railX2, railBot); ctx.stroke();

      // Trilhos principais
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#3a3a4a';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(railX1, railTop); ctx.lineTo(railX1, railBot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(railX2, railTop); ctx.lineTo(railX2, railBot); ctx.stroke();

      // Brilho metálico nos trilhos
      ctx.strokeStyle = 'rgba(120,120,150,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(railX1 - 1, railTop); ctx.lineTo(railX1 - 1, railBot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(railX2 - 1, railTop); ctx.lineTo(railX2 - 1, railBot); ctx.stroke();

      // ── Portão (asset ou fallback) ────────────────────────────────────────
      if (ASSETS.gate_iron && ASSETS.gate_iron.complete && ASSETS.gate_iron.naturalWidth > 0) {
        const img = ASSETS.gate_iron;
        ctx.drawImage(img, plat.x, plat.y, plat.w, plat.h);
      } else {
        const gx = plat.x, gy = plat.y, gw = plat.w, gh = plat.h;
        ctx.fillStyle = '#3a3a42';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#555568';
        ctx.lineWidth = 4;
        const hbars = Math.max(2, Math.floor(gh / 24));
        for (let i = 0; i <= hbars; i++) {
          const by = gy + (gh / hbars) * i;
          ctx.beginPath(); ctx.moveTo(gx + 4, by); ctx.lineTo(gx + gw - 4, by); ctx.stroke();
        }
        const vbars2 = Math.max(2, Math.floor(gw / 24));
        for (let i = 0; i <= vbars2; i++) {
          const bx = gx + (gw / vbars2) * i;
          ctx.beginPath(); ctx.moveTo(bx, gy + 4); ctx.lineTo(bx, gy + gh - 4); ctx.stroke();
        }
        ctx.strokeStyle = '#666680';
        ctx.lineWidth = 3;
        ctx.strokeRect(gx, gy, gw, gh);
        [[gx + 8, gy + 8], [gx + gw - 8, gy + 8], [gx + 8, gy + gh - 8], [gx + gw - 8, gy + gh - 8]].forEach(([rx, ry]) => {
          ctx.fillStyle = '#888890';
          ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
        });
      }

      // ── CORDA / CORRENTE que puxa o portão ───────────────────────────────
      // Ponto de ancoragem: topo do portão (centro)
      const ropeAnchorX = plat.x + plat.w / 2;
      const ropeAnchorY = plat.y; // Topo do portão (move junto)

      // Ponto da roldana: fixo no teto, diretamente acima do ponto de partida
      const pulleyX = plat.startX + plat.w / 2;
      const pulleyY = railTop - 10;

      // ── Roldana (polia) no teto ───────────────────────────────────────────
      ctx.save();

      // Suporte da roldana (viga)
      ctx.fillStyle = '#2a2028';
      ctx.fillRect(pulleyX - 20, pulleyY - 12, 40, 14);

      // Corpo da roldana
      ctx.shadowColor = 'rgba(200,160,80,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#6a5a3a';
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Anel interno da roldana (sulco)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#4a3a20';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pulleyX, pulleyY, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Brilho metálico da roldana
      ctx.strokeStyle = 'rgba(220,180,100,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pulleyX - 3, pulleyY - 3, 5, Math.PI * 1.2, Math.PI * 1.9);
      ctx.stroke();

      ctx.restore();

      // ── Corrente metálica (elos ovais alternados) ─────────────────────────
      // A corrente vai do topo do portão até a roldana
      const chainStartX = ropeAnchorX;
      const chainStartY = ropeAnchorY;
      const chainEndX   = pulleyX;
      const chainEndY   = pulleyY;

      const totalDist = Math.hypot(chainEndX - chainStartX, chainEndY - chainStartY);
      const LINK_SIZE = 14; // tamanho de cada elo em pixels
      const numLinks  = Math.max(2, Math.ceil(totalDist / LINK_SIZE));

      ctx.save();

      // Oscilação leve da corrente quando em movimento
      const isMoving = plat.active && plat._t > 0 && plat._t < 1;
      const swingTime = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
      const swing = isMoving ? Math.sin(swingTime * 8) * 6 * (plat._t * (1 - plat._t) * 4) : 0;

      // Ponto de controle para curva da corrente (meia distância, com swing lateral)
      const midX = (chainStartX + chainEndX) / 2 + swing;
      const midY = (chainStartY + chainEndY) / 2;

      for (let i = 0; i <= numLinks; i++) {
        const frac = i / numLinks;
        // Interpolação quadrática (Bezier) para dar curvatura natural à corrente
        const bx = (1 - frac) * (1 - frac) * chainStartX + 2 * (1 - frac) * frac * midX + frac * frac * chainEndX;
        const by = (1 - frac) * (1 - frac) * chainStartY + 2 * (1 - frac) * frac * midY + frac * frac * chainEndY;

        // Ângulo do elo baseado no trecho da curva
        const nextFrac = Math.min(1, frac + 1 / numLinks);
        const nbx = (1 - nextFrac) * (1 - nextFrac) * chainStartX + 2 * (1 - nextFrac) * nextFrac * midX + nextFrac * nextFrac * chainEndX;
        const nby = (1 - nextFrac) * (1 - nextFrac) * chainStartY + 2 * (1 - nextFrac) * nextFrac * midY + nextFrac * nextFrac * chainEndY;
        const angle = Math.atan2(nby - by, nbx - bx);

        // Alterna horizontal/vertical para dar efeito de elo de corrente real
        const linkAngle = i % 2 === 0 ? angle : angle + Math.PI / 2;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(linkAngle);

        // Sombra do elo
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;

        // Elo oval preenchido
        ctx.fillStyle = i % 2 === 0 ? '#7a6840' : '#8a7850';
        ctx.beginPath();
        ctx.ellipse(0, 0, LINK_SIZE / 2, LINK_SIZE / 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Contorno do elo
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#4a3a20';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Brilho no topo do elo
        ctx.strokeStyle = 'rgba(220,180,90,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(-1, -2, LINK_SIZE / 3.5, LINK_SIZE / 6, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        ctx.restore();
      }

      // ── Argola de conexão no topo do portão ──────────────────────────────
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#5a4a2a';
      ctx.beginPath();
      ctx.arc(chainStartX, chainStartY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#8a7040';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // ── Glow laranja enquanto desliza ─────────────────────────────────────
      if (isMoving) {
        ctx.shadowColor = '#ff6a00';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255,106,0,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      return;
    }

    // ── Elevador com Trilhos (isElevator) ─────────────────────────────────────
    if (plat.isElevator) {
      ctx.globalAlpha = 1.0;
      const ex = plat.x + ox, ey = plat.y + oy, ew = plat.w, eh = plat.h;

      const img = ASSETS.elevator_ancestral;
      if (img && img.complete && img.naturalWidth > 0) {
        // Reajuste para 6 frames verticais para dar sensação de movimento de subida
        const totalFrames = 6;
        const sW = img.naturalWidth;
        const sH = img.naturalHeight / totalFrames;

        const timeGlobal = Date.now() / 1000;
        const fps = 10;
        const currentFrame = Math.floor(timeGlobal * fps) % totalFrames;

        // Renderiza no tamanho exato do tile do elevador (sem escala extra)
        ctx.drawImage(img, 0, currentFrame * sH, sW, sH, ex, ey, ew, eh);
      } else {
        ctx.fillStyle = '#4b5320'; // Moss green fallback
        ctx.fillRect(ex, ey, ew, eh);
      }

      // Animação de subida mística
      if (plat.active && plat._t > 0 && plat._t < 1) {
        const time = Date.now() / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(time * 5);

        // Runas e bordas mágicas
        ctx.shadowColor = `rgba(100, 255, 200, ${0.8 * pulse})`;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(100, 255, 200, ${0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(ex, ey, ew, eh);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Poeira leve e partículas subindo
        ctx.fillStyle = `rgba(150, 255, 200, 0.7)`;
        for (let i = 0; i < 12; i++) {
          let px = ex + ((i * 37 + time * 15) % ew);
          let py = ey + eh - ((time * 40 * (1 + i % 3)) % (eh * 0.8));
          ctx.beginPath(); ctx.arc(px, py, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      return;
    }

    const patKey = 'act' + act + '_plat';
    let img = ASSETS[patKey];
    if (img && img.complete && img.naturalWidth > 0) {
      if (!PATTERNS[patKey]) PATTERNS[patKey] = ctx.createPattern(img, 'repeat');
      const pattern = PATTERNS[patKey];
      const matrix = new DOMMatrix().translate(plat.x, plat.y).scale(0.25, 0.25);
      pattern.setTransform(matrix);
      ctx.fillStyle = pattern;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }
    ctx.restore();
  }

  function drawPortal(portal, ox, oy, time) {
    if (!portal.active) return;

    const cx = portal.x + ox + portal.w / 2;
    const cy = portal.y + oy + portal.h / 2;
    const x = portal.x + ox;
    const y = portal.y + oy;
    const r = portal.w / 2;
    const pulse = 1 + 0.18 * Math.sin(time * 4);

    // ── Sprite sheet do portal: 1024×1024, grid 4 cols × 4 rows = 16 frames ──
    const img = ASSETS.portal;
    if (img && img.complete && img.naturalWidth > 0) {
      glow('#4ADEDE', 50 * pulse);
      const COLS = 4, ROWS = 4; // 16 frames total
      const sW = img.naturalWidth / COLS; // 256px
      const sH = img.naturalHeight / ROWS; // 256px (quadrado)
      const frame = (portal.currentFrame || 0) % 16;
      const sx = (frame % COLS) * sW;
      const sy = Math.floor(frame / COLS) * sH;
      ctx.drawImage(img, sx, sy, sW, sH, x, y, portal.w, portal.h);
      noGlow();
    }

    // Halo radial de brilho
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5 * pulse);
    grad.addColorStop(0, 'rgba(74, 222, 222, 0.45)');
    grad.addColorStop(1, 'rgba(74, 222, 222, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2); ctx.fill();

    // Partículas orbitais
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * 0.8;
      const radius = r * (0.5 + 0.5 * ((time * 0.7 + i * 0.5) % 1));
      const alpha = 1 - ((time * 0.7 + i * 0.5) % 1);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      glow('#4ADEDE', 12);
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#ccffff';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      noGlow();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawTether(light, heavy, ox, oy, strength) {
    const x1 = light.x + light.w / 2 + ox; const y1 = light.y + light.h / 2 + oy;
    const x2 = heavy.x + heavy.w / 2 + ox; const y2 = heavy.y + heavy.h / 2 + oy;
    ctx.strokeStyle = `rgba(180,180,255,${0.1 + strength * 0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawLevelUI(levelData, time, goalShown) {
    if (goalShown && levelData.goalText) {
      ctx.save();
      ctx.fillStyle = 'rgba(10,10,18,0.7)';
      ctx.fillRect(0, H - 60, W, 60);
      ctx.fillStyle = '#F2EDD7';
      ctx.font = '20px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(levelData.goalText, W / 2, H - 30);
      ctx.restore();
    }
    if (levelData.wind) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,220,255,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const wy = (time * 150 + i * 200) % H;
        ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy + (Math.sin(time + i) * 50)); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawMergeEffect(cx, cy, progress) {
    const r = progress * 600;
    const alpha = 1 - progress;
    glow(COLOR.luxarGlow, 40);
    ctx.strokeStyle = `rgba(180,140,255,${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    noGlow();
    if (progress > 0.8) {
      const flashAlpha = (progress - 0.8) * 5;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawCinematic(cx, cy, progress) {
    ctx.save();

    // Guarda posição para usar nos raios do drawPostExplosion
    _fusionCX = cx;
    _fusionCY = cy;

    // ── Efeito procedural de fusão: anéis concêntricos crescendo do centro ──
    const eased = 1 - Math.pow(1 - progress, 3);
    const maxR = Math.hypot(W, H) * 0.65;

    // ── 1. Escurecer o fundo para destacar os anéis ──────────────
    ctx.globalAlpha = Math.min(0.55, eased * 0.7);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1.0;

    // ── 2. Anéis dourados/azuis concêntricos ──────────────────────
    const ringColors = [
      { r: 1.00, g: 0.85, b: 0.50 },
      { r: 0.90, g: 0.75, b: 0.40 },
      { r: 0.70, g: 0.90, b: 1.00 },
    ];
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.12;
      const ringProgress = Math.max(0, Math.min(1, (eased - offset) / (1 - offset)));
      const ringR = maxR * ringProgress;
      const ringThickness = Math.max(4, 50 * (1 - ringProgress * 0.7));
      const alpha = (1 - ringProgress * 0.6) * Math.min(1, progress * 6);
      const c = ringColors[i];
      if (ringR <= 0) continue;
      const grad = ctx.createRadialGradient(cx, cy, Math.max(0, ringR - ringThickness), cx, cy, ringR + ringThickness * 0.5);
      grad.addColorStop(0, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0)`);
      grad.addColorStop(0.4, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha})`);
      grad.addColorStop(0.7, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha * 0.7})`);
      grad.addColorStop(1, `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR + ringThickness * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 3. Núcleo branco GRANDE brilhante no centro ───────────────
    // Cresce de 30px até 400px — bem maior que antes
    const coreR = 30 + eased * 400;
    const coreAlpha = Math.min(1, progress * 5);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
    coreGrad.addColorStop(0.25, `rgba(255, 255, 255, ${coreAlpha * 0.95})`);
    coreGrad.addColorStop(0.55, `rgba(255, 240, 200, ${coreAlpha * 0.7})`);
    coreGrad.addColorStop(0.8, `rgba(255, 200, 120, ${coreAlpha * 0.25})`);
    coreGrad.addColorStop(1, `rgba(255, 200, 120, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // ── 4. Flash branco total nos últimos 8% ──────────────────────
    if (progress > 0.92) {
      const flashAlpha = (progress - 0.92) / 0.08;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  let cinematicParticles = [];
  let _lightningTimer = 0;
  let _lightningBolts = []; // Raios persistentes no ponto do portal

  function _generateLightningBolt(ox, oy) {
    const angle = Math.random() * Math.PI * 2;
    const len = 80 + Math.random() * 160;
    const segs = 6 + Math.floor(Math.random() * 5);
    const points = [{ x: ox, y: oy }];
    let px = ox, py = oy;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      px = ox + Math.cos(angle) * len * t + (Math.random() - 0.5) * 40;
      py = oy + Math.sin(angle) * len * t + (Math.random() - 0.5) * 40;
      points.push({ x: px, y: py });
    }
    return { points, life: 0.5 + Math.random() * 0.4, decay: 2.5 + Math.random() };
  }

  function drawPostExplosion(timer, dt) {
    // Fundo escurece para revelar as partículas (começa branco e esfria para escuro)
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);

    const flashAlpha = Math.max(0, 1 - (timer / 2.0));
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Raios brilhantes no ponto do portal (onde estava a fusão) ────────────
    const rox = _fusionCX !== null ? _fusionCX : W / 2;
    const roy = _fusionCY !== null ? _fusionCY : H / 2;
    // Só aparecem nos primeiros 6 segundos da fase de partículas
    if (timer < 6.0 && flashAlpha < 0.8) {
      _lightningTimer += dt;
      // Gera novo raio a cada 0.15s aproximadamente
      if (_lightningTimer > 0.15 + Math.random() * 0.1) {
        _lightningTimer = 0;
        if (_lightningBolts.length < 12) {
          _lightningBolts.push(_generateLightningBolt(rox, roy));
          if (typeof AudioManager !== 'undefined') {
            AudioManager.playFX('lightning', getPan(rox), 0.6);
          }
        }
      }
      // Desenha e atualiza raios
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = _lightningBolts.length - 1; i >= 0; i--) {
        const bolt = _lightningBolts[i];
        bolt.life -= bolt.decay * dt;
        if (bolt.life <= 0) { _lightningBolts.splice(i, 1); continue; }
        const bAlpha = bolt.life;
        // Alterna entre azul e dourado
        const bColor = i % 2 === 0 ? `rgba(180, 220, 255, ${bAlpha})` : `rgba(255, 220, 100, ${bAlpha})`;
        ctx.strokeStyle = bColor;
        ctx.lineWidth = 1.5 + bolt.life * 2;
        ctx.shadowColor = bColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let p = 1; p < bolt.points.length; p++) {
          ctx.lineTo(bolt.points[p].x, bolt.points[p].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (timer >= 6.0) {
      _lightningBolts = []; // Limpa raios após 6s
    }

    // Partículas brilhantes amarelas e roxas
    if (cinematicParticles.length === 0) {
      for (let i = 0; i < 200; i++) { // Reduzido para 200 para não travar o jogo (o que esticava os 10s)
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 600 + 200;
        cinematicParticles.push({
          x: W / 2 + Math.cos(angle) * 50,
          y: H / 2 + Math.sin(angle) * 50,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 6 + 2,
          color: Math.random() > 0.5 ? '#FFD700' : '#9932CC', // Amarelas ou Roxas
          life: 1.0,
          decay: 0.05 + Math.random() * 0.1 // Podem durar até 10-20 segundos
        });
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; // Blend normal para aparecer bem

    for (let p of cinematicParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Fricção (menos no eixo Y para permitir queda)
      p.vx *= 0.95;
      p.vy *= 0.98;

      // Efeito de queda gravitacional (caindo ao invés de subir)
      p.vy += 60 * dt;

      p.life -= p.decay * dt;
      if (p.life > 0) {
        // ShadowBlur removido para evitar travamentos que faziam 10s durar muito mais
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.restore();

    // ── Aunidade: aparece após os raios (~2s), pisca com aura mística ────────
    // Surge a partir de 1.8s (quando flash some e raios já apareceram)
    if (timer >= 1.8 && flashAlpha < 0.5) {
      const img = ASSETS.aunidade;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();

        // Tempo local para animações independentes
        const t = timer;

        // Fade-in suave nos primeiros 1.5s após o surgimento
        const fadeIn = Math.min(1.0, (timer - 1.8) / 1.5);

        // Piscar: nos primeiros 4s pisca rápido, depois fica mais estável
        let blinkAlpha;
        if (timer < 5.0) {
          blinkAlpha = 0.5 + 0.5 * Math.sin(t * Math.PI * 10);
        } else {
          blinkAlpha = 0.75 + 0.25 * Math.sin(t * Math.PI * 2);
        }
        const finalAlpha = fadeIn * blinkAlpha;

        // Tamanho do personagem — centralizado e bem visível
        const charH = H * 0.70;
        const charW = (img.naturalWidth / img.naturalHeight) * charH;
        const charX = W / 2 - charW / 2;
        const charY = H / 2 - charH / 2;

        const auraCX = W / 2;
        const auraCY = H / 2;
        const auraPulse = 0.7 + 0.3 * Math.sin(t * 3.5);
        const auraR = (charW * 0.65) * auraPulse;

        // ── Camada 1: Glow difuso externo (dourado-branco) ──────────────────
        const auraGrad = ctx.createRadialGradient(auraCX, auraCY, auraR * 0.15, auraCX, auraCY, auraR * 2.0);
        auraGrad.addColorStop(0, `rgba(255, 240, 180, ${0.6 * finalAlpha * auraPulse})`);
        auraGrad.addColorStop(0.4, `rgba(255, 210, 100, ${0.4 * finalAlpha * auraPulse})`);
        auraGrad.addColorStop(0.75, `rgba(200, 150, 255, ${0.2 * finalAlpha})`);
        auraGrad.addColorStop(1, `rgba(150,  80, 255, 0)`);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(auraCX, auraCY, auraR * 1.8, auraR * 2.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Camada 2: Anéis de energia orbitando ────────────────────────────
        const ringAngle = t * 1.5;
        ctx.save();
        // Anel dourado (horizontal)
        ctx.translate(auraCX, auraCY);
        ctx.rotate(ringAngle);
        ctx.strokeStyle = `rgba(255, 220, 80, ${0.75 * finalAlpha * auraPulse})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(255, 200, 50, 0.9)`;
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.ellipse(0, 0, auraR * 1.3, auraR * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Anel roxo (perpendicular)
        ctx.save();
        ctx.translate(auraCX, auraCY);
        ctx.rotate(-ringAngle * 0.7);
        ctx.strokeStyle = `rgba(180, 120, 255, ${0.55 * finalAlpha * auraPulse})`;
        ctx.shadowColor = `rgba(180, 100, 255, 0.8)`;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, auraR * 0.5, auraR * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // ── Camada 3: Raios de Choque Elétrico emanando do personagem ────────
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const numBolts = 12;
        for (let i = 0; i < numBolts; i++) {
          const boltPhase = (t * 8 + i * 0.9) % 1.0;
          if (boltPhase > 0.5) continue;

          const originAngle = (i / numBolts) * Math.PI * 2 + t * 0.4;
          const ox2 = auraCX + Math.cos(originAngle) * auraR * 0.7;
          const oy2 = auraCY + Math.sin(originAngle) * auraR * 0.9;

          const boltLen = 60 + Math.abs(Math.sin(t * 5 + i * 1.3)) * 120;
          const segs = 5 + Math.floor(Math.random() * 4);
          const outAngle = originAngle + (Math.random() - 0.5) * 0.8;

          const pts = [{ x: ox2, y: oy2 }];
          for (let s = 1; s <= segs; s++) {
            const frac = s / segs;
            pts.push({
              x: ox2 + Math.cos(outAngle) * boltLen * frac + (Math.random() - 0.5) * 35,
              y: oy2 + Math.sin(outAngle) * boltLen * frac + (Math.random() - 0.5) * 35,
            });
          }

          const boltAlpha = finalAlpha * (0.6 + 0.4 * (1 - boltPhase * 2));
          const bColor = i % 3 === 0
            ? `rgba(180, 220, 255, ${boltAlpha})`
            : i % 3 === 1
              ? `rgba(255, 230, 80, ${boltAlpha})`
              : `rgba(220, 150, 255, ${boltAlpha})`;

          ctx.strokeStyle = bColor;
          ctx.lineWidth = 1.0 + boltAlpha * 2.5;
          ctx.shadowColor = bColor;
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, ${boltAlpha * 0.9})`;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(ox2, oy2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.restore();

        // ── Personagem Aunidade ──────────────────────────────────────────────
        ctx.globalAlpha = finalAlpha;
        ctx.shadowColor = `rgba(255, 220, 100, ${0.85 * auraPulse})`;
        ctx.shadowBlur = 50;
        ctx.drawImage(img, charX, charY, charW, charH);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        ctx.restore();
      }
    }
  }

  function drawFinalScreen(textAlpha) {
    const intensity = Math.floor(255 * (1 - textAlpha));
    ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(242, 237, 215, ${textAlpha})`;
    ctx.font = '50px "Cinzel", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NÃO ÉRAMOS INCOMPLETOS...', W / 2, H / 2 - 40);
    ctx.fillText('APENAS SEPARADOS.', W / 2, H / 2 + 40);
  }

  // ── SISTEMA DE ILUMINAÇÃO DINÂMICA ────────────────────

  function drawLightingPass(entities, act, ox, oy, time) {
    if (!lightingCtx || (typeof Settings !== 'undefined' && !Settings.isLightingEnabled())) return;

    // 1. Definir Luz Ambiente por Ato
    const ambientLevels = { 1: 0.25, 2: 0.15, 3: 0.1 };
    const ambient = ambientLevels[act] || 0.2;

    lightingCtx.clearRect(0, 0, W, H);
    lightingCtx.fillStyle = `rgba(5, 5, 15, ${1 - ambient})`;
    lightingCtx.fillRect(0, 0, W, H);

    // 2. Desenhar Point Lights (Máscaras de Transparência)
    lightingCtx.globalCompositeOperation = 'destination-out';

    entities.forEach(ent => {
      if (!ent || ent.alive === false || !ent.lightConfig) return;

      const lx = ent.x + ent.w / 2 + ox;
      const ly = ent.y + ent.h / 2 + oy;
      const config = ent.lightConfig;

      // Efeito de pulsação/flicker
      let radius = config.radius;
      if (config.pulse) radius *= (1 + Math.sin(time * 4) * config.pulse);
      if (config.flicker) radius *= (0.95 + Math.random() * 0.1);

      // No caso do cristal, muda cor se ativado
      if (ent instanceof Crystal && ent.activated) {
        config.color = '#F2EDD7';
        radius *= 1.5;
      }

      const grad = lightingCtx.createRadialGradient(lx, ly, 0, lx, ly, radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${config.intensity})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      lightingCtx.fillStyle = grad;
      lightingCtx.beginPath();
      lightingCtx.arc(lx, ly, radius, 0, Math.PI * 2);
      lightingCtx.fill();
    });

    lightingCtx.globalCompositeOperation = 'source-over';

    // 3. Aplicar o buffer de iluminação sobre a cena principal
    ctx.drawImage(lightingCanvas, 0, 0);
  }

  function drawBloomPass(entities, ox, oy, time) {
    if (!bloomCtx || (typeof Settings !== 'undefined' && !Settings.isLightingEnabled())) return;

    bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);

    // Captura elementos de energia em baixa resolução
    const scale = 0.25;
    entities.forEach(ent => {
      if (!ent || ent.alive === false || !ent.lightConfig) return;
      if (ent.type === 'heavy') return;

      const lx = (ent.x + ent.w / 2 + ox) * scale;
      const ly = (ent.y + ent.h / 2 + oy) * scale;
      const config = ent.lightConfig;

      let radius = (config.radius * 0.5) * scale;
      if (config.pulse) radius *= (1 + Math.sin(time * 4) * config.pulse);

      const grad = bloomCtx.createRadialGradient(lx, ly, 0, lx, ly, radius);
      grad.addColorStop(0, config.color);
      grad.addColorStop(1, 'transparent');

      bloomCtx.fillStyle = grad;
      bloomCtx.globalAlpha = 0.8;
      bloomCtx.beginPath();
      bloomCtx.arc(lx, ly, radius, 0, Math.PI * 2);
      bloomCtx.fill();
    });

    // Mesclar com a cena principal (o esticamento causa um borrão natural suave e rápido)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(bloomCanvas, 0, 0, bloomCanvas.width, bloomCanvas.height, 0, 0, W, H);
    ctx.restore();
  }

  function applyAtmosphere(act) {
    if (typeof Settings !== 'undefined' && !Settings.isLightingEnabled()) return;

    // 1. Vinheta (Vignette) - Usando Buffer Pré-Renderizado
    if (vignetteCanvas) {
      ctx.drawImage(vignetteCanvas, 0, 0);
    }

    // 2. Color Grading por Ato
    const grading = {
      1: 'rgba(100, 255, 100, 0.03)', // Verdejante
      2: 'rgba(255, 100, 50, 0.04)',  // Abissal/Fogo
      3: 'rgba(100, 150, 255, 0.05)' // Cósmico
    };
    if (grading[act]) {
      ctx.fillStyle = grading[act];
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawDialogue(ent, ox, oy) {
    if (!ent.dialogue || !ent.dialogue.text) return;

    // Ajuste de altura: personagens têm escala visual de 3.5x
    const visualHeight = ent.h * 3.5;
    const x = ent.x + ent.w / 2 + ox;
    const y = ent.y + oy - (visualHeight * 0.9); // Posiciona bem acima da cabeça real

    ctx.save();

    // Configurações de fonte premium
    ctx.font = '500 22px "Outfit", "Inter", sans-serif';
    const text = ent.dialogue.text;
    const metrics = ctx.measureText(text);
    const paddingH = 24;
    const paddingV = 16;
    const bw = Math.max(140, metrics.width + paddingH * 2);
    const bh = 50;
    const rx = x - bw / 2, ry = y - bh, rw = bw, rh = bh, br = 12;

    // ── 1. Sombra Suave (Bloom) ──────────────────────────
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    // ── 2. Glassmorphism Background ──────────────────────
    const bgGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    bgGrad.addColorStop(0, 'rgba(25, 25, 45, 0.85)');
    bgGrad.addColorStop(1, 'rgba(10, 10, 20, 0.95)');

    ctx.fillStyle = bgGrad;

    // Desenha o balão (Corpo principal)
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, br) : _manualRoundedRect(rx, ry, rw, rh, br);
    ctx.fill();

    // ── 3. Borda com Brilho (Stroke) ──────────────────────
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(242, 237, 215, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── 4. Triângulo (Ponta do Balão) ─────────────────────
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 12, ry + rh - 1);
    ctx.lineTo(x + 12, ry + rh - 1);
    ctx.lineTo(x, ry + rh + 12);
    ctx.fill();
    // Borda do triângulo
    ctx.beginPath();
    ctx.moveTo(x - 12, ry + rh - 1);
    ctx.lineTo(x, ry + rh + 12);
    ctx.lineTo(x + 12, ry + rh - 1);
    ctx.stroke();

    // ── 5. Texto com Micro-Efeito ─────────────────────────
    ctx.fillStyle = '#F2EDD7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(242, 237, 215, 0.2)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, x, ry + rh / 2);

    ctx.restore();
  }

  // Função interna para compatibilidade caso roundRect não exista
  function _manualRoundedRect(x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawGlitchEffect(intensity) {
    if (intensity <= 0) return;
    const slices = Math.floor(10 + intensity * 20);
    for (let i = 0; i < slices; i++) {
      const sy = Math.random() * H;
      const sh = Math.random() * 40 + 10;
      const sx = Math.random() * W;
      const sw = Math.random() * W * 0.3;
      const dx = (Math.random() - 0.5) * 100 * intensity;
      ctx.drawImage(canvas, sx, sy, sw, sh, sx + dx, sy, sw, sh);
    }
  }

  function getDimensions() { return { W, H }; }

  return {
    init, drawBackground, resize, getDimensions, loadAssets, getCameraOffset, resetCamera, addScreenShake, spawnDust, updateAndDrawDust, getPan,
    drawTiles, drawBox, drawButton, drawPlatform, drawEchoPlatform,
    drawPortal, drawTether, drawPlayer, drawCrystal, drawLumaBridge,
    drawLevelUI, drawMergeEffect, drawCinematic,
    drawPostExplosion, drawFinalScreen,
    drawLightingPass, drawBloomPass, applyAtmosphere,
    drawDialogue, drawGlitchEffect
  };
})();
