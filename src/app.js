// Word Practice App using Pixi.js
import * as PIXI from 'pixi.js';
import { 
    createRaceScreen as createRaceScreenModule, 
    initRaceMode, 
    updateRacePositions, 
    handleRaceCompletion as handleRaceCompletionModule 
} from './race.js';
import { createButton } from './ui/Button.js';
import { GameDataManager } from './data/GameDataManager.js';
import { createTitleScreen, updateTitleScreenLayout } from './screens/TitleScreen.js';
import { createModeSelectScreen, updateModeSelectScreenLayout as updateModeSelectLayout } from './screens/ModeSelectScreen.js';
import { createLyricsScreen, updateLyricsWordDisplay, updateLyricsScreenLayout, createLyricsEndScreen, updateLyricsEndScreenLayout, LYRICS_WINDOW_SIZE } from './screens/LyricsScreen.js';
import { createEndScreen, updateEndScreenLayout } from './screens/EndScreen.js';
import { createOptionsScreen, updateOptionsScreenLayout } from './screens/OptionsScreen.js';
import {
    createHighScoreInputScreen,
    createHighScoreViewScreen,
    updateHighScoreInput as refreshHighScoreInput,
    updateHighScoreView as refreshHighScoreView
} from './screens/HighScoreScreen.js';
import { loadPracticeWords, loadHomeworkWords, loadLyricsLines, getPracticeWords, getHomeworkWords, getLyricsLines, prepareWords } from './core/WordManager.js';
import { FontManager } from './utils/FontManager.js';
import { CelebrationSystem } from './utils/CelebrationSystem.js';
import { layoutManager } from './utils/LayoutManager.js';
import { ButtonParticles } from './effects/ButtonParticles.js';
import { screenManager } from './core/ScreenManager.js';

// App state
let app;
let words = [];            // working word list for the current session
let currentWordsSource = null; // reference to the pool used (practice or homework)
let currentPlayMode = null;
let currentWordIndex = 0;
let currentScreen = 'title'; // 'title', 'modeSelect', 'practice', 'race', 'lines', 'end' …

// Lyrics mode state
let lyricsLines    = [];  // string[][] – each entry is one parsed CSV line
let currentLineIndex   = 0;
let currentWordInLine  = 0;

// Background elements
let backgroundGradient;

// UI containers
let titleScreen;
let modeSelectScreen;
let practiceScreen;
let raceScreen;
let lyricsScreen;
let lyricsEndScreen;
let endScreen;
let optionsScreen;
let highScoreInputScreen;
let highScoreViewScreen;

// Race screen container (implementation moved to race.js module)

// High score system
let pendingScore = null; // Store score waiting for initials input

// Practice screen elements
let wordText;
let nextButton;
let backButton;
let progressBarBg;
let progressBarFill;
let progressText;

// Cooldown for button presses (in milliseconds)
const BUTTON_COOLDOWN = 500; // 500ms cooldown
let lastNextTime = 0;
let lastBackTime = 0;
let canNavigate = true; // Navigation availability flag

// Game session tracking
let sessionStartTime = null;
let backButtonUses = 0;
let celebrationSystem;
let buttonParticles;
let lyricsButtonParticles;
let practiceWordStartTime = null;
let practiceWordDurations = [];
let practiceBacktrackTargetIndex = null;
let practiceBacktrackedWords = [];
let practiceTrackingSessionId = null;

// Game Data Manager for localStorage
// Initialize game data manager
const gameData = new GameDataManager('word-practice', 'Word Practice', 'Videogame Workshop LLC');

// Victory sound
let victorySound = null;

// High score input handling
let currentInitials = '';

// Submit high score with current initials
function submitHighScore() {
    if (!pendingScore) {
        console.log('⚠️ submitHighScore called but no pendingScore found');
        return;
    }
    
    const initials = currentInitials || 'AAA'; // Default if empty
    const rank = gameData.addHighScore(initials, pendingScore.time, pendingScore.wordsCount);
    
    console.log(`🏆 High score submitted: ${initials} - ${pendingScore.time}s (Rank #${rank})`);
    console.log(`📊 Is new best: ${pendingScore.isNewBest}`);
    
    // Store values before clearing pendingScore
    const wasNewBest = pendingScore.isNewBest;
    const scoreTime = pendingScore.time;
    const wordsCount = pendingScore.wordsCount;
    
    // Clear state immediately
    pendingScore = null;
    currentInitials = '';
    
    // Show celebration for every top score (not just new bests)
    console.log('🎉 Showing celebration for top score achievement');
    // Switch to practice screen for celebration
    showScreen('practice');
    
    // Use a longer delay to ensure screen transition is complete
    setTimeout(() => {
        console.log('🎊 Creating celebration...');
        let celebrationMessage;
        if (wordsCount === 1) {
            celebrationMessage = 'FIRST COMPLETION!';
        } else if (wasNewBest) {
            celebrationMessage = 'NEW BEST TIME!';
        } else {
            celebrationMessage = 'TOP SCORE!';
        }
        
        celebrationSystem.createCelebration(scoreTime, celebrationMessage, {
            onComplete: () => {
                console.log('✅ Going to high score screen after celebration');
                const newScoreInfo = { time: scoreTime, initials: initials, wordsCount: wordsCount };
                refreshHighScoreView(highScoreViewScreen, gameData, newScoreInfo);
                showScreen('highScoreView');
            }
        });
    }, 200);
}

