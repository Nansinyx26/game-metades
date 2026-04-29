const Achievements = (() => {
  const list = {
    'first_light': { title: 'Primeira Luz', desc: 'Ativou seu primeiro cristal.' },
    'speedrunner': { title: 'Velocidade Pura', desc: 'Terminou uma fase em menos de 10 segundos.' },
    'pacifist': { title: 'Harmonia', desc: 'Terminou a fase sem empurrar nenhuma caixa.' },
    'double_jump': { title: 'Ascensão', desc: 'Usou o pulo duplo de Luxar.' },
    'slam_dunk': { title: 'Impacto Profundo', desc: 'Usou o Ground Slam de Tenebre.' }
  };

  const unlocked = new Set();
  const shownInRun = new Set(); // Controla o que já apareceu nesta "partida"

  function init() {
    const saved = localStorage.getItem('two-to-one-achievements');
    if (saved) {
      const arr = JSON.parse(saved);
      arr.forEach(id => unlocked.add(id));
    }
    updateList();
  }

  // Chamado ao iniciar uma partida do zero
  function clearRun() {
    shownInRun.clear();
  }

  function updateList() {
    const container = document.getElementById('achievements-list');
    if (!container) return;

    container.innerHTML = '';
    for (const id in list) {
      const ach = list[id];
      const isUnlocked = unlocked.has(id);
      const div = document.createElement('div');
      div.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
      div.innerHTML = `
        <span class="icon">${isUnlocked ? '✦' : '✧'}</span>
        <span class="name">${ach.title}</span>
      `;
      div.title = isUnlocked ? ach.desc : '???';
      container.appendChild(div);
    }
  }

  const achievementQueue = [];
  let isShowing = false;

  function unlock(id) {
    if (!list[id] || shownInRun.has(id)) return;

    // Marca como mostrado nesta partida
    shownInRun.add(id);

    // Se ainda não estiver no save global, adiciona
    if (!unlocked.has(id)) {
      unlocked.add(id);
      localStorage.setItem('two-to-one-achievements', JSON.stringify(Array.from(unlocked)));
      updateList();
    }
    
    // Mostra o pop-up (sempre que for a primeira vez nesta partida)
    achievementQueue.push(list[id]);
    processQueue();
  }

  function processQueue() {
    if (isShowing || achievementQueue.length === 0) return;
    
    isShowing = true;
    const achievement = achievementQueue.shift();
    showPopup(achievement);
  }

  function showPopup(achievement) {
    const div = document.createElement('div');
    div.className = 'achievement-popup';
    div.innerHTML = `
      <div class="achievement-icon">✦</div>
      <div class="achievement-info">
        <h3>${achievement.title}</h3>
        <p>${achievement.desc}</p>
      </div>
    `;
    document.body.appendChild(div);

    if (typeof AudioManager !== 'undefined') AudioManager.playFX('achievement');

    setTimeout(() => {
      div.classList.add('show');
    }, 100);

    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => {
        div.remove();
        isShowing = false;
        processQueue(); // Mostra a próxima conquista se houver
      }, 600);
    }, 4000);
  }

  return { init, unlock, clearRun };
})();

window.addEventListener('DOMContentLoaded', Achievements.init);
