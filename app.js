let activeQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let practiceMode = false;
let streakToastTimer = null;
let screenMoodTimer = null;
let answerEffectTimer = null;
let activeSessionTitle = '';
let testFinished = false;
let testFinishing = false;
let answerEffectGeneration = 0;
let resultEffectTimer = null;
let celebrationNextTimer = null;

const PROFILE_STORAGE_KEY = 'transportista_player_profile_v1';
const SETTINGS_STORAGE_KEY = 'transportista_player_settings_v1';
const APP_SCREENS = ['mainMenu', 'setupScreen', 'challengeScreen', 'optionsScreen', 'profileScreen'];
let activeChallenge = null;
let dailyEntryState = null;
let pendingChallengePart = null;
let achievementRevealQueue = [];
let achievementRevealActive = false;
let pendingLevelUpQueue = [];

const PLAYER_RANKS = [
  { title: '🚦 Aprendiz del Volante' },
  { title: '🚚 Conductor Novato' },
  { title: '📦 Transportista' },
  { title: '🚛 Conductor Profesional' },
  { title: '🚛 Transportista Experimentado' },
  { title: '🔧 Especialista del Transporte' },
  { title: '🏅 Maestro del Volante' },
  { title: '🦅 Capitán de Carretera' },
  { title: '👑 Jefe de Flota' },
  { title: '🏆 Director de Transporte' },
  { title: '⚡ Comandante Logístico' },
  { title: '🔥 Señor de las Carreteras' },
  { title: '💎 Magnate del Transporte' },
  { title: '🐉 Leyenda del Transporte' },
  { title: '🌍 Emperador de las Carreteras' }
];
const XP_PER_CORRECT_ANSWER = 1;
const LEGACY_XP_PER_CORRECT_ANSWER = 1;
const XP_LEVEL_BASE = 100;
const XP_LEVEL_GROWTH = 1.35;
const ACHIEVEMENT_RARITIES = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario'];

function defaultPlayerProfile() {
  return {
    name: 'Jugador',
    testsCompleted: 0,
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    totalWrong: 0,
    practicalTestsCompleted: 0,
    practicalQuestionsAnswered: 0,
    practicalCorrect: 0,
    practicalWrong: 0,
    practicalBestStreak: 0,
    bestStreak: 0,
    bestComebackStreak: 0,
    totalXP: 0,
    masteredQuestionIds: [],
    questionCorrectCounts: {},
    unlockedAchievements: [],
    achievementXPClaimed: [],
    perfectTestsStreak: 0,
    practiceDates: [],
    dailyUsageDates: [],
    dailyStreak: 0,
    bestDailyStreak: 0,
    dailyBreakNoticeDate: '',
    lastActiveDate: '',
    challengeProgress: {},
    history: []
  };
}

function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaultPlayerProfile();
    const parsed = JSON.parse(raw);
    const fallback = defaultPlayerProfile();
    return {
      ...fallback,
      ...parsed,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 32) : fallback.name,
      testsCompleted: Math.max(0, Number(parsed.testsCompleted) || 0),
      totalQuestionsAnswered: Math.max(0, Number(parsed.totalQuestionsAnswered) || 0),
      totalCorrect: Math.max(0, Number(parsed.totalCorrect) || 0),
      totalWrong: Math.max(0, Number(parsed.totalWrong) || 0),
      practicalTestsCompleted: Math.max(0, Number(parsed.practicalTestsCompleted !== undefined ? parsed.practicalTestsCompleted : (Array.isArray(parsed.history) ? parsed.history.filter(function(x){return x.type === 'supuestos';}).length : 0)) || 0),
      practicalQuestionsAnswered: Math.max(0, Number(parsed.practicalQuestionsAnswered !== undefined ? parsed.practicalQuestionsAnswered : (Array.isArray(parsed.history) ? parsed.history.filter(function(x){return x.type === 'supuestos';}).reduce(function(n,x){return n + (Number(x.answered)||0);},0) : 0)) || 0),
      practicalCorrect: Math.max(0, Number(parsed.practicalCorrect !== undefined ? parsed.practicalCorrect : (Array.isArray(parsed.history) ? parsed.history.filter(function(x){return x.type === 'supuestos';}).reduce(function(n,x){return n + (Number(x.correct)||0);},0) : 0)) || 0),
      practicalWrong: Math.max(0, Number(parsed.practicalWrong !== undefined ? parsed.practicalWrong : (Array.isArray(parsed.history) ? parsed.history.filter(function(x){return x.type === 'supuestos';}).reduce(function(n,x){return n + (Number(x.wrong)||0);},0) : 0)) || 0),
      practicalBestStreak: Math.max(0, Number(parsed.practicalBestStreak !== undefined ? parsed.practicalBestStreak : (Array.isArray(parsed.history) ? parsed.history.filter(function(x){return x.type === 'supuestos';}).reduce(function(n,x){return Math.max(n, Number(x.bestStreak)||0);},0) : 0)) || 0),
      bestStreak: Math.max(0, Number(parsed.bestStreak) || 0),
      bestComebackStreak: Math.max(0, Number(parsed.bestComebackStreak) || 0),
      totalXP: Math.max(0, Math.floor(parsed.totalXP !== undefined ? (Number(parsed.totalXP) || 0) : ((Number(parsed.totalCorrect) || 0) * XP_PER_CORRECT_ANSWER))),
      masteredQuestionIds: Array.isArray(parsed.masteredQuestionIds) ? parsed.masteredQuestionIds : [],
      questionCorrectCounts: parsed.questionCorrectCounts && typeof parsed.questionCorrectCounts === 'object' ? parsed.questionCorrectCounts : {},
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      achievementXPClaimed: Array.isArray(parsed.achievementXPClaimed) ? parsed.achievementXPClaimed : [],
      perfectTestsStreak: Math.max(0, Number(parsed.perfectTestsStreak) || 0),
      practiceDates: Array.isArray(parsed.practiceDates) ? parsed.practiceDates : [],
      dailyUsageDates: Array.isArray(parsed.dailyUsageDates) ? parsed.dailyUsageDates : [],
      dailyStreak: Math.max(0, Number(parsed.dailyStreak) || 0),
      bestDailyStreak: Math.max(0, Number(parsed.bestDailyStreak) || 0),
      dailyBreakNoticeDate: typeof parsed.dailyBreakNoticeDate === 'string' ? parsed.dailyBreakNoticeDate : '',
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : '',
      challengeProgress: parsed.challengeProgress && typeof parsed.challengeProgress === 'object' ? parsed.challengeProgress : {},
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 40) : []
    };
  } catch (error) {
    console.warn('No se pudo leer el perfil local:', error);
    return defaultPlayerProfile();
  }
}

function defaultPlayerSettings() {
  return { effectsEnabled: true, fireIntensity: 'apocalipsis', reducedMotion: false, shakeEnabled: true, shakeMaxDistance: 2, shakeBaseDuration: 1000 };
}

function loadPlayerSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultPlayerSettings();
    const parsed = JSON.parse(raw) || {};
    return {
      effectsEnabled: parsed.effectsEnabled !== false,
      fireIntensity: ['fuerte', 'inferno', 'apocalipsis'].indexOf(parsed.fireIntensity) !== -1 ? parsed.fireIntensity : 'apocalipsis',
      reducedMotion: parsed.reducedMotion === true,
      shakeEnabled: parsed.shakeEnabled !== false,
      shakeMaxDistance: Math.min(2, Math.max(0.5, Number(parsed.shakeMaxDistance) || 2)),
      shakeBaseDuration: Math.min(1000, Math.max(100, Number(parsed.shakeBaseDuration) || 1000))
    };
  } catch (error) {
    console.warn('No se pudieron leer las opciones locales:', error);
    return defaultPlayerSettings();
  }
}

let playerProfile = loadPlayerProfile();
let playerSettings = loadPlayerSettings();

function savePlayerProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(playerProfile));
    return true;
  } catch (error) {
    console.warn('No se pudo guardar el perfil local:', error);
    showEffectToast('No se pudo guardar. Comprueba el almacenamiento del navegador.', 'ice');
    return false;
  }
}

function savePlayerSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(playerSettings));
    return true;
  } catch (error) {
    console.warn('No se pudieron guardar las opciones:', error);
    return false;
  }
}

function applyPlayerSettings() {
  const body = document.body;
  body.classList.toggle('effects-disabled', !playerSettings.effectsEnabled);
  body.classList.toggle('reduced-motion-mode', !!playerSettings.reducedMotion);
  body.dataset.fireIntensity = playerSettings.fireIntensity || 'apocalipsis';
  const effects = document.getElementById('effectsEnabled');
  const intensity = document.getElementById('fireIntensitySelect');
  const reduced = document.getElementById('reducedMotionToggle');
  const shake = document.getElementById('shakeEnabled');
  const shakeDistance = document.getElementById('shakeMaxDistance');
  const shakeDuration = document.getElementById('shakeBaseDuration');
  const shakeDistanceValue = document.getElementById('shakeMaxDistanceValue');
  const shakeDurationValue = document.getElementById('shakeBaseDurationValue');
  if (effects) effects.checked = !!playerSettings.effectsEnabled;
  if (intensity) intensity.value = playerSettings.fireIntensity || 'apocalipsis';
  if (reduced) reduced.checked = !!playerSettings.reducedMotion;
  if (shake) shake.checked = !!playerSettings.shakeEnabled;
  if (shakeDistance) shakeDistance.value = String(playerSettings.shakeMaxDistance);
  if (shakeDuration) shakeDuration.value = String(playerSettings.shakeBaseDuration);
  if (shakeDistanceValue) shakeDistanceValue.textContent = Number(playerSettings.shakeMaxDistance).toFixed(1) + ' px';
  if (shakeDurationValue) shakeDurationValue.textContent = playerSettings.shakeBaseDuration + ' ms';
}

function showAppScreen(screenId) {
  APP_SCREENS.forEach(function(id) {
    const screen = document.getElementById(id);
    if (screen) screen.hidden = id !== screenId;
  });
  document.getElementById('mobileDock').hidden = screenId !== 'setupScreen' || !activeQuestions.length;
  if (screenId === 'mainMenu') renderMainMenu();
  if (screenId === 'challengeScreen') renderChallengeScreen();
  if (screenId === 'profileScreen') renderProfileScreen();
  if (screenId === 'optionsScreen') applyPlayerSettings();
  window.scrollTo({ top: 0, behavior: playerSettings.reducedMotion ? 'auto' : 'smooth' });
}

function openSetupScreen() {
  resetScreenMood();
  document.getElementById('controls').style.display = '';
  document.getElementById('testArea').style.display = 'none';
  document.getElementById('scoreBox').innerHTML = '';
  document.getElementById('scoreBox').className = '';
  showAppScreen('setupScreen');
}

function calculateBestStreak(questions, answers) {
  let current = 0;
  let best = 0;
  questions.forEach(function(question, index) {
    if (answers[index] && answers[index] === question.correct) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  });
  return best;
}

function calculateBestComebackStreak(questions, answers) {
  let wrongRun = 0;
  let current = 0;
  let best = 0;
  let comebackArmed = false;
  questions.forEach(function(question, index) {
    const answer = answers[index];
    if (!answer || answer !== question.correct) {
      wrongRun++;
      current = 0;
      if (wrongRun >= 3) comebackArmed = true;
      return;
    }
    wrongRun = 0;
    if (comebackArmed) {
      current++;
      best = Math.max(best, current);
    }
  });
  return best;
}

function getTopicDisplayLabel(topic, rawLabel) {
  const match = String(topic || '').match(/^1([A-H])(\d{2})$/);
  const raw = String(rawLabel || '');
  const title = raw.replace(/^(?:Tema|Supuesto)\s+\S+\s*[–—-]\s*/i, '').trim();
  if (!match) return title || raw || String(topic || '');
  const moduleLetter = match[1];
  const topicNumber = String(parseInt(match[2], 10));
  return 'Bloque ' + moduleLetter + ' · Tema ' + topicNumber + (title ? ' — ' + title : '');
}

function getSessionTitle() {
  const mode = document.getElementById('modeSelect').value;
  const isPractical = currentTestType() === 'supuestos';
  const type = isPractical ? 'Supuestos prácticos' : 'Preguntas tipo test';
  const unit = isPractical ? 'supuestos' : 'preguntas';
  const count = activeQuestions.length;
  if (mode === 'topic') {
    const labels = isPractical ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;
    const topic = document.getElementById('topicSelect').value;
    return count + ' ' + unit + ' · ' + getTopicDisplayLabel(topic, labels[topic]);
  }
  if (mode === 'block') {
    const labels = currentTestType() === 'supuestos' ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
    const block = document.getElementById('blockSelect').value;
    const blockLabel = labels[block] || block;
    return count + ' ' + unit + ' · ' + (/^bloque\b/i.test(blockLabel) ? blockLabel : 'Bloque ' + blockLabel);
  }
  return count + ' ' + unit + ' · ' + type;
}

function getTotalBankQuestionCount() {
  return (Array.isArray(ALL_QUESTIONS) ? ALL_QUESTIONS.length : 0) + (Array.isArray(ALL_SUPUESTOS) ? ALL_SUPUESTOS.length : 0);
}

// Las preguntas tipo test y los supuestos representan aproximadamente el 50 %
// del examen cada uno. Se concede 1 XP por pregunta objetiva y una cantidad
// proporcionalmente mayor por supuesto, calculada según el tamaño de ambos bancos.
function getXPForQuestionType(type) {
  if (type === 'supuestos') {
    const objectiveCount = Array.isArray(ALL_QUESTIONS) ? ALL_QUESTIONS.length : 0;
    const practicalCount = Array.isArray(ALL_SUPUESTOS) ? ALL_SUPUESTOS.length : 0;
    return practicalCount > 0 ? Math.max(2, Math.round(objectiveCount / practicalCount)) : 2;
  }
  return XP_PER_CORRECT_ANSWER;
}

// El objetivo de XP equivale a acertar todo el banco dos veces con la
// ponderación 50/50 entre preguntas objetivas y supuestos prácticos.
function getAchievementXPForRarity(rarity) {
  return ({ 'Común': 10, 'Poco común': 20, 'Raro': 40, 'Épico': 70, 'Legendario': 100 })[rarity] || 10;
}

function getXPForMaximumLevel() {
  const objectiveCount = Array.isArray(ALL_QUESTIONS) ? ALL_QUESTIONS.length : 0;
  const practicalCount = Array.isArray(ALL_SUPUESTOS) ? ALL_SUPUESTOS.length : 0;
  const questionXP = 2 * (objectiveCount * getXPForQuestionType('objetivas') + practicalCount * getXPForQuestionType('supuestos'));
  const achievementXP = getAchievementDefinitions().reduce(function(sum, item) { return sum + getAchievementXPForRarity(item.rarity); }, 0);
  return Math.max(1, questionXP + achievementXP);
}