// Reset all save data to defaults
function resetSaveData() {
    // Use GameDataManager's reset method
    gameData.resetData();
    
    // Force re-initialization to show the new data structure
    const newData = gameData.initData();
    
    console.log('✅ Save data reset complete. New data structure:', newData);
    console.log('📊 All stats, best times, and session history have been cleared.');
}

function resetPracticeTracking() {
    practiceWordStartTime = null;
    practiceWordDurations = [];
    practiceBacktrackTargetIndex = null;
    practiceBacktrackedWords = [];
    practiceTrackingSessionId = `practice_${Date.now()}`;
}

function startPracticeWordTiming() {
    if (currentScreen !== 'practice') {
        return;
    }
    practiceWordStartTime = Date.now();
}

function recordPracticeWordExit() {
    if (currentScreen !== 'practice' || practiceWordStartTime === null) {
        return 0;
    }

    const elapsedMs = Date.now() - practiceWordStartTime;
    const wordIndex = currentWordIndex;
    if (practiceWordDurations[wordIndex] === undefined) {
        practiceWordDurations[wordIndex] = 0;
    }
    practiceWordDurations[wordIndex] += elapsedMs;
    practiceWordStartTime = null;
    return elapsedMs;
}

function notePracticeBacktrackTarget() {
    if (currentScreen !== 'practice' || currentWordIndex <= 0) {
        practiceBacktrackTargetIndex = null;
        return;
    }
    practiceBacktrackTargetIndex = currentWordIndex;
}

function commitPracticeBacktrackIfNeeded() {
    if (currentScreen !== 'practice' || practiceBacktrackTargetIndex === null) {
        return;
    }

    if (practiceBacktrackTargetIndex === currentWordIndex) {
        const word = words[practiceBacktrackTargetIndex];
        if (word) {
            practiceBacktrackedWords.push({
                word,
                reason: 'backtracked'
            });
        }
        practiceBacktrackTargetIndex = null;
    }
}

function finalizePracticeTrickyTracking() {
    if (currentScreen !== 'practice') {
        return null;
    }

    recordPracticeWordExit();
    commitPracticeBacktrackIfNeeded();

    let slowestWordIndex = -1;
    let slowestWordDwellMs = -1;
    practiceWordDurations.forEach((dwellMs, index) => {
        if (typeof dwellMs === 'number' && dwellMs > slowestWordDwellMs) {
            slowestWordDwellMs = dwellMs;
            slowestWordIndex = index;
        }
    });

    const slowestWord = slowestWordIndex >= 0 ? words[slowestWordIndex] : null;
    return gameData.recordPracticeTrickyAnalytics({
        sessionId: practiceTrackingSessionId,
        sessionStartedAt: sessionStartTime,
        sessionEndedAt: new Date().toISOString(),
        slowestWord,
        slowestWordDwellMs: slowestWordDwellMs > 0 ? slowestWordDwellMs : 0,
        backtrackedWords: practiceBacktrackedWords.slice()
    });
}

function getTrickyWordsOverlayHtml(report) {
    const rows = report.words.map((record, index) => {
        const expiresInPlays = record.points && record.points.length > 0
            ? Math.max(0, Math.min(...record.points.map((point) => point.expiresAtPlay - report.playCount)))
            : 0;
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${record.word}</td>
                <td>${record.score}</td>
                <td>${record.slowestEvents || 0}</td>
                <td>${record.backtrackEvents || 0}</td>
                <td>${((record.totalDwellMs || 0) / 1000).toFixed(1)}</td>
                <td>${record.lastReason || ''}</td>
                <td>${expiresInPlays}</td>
            </tr>`;
    }).join('');

    return `
        <div style="background:#fff;border-radius:12px;padding:24px;max-width:900px;width:94%;max-height:85vh;overflow:auto;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
                <div>
                    <h2 style="margin:0 0 8px;font-family:Arial;font-size:22px;color:#222;">Tricky Word Report</h2>
                    <div style="font-family:Arial;font-size:14px;color:#666;line-height:1.5;">
                        <div>Plays tracked: ${report.playCount}</div>
                        <div>Active tricky words: ${report.activeWordCount}</div>
                        <div>Active points: ${report.summary.totalActivePoints}</div>
                        <div>Words with backtracks: ${report.summary.wordsWithBacktracks}</div>
                        <div>Words with slowest-word hits: ${report.summary.wordsWithSlowestHits}</div>
                    </div>
                </div>
                <button id="closeTrickyReportBtn" style="padding:8px 16px;border:none;border-radius:8px;background:#0066CC;color:#fff;cursor:pointer;font-size:14px;">Close</button>
            </div>
            <div style="margin-top:18px;overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-family:Courier New, monospace;font-size:13px;">
                    <thead>
                        <tr style="text-align:left;border-bottom:2px solid #ddd;color:#444;">
                            <th style="padding:8px 6px;">#</th>
                            <th style="padding:8px 6px;">Word</th>
                            <th style="padding:8px 6px;">Score</th>
                            <th style="padding:8px 6px;">Slowest</th>
                            <th style="padding:8px 6px;">Backtracked</th>
                            <th style="padding:8px 6px;">Dwell s</th>
                            <th style="padding:8px 6px;">Last Reason</th>
                            <th style="padding:8px 6px;">Expires In Plays</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="8" style="padding:16px 6px;color:#666;">No active tricky words yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function showTrickyWordsReport() {
    const report = gameData.getTrickyWordsReport();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;box-sizing:border-box;';
    overlay.innerHTML = getTrickyWordsOverlayHtml(report);

    const closeOverlay = () => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeOverlay();
        }
    });

    document.body.appendChild(overlay);
    const closeButton = overlay.querySelector('#closeTrickyReportBtn');
    if (closeButton) {
        closeButton.addEventListener('click', closeOverlay);
    }
}

