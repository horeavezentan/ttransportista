let activeQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let practiceMode = false;
let streakToastTimer = null;
let screenMoodTimer = null;
let answerEffectTimer = null;
let activeSessionTitle = '';
let testFinished = false;

const PROFILE_STORAGE_KEY = 'transportista_player_profile_v1';
const SETTINGS_STORAGE_KEY = 'transportista_player_settings_v1';
const APP_SCREENS = ['mainMenu', 'setupScreen', 'optionsScreen', 'profileScreen', 'creditsScreen'];

function defaultPlayerProfile() {
  return {
    name: 'Jugador',
    testsCompleted: 0,
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestStreak: 0,
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
      bestStreak: Math.max(0, Number(parsed.bestStreak) || 0),
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 40) : []
    };
  } catch (error) {
    console.warn('No se pudo leer el perfil local:', error);
    return defaultPlayerProfile();
  }
}

function defaultPlayerSettings() {
  return { effectsEnabled: true, fireIntensity: 'apocalipsis', reducedMotion: false };
}

function loadPlayerSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultPlayerSettings();
    const parsed = JSON.parse(raw) || {};
    return {
      effectsEnabled: parsed.effectsEnabled !== false,
      fireIntensity: ['fuerte', 'inferno', 'apocalipsis'].indexOf(parsed.fireIntensity) !== -1 ? parsed.fireIntensity : 'apocalipsis',
      reducedMotion: parsed.reducedMotion === true
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
  if (effects) effects.checked = !!playerSettings.effectsEnabled;
  if (intensity) intensity.value = playerSettings.fireIntensity || 'apocalipsis';
  if (reduced) reduced.checked = !!playerSettings.reducedMotion;
}

