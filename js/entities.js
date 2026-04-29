// ─────────────────────────────────────────────
// PLAYER — Luxar ou Tenebre
// ─────────────────────────────────────────────
class Player {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w ?? 24;
    this.h = config.h ?? 32;
    this.vx = 0;
    this.vy = 0;

    this.type = config.type;          // 'light' | 'heavy'
    this.speed = config.speed;
    this.jumpForce = config.jumpForce;
    this.gravityScale = config.gravityScale;
    this.mass = config.mass;
    this.maxJumps = config.maxJumps ?? 1;
    this.jumpsLeft = this.maxJumps;

    this.onGround = false;
    this.alive = true;

    // Coyote time
    this.coyoteTime = 0;
    this.COYOTE_MAX = this.type === 'light' ? 0.15 : 0.08;

    // Jump buffer
    this.jumpBuffer = 0;
    this.JUMP_BUF_MAX = 0.12;

    // Visual / Animação
    this.facing = 1;
    this.animTimer = 0;
    this.squash = 1;

    this.animState = 0;   // 0: idle, 1: walk, 2: jump, 4: special idle
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.idleTimer = 0;
    // Luxar: 30 colunas × 3 linhas. Tenebre inicializa no IDLE
    this.framesPerAnim = this.type === 'heavy' ? 12 : 30; // 12 frames idle normal
    this.fps = this.type === 'heavy' ? 8 : 12; // Tenebre fps base

    // Iluminação Dinâmica
    this.lightConfig = this.type === 'light' ? {
      radius: 300,
      intensity: 0.8,
      color: '#F2EDD7',
      pulse: 0.1
    } : {
      radius: 150,
      intensity: 0.4,
      color: '#A85CFF', // Aura roxa para Tenebre
      pulse: 0.05
    };