function xpRequiredForLevel(level) {
  const maxLevel = PLAYER_RANKS.length;
  const targetTotal = getXPForMaximumLevel();
  const weights = [];
  let weightTotal = 0;
  for (let i = 1; i < maxLevel; i++) {
    const weight = Math.pow(XP_LEVEL_GROWTH, i - 1);
    weights.push(weight);
    weightTotal += weight;
  }
  const safeLevel = Math.max(1, Math.min(maxLevel - 1, Math.floor(level)));
  const cumulativeWeight = weights.slice(0, safeLevel).reduce((sum, value) => sum + value, 0);
  const previousWeight = weights.slice(0, safeLevel - 1).reduce((sum, value) => sum + value, 0);
  const cumulativeXP = Math.round(targetTotal * cumulativeWeight / weightTotal);
  const previousXP = Math.round(targetTotal * previousWeight / weightTotal);
  return Math.max(1, cumulativeXP - previousXP);
}

function getXPPerCorrectAnswer() {
  return XP_PER_CORRECT_ANSWER;
}

function getPlayerLevelInfo(totalXP) {
  let level = 1;
  let remainingXP = Math.max(0, Number(totalXP) || 0);
  while (level < PLAYER_RANKS.length) {
    const required = xpRequiredForLevel(level);
    if (remainingXP < required) break;
    remainingXP -= required;
    level++;
  }
  const requiredForNext = level < PLAYER_RANKS.length ? xpRequiredForLevel(level) : 0;
  return {
    level: level,
    rank: PLAYER_RANKS[level - 1],
    currentXP: remainingXP,
    requiredXP: requiredForNext,
    progress: requiredForNext ? Math.min(100, Math.round((remainingXP / requiredForNext) * 100)) : 100,
    maxLevel: level === PLAYER_RANKS.length
  };
}

function questionProgressId(question, type) {
  return (type || currentTestType()) + ':' + String(question.code || question.topic || question.question);
}

function getThemeGroups() {
  const groups = {};
  [['objetivas', ALL_QUESTIONS], ['supuestos', ALL_SUPUESTOS]].forEach(function(entry) {
    entry[1].forEach(function(question) {
      const match = String(question.topic || '').match(/^1([A-H])/);
      if (!match) return;
      const key = match[1];
      if (!groups[key]) groups[key] = [];
      groups[key].push(questionProgressId(question, entry[0]));
    });
  });
  return groups;
}

function getAchievementDefinitions() {
  const answered = playerProfile.totalQuestionsAnswered;
  const correct = playerProfile.totalCorrect;
  const accuracy = answered ? correct / answered * 100 : 0;
  const history = playerProfile.history || [];
  const bestTestAccuracy = history.reduce(function(best, item) {
    return Math.max(best, Number(item.accuracyPct) || 0);
  }, 0);
  const groups = getThemeGroups();
  const practicalCount = Array.isArray(ALL_SUPUESTOS) ? ALL_SUPUESTOS.length : 0;
  const mastered = new Set(playerProfile.masteredQuestionIds || []);
  const topicAchievements = Object.keys(groups).sort().map(function(letter) {
    const ids = groups[letter];
    const done = ids.filter(function(id) { return mastered.has(id); }).length;
    return {
      id: 'theme-' + letter,
      category: 'Dominio de temas',
      title: 'Tema ' + letter + ' completado',
      description: 'Acertar todas las preguntas de todos los subtemas del tema ' + letter + ', incluidos sus supuestos prácticos.',
      icon: '📚', rarity: 'Legendario', progress: done, target: ids.length,
      unlocked: ids.length > 0 && done === ids.length
    };
  });
  const definitions = [
    { id:'first-test', category:'Primeros pasos', title:'Primer viaje', description:'Completa tu primer test.', icon:'🚛', rarity:'Común', progress:playerProfile.testsCompleted, target:1, unlocked:playerProfile.testsCompleted>=1 },
    { id:'ten-answered', category:'Primeros pasos', title:'Arrancando motores', description:'Responde 10 preguntas.', icon:'🔑', rarity:'Común', progress:answered, target:10, unlocked:answered>=10 },
    { id:'fifty-answered', category:'Primeros pasos', title:'En ruta', description:'Responde 50 preguntas.', icon:'🛣️', rarity:'Poco común', progress:answered, target:50, unlocked:answered>=50 },
    { id:'hundred-answered', category:'Primeros pasos', title:'Kilómetro 100', description:'Responde 100 preguntas.', icon:'📍', rarity:'Poco común', progress:answered, target:100, unlocked:answered>=100 },
    { id:'first-pass', category:'Primeros pasos', title:'Primer destino', description:'Aprueba tu primer test.', icon:'🏁', rarity:'Poco común', progress:history.filter(function(x){return x.passed;}).length, target:1, unlocked:history.some(function(x){return x.passed;}) },

    { id:'five-tests', category:'Dominio del transporte', title:'Estudiante de carretera', description:'Completa 5 tests.', icon:'📘', rarity:'Común', progress:playerProfile.testsCompleted, target:5, unlocked:playerProfile.testsCompleted>=5 },
    { id:'ten-tests', category:'Dominio del transporte', title:'Profesional del volante', description:'Completa 10 tests.', icon:'🎓', rarity:'Poco común', progress:playerProfile.testsCompleted, target:10, unlocked:playerProfile.testsCompleted>=10 },
    { id:'hundred-correct', category:'Dominio del transporte', title:'Cerebro logístico', description:'Acumula 100 respuestas correctas.', icon:'🧠', rarity:'Raro', progress:correct, target:100, unlocked:correct>=100 },
    { id:'five-hundred-correct', category:'Dominio del transporte', title:'Experto en transporte', description:'Acumula 500 respuestas correctas.', icon:'🏆', rarity:'Épico', progress:correct, target:500, unlocked:correct>=500 },
    { id:'thousand-correct', category:'Dominio del transporte', title:'Maestro del transporte', description:'Acumula 1.000 respuestas correctas.', icon:'👑', rarity:'Legendario', progress:correct, target:1000, unlocked:correct>=1000 },

    { id:'accuracy-70', category:'Precisión y perfección', title:'Buena puntería', description:'Alcanza un 70 % de aciertos global.', icon:'🎯', rarity:'Poco común', progress:Math.round(accuracy), target:70, suffix:'%', unlocked:answered>0 && accuracy>=70 },
    { id:'accuracy-90', category:'Precisión y perfección', title:'Precisión profesional', description:'Alcanza un 90 % de aciertos global.', icon:'💯', rarity:'Épico', progress:Math.round(accuracy), target:90, suffix:'%', unlocked:answered>0 && accuracy>=90 },
    { id:'perfect-test', category:'Precisión y perfección', title:'Matrícula de honor', description:'Consigue un 100 % en un test completo.', icon:'🥇', rarity:'Épico', progress:bestTestAccuracy, target:100, suffix:'%', unlocked:history.some(function(x){return x.accuracyPct===100 && x.blank===0;}) },
    { id:'twenty-clean', category:'Precisión y perfección', title:'Sin errores', description:'Consigue 20 respuestas correctas seguidas.', icon:'💎', rarity:'Épico', progress:playerProfile.bestStreak, target:20, unlocked:playerProfile.bestStreak>=20 },
    { id:'five-perfect-tests', category:'Precisión y perfección', title:'Examen perfecto', description:'Aprueba 5 tests consecutivos con el 100 %.', icon:'🏅', rarity:'Legendario', progress:playerProfile.perfectTestsStreak, target:5, unlocked:playerProfile.perfectTestsStreak>=5 },

    { id:'streak-five', category:'Rachas', title:'Motor caliente', description:'Consigue 5 respuestas correctas seguidas.', icon:'🔥', rarity:'Común', progress:playerProfile.bestStreak, target:5, unlocked:playerProfile.bestStreak>=5 },
    { id:'streak-ten', category:'Rachas', title:'Motor al rojo vivo', description:'Consigue 10 respuestas correctas seguidas.', icon:'🔥', rarity:'Raro', progress:playerProfile.bestStreak, target:10, unlocked:playerProfile.bestStreak>=10 },
    { id:'streak-twenty', category:'Rachas', title:'Fuego en carretera', description:'Consigue 20 respuestas correctas seguidas.', icon:'🔥', rarity:'Épico', progress:playerProfile.bestStreak, target:20, unlocked:playerProfile.bestStreak>=20 },
    { id:'streak-thirty', category:'Rachas', title:'Imparable', description:'Consigue una racha de 30 aciertos.', icon:'⚡', rarity:'Legendario', progress:playerProfile.bestStreak, target:30, unlocked:playerProfile.bestStreak>=30 },
    { id:'cold-blood', category:'Rachas', title:'Sangre fría', description:'Tras 3 respuestas incorrectas, consigue 5 aciertos seguidos.', icon:'❄️', rarity:'Épico', progress:playerProfile.bestComebackStreak, target:5, unlocked:playerProfile.bestComebackStreak>=5 },

    { id:'morning-driver', category:'Constancia', title:'Madrugador', description:'Completa un test antes de las 8:00.', icon:'🌅', rarity:'Poco común', progress:playerProfile.earlyBird?1:0, target:1, unlocked:!!playerProfile.earlyBird },
    { id:'night-shift', category:'Constancia', title:'Turno nocturno', description:'Completa un test después de las 22:00.', icon:'🌙', rarity:'Poco común', progress:playerProfile.nightOwl?1:0, target:1, unlocked:!!playerProfile.nightOwl },
    { id:'seven-days', category:'Constancia', title:'Semana en ruta', description:'Practica en 7 días diferentes.', icon:'📅', rarity:'Raro', progress:playerProfile.practiceDates.length, target:7, unlocked:playerProfile.practiceDates.length>=7 },
    { id:'thirty-days', category:'Constancia', title:'Transportista constante', description:'Practica en 30 días diferentes.', icon:'🗓️', rarity:'Legendario', progress:playerProfile.practiceDates.length, target:30, unlocked:playerProfile.practiceDates.length>=30 },
    { id:'ten-completed', category:'Constancia', title:'Sin abandonar', description:'Completa 10 tests.', icon:'🧱', rarity:'Épico', progress:playerProfile.testsCompleted, target:10, unlocked:playerProfile.testsCompleted>=10 },

    { id:'practical-first', category:'Supuestos prácticos', title:'Primer caso resuelto', description:'Completa tu primer test de supuestos prácticos.', icon:'📋', rarity:'Común', progress:playerProfile.practicalTestsCompleted, target:1, unlocked:playerProfile.practicalTestsCompleted>=1 },
    { id:'practical-ten', category:'Supuestos prácticos', title:'Analista en prácticas', description:'Acumula 10 respuestas correctas en supuestos prácticos.', icon:'🧩', rarity:'Común', progress:playerProfile.practicalCorrect, target:10, unlocked:playerProfile.practicalCorrect>=10 },
    { id:'practical-fifty', category:'Supuestos prácticos', title:'Resolutor de casos', description:'Acumula 50 respuestas correctas en supuestos prácticos.', icon:'📝', rarity:'Poco común', progress:playerProfile.practicalCorrect, target:50, unlocked:playerProfile.practicalCorrect>=50 },
    { id:'practical-hundred', category:'Supuestos prácticos', title:'Especialista práctico', description:'Acumula 100 respuestas correctas en supuestos prácticos.', icon:'🔍', rarity:'Raro', progress:playerProfile.practicalCorrect, target:100, unlocked:playerProfile.practicalCorrect>=100 },
    { id:'practical-two-fifty', category:'Supuestos prácticos', title:'Experto en escenarios', description:'Acumula 250 respuestas correctas en supuestos prácticos.', icon:'🧠', rarity:'Épico', progress:playerProfile.practicalCorrect, target:250, unlocked:playerProfile.practicalCorrect>=250 },
    { id:'practical-five-hundred', category:'Supuestos prácticos', title:'Maestro de los supuestos', description:'Acumula 500 respuestas correctas en supuestos prácticos.', icon:'🏆', rarity:'Legendario', progress:playerProfile.practicalCorrect, target:500, unlocked:playerProfile.practicalCorrect>=500 },
    { id:'practical-accuracy-80', category:'Supuestos prácticos', title:'Buen criterio', description:'Alcanza un 80 % de acierto en supuestos prácticos.', icon:'🎯', rarity:'Raro', progress:playerProfile.practicalQuestionsAnswered ? Math.round(playerProfile.practicalCorrect / playerProfile.practicalQuestionsAnswered * 100) : 0, target:80, suffix:'%', unlocked:playerProfile.practicalQuestionsAnswered>0 && playerProfile.practicalCorrect / playerProfile.practicalQuestionsAnswered >= 0.8 },
    { id:'practical-perfect', category:'Supuestos prácticos', title:'Caso impecable', description:'Completa un test de supuestos prácticos sin fallos ni respuestas en blanco.', icon:'💎', rarity:'Épico', progress:history.filter(function(x){return x.type==='supuestos' && x.accuracyPct===100 && x.blank===0;}).length, target:1, unlocked:history.some(function(x){return x.type==='supuestos' && x.accuracyPct===100 && x.blank===0;}) },
    { id:'practical-streak-ten', category:'Supuestos prácticos', title:'Cadena de razonamiento', description:'Consigue 10 supuestos prácticos correctos seguidos.', icon:'🔗', rarity:'Épico', progress:playerProfile.practicalBestStreak, target:10, unlocked:playerProfile.practicalBestStreak>=10 },
    { id:'practical-all-mastered', category:'Supuestos prácticos', title:'Dominio de los casos', description:'Acierta todas las preguntas del banco de supuestos prácticos al menos una vez.', icon:'👑', rarity:'Legendario', progress:(playerProfile.masteredQuestionIds || []).filter(function(id){return id.indexOf('supuestos:')===0;}).length, target:practicalCount, unlocked:practicalCount>0 && (playerProfile.masteredQuestionIds || []).filter(function(id){return id.indexOf('supuestos:')===0;}).length>=practicalCount },
    { id:'secret-perfect-marathon', category:'Secretos', title:'Ruta impecable', description:'Completa un test de al menos 50 preguntas con el 100 % de aciertos.', icon:'🛣️', rarity:'Legendario', progress:0, target:1, unlocked:history.some(function(x){return x.totalQuestions>=50 && x.accuracyPct===100 && x.blank===0;}), secret:true },
    { id:'secret-long-haul', category:'Secretos', title:'Kilómetro infinito', description:'Completa 100 preguntas en una sola sesión.', icon:'♾️', rarity:'Épico', progress:0, target:1, unlocked:history.some(function(x){return x.totalQuestions>=100 && x.answered>=100;}), secret:true },
    { id:'secret-shift-change', category:'Secretos', title:'Cambio de turno', description:'Completa un test antes de las 8:00 y otro después de las 22:00.', icon:'🌗', rarity:'Raro', progress:0, target:1, unlocked:!!playerProfile.earlyBird && !!playerProfile.nightOwl, secret:true }
  ];
  const challengeAchievements=[];
  getChallengeTopics().forEach(function(meta){ const state=getChallengeState(meta.topic); const done=challengePartsDone(meta.topic); const label=meta.title;
    if(meta.questionCount) challengeAchievements.push({id:'challenge-test-'+meta.topic,category:'Desafíos',title:'Test superado · '+label,description:'Aprueba el bloque de preguntas del '+meta.displayLabel+'.',icon:'📘',rarity:'Raro',progress:state.test?1:0,target:1,unlocked:!!state.test});
    if(meta.hasSuppositionPart) challengeAchievements.push({id:'challenge-practical-'+meta.topic,category:'Desafíos',title:'Supuestos dominados · '+label,description:'Completa la parte práctica indicada para '+meta.displayLabel+'.',icon:'🧩',rarity:'Épico',progress:state.practical?1:0,target:1,unlocked:!!state.practical});
    challengeAchievements.push({id:'challenge-complete-'+meta.topic,category:'Desafíos',title:'Desafío completado · '+label,description:'Completa todas las partes de '+meta.displayLabel+'.',icon:'🏆',rarity:'Legendario',progress:done?1:0,target:1,unlocked:done});
  });
  return definitions.concat(topicAchievements,challengeAchievements);
}

