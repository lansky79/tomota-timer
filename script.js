// -------------------------------------------------------------------
// DOM Elements (Corrected)
// -------------------------------------------------------------------
const timerDisplay = document.getElementById('timer-display');
const motivationalText = document.getElementById('motivational-text');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const breakActivityIcon = document.getElementById('break-activity-icon');
const historyList = document.getElementById('history-list');
const usernameDisplay = document.getElementById('username-display');
const completedCountSpan = document.getElementById('completed-count');
const dailyGoalCountSpan = document.getElementById('daily-goal-count');
const goalProgressBar = document.getElementById('goal-progress-bar');
const timeProgressBar = document.getElementById('time-progress-bar');
const settingsIcon = document.getElementById('settings-icon');
const settingsModal = document.getElementById('settings-modal');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const workDurationInput = document.getElementById('work-duration');
const breakDurationInput = document.getElementById('break-duration');
const workTextInput = document.getElementById('work-text');
const breakTextInput = document.getElementById('break-text');
const birthDateInput = document.getElementById('birth-date-input');
const dailyGoalInput = document.getElementById('daily-goal-input');
const workEndSound = document.getElementById('work-end-sound');
const breakEndSound = document.getElementById('break-end-sound');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const importFileInput = document.getElementById('import-file');
const notificationElement = document.getElementById('notification');
const appContainer = document.getElementById('app-container');

// -------------------------------------------------------------------
// State Management
// -------------------------------------------------------------------
let state = {
    timerInterval: null,
    reminderTimeout: null,
    timerStartTime: null,
    totalDuration: null,
    pauseStartTime: null,
    timeLeft: 0,
    currentSessionActualStartTime: null,

    isWorkTime: true,
    awaitingBreakStart: false,
    
    history: { PC: [], Mobile: [] }, 
    settings: {
        workMinutes: 25,
        breakMinutes: 5,
        username: 'Ethan',
        birthDate: '1979-01-01',
        workText: "系统化的极致专注才能拿到结果",
        breakText: "身体是长期基础，放松身心和眼睛",
        dailyGoal: 8,
    },
    isSoundUnlocked: false,
    notificationPermission: 'default', 
};

// -------------------------------------------------------------------
// Notifications & Audio
// -------------------------------------------------------------------
function showNotification(message, duration = 3000) {
    notificationElement.textContent = message;
    notificationElement.classList.add('show');
    setTimeout(() => {
        notificationElement.classList.remove('show');
    }, duration);
}

function playSound(soundElement) {
    if (!soundElement || !state.isSoundUnlocked) return;
    soundElement.currentTime = 0;
    const promise = soundElement.play();
    if (promise !== undefined) {
        promise.catch(error => {
            console.error("声音播放失败:", error);
            showNotification("（一条消息：声音播放被浏览器阻止）", 2000);
        });
    }
}

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return;
    }
    
    if (Notification.permission === 'denied') {
        showNotification("通知权限已被拒绝，请在浏览器设置中手动开启。", 5000);
        state.notificationPermission = 'denied'; 
        return;
    }

    if (Notification.permission === 'granted') {
        state.notificationPermission = 'granted';
        return; 
    }

    if (Notification.permission === 'default') {
        showNotification("即将请求通知权限，请点击“允许”。", 3000);
        const permission = await Notification.requestPermission();
        state.notificationPermission = permission;
        if (permission === 'granted') {
            showNotification("通知权限已成功开启！", 3000);
        } else {
            showNotification("通知权限被拒绝。", 4000);
        }
    }
}

function showSystemNotification(message) {
    if (state.notificationPermission === 'granted') {
        const options = {
            body: message,
            tag: 'pomodoro-timer', 
            renotify: true,
        };
        new Notification('番茄钟', options);
    }
}

// -------------------------------------------------------------------
// Utility Functions & Data Persistence
// -------------------------------------------------------------------
const getDeviceType = () => /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'PC';
const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const calculateAge = (birthDateString) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    const age = (today - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
    const truncatedAge = Math.floor(age * 10) / 10;
    return truncatedAge.toFixed(1);
};
const getWeek = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

