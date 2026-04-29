// === LEVELS ===
// Definição das fases de Two To One
// Coordenadas em tiles (1 tile = 32px). Convertidas pelo Game.

const TILE = 32;

const LEVELS = [
  // ─────────────────────────────────────────────
  // LUXAR 1 — "O Eco da Luz"
  // ─────────────────────────────────────────────
  {
    id: 0,
    act: 1, actName: 'Ato 1 — Luxar (Despertar)',
    name: 'O Eco da Luz',
    activeChar: 'light',
    tiles: [
      [0, 16, 30, 4],  // Chão base visível (começa em 1024px, canvas termina em 1080px)
      [0, 0, 2, 20],   // Parede esq
      [28, 0, 2, 20],  // Parede dir
      [2, 12, 6, 1], [20, 10, 6, 1], [4, 6, 8, 1], [18, 4, 8, 1],
    ],
    players: {
      light: { col: 4, row: 14 },
      heavy: { col: 0, row: 0 },
    },
    crystals: [
      { id: 'c1', col: 5, row: 11 },
      { id: 'c2', col: 22, row: 9 },
      { id: 'c3', col: 20, row: 3 },
    ],
    portal: { col: 4, row: 2 },
    goalText: 'Alcançar a saída no topo. Ative os cristais de luz para revelar o caminho.',
  },

  // ─────────────────────────────────────────────
  // TENEBRE 1 — "Atravessando o Abismo"
  // ─────────────────────────────────────────────
  {
    id: 1,
    act: 2, actName: 'Ato 2 — Tenebre (Esquecimento)',
    name: 'Atravessando o Abismo',
    activeChar: 'heavy',
    tiles: [
      [0, 14, 6, 6],   // Início
      [24, 14, 6, 6],  // Fim
    ],
    players: {
      light: { col: 0, row: 0 },
      heavy: { col: 2, row: 12 },
    },
    echoPlatforms: [
      { id: 'e1', col: 8, row: 14, linkedCrystalId: 'c1' },
      { id: 'e2', col: 14, row: 14, linkedCrystalId: 'c2' },
      { id: 'e3', col: 20, row: 14, linkedCrystalId: 'c3' },
    ],
    portal: { col: 27, row: 12 },
    goalText: 'O caminho que ela iluminou agora sustenta seus passos.',
    // Ponte luminosa etérea que atravessa o abismo
    lumaBridge: { col: 6, row: 14, widthCols: 18, heightRows: 1 },
  },

  // ─────────────────────────────────────────────
  // TENEBRE 2 — "Peso do Passado"
  // ─────────────────────────────────────────────
  {
    id: 2,
    act: 2, actName: 'Ato 2 — Tenebre (Esquecimento)',
    name: 'Peso do Passado',
    activeChar: 'heavy',
    tiles: [
      [0, 18, 30, 2], // Chão principal
      [0, 0, 2, 18], [28, 0, 2, 18], // Paredes laterais
      [2, 12, 8, 1], // Plataforma elevada da caixa
    ],
    players: {
      light: { col: 0, row: 0 },
      heavy: { col: 4, row: 10 }, // Tenebre começa EM CIMA da plataforma
    },
    boxes: [
      { id: 'box_past', col: 6, row: 10 }, // Caixa que Tenebre empurra
    ],
    buttons: [
      { col: 21, row: 18, linkedId: 'gate1', lockOnPress: true },
    ],
    platforms: [
      // Portão de ferro que sobe verticalmente com corda visual
      { id: 'gate1', col: 21, row: 5, w: 5, h: 13, endCol: 21, endRow: -13, speed: 80, isIronGate: true },
    ],
    portal: { col: 26, row: 15 },
    goalText: 'O peso do passado abre o caminho. Use a caixa para erguer o portão e avance.',
  },

  // ─────────────────────────────────────────────
  // LUXAR 2 — "O Apoio Silencioso"
  // ─────────────────────────────────────────────
  {
    id: 3,
    act: 1, actName: 'Ato 1 — Luxar (Busca)',
    name: 'O Apoio Silencioso',
    activeChar: 'light',
    tiles: [
      [0, 18, 30, 2],
      [0, 0, 2, 18], [28, 0, 2, 18],
      // Plataforma [2,12,8,1] removida — bloqueava o caminho do elevador
      [12, 4, 4, 14], // Paredão de ruína restaurado
    ],
    players: {
      light: { col: 4, row: 16 }, // Luxar começa no chão na esquerda
      heavy: { col: 0, row: 0 },
    },
    crystals: [
      { id: 'c_bridge4', col: 14, row: 2 }, // Cristal para ativar a ponte na próxima fase
    ],
    boxes: [
      { id: 'box_past', col: 21, row: 17 }, // Salvo pelo GlobalState. Fallback no botão.
    ],
    buttons: [
      { col: 21, row: 18, linkedId: 'elev_lux', lockOnPress: true }, // Ativa o elevador da esq
    ],
    platforms: [
      // Elevador: ativado pelo botão (linkedId: 'elev_lux'), h:2 tamanho correto
      { id: 'elev_lux', col: 2, row: 16, w: 4, h: 2, endCol: 2, endRow: 1, speed: 70, elevatorMode: true, isElevator: true }
    ],
    portal: { col: 26, row: 15 },
    goalText: 'Um apoio distante. O peso deixado por ele ativa o elevador. Suba e ultrapasse a ruína.',
  },

  // ─────────────────────────────────────────────
  // TENEBRE 4 — "O Peso da Máquina"
  // ─────────────────────────────────────────────
  {
    id: 4,
    act: 2, actName: 'Ato 2 — Tenebre (Esquecimento)',
    name: 'O Peso da Máquina',
    activeChar: 'heavy',
    tiles: [
      [0, 16, 6, 2],    // Plataforma Inicial (Esquerda Chão)
      [14, 16, 6, 2],   // Ilha Central
      [24, 16, 6, 2],   // Plataforma Final (Direita Chão)
      [26, 0, 2, 12]    // Parede bloqueadora superior
    ],
    players: {
      light: { col: 0, row: 0 },
      heavy: { col: 2, row: 15 }, // Tenebre começa no chão
    },
    boxes: [
      { id: 'box_maquina1', col: 4, row: 14 },    // Movida para frente de Tenebre
      { id: 'box_maquina2', col: 18, row: 14 },  // Caixa na Ilha Central
    ],
    buttons: [
      { col: 16, row: 16, linkedId: 'bridge2', lockOnPress: true }, // Botão agora trava ao ser pressionado
      { col: 24, row: 16, linkedId: 'gate_final', lockOnPress: true }, // Botão da Plataforma Final (abre passagem pro portal)
    ],
    platforms: [
      { id: 'ferry', col: 6, row: 16, w: 3, h: 1, endCol: 11, endRow: 16, speed: 40, autoTrigger: true }, // Balsa cruzando Gap 1 automaticamente
      { id: 'bridge2', col: 20, row: 22, w: 4, h: 4, endCol: 20, endRow: 18, speed: 60, elevatorMode: true }, // Elevador preenchendo Gap 2
      { id: 'gate_final', col: 26, row: 12, w: 2, h: 4, endCol: 26, endRow: 0, speed: 50 }, // Porta final sobe
    ],
    portal: { col: 28, row: 13 },
    goalText: 'O abismo repudia as suas falhas. Posicione o peso perfeitamente e abra a passagem.',
    lumaBridge: { col: 20, row: 16, widthCols: 4, heightRows: 1, linkedCrystalId: 'c_bridge4', linkedButtonIdx: 0 },
  },

  // ─────────────────────────────────────────────
  // UNUM — "O Reconhecimento"
  // ─────────────────────────────────────────────
  {
    id: 5,
    act: 3, actName: 'Ato 3 — Unum (União)',
    name: 'O Reconhecimento',
    isFinal: true,
    tiles: [
      // Duas ilhas e o centro do portal
      [2, 18, 8, 2],   // Ilha da Luxar (Esquerda)
      [20, 18, 8, 2],  // Ilha do Tenebre (Direita)
      [14, 18, 2, 2],  // Ilha Central (Portal)
      [0, 0, 2, 18], [28, 0, 2, 18], // Paredes
    ],
    players: {
      light: { col: 4, row: 16 }, // Esquerda
      heavy: { col: 24, row: 16 }, // Direita
    },
    buttons: [
      { col: 8, row: 18, linkedId: 'bridge_heavy', lockOnPress: true }, // Luxar aperta para ajudar Tenebre
      { col: 20, row: 18, linkedId: 'bridge_light', lockOnPress: true }, // Tenebre aperta para ajudar Luxar
    ],
    platforms: [
      // Pontes de Luz (iniciam desativadas). Com elevatorMode true e as configs idênticas de movimento, funcionam como blocos ligáveis.
      { id: 'bridge_light', col: 10, row: 18, w: 4, h: 1, endCol: 10, endRow: 18, speed: 0, elevatorMode: true },
      { id: 'bridge_heavy', col: 16, row: 18, w: 4, h: 1, endCol: 16, endRow: 18, speed: 0, elevatorMode: true },
    ],
    portal: { col: 14, row: 16 },
    goalText: 'Ajude um ao outro. Trabalhem de forma assíncrona até se encontrarem no centro. Não éramos incompletos… apenas separados.',
  },
];

const ACT_NARRATIVES = {
  1: [
    "E se o mundo como conhecemos fosse apenas uma parte da verdade?",
    "Houve um tempo em que não existia separação. Éramos um.",
    "Até que fomos divididos… e esquecemos partes de nós mesmos.",
    "Uma parte que busca… mesmo sem lembrar o que perdeu."
  ],
  2: [
    "A luz se distancia.",
    "O mundo se torna instável… fragmentado… difícil de reconhecer.",
    "Uma parte esquecida… que aprendeu a existir sozinha.",
    "Pesada. Silenciosa. Persistente. E, ainda assim… conectada."
  ],
  3: [
    "No limite da distância… algo responde.",
    "Não como lembrança. Mas como reconhecimento.",
    "Duas existências. Dois caminhos. Um mesmo eco.",
    "Pela primeira vez… não há busca. Apenas encontro."
  ],
};