    // Novas Habilidades
    this.dashCooldown = 0;
    this.isDashing = false;
    this.canDash = true; // Reset ao tocar o chão
    this.isSlamming = false;
    this.isPushing = false;
    this.isSkidding = false;
    this.dialogue = { text: '', timer: 0 };
  }

  update(dt, tiles, boxes, buttons, windForce, crystals = []) {
    // Fricção dt-based (mais alta para controle mais firme)
    const frictionGround = this.type === 'light' ? 15 : 20;
    const frictionAir = 4;
    if (this.onGround) {
      this.vx *= Math.max(0, 1 - frictionGround * dt);
    } else {
      this.vx *= Math.max(0, 1 - frictionAir * dt);
    }

    const prevVy = this.vy;
    this.onGround = false;
    let landedThisFrame = false;
    this.isPushing = false; // Reset a cada frame
    this.isSkidding = false;

    // Lógica de Dash
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx *= 0.5; // Breque suave ao fim do dash
      }
      // Durante o dash, a posição atualiza normalmente mas a gravidade é ignorada
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      Physics.integrate(this, dt);
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // Colisão com tiles
    for (const tile of tiles) {
      const res = Physics.resolveAABB(this, tile);
      if (res.onGround) {
        this.onGround = true;
        landedThisFrame = true;
        this.jumpsLeft = this.maxJumps; // Reset pulos
        this.canDash = true; // Reset dash
      }
    }

    // Colisão com caixas
    for (const box of boxes) {
      if (!box.active) continue;
      const prevVx = this.vx;
      const res = Physics.resolveAABB(this, box);
      if (res.resolved && this.type === 'heavy' && res.hitWall) {
        // Sensação de peso ao empurrar
        this.vx = prevVx * 0.5; // Tenebre mantém metade da velocidade original
        box.vx = this.vx; // Caixa acompanha a velocidade do Tenebre
        this.isPushing = true;
        
        // Pequena poeira ao arrastar a caixa
        if (Math.random() < 0.1 && typeof Renderer !== 'undefined' && Renderer.spawnDust) {
          Renderer.spawnDust(box.x + box.w / 2, box.y + box.h, 'rgba(150, 100, 50, 0.5)');
        }
      }
      if (res.onGround) {
        this.onGround = true;
        landedThisFrame = true;
        this.jumpsLeft = this.maxJumps; // Reset pulos
        this.canDash = true; // Reset dash
      }
    }

    // Screen Shake no pouso pesado e Partículas
    if (landedThisFrame) {
      if (typeof Renderer !== 'undefined') {
        // Slam Impact
        if (this.isSlamming) {
          if (typeof Renderer !== 'undefined' && Renderer.addScreenShake) Renderer.addScreenShake(60);
          this.isSlamming = false;
          // Empurra caixas próximas
          for (const box of boxes) {
            const dist = Math.abs(box.x - this.x);
            if (dist < 200) {
              const dir = box.x > this.x ? 1 : -1;
              box.vx += dir * 400;
              box.vy -= 200;
            }
          }
          if (typeof AudioManager !== 'undefined') AudioManager.playFX('impacto_solo');
        } else if (prevVy > 500 && Renderer.addScreenShake) {
          const intensity = (prevVy - 500) * (this.type === 'heavy' ? 0.05 : 0.02);
          Renderer.addScreenShake(Math.min(intensity, 40));
        }

        if (Renderer.spawnDust) {
          const dustCount = this.isSlamming ? 15 : 5;
          const dustColor = this.type === 'light' ? 'rgba(255, 255, 180, 0.6)' : 'rgba(150, 150, 150, 0.6)';
          for (let i = 0; i < dustCount; i++) Renderer.spawnDust(this.x + this.w / 2, this.y + this.h, dustColor);
        }
      }
    }

    // Partículas correndo e Skid
    if (this.onGround && Math.abs(this.vx) > 100) {
      const isMovingOpposite = (this.vx > 0 && Input[this.type + 'Left']()) || (this.vx < 0 && Input[this.type + 'Right']());
      
      if (isMovingOpposite && Math.abs(this.vx) > 300) {
        this.isSkidding = true;
        if (Math.random() < 0.4 && typeof Renderer !== 'undefined' && Renderer.spawnDust) {
          Renderer.spawnDust(this.x + this.w / 2, this.y + this.h, this.type === 'light' ? 'rgba(255, 255, 180, 0.7)' : 'rgba(150, 150, 150, 0.7)');
        }
      } else if (Math.random() < 0.2 && typeof Renderer !== 'undefined' && Renderer.spawnDust) {
        const dustColor = this.type === 'light' ? 'rgba(255, 255, 180, 0.4)' : 'rgba(150, 150, 150, 0.4)';
        Renderer.spawnDust(this.x + this.w / 2, this.y + this.h, dustColor);
      }
    }

    // Luxar: Ativar cristais
    if (this.type === 'light') {
      for (const crystal of crystals) {
        if (!crystal.activated && Physics.overlaps(this, crystal)) {
          crystal.activate(this);
          this.animState = 3;
        }
      }
    }

    if (this.onGround) {
      this.coyoteTime = this.COYOTE_MAX;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.onGround) {
        this._doJump();
        this.jumpBuffer = 0;
      }
    }

    // Animação
    this.animTimer += dt;
    if (this.squash !== 1) {
      this.squash += (1 - this.squash) * 10 * dt;
    }

    if (this.animState !== 3) {
      let newAnimState = 0;
      if (!this.onGround && Math.abs(this.vy) > 50) {
        newAnimState = 2; // Jump só se estiver visivelmente caindo ou subindo
        this.idleTimer = 0;
      } else if (Math.abs(this.vx) > 5) {
        newAnimState = 1; // Walk
        this.idleTimer = 0;
      } else {
        this.idleTimer += dt;
        if (this.idleTimer >= 5.0) {
          newAnimState = 4; // Idle Especial (Time)
        } else {
          newAnimState = 0; // Idle Normal
        }
      }

      if (newAnimState !== this.animState) {
        this.animState = newAnimState;
        this.currentFrame = 0;
        this.frameTimer = 0;
        if (this.type === 'heavy') {
          if (this.animState === 0) { this.framesPerAnim = 12; this.fps = 8; }  // IDLE 
          else if (this.animState === 4) { this.framesPerAnim = 6; this.fps = 2; }   // TIME (2 fps = super relaxado)
          else if (this.animState === 1) { this.framesPerAnim = 6; this.fps = 12; } // WALK (apenas a linha de cima, 6 frames em loop limpo)
          else if (this.animState === 2) { this.framesPerAnim = 12; this.fps = 16; } // JUMP (agora segura no ultimo frame)
        }
      }
    }

    this.frameTimer += dt;
    if (this.frameTimer >= 1 / this.fps) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= this.framesPerAnim) {
        if (this.animState === 2) {
          this.currentFrame = this.framesPerAnim - 1; // Para no último frame e congela durante a queda do salto
        } else {
          this.currentFrame = 0;
        }
      }

      if (this.animState === 3 && this.currentFrame === 0) {
        this.animState = 0;
      }
    }

    // Dialogue Timer
    if (this.dialogue.timer > 0) {
      this.dialogue.timer -= dt;
      if (this.dialogue.timer <= 0) this.dialogue.text = '';
    }
  }

  say(text, duration = 3.0) {
    this.dialogue.text = text;
    this.dialogue.timer = duration;
    if (typeof DialogueManager !== 'undefined') {
      DialogueManager.play(this.type, text);
    }
  }

  jump() {
    if (this.onGround || this.coyoteTime > 0 || this.jumpsLeft > 0) {
      this._doJump();
      this.coyoteTime = 0;
      return true;
    }
    this.jumpBuffer = this.JUMP_BUF_MAX;
    return false;
  }

  _doJump() {
    this.vy = -this.jumpForce;
    this.onGround = false;
    this.jumpsLeft--; // Consome um pulo
    this.squash = this.type === 'light' ? 0.8 : 0.7;

    if (this.type === 'light' && this.jumpsLeft === 0) {
      if (typeof Achievements !== 'undefined') Achievements.unlock('double_jump');
    }
    
    if (typeof Renderer !== 'undefined' && Renderer.spawnDust) {
      const dustColor = this.type === 'light' ? 'rgba(255, 255, 180, 0.6)' : 'rgba(150, 150, 150, 0.6)';
      for (let i = 0; i < 3; i++) Renderer.spawnDust(this.x + this.w / 2, this.y + this.h, dustColor);
    }
  }

  moveLeft(dt) {
    const accel = this.speed * (this.type === 'light' ? 8 : 12); // Aceleração forte para vencer a fricção
    this.vx -= accel * dt;
    const maxSpd = this.speed;
    if (this.vx < -maxSpd) this.vx = -maxSpd;
    this.facing = -1;
  }
  moveRight(dt) {
    const accel = this.speed * (this.type === 'light' ? 8 : 12); // Aceleração forte para vencer a fricção
    this.vx += accel * dt;
    const maxSpd = this.speed;
    if (this.vx > maxSpd) this.vx = maxSpd;
    this.facing = 1;
  }

  dash() {
    if (this.type !== 'light' || this.dashCooldown > 0 || !this.canDash) return;
    this.isDashing = true;
    this.canDash = false;
    this.dashTimer = 0.2;
    this.dashCooldown = 0.8;
    this.vx = this.facing * 1200;
    this.vy = 0;
    if (typeof AudioManager !== 'undefined') AudioManager.playFX('dash');
  }

  slam() {
    if (this.type !== 'heavy' || this.onGround || this.isSlamming) return;
    this.isSlamming = true;
    this.vy = 1500;
    this.vx = 0;
    if (typeof Achievements !== 'undefined') Achievements.unlock('slam_dunk');
  }
}

