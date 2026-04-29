// === PHYSICS ENGINE ===
// Motor de física simples para plataforma 2D

const Physics = (() => {

  const GRAVITY = 1800;      // px/s² — gravidade dobrada para o novo SCALER
  const MAX_FALL = 1400;     // velocidade de queda máxima dobrada

  // Resolve colisão AABB entre entidade e retângulo estático
  // Retorna { resolved, onGround, hitCeiling, hitWall }
  function resolveAABB(entity, rect) {
    const ex = entity.x, ey = entity.y;
    const ew = entity.w, eh = entity.h;
    const rx = rect.x, ry = rect.y;
    const rw = rect.w, rh = rect.h;

    // Sem sobreposição
    if (ex + ew <= rx || ex >= rx + rw ||
      ey + eh <= ry || ey >= ry + rh) {
      return { resolved: false };
    }

    // Penetração em cada eixo
    const overlapLeft = (ex + ew) - rx;
    const overlapRight = (rx + rw) - ex;
    const overlapTop = (ey + eh) - ry;
    const overlapBot = (ry + rh) - ey;

    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBot);

    let onGround = false, hitCeiling = false, hitWall = false;

    if (minY < minX) {
      // Colisão vertical
      if (overlapTop < overlapBot) {
        entity.y = ry - eh;       // pousou no topo
        entity.vy = Math.min(entity.vy, 0);
        onGround = true;
      } else {
        // Bateu em baixo (Ceiling)
        // Corner Forgiveness: se a sobreposição horizontal for pequena, desliza para o lado em vez de bater a cabeça
        if (minX < 14 && entity.vy < 0) {
          if (overlapLeft < overlapRight) {
            entity.x = rx - ew; // desliza pra esquerda
          } else {
            entity.x = rx + rw; // desliza pra direita
          }
          // Não aplicamos hitCeiling nem zeramos a vy, permitindo que o pulo continue
        } else {
          entity.y = ry + rh;       
          entity.vy = Math.max(entity.vy, 0);
          hitCeiling = true;
        }
      }
    } else {
      // Colisão horizontal
      if (overlapLeft < overlapRight) {
        entity.x = rx - ew;
      } else {
        entity.x = rx + rw;
      }
      entity.vx = 0;
      hitWall = true;
    }

    return { resolved: true, onGround, hitCeiling, hitWall };
  }

  // Aplica gravidade e integra posição
  function integrate(entity, dt) {
    const gravScale = entity.gravityScale ?? 1;
    entity.vy += GRAVITY * gravScale * dt;
    entity.vy = Math.min(entity.vy, MAX_FALL);

    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
  }

  // Verifica se dois retângulos se sobrepõem (AABB simples)
  function overlaps(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  return { integrate, resolveAABB, overlaps };
})();