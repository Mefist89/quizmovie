let quizData = [];
let current = 0;
let score1 = 0;
let score2 = 0;
let player1Answered = false;
let player2Answered = false;
let player1Choice = null;
let player2Choice = null;
let player1Correct = false;
let player2Correct = false;
let firstCorrectPlayer = null;
let timeLeft = 15;
let timerInterval;
let ws;
let playerId;
let roomId;

const frame = document.getElementById("frame");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");
const result = document.getElementById("result");
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const timerText = document.getElementById("timer");
const player1Span = document.getElementById("player1");
const player2Span = document.getElementById("player2");
const score1Span = document.getElementById("score1");
const score2Span = document.getElementById("score2");
const optionsDiv1 = document.getElementById("options1");
const optionsDiv2 = document.getElementById("options2");
const answerDiv1 = document.getElementById("answer1");
const answerDiv2 = document.getElementById("answer2");

function connectWebSocket() {
  ws = new WebSocket('ws://' + window.location.hostname + ':3000');

  ws.onopen = () => {
    roomId = new URLSearchParams(window.location.search).get('room') || Math.random().toString(36).substring(7);
    if (!window.location.search) {
      window.history.pushState({}, '', `?room=${roomId}`);
    }
    ws.send(JSON.stringify({ type: 'join', roomId }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'joined':
        playerId = data.playerId;
        if (playerId === 1) {
          document.querySelector('.player-section-2').style.opacity = '0.5';
        } else {
          document.querySelector('.player-section-1').style.opacity = '0.5';
        }
        break;

      case 'start':
        loadQuizData();
        break;

      case 'playerChoice':
        handleRemotePlayerChoice(data.playerId, data.choice);
        break;

      case 'playerLeft':
        alert('Второй игрок покинул игру');
        location.reload();
        break;

      case 'error':
        alert(data.message);
        break;
    }
  };

  ws.onclose = () => {
    alert('Соединение потеряно. Перезагрузите страницу.');
  };
}

function handleRemotePlayerChoice(remotePlayerId, choice) {
  const btn = Array.from(remotePlayerId === 1 ? optionsDiv1 : optionsDiv2.children)
    .find(b => b.textContent === choice);
  if (btn) {
    handlePlayerChoice(remotePlayerId, btn, choice);
  }
}

async function loadQuizData() {
  try {
    const response = await fetch("data/films.json");
    if (!response.ok) throw new Error("Ошибка загрузки данных");
    const data = await response.json();
    quizData = data;
    current = 0;
    result.style.display = "none";
    game.style.display = "block";
    loadQuestion();
  } catch (err) {
    console.error("Error loading quiz data:", err);
    game.style.display = "none";
    result.style.display = "block";
    scoreText.textContent = "Ошибка загрузки данных";
  }
}

function resetPlayersState() {
  player1Answered = false;
  player2Answered = false;
  player1Choice = null;
  player2Choice = null;
  player1Correct = false;
  player2Correct = false;
  firstCorrectPlayer = null;
  answerDiv1.textContent = '';
  answerDiv2.textContent = '';
}

function loadQuestion() {
  if (!quizData[current]) {
    endGame();
    return;
  }

  frame.src = quizData[current].image;
  feedback.textContent = "";
  nextBtn.style.display = "none";
  optionsDiv1.innerHTML = "";
  optionsDiv2.innerHTML = "";

  quizData[current].options.forEach(option => {
    const btn1 = document.createElement("button");
    btn1.textContent = option;
    btn1.className = "option-btn";
    btn1.onclick = () => {
      if (playerId === 1) {
        handlePlayerChoice(1, btn1, option);
        ws.send(JSON.stringify({ type: 'choice', playerId: 1, choice: option }));
      }
    };
    optionsDiv1.appendChild(btn1);

    const btn2 = document.createElement("button");
    btn2.textContent = option;
    btn2.className = "option-btn";
    btn2.onclick = () => {
      if (playerId === 2) {
        handlePlayerChoice(2, btn2, option);
        ws.send(JSON.stringify({ type: 'choice', playerId: 2, choice: option }));
      }
    };
    optionsDiv2.appendChild(btn2);
  });

  resetPlayersState();
  startTimer();
}

// Остальные функции остаются без изменений
function handlePlayerChoice(player, btn, selected) {
  if ((player === 1 && player1Answered) || (player === 2 && player2Answered)) return;

  const correctAnswer = quizData[current].answer;
  const optionsDiv = player === 1 ? optionsDiv1 : optionsDiv2;
  const answerDiv = player === 1 ? answerDiv1 : answerDiv2;

  if (player === 1) {
    player1Answered = true;
    player1Choice = selected;
    player1Correct = selected === correctAnswer;
    if (player1Correct && !firstCorrectPlayer) firstCorrectPlayer = 1;
  } else {
    player2Answered = true;
    player2Choice = selected;
    player2Correct = selected === correctAnswer;
    if (player2Correct && !firstCorrectPlayer) firstCorrectPlayer = 2;
  }

  Array.from(optionsDiv.children).forEach(b => b.disabled = true);
  answerDiv.textContent = `Ответ игрока ${player}: ${selected}`;
  answerDiv.style.color = (player === 1 ? player1Correct : player2Correct) ? '#388e3c' : '#d32f2f';

  if (player1Answered && player2Answered) {
    clearInterval(timerInterval);
    showRoundResult();
  }
}

function showRoundResult() {
  const correctAnswer = quizData[current].answer;

  [optionsDiv1, optionsDiv2].forEach((div, index) => {
    Array.from(div.children).forEach(btn => {
      if (btn.textContent === correctAnswer) {
        btn.style.background = "#c8e6c9";
      } else if (
        (index === 0 && btn.textContent === player1Choice && !player1Correct) ||
        (index === 1 && btn.textContent === player2Choice && !player2Correct)
      ) {
        btn.style.background = "#ffcdd2";
      }
    });
  });

  let msg = "";
  if (player1Correct && player2Correct) {
    if (firstCorrectPlayer === 1) {
      score1 += 3;
      score2 += 1;
      msg = "Игрок 1 — +3, Игрок 2 — +1";
    } else {
      score2 += 3;
      score1 += 1;
      msg = "Игрок 2 — +3, Игрок 1 — +1";
    }
  } else if (player1Correct) {
    score1 += 3;
    msg = "Игрок 1 — +3";
  } else if (player2Correct) {
    score2 += 3;
    msg = "Игрок 2 — +3";
  } else {
    msg = "Никто не угадал!";
  }

  score1Span.textContent = score1;
  score2Span.textContent = score2;
  feedback.textContent = msg;
  nextBtn.style.display = "inline-block";
}

function startTimer() {
  timeLeft = 15;
  timerText.textContent = `Осталось времени: ${timeLeft} секунд`;
  clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerText.textContent = `Осталось времени: ${timeLeft} секунд`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function handleTimeout() {
  if (!player1Answered) {
    player1Answered = true;
    answerDiv1.textContent = "Время вышло!";
    answerDiv1.style.color = "#d32f2f";
  }
  if (!player2Answered) {
    player2Answered = true;
    answerDiv2.textContent = "Время вышло!";
    answerDiv2.style.color = "#d32f2f";
  }
  showRoundResult();
}

function endGame() {
  game.style.display = "none";
  result.style.display = "block";
  let winner = '';
  if (score1 > score2) winner = 'Победил Игрок 1!';
  else if (score2 > score1) winner = 'Победил Игрок 2!';
  else winner = 'Ничья!';
  scoreText.textContent = `Игрок 1: ${score1} | Игрок 2: ${score2} — ${winner}`;
}

nextBtn.addEventListener("click", () => {
  current++;
  loadQuestion();
});

document.querySelector("#result button").addEventListener("click", () => {
  current = 0;
  score1 = 0;
  score2 = 0;
  loadQuizData();
});

connectWebSocket();