// ─────────────────────────────────────────────
// CRYSTAL — Ativável por Luxar
// ─────────────────────────────────────────────
class Crystal {
  constructor(config) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.w = config.w ?? 64;
    this.h = config.h ?? 64;
    this.activated = false;

    // Iluminação Dinâmica
    this.lightConfig = {
      radius: 200,
      intensity: 0.5,
      color: '#9EC8D4',
      flicker: true
    };
  }

  activate(player) {
    if (this.activated) return;
    this.activated = true;
    if (window.GlobalState) window.GlobalState.activateCrystal(this.id);
    if (typeof AudioManager !== 'undefined') AudioManager.playFX('crystal_activated');
    if (typeof Achievements !== 'undefined') Achievements.unlock('first_light');
    
    if (player && player.type === 'light') {
      const phrases = ["Sinto o fluxo voltando...", "A energia... ela pulsa.", "Um fragmento da unidade.", "Luz em meio ao vazio."];
      player.say(phrases[Math.floor(Math.random() * phrases.length)], 2.5);
    }
  }
}

// ─────────────────────────────────────────────
// ECHO PLATFORM — Manifestação da luz para Tenebre
// ─────────────────────────────────────────────
class EchoPlatform {
  constructor(config) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.w = config.w ?? 64;
    this.h = config.h ?? 16;
    this.active = false;
    this.visible = false;

