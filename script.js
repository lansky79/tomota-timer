// -------------------------------------------------------------------
// DOM Elements
// -------------------------------------------------------------------
const timerDisplay = document.getElementById('timer-display');
const motivationalText = document.getElementById('motivational-text');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const breakActivityIcon = document.getElementById('break-activity-icon'); // New DOM element
const historyList = document.getElementById('history-list');
const usernameDisplay = document.getElementById('username-display');
const todayCountSpan = document.getElementById('today-count');
const weekCountSpan = document.getElementById('week-count');
const monthCountSpan = document.getElementById('month-count');
const settingsIcon = document.getElementById('settings-icon');
const settingsModal = document.getElementById('settings-modal');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const workDurationInput = document.getElementById('work-duration');
const breakDurationInput = document.getElementById('break-duration');
const workTextInput = document.getElementById('work-text');
const breakTextInput = document.getElementById('break-text');
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
    timeLeft: 25 * 60,
    isWorkTime: true,
    awaitingBreakStart: false,
    history: { PC: [], Mobile: [] }, // New data structure
    settings: {
        workMinutes: 25,
        breakMinutes: 5,
        username: 'Ethan',
        birthDate: '1990-01-01',
        workText: "系统化的极致专注才能拿到结果",
        breakText: "身体是长期基础，放松身心和眼睛",
    },
    isSoundUnlocked: false,
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

// -------------------------------------------------------------------
// Utility Functions & Data Persistence
// -------------------------------------------------------------------
const getDeviceType = () => /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'PC';
const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const calculateAge = (birthDateString) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    const age = (today - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
    // Truncate to one decimal place instead of rounding
    const truncatedAge = Math.floor(age * 10) / 10;
    return truncatedAge.toFixed(1); // Use toFixed(1) just for formatting to ensure ".0"
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
        // Ensure history object has both keys even if loading older data
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
    console.log("render: Updating UI...");
    document.body.classList.toggle('is-break-time', !state.isWorkTime && !state.awaitingBreakStart);
    timerDisplay.textContent = formatTime(Math.max(0, state.timeLeft));

    let displayMotivationalText = (state.isWorkTime && !state.awaitingBreakStart) ? state.settings.workText : state.settings.breakText;
    motivationalText.textContent = displayMotivationalText;

    // Show/hide task input vs break activity icon
    if (!state.isWorkTime && !state.awaitingBreakStart) { // During actual break time
        taskInput.classList.add('hidden');
        breakActivityIcon.classList.remove('hidden');
    } else { // Work time or awaiting break start
        taskInput.classList.remove('hidden');
        breakActivityIcon.classList.add('hidden');
    }

    updateStats();
    usernameDisplay.textContent = `${state.settings.username}, ${calculateAge(state.settings.birthDate)} yr`;

    // Update pause button text
    pauseBtn.textContent = state.isWorkTime ? '暂停' : '休息';

    historyList.innerHTML = '';
    const combinedHistory = getCombinedHistory();
    const sortedHistory = combinedHistory.filter(r => r.user === state.settings.username).sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
    
    sortedHistory.forEach(record => {
        const li = document.createElement('li');
        li.dataset.id = record.id;
        li.dataset.device = record.device; // Store device for easier lookup
        const taskPrefix = record.type === 'work' ? '[工作]' : '[休息]';
        li.innerHTML = `
            <div class="history-item-text">
                ${taskPrefix} ${record.task}
                <span class="device">于 ${record.date} (来自: ${record.device})</span>
            </div>
            <div class="history-item-controls">
                <button class="edit-btn" title="编辑"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"/></svg></button>
                <button class="delete-btn" title="删除"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></button>
            </div>`;
        historyList.appendChild(li);
    });
    console.log("render: UI updated. Current state:", state);
}

function updateStats() {
    const now = new Date();
    const workHistory = getCombinedHistory().filter(r => r.user === state.settings.username && r.type === 'work');
    const todayString = now.toISOString().slice(0, 10);
    const currentWeek = `${now.getFullYear()}-${getWeek(now)}`;
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    todayCountSpan.textContent = workHistory.filter(r => r.isoDate.startsWith(todayString)).length;
    weekCountSpan.textContent = workHistory.filter(r => `${new Date(r.isoDate).getFullYear()}-${getWeek(new Date(r.isoDate))}` === currentWeek).length;
    monthCountSpan.textContent = workHistory.filter(r => `${new Date(r.isoDate).getFullYear()}-${new Date(r.isoDate).getMonth()}` === currentMonth).length;
}

function tick() {
    if (state.timeLeft < 0) return;
    state.timeLeft--;
    render();
    if (state.timeLeft < 0) {
        if (state.isWorkTime) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            playSound(workEndSound);
            addRecord('work');
            showNotification('工作结束，点击任意处开始休息');
            taskInput.value = '';
            taskInput.placeholder = '活动活动，休息一下眼睛吧';
            state.awaitingBreakStart = true;
            state.reminderTimeout = setTimeout(() => { if (state.awaitingBreakStart) playSound(workEndSound); }, 10000);
        } else {
            playSound(breakEndSound);
            addRecord('break');
            showNotification('休息结束，准备开始新的工作吧！');
            resetTimer(true);
        }
    }
}