function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

function exportRecords(format) {
    const exportData = gameData.getExportData();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
        downloadTextFile(
            `wordpractice-records-${stamp}.json`,
            JSON.stringify(exportData, null, 2),
            'application/json'
        );
        return;
    }

    const lines = [];
    lines.push('Section,Field,Value');
    lines.push(`meta,exportedAt,${escapeCsvValue(exportData.exportedAt)}`);
    lines.push(`meta,gameId,${escapeCsvValue(exportData.gameId)}`);
    lines.push(`meta,gameName,${escapeCsvValue(exportData.gameName)}`);
    lines.push(`meta,retentionDays,${escapeCsvValue(exportData.retentionDays)}`);
    lines.push(`stats,bestTime,${escapeCsvValue(exportData.stats.bestTime)}`);
    lines.push(`stats,averageTime,${escapeCsvValue(exportData.stats.averageTime)}`);
    lines.push(`stats,totalCompletions,${escapeCsvValue(exportData.stats.totalCompletions)}`);
    lines.push(`stats,totalWordsCompleted,${escapeCsvValue(exportData.stats.totalWordsCompleted)}`);

    lines.push('');
    lines.push('topTen,rank,initials,time,wordsCount,timePerWord,date,timestamp');
    exportData.highScores.topTen.forEach((score, index) => {
        const timePerWord = gameData.getTimePerWord(score).toFixed(3);
        lines.push([
            'topTen',
            index + 1,
            escapeCsvValue(score.initials),
            escapeCsvValue(score.time),
            escapeCsvValue(score.wordsCount),
            escapeCsvValue(timePerWord),
            escapeCsvValue(score.date),
            escapeCsvValue(score.timestamp)
        ].join(','));
    });

    lines.push('');
    lines.push('historical,index,initials,time,wordsCount,timePerWord,date,timestamp,removedFromTopTen,removedReason');
    exportData.highScores.historical.forEach((score, index) => {
        const timePerWord = gameData.getTimePerWord(score).toFixed(3);
        lines.push([
            'historical',
            index + 1,
            escapeCsvValue(score.initials),
            escapeCsvValue(score.time),
            escapeCsvValue(score.wordsCount),
            escapeCsvValue(timePerWord),
            escapeCsvValue(score.date),
            escapeCsvValue(score.timestamp),
            escapeCsvValue(score.removedFromTopTen),
            escapeCsvValue(score.removedReason)
        ].join(','));
    });

    lines.push('');
    lines.push('sessions,index,sessionId,startTime,endTime,duration,completed,wordsCount,shuffled,backButtonUses');
    exportData.sessions.forEach((session, index) => {
        lines.push([
            'sessions',
            index + 1,
            escapeCsvValue(session.sessionId),
            escapeCsvValue(session.startTime),
            escapeCsvValue(session.endTime),
            escapeCsvValue(session.duration),
            escapeCsvValue(session.completed),
            escapeCsvValue(session.wordsCount),
            escapeCsvValue(session.shuffled),
            escapeCsvValue(session.backButtonUses)
        ].join(','));
    });

    downloadTextFile(`wordpractice-records-${stamp}.csv`, `${lines.join('\n')}\n`, 'text/csv;charset=utf-8');
}

// Create rainbow gradient background
function createRainbowBackground() {
    backgroundGradient = new PIXI.Graphics();
    
    // Get full screen dimensions for background
    const screenDimensions = layoutManager.getScreenDimensions();
    
    // Create canvas for gradient
    const canvas = document.createElement('canvas');
    canvas.width = screenDimensions.width;
    canvas.height = screenDimensions.height;
    const ctx = canvas.getContext('2d');
    
    // Create rainbow gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.25)');     // Red
    gradient.addColorStop(0.17, 'rgba(255, 165, 0, 0.25)'); // Orange
    gradient.addColorStop(0.33, 'rgba(255, 255, 0, 0.25)'); // Yellow
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.25)');    // Green
    gradient.addColorStop(0.67, 'rgba(0, 0, 255, 0.25)');   // Blue
    gradient.addColorStop(0.83, 'rgba(75, 0, 130, 0.25)');  // Indigo
    gradient.addColorStop(1, 'rgba(138, 43, 226, 0.25)');   // Violet
    
    // Fill canvas with gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create texture from canvas
    const texture = PIXI.Texture.from(canvas);
    
    // Create sprite from texture
    const sprite = new PIXI.Sprite(texture);
    sprite.width = screenDimensions.width;
    sprite.height = screenDimensions.height;
    
    backgroundGradient.addChild(sprite);
    
    return backgroundGradient;
}