function checkAndUnlockAchievements(suppressLevelAnimation) {
  const levelBeforeRewards = getPlayerLevelInfo(playerProfile.totalXP).level;
  const definitions = getAchievementDefinitions();
  const newlyUnlocked = [];
  const newlyPaid = [];
  definitions.forEach(function(item) {
    if (!item.unlocked) return;
    if (playerProfile.unlockedAchievements.indexOf(item.id) === -1) {
      playerProfile.unlockedAchievements.push(item.id);
      newlyUnlocked.push(item);
    }
    if (playerProfile.achievementXPClaimed.indexOf(item.id) === -1) {
      const reward = getAchievementXPForRarity(item.rarity);
      playerProfile.totalXP = Math.floor(playerProfile.totalXP) + reward;
      playerProfile.achievementXPClaimed.push(item.id);
      newlyPaid.push({ item: item, reward: reward });
    }
  });
  if (newlyUnlocked.length || newlyPaid.length) {
    savePlayerProfile();
    newlyPaid.forEach(function(entry) {
      enqueueAchievementReveal(entry.item, entry.reward, newlyUnlocked.some(function(item) { return item.id === entry.item.id; }));
    });
  }
  const levelAfterRewards = getPlayerLevelInfo(playerProfile.totalXP).level;
  if (!suppressLevelAnimation && levelAfterRewards > levelBeforeRewards) {
    showLevelUpAnimation(levelBeforeRewards, levelAfterRewards);
  }
  return newlyUnlocked;
}

function awardCorrectQuestion(question, type, silent, deferSave, streakMultiplier) {
  const id = questionProgressId(question, type);
  const previousCount = Math.max(0, Number(playerProfile.questionCorrectCounts[id]) || 0);
  if (previousCount >= 2) return 0;
  const previousLevel = getPlayerLevelInfo(playerProfile.totalXP).level;
  playerProfile.questionCorrectCounts[id] = previousCount + 1;
  if (playerProfile.masteredQuestionIds.indexOf(id) === -1) playerProfile.masteredQuestionIds.push(id);
  // Cada supuesto vale más XP que una pregunta objetiva. El banco completo
  // mantiene el objetivo: alcanzar el nivel 15 tras acertarlo dos veces.
  const xpValue = getXPForQuestionType(type);
  const earnedXP = Math.min(xpValue, Math.max(0, getXPForMaximumLevel() - playerProfile.totalXP));
  playerProfile.totalXP = Math.floor(playerProfile.totalXP) + earnedXP;
  if (!deferSave) {
    savePlayerProfile();
    // El nivel se comprueba después de pagar los logros para no perder una subida
    // causada por la XP de un logro ni mostrar dos animaciones en la misma respuesta.
    checkAndUnlockAchievements(true);
  }
  const nextLevel = getPlayerLevelInfo(playerProfile.totalXP).level;
  if (!silent) {
    if (nextLevel > previousLevel) {
      showLevelUpAnimation(previousLevel, nextLevel);
    } else if (earnedXP > 0) {
      showEffectToast('+' + Math.round(earnedXP) + ' XP' + (type === 'supuestos' ? ' · SUPUESTO' : ' · TEST'), 'fire');
    }
  }
  if (!deferSave) {
    if (!document.getElementById('profileScreen').hidden) renderProfileScreen();
    renderMainMenu();
    updateInTestPlayerHUD();
  }
  return earnedXP;
}

function showLevelUpAnimation(previousLevel, nextLevel) {
  const levelOverlay = document.getElementById('levelUpOverlay');
  if (achievementRevealActive || achievementRevealQueue.length || (levelOverlay && !levelOverlay.hidden)) {
    pendingLevelUpQueue.push({ previousLevel: previousLevel, nextLevel: nextLevel });
    return;
  }
  presentLevelUpAnimation(previousLevel, nextLevel);
}

function presentLevelUpAnimation(previousLevel, nextLevel) {
  const overlay = document.getElementById('levelUpOverlay');
  if (!overlay) return;
  const info = getPlayerLevelInfo(playerProfile.totalXP);
  document.getElementById('levelUpOld').textContent = 'NIVEL ' + previousLevel;
  document.getElementById('levelUpNew').textContent = 'NIVEL ' + nextLevel;
  document.getElementById('levelUpRank').textContent = info.rank.title;
  overlay.hidden = false;
  overlay.classList.remove('level-up-show');
  void overlay.offsetWidth;
  overlay.classList.add('level-up-show');
  updateInTestPlayerHUD();
  window.clearTimeout(presentLevelUpAnimation.timer);
  presentLevelUpAnimation.timer = window.setTimeout(closeLevelUpAnimation, 4400);
}

function closeLevelUpAnimation() {
  window.clearTimeout(presentLevelUpAnimation.timer);
  const overlay = document.getElementById('levelUpOverlay');
  if (overlay) {
    overlay.classList.remove('level-up-show');
    overlay.hidden = true;
  }
  if (pendingLevelUpQueue.length) {
    const next = pendingLevelUpQueue.shift();
    window.clearTimeout(celebrationNextTimer);
    celebrationNextTimer = window.setTimeout(function() { presentLevelUpAnimation(next.previousLevel, next.nextLevel); }, 240);
  } else if (achievementRevealQueue.length) {
    window.clearTimeout(celebrationNextTimer);
    celebrationNextTimer = window.setTimeout(playNextAchievementReveal, 220);
  }
}

function clearCelebrationOverlays() {
  window.clearTimeout(presentLevelUpAnimation.timer);
  window.clearTimeout(playNextAchievementReveal.timer);
  window.clearTimeout(closeAchievementReveal.nextTimer);
  window.clearTimeout(celebrationNextTimer);
  celebrationNextTimer = null;
  achievementRevealQueue = [];
  pendingLevelUpQueue = [];
  achievementRevealActive = false;
  ['levelUpOverlay', 'achievementRevealOverlay', 'challengeModeOverlay', 'dailyEntryOverlay'].forEach(function(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.hidden = true;
      overlay.classList.remove('level-up-show', 'achievement-reveal-show', 'challenge-mode-show', 'daily-entry-show');
    }
  });
  pendingChallengePart = null;
  dailyEntryState = null;
}

function rarityClass(rarity) {
  return 'rarity-' + String(rarity || 'Común').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '-');
}

function enqueueAchievementReveal(item, reward, isNew) {
  achievementRevealQueue.push({ item: item, reward: reward, isNew: isNew !== false });
  playNextAchievementReveal();
}

function playNextAchievementReveal() {
  if (achievementRevealActive) return;
  const levelOverlay = document.getElementById('levelUpOverlay');
  if (levelOverlay && !levelOverlay.hidden) return;
  const overlay = document.getElementById('achievementRevealOverlay');
  if (!overlay) return;
  if (!achievementRevealQueue.length) {
    if (pendingLevelUpQueue.length) {
      const nextLevel = pendingLevelUpQueue.shift();
      window.clearTimeout(celebrationNextTimer);
      celebrationNextTimer = window.setTimeout(function() { presentLevelUpAnimation(nextLevel.previousLevel, nextLevel.nextLevel); }, 220);
    }
    return;
  }

  const entry = achievementRevealQueue.shift();
  const item = entry.item;
  const rarity = rarityClass(item.rarity);
  overlay.className = 'achievement-reveal-overlay ' + rarity;
  overlay.hidden = false;
  document.getElementById('achievementRevealEyebrow').textContent = entry.isNew ? 'LOGRO DESBLOQUEADO' : 'RECOMPENSA CONSEGUIDA';
  document.getElementById('achievementRevealRarity').textContent = String(item.rarity || 'Común').toUpperCase();
  document.getElementById('achievementRevealIcon').textContent = item.icon || '🏅';
  document.getElementById('achievementRevealTitle').textContent = item.title || 'Logro desbloqueado';
  document.getElementById('achievementRevealDescription').textContent = item.description || 'Has conseguido un nuevo logro.';
  document.getElementById('achievementRevealXP').textContent = '+' + Math.floor(entry.reward || 0) + ' XP';
  void overlay.offsetWidth;
  overlay.classList.add('achievement-reveal-show');
  achievementRevealActive = true;
  window.clearTimeout(playNextAchievementReveal.timer);
  playNextAchievementReveal.timer = window.setTimeout(closeAchievementReveal, 3800);
}

function closeAchievementReveal() {
  const overlay = document.getElementById('achievementRevealOverlay');
  window.clearTimeout(playNextAchievementReveal.timer);
  if (overlay) {
    overlay.classList.remove('achievement-reveal-show');
    overlay.hidden = true;
  }
  achievementRevealActive = false;
  window.clearTimeout(closeAchievementReveal.nextTimer);
  window.clearTimeout(celebrationNextTimer);
  celebrationNextTimer = window.setTimeout(function() {
    celebrationNextTimer = null;
    playNextAchievementReveal();
  }, 220);
}

function updateInTestPlayerHUD() {
  const hud = document.getElementById('testPlayerHUD');
  if (!hud) return;
  const info = getPlayerLevelInfo(playerProfile.totalXP);
  const name = document.getElementById('testHUDName');
  const rank = document.getElementById('testHUDRank');
  const level = document.getElementById('testHUDLevel');
  const xp = document.getElementById('testHUDXP');
  const fill = document.getElementById('testHUDProgress');
  if (name) name.textContent = playerProfile.name || 'Jugador';
  if (rank) rank.textContent = info.rank.title;
  if (level) level.textContent = 'NV. ' + info.level;
  if (xp) xp.textContent = info.maxLevel ? 'NIVEL MÁXIMO' : Math.floor(info.currentXP) + ' / ' + info.requiredXP + ' XP';
  if (fill) fill.style.width = info.progress + '%';
}

function renderLevelProgress() {
  const info = getPlayerLevelInfo(playerProfile.totalXP);
  const rankEl = document.getElementById('profileRank');
  const levelEl = document.getElementById('profileLevel');
  const xpEl = document.getElementById('profileXP');
  const fill = document.getElementById('levelProgressFill');
  const caption = document.getElementById('levelProgressCaption');
  if (!rankEl) return;
  rankEl.textContent = info.rank.title;
  levelEl.textContent = 'Nivel ' + info.level;
  xpEl.textContent = info.maxLevel ? Math.floor(playerProfile.totalXP) + ' XP · Rango máximo' : Math.floor(info.currentXP) + ' / ' + info.requiredXP + ' XP';
  fill.style.width = info.progress + '%';
  caption.textContent = info.maxLevel ? 'Has alcanzado el rango máximo.' : 'Siguiente rango: ' + PLAYER_RANKS[info.level].title;
}

function buildAchievementCard(item, isUnlocked) {
  const card = document.createElement('article');
  card.className = 'achievement-card rarity-' + String(item.rarity || 'Común').toLowerCase().replace(/\s+/g, '-');
  card.classList.toggle('is-unlocked', !!isUnlocked);
  const icon = document.createElement('span');
  icon.className = 'achievement-icon';
  icon.textContent = isUnlocked ? (item.icon || '🏅') : '🔒';
  const copy = document.createElement('div');
  copy.className = 'achievement-copy';
  const title = document.createElement('strong');
  title.textContent = item.secret && !isUnlocked ? 'Logro secreto' : item.title;
  const description = document.createElement('small');
  description.textContent = item.secret && !isUnlocked ? 'Descubre cómo desbloquearlo.' : item.description;
  const meta = document.createElement('span');
  meta.className = 'achievement-rarity';
  meta.textContent = item.rarity + ' · +' + getAchievementXPForRarity(item.rarity) + ' XP';
  copy.appendChild(title);
  copy.appendChild(description);
  copy.appendChild(meta);
  const progress = document.createElement('div');
  progress.className = 'achievement-progress';
  const progressTrack = document.createElement('div');
  progressTrack.className = 'achievement-progress-track';
  const progressFill = document.createElement('span');
  const ratio = item.target ? Math.min(100, item.progress / item.target * 100) : 0;
  progressFill.style.width = ratio + '%';
  progressTrack.appendChild(progressFill);
  const progressText = document.createElement('small');
  progressText.textContent = item.secret && !isUnlocked ? '???' : (isUnlocked ? 'Desbloqueado' : item.progress + ' / ' + item.target + (item.suffix || ''));
  progress.appendChild(progressTrack);
  progress.appendChild(progressText);
  card.appendChild(icon);
  card.appendChild(copy);
  card.appendChild(progress);
  return card;
}

function renderAchievements() {
  const container = document.getElementById('achievementsList');
  const recentContainer = document.getElementById('recentAchievementsList');
  if (!container) return;
  const definitions = getAchievementDefinitions();
  const unlocked = new Set(playerProfile.unlockedAchievements);
  const detail = document.getElementById('allAchievementsDetails');
  const wasOpen = detail ? detail.open : false;

  if (recentContainer) {
    recentContainer.innerHTML = '';
    const latest = (playerProfile.unlockedAchievements || []).slice().reverse()
      .map(function(id) { return definitions.find(function(item) { return item.id === id; }); })
      .filter(Boolean).slice(0, 3);
    if (latest.length) {
      latest.forEach(function(item) { recentContainer.appendChild(buildAchievementCard(item, true)); });
    } else {
      const empty = document.createElement('p');
      empty.className = 'history-empty achievement-empty';
      empty.textContent = 'Todavía no has desbloqueado logros. Tu primera recompensa aparecerá aquí.';
      recentContainer.appendChild(empty);
    }
  }

  const categories = ['Primeros pasos', 'Dominio del transporte', 'Precisión y perfección', 'Rachas', 'Constancia', 'Supuestos prácticos', 'Dominio de temas', 'Desafíos', 'Secretos'];
  container.innerHTML = '';
  categories.forEach(function(category) {
    const items = definitions.filter(function(item) { return item.category === category; });
    if (!items.length) return;
    const section = document.createElement('section');
    section.className = 'achievement-category';
    const heading = document.createElement('h4');
    heading.textContent = category;
    section.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'achievement-grid';
    items.forEach(function(item) { grid.appendChild(buildAchievementCard(item, unlocked.has(item.id))); });
    section.appendChild(grid);
    container.appendChild(section);
  });
  if (detail) detail.open = wasOpen;
  const count = playerProfile.unlockedAchievements.length;
  const countEl = document.getElementById('achievementCount');
  if (countEl) countEl.textContent = count + ' / ' + definitions.length + ' desbloqueados';
  const summary = document.getElementById('allAchievementsSummary');
  if (summary) summary.textContent = 'Ver todos los logros (' + definitions.length + ')';
}

