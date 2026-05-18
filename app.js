let activeQuestions = [];
    let currentIndex = 0;
    let userAnswers = [];
    let practiceMode = false;

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

      let basePool = (type === 'supuestos') ? ALL_SUPUESTOS : ALL_QUESTIONS;
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

      const indices = Array.from({length: total}, function(_, i) { return i; });
      shuffle(indices);
      const selectedIdx = indices.slice(0, n);
      activeQuestions = selectedIdx.map(function(i) { return pool[i]; });
      userAnswers = new Array(activeQuestions.length).fill(null);
      currentIndex = 0;

      document.getElementById('testArea').style.display = 'block';
      document.getElementById('scoreBox').innerHTML = '';
      document.querySelector('.controls').style.display = 'none';
      renderQuestion();
    }

    function applyPracticeHighlight(q) {
      const optionsList = document.getElementById('optionsList');
      const lis = optionsList.querySelectorAll('li');
      lis.forEach(function(li) {
        li.classList.remove('opt-correct', 'opt-wrong');
      });

      const feedback = document.getElementById('feedbackText');
      const user = userAnswers[currentIndex];
      if (!practiceMode || !user) {
        feedback.textContent = '';
        return;
      }

      q.options.forEach(function(opt, idx) {
        if (opt.letter === q.correct) {
          lis[idx].classList.add('opt-correct');
        }
      });
      const selectedIndex = q.options.findIndex(function(o) { return o.letter === user; });
      if (user !== q.correct && selectedIndex >= 0) {
        lis[selectedIndex].classList.add('opt-wrong');
        feedback.textContent = 'Incorrecto. La correcta es ' + q.correct + ').';
      } else if (user === q.correct) {
        feedback.textContent = 'Correcto.';
      }
    }

    function renderQuestion() {
      const q = activeQuestions[currentIndex];
      const qMeta = document.getElementById('qMeta');
      const qText = document.getElementById('qText');
      const optionsList = document.getElementById('optionsList');
      const normaText = document.getElementById('normaText');
      const progressText = document.getElementById('progressText');
      const feedback = document.getElementById('feedbackText');
      const type = currentTestType();

      const srcLabels = (type === 'supuestos') ? SP_SOURCE_LABELS : PM_SOURCE_LABELS;
      const subLabels = (type === 'supuestos') ? SP_SUBTOPIC_LABELS : PM_SUBTOPIC_LABELS;

      const blockLabel = srcLabels[q.source] || q.source;
      const topicLabel = subLabels[q.topic] || q.topic;
      qMeta.textContent = 'Pregunta ' + (currentIndex + 1) + ' de ' + activeQuestions.length + ' · Código ' + q.code + ' · ' + blockLabel + ' · ' + topicLabel;
      qText.textContent = q.question;

      optionsList.innerHTML = '';
      q.options.forEach(function(opt) {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'option';
        input.value = opt.letter;
        if (userAnswers[currentIndex] === opt.letter) input.checked = true;
        input.addEventListener('change', function() {
          userAnswers[currentIndex] = opt.letter;
          if (!practiceMode) {
            feedback.textContent = '';
          }
          applyPracticeHighlight(q);
          var answeredNow = userAnswers.filter(function(x) { return x !== null; }).length;
          progressText.textContent = answeredNow + ' contestadas';
        });
        const span = document.createElement('span');
        span.textContent = opt.letter + ') ' + opt.text;
        label.appendChild(input);
        label.appendChild(span);
        li.appendChild(label);
        optionsList.appendChild(li);
      });

      normaText.textContent = q.norma ? ('Norma de referencia: ' + q.norma) : '';

      document.getElementById('prevBtn').disabled = currentIndex === 0;
      document.getElementById('nextBtn').disabled = currentIndex === activeQuestions.length - 1;
      var answered = userAnswers.filter(function(x) { return x !== null; }).length;
      progressText.textContent = answered + ' contestadas';

      feedback.textContent = '';
      applyPracticeHighlight(q);
    }

    function changeQuestion(delta) {
      const newIndex = currentIndex + delta;
      if (newIndex < 0 || newIndex >= activeQuestions.length) return;
      currentIndex = newIndex;
      renderQuestion();
    }

    function finishTest() {
      if (!activeQuestions.length) return;
      let correct = 0;
      let wrong = 0;
      let blank = 0;
      const details = [];

      activeQuestions.forEach(function(q, idx) {
        const user = userAnswers[idx];
        if (!user) {
          blank++;
          details.push({
            idx: idx + 1,
            code: q.code,
            correct: q.correct,
            user: '-',
            norma: q.norma || ''
          });
          return;
        }
        const isCorrect = user === q.correct;
        if (isCorrect) {
          correct++;
        } else {
          wrong++;
        }
        if (!isCorrect) {
          details.push({
            idx: idx + 1,
            code: q.code,
            correct: q.correct,
            user: user,
            norma: q.norma || ''
          });
        }
      });

      const total = activeQuestions.length;
      const maxPoints = total; // 1 punto por pregunta
      const score = correct - wrong / 3; // fallo resta 1/3
      const scorePct = Math.round((score / maxPoints) * 100);
      const passed = score >= maxPoints * 0.5; // al menos 50% de la puntuación máxima

      const box = document.getElementById('scoreBox');
      box.className = 'score ' + (passed ? '' : 'bad');

      const baseText = '<strong>Resultado:</strong> ' +
        score.toFixed(2) + ' / ' + maxPoints + ' puntos (' + scorePct + '%). ' +
        '[ Aciertos: ' + correct + ' · Fallos: ' + wrong + ' · En blanco: ' + blank + ' ] ' +
        (passed ? 'Has superado el 50% de la puntuación máxima. APTO.' : 'No alcanzas el 50% de la puntuación máxima. NO APTO.');

      box.innerHTML = baseText;

      if (details.length) {
        const rows = details.map(function(d) {
          return '<tr>' +
            '<td>' + d.idx + '</td>' +
            '<td>' + d.code + '</td>' +
            '<td>' + d.user + '</td>' +
            '<td>' + d.correct + '</td>' +
            '<td>' + d.norma + '</td>' +
          '</tr>';
        }).join('');
        const htmlDetails = '<div class="details">' +
          '<details open>' +
          '<summary>Ver preguntas no acertadas (' + details.length + ')</summary>' +
          '<table>' +
          '<thead><tr><th>#</th><th>Código</th><th>Tu resp.</th><th>Correcta</th><th>Norma</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '</table>' +
          '</details>' +
          '</div>';
        box.innerHTML += htmlDetails;
      } else {
        box.innerHTML += '<div class="details">Has respondido correctamente de forma que no hay ninguna pregunta mal ni en blanco.</div>';
      }

      // Volver a mostrar panel de control para configurar otro test
      document.querySelector('.controls').style.display = 'flex';
    }

    document.getElementById('startBtn').addEventListener('click', startTest);
    document.getElementById('prevBtn').addEventListener('click', function() { changeQuestion(-1); });
    document.getElementById('nextBtn').addEventListener('click', function() { changeQuestion(1); });
    document.getElementById('finishBtn').addEventListener('click', finishTest);

    document.getElementById('modeSelect').addEventListener('change', function(e) {
      const mode = e.target.value;
      document.getElementById('blockGroup').style.display = mode === 'block' ? 'flex' : 'none';
      document.getElementById('topicGroup').style.display = mode === 'topic' ? 'flex' : 'none';
    });

    document.getElementById('testTypeSelect').addEventListener('change', function() {
      initSelects();
    });

    // Inicializar selects al cargar
    initSelects();