// Initialize the Pixi Application
async function init() {
    // Get initial screen dimensions
    const screenDimensions = layoutManager.getScreenDimensions();
    
    // Create the application with proper resolution for sharp text
    const devicePixelRatio = window.devicePixelRatio || 1;
    app = new PIXI.Application({
        width: screenDimensions.width,
        height: screenDimensions.height,
        backgroundColor: 0xffffff,
        resolution: devicePixelRatio,
        autoDensity: true
    });
    
    document.body.appendChild(app.view);
    
    // Set up resize handling
    window.addEventListener('resize', handleResize);
    
    // Create and add rainbow background
    const rainbow = createRainbowBackground();
    app.stage.addChild(rainbow);
    
    // Load word lists
    await loadPracticeWords();
    await loadHomeworkWords();
    await loadLyricsLines();

    // Pre-load victory sound
    victorySound = new Audio('Victory!.mp3');
    victorySound.preload = 'auto';
    
    // Create all screens and register with ScreenManager
    createTitleScreenWrapper();
    createModeSelectScreenWrapper();
    createPracticeScreen();
    raceScreen = createRaceScreenModule(app, (parentContainer) => FontManager.createWordDisplay(parentContainer, app), createNavigationButtons);
    app.stage.addChild(raceScreen);
    screenManager.addScreen('race', raceScreen);
    createLyricsScreenWrapper();
    createEndScreenWrapper();
    createOptionsScreenWrapper();
    createHighScoreInputScreenWrapper();
    createHighScoreViewScreenWrapper();
    
    // Show title screen
    showScreen('title');
    
    // Add keyboard listeners
    window.addEventListener('keydown', handleKeyPress);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
}

// Create Title Screen
function createTitleScreenWrapper() {
    titleScreen = createTitleScreen(app, {
        onPlay: () => {
            showScreen('modeSelect');
        },
        onOptions: () => {
            showScreen('options');
        },
        onHighScores: () => {
            showScreen('highScoreView');
        }
    });
    
    app.stage.addChild(titleScreen);
    screenManager.addScreen('title', titleScreen);
}

// Create Mode Select Screen
function createModeSelectScreenWrapper() {
    modeSelectScreen = createModeSelectScreen(app, {
        onHomework: () => {
            currentPlayMode = 'homework';
            currentWordsSource = getHomeworkWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
            resetPracticeTracking();
            startPracticeWordTiming();
        },
        onPractice: () => {
            currentPlayMode = 'practice';
            currentWordsSource = getPracticeWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
            resetPracticeTracking();
            startPracticeWordTiming();
        },
        onRace: () => {
            currentPlayMode = 'race';
            currentWordsSource = getPracticeWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            initRaceMode(words, gameData);
            showScreen('race');
            updateWord();
        },
        onLines: () => {
            lyricsLines = getLyricsLines();
            currentLineIndex  = 0;
            currentWordInLine = 0;
            showScreen('lines');
            updateLyricsDisplay();
        },
        onBack: () => {
            showScreen('title');
        }
    });

    app.stage.addChild(modeSelectScreen);
    screenManager.addScreen('modeSelect', modeSelectScreen);
}

// Create Practice Screen
function createPracticeScreen() {
    practiceScreen = new PIXI.Container();
    
    // Create shared word display using layout manager
    wordText = FontManager.createWordDisplay(practiceScreen, app);

    // Progress bar — built via shared FontManager factory
    ({ bg: progressBarBg, fill: progressBarFill, text: progressText } =
        FontManager.createProgressBar(practiceScreen));
    
    // Initialize celebration system
    celebrationSystem = new CelebrationSystem(app, practiceScreen);
    celebrationSystem.setUIElements({
        wordText,
        progressBarBg,
        progressBarFill,
        progressText,
        backButton,
        nextButton
    });
    
    // Initialize button particles system
    buttonParticles = new ButtonParticles(app, practiceScreen);
    
    // Create shared navigation buttons
    const buttons = createNavigationButtons(practiceScreen);
    backButton = buttons.back;
    nextButton = buttons.next;
    
    // Update celebration system UI references after buttons are created
    celebrationSystem.setUIElements({
        wordText,
        progressBarBg,
        progressBarFill,
        progressText,
        backButton: buttons.back,
        nextButton: buttons.next
    });
    
    app.stage.addChild(practiceScreen);
    screenManager.addScreen('practice', practiceScreen);
}

// Create Lyrics Screen
function createLyricsScreenWrapper() {
    lyricsScreen = createLyricsScreen(createNavigationButtons);
    app.stage.addChild(lyricsScreen);
    screenManager.addScreen('lines', lyricsScreen);
    lyricsButtonParticles = new ButtonParticles(app, lyricsScreen);

    lyricsEndScreen = createLyricsEndScreen({
        onContinue: () => showScreen('modeSelect'),
    });
    app.stage.addChild(lyricsEndScreen);
    screenManager.addScreen('lyricsEnd', lyricsEndScreen);
}