function localDateKey(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function dateFromKey(key) { const p=String(key||'').split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function dayDiff(a,b) { return Math.round((dateFromKey(b)-dateFromKey(a))/86400000); }
function registerDailyVisit() {
  const today = localDateKey();
  const usedDates = Array.isArray(playerProfile.dailyUsageDates) ? playerProfile.dailyUsageDates : [];
  const alreadyVisitedToday = usedDates.indexOf(today) !== -1;

  if (!alreadyVisitedToday) {
    const previous = playerProfile.lastActiveDate;
    const gap = previous ? dayDiff(previous, today) : 0;
    const broken = !!previous && gap > 1 && (playerProfile.dailyStreak || 0) > 0;

    if (broken) playerProfile.dailyBreakNoticeDate = today;
    if (previous && gap === 1) playerProfile.dailyStreak = (playerProfile.dailyStreak || 0) + 1;
    else playerProfile.dailyStreak = 1;

    playerProfile.bestDailyStreak = Math.max(playerProfile.bestDailyStreak || 0, playerProfile.dailyStreak);
    playerProfile.lastActiveDate = today;
    playerProfile.dailyUsageDates.push(today);
    savePlayerProfile();
  }

  dailyEntryState = {
    today: today,
    broken: playerProfile.dailyBreakNoticeDate === today,
    returning: alreadyVisitedToday
  };
}

function showDailyEntry() {
  if (!dailyEntryState) return;
  const overlay = document.getElementById('dailyEntryOverlay');
  if (!overlay) return;
  const today = dateFromKey(dailyEntryState.today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const strip = document.getElementById('dailyWeekDays');
  strip.innerHTML = '';
  let used = 0;

  days.forEach(function(label, i) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = localDateKey(day);
    const on = playerProfile.dailyUsageDates.indexOf(key) !== -1;
    if (on) used++;
    const cell = document.createElement('div');
    cell.className = 'daily-day' + (on ? ' is-used' : '');
    const mark = document.createElement('strong');
    mark.textContent = on ? '🔥' : '·';
    const name = document.createElement('small');
    name.textContent = label;
    cell.appendChild(mark);
    cell.appendChild(name);
    strip.appendChild(cell);
  });

  const progress = document.getElementById('dailyWeekProgress');
  progress.style.transition = 'none';
  progress.style.width = '0%';
  document.getElementById('dailyWeekCaption').textContent = used + ' de 7 días utilizados esta semana';
  document.getElementById('dailyStreakValue').textContent = playerProfile.dailyStreak || 1;
  document.getElementById('dailyEntryTitle').textContent = dailyEntryState.broken
    ? 'La racha se ha congelado'
    : (dailyEntryState.returning ? 'Tu racha sigue encendida' : '¡Un día más en ruta!');
  document.getElementById('dailyEntryMessage').textContent = dailyEntryState.broken
    ? 'Ayer no entraste. La racha anterior se rompió; hoy puedes empezar una nueva.'
    : (dailyEntryState.returning
      ? 'Hoy ya has registrado tu visita. Llevas ' + (playerProfile.dailyStreak || 1) + ' días seguidos. ¡Vuelve mañana para mantenerla!'
      : 'Has sumado un día a tu racha. Sigue entrando para mantenerla encendida.');
  document.getElementById('dailyEntrySnow').hidden = !dailyEntryState.broken;

  overlay.hidden = false;
  overlay.classList.remove('daily-entry-show');
  void overlay.offsetWidth;
  overlay.classList.add('daily-entry-show');
  window.requestAnimationFrame(function() {
    progress.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1)';
    progress.style.width = (used / 7 * 100) + '%';
  });
}
function closeDailyEntry() { const overlay=document.getElementById('dailyEntryOverlay'); if(overlay) overlay.hidden=true; dailyEntryState=null; }

function renderMainMenu() {
  document.getElementById('menuPlayerName').textContent = playerProfile.name || 'Jugador';
  const levelInfo = getPlayerLevelInfo(playerProfile.totalXP);
  document.getElementById('menuPlayerSummary').textContent = levelInfo.rank.title + ' · Nivel ' + levelInfo.level + ' · ' + Math.floor(playerProfile.totalXP) + ' XP';
  document.getElementById('menuBestStreak').textContent = playerProfile.bestStreak || 0;
  const dailyMenu=document.getElementById('menuDailyStreak'); if(dailyMenu) dailyMenu.textContent=(playerProfile.dailyStreak||0)+' días';
}

function renderProfileScreen() {
  document.getElementById('playerNameInput').value = playerProfile.name || 'Jugador';
  document.getElementById('profileTests').textContent = playerProfile.testsCompleted;
  document.getElementById('profileAnswered').textContent = playerProfile.totalQuestionsAnswered;
  document.getElementById('profileCorrect').textContent = playerProfile.totalCorrect;
  document.getElementById('profileWrong').textContent = playerProfile.totalWrong;
  const accuracy = playerProfile.totalQuestionsAnswered
    ? Math.round((playerProfile.totalCorrect / playerProfile.totalQuestionsAnswered) * 100)
    : 0;
  document.getElementById('profileAccuracy').textContent = accuracy + '%';
  document.getElementById('profileBestStreak').textContent = playerProfile.bestStreak;
  const dailyCount=document.getElementById('profileDailyDays'); if(dailyCount) dailyCount.textContent=(playerProfile.dailyUsageDates||[]).length;
  const dailyRun=document.getElementById('profileDailyStreak'); if(dailyRun) dailyRun.textContent=(playerProfile.dailyStreak||0)+' días';
  const dailyBest=document.getElementById('profileDailyBest'); if(dailyBest) dailyBest.textContent=(playerProfile.bestDailyStreak||0)+' días';
  const challengeDone=document.getElementById('profileChallengesDone'); if(challengeDone) challengeDone.textContent=getChallengeTopics().filter(function(x){return challengePartsDone(x.topic);}).length;
  const practicalAnsweredEl = document.getElementById('profilePracticalAnswered');
  const practicalCorrectEl = document.getElementById('profilePracticalCorrect');
  const practicalWrongEl = document.getElementById('profilePracticalWrong');
  const practicalAccuracyEl = document.getElementById('profilePracticalAccuracy');
  const practicalTestsEl = document.getElementById('profilePracticalTests');
  const practicalStreakEl = document.getElementById('profilePracticalStreak');
  if (practicalAnsweredEl) practicalAnsweredEl.textContent = playerProfile.practicalQuestionsAnswered || 0;
  if (practicalCorrectEl) practicalCorrectEl.textContent = playerProfile.practicalCorrect || 0;
  if (practicalWrongEl) practicalWrongEl.textContent = playerProfile.practicalWrong || 0;
  if (practicalTestsEl) practicalTestsEl.textContent = playerProfile.practicalTestsCompleted || 0;
  if (practicalStreakEl) practicalStreakEl.textContent = playerProfile.practicalBestStreak || 0;
  if (practicalAccuracyEl) practicalAccuracyEl.textContent = (playerProfile.practicalQuestionsAnswered ? Math.round(playerProfile.practicalCorrect / playerProfile.practicalQuestionsAnswered * 100) : 0) + '%';
  const levelBeforeAchievementSync = getPlayerLevelInfo(playerProfile.totalXP).level;
  checkAndUnlockAchievements(true);
  const levelAfterAchievementSync = getPlayerLevelInfo(playerProfile.totalXP).level;
  if (levelAfterAchievementSync > levelBeforeAchievementSync) showLevelUpAnimation(levelBeforeAchievementSync, levelAfterAchievementSync);
  renderLevelProgress();
  renderAchievements();
  document.getElementById('historyCount').textContent = playerProfile.testsCompleted + ' tests realizados';

  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (!playerProfile.history.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Todavía no hay tests guardados. Completa tu primer desafío para crear tu historial.';
    list.appendChild(empty);
    return;
  }

  playerProfile.history.slice(0, 15).forEach(function(item) {
    const row = document.createElement('article');
    row.className = 'history-item';
    const main = document.createElement('div');
    main.className = 'history-item-main';
    const title = document.createElement('strong');
    title.textContent = item.title || ((item.totalQuestions || 0) + ' preguntas');
    const date = document.createElement('small');
    const parsedDate = new Date(item.date);
    date.textContent = isNaN(parsedDate.getTime()) ? 'Fecha no disponible' : parsedDate.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    main.appendChild(title);
    main.appendChild(date);
    const result = document.createElement('div');
    result.className = 'history-item-result';
    const percent = document.createElement('strong');
    percent.textContent = (Number(item.accuracyPct) || 0) + '%';
    percent.className = Number(item.accuracyPct) >= 50 ? 'history-good' : 'history-low';
    const detail = document.createElement('small');
    detail.textContent = (item.correct || 0) + ' aciertos · ' + (item.wrong || 0) + ' fallos · ' + (item.blank || 0) + ' en blanco · racha ' + (item.bestStreak || 0);
    result.appendChild(percent);
    result.appendChild(detail);
    row.appendChild(main);
    row.appendChild(result);
    list.appendChild(row);
  });
}

function saveCompletedTest(result, suppressLevelAnimation) {
  if (testFinished) return;
  testFinished = true;
  const answered = result.correct + result.wrong;
  const accuracyPct = answered ? Math.round((result.correct / answered) * 100) : 0;
  const bestStreak = calculateBestStreak(activeQuestions, userAnswers);
  const testType = currentTestType();
  const record = {
    date: new Date().toISOString(),
    title: activeSessionTitle || (activeQuestions.length + ' preguntas · Test'),
    type: testType,
    correctionMode: practiceMode ? 'Práctica' : 'Examen',
    totalQuestions: activeQuestions.length,
    answered: answered,
    correct: result.correct,
    wrong: result.wrong,
    blank: result.blank,
    accuracyPct: accuracyPct,
    score: result.score,
    scorePct: result.scorePct,
    bestStreak: bestStreak,
    passed: result.score >= activeQuestions.length * 0.5
  };

  playerProfile.testsCompleted += 1;
  playerProfile.totalQuestionsAnswered += answered;
  playerProfile.totalCorrect += result.correct;
  playerProfile.totalWrong += result.wrong;
  if (testType === 'supuestos') {
    playerProfile.practicalTestsCompleted += 1;
    playerProfile.practicalQuestionsAnswered += answered;
    playerProfile.practicalCorrect += result.correct;
    playerProfile.practicalWrong += result.wrong;
    playerProfile.practicalBestStreak = Math.max(playerProfile.practicalBestStreak || 0, bestStreak);
  }
  playerProfile.bestStreak = Math.max(playerProfile.bestStreak, bestStreak);
  playerProfile.bestComebackStreak = Math.max(playerProfile.bestComebackStreak || 0, calculateBestComebackStreak(activeQuestions, userAnswers));
  playerProfile.perfectTestsStreak = accuracyPct === 100 && result.blank === 0 ? playerProfile.perfectTestsStreak + 1 : 0;
  const completedAt = new Date();
  const dateKey = completedAt.getFullYear() + '-' + String(completedAt.getMonth()+1).padStart(2,'0') + '-' + String(completedAt.getDate()).padStart(2,'0');
  if (playerProfile.practiceDates.indexOf(dateKey) === -1) playerProfile.practiceDates.push(dateKey);
  playerProfile.earlyBird = !!playerProfile.earlyBird || completedAt.getHours() < 8;
  playerProfile.nightOwl = !!playerProfile.nightOwl || completedAt.getHours() >= 22;
  playerProfile.history.unshift(record);
  playerProfile.history = playerProfile.history.slice(0, 40);
  savePlayerProfile();
  checkAndUnlockAchievements(!!suppressLevelAnimation);
}

const CHALLENGE_MODULE_ORDER = ['A','B','C','D','F','G','H','E'];
const CHALLENGE_MODULE_NAMES = {A:'Módulo 1 · Transporte',B:'Módulo 2 · Empresa',C:'Módulo 3 · Laboral',D:'Módulo 4 · Fiscalidad',E:'Módulo 5 · Área financiera',F:'Módulo 6 · Acceso y mercado',G:'Módulo 7 · Técnica del transporte',H:'Módulo 8 · Seguridad vial'};
// Cantidades del PDF. En supuestos: 0 = no hay parte práctica, número = seleccionar esa cantidad al azar,
// 'all' = incluir todos los supuestos disponibles del subtema.
const CHALLENGE_PLAN = {
  '1A01':{questions:82,suppositions:0}, '1A02':{questions:176,suppositions:5}, '1A03':{questions:116,suppositions:5}, '1A04':{questions:79,suppositions:5},
  '1B01':{questions:200,suppositions:5}, '1B02':{questions:400,suppositions:5},
  '1C01':{questions:46,suppositions:0}, '1C02':{questions:63,suppositions:5}, '1C03':{questions:117,suppositions:5}, '1C04':{questions:166,suppositions:5}, '1C05':{questions:29,suppositions:0},
  '1D01':{questions:101,suppositions:5}, '1D02':{questions:24,suppositions:'all'}, '1D03':{questions:61,suppositions:'all'}, '1D04':{questions:155,suppositions:5},
  '1E01':{questions:120,suppositions:5}, '1E02':{questions:85,suppositions:0}, '1E03':{questions:106,suppositions:5}, '1E04':{questions:52,suppositions:5}, '1E05':{questions:54,suppositions:5}, '1E06':{questions:39,suppositions:0}, '1E07':{questions:141,suppositions:'all'}, '1E08':{questions:89,suppositions:0}, '1E09':{questions:85,suppositions:0}, '1E10':{questions:139,suppositions:0}, '1E11':{questions:47,suppositions:0}, '1E12':{questions:77,suppositions:'all'}, '1E13':{questions:84,suppositions:0},
  '1F01':{questions:157,suppositions:'all'}, '1F02':{questions:97,suppositions:'all'}, '1F03':{questions:67,suppositions:0}, '1F04':{questions:95,suppositions:0}, '1F05':{questions:200,suppositions:'all'},
  '1G01':{questions:46,suppositions:0}, '1G02':{questions:30,suppositions:0}, '1G03':{questions:62,suppositions:0}, '1G04':{questions:68,suppositions:0}, '1G05':{questions:62,suppositions:0}, '1G06':{questions:64,suppositions:0}, '1G07':{questions:94,suppositions:'all'}, '1G08':{questions:134,suppositions:0}, '1G09':{questions:46,suppositions:'all'}, '1G10':{questions:56,suppositions:'all'},
  '1H01':{questions:40,suppositions:0}, '1H02':{questions:35,suppositions:0}, '1H03':{questions:22,suppositions:0}, '1H04':{questions:56,suppositions:0}, '1H05':{questions:152,suppositions:'all'}
};
let challengeTopicsCache = null;
function getChallengeTopics() {
  if (challengeTopicsCache) return challengeTopicsCache;
  const keys = Object.keys(PM_SUBTOPIC_LABELS).filter(function(k) { return /^1[A-H]\d\d$/.test(k); });
  challengeTopicsCache = keys.map(function(topic) {
    const questions = ALL_QUESTIONS.filter(function(x) { return x.topic === topic; });
    const suppositions = ALL_SUPUESTOS.filter(function(x) { return x.topic === topic; });
    const plan = CHALLENGE_PLAN[topic] || {questions:questions.length, suppositions:suppositions.length ? 'all' : 0};
    const questionTarget = Math.max(0, Number(plan.questions) || 0);
    const questionCount = Math.min(questionTarget || questions.length, questions.length);
    const suppositionTarget = plan.suppositions;
    const hasSuppositionPart = suppositionTarget === 'all' || Number(suppositionTarget) > 0;
    const suppositionCount = !hasSuppositionPart ? 0 : (suppositionTarget === 'all' ? suppositions.length : Math.min(Number(suppositionTarget), suppositions.length));
    const rawTitle = PM_SUBTOPIC_LABELS[topic] || topic;
    const title = rawTitle.replace(/^Tema\s+\S+\s*[–—-]\s*/, '').trim();
    return {
      topic:topic,
      module:topic.charAt(1),
      title:title,
      displayLabel:getTopicDisplayLabel(topic, rawTitle),
      questions:questions.length,
      questionTarget:questionTarget || questions.length,
      questionCount:questionCount,
      questionShortfall:Math.max(0, questionTarget - questions.length),
      suppositions:suppositions.length,
      suppositionTarget:suppositionTarget,
      suppositionCount:suppositionCount,
      suppositionShortfall:typeof suppositionTarget === 'number' ? Math.max(0, suppositionTarget - suppositions.length) : 0,
      hasSuppositionPart:hasSuppositionPart
    };
  }).filter(function(x) { return x.questions || x.suppositions || x.hasSuppositionPart; })
    .sort(function(a,b) { const ma=CHALLENGE_MODULE_ORDER.indexOf(a.module), mb=CHALLENGE_MODULE_ORDER.indexOf(b.module); return ma-mb || a.topic.localeCompare(b.topic); });
  return challengeTopicsCache;
}
function getChallengeState(topic) {
  const stored = playerProfile.challengeProgress[topic] || {};
  return {test:!!stored.test, practical:!!stored.practical};
}
function challengePartsDone(topic) {
  const meta = getChallengeTopics().find(function(x) { return x.topic === topic; });
  if (!meta) return false;
  const state = getChallengeState(topic);
  return !!state.test && (!meta.hasSuppositionPart || !!state.practical);
}
function renderChallengeScreen() {
  const root = document.getElementById('challengeBooks');
  if (!root) return;
  root.innerHTML = '';
  const topics = getChallengeTopics();
  const done = topics.filter(function(x) { return challengePartsDone(x.topic); }).length;
  const total = topics.length;
  const allParts = topics.reduce(function(sum, meta) { return sum + 1 + (meta.hasSuppositionPart ? 1 : 0); }, 0);
  const completedParts = topics.reduce(function(sum, meta) {
    const state = getChallengeState(meta.topic);
    return sum + (state.test ? 1 : 0) + (meta.hasSuppositionPart && state.practical ? 1 : 0);
  }, 0);

  const hero = document.createElement('section');
  hero.className = 'challenge-catalog-hero';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'challenge-hero-eyebrow';
  eyebrow.textContent = 'TU BIBLIOTECA DE RUTAS';
  const heroTitle = document.createElement('h3');
  heroTitle.textContent = 'Elige qué dominar hoy';
  const heroCopy = document.createElement('p');
  heroCopy.textContent = 'Explora los módulos y empieza cualquier tema. Cada desafío guarda su propio progreso.';
  const stats = document.createElement('div');
  stats.className = 'challenge-hero-stats';
  const statA = document.createElement('span'); statA.textContent = done + ' / ' + total + ' temas completados';
  const statB = document.createElement('span'); statB.textContent = completedParts + ' / ' + allParts + ' partes aprobadas';
  stats.appendChild(statA); stats.appendChild(statB);
  const track = document.createElement('div'); track.className = 'challenge-hero-track';
  const fill = document.createElement('span'); fill.style.width = (allParts ? completedParts / allParts * 100 : 0) + '%';
  track.appendChild(fill);
  hero.appendChild(eyebrow); hero.appendChild(heroTitle); hero.appendChild(heroCopy); hero.appendChild(stats); hero.appendChild(track);
  root.appendChild(hero);

  CHALLENGE_MODULE_ORDER.forEach(function(module, moduleIndex) {
    const list = topics.filter(function(x) { return x.module === module; });
    if (!list.length) return;
    const section = document.createElement('section');
    section.className = 'challenge-module challenge-rail-section';
    const headingRow = document.createElement('div'); headingRow.className = 'challenge-rail-heading';
    const heading = document.createElement('h3'); heading.textContent = CHALLENGE_MODULE_NAMES[module];
    const completedInModule = list.filter(function(meta) { return challengePartsDone(meta.topic); }).length;
    const count = document.createElement('small'); count.textContent = completedInModule + ' / ' + list.length + ' completados';
    headingRow.appendChild(heading); headingRow.appendChild(count); section.appendChild(headingRow);
    const rail = document.createElement('div'); rail.className = 'challenge-book-grid challenge-rail';

    list.forEach(function(meta, index) {
      const state = getChallengeState(meta.topic);
      const isDone = challengePartsDone(meta.topic);
      const card = document.createElement('article');
      card.className = 'challenge-book' + (isDone ? ' is-complete' : '');
      card.style.setProperty('--poster-index', String((moduleIndex + index) % 6));
      const cover = document.createElement('div'); cover.className = 'challenge-book-cover';
      const coverTop = document.createElement('div'); coverTop.className = 'challenge-cover-top';
      const moduleBadge = document.createElement('span'); moduleBadge.className = 'book-mark'; moduleBadge.textContent = 'MÓDULO ' + ({A:'1',B:'2',C:'3',D:'4',E:'5',F:'6',G:'7',H:'8'}[module] || module);
      const topicBadge = document.createElement('span'); topicBadge.className = 'challenge-cover-topic'; topicBadge.textContent = 'TEMA ' + String(parseInt(meta.topic.slice(2), 10));
      coverTop.appendChild(moduleBadge); coverTop.appendChild(topicBadge);
      const artNumber = document.createElement('span'); artNumber.className = 'challenge-cover-number'; artNumber.textContent = String(parseInt(meta.topic.slice(2), 10)).padStart(2, '0');
      const coverTitle = document.createElement('strong'); coverTitle.textContent = meta.title;
      const stamp = document.createElement('small'); stamp.className = 'challenge-cover-stamp'; stamp.textContent = isDone ? '✓ COMPLETADO' : (state.test || state.practical ? 'EN PROGRESO' : 'DESAFÍO');
      cover.appendChild(coverTop); cover.appendChild(artNumber); cover.appendChild(coverTitle); cover.appendChild(stamp);

      const body = document.createElement('div'); body.className = 'challenge-book-body';
      const counts = document.createElement('p');
      let questionText = meta.questionCount + ' preguntas';
      if (meta.questionShortfall) questionText = meta.questionCount + ' disponibles / ' + meta.questionTarget + ' del plan';
      else if (meta.questions > meta.questionCount) questionText = meta.questionCount + ' preguntas seleccionadas';
      let suppText = meta.hasSuppositionPart ? (meta.suppositionTarget === 'all' ? 'Todos los supuestos (' + meta.suppositionCount + ')' : meta.suppositionCount + ' supuestos aleatorios') : 'Sin supuestos';
      if (meta.suppositionShortfall) suppText = meta.suppositionCount + ' disponibles / ' + meta.suppositionTarget + ' del plan';
      counts.textContent = questionText + ' · ' + suppText;
      const partTrack = document.createElement('div'); partTrack.className = 'challenge-part-progress';
      const partLabels = document.createElement('div'); partLabels.className = 'challenge-part-labels';
      const testLabel = document.createElement('span'); testLabel.className = state.test ? 'is-done' : ''; testLabel.textContent = state.test ? '✓ Test' : '○ Test';
      partLabels.appendChild(testLabel);
      if (meta.hasSuppositionPart) { const spLabel = document.createElement('span'); spLabel.className = state.practical ? 'is-done' : ''; spLabel.textContent = state.practical ? '✓ Supuestos' : '○ Supuestos'; partLabels.appendChild(spLabel); }
      partTrack.appendChild(partLabels);
      const actions = document.createElement('div'); actions.className = 'challenge-parts';
      if (meta.questionCount) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'challenge-part-btn challenge-part-test'; btn.disabled = !!state.test;
        btn.textContent = state.test ? '✓ Test aprobado' : '▶ Test · ' + meta.questionCount;
        btn.addEventListener('click', function() { startChallengePart(meta.topic, 'objetivas'); }); actions.appendChild(btn);
      }
      if (meta.hasSuppositionPart) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'challenge-part-btn challenge-part-practical'; btn.disabled = !!state.practical || meta.suppositionCount === 0;
        btn.textContent = state.practical ? '✓ Supuestos completados' : (meta.suppositionCount === 0 ? '⚠ Sin registros' : '▣ Supuestos · ' + meta.suppositionCount);
        btn.addEventListener('click', function() { startChallengePart(meta.topic, 'supuestos'); }); actions.appendChild(btn);
      }
      const status = document.createElement('small'); status.className = 'challenge-status';
      status.textContent = isDone ? 'Desafío completado · Logro desbloqueado' : (state.test ? 'Test aprobado' : 'Test pendiente') + (meta.hasSuppositionPart ? ' · ' + (state.practical ? 'Supuestos completados' : 'Supuestos pendientes') : '');
      body.appendChild(counts); body.appendChild(partTrack); body.appendChild(actions); body.appendChild(status);
      card.appendChild(cover); card.appendChild(body); rail.appendChild(card);
    });
    section.appendChild(rail); root.appendChild(section);
  });

  const summary = document.getElementById('challengeSummary');
  if (summary) summary.textContent = done + ' de ' + total + ' subtemas completados · ' + completedParts + ' partes aprobadas';
}
function getChallengePartCount(meta, type) {
  return type === 'supuestos' ? meta.suppositionCount : meta.questionCount;
}
function startChallengePart(topic,type) {
  const state = getChallengeState(topic);
  if ((type === 'objetivas' && state.test) || (type === 'supuestos' && state.practical)) return false;
  const meta = getChallengeTopics().find(function(x) { return x.topic === topic; });
  if (!meta) return false;
  const count = getChallengePartCount(meta, type);
  if (count <= 0) { showEffectToast('No hay registros disponibles para esta parte del desafío.', 'ice'); return false; }
  pendingChallengePart = { topic: topic, type: type, count: count };
  const modal = document.getElementById('challengeModeOverlay');
  const heading = document.getElementById('challengeModeHeading');
  if (heading) heading.textContent = (type === 'supuestos' ? 'Supuestos prácticos · ' : 'Preguntas tipo test · ') + meta.title;
  if (modal) {
    modal.hidden = false;
    modal.classList.remove('challenge-mode-show');
    void modal.offsetWidth;
    modal.classList.add('challenge-mode-show');
  }
  return true;
}

