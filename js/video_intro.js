// === VIDEO INTRO MANAGER ===
// Gerencia a reprodução do vídeo inicial e transição para o menu

const VideoIntro = (() => {
  let video = null;
  let overlay = null;
  let isDone = false;

  function init() {
    video = document.getElementById('intro-video');
    overlay = document.getElementById('intro-start-overlay');

    if (!video) return;

    // Quando o vídeo termina
    video.onended = () => {
      finish();
    };

    // Apenas garante que a interface de despertar esteja visível
    overlay.style.display = 'flex';
  }

  function start() {
    if (video) {
      // Força recarregar caso estivesse preso
      if(video.readyState === 0) video.load(); 
      video.currentTime = 0;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          video.style.opacity = '1'; // Inicia o fade-in do CSS
          
          // Esmaece o overlay de início
          overlay.style.transition = 'opacity 0.6s ease';
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.style.display = 'none'; }, 600);
        }).catch(error => {
          console.error("Erro ao reproduzir o vídeo: ", error);
          finish(); // Pula o vídeo direto pro menu caso dê pau
        });
      }
    }
  }

  function skip() {
    finish();
  }

  function finish() {
    console.log('[VideoIntro] Finalizando intro e indo para o menu.');
    if (isDone) return;
    isDone = true;

    if (video) {
        // Ativa o menu por baixo com transição lenta de 5s
        Screen.show('screen-menu', 5);
        
        // Inicia o áudio do menu com fade-in de 5s
        if (typeof AudioManager !== 'undefined') {
            AudioManager.fadeIn('menu', 0.5, 5000);
        }
        
        // Transição suave do vídeo: fade out + blur + volume fade (5s)
        const screen = document.getElementById('screen-intro');
        screen.style.transition = 'opacity 5s ease, filter 5s ease';
        screen.style.opacity = '0';
        screen.style.filter = 'blur(15px)';
        
        // Esmaecer o áudio do vídeo original
        const fadeAudio = setInterval(() => {
            if (video.volume > 0.02) {
                video.volume -= 0.02;
            } else {
                video.volume = 0;
                clearInterval(fadeAudio);
            }
        }, 100);

        setTimeout(() => {
            video.pause();
            screen.style.display = 'none';
            clearInterval(fadeAudio);
        }, 5000);
    } else {
        Screen.show('screen-menu');
    }
  }

  // Inicializa quando o DOM estiver pronto
  window.addEventListener('DOMContentLoaded', init);

  return { start, skip };
})();