// Create End Screen
function createEndScreenWrapper() {
    endScreen = createEndScreen({
        onReturnToTitle: () => {
            currentWordIndex = 0;
            showScreen('title');
        },
        onShuffleRestart: () => {
            currentPlayMode = currentPlayMode || 'practice';
            words = prepareWords(currentWordsSource || getPracticeWords());
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
            resetPracticeTracking();
            startPracticeWordTiming();
        }
    });
    app.stage.addChild(endScreen);
    screenManager.addScreen('end', endScreen);
}

// Create Options Screen
function createOptionsScreenWrapper() {
    optionsScreen = createOptionsScreen(app, {
        onReset: () => {
            resetSaveData();
            showScreen('title');
        },
        onTestCelebration: () => {
            const originalWords = words.slice();
            const originalIndex = currentWordIndex;
            words = ['TEST'];
            currentWordIndex = 0;
            showScreen('practice');
            updateWord();
            updateProgressBar();
            setTimeout(() => {
                const testTime = Math.floor(Math.random() * 60) + 30;
                const messages = ['NEW BEST TIME!', 'FIRST COMPLETION!', 'TOP SCORE!'];
                celebrationSystem.createCelebration(
                    testTime,
                    messages[Math.floor(Math.random() * messages.length)],
                    { onComplete: () => { words = originalWords; currentWordIndex = originalIndex; } }
                );
            }, 100);
        },
        onExportCsv: () => {
            exportRecords('csv');
        },
        onExportJson: () => {
            exportRecords('json');
        },
        onShowTrickyReport: () => {
            showTrickyWordsReport();
        },
        onShowGraph: () => {
            const scores = gameData.getHighScores().topTen;
            const sorted = [...scores].sort((a, b) => a.timestamp - b.timestamp);

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;';

            const panel = document.createElement('div');
            panel.style.cssText = 'background:#fff;border-radius:12px;padding:24px;max-width:620px;width:92%;box-sizing:border-box;';

            const title = document.createElement('h2');
            title.textContent = 'Score History — Time vs Date';
            title.style.cssText = 'margin:0 0 16px;font-family:Arial;font-size:18px;text-align:center;color:#333;';

            const canvas = document.createElement('canvas');
            canvas.width = 560;
            canvas.height = 320;
            canvas.style.cssText = 'width:100%;border:1px solid #e0e0e0;border-radius:4px;display:block;';

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = 'display:block;margin:16px auto 0;padding:8px 28px;font-size:15px;cursor:pointer;border:none;background:#0066CC;color:#fff;border-radius:6px;';
            closeBtn.onclick = () => document.body.removeChild(overlay);

            panel.appendChild(title);
            panel.appendChild(canvas);
            panel.appendChild(closeBtn);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);

            // Draw chart
            const ctx = canvas.getContext('2d');
            const W = canvas.width, H = canvas.height;
            const PAD = { top: 20, right: 20, bottom: 56, left: 64 };
            const chartW = W - PAD.left - PAD.right;
            const chartH = H - PAD.top - PAD.bottom;

            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, W, H);

            if (sorted.length < 2) {
                ctx.fillStyle = '#666';
                ctx.font = '15px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Need at least 2 scores to show a graph', W / 2, H / 2);
                return;
            }

            const times = sorted.map(s => s.time);
            const timestamps = sorted.map(s => s.timestamp);
            const minTime = Math.min(...times), maxTime = Math.max(...times);
            const minTs   = Math.min(...timestamps), maxTs = Math.max(...timestamps);
            const timeRange = maxTime - minTime || 1;
            const tsRange   = maxTs - minTs || 1;

            // Horizontal grid lines + y-axis labels
            ctx.strokeStyle = '#e8e8e8';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = PAD.top + (i / 4) * chartH;
                ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
                const val = Math.round(maxTime - (i / 4) * timeRange);
                ctx.fillStyle = '#888';
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(val + 's', PAD.left - 6, y + 4);
            }

            // Axes
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(PAD.left, PAD.top);
            ctx.lineTo(PAD.left, PAD.top + chartH);
            ctx.lineTo(PAD.left + chartW, PAD.top + chartH);
            ctx.stroke();

            // Axis titles
            ctx.fillStyle = '#555';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(13, PAD.top + chartH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('Time (seconds)', 0, 0);
            ctx.restore();

            // Compute point coordinates
            const pts = sorted.map(s => ({
                x: PAD.left + ((s.timestamp - minTs) / tsRange) * chartW,
                y: PAD.top  + ((maxTime - s.time)    / timeRange) * chartH,
                s
            }));

            // Line
            ctx.strokeStyle = '#0066CC';
            ctx.lineWidth = 2;
            ctx.beginPath();
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();

            // Dots (labels left empty for future customization)
            pts.forEach((p, i) => {
                ctx.fillStyle = '#0066CC';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        },
        onBackToTitle: () => {
            showScreen('title');
        }
    });
    app.stage.addChild(optionsScreen);
    screenManager.addScreen('options', optionsScreen);
}

// Create High Score Input Screen
function createHighScoreInputScreenWrapper() {
    highScoreInputScreen = createHighScoreInputScreen(app, {
        onSubmit: () => submitHighScore()
    });
    app.stage.addChild(highScoreInputScreen);
    screenManager.addScreen('highScoreInput', highScoreInputScreen);
}