function launchPendingChallengePart(checkMode) {
  if (!pendingChallengePart) return false;
  const pending = pendingChallengePart;
  pendingChallengePart = null;
  const modal = document.getElementById('challengeModeOverlay');
  if (modal) { modal.hidden = true; modal.classList.remove('challenge-mode-show'); }
  activeChallenge = { topic: pending.topic, type: pending.type, count: pending.count, checkMode: checkMode };
  document.getElementById('testTypeSelect').value = pending.type;
  initSelects();
  document.getElementById('modeSelect').value = 'topic';
  document.getElementById('topicSelect').value = pending.topic;
  document.getElementById('numQuestions').value = pending.count;
  document.getElementById('checkMode').value = checkMode;
  updateSelectionControls();
  startTest();
  return true;
}
function completeChallengePart(passed, suppressLevelAnimation) {
  if(!activeChallenge)return;
  stopStreakShake();
  const topic=activeChallenge.topic;
  if(passed) {
    const stored=playerProfile.challengeProgress[topic] || {test:false,practical:false};
    if(activeChallenge.type==='objetivas') stored.test=true; else stored.practical=true;
    playerProfile.challengeProgress[topic]=stored;
    savePlayerProfile();
    checkAndUnlockAchievements(!!suppressLevelAnimation);
  }
  activeChallenge=null;
  renderChallengeScreen();
  if(passed) showEffectToast(challengePartsDone(topic)?'¡SUBTEMA COMPLETADO! Logro desbloqueado.':'Parte del desafío aprobada.','fire');
  else showEffectToast('Puedes volver a intentarlo. El desafío sigue pendiente.','ice');
}

function currentTestType() {
  const el = document.getElementById('testTypeSelect');
  return el ? el.value : 'objetivas';
}

function updateSelectionControls() {
  const mode = document.getElementById('modeSelect').value;
  const blockGroup = document.getElementById('blockGroup');
  const topicGroup = document.getElementById('topicGroup');
  blockGroup.hidden = mode !== 'block';
  topicGroup.hidden = mode !== 'topic';
  blockGroup.style.display = mode === 'block' ? '' : 'none';
  topicGroup.style.display = mode === 'topic' ? '' : 'none';
}

