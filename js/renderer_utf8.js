// === RENDERER ===
// Toda a lÃ³gica de desenho no canvas

const Renderer = (() => {

  let canvas, ctx;
  let W, H;

  const ASSETS = {
    luxar_sheet: new Image(),
    tenebre_sheet: new Image(),
    crystal_idle: new Image(),
    crystal_active: new Image(),
    tile_ruin_light: new Image(),
    bg_abyss: new Image(),
    platform_echo: new Image(),
    heavy_box: new Image(),
    btn_pressure: new Image(),
    gate_iron: new Image(),
    bg_unum: new Image(),
    fx_fusion: new Image(),
    bg_act1_far: new Image(),
    bg_act1_mid: new Image(),
    bg_act1_near: new Image(),
    bg_act2_far: new Image(),
    bg_act2_mid: new Image(),
    bg_act2_near: new Image(),
    bg_act3_far: new Image(),
    bg_act3_mid: new Image(),
    bg_act3_near: new Image(),
  };
  const PATTERNS = {};

  function loadAssets(onComplete) {
    const keys = Object.keys(ASSETS);
    let loaded = 0;
    
    // Mapeamento para nomes de arquivos existentes no projeto
    const assetFiles = {
      bg_act1_far: 'act1_base',
      bg_act2_far: 'act2_base',
      bg_act3_far: 'act3_base',
      // Adicione outros mapeamentos se necessÃ¡rio
    };

    keys.forEach(key => {
      ASSETS[key].onload = () => {
        loaded++;
        if (loaded === keys.length) onComplete();
      };
      ASSETS[key].onerror = () => {
        console.warn(`Failed to load asset: ${key}`);
        loaded++;
        if (loaded === keys.length) onComplete();
      }
      const filename = assetFiles[key] || key;
      ASSETS[key].src = `assets/${filename}.png`;
    });
  }

  function getPattern(key) {
    if (!PATTERNS[key] && ASSETS[key].complete && ASSETS[key].naturalWidth > 0) {
      PATTERNS[key] = ctx.createPattern(ASSETS[key], 'repeat');
    }
    return PATTERNS[key];
  }

  // Paleta de cores Two To One
  const COLOR = {
    bg:       '#05050a',
    luxar:    '#F2EDD7',
    tenebre:  '#1A1A2E',
    unum:     '#8B8B8B',
    
    // Aliases para mÃ©todos antigos e novos
    light:    '#F2EDD7',
    heavy:    '#1A1A2E',
    merged:   '#8B8B8B',
    
    luxarGlow:   '#C8A85C',
    tenebreGlow: '#4A4060',
    lightGlow:   '#C8A85C',
    heavyGlow:   '#4A4060',
    mergedGlow:  '#8B8B8B',
    
    crystal:  '#9EC8D4',
    crystalActive: '#C8A85C',
    echo:     'rgba(200, 168, 92, 0.4)',
    text:     '#F2EDD7',
    textDim:  '#8B8B8B',
    tile:     '#2a2a3a',
    box:      '#3d3d5c',
    button:   '#C8A85C',
    buttonOff:'#444444',
    platform: '#555566'
  };

  function init(c) {
    canvas = c;
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    // A resoluÃ§Ã£o interna mudou para suportar a malha escalada (60x38 ao invÃ©s de 30x19)
    // Assim, 60*32 = 1920px (largura) e 38*32 = 1216px (altura)
    // Os assets desenharÃ£o a 32x32px originais no CSS de 100vw, gerando peÃ§as 
    // menores e mais finas, ajustadas perfeitamente para preencher 16:9.
    W = canvas.width  = 1920;
    H = canvas.height = 1216;
  }

  function drawBackground(act, ox, oy, time) {
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    
    ctx.save();
    
    // Generic Helper
    const drawLayer = (key, parallaxSpeed, yOffset, scaleH) => {
        if (ASSETS[key].complete && ASSETS[key].naturalWidth > 0) {
            const pX = (ox * parallaxSpeed) % W;
            // Draw twice to handle seamless horizontal looping properly if camera moves far
            // Actually our camera rarely wraps the entire background seamlessly if the image isn't perfectly seamless,
            // but we draw it wide enough.
            ctx.drawImage(ASSETS[key], pX, yOffset, W + 400, H + scaleH);
        }
    };

    if (act === 1) {
      if (ASSETS.bg_act1_far && ASSETS.bg_act1_far.complete && ASSETS.bg_act1_far.naturalWidth > 0) {
        drawLayer('bg_act1_far', 0.05, -200, 200);
        
        // Embers / Spores in the middle
        glow('rgba(180, 255, 180, 0.5)', 15);
        ctx.fillStyle = 'rgba(200, 255, 200, 0.7)';
        for (let i = 0; i < 80; i++) {
          let px = (i * 137 + ox * 0.10 + time * 15 * (1 + i % 3)) % (W + 200) - 100;
          if (px < -100) px += W + 200;
          let py = (i * 251 + Math.sin(time * 0.5 + i) * 50 + time * 20 * (i % 2 + 1)) % (H + 200) - 100;
          if (py < -100) py += H + 200;
          let s = 3 + (i % 8); 
          ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2); ctx.fill();
        }
        noGlow();

        drawLayer('bg_act1_mid', 0.15, -100, 100);

        // Volumetric God Rays (Procedural Near/Mid)
        ctx.fillStyle = 'rgba(255, 255, 200, 0.04)';
        for(let i=0; i<5; i++) {
            ctx.beginPath();
            let startX = (ox * 0.2 + i * 400) % (W + 1000) - 500;
            ctx.moveTo(startX, -200);
            ctx.lineTo(startX + 300, H + 200);
            ctx.lineTo(startX + 100, H + 200);
            ctx.fill();
        }

        drawLayer('bg_act1_near', 0.3, 0, 0);

      } else {
        // Fallback para ruÃ­nas antigas
        ctx.translate(ox * 0.1, oy * 0.1);
        ctx.fillStyle = '#0d0f17';
        for (let i = 0; i < 20; i++) {
          let x = (i * 370) % 4000 - 1000;
          let w = 80 + (i * 43 % 100);
          ctx.fillRect(x, -1000, w, 3000);
        }
      }
    } else if (act === 2) {
      if (ASSETS.bg_act2_far && ASSETS.bg_act2_far.complete && ASSETS.bg_act2_far.naturalWidth > 0) {
        drawLayer('bg_act2_far', 0.05, -200, 200);
        
        // Dense heavy fog procedural
        ctx.fillStyle = 'rgba(20, 20, 40, 0.4)'; // Dark fog
        ctx.fillRect(0, 0, W, H);

        drawLayer('bg_act2_mid', 0.15, -100, 100);

        // AnimaÃ§Ã£o procedural: Brasas subindo (Embers)
        ctx.fillStyle = 'rgba(255, 160, 60, 1.0)';
        glow('#ff8c2a', 20);
        for (let i = 0; i < 120; i++) {
          let px = (i * 193 + ox * 0.2 + Math.sin(time * 2 + i) * 30) % (W + 200) - 100;
          if (px < -100) px += W + 200;
          let py = (i * 317 - time * 40 * (1 + i % 3)) % (H + 200) - 100;
          if (py < -100) py += H + 200;
          
          ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 3 + i));
          let s = 4 + (i % 8); 
          ctx.fillRect(px, py, s, s);
        }
        ctx.globalAlpha = 1.0;
        noGlow();

        drawLayer('bg_act2_near', 0.3, 0, 0);

      } else {
        // Fallback mÃ¡gico
        ctx.translate(ox * 0.2, oy * 0.2);
        ctx.fillStyle = 'rgba(255,140,42,0.15)';
        glow('#ff8c2a', 15);
        for (let i = 0; i < 60; i++) {
          let x = (i * 211 + Math.sin(time + i) * 20) % 3000 - 500;
          let y = (i * 313 - time * 30 * (1 + i%3)) % 2500 - 500;
          if (y < -500) y += 3000; 
          ctx.fillRect(x, y, 4, 4);
        }
        noGlow();
      }
    } else if (act === 3) {
      if (ASSETS.bg_act3_far && ASSETS.bg_act3_far.complete && ASSETS.bg_act3_far.naturalWidth > 0) {
        drawLayer('bg_act3_far', 0.02, -200, 200);

        // Neblina etÃ©rea/Cosmic Dust
        ctx.fillStyle = 'rgba(100, 150, 255, 0.04)';
        for (let i = 0; i < 25; i++) {
          let px = (i * 313 + ox * 0.05 + time * 10 * (1 + i % 2)) % (W + 800) - 400;
          if (px < -400) px += W + 800;
          let py = (i * 151 + Math.sin(time + i) * 60) % (H + 200) - 100;
          if (py < -100) py += H + 200;
          ctx.beginPath(); ctx.arc(px, py, 200 + (i % 4) * 80, 0, Math.PI * 2); ctx.fill();
        }

        drawLayer('bg_act3_mid', 0.1, -100, 100);
        
        // Estrelas Cadentes (Shooting stars)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 4;
        glow('#ffffff', 25);
        for (let i = 0; i < 6; i++) {
            let speed = 600 + i * 50;
            let currentPath = (time + i * 4.3) % 10;
            if (currentPath < 1.0) {
               let px = ((i * 517 + ox * 0.1) % (W + 200)) - currentPath * speed;
               let py = -100 + (i * 123) % 300 + currentPath * speed * 0.5;
               ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 40, py - 20); ctx.stroke();
            }
        }
        noGlow();

        drawLayer('bg_act3_near', 0.2, 0, 0);
        
      } else {
        // Fallback procedural: CÃ©u estrelado bem fundo
        ctx.translate(ox * 0.05, oy * 0.05);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 120; i++) {
          let x = (i * 997) % 4000 - 1000;
          let y = (i * 701) % 3000 - 1000;
          let s = (i % 2) + 1;
          ctx.fillRect(x, y, s, s);
        }
        
        // Nuvens macias com paralaxe intermediÃ¡rio
        ctx.translate(ox * 0.10, oy * 0.10); // rel translate
        ctx.fillStyle = 'rgba(180, 200, 255, 0.025)';
        for (let i = 0; i < 15; i++) {
          let x = (i * 1234 + time * 12) % 4500 - 1000;
          let y = 50 + (i * 321) % 600;
          ctx.beginPath();
          ctx.arc(x, y, 200 + (i%5)*50, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Grade TecnolÃ³gica / EtÃ©rea com Paralaxe
    ctx.save();
    ctx.translate(ox * 0.3, oy * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    const gs = 64;
    
    ctx.beginPath();
    for (let x = -2000; x < W + 2000; x += gs) {
      ctx.moveTo(x, -2000); ctx.lineTo(x, H + 2000);
    }
    for (let y = -2000; y < H + 2000; y += gs) {
      ctx.moveTo(-2000, y); ctx.lineTo(W + 2000, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // â”€â”€ CÃ¢mera â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Centraliza a cÃ¢mera entre os dois personagens
  function getCameraOffset(light, heavy, levelW, levelH) {
    const cx = (light.x + heavy.x) / 2 + (light.w + heavy.w) / 4;
    const cy = (light.y + heavy.y) / 2 + (light.h + heavy.h) / 4;

    let ox = W / 2 - cx;
    let oy = H / 2 - cy;

    // Limita cÃ¢mera aos limites do nÃ­vel
    ox = Math.min(0, Math.max(W - levelW, ox));
    oy = Math.min(0, Math.max(H - levelH, oy));

    return { ox, oy };
  }

  // â”€â”€ Primitivos com glow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawGlow(x, y, r, color, alpha = 0.3) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function glow(color, radius = 20) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = radius;
  }
  function noGlow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  // â”€â”€ Tiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawTiles(tiles, ox, oy, act) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = COLOR.tile;
    for (const tile of tiles) {
       if (ASSETS.tile_ruin_light && ASSETS.tile_ruin_light.complete && ASSETS.tile_ruin_light.naturalWidth > 0) {
           ctx.drawImage(ASSETS.tile_ruin_light, tile.x, tile.y, tile.w, tile.h);
       } else {
           ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
       }
    }
    ctx.restore();
  }

  // â”€â”€ Cristais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawCrystal(crystal, ox, oy, time) {
    const x = crystal.x + ox;
    const y = crystal.y + oy;
    const img = crystal.activated ? ASSETS.crystal_active : ASSETS.crystal_idle;
    
    if (img && img.complete && img.naturalWidth > 0) {
      const frame = Math.floor(time * 6) % 4;
      ctx.drawImage(img, frame * 64, 0, 64, 64, x, y, crystal.w, crystal.h);
    } else {
      ctx.fillStyle = crystal.activated ? COLOR.crystalActive : COLOR.crystal;
      ctx.fillRect(x, y, crystal.w, crystal.h);
    }
    
    if (crystal.activated) {
      glow(COLOR.crystalActive, 20);
      ctx.strokeStyle = COLOR.crystalActive;
      ctx.strokeRect(x, y, crystal.w, crystal.h);
      noGlow();
    }
  }

  // â”€â”€ Plataformas Eco â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawEchoPlatform(plat, ox, oy) {
    if (!plat.active) return;
    const x = plat.x + ox;
    const y = plat.y + oy;
    
    ctx.save();
    ctx.globalAlpha = plat.visible ? 1.0 : 0.25;
    
    if (ASSETS.platform_echo && ASSETS.platform_echo.complete && ASSETS.platform_echo.naturalWidth > 0) {
      ctx.drawImage(ASSETS.platform_echo, x, y, plat.w, plat.h);
    } else {
      ctx.fillStyle = COLOR.luxarGlow;
      ctx.fillRect(x, y, plat.w, plat.h);
    }
    
    if (plat.visible) {
      glow(COLOR.luxarGlow, 15);
      ctx.strokeStyle = COLOR.luxarGlow;
      ctx.strokeRect(x, y, plat.w, plat.h);
      noGlow();
    }
    ctx.restore();
  }

  // â”€â”€ Caixas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawBox(box, ox, oy) {
    if (!box.active) return;
    const x = Math.round(box.x + ox);
    const y = Math.round(box.y + oy);

    ctx.fillStyle = COLOR.box;
    ctx.fillRect(x, y, box.w, box.h);

    // Detalhe: cruz na caixa
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + box.w, y + box.h);
    ctx.moveTo(x + box.w, y); ctx.lineTo(x, y + box.h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(x + 0.5, y + 0.5, box.w - 1, box.h - 1);
  }

  // â”€â”€ BotÃµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawButton(btn, ox, oy) {
    const x = Math.round(btn.x + ox);
    const y = Math.round(btn.y + oy);

    ctx.fillStyle = btn.pressed ? COLOR.button : COLOR.buttonOff;
    if (btn.pressed) { glow(COLOR.button, 15); }
    ctx.fillRect(x, y, btn.w, btn.h);
    noGlow();

    // Base do botÃ£o
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + btn.h, btn.w, 4);
  }

  // â”€â”€ Plataformas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawPlatform(plat, ox, oy, act) {
    const x = Math.round(plat.x + ox);
    const y = Math.round(plat.y + oy);
    let patKey = 'act' + act + '_plat';
    let pattern = getPattern(patKey);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = plat.active ? 1.0 : 0.5;

    ctx.fillStyle = pattern || COLOR.platform;
    if (plat.active) { glow(COLOR.platform, 10); }
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    noGlow();

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(plat.x, plat.y, plat.w, 2);
    ctx.restore();
  }

  // â”€â”€ Portal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawPortal(portal, ox, oy, time) {
    const x = Math.round(portal.x + ox + portal.w / 2);
    const y = Math.round(portal.y + oy + portal.h / 2);
    const r = portal.w / 2;

    // Anel pulsante
    const pulse = 1 + 0.15 * Math.sin(time * 3);
    const col = portal.active ? COLOR.mergedGlow : COLOR.lightGlow;

    glow(col, 30);
    ctx.strokeStyle = col;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    noGlow();

    // Interior
    ctx.fillStyle = portal.active
      ? 'rgba(155,107,255,0.2)'
      : 'rgba(90,180,255,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // SÃ­mbolo
    ctx.fillStyle = col;
    ctx.font = `${Math.round(r * 1.2)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('âœ¦', x, y);
  }

  // â”€â”€ Linha de ligaÃ§Ã£o entre personagens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawTether(light, heavy, ox, oy, strength) {
    const x1 = Math.round(light.x + light.w / 2 + ox);
    const y1 = Math.round(light.y + light.h / 2 + oy);
    const x2 = Math.round(heavy.x + heavy.w / 2 + ox);
    const y2 = Math.round(heavy.y + heavy.h / 2 + oy);

    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = `rgba(180,180,255,${0.15 + strength * 0.4})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // â”€â”€ Personagens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawPlayer(player, ox, oy, time, isActive) {
    const cx = Math.round(player.x + player.w / 2 + ox);
    const cy = Math.round(player.y + player.h / 2 + oy);
    
    const isLight = player.type === 'light';
    const img = isLight ? ASSETS.luxar_sheet : ASSETS.tenebre_sheet;
    const glowCol = isLight ? COLOR.luxarGlow : COLOR.tenebreGlow;

    if (isActive) glow(glowCol, 25);
    
    ctx.save();
    ctx.translate(cx, cy);
    if (player.facing === -1) ctx.scale(-1, 1);
    
    const sW = 48, sH = 64;
    const sx = player.currentFrame * sW;
    const sy = 0; // Por enquanto apenas uma faixa de animaÃ§Ã£o no placeholder

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sx, sy, sW, sH, -player.w, -player.h, player.w * 2, player.h * 2);
    } else {
      ctx.fillStyle = isLight ? COLOR.luxar : COLOR.tenebre;
      ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    }
    
    ctx.restore();
    noGlow();

    // Sombra sutil
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, player.y + player.h + oy, player.w/2, 4, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // â”€â”€ UI de fase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawLevelUI(levelData, time, goalShown) {
    // Objetivo na parte inferior
    if (goalShown) {
      ctx.fillStyle = 'rgba(10,10,18,0.7)';
      ctx.fillRect(0, H - 48, W, 48);
      ctx.fillStyle = COLOR.textDim;
      ctx.font = '13px Lato, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(levelData.goalText, W / 2, H - 24);
    }

    // Vento (visual)
    if (levelData.wind) {
      ctx.fillStyle = 'rgba(180,220,255,0.08)';
      for (let i = 0; i < 8; i++) {
        const wx = ((time * 200 * (1 + i * 0.3)) % W);
        const wy = 60 + i * (H / 10);
        ctx.fillRect(wx, wy, 40 + i * 10, 2);
      }
    }
  }

  // â”€â”€ Efeito de merge final â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawMergeEffect(cx, cy, progress) {
    const r = progress * 400; // Expandido
    const alpha = 1 - progress;

    glow(COLOR.mergedGlow, 60); // Glow mais forte
    ctx.strokeStyle = `rgba(180,140,255,${alpha})`;
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    noGlow();

    // Flash Branco de uniÃ£o quando chega perto do fim
    if (progress > 0.8) {
      const flashAlpha = (progress - 0.8) * 5; // Vai de 0 a 1 rÃ¡pido no final
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, W, H);
    } else if (progress > 0.3) {
      // Efeito de preenchimento etÃ©reo antes do flash
      ctx.fillStyle = `rgba(155,107,255,${(progress - 0.3) * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // â”€â”€ AnimaÃ§Ã£o CinemÃ¡tica 60 Frames â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawCinematic(cx, cy, progress) {
    ctx.save();
    
    // Shake based on progress (heaviest near end)
    let offsetX = 0; let offsetY = 0;
    if (progress > 0.4) {
      const shakeAmt = (progress - 0.4) * 60;
      offsetX = (Math.random() - 0.5) * shakeAmt;
      offsetY = (Math.random() - 0.5) * shakeAmt;
    }

    ctx.translate(cx + offsetX, cy + offsetY);

    // Alpha fade in and blast
    let alpha = Math.min(1.0, progress * 4); // quickly reach max alpha
    if (progress > 0.9) alpha = Math.max(0, (1.0 - progress) * 10);
    ctx.globalAlpha = alpha;
    
    // Procedural Energy Burst
    // 1. Central Core (White/Yellow)
    const coreRadius = progress * 150 + (progress > 0.8 ? (progress - 0.8) * 2000 : 0);
    ctx.globalCompositeOperation = 'screen';
    
    glow('#ffffff', 40);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    noGlow();

    // 2. Spinning Energy Rings (Blue & Yellow)
    const ringRot = progress * Math.PI * 8;
    ctx.lineWidth = 15 + progress * 20;

    for(let i=0; i<3; i++) {
        ctx.save();
        ctx.rotate(ringRot * (i % 2 === 0 ? 1 : -1) + (i * Math.PI / 3));
        glow(i === 0 ? COLOR.light : COLOR.heavy, 30);
        ctx.strokeStyle = i === 0 ? COLOR.light : COLOR.heavy;
        
        ctx.beginPath();
        // Expanding arcs
        ctx.arc(0, 0, coreRadius + 50 + (i * 80 * progress), 0, Math.PI);
        ctx.stroke();
        noGlow();
        ctx.restore();
    }

    // 3. Shockwave lines shooting outwards
    if (progress > 0.5) {
        let shockRadius = (progress - 0.5) * 1000;
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255, 230, 180, ${1.0 - progress})`;
        for(let a=0; a<Math.PI*2; a += Math.PI/8) {
           ctx.beginPath();
           ctx.moveTo(Math.cos(a) * (shockRadius * 0.5), Math.sin(a) * (shockRadius * 0.5));
           ctx.lineTo(Math.cos(a) * shockRadius, Math.sin(a) * shockRadius);
           ctx.stroke();
        }
    }

    // Overload screen towards the end
    if (progress > 0.8) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255, 255, 255, ${(progress - 0.8) * 5})`;
      ctx.translate(-cx - offsetX, -cy - offsetY);
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  let cinematicParticles = [];
  function drawPostExplosion(timer, dt) {
     // Fades in pure white
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, W, H);

     if (cinematicParticles.length === 0) {
        for(let i = 0; i < 150; i++) {
           cinematicParticles.push({
              x: Math.random() * W,
              y: Math.random() * H - H, // start above
              vx: (Math.random() - 0.5) * 100,
              vy: Math.random() * 50 + 20,
              size: Math.random() * 5 + 3,
              isBlue: Math.random() > 0.5
           });
        }
     }

     ctx.globalCompositeOperation = 'source-over';
     // Draw falling particles
     for(let i=0; i<cinematicParticles.length; i++) {
        let p = cinematicParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 30 * dt; // gravity

        // Fade out
        let alpha = 1.0 - (timer / 10.0);
        if (alpha < 0) alpha = 0;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.isBlue ? COLOR.light : COLOR.heavy;
        glow(p.isBlue ? COLOR.lightGlow : COLOR.heavyGlow, 15);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        noGlow();
     }
     ctx.globalAlpha = 1.0;
  }

  function drawFinalScreen(textAlpha) {
     // Background: white mixing with black proportional to textAlpha
     const intensity = Math.floor(255 * (1 - textAlpha));
     ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`; 
     ctx.fillRect(0, 0, W, H);

     // Reset particles state for next play
     if (textAlpha > 0.9 && cinematicParticles.length > 0) {
        cinematicParticles = [];
     }

     ctx.fillStyle = `rgba(232, 228, 240, ${textAlpha})`; // COLOR.text with alpha
     ctx.font = '60px "Cinzel", serif';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.fillText('A dualidade se tornou uma', W / 2, H / 2);
     
     // Subtle glow
     if (textAlpha > 0) {
         ctx.globalAlpha = textAlpha * 0.5;
         glow(COLOR.mergedGlow, 30);
         ctx.fillText('A dualidade se tornou uma', W / 2, H / 2);
         noGlow();
         ctx.globalAlpha = 1.0;
     }
  }

  // â”€â”€ UtilitÃ¡rios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
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

  function getDimensions() { return { W, H }; }

  return {
    init, drawBackground, resize, getDimensions, loadAssets,
    drawTiles, drawBox, drawButton, drawPlatform,
    drawPortal, drawTether, drawPlayer,
    drawLevelUI, drawMergeEffect, drawCinematic, 
    drawPostExplosion, drawFinalScreen, getCameraOffset,
  };
})();