function showAppScreen(screenId) {
  APP_SCREENS.forEach(function(id) {
    const screen = document.getElementById(id);
    if (screen) screen.hidden = id !== screenId;
  });
  document.getElementById('mobileDock').hidden = screenId !== 'setupScreen' || !activeQuestions.length;
  if (screenId === 'mainMenu') renderMainMenu();
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

function getSessionTitle() {
  const mode = document.getElementById('modeSelect').value;
  const type = currentTestType() === 'supuestos' ? 'Supuestos prácticos' : 'Preguntas tipo test';
  const count = activeQuestions.length;
  if (mode === 'topic') {
    const labels = currentTestType() === 'supuestos' ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;
    const topic = document.getElementById('topicSelect').value;
    return count + ' preguntas · Subtema ' + (labels[topic] || topic);
  }
  if (mode === 'block') {
    const labels = currentTestType() === 'supuestos' ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
    const block = document.getElementById('blockSelect').value;
    const blockLabel = labels[block] || block;
    return count + ' preguntas · ' + (/^bloque\b/i.test(blockLabel) ? blockLabel : 'Bloque ' + blockLabel);
  }
  return count + ' preguntas · ' + type;
}

function renderMainMenu() {
  document.getElementById('menuPlayerName').textContent = playerProfile.name || 'Jugador';
  document.getElementById('menuPlayerSummary').textContent = playerProfile.testsCompleted
    ? playerProfile.testsCompleted + ' tests completados · ' + playerProfile.totalQuestionsAnswered + ' preguntas contestadas'
    : 'Todavía no has completado ningún test.';
  document.getElementById('menuBestStreak').textContent = playerProfile.bestStreak || 0;
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

function saveCompletedTest(result) {
  if (testFinished) return;
  testFinished = true;
  const answered = result.correct + result.wrong;
  const accuracyPct = answered ? Math.round((result.correct / answered) * 100) : 0;
  const bestStreak = calculateBestStreak(activeQuestions, userAnswers);
  const record = {
    date: new Date().toISOString(),
    title: activeSessionTitle || (activeQuestions.length + ' preguntas · Test'),
    type: currentTestType(),
    correctionMode: practiceMode ? 'Práctica' : 'Examen',
    totalQuestions: activeQuestions.length,
    answered: answered,
    correct: result.correct,
    wrong: result.wrong,
    blank: result.blank,
    accuracyPct: accuracyPct,
    score: result.score,
    scorePct: result.scorePct,
    bestStreak: bestStreak
  };

  playerProfile.testsCompleted += 1;
  playerProfile.totalQuestionsAnswered += answered;
  playerProfile.totalCorrect += result.correct;
  playerProfile.totalWrong += result.wrong;
  playerProfile.bestStreak = Math.max(playerProfile.bestStreak, bestStreak);
  playerProfile.history.unshift(record);
  playerProfile.history = playerProfile.history.slice(0, 40);
  savePlayerProfile();
}

function currentTestType() {
  const el = document.getElementById('testTypeSelect');
  return el ? el.value : 'objetivas';
}

function initSelects() {
  const type = currentTestType();
  const blockSelect = document.getElementById('blockSelect');
  const topicSelect = document.getElementById('topicSelect');

  const srcLabels = (type === 'supuestos') ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
  const subLabels = (type === 'supuestos') ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;
  const basePool = (type === 'supuestos') ? ALL_SUPUESTOS : ALL_QUESTIONS;

  blockSelect.innerHTML = '';
  Object.keys(srcLabels).forEach(function(key) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = srcLabels[key];
    blockSelect.appendChild(opt);
  });

  topicSelect.innerHTML = '';
  Object.keys(subLabels).sort().forEach(function(key) {
    const count = basePool.filter(function(q) { return q.topic === key; }).length;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = subLabels[key] + ' (' + count + ' preg.)';
    topicSelect.appendChild(opt);
  });
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
  resetScreenMood();

  const basePool = (type === 'supuestos') ? ALL_SUPUESTOS : ALL_QUESTIONS;
  let pool = basePool;
  if (mode === 'block') {
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
  const selectedIdx = indices.slice(0, n);
  activeQuestions = selectedIdx.map(function(i) { return pool[i]; });
  activeSessionTitle = getSessionTitle();
  userAnswers = new Array(activeQuestions.length).fill(null);
  currentIndex = 0;

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
  screenMoodTimer = null;
  answerEffectTimer = null;
  document.body.classList.remove('heat-level-1', 'heat-level-2', 'heat-level-3', 'heat-level-4', 'heat-level-5', 'heat-level-6', 'heat-level-7', 'freeze-hit');
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
  // Primero se percibe claramente el verde/rojo; después llega fuego o hielo.
  answerEffectTimer = window.setTimeout(function() {
    answerEffectTimer = null;
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

  const blockLabel = srcLabels[q.source] || q.source;
  const topicLabel = subLabels[q.topic] || q.topic;
  qMeta.textContent = 'Código ' + q.code + ' · ' + blockLabel + ' · ' + topicLabel;
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
            const heat = getHeatLevel(streak);
            setHeatMood(streak);
            spawnFlames(14 + heat * 7, heat);
            spawnEmbers(Math.min(58, 12 + streak * 3 + heat * 4));
            if (isStreakMilestone(streak)) showStreakToast(streak);
          } else {
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

  normaText.textContent = q.norma ? ('Norma de referencia: ' + q.norma) : '';
  normaText.style.display = q.norma ? 'inline-flex' : 'none';
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
  title.textContent = 'Pregunta ' + item.idx + ' · Código ' + (q.code || '—');
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
  resetScreenMood();
  activeQuestions = [];
  userAnswers = [];
  currentIndex = 0;
  activeSessionTitle = '';
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
  if (!activeQuestions.length || testFinished) return;

  let correct = 0;
  let wrong = 0;
  let blank = 0;
  const details = [];

  activeQuestions.forEach(function(q, idx) {
    const user = userAnswers[idx];
    if (!user) {
      blank++;
      details.push({ idx: idx + 1, q: q, user: null });
      return;
    }

    if (user === q.correct) {
      correct++;
    } else {
      wrong++;
      details.push({ idx: idx + 1, q: q, user: user });
    }
  });

  const total = activeQuestions.length;
  const maxPoints = total;
  const score = correct - wrong / 3;
  const scorePct = Math.round((score / maxPoints) * 100);
  const passed = score >= maxPoints * 0.5;
  saveCompletedTest({ correct: correct, wrong: wrong, blank: blank, score: score, scorePct: scorePct });

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

  document.querySelector('.controls').style.display = 'flex';
  document.getElementById('mobileDock').hidden = true;
  document.getElementById('testArea').classList.add('test-finished');

  // En modo examen, la corrección global también muestra primero el color
  // del resultado y después activa el efecto correspondiente.
  resetScreenMood();
  const resultIsPerfect = wrong === 0 && blank === 0;
  const outcomeClass = resultIsPerfect ? 'result-flash-good' : 'result-flash-bad';
  document.body.classList.remove('result-flash-good', 'result-flash-bad');
  void document.body.offsetWidth;
  document.body.classList.add(outcomeClass);
  window.setTimeout(function() {
    document.body.classList.remove(outcomeClass);
    if (!practiceMode && !resultIsPerfect) {
      triggerFreezeEffect('CORRECCIÓN FINALIZADA · ¡LLEGA EL HIELO!');
    } else if (resultIsPerfect) {
      setHeatMood(Math.max(2, calculateBestStreak(activeQuestions, userAnswers)));
      spawnFlames(46, Math.max(2, calculateBestStreak(activeQuestions, userAnswers)));
      spawnEmbers(60);
    } else if (wrong > 0) {
      triggerFreezeEffect('CORRECCIÓN FINALIZADA · ¡LLEGA EL HIELO!');
    }
  }, 600);

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

document.getElementById('modeSelect').addEventListener('change', function(e) {
  const mode = e.target.value;
  document.getElementById('blockGroup').style.display = mode === 'block' ? 'flex' : 'none';
  document.getElementById('topicGroup').style.display = mode === 'topic' ? 'flex' : 'none';
});

document.getElementById('testTypeSelect').addEventListener('change', initSelects);

// Atajos de teclado para moverse por el test sin interferir con los campos.
document.addEventListener('keydown', function(event) {
  const testArea = document.getElementById('testArea');
  if (testArea.style.display === 'none' || !activeQuestions.length) return;
  if (event.target && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].indexOf(event.target.tagName) !== -1) return;

  if (event.key === 'ArrowLeft') changeQuestion(-1);
  if (event.key === 'ArrowRight') changeQuestion(1);
});

// Navegación del menú principal.
document.getElementById('homeBtn').addEventListener('click', returnToMenu);
document.getElementById('menuStartBtn').addEventListener('click', openSetupScreen);
document.getElementById('menuOptionsBtn').addEventListener('click', function() { showAppScreen('optionsScreen'); });
document.getElementById('menuProfileBtn').addEventListener('click', function() { showAppScreen('profileScreen'); });
document.getElementById('menuCreditsBtn').addEventListener('click', function() { showAppScreen('creditsScreen'); });
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

document.getElementById('saveOptionsBtn').addEventListener('click', function() {
  playerSettings.effectsEnabled = document.getElementById('effectsEnabled').checked;
  playerSettings.fireIntensity = document.getElementById('fireIntensitySelect').value;
  playerSettings.reducedMotion = document.getElementById('reducedMotionToggle').checked;
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

// Inicializar selectores, preferencias locales y menú inicial.
initSelects();
applyPlayerSettings();
showAppScreen('mainMenu');