function initSelects() {
  const type = currentTestType();
  const blockSelect = document.getElementById('blockSelect');
  const topicSelect = document.getElementById('topicSelect');
  if (!blockSelect || !topicSelect) return;

  const srcLabels = (type === 'supuestos') ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
  const subLabels = (type === 'supuestos') ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;
  const basePool = (type === 'supuestos') ? ALL_SUPUESTOS : ALL_QUESTIONS;
  const oldBlock = blockSelect.value;
  const oldTopic = topicSelect.value;

  // Las opciones se construyen desde los registros reales. Las etiquetas solo
  // aportan el nombre legible; no pueden ocultar un subtema existente del banco.
  const sourceKeys = Array.from(new Set(basePool.map(function(q) { return q.source; }).filter(Boolean))).sort();
  blockSelect.innerHTML = '';
  sourceKeys.forEach(function(key) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = srcLabels[key] || ('Bloque ' + key.replace(/^(?:pm|cm)1?([A-H]).*$/i, '$1'));
    blockSelect.appendChild(opt);
  });
  if (sourceKeys.indexOf(oldBlock) !== -1) blockSelect.value = oldBlock;

  const topicKeys = Array.from(new Set(basePool.map(function(q) { return q.topic; }).filter(Boolean))).sort(function(a,b) { return a.localeCompare(b, 'es', {numeric:true}); });
  topicSelect.innerHTML = '';
  if (!topicKeys.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'No hay subtemas disponibles';
    topicSelect.appendChild(empty);
  } else {
    topicKeys.forEach(function(key) {
      const count = basePool.filter(function(q) { return q.topic === key; }).length;
      const opt = document.createElement('option');
      opt.value = key;
      const unit = type === 'supuestos' ? 'supuestos' : 'preguntas';
      opt.textContent = getTopicDisplayLabel(key, subLabels[key] || key) + ' (' + count + ' ' + unit + ')';
      topicSelect.appendChild(opt);
    });
    if (topicKeys.indexOf(oldTopic) !== -1) topicSelect.value = oldTopic;
  }
  updateSelectionControls();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startTest() {
  const mode = document.getElementById('modeSelect').value;
  const block = document.getElementById('blockSelect').value;
  const topic = document.getElementById('topicSelect').value;
  const numInput = document.getElementById('numQuestions');
  const checkMode = document.getElementById('checkMode').value;
  const type = currentTestType();

  practiceMode = (checkMode === 'practice');
  testFinished = false;
  testFinishing = false;
  resetScreenMood();
  stopStreakShake();

  const basePool = (type === 'supuestos') ? ALL_SUPUESTOS : ALL_QUESTIONS;
  let pool = basePool;
  if (activeChallenge) { pool = basePool.filter(function(q) { return q.topic === activeChallenge.topic; }); }
  else if (mode === 'block') {
    pool = basePool.filter(function(q) { return q.source === block; });
  } else if (mode === 'topic') {
    pool = basePool.filter(function(q) { return q.topic === topic; });
  }

  const total = pool.length;
  if (!total) return;

  let n = parseInt(numInput.value, 10) || 0;
  if (n < 1) n = 1;
  if (n > total) n = total;
  numInput.value = n;

  const indices = Array.from({ length: total }, function(_, i) { return i; });
  shuffle(indices);
  const requestedCount = activeChallenge ? Math.max(1, Number(activeChallenge.count) || total) : n;
  const selectedIdx = indices.slice(0, Math.min(total, requestedCount));
  activeQuestions = selectedIdx.map(function(i) { return pool[i]; });
  const challengeMeta = activeChallenge && getChallengeTopics().find(function(x){return x.topic===activeChallenge.topic;});
  activeSessionTitle = activeChallenge ? ('Desafío ' + (challengeMeta ? challengeMeta.displayLabel : activeChallenge.topic) + ' · ' + (type==='supuestos'?'Supuestos':'Test')) : getSessionTitle();
  userAnswers = new Array(activeQuestions.length).fill(null);
  currentIndex = 0;

  if (activeChallenge) showAppScreen('setupScreen');
  const testArea = document.getElementById('testArea');
  document.getElementById('setupScreen').hidden = false;
  testArea.style.display = 'block';
  testArea.classList.remove('test-finished');
  document.getElementById('scoreBox').innerHTML = '';
  document.getElementById('scoreBox').className = '';
  document.querySelector('.controls').style.display = 'none';

  const modeBadge = document.getElementById('modeBadge');
  modeBadge.textContent = practiceMode ? 'MODO PRÁCTICA' : 'MODO EXAMEN';
  modeBadge.classList.toggle('practice', practiceMode);
  modeBadge.classList.toggle('exam', !practiceMode);
  document.getElementById('streakStat').hidden = !practiceMode;
  document.getElementById('screenFX').classList.toggle('exam-mode', !practiceMode);
  document.getElementById('mobileDock').hidden = false;
  updateInTestPlayerHUD();

  renderQuestion();
  testArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getCurrentStreak() {
  if (!practiceMode || !activeQuestions.length) return 0;

  let streak = 0;
  let lastAnsweredIndex = currentIndex;
  if (!userAnswers[lastAnsweredIndex]) lastAnsweredIndex--;
  for (let i = lastAnsweredIndex; i >= 0; i--) {
    const answer = userAnswers[i];
    if (!answer || answer !== activeQuestions[i].correct) break;
    streak++;
  }
  return streak;
}

function getHeatLevel(streak) {
  if (!streak) return 0;

  // En supuestos, la progresión depende del tamaño real de la sesión.
  if (currentTestType() === 'supuestos') {
    const sessionLength = Math.max(1, activeQuestions.length);
    return Math.min(7, Math.ceil((streak / sessionLength) * 7));
  }

  if (streak >= 20) return 7;
  if (streak >= 15) return 6;
  if (streak >= 10) return 5;
  if (streak >= 7) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

function vibrateForStreak(streak) {
  const body = document.body;
  if (!streak || !activeQuestions.length || testFinished || testFinishing || !playerSettings.effectsEnabled || !playerSettings.shakeEnabled || playerSettings.reducedMotion) {
    stopStreakShake();
    return;
  }

  // El temblor permanece activo durante toda la racha y aumenta con cada acierto.
  const maxDistance = Math.min(2, Math.max(0.5, Number(playerSettings.shakeMaxDistance) || 2));
  const distance = Math.min(maxDistance, Math.max(0.15, streak * (maxDistance / 13)));
  const baseDuration = Math.min(1000, Math.max(100, Number(playerSettings.shakeBaseDuration) || 1000));
  const duration = Math.max(50, baseDuration - streak * 20);
  body.style.setProperty('--streak-shake-distance', distance.toFixed(1) + 'px');
  body.style.setProperty('--streak-shake-duration', duration.toFixed(0) + 'ms');
  if (!body.classList.contains('streak-screen-shaking')) {
    body.classList.add('streak-screen-shaking');
  }
}

function stopStreakShake() {
  const body = document.body;
  body.classList.remove('streak-screen-shaking', 'streak-vibrate-1', 'streak-vibrate-2', 'streak-vibrate-3', 'streak-vibrate-4', 'streak-vibrate-5', 'streak-vibrate-6', 'streak-vibrate-7');
  body.style.removeProperty('--streak-shake-distance');
  body.style.removeProperty('--streak-shake-duration');
}

function isStreakMilestone(streak) {
  if (currentTestType() === 'supuestos') {
    const quarter = Math.max(1, Math.ceil(activeQuestions.length / 4));
    return streak > 0 && streak % quarter === 0;
  }
  return [2, 3, 5, 7, 10, 15, 20, 25, 50].indexOf(streak) !== -1;
}

function updateQuizProgress() {
  const total = activeQuestions.length;
  const answered = userAnswers.filter(function(x) { return x !== null; }).length;
  const remaining = total - answered;
  const percent = total ? Math.round((answered / total) * 100) : 0;

  document.getElementById('progressText').textContent = answered + ' / ' + total + ' contestadas';
  document.getElementById('answeredValue').textContent = answered;
  document.getElementById('remainingValue').textContent = remaining;
  document.getElementById('questionPosition').textContent = 'Pregunta ' + (currentIndex + 1) + ' / ' + total;
  document.getElementById('progressFill').style.width = percent + '%';

  const progressTrack = document.querySelector('.progress-track');
  progressTrack.setAttribute('aria-valuemax', total);
  progressTrack.setAttribute('aria-valuenow', answered);
  document.getElementById('streakValue').textContent = getCurrentStreak();
}

function showEffectToast(message, mood) {
  const toast = document.getElementById('streakToast');
  toast.textContent = message;
  toast.dataset.mood = mood || 'fire';
  toast.classList.remove('is-visible');
  void toast.offsetWidth;
  toast.classList.add('is-visible');

  if (streakToastTimer) window.clearTimeout(streakToastTimer);
  streakToastTimer = window.setTimeout(function() {
    toast.classList.remove('is-visible');
  }, 2200);
}

function showStreakToast(streak) {
  const message = streak >= 10
    ? '¡' + streak + ' SEGUIDAS! ¡MODO INFERNO!'
    : streak >= 5
      ? '¡' + streak + ' SEGUIDAS! ¡ESTO ARDE!'
      : '¡' + streak + ' ACIERTOS! ¡SUBE LA TEMPERATURA!';
  showEffectToast(message, 'fire');
}

function resetScreenMood() {
  if (screenMoodTimer) window.clearTimeout(screenMoodTimer);
  if (answerEffectTimer) window.clearTimeout(answerEffectTimer);
  if (resultEffectTimer) window.clearTimeout(resultEffectTimer);
  screenMoodTimer = null;
  answerEffectTimer = null;
  resultEffectTimer = null;
  answerEffectGeneration++;
  stopStreakShake();
  document.body.classList.remove(
    'heat-level-1', 'heat-level-2', 'heat-level-3', 'heat-level-4',
    'heat-level-5', 'heat-level-6', 'heat-level-7', 'freeze-hit',
    'result-flash-good', 'result-flash-bad'
  );
  const fx = document.getElementById('screenFX');
  if (fx) {
    fx.classList.remove('is-burning', 'is-freezing');
    fx.dataset.intensity = '0';
    fx.querySelectorAll('.fx-flame, .fx-ember, .fx-ice-shard').forEach(function(item) { item.remove(); });
  }
}

function setHeatMood(streak) {
  const body = document.body;
  const fx = document.getElementById('screenFX');
  const levels = ['heat-level-1', 'heat-level-2', 'heat-level-3', 'heat-level-4', 'heat-level-5', 'heat-level-6', 'heat-level-7'];

  if (screenMoodTimer) window.clearTimeout(screenMoodTimer);
  screenMoodTimer = null;
  body.classList.remove('freeze-hit');
  body.classList.remove.apply(body.classList, levels);

  const level = getHeatLevel(streak);
  if (level && playerSettings.effectsEnabled && !playerSettings.reducedMotion) {
    body.classList.add('heat-level-' + level);
    if (fx) {
      fx.classList.remove('is-freezing');
      fx.classList.add('is-burning');
      fx.dataset.intensity = String(level);
    }
  } else if (fx) {
    fx.classList.remove('is-burning');
    delete fx.dataset.intensity;
  }
}

function animateAnswerOutcome(isCorrect, afterAnimation) {
  const panel = document.getElementById('questionPanel');
  panel.classList.remove('answer-success', 'answer-error');
  void panel.offsetWidth;
  panel.classList.add(isCorrect ? 'answer-success' : 'answer-error');

  if (answerEffectTimer) window.clearTimeout(answerEffectTimer);
  const generation = ++answerEffectGeneration;
  answerEffectTimer = window.setTimeout(function() {
    answerEffectTimer = null;
    if (generation !== answerEffectGeneration || testFinished || testFinishing) return;
    if (typeof afterAnimation === 'function') afterAnimation();
  }, isCorrect ? 520 : 620);
}

function triggerFreezeEffect(message) {
  const body = document.body;
  const fx = document.getElementById('screenFX');
  if (screenMoodTimer) window.clearTimeout(screenMoodTimer);

  body.classList.remove('heat-level-1', 'heat-level-2', 'heat-level-3', 'heat-level-4', 'heat-level-5', 'heat-level-6', 'heat-level-7');
  if (!playerSettings.effectsEnabled || playerSettings.reducedMotion) return;
  body.classList.add('freeze-hit');
  if (fx) {
    fx.classList.remove('is-burning');
    fx.classList.add('is-freezing');
  }

  spawnIceShards(28);
  showEffectToast(message || '¡PANTALLA CONGELADA! Racha interrumpida', 'ice');

  screenMoodTimer = window.setTimeout(function() {
    body.classList.remove('freeze-hit');
    if (fx) fx.classList.remove('is-freezing');
    screenMoodTimer = null;
  }, 1900);
}

function spawnFlames(amount, intensity) {
  const layer = document.getElementById('screenFX');
  if (!layer || !playerSettings.effectsEnabled || playerSettings.reducedMotion) return;
  const boost = playerSettings.fireIntensity === 'fuerte' ? 0.78 : playerSettings.fireIntensity === 'inferno' ? 1.0 : 1.28;
  const levelBoost = Math.max(1, Number(intensity) || 1);
  const count = Math.min(72, Math.round(amount * boost + levelBoost * 2));

  for (let i = 0; i < count; i++) {
    const flame = document.createElement('span');
    flame.className = 'fx-flame';
    flame.style.left = (Math.random() * 100) + '%';
    flame.style.setProperty('--flame-height', (28 + Math.random() * (24 + levelBoost * 8)) + 'vh');
    flame.style.setProperty('--flame-width', (18 + Math.random() * (18 + levelBoost * 3)) + 'px');
    flame.style.setProperty('--flame-duration', (0.75 + Math.random() * 0.95) + 's');
    flame.style.setProperty('--flame-delay', (Math.random() * 0.35) + 's');
    flame.style.setProperty('--flame-drift', ((Math.random() - 0.5) * 42) + 'px');
    flame.style.setProperty('--flame-tilt', ((Math.random() - 0.5) * 18) + 'deg');
    layer.appendChild(flame);
    window.setTimeout(function() { flame.remove(); }, 2300);
  }
}

function spawnEmbers(amount) {
  const layer = document.getElementById('screenFX');
  if (!layer || !playerSettings.effectsEnabled || playerSettings.reducedMotion) return;

  for (let i = 0; i < amount; i++) {
    const ember = document.createElement('span');
    ember.className = 'fx-ember';
    ember.style.left = (Math.random() * 100) + '%';
    ember.style.setProperty('--ember-drift', ((Math.random() - 0.5) * 150) + 'px');
    ember.style.setProperty('--ember-duration', (1.15 + Math.random() * 1.25) + 's');
    ember.style.setProperty('--ember-delay', (Math.random() * 0.25) + 's');
    layer.appendChild(ember);
    window.setTimeout(function() { ember.remove(); }, 2900);
  }
}

function spawnIceShards(amount) {
  const layer = document.getElementById('screenFX');
  if (!layer) return;

  for (let i = 0; i < amount; i++) {
    const shard = document.createElement('span');
    shard.className = 'fx-ice-shard';
    shard.style.left = (Math.random() * 100) + '%';
    shard.style.top = (Math.random() * 100) + '%';
    shard.style.setProperty('--ice-drift-x', ((Math.random() - 0.5) * 130) + 'px');
    shard.style.setProperty('--ice-drift-y', ((Math.random() - 0.5) * 130) + 'px');
    shard.style.setProperty('--ice-rotate', ((Math.random() - 0.5) * 240) + 'deg');
    shard.style.setProperty('--ice-duration', (0.75 + Math.random() * 0.8) + 's');
    layer.appendChild(shard);
    window.setTimeout(function() { shard.remove(); }, 1900);
  }
}

function applyPracticeHighlight(q) {
  const optionsList = document.getElementById('optionsList');
  const lis = optionsList.querySelectorAll('li');
  lis.forEach(function(li) {
    li.classList.remove('opt-correct', 'opt-wrong');
  });

  const feedback = document.getElementById('feedbackText');
  feedback.className = 'feedback q-meta';
  const user = userAnswers[currentIndex];

  if (!practiceMode || !user) {
    // No mostramos instrucciones bajo la pregunta: el espacio queda limpio.
    feedback.textContent = '';
    return;
  }

  q.options.forEach(function(opt, idx) {
    if (opt.letter === q.correct) lis[idx].classList.add('opt-correct');
  });

  const selectedIndex = q.options.findIndex(function(o) { return o.letter === user; });
  const isCorrect = user === q.correct;

  if (!isCorrect && selectedIndex >= 0) {
    lis[selectedIndex].classList.add('opt-wrong');
    feedback.textContent = 'Respuesta incorrecta. La correcta es ' + q.correct + '.';
    feedback.classList.add('feedback-bad');
  } else {
    const streak = getCurrentStreak();
    feedback.textContent = streak > 1
      ? '¡Correcto! Llevas ' + streak + ' aciertos seguidos. ¡Sigue así!'
      : '¡Correcto! Buen trabajo. Sigue así.';
    feedback.classList.add('feedback-good');
  }
}
function renderQuestion() {
  const q = activeQuestions[currentIndex];
  const qMeta = document.getElementById('qMeta');
  const qText = document.getElementById('qText');
  const optionsList = document.getElementById('optionsList');
  const normaText = document.getElementById('normaText');
  const testArea = document.getElementById('testArea');
  const type = currentTestType();

  const srcLabels = (type === 'supuestos') ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
  const subLabels = (type === 'supuestos') ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;

  // Durante el test no mostramos metadatos del banco (bloque, archivo ni tema).
  // Esta información queda reservada para la revisión posterior.
  qMeta.textContent = '';
  qMeta.style.display = 'none';
  qText.textContent = q.question;

  optionsList.innerHTML = '';
  q.options.forEach(function(opt) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'option';
    input.value = opt.letter;
    input.checked = userAnswers[currentIndex] === opt.letter;
    li.classList.toggle('selected', input.checked);

    input.addEventListener('change', function() {
      userAnswers[currentIndex] = opt.letter;
      optionsList.querySelectorAll('li').forEach(function(item) {
        item.classList.remove('selected');
      });
      li.classList.add('selected');

      applyPracticeHighlight(q);
      const feedback = document.getElementById('feedbackText');
      if (!practiceMode) {
        feedback.className = 'feedback q-meta feedback-neutral';
        feedback.textContent = 'Respuesta guardada. La corrección aparecerá al finalizar.';
      }

      if (practiceMode) {
        const isCorrect = userAnswers[currentIndex] === q.correct;
        animateAnswerOutcome(isCorrect, function() {
          if (isCorrect) {
            const streak = getCurrentStreak();
            awardCorrectQuestion(q, currentTestType(), false, false, streak);
            vibrateForStreak(streak);
            const heat = getHeatLevel(streak);
            setHeatMood(streak);
            spawnFlames(14 + heat * 7, heat);
            spawnEmbers(Math.min(58, 12 + streak * 3 + heat * 4));
            if (isStreakMilestone(streak)) showStreakToast(streak);
          } else {
            stopStreakShake();
            triggerFreezeEffect('¡RACHA INTERRUMPIDA! ¡LLEGA EL HIELO!');
          }
        });
      }
      updateQuizProgress();
    });

    const span = document.createElement('span');
    span.textContent = opt.letter + ') ' + opt.text;
    label.appendChild(input);
    label.appendChild(span);
    li.appendChild(label);
    optionsList.appendChild(li);
  });

  // La norma de referencia solo se muestra en la revisión, después de corregir el test.
  normaText.textContent = '';
  normaText.style.display = 'none';
  document.getElementById('prevBtn').disabled = currentIndex === 0;
  document.getElementById('nextBtn').disabled = currentIndex === activeQuestions.length - 1;

  updateQuizProgress();
  applyPracticeHighlight(q);

  const panel = document.getElementById('questionPanel');
  panel.classList.remove('question-enter', 'answer-success', 'answer-error');
  void panel.offsetWidth;
  panel.classList.add('question-enter');
}

function changeQuestion(delta) {
  const newIndex = currentIndex + delta;
  if (newIndex < 0 || newIndex >= activeQuestions.length) return;
  currentIndex = newIndex;
  renderQuestion();
  if (practiceMode && userAnswers[currentIndex] && userAnswers[currentIndex] === activeQuestions[currentIndex].correct) {
    setHeatMood(getCurrentStreak());
  }
}

function getQuestionExplanation(q) {
  const candidates = [q.explanation, q.explicacion, q.explanationText, q.justification, q.justificacion, q.rationale, q.feedback];
  for (let i = 0; i < candidates.length; i++) {
    const value = candidates[i];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) return value.join(' ');
  }
  return '';
}

