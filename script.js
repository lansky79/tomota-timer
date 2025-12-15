const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const historyList = document.getElementById('history-list');

const USER = 'ethan';
let timer;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isPaused = true;
let isWorkTime = true;

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (isPaused) {
        isPaused = false;
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        taskInput.disabled = true;

        timer = setInterval(() => {
            if (!isPaused) {
                timeLeft--;
                updateTimerDisplay();

                if (timeLeft < 0) {
                    clearInterval(timer);
                    if (isWorkTime) {
                        saveTask();
                        alert('休息一下！');
                        isWorkTime = false;
                        timeLeft = 5 * 60; // 5 minutes break
                    } else {
                        alert('休息结束，开始工作！');
                        isWorkTime = true;
                        timeLeft = 25 * 60; // 25 minutes work
                    }
                    updateTimerDisplay();
                    isPaused = true;
                    startBtn.textContent = '开始';
                    startBtn.style.display = 'inline-block';
                    pauseBtn.style.display = 'none';
                    taskInput.disabled = false;
                }
            }
        }, 1000);
    }
}

function pauseTimer() {
    isPaused = true;
    startBtn.textContent = '继续';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.disabled = false;
}

function resetTimer() {
    clearInterval(timer);
    isPaused = true;
    isWorkTime = true;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    startBtn.textContent = '开始';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.value = '';
    taskInput.disabled = false;
}

function saveTask() {
    const task = taskInput.value || '未命名任务';
    const history = getHistory();
    const newRecord = {
        user: USER,
        task: task,
        date: new Date().toLocaleString()
    };
    history.push(newRecord);
    localStorage.setItem('pomodoroHistory', JSON.stringify(history));
    loadHistory();
}

function getHistory() {
    const history = localStorage.getItem('pomodoroHistory');
    return history ? JSON.parse(history) : [];
}

function loadHistory() {
    const history = getHistory().filter(record => record.user === USER);
    historyList.innerHTML = '';
    history.forEach(record => {
        const li = document.createElement('li');
        li.textContent = `${record.date} - ${record.task}`;
        historyList.appendChild(li);
    });
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Initial load
updateTimerDisplay();
loadHistory();