function loadState() {
    console.log("loadState: Loading data from localStorage...");
    const savedData = localStorage.getItem('pomodoroData');
    if (savedData) {
        const data = JSON.parse(savedData);
        state.settings = { ...state.settings, ...data.settings };
        state.history.PC = (data.history && data.history.PC) || [];
        state.history.Mobile = (data.history && data.history.Mobile) || [];
        console.log("loadState: Data loaded successfully.", state);
    } else {
        console.log("loadState: No saved data found.");
    }
    workDurationInput.value = state.settings.workMinutes;
    breakDurationInput.value = state.settings.breakMinutes;
    workTextInput.value = state.settings.workText;
    breakTextInput.value = state.settings.breakText;
    birthDateInput.value = state.settings.birthDate;
    dailyGoalInput.value = state.settings.dailyGoal;
    if ("Notification" in window) {
        state.notificationPermission = Notification.permission;
    }
}

function saveData() {
    const dataToSave = { settings: state.settings, history: state.history };
    localStorage.setItem('pomodoroData', JSON.stringify(dataToSave));
    console.log("saveData: State saved to localStorage.", state);
}

function saveSettings() {
    state.settings.workMinutes = parseInt(workDurationInput.value, 10);
    state.settings.breakMinutes = parseInt(breakDurationInput.value, 10);
    state.settings.workText = workTextInput.value;
    state.settings.breakText = breakTextInput.value;
    state.settings.birthDate = birthDateInput.value;
    state.settings.dailyGoal = parseInt(dailyGoalInput.value, 10);
    saveData();
    showNotification('设置已保存！');
    resetTimer(true);
}

// -------------------------------------------------------------------
// Core Application Logic
// -------------------------------------------------------------------
function getCombinedHistory() {
    return [...(state.history.PC || []), ...(state.history.Mobile || [])];
}

function render() {
    document.body.classList.toggle('is-break-time', !state.isWorkTime && !state.awaitingBreakStart);
    
    // This calculation is now done inside tick(), render just displays
    timerDisplay.textContent = formatTime(Math.max(0, Math.floor(state.timeLeft)));

    document.title = state.timerInterval ? `(${formatTime(Math.max(0, Math.floor(state.timeLeft)))}) 番茄钟` : `番茄钟`;

    motivationalText.textContent = (state.isWorkTime && !state.awaitingBreakStart) ? state.settings.workText : state.settings.breakText;

    if (!state.isWorkTime && !state.awaitingBreakStart) {
        taskInput.classList.add('hidden');
        breakActivityIcon.classList.remove('hidden');
    } else {
        taskInput.classList.remove('hidden');
        breakActivityIcon.classList.add('hidden');
    }

    usernameDisplay.textContent = `${state.settings.username}, ${calculateAge(state.settings.birthDate)} yr`;
    pauseBtn.textContent = state.isWorkTime ? '暂停' : '休息';

    // Goal Display
    const currentDayWorkRecords = getCombinedHistory().filter(r => 
        r.user === state.settings.username && 
        r.type === 'work' && 
        r.isoDate.startsWith(new Date().toISOString().slice(0, 10))
    );
    completedCountSpan.textContent = currentDayWorkRecords.length;
    dailyGoalCountSpan.textContent = state.settings.dailyGoal;
    goalProgressBar.style.width = `${Math.min(100, (currentDayWorkRecords.length / state.settings.dailyGoal) * 100)}%`;

    // Time Progress Bar
    const totalCurrentSessionDuration = state.isWorkTime ? state.settings.workMinutes * 60 : state.settings.breakMinutes * 60;
    const progressPercentage = state.totalDuration ? ((state.totalDuration - state.timeLeft) / state.totalDuration) * 100 : 0;
    timeProgressBar.style.width = `${Math.min(100, progressPercentage)}%`;


    historyList.innerHTML = '';
    const sortedHistory = getCombinedHistory().filter(r => r.user === state.settings.username).sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    
    sortedHistory.forEach(record => {
        const li = document.createElement('li');
        li.dataset.id = record.id;
        li.dataset.device = record.device;
        const taskPrefix = record.type === 'work' ? '[工作]' : (record.type === 'break_start' ? '[休息]' : '[结束]');

        let durationText = '';
        if (record.type === 'work' && record.duration) {
            const actualDurationMinutes = Math.round(record.duration / 60);
            durationText = ` (${actualDurationMinutes}分钟)`;
        }
        
        li.innerHTML = `
            <div class="history-item-text">
                ${taskPrefix} ${record.task}${durationText}
                <span class="device">于 ${record.date} (来自: ${record.device})</span>
            </div>
            <div class="history-item-controls">
                <button class="edit-btn" title="编辑"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/></svg></button>
                <button class="delete-btn" title="删除"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></button>
            </div>`;
        historyList.appendChild(li);
    });
}