function buildReviewItem(item) {
  const q = item.q;
  const article = document.createElement('article');
  article.className = 'review-item';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'review-question-trigger';
  trigger.setAttribute('aria-expanded', 'false');

  const title = document.createElement('span');
  title.className = 'review-trigger-title';
  title.textContent = 'Pregunta ' + item.idx;
  const status = document.createElement('span');
  status.className = 'review-trigger-status';
  status.textContent = item.user ? 'Ver corrección +' : 'Sin responder +';
  trigger.appendChild(title);
  trigger.appendChild(status);

  const panel = document.createElement('div');
  panel.className = 'review-answer';
  panel.hidden = true;

  const question = document.createElement('p');
  question.className = 'review-question-text';
  question.textContent = q.question || 'Texto de pregunta no disponible.';
  panel.appendChild(question);

  if (q.code) {
    const code = document.createElement('p');
    code.className = 'review-code';
    code.textContent = 'Código de pregunta: ' + q.code;
    panel.appendChild(code);
  }

  const answers = document.createElement('div');
  answers.className = 'review-options';
  (q.options || []).forEach(function(opt) {
    const option = document.createElement('div');
    option.className = 'review-option';
    option.textContent = opt.letter + ') ' + opt.text;
    if (opt.letter === q.correct) option.classList.add('review-option-correct');
    if (item.user && item.user === opt.letter && item.user !== q.correct) {
      option.classList.add('review-option-wrong');
    }
    answers.appendChild(option);
  });
  panel.appendChild(answers);

  const answerSummary = document.createElement('p');
  answerSummary.className = 'review-answer-summary';
  answerSummary.textContent = item.user
    ? 'Tu respuesta: ' + item.user + ' · Respuesta correcta: ' + q.correct
    : 'No seleccionaste ninguna respuesta. La correcta era: ' + q.correct;
  panel.appendChild(answerSummary);

  const explanation = getQuestionExplanation(q);
  if (explanation) {
    const explanationBlock = document.createElement('div');
    explanationBlock.className = 'review-explanation';
    const explanationTitle = document.createElement('strong');
    explanationTitle.textContent = 'Explicación';
    const explanationText = document.createElement('p');
    explanationText.textContent = explanation;
    explanationBlock.appendChild(explanationTitle);
    explanationBlock.appendChild(explanationText);
    panel.appendChild(explanationBlock);
  }

  if (q.norma) {
    const norma = document.createElement('p');
    norma.className = 'review-norma';
    norma.textContent = 'Norma de referencia: ' + q.norma;
    panel.appendChild(norma);
  }

  trigger.addEventListener('click', function() {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isOpen));
    panel.hidden = isOpen;
    article.classList.toggle('is-open', !isOpen);
    status.textContent = isOpen ? (item.user ? 'Ver corrección +' : 'Sin responder +') : 'Ocultar revisión −';
  });

  article.appendChild(trigger);
  article.appendChild(panel);
  return article;
}

function returnToMenu() {
  if (activeQuestions.length && !testFinished && userAnswers.some(function(answer) { return answer !== null; })) {
    const leave = window.confirm('Tienes un test en curso. Si vuelves al menú, esta sesión no contará en tus estadísticas. ¿Quieres salir?');
    if (!leave) return;
  }
  testFinishing = false;
  resetScreenMood();
  stopStreakShake();
  pendingChallengePart = null;
  const challengeModal = document.getElementById('challengeModeOverlay');
  if (challengeModal) { challengeModal.hidden = true; challengeModal.classList.remove('challenge-mode-show'); }
  activeQuestions = [];
  userAnswers = [];
  currentIndex = 0;
  activeSessionTitle = '';
  activeChallenge = null;
  testFinished = false;
  document.getElementById('testArea').style.display = 'none';
  document.getElementById('testArea').classList.remove('test-finished');
  document.getElementById('scoreBox').innerHTML = '';
  document.getElementById('scoreBox').className = '';
  document.getElementById('controls').style.display = '';
  document.getElementById('mobileDock').hidden = true;
  showAppScreen('mainMenu');
}

function finishTest() {
  if (!activeQuestions.length || testFinished || testFinishing) return;
  testFinishing = true;
  resetScreenMood();
  stopStreakShake();

  let correct = 0;
  let wrong = 0;
  let blank = 0;
  const details = [];
  const xpBeforeTest = playerProfile.totalXP;
  let consecutiveCorrect = 0;

  activeQuestions.forEach(function(q, idx) {
    const user = userAnswers[idx];
    if (!user) {
      consecutiveCorrect = 0;
      blank++;
      details.push({ idx: idx + 1, q: q, user: null });
      return;
    }

    if (user === q.correct) {
      correct++;
      consecutiveCorrect++;
      awardCorrectQuestion(q, currentTestType(), true, true, consecutiveCorrect);
    } else {
      consecutiveCorrect = 0;
      wrong++;
      details.push({ idx: idx + 1, q: q, user: user });
    }
  });

  const total = activeQuestions.length;
  const maxPoints = total;
  const score = correct - wrong / 3;
  const scorePct = Math.round((score / maxPoints) * 100);
  const passed = score >= maxPoints * 0.5;
  savePlayerProfile();
  saveCompletedTest({ correct: correct, wrong: wrong, blank: blank, score: score, scorePct: scorePct }, true);
  if (activeChallenge) completeChallengePart(passed, true);
  const gainedXP = playerProfile.totalXP - xpBeforeTest;
  const oldLevel = getPlayerLevelInfo(xpBeforeTest).level;
  const newLevel = getPlayerLevelInfo(playerProfile.totalXP).level;
  if (newLevel > oldLevel) showLevelUpAnimation(oldLevel, newLevel);
  else if (gainedXP > 0) showEffectToast('+' + Math.round(gainedXP) + ' XP · Experiencia ganada', 'fire');
  updateInTestPlayerHUD();
  stopStreakShake();

  const box = document.getElementById('scoreBox');
  box.className = 'score ' + (passed ? '' : 'bad');
  box.innerHTML = '';

  const resultHeading = document.createElement('div');
  resultHeading.className = 'result-heading';
  resultHeading.textContent = passed ? '¡Test superado!' : 'Test finalizado';
  const resultText = document.createElement('p');
  resultText.className = 'result-summary';
  resultText.textContent = score.toFixed(2) + ' / ' + maxPoints + ' puntos (' + scorePct + '%). Aciertos: ' + correct + ' · Fallos: ' + wrong + ' · En blanco: ' + blank + '. ' +
    (passed ? 'Has superado el 50% de la puntuación máxima. APTO.' : 'No alcanzas el 50% de la puntuación máxima. NO APTO.');
  box.appendChild(resultHeading);
  box.appendChild(resultText);

  if (details.length) {
    const review = document.createElement('section');
    review.className = 'details review-details';
    const reviewHeading = document.createElement('h3');
    reviewHeading.textContent = 'Revisa tus preguntas (' + details.length + ')';
    const reviewIntro = document.createElement('p');
    reviewIntro.className = 'review-intro';
    reviewIntro.textContent = 'Pulsa cualquier pregunta para ver las opciones, tu respuesta y la correcta.';
    review.appendChild(reviewHeading);
    review.appendChild(reviewIntro);
    details.forEach(function(item) { review.appendChild(buildReviewItem(item)); });
    box.appendChild(review);
  } else {
    const perfect = document.createElement('div');
    perfect.className = 'review-perfect';
    perfect.textContent = '¡Perfecto! No tienes preguntas falladas ni respuestas en blanco.';
    box.appendChild(perfect);
  }

  // Restablece el display definido por CSS: flex en escritorio y grid en móvil.
  // No fijar 'flex' inline, porque rompe la cuadrícula responsive del menú de nuevo desafío.
  document.querySelector('.controls').style.display = '';
  document.getElementById('mobileDock').hidden = true;
  document.getElementById('testArea').classList.add('test-finished');

  // En modo examen, la corrección global también muestra primero el color
  // del resultado y después activa el efecto correspondiente.
  resetScreenMood();
  const outcomeClass = passed ? 'result-flash-good' : 'result-flash-bad';
  document.body.classList.remove('result-flash-good', 'result-flash-bad');
  void document.body.offsetWidth;
  document.body.classList.add(outcomeClass);
  if (resultEffectTimer) window.clearTimeout(resultEffectTimer);
  resultEffectTimer = window.setTimeout(function() {
    resultEffectTimer = null;
    document.body.classList.remove(outcomeClass);
    if (!testFinished || !activeQuestions.length) return;
    if (passed) {
      // Aprobar el test activa el fuego al máximo, independientemente de la racha.
      setHeatMood(999);
      spawnFlames(72, 7);
      spawnEmbers(90);
      showEffectToast('¡APTO! · ¡FUEGO MÁXIMO!', 'fire');
    } else {
      // Suspender activa el efecto de hielo como cierre del desafío.
      triggerFreezeEffect('NO APTO · ¡EL EXAMEN SE CONGELA!');
    }
  }, 600);
  testFinishing = false;

  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
// Controles principales
document.getElementById('startBtn').addEventListener('click', startTest);
document.getElementById('prevBtn').addEventListener('click', function() { changeQuestion(-1); });
document.getElementById('nextBtn').addEventListener('click', function() { changeQuestion(1); });
document.getElementById('finishBtn').addEventListener('click', finishTest);
document.getElementById('mobilePrevBtn').addEventListener('click', function() { changeQuestion(-1); });
document.getElementById('mobileNextBtn').addEventListener('click', function() { changeQuestion(1); });
document.getElementById('mobileFinishBtn').addEventListener('click', finishTest);

document.getElementById('modeSelect').addEventListener('change', function() {
  updateSelectionControls();
  initSelects();
});

document.getElementById('testTypeSelect').addEventListener('change', function() {
  initSelects();
  updateSelectionControls();
});

document.getElementById('challengePracticeBtn').addEventListener('click', function() { launchPendingChallengePart('practice'); });
document.getElementById('challengeExamBtn').addEventListener('click', function() { launchPendingChallengePart('exam'); });
document.getElementById('challengeModeCancel').addEventListener('click', function() {
  pendingChallengePart = null;
  const modal = document.getElementById('challengeModeOverlay');
  if (modal) { modal.hidden = true; modal.classList.remove('challenge-mode-show'); }
});
document.getElementById('achievementRevealClose').addEventListener('click', closeAchievementReveal);
document.getElementById('levelUpContinueBtn').addEventListener('click', closeLevelUpAnimation);
document.getElementById('achievementRevealOverlay').addEventListener('click', function(event) { if (event.target === this) closeAchievementReveal(); });
document.getElementById('levelUpOverlay').addEventListener('click', function(event) { if (event.target === this) closeLevelUpAnimation(); });

// Atajos de teclado para moverse por el test sin interferir con los campos.
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const achievementOverlay = document.getElementById('achievementRevealOverlay');
    const levelOverlay = document.getElementById('levelUpOverlay');
    const challengeOverlay = document.getElementById('challengeModeOverlay');
    const dailyOverlay = document.getElementById('dailyEntryOverlay');
    if (achievementOverlay && !achievementOverlay.hidden) { closeAchievementReveal(); return; }
    if (levelOverlay && !levelOverlay.hidden) { closeLevelUpAnimation(); return; }
    if (challengeOverlay && !challengeOverlay.hidden) {
      pendingChallengePart = null; challengeOverlay.hidden = true; challengeOverlay.classList.remove('challenge-mode-show'); return;
    }
    if (dailyOverlay && !dailyOverlay.hidden) { closeDailyEntry(); return; }
  }
  const testArea = document.getElementById('testArea');
  if (testArea.style.display === 'none' || !activeQuestions.length) return;
  if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].indexOf(event.target.tagName) !== -1) return;

  if (event.key === 'ArrowLeft') changeQuestion(-1);
  if (event.key === 'ArrowRight') changeQuestion(1);
});