function runTimer() {
    if (state.timerInterval) return;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    taskInput.disabled = true;
    state.timerInterval = setInterval(tick, 1000);
}

function startTimer() {
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
    state.isWorkTime = false;
    state.timeLeft = state.settings.breakMinutes * 60;
    taskInput.placeholder = '您现在在做什么？';
    render();
    runTimer();
}

function pauseTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    startBtn.textContent = '继续';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.disabled = false;
}

function resetTimer(isHardReset = false) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    clearTimeout(state.reminderTimeout);
    state.awaitingBreakStart = false;
    state.isWorkTime = true;
    state.timeLeft = state.settings.workMinutes * 60;
    startBtn.textContent = '开始';
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    taskInput.disabled = false;
    taskInput.placeholder = '您现在在做什么？';
    if (isHardReset) taskInput.value = '';
    render(); // Call render to update UI based on new state
}

function addRecord(type) {
    const now = new Date();
    const device = getDeviceType();
    let task = (type === 'work') ? (taskInput.value.trim() || '未命名任务') : '休息';
    const newRecord = {
        id: now.toISOString() + '-' + Math.random().toString(36).substr(2, 9),
        isoDate: now.toISOString(),
        date: now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        task, type, user: state.settings.username, device
    };
    if (!state.history[device]) state.history[device] = []; // Ensure array exists
    state.history[device].push(newRecord);
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
            
            // STRICT VALIDATION for the perfect format as user requested
            if (!importedData || typeof importedData !== 'object' || 
                !importedData.settings || typeof importedData.settings !== 'object' ||
                !importedData.history || typeof importedData.history !== 'object' ||
                !Array.isArray(importedData.history.PC) || !Array.isArray(importedData.history.Mobile)
            ) {
                throw new Error('导入文件格式不正确，缺少必要的设置或历史数据 (PC/Mobile)。');
            }
            
            // Perform a complete overwrite of settings and history
            state.settings = importedData.settings;
            state.history = importedData.history;
            
            saveData(); // Save this new, pristine state to localStorage
            console.log("importData: New state saved to localStorage.");
            
            // Trigger reload to ensure UI is perfectly consistent
            localStorage.setItem('importStatus', 'success');
            location.reload(); 

            console.log("importData: Full page reload triggered for UI refresh.");
        } catch (error) {
            console.error("importData: Error during import process:", error);
            showNotification(`导入失败！${error.message || '文件内容解析失败。'}`);
        } finally {
            importFileInput.value = ''; // Clear file input
        }
    };
    
    reader.onerror = (error) => {
        console.error("importData: Error reading file:", error);
        showNotification("导入失败！无法读取文件。");
        importFileInput.value = '';
    };

    reader.readAsText(file);
}

function clearCache() { // Renamed function
    if (confirm('您确定要清除所有缓存数据吗？这包括所有设置和历史记录。此操作不可撤销，但不会影响您已导出的文件。')) {
        // Reset history and settings to initial defaults
        state.history = { PC: [], Mobile: [] }; 
        state.settings = { 
            workMinutes: 25,
            breakMinutes: 5,
            username: 'Ethan',
            birthDate: '1990-01-01',
            workText: "系统化的极致专注才能拿到结果",
            breakText: "身体是长期基础，放松身心和眼睛",
        };
        saveData(); // Save the cleared state
        
        // After clearing, trigger a full reload to ensure UI is perfectly consistent
        localStorage.setItem('importStatus', 'cleared'); // Set flag for cleared message on reload
        location.reload(); 
        
        console.log("clearCache: All local data cleared. Page reload triggered.");
    }
}

function init() {
    // Check for import status after reload
    const importStatus = localStorage.getItem('importStatus');
    if (importStatus === 'success') {
        showNotification('导入成功！数据已更新。');
    } else if (importStatus === 'cleared') {
        showNotification('所有缓存数据已清除。');
    }
    localStorage.removeItem('importStatus'); // Clear the flag

    loadState();
    resetTimer(true);
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseBtn); // Updated this event listener from () => resetTimer(true) to pauseTimer
    resetBtn.addEventListener('click', () => resetTimer(true));
    appContainer.addEventListener('click', handleScreenClickToStartBreak);
    settingsIcon.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettingsBtn.addEventListener('click', () => { saveSettings(); settingsModal.classList.add('hidden'); });
    historyList.addEventListener('click', handleHistoryClick);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
    clearCacheBtn.addEventListener('click', clearCache); // Bind to new function

    setInterval(() => {
        usernameDisplay.textContent = `${state.settings.username}, ${calculateAge(state.settings.birthDate)} yr`;
    }, 1000 * 60 * 60);
}

init();