    // Iluminação Dinâmica
    this.lightConfig = {
      radius: 120,
      intensity: 0.4,
      color: '#9EC8D4',
      pulse: 0.1
    };
  }

  update(dt, player) {
    if (!this.active) return;
    this.visible = Physics.overlaps(player, this);
  }
}

// ─────────────────────────────────────────────
// BOX — persistence handled by GlobalState
// ─────────────────────────────────────────────
class Box {
  constructor(config) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.w = config.w ?? 32;
    this.h = config.h ?? 32;
    this.vx = 0;
    this.vy = 0;
    this.gravityScale = 1;
    this.mass = config.mass ?? 2;
    this.active = true;
    this.isLocked = false;
  }

  update(dt, tiles) {
    if (!this.active || this.isLocked) return;
    const prevVy = this.vy;
    Physics.integrate(this, dt);
    this.vx *= 0.85;

    let landed = false;
    for (const tile of tiles) {
      const res = Physics.resolveAABB(this, tile);
      if (res.onGround) landed = true;
    }

    if (landed && prevVy > 400) {
      if (typeof Renderer !== 'undefined' && Renderer.addScreenShake) {
        Renderer.addScreenShake((prevVy - 400) * 0.04);
      }
    }

    if (this.id && window.GlobalState) {
      window.GlobalState.saveObjectPos(this.id, { x: this.x, y: this.y });
    }
  }
}

// ─────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────
class Button {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w ?? 64;
    this.h = config.h ?? 64;
    this.pressed = false;
    this.locked = false;
    this.lockOnPress = config.lockOnPress ?? false;
    this.linkedId = config.linkedId;
  }
  press() {
    this.pressed = true;
    if (this.lockOnPress) this.locked = true;
  }
}

// ─────────────────────────────────────────────
// MOVING PLATFORM
// ─────────────────────────────────────────────
class MovingPlatform {
  constructor(config) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.w = config.w || 96;
    this.h = config.h ?? 16;
    this.active = config.startsActive ?? false;
    this.startX = config.x;
    this.startY = config.y;
    this.endX = config.endX ?? config.x;
    this.endY = config.endY ?? config.y;
    this.speed = config.speed ?? 80;
    this.elevatorMode = config.elevatorMode ?? false;
    this.isDoor = config.isDoor ?? false;
    this.isIronGate = config.isIronGate ?? false; // Portão de ferro que sobe
    this.isAnimatedGate = config.isAnimatedGate ?? false; // Portão animado (spritesheet, fica no chão)
    this.animSpeed = config.animSpeed ?? 0.7; // Velocidade de animação normalizada (0→1/s)
    this.isElevator = config.isElevator ?? false; // Elevador com trilhos visuais
    this.autoTrigger = config.autoTrigger ?? false;
    this._t = 0;
    this._dir = 1;
    this.prevX = this.x;
    this.prevY = this.y;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.isDoor) {
      // Porta não se move. Ativa = apagada e sem colisão física. Inativa = sólida.
      return;
    }

    // ── Portão Animado (isAnimatedGate): fica no chão, apenas anima _t ────────
    if (this.isAnimatedGate) {
      this._prevT = this._t; // Guarda t anterior para detectar direção no renderer
      // animSpeed: unidades de _t por segundo (0→1 em ~1.4s com 0.7/s)
      const animSpeed = this.animSpeed ?? 0.7;
      if (this.active) {
        this._t = Math.min(1, this._t + animSpeed * dt);
      } else {
        this._t = Math.max(0, this._t - animSpeed * dt);
      }
      // A colisão é controlada pelo filtro isAnimatedGate && _t >= 1 em game.js
      return;
    }

    // Portão de ferro e elevador funcionam como elevatorMode: vão para endX/endY quando ativos
    const isSliding = this.elevatorMode || this.isIronGate || this.isElevator;

    if (!this.active && !isSliding) return;

    const dist = Math.hypot(this.endX - this.startX, this.endY - this.startY);
    if (dist === 0) return;

    if (isSliding) {
      if (this.active) {
        this._t = Math.min(1, this._t + (this.speed / dist) * dt);
      } else {
        this._t = Math.max(0, this._t - (this.speed / dist) * dt);
      }
    } else {
      this._t += (this.speed / dist) * dt * this._dir;
      if (this._t >= 1) { this._t = 1; this._dir = -1; }
      if (this._t <= 0) { this._t = 0; this._dir = 1; }
    }

    this.x = this.startX + (this.endX - this.startX) * this._t;
    this.y = this.startY + (this.endY - this.startY) * this._t;
  }

  carryEntity(entity) {
    entity.x += this.x - this.prevX;
    entity.y += this.y - this.prevY;
  }
}