// Navegación del menú principal.
document.getElementById('homeBtn').addEventListener('click', returnToMenu);
document.getElementById('menuStartBtn').addEventListener('click', openSetupScreen);
document.getElementById('menuChallengesBtn').addEventListener('click', function(){showAppScreen('challengeScreen');});
document.getElementById('dailyEntryClose').addEventListener('click', closeDailyEntry);
document.getElementById('menuOptionsBtn').addEventListener('click', function() { showAppScreen('optionsScreen'); });
document.getElementById('menuProfileBtn').addEventListener('click', function() { showAppScreen('profileScreen'); });
document.getElementById('setupBackBtn').addEventListener('click', returnToMenu);
document.querySelectorAll('[data-back-menu]').forEach(function(button) {
  button.addEventListener('click', returnToMenu);
});

document.getElementById('playerNameForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const value = document.getElementById('playerNameInput').value.trim().slice(0, 32);
  playerProfile.name = value || 'Jugador';
  const saved = savePlayerProfile();
  document.getElementById('profileSavedText').textContent = saved
    ? 'Nombre guardado en este dispositivo.'
    : 'No se pudo guardar el nombre en este navegador.';
  renderProfileScreen();
});

document.getElementById('shakeMaxDistance').addEventListener('input', function(event) {
  document.getElementById('shakeMaxDistanceValue').textContent = Number(event.target.value).toFixed(1) + ' px';
});
document.getElementById('shakeBaseDuration').addEventListener('input', function(event) {
  document.getElementById('shakeBaseDurationValue').textContent = event.target.value + ' ms';
});

document.getElementById('saveOptionsBtn').addEventListener('click', function() {
  playerSettings.effectsEnabled = document.getElementById('effectsEnabled').checked;
  playerSettings.fireIntensity = document.getElementById('fireIntensitySelect').value;
  playerSettings.reducedMotion = document.getElementById('reducedMotionToggle').checked;
  playerSettings.shakeEnabled = document.getElementById('shakeEnabled').checked;
  playerSettings.shakeMaxDistance = Number(document.getElementById('shakeMaxDistance').value);
  playerSettings.shakeBaseDuration = Number(document.getElementById('shakeBaseDuration').value);
  const saved = savePlayerSettings();
  applyPlayerSettings();
  resetScreenMood();
  document.getElementById('optionsSavedText').textContent = saved ? 'Opciones guardadas.' : 'No se pudieron guardar las opciones.';
});

document.getElementById('resetStatsBtn').addEventListener('click', function() {
  const accepted = window.confirm('¿Seguro que quieres borrar todas las estadísticas y el historial de este jugador? Esta acción no se puede deshacer.');
  if (!accepted) return;
  const name = playerProfile.name;
  playerProfile = defaultPlayerProfile();
  playerProfile.name = name;
  savePlayerProfile();
  renderProfileScreen();
  showEffectToast('Estadísticas reiniciadas', 'fire');
});


// API de diagnóstico para pruebas manuales desde DevTools (F12 → Consola).
// Las acciones de simulación modifican el perfil local; resetProfile() borra todo el progreso.
window.TransportistaDebug = Object.freeze({
  help: function() {
    return [
      'TransportistaDebug.status() — resumen del perfil, nivel, XP y racha.',
      'TransportistaDebug.checkData() — totales del banco y diferencias entre PDF y data.js.',
      'TransportistaDebug.challenges() — lista desafíos y estados; acepta letra de bloque: challenges("A").',
      'TransportistaDebug.challengeSet("1A04", "supuestos") — muestra una muestra aleatoria sin iniciar el test.',
      'TransportistaDebug.startChallenge("1A04", "supuestos", "practice") — inicia en práctica; usa "exam" para examen.',
      'TransportistaDebug.completeChallenge("1A04", "objetivas", true) — simula aprobar una parte y paga sus logros.',
      'TransportistaDebug.listAchievements() — lista IDs, rareza, XP y desbloqueo.',
      'TransportistaDebug.unlockAchievement("first-test") — fuerza un logro y paga XP una sola vez.',
      'TransportistaDebug.setXP(1200, true) / addXP(100, true) — prueba XP y animación de nivel.',
      'TransportistaDebug.levelUpTo(15) — coloca el perfil en nivel 15.',
      'TransportistaDebug.previewDaily(7, false, 7) — previsualiza la racha diaria sin guardarla.',
      'TransportistaDebug.previewDaily(1, true, 1) — previsualiza la pérdida de racha con copo de nieve.',
      'TransportistaDebug.previewFire() / previewIce() / clearEffects() — prueba efectos visuales.',
      'TransportistaDebug.resetChallenges(true) — borra progreso y devuelve XP de logros de desafíos.',
      'TransportistaDebug.resetProfile() — BORRA todo el perfil local, XP, logros, rachas e historial.'
    ].join('\n');
  },
  status: function() {
    const info=getPlayerLevelInfo(playerProfile.totalXP);
    return {
      name:playerProfile.name, xp:Math.floor(playerProfile.totalXP), maxXP:getXPForMaximumLevel(),
      level:info.level, rank:info.rank.title, achievementsUnlocked:playerProfile.unlockedAchievements.length,
      daysUsed:playerProfile.dailyUsageDates.length, dailyStreak:playerProfile.dailyStreak,
      bestDailyStreak:playerProfile.bestDailyStreak,
      challengesDone:getChallengeTopics().filter(function(x){return challengePartsDone(x.topic);}).length,
      challengeTopics:getChallengeTopics().length
    };
  },
  checkData: function() {
    const topics=getChallengeTopics();
    return {
      objectiveQuestions:ALL_QUESTIONS.length,
      practicalCases:ALL_SUPUESTOS.length,
      topicCount:topics.length,
      topics:topics.map(function(m){return {
        topic:m.topic,label:m.displayLabel,
        questionsInData:m.questions,questionsForChallenge:m.questionCount,questionsRequestedByPDF:m.questionTarget,questionShortfall:m.questionShortfall,
        practicalCasesInData:m.suppositions,practicalCasesForChallenge:m.suppositionCount,practicalRule:m.suppositionTarget
      };})
    };
  },
  challenges: function(moduleLetter) {
    return getChallengeTopics().filter(function(m){return !moduleLetter || m.module===String(moduleLetter).toUpperCase();}).map(function(m){
      const s=getChallengeState(m.topic);
      return {topic:m.topic,label:m.displayLabel,questions:m.questionCount,practical:m.suppositionCount,needsPractical:m.hasSuppositionPart,testDone:s.test,practicalDone:s.practical,complete:challengePartsDone(m.topic)};
    });
  },
  challengeSet: function(topic,type) {
    const meta=getChallengeTopics().find(function(m){return m.topic===topic;});
    if(!meta) throw new Error('Tema no encontrado: '+topic);
    const pool=(type==='supuestos'?ALL_SUPUESTOS:ALL_QUESTIONS).filter(function(q){return q.topic===topic;});
    const count=getChallengePartCount(meta,type==='supuestos'?'supuestos':'objetivas');
    return shuffle(pool.slice()).slice(0,count).map(function(q){return {code:q.code,topic:q.topic,question:(q.question||q.question_lines||[]).toString().slice(0,180)};});
  },
  startChallenge: function(topic,type,mode) {
    if(!['objetivas','supuestos'].includes(type)) throw new Error('type debe ser "objetivas" o "supuestos"');
    if(mode !== undefined && !['practice','exam'].includes(mode)) throw new Error('mode debe ser "practice" o "exam"');
    const started=startChallengePart(topic,type);
    if(started && mode) launchPendingChallengePart(mode);
    return {started:started,awaitingMode:!!pendingChallengePart,mode:mode||null,activeTopic:activeChallenge&&activeChallenge.topic,activeType:activeChallenge&&activeChallenge.type,questions:activeQuestions.length};
  },
  completeChallenge: function(topic,type,passed) {
    if(activeQuestions.length && !testFinished) throw new Error('Finaliza o abandona primero el test activo.');
    if(!['objetivas','supuestos'].includes(type)) throw new Error('type debe ser "objetivas" o "supuestos"');
    activeChallenge={topic:topic,type:type};
    completeChallengePart(passed!==false);
    renderMainMenu();
    if(!document.getElementById('profileScreen').hidden) renderProfileScreen();
    return this.challenges().find(function(x){return x.topic===topic;});
  },
  listAchievements: function() {
    return getAchievementDefinitions().map(function(a){return {id:a.id,title:a.secret&&!playerProfile.unlockedAchievements.includes(a.id)?'Logro secreto':a.title,rarity:a.rarity,xp:getAchievementXPForRarity(a.rarity),unlocked:playerProfile.unlockedAchievements.includes(a.id),progress:a.progress,target:a.target};});
  },
  unlockAchievement: function(id) {
    const item=getAchievementDefinitions().find(function(a){return a.id===id;});
    if(!item) throw new Error('Logro no encontrado: '+id);
    if(playerProfile.achievementXPClaimed.includes(id)) return {id:id,alreadyPaid:true,xp:0};
    const oldLevel=getPlayerLevelInfo(playerProfile.totalXP).level;
    if(!playerProfile.unlockedAchievements.includes(id)) playerProfile.unlockedAchievements.push(id);
    const reward=getAchievementXPForRarity(item.rarity);
    playerProfile.totalXP=Math.floor(playerProfile.totalXP)+reward;
    playerProfile.achievementXPClaimed.push(id);
    savePlayerProfile(); renderMainMenu();
    if(!document.getElementById('profileScreen').hidden) renderProfileScreen();
    enqueueAchievementReveal(item, reward, true);
    if(getPlayerLevelInfo(playerProfile.totalXP).level>oldLevel) showLevelUpAnimation(oldLevel,getPlayerLevelInfo(playerProfile.totalXP).level);
    return {id:id,reward:reward,xp:playerProfile.totalXP};
  },
  setXP: function(value,animate) {
    const target=Math.max(0,Math.floor(Number(value)||0));
    const oldLevel=getPlayerLevelInfo(playerProfile.totalXP).level;
    playerProfile.totalXP=target; savePlayerProfile(); renderMainMenu(); updateInTestPlayerHUD();
    if(!document.getElementById('profileScreen').hidden) renderProfileScreen();
    const nextLevel=getPlayerLevelInfo(playerProfile.totalXP).level;
    if(animate!==false && nextLevel>oldLevel) showLevelUpAnimation(oldLevel,nextLevel);
    return {xp:target,oldLevel:oldLevel,newLevel:nextLevel,info:getPlayerLevelInfo(target)};
  },
  addXP: function(value,animate) { return this.setXP(Math.floor(playerProfile.totalXP)+Math.max(0,Math.floor(Number(value)||0)),animate); },
  levelUpTo: function(level) {
    const target=Math.max(1,Math.min(PLAYER_RANKS.length,Math.floor(Number(level)||1)));
    let xp=0; for(let i=1;i<target;i++) xp+=xpRequiredForLevel(i);
    return this.setXP(xp,true);
  },
  previewDaily: function(streak,broken,usedThisWeek) {
    const originalStreak=playerProfile.dailyStreak, originalDates=playerProfile.dailyUsageDates;
    const n=Math.max(1,Math.min(999,Math.floor(Number(streak)||1)));
    const used=Math.max(0,Math.min(7,Math.floor(Number(usedThisWeek===undefined?n:usedThisWeek)||0)));
    const today=new Date(); const monday=new Date(today); monday.setDate(today.getDate()-(today.getDay()+6)%7);
    const dates=[]; for(let i=0;i<used;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);dates.push(localDateKey(d));}
    playerProfile.dailyStreak=n; playerProfile.dailyUsageDates=dates;
    dailyEntryState={today:localDateKey(),broken:!!broken}; showDailyEntry();
    playerProfile.dailyStreak=originalStreak; playerProfile.dailyUsageDates=originalDates;
    return {previewed:true,streak:n,broken:!!broken,daysShown:used};
  },
  previewFire: function() { resetScreenMood(); setHeatMood(999); spawnFlames(72,7); spawnEmbers(90); return 'Fuego máximo activado'; },
  previewIce: function() { triggerFreezeEffect('PRUEBA · EFECTO DE HIELO'); return 'Efecto de hielo activado'; },
  clearEffects: function() { resetScreenMood(); stopStreakShake(); return 'Efectos detenidos'; },
  resetChallenges: function(refundRewards) {
    const ids=getChallengeTopics().flatMap(function(m){return ['challenge-test-'+m.topic,'challenge-practical-'+m.topic,'challenge-complete-'+m.topic];});
    if(refundRewards!==false) {
      const defs=getAchievementDefinitions();
      ids.forEach(function(id){if(playerProfile.achievementXPClaimed.includes(id)){const def=defs.find(function(x){return x.id===id;}); if(def)playerProfile.totalXP=Math.max(0,playerProfile.totalXP-getAchievementXPForRarity(def.rarity));}});
    }
    playerProfile.challengeProgress={};
    playerProfile.unlockedAchievements=playerProfile.unlockedAchievements.filter(function(id){return ids.indexOf(id)===-1;});
    playerProfile.achievementXPClaimed=playerProfile.achievementXPClaimed.filter(function(id){return ids.indexOf(id)===-1;});
    savePlayerProfile(); renderChallengeScreen(); renderMainMenu();
    if(!document.getElementById('profileScreen').hidden) renderProfileScreen();
    return 'Progreso de desafíos reiniciado.';
  },
  resetProfile: function() {
    const name=playerProfile.name;
    resetScreenMood();
    stopStreakShake();
    clearCelebrationOverlays();
    activeQuestions=[]; userAnswers=[]; currentIndex=0; activeChallenge=null; pendingChallengePart=null;
    activeSessionTitle=''; testFinished=false; testFinishing=false; practiceMode=false;
    document.getElementById('testArea').style.display='none';
    document.getElementById('testArea').classList.remove('test-finished');
    document.getElementById('scoreBox').innerHTML='';
    document.getElementById('scoreBox').className='';
    document.getElementById('controls').style.display='';
    document.getElementById('mobileDock').hidden=true;
    playerProfile=defaultPlayerProfile(); playerProfile.name=name;
    savePlayerProfile(); renderMainMenu(); renderChallengeScreen();
    if(!document.getElementById('profileScreen').hidden) renderProfileScreen();
    showAppScreen('mainMenu');
    return 'Perfil reiniciado. Las opciones de la aplicación se mantienen.';
  }
});

// Inicializar selectores, preferencias locales y menú inicial.
initSelects();
updateSelectionControls();
applyPlayerSettings();
registerDailyVisit();
showAppScreen('mainMenu');
showDailyEntry();