// Create High Score View Screen
function createHighScoreViewScreenWrapper() {
    highScoreViewScreen = createHighScoreViewScreen(app, {
        onBack: () => showScreen('title')
    });
    app.stage.addChild(highScoreViewScreen);
    screenManager.addScreen('highScoreView', highScoreViewScreen);
}

// Shared function to create word display - used by both practice and race modes
// Shared function to create navigation buttons - used by both practice and race modes
function createNavigationButtons(parentContainer) {
    // Get button positions from layout manager
    const buttonLayout = layoutManager.getNavigationButtons();
    
    // Back button
    const backBtn = createButton('Back', buttonLayout.back.x, buttonLayout.back.y);
    backBtn.on('pointerdown', handleBack);
    parentContainer.addChild(backBtn);
    
    // Next button
    const nextBtn = createButton('Next', buttonLayout.next.x, buttonLayout.next.y);
    nextBtn.on('pointerdown', handleNext);
    parentContainer.addChild(nextBtn);
    
    return { back: backBtn, next: nextBtn };
}

// Show a specific screen using ScreenManager
function showScreen(screen) {
    // Update current screen state
    currentScreen = screen;
    
    // Use ScreenManager to handle visibility
    screenManager.showScreen(screen);
    
    // Set the correct wordText reference for the active screen
    if (screen === 'race') {
        wordText = raceScreen.wordText;
    } else if (screen === 'practice') {
        // wordText is already set to the practice screen's word display
        // No need to change it since it was created directly in createPracticeScreen
    }
    
    // Handle screen-specific activation logic
    if (screen === 'highScoreInput' && highScoreInputScreen) {
        refreshHighScoreInput(highScoreInputScreen, currentInitials);
    }
    if (screen === 'highScoreView' && highScoreViewScreen) {
        refreshHighScoreView(highScoreViewScreen, gameData);
    }
}

// Update the displayed word with a random font
function updateWord() {
    // Update the word display using FontManager
    FontManager.updateWordDisplay(wordText, words[currentWordIndex], currentWordIndex, words.length);

    if (currentScreen === 'practice' && currentPlayMode === 'practice' && practiceWordStartTime === null) {
        startPracticeWordTiming();
    }
    
    // Update progress bar only in practice mode
    if (currentScreen === 'practice') {
        updateProgressBar();
    }
    
    // Update race positions if in race mode
    if (currentScreen === 'race') {
        updateRacePositions(currentWordIndex, currentScreen);
    }
}

// Update progress bar display
function updateProgressBar() {
    const progress = (currentWordIndex + 1) / words.length;
    FontManager.drawProgressFill(progressBarFill, progress);
    progressText.text = `${Math.round(progress * 100)}% Complete (${currentWordIndex + 1}/100 words)`;
}

// Create celebration effect for new best time
// ── Lyrics mode helpers ──────────────────────────────────────────────────────

/** Recompute and redraw the lyrics word display from current state. */
function updateLyricsDisplay() {
    const line        = lyricsLines[currentLineIndex];
    const windowStart = Math.floor(currentWordInLine / LYRICS_WINDOW_SIZE) * LYRICS_WINDOW_SIZE;
    // Compute word-level progress across all lines
    const totalWords     = lyricsLines.reduce((sum, l) => sum + l.length, 0);
    const wordsCompleted = lyricsLines
        .slice(0, currentLineIndex)
        .reduce((sum, l) => sum + l.length, 0) + currentWordInLine;
    updateLyricsWordDisplay(
        lyricsScreen, line, windowStart, currentWordInLine,
        currentLineIndex, lyricsLines.length, wordsCompleted, totalWords
    );
}

function handleLyricsNext() {
    const currentTime = Date.now();
    if (currentTime - lastNextTime < BUTTON_COOLDOWN) return;
    lastNextTime = currentTime;

    // Fire particles at the Next button
    if (lyricsButtonParticles) {
        const buttonLayout = layoutManager.getNavigationButtons();
        lyricsButtonParticles.celebrateNext(buttonLayout.next.x, buttonLayout.next.y);
    }

    const line = lyricsLines[currentLineIndex];
    if (currentWordInLine < line.length - 1) {
        currentWordInLine++;
    } else if (currentLineIndex < lyricsLines.length - 1) {
        currentLineIndex++;
        currentWordInLine = 0;
    } else {
        // All lyrics exhausted – show "The End" screen
        showScreen('lyricsEnd');
        return;
    }
    updateLyricsDisplay();
}

function handleLyricsBack() {
    const currentTime = Date.now();
    if (currentTime - lastBackTime < BUTTON_COOLDOWN) return;
    lastBackTime = currentTime;

    const windowStart = Math.floor(currentWordInLine / LYRICS_WINDOW_SIZE) * LYRICS_WINDOW_SIZE;
    if (currentWordInLine > windowStart) {
        // Previous word is still visible on screen – step back one word
        currentWordInLine--;
    } else if (currentLineIndex > 0) {
        // First visible word of this line – jump to start of previous line
        currentLineIndex--;
        currentWordInLine = 0;
    }
    updateLyricsDisplay();
}