function tick() {
    if (!state.timerInterval) return;

    const elapsed = Date.now() - state.timerStartTime;
    state.timeLeft = Math.max(0, state.totalDuration * 1000 - elapsed) / 1000;
    
    render();

    if (state.timeLeft <= 0) {
        if (state.isWorkTime) {
            const actualDuration = Math.floor((Date.now() - state.currentSessionActualStartTime) / 1000);
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            playSound(workEndSound);
            addRecord('work', actualDuration);
            showSystemNotification('工作时间结束，点击任意处开始休息');
            showNotification('工作结束，点击任意处开始休息');
            taskInput.value = '';
            taskInput.placeholder = '活动活动，休息一下眼睛吧';
            state.awaitingBreakStart = true;
            state.reminderTimeout = setTimeout(() => { if (state.awaitingBreakStart) playSound(workEndSound); }, 10000);
        } else {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            playSound(breakEndSound);
            addRecord('break');
            showSystemNotification('休息时间结束，开始工作吧！');
            showNotification('休息结束，准备开始新的工作吧！');
            resetTimer(true);
        }
    }
}

function runTimer() {
    if (state.timerInterval) return;

    if (!state.timerStartTime) { 
        state.timerStartTime = Date.now();
        if (state.isWorkTime) {
            state.currentSessionActualStartTime = Date.now();
        }
    } else { 
        const pausedDuration = Date.now() - state.pauseStartTime;
        state.timerStartTime += pausedDuration;
    }

    if (!state.totalDuration) {
        state.totalDuration = state.isWorkTime ? state.settings.workMinutes * 60 : state.settings.breakMinutes * 60;
    }
    
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    taskInput.disabled = true;
    state.timerInterval = setInterval(tick, 1000);
    render();
}

function startTimer() {
    requestNotificationPermission();
    if (!state.isSoundUnlocked) {
        workEndSound.muted = true; breakEndSound.muted = true;
        workEndSound.play().then(() => {
            workEndSound.pause(); workEndSound.currentTime = 0; workEndSound.muted = false;
            breakEndSound.play().then(() => {
                breakEndSound.pause(); breakEndSound.currentTime = 0; breakEndSound.muted = false;
                state.isSoundUnlocked = true;
            }).catch(e => console.error("Sound unlock failed:", e));
        }).catch(e => console.error("Sound unlock failed:", e));
    }
    runTimer();
}

function handleScreenClickToStartBreak() {
    if (!state.awaitingBreakStart) return;
    state.awaitingBreakStart = false;
    clearTimeout(state.reminderTimeout);
    
    addRecord('break_start'); 

    state.isWorkTime = false;
    state.totalDuration = state.settings.breakMinutes * 60;
    state.timerStartTime = Date.now();
    state.currentSessionActualStartTime = null; 
    
    taskInput.placeholder = '您现在在做什么？';
    render();
    runTimer();
}

function pauseTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.pauseStartTime = Date.now();
    startBtn.textContent = '继续';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.disabled = false;
    render();
}

function resetTimer(isHardReset = false) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    clearTimeout(state.reminderTimeout);
    state.awaitingBreakStart = false;
    
    state.isWorkTime = true;
    state.totalDuration = state.settings.workMinutes * 60;
    state.timeLeft = state.totalDuration;
    state.timerStartTime = null;
    state.pauseStartTime = null;
    state.currentSessionActualStartTime = null;

    document.title = `番茄钟`;
    startBtn.textContent = '开始';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.disabled = false;
    taskInput.placeholder = '您现在在做什么？';
    if (isHardReset) taskInput.value = '';
    
    render();
}

function addRecord(type, duration = null) {
    const now = new Date();
    const device = getDeviceType();
    let task;
    if (type === 'work') {
        task = taskInput.value.trim() || '未命名任务';
    } else if (type === 'break_start') {
        task = '开始休息';
    } else if (type === 'break') {
        task = '结束休息';
    }
    
    const newRecord = {
        id: now.toISOString() + '-' + Math.random().toString(36).substr(2, 9),
        isoDate: now.toISOString(),
        date: now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        task, type, user: state.settings.username, device,
        duration: type === 'work' ? duration : null,
    };
    if (!state.history[device]) state.history[device] = [];
    state.history[device].push(newRecord);

    if (type === 'work') {
        state.currentSessionActualStartTime = null;
    }
    
    saveData();
    render();
}

function handleHistoryClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    const li = e.target.closest('li');
    const recordId = li.dataset.id;
    const device = li.dataset.device;

    if (!recordId || !device || !state.history[device]) return;

    if (button.classList.contains('delete-btn')) {
        if (confirm('您确定要删除这条记录吗？')) {
            state.history[device] = state.history[device].filter(r => r.id !== recordId);
            saveData();
            render();
        }
    }
    if (button.classList.contains('edit-btn')) {
        const recordToEdit = state.history[device].find(r => r.id === recordId);
        if(recordToEdit) {
            const newTask = prompt('请输入新的任务内容：', recordToEdit.task);
            if (newTask !== null && newTask.trim() !== '') {
                recordToEdit.task = newTask.trim();
                saveData();
                render();
            }
        }
    }
}

function exportData() {
    const dataToSave = { settings: state.settings, history: state.history };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.settings.username}_history.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importData() {
    console.log("importData: Starting import process...");
    const file = importFileInput.files[0];
    if (!file) { showNotification('请选择一个文件！'); return; }
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log("importData: File loaded, attempting to parse JSON...");
        try {
            const importedData = JSON.parse(e.target.result);
            console.log("importData: JSON parsed successfully.", importedData);
            
            if (!importedData || typeof importedData !== 'object' || !importedData.settings || typeof importedData.history !== 'object' || !Array.isArray(importedData.history.PC) || !Array.isArray(importedData.history.Mobile)) {
                throw new Error('导入文件格式不正确，缺少必要的设置或历史数据 (PC/Mobile)。');
            }
            
            state.settings = importedData.settings;
            state.history = importedData.history;
            
            saveData();
            console.log("importData: New state saved to localStorage.");
            localStorage.setItem('importStatus', 'success');
            location.reload(); 
        } catch (error) {
            console.error("importData: Error during import process:", error);
            showNotification(`导入失败！${error.message || '文件内容解析失败。'}`);
        } finally {
            importFileInput.value = '';
        }
    };
    
    reader.onerror = (error) => {
        console.error("importData: Error reading file:", error);
        showNotification("导入失败！无法读取文件。");
        importFileInput.value = '';
    };

    reader.readAsText(file);
}

function clearCache() {
    if (confirm('您确定要清除所有缓存数据吗？这包括所有设置和历史记录。此操作不可撤销，但不会影响您已导出的文件。')) {
        state.history = { PC: [], Mobile: [] }; 
        state.settings = { 
            workMinutes: 25,
            breakMinutes: 5,
            username: 'Ethan',
            birthDate: '1979-01-01',
            workText: "系统化的极致专注才能拿到结果",
            breakText: "身体是长期基础，放松身心和眼睛",
            dailyGoal: 8,
        };
        saveData();
        localStorage.setItem('importStatus', 'cleared');
        location.reload(); 
    }
}

function init() {
    const importStatus = localStorage.getItem('importStatus');
    if (importStatus === 'success') {
        showNotification('导入成功！数据已更新。');
    } else if (importStatus === 'cleared') {
        showNotification('所有缓存数据已清除。');
    }
    localStorage.removeItem('importStatus');

    loadState();
    resetTimer(true);
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', () => resetTimer(true));
    appContainer.addEventListener('click', handleScreenClickToStartBreak);
    settingsIcon.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettingsBtn.addEventListener('click', () => { saveSettings(); settingsModal.classList.add('hidden'); });
    historyList.addEventListener('click', handleHistoryClick);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
    clearCacheBtn.addEventListener('click', clearCache);

    if ("Notification" in window) {
        state.notificationPermission = Notification.permission;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && state.timerInterval) {
            console.log("Tab is visible again, forcing a tick.");
            tick();
        }
    });

    setInterval(() => {
        usernameDisplay.textContent = `${state.settings.username}, ${calculateAge(state.settings.birthDate)} yr`;
    }, 1000 * 60 * 60);
}

init();