let quizData = [];
let current = 0;
let score1 = 0;
let score2 = 0;
let currentPlayer = 1; // 1 или 2
let answeredPlayers = 0;
let firstAnswered = false;
let firstCorrect = false;
let secondAnswered = false;
let secondCorrect = false;
let lockOptions = false;
let timeLeft = 15;
let timerInterval;

const frame = document.getElementById("frame");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const result = document.getElementById("result");
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const timerText = document.getElementById("timer");
const optionsDiv = document.getElementById("options");
const player1Span = document.getElementById("player1");
const player2Span = document.getElementById("player2");
const score1Span = document.getElementById("score1");
const score2Span = document.getElementById("score2");
const optionsDiv1 = document.getElementById("options1");
const optionsDiv2 = document.getElementById("options2");
const answerDiv1 = document.getElementById("answer1");
const answerDiv2 = document.getElementById("answer2");

let player1Answered = false;
let player2Answered = false;
let player1Choice = null;
let player2Choice = null;
let player1Correct = false;
let player2Correct = false;
let firstCorrectPlayer = null;

async function loadQuizData() {
  try {
    const response = await fetch("data/films.json");
    if (!response.ok) throw new Error("Ошибка загрузки данных");
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(item => item.image && item.answer)) {
      throw new Error("Некорректная структура данных");
    }
    quizData = data;
    if (quizData.length === 0) throw new Error("Нет данных для викторины");
    current = 0;
    result.style.display = "none";
    game.style.display = "block";
    loadQuestion();
  } catch (err) {
    game.style.display = "none";
    result.style.display = "block";
    scoreText.textContent = err.message;
  }
}

function updateActivePlayer() {
  player1Span.classList.toggle("active", currentPlayer === 1);
  player2Span.classList.toggle("active", currentPlayer === 2);
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
  updateActivePlayer();
}

function loadQuestion() {
  if (!quizData[current]) {
    game.style.display = "none";
    result.style.display = "block";
    let winner = '';
    if (score1 > score2) winner = 'Победил Игрок 1!';
    else if (score2 > score1) winner = 'Победил Игрок 2!';
    else winner = 'Ничья!';
    scoreText.textContent = `Игрок 1: ${score1} | Игрок 2: ${score2}  —  ${winner}`;
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
    btn1.onclick = () => handlePlayerChoice(1, btn1, option);
    optionsDiv1.appendChild(btn1);
    const btn2 = document.createElement("button");
    btn2.textContent = option;
    btn2.className = "option-btn";
    btn2.onclick = () => handlePlayerChoice(2, btn2, option);
    optionsDiv2.appendChild(btn2);
  });
  submitBtn && (submitBtn.style.display = "none");
  answerInput && (answerInput.style.display = "none");
  timeLeft = 15;
  timerText.textContent = `Осталось времени: ${timeLeft} секунд`;
  resetPlayersState();
  startTimer();
}

function handlePlayerChoice(player, btn, selected) {
  if ((player === 1 && player1Answered) || (player === 2 && player2Answered)) return;
  btn.disabled = true;
  const correctAnswer = quizData[current].answer;
  if (player === 1) {
    player1Answered = true;
    player1Choice = selected;
    player1Correct = selected === correctAnswer;
    if (player1Correct && !firstCorrectPlayer) firstCorrectPlayer = 1;
    Array.from(optionsDiv1.children).forEach(b => b.disabled = true);
    answerDiv1.textContent = `Ответ игрока 1: ${selected}`;
    answerDiv1.style.color = player1Correct ? '#388e3c' : '#d32f2f';
  } else {
    player2Answered = true;
    player2Choice = selected;
    player2Correct = selected === correctAnswer;
    if (player2Correct && !firstCorrectPlayer) firstCorrectPlayer = 2;
    Array.from(optionsDiv2.children).forEach(b => b.disabled = true);
    answerDiv2.textContent = `Ответ игрока 2: ${selected}`;
    answerDiv2.style.color = player2Correct ? '#388e3c' : '#d32f2f';
  }
  // Если оба ответили или оба выбрали, показать результат
  if (player1Answered && player2Answered) {
    clearInterval(timerInterval);
    showRoundResult();
  }
}

function showRoundResult() {
  const correctAnswer = quizData[current].answer;
  // Подсветка правильных/неправильных
  Array.from(optionsDiv1.children).forEach(b => {
    if (b.textContent === correctAnswer) b.style.background = "#c8e6c9";
    else if (player1Choice && b.textContent === player1Choice && !player1Correct) b.style.background = "#ffcdd2";
  });
  Array.from(optionsDiv2.children).forEach(b => {
    if (b.textContent === correctAnswer) b.style.background = "#c8e6c9";
    else if (player2Choice && b.textContent === player2Choice && !player2Correct) b.style.background = "#ffcdd2";
  });
  // Баллы
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
  feedback.style.color = "#333";
  nextBtn.style.display = "inline-block";
  // После показа результата фиксируем правильные цвета
  answerDiv1.style.color = player1Correct ? '#388e3c' : '#d32f2f';
  answerDiv2.style.color = player2Correct ? '#388e3c' : '#d32f2f';
}

function startTimer() {
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
  // Если кто-то не ответил — считаем как "неправильно"
  if (!player1Answered) player1Answered = true;
  if (!player2Answered) player2Answered = true;
  showRoundResult();
}

nextBtn.addEventListener("click", () => {
  current++;
  if (current < quizData.length) {
    loadQuestion();
  } else {
    game.style.display = "none";
    result.style.display = "block";
    let winner = '';
    if (score1 > score2) winner = 'Победил Игрок 1!';
    else if (score2 > score1) winner = 'Победил Игрок 2!';
    else winner = 'Ничья!';
    scoreText.textContent = `Игрок 1: ${score1} | Игрок 2: ${score2}  —  ${winner}`;
  }
});

// Сброс состояния при повторной игре
if (document.querySelector("#result button")) {
  document.querySelector("#result button").addEventListener("click", () => {
    current = 0;
    score1 = 0;
    score2 = 0;
    timeLeft = 15;
    loadQuizData();
  });
}

loadQuizData();