// Handle next button/arrow key
function handleNext() {
    if (currentScreen === 'lines') { handleLyricsNext(); return; }

    const currentTime = Date.now();
    
    // Check if cooldown period has passed
    if (currentTime - lastNextTime < BUTTON_COOLDOWN) {
        return; // Still in cooldown, ignore the press
    }
    
    lastNextTime = currentTime;

    if (currentScreen === 'practice' && currentPlayMode === 'practice') {
        recordPracticeWordExit();
        commitPracticeBacktrackIfNeeded();
    }
    
    if (currentWordIndex < words.length - 1) {
        // Create celebration particles at Next button position
        if (buttonParticles) {
            const buttonLayout = layoutManager.getNavigationButtons();
            buttonParticles.celebrateNext(buttonLayout.next.x, buttonLayout.next.y);
        }
        
        currentWordIndex++;
        updateWord();
    } else {
        // Reached the end - handle completion based on current screen
        if (currentScreen === 'race') {
            const raceResult = handleRaceCompletionModule(sessionStartTime, words, backButtonUses, handlePracticeCompletion);
            if (raceResult.shouldShowEnd) {
                playVictorySound();
                showScreen('end');
                return;
            } else if (raceResult.continueWithPracticeCompletion) {
                handlePracticeCompletion();
                return;
            }
        } else {
            handlePracticeCompletion();
        }
    }
}

// Play the victory sound (safe – catches errors on browsers that block autoplay)
function playVictorySound() {
    if (!victorySound) return;
    victorySound.currentTime = 0;
    victorySound.play().catch(err => console.warn('Victory sound blocked:', err));
}

// Handle practice mode completion (contains original completion logic)
function handlePracticeCompletion() {
    playVictorySound();

    if (!sessionStartTime) {
        showScreen('end');
        return;
    }
    
    const endTime = new Date();
    const startTime = new Date(sessionStartTime);
    const duration = Math.round((endTime - startTime) / 1000); // seconds
    
    // Check if this is a new best time before saving
    const currentStats = gameData.getStats();
    const isFirstCompletion = currentStats.bestTime === null;
    const isNewBest = isFirstCompletion || duration < currentStats.bestTime;

    const trickyReport = currentPlayMode === 'practice' ? finalizePracticeTrickyTracking() : null;
    
    if (isFirstCompletion) {
        console.log('🎉 First completion ever! Time:', duration, 'seconds');
    } else if (duration < currentStats.bestTime) {
        console.log('🎉 New best time! Previous:', currentStats.bestTime, 'New:', duration);
    }
    
    gameData.saveSession({
        startTime: sessionStartTime,
        duration: duration,
        completed: true,
        wordsCount: words.length,
        shuffled: true, // We don't track if it was shuffled, assume true
        backButtonUses: backButtonUses,
        mode: currentPlayMode || currentScreen
    });

    if (trickyReport) {
        console.log('🧠 Tricky word report updated:', trickyReport);
    }
    
    // Check if it's a high score
    if (gameData.isTopTenScore(duration, words.length)) {
        // Store pending score for initials input
        pendingScore = {
            time: duration,
            wordsCount: words.length,
            isNewBest: isNewBest
        };
        // Initialize input state
        currentInitials = '';
        showScreen('highScoreInput');
        return; // Don't show end screen yet
    }
    
    // Show celebration for first completion or new best time (if not high score)
    if (isNewBest) {
        const celebrationMessage = isFirstCompletion ? 'FIRST COMPLETION!' : 'NEW BEST TIME!';
        celebrationSystem.createCelebration(duration, celebrationMessage, {
            onComplete: () => {
                // Show high score screen with current score if it's a new best
                const currentScoreInfo = { time: duration, initials: 'YOU', wordsCount: words.length };
                refreshHighScoreView(highScoreViewScreen, gameData, currentScoreInfo);
                showScreen('highScoreView');
            }
        });
    } else {
        // Even if it's not a new best, show their score
        const currentScoreInfo = { time: duration, initials: 'YOU', wordsCount: words.length };
        refreshHighScoreView(highScoreViewScreen, gameData, currentScoreInfo);
        showScreen('highScoreView');
    }
}

// Handle back button/arrow key
function handleBack() {
    if (currentScreen === 'lines') { handleLyricsBack(); return; }

    const currentTime = Date.now();
    
    // Check if cooldown period has passed
    if (currentTime - lastBackTime < BUTTON_COOLDOWN) {
        return; // Still in cooldown, ignore the press
    }
    
    lastBackTime = currentTime;

    if (currentScreen === 'practice' && currentPlayMode === 'practice') {
        recordPracticeWordExit();
    }
    
    if (currentWordIndex > 0) {
        currentWordIndex--;
        backButtonUses++;
        if (currentScreen === 'practice' && currentPlayMode === 'practice') {
            practiceBacktrackTargetIndex = currentWordIndex;
        }
        updateWord();
    }
}