// ─────────────────────────────────────────────
// PORTAL — saída da fase
// ─────────────────────────────────────────────
class Portal {
  constructor(config) {
    this.id = config.id ?? 'portal';
    // Se x/y não fornecidos, o posicionamento final será feito no game.js usando worldH
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.w = config.w ?? 128; // Tamanho base para o asset portal.png
    this.h = config.h ?? 192;
    this.active = false;
    this.timer = 0;
    this.nascimentoTocado = false;
    this.entradaTocada = false;

    // Sistema de frames para animação (Grid 4x6 - Frames quadrados de 102px)
    this.currentFrame = 0;
    this.totalFrames = 24;
    this.frameSpeed = 12; // Velocidade suave
    this.frameTimer = 0;

    // Iluminação Dinâmica
    this.lightConfig = {
      radius: 500,
      intensity: 1.0,
      color: '#4ADEDE',
      pulse: 0.2
    };
  }

  update(dt, players = []) {
    if (this.active) {
      this.timer += dt;

      // Atualiza frames da animação
      this.frameTimer += dt;
      if (this.frameTimer >= 1 / this.frameSpeed) {
        this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
        this.frameTimer = 0;
      }

      // Som de nascimento: toca uma vez quando o portal é ativado
      if (!this.nascimentoTocado && typeof AudioManager !== 'undefined') {
      if (typeof AudioManager !== 'undefined') {
        const pan = (typeof Renderer !== 'undefined' && Renderer.getPan) ? Renderer.getPan(this.x) : 0;
        AudioManager.playFX('portal_nascendo', pan);
      }
        this.nascimentoTocado = true;
      }

      // Detecção de colisão (Trigger) para som de entrada
      for (const p of players) {
        if (p.alive !== false && Physics.overlaps(p, this)) {
          console.log('[Portal] Personagem em contato com o portal.');
          if (!this.entradaTocada && typeof AudioManager !== 'undefined') {
            AudioManager.playFX('entrar_portal');
            this.entradaTocada = true;
          }
          if (typeof Game !== 'undefined') {
            // O jogo precisa saber se é a fase final para não dar nextLevel imediato
            // Adicionado um check para não dar nextLevel imediato na fase final
            if (typeof LEVELS !== 'undefined' && typeof Game._getCurrentLevelIdx === 'function') {
                const idx = Game._getCurrentLevelIdx();
                if (LEVELS[idx] && LEVELS[idx].isFinal) {
                    // Na fase final, não chama nextLevel imediato, deixa o checkWinCondition rodar a explosão
                    return;
                }
            }
            console.log('[Portal] Solicitando próxima fase...');
            Game.nextLevel();
          }
        }
      }
    }
  }
}