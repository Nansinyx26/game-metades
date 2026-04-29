const DialogueData = {
  'light': {
    'folder': 'dialogos/Dialogios_Luxar/',
    'mapping': {
      'Onde... onde estamos?': 'luxar_0.mp3',
      'O abismo parece mais profundo hoje.': 'luxar_abismo.mp3',
      'Eu serei sua bússola.': 'luxar_bussola.mp3',
      'O fim está próximo, sinto o calor.': 'luxar_fim.mp3',
      'É hora de voltarmos a ser um.': 'luxar_unidade.mp3',
      'Sinto o fluxo voltando...': 'luxar_fluxo.mp3',
      'A energia... ela pulsa.': 'luxar_energia.mp3',
      'Um fragmento da unidade.': 'luxar_fragmento.mp3',
      'Luz em meio ao vazio.': 'luxar_vazio.mp3'
    }
  },
  'heavy': {
    'folder': 'dialogos/Dialogo_Tenebre/',
    'mapping': {
      'Sinto que não estamos sós.': 'tenebre_sos.mp3',
      'A escuridão aqui é... pesada.': 'tenebre_escuridao.mp3',
      'Juntos até a última centelha.': 'tenebre_centelha.mp3',
      'Finalmente... a Unidade.': 'tenebre_unidade.mp3'
    }
  }
};

const DialogueManager = (() => {
  const audioCache = {};

  // Pré-carrega todos os áudios para evitar atrasos na primeira execução
  function preload() {
    for (const char in DialogueData) {
      const charData = DialogueData[char];
      for (const key in charData.mapping) {
        const path = encodeURI(charData.folder + charData.mapping[key]);
        const audio = new Audio(path);
        audio.load();
        audioCache[path] = audio;
      }
    }
    console.log("[DialogueManager] Áudios pré-carregados.");
  }

  // Função para normalizar strings
  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const normalizedMapping = { 'light': {}, 'heavy': {} };
  for (const char in DialogueData) {
    for (const text in DialogueData[char].mapping) {
      normalizedMapping[char][normalize(text)] = DialogueData[char].mapping[text];
    }
  }

  function play(characterType, text) {
    const data = DialogueData[characterType];
    if (!data) return;

    const normText = normalize(text);
    const filename = normalizedMapping[characterType][normText];

    if (!filename) {
      console.warn(`[DialogueManager] Áudio não encontrado para: "${text}"`);
      return;
    }

    const path = encodeURI(data.folder + filename);
    let audio = audioCache[path];

    if (audio) {
      // Se já estiver tocando, reinicia
      audio.currentTime = 0;
    } else {
      audio = new Audio(path);
      audioCache[path] = audio;
    }

    audio.volume = 1.0;
    audio.play().catch(e => console.warn(`[DialogueManager] Erro ao tocar áudio: ${path}`, e));
  }

  // Tenta pré-carregar assim que possível
  setTimeout(preload, 1000);

  return { play, preload };
})();