// Handle keyboard input
function handleKeyPress(event) {
    if (currentScreen === 'practice' || currentScreen === 'race' || currentScreen === 'lines') {
        if (event.key === 'ArrowRight') {
            handleNext();
        } else if (event.key === 'ArrowLeft') {
            handleBack();
        }
    } else if (currentScreen === 'highScoreInput') {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent any default browser behavior
            console.log('⌨️ Enter key pressed');
            submitHighScore();
        } else if (event.key === 'Backspace') {
            currentInitials = currentInitials.slice(0, -1);
            refreshHighScoreInput(highScoreInputScreen, currentInitials);
        } else if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
            if (currentInitials.length < 3) {
                currentInitials += event.key.toUpperCase();
                refreshHighScoreInput(highScoreInputScreen, currentInitials);
            }
        }
    }
}

// Handle window resize
function handleResize() {
    if (!app) return;
    
    // Update layout manager
    layoutManager.updateOnResize();
    
    // Get new screen dimensions
    const screenDimensions = layoutManager.getScreenDimensions();
    
    // Resize PIXI app while maintaining resolution for sharp text
    const devicePixelRatio = window.devicePixelRatio || 1;
    app.renderer.resize(screenDimensions.width, screenDimensions.height);
    // Ensure resolution is maintained after resize
    app.renderer.resolution = devicePixelRatio;
    
    // Recreate background to fill new screen
    if (backgroundGradient) {
        app.stage.removeChild(backgroundGradient);
        const rainbow = createRainbowBackground();
        app.stage.addChildAt(rainbow, 0); // Add at bottom layer
    }
    
    // Add bounce animation to all screens
    const screens = [titleScreen, modeSelectScreen, practiceScreen, raceScreen, lyricsScreen, lyricsEndScreen, endScreen, optionsScreen];
    screens.forEach(screen => {
        if (screen) {
            layoutManager.bounceResize(screen, () => {
                // Update individual screen layouts after bounce
                updateScreenLayout(screen);
            });
        }
    });
    
    // Update layouts immediately (bounce animation updates positions after)
    updateAllScreenLayouts();
}

function updateAllScreenLayouts() {
    if (titleScreen) updateTitleScreenLayout(titleScreen);
    if (modeSelectScreen) updateModeSelectLayout(modeSelectScreen);
    updatePracticeScreenLayout();
    updateRaceScreenLayout();
    updateLyricsScreenLayoutWrapper();
    if (lyricsEndScreen) updateLyricsEndScreenLayout(lyricsEndScreen);
    if (endScreen) updateEndScreenLayout(endScreen, app);
    if (optionsScreen) updateOptionsScreenLayout(optionsScreen);
}

function updateLyricsScreenLayoutWrapper() {
    if (!lyricsScreen) return;
    updateLyricsScreenLayout(lyricsScreen);
    // Redraw the word display at the new scale if we're currently in lyrics mode
    if (currentScreen === 'lines' && lyricsLines.length > 0) {
        updateLyricsDisplay();
    }
}

function updatePracticeScreenLayout() {
    if (!practiceScreen) return;

    const wordLayout   = layoutManager.getWordDisplay();
    const buttonLayout = layoutManager.getNavigationButtons();
    
    // Update word display position
    if (wordText) {
        wordText.x = wordLayout.x;
        wordText.y = wordLayout.y;
        if (wordText.style) {
            wordText.style.fontSize = wordLayout.fontSize;
        }
    }

    // Reposition progress bar elements via shared helper
    FontManager.repositionProgressBar(progressBarBg, progressBarFill, progressText);

    // Update navigation button positions
    if (backButton) {
        backButton.x = buttonLayout.back.x;
        backButton.y = buttonLayout.back.y;
    }
    if (nextButton) {
        nextButton.x = buttonLayout.next.x;
        nextButton.y = buttonLayout.next.y;
    }
    
    // Redraw progress bar with updated dimensions
    if (currentScreen === 'practice') {
        updateProgressBar();
    }
}

function updateRaceScreenLayout() {
    if (!raceScreen) return;
    
    const wordLayout = layoutManager.getWordDisplay();
    const buttonLayout = layoutManager.getNavigationButtons();
    
    // Update race word display position
    if (raceScreen.wordText) {
        raceScreen.wordText.x = wordLayout.x;
        raceScreen.wordText.y = wordLayout.y;
        if (raceScreen.wordText.style) {
            raceScreen.wordText.style.fontSize = wordLayout.fontSize;
        }
    }
    
    // Update race navigation button positions
    if (raceScreen.backButton) {
        raceScreen.backButton.x = buttonLayout.back.x;
        raceScreen.backButton.y = buttonLayout.back.y;
    }
    if (raceScreen.nextButton) {
        raceScreen.nextButton.x = buttonLayout.next.x;
        raceScreen.nextButton.y = buttonLayout.next.y;
    }
}

function updateScreenLayout(screen) {
    if (screen === titleScreen) updateTitleScreenLayout(titleScreen);
    else if (screen === modeSelectScreen) updateModeSelectLayout(modeSelectScreen);
    else if (screen === practiceScreen) updatePracticeScreenLayout();
    else if (screen === raceScreen) updateRaceScreenLayout();
    else if (screen === lyricsScreen) updateLyricsScreenLayoutWrapper();
    else if (screen === lyricsEndScreen) updateLyricsEndScreenLayout(lyricsEndScreen);
    else if (screen === endScreen) updateEndScreenLayout(endScreen, app);
    else if (screen === optionsScreen) updateOptionsScreenLayout(optionsScreen);
}

// Start the application
init();
