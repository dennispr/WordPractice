// Word Practice App using Pixi.js
import * as PIXI from 'pixi.js';
import { 
    createRaceScreen as createRaceScreenModule, 
    initRaceMode, 
    updateRacePositions, 
    handleRaceCompletion as handleRaceCompletionModule 
} from './race.js';
import { createButton } from './ui/Button.js';

// System fonts array - at least 5 different fonts
const GOOGLE_FONTS = [
    'Arial',
    'Georgia',
    'Times New Roman',
    'Courier New',
    'Verdana',
    'Comic Sans MS'
];

// App state
let app;
let words = [];
let currentWordIndex = 0;
let currentScreen = 'title'; // 'title', 'practice', 'end'

// Background elements
let backgroundGradient;

// UI containers
let titleScreen;
let practiceScreen;
let raceScreen;
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
let currentFont;
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

// Celebration system
let celebrationContainer;
let celebrationText;
let confettiParticles = [];
let celebrationActive = false;

// Game Data Manager for localStorage
class GameDataManager {
    constructor(gameId, gameName, developer) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.developer = developer;
        this.storageKey = 'gameAppData';
    }

    // Initialize or load existing data
    initData() {
        let data;
        try {
            const existing = localStorage.getItem(this.storageKey);
            data = existing ? JSON.parse(existing) : null;
        } catch (e) {
            console.warn('Failed to parse saved data, creating new:', e);
            data = null;
        }
        
        if (!data) {
            data = {
                version: "1.0",
                developer: this.developer || "Unknown Developer",
                user: {
                    userId: `user_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    preferences: {}
                },
                games: {},
                achievements: []
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        
        // Ensure all required fields exist with defaults
        if (!data.version) {
            console.log('Save data: Missing version, applying default "1.0"');
            data.version = "1.0";
        }
        if (!data.developer) {
            console.log('Save data: Missing developer, applying default:', this.developer || "Unknown Developer");
            data.developer = this.developer || "Unknown Developer";
        }
        if (!data.user) {
            console.log('Save data: Missing user object, creating default');
            data.user = {};
        }
        if (!data.user.userId) {
            console.log('Save data: Missing user ID, generating new one');
            data.user.userId = `user_${Date.now()}`;
        }
        if (!data.user.createdAt) {
            console.log('Save data: Missing user creation date, applying current timestamp');
            data.user.createdAt = new Date().toISOString();
        }
        if (!data.user.preferences) {
            console.log('Save data: Missing user preferences, creating empty object');
            data.user.preferences = {};
        }
        if (!data.games) {
            console.log('Save data: Missing games object, creating empty object');
            data.games = {};
        }
        if (!data.achievements) {
            console.log('Save data: Missing achievements array, creating empty array');
            data.achievements = [];
        }
        
        return data;
    }

    // Save a new game session
    saveSession(sessionData) {
        const data = this.initData();
        
        // Ensure sessionData has defaults
        const session = {};
        
        if (!sessionData.startTime) {
            console.log('Session data: Missing start time, using current timestamp');
            session.startTime = new Date().toISOString();
        } else {
            session.startTime = sessionData.startTime;
        }
        
        if (sessionData.duration === undefined || sessionData.duration === null) {
            console.log('Session data: Missing duration, defaulting to 0');
            session.duration = 0;
        } else {
            session.duration = sessionData.duration;
        }
        
        if (sessionData.completed === undefined || sessionData.completed === null) {
            console.log('Session data: Missing completed status, defaulting to false');
            session.completed = false;
        } else {
            session.completed = sessionData.completed;
        }
        
        if (!sessionData.wordsCount) {
            console.log('Session data: Missing word count, defaulting to 0');
            session.wordsCount = 0;
        } else {
            session.wordsCount = sessionData.wordsCount;
        }
        
        if (sessionData.shuffled === undefined || sessionData.shuffled === null) {
            console.log('Session data: Missing shuffle status, defaulting to false');
            session.shuffled = false;
        } else {
            session.shuffled = sessionData.shuffled;
        }
        
        if (!sessionData.backButtonUses) {
            console.log('Session data: Missing back button usage, defaulting to 0');
            session.backButtonUses = 0;
        } else {
            session.backButtonUses = sessionData.backButtonUses;
        }
        
        if (!data.games[this.gameId]) {
            data.games[this.gameId] = {
                gameInfo: {
                    name: this.gameName || "Unknown Game",
                    developer: this.developer || "Unknown Developer",
                    version: "1.0",
                    firstPlayed: new Date().toISOString(),
                    totalSessions: 0
                },
                stats: {
                    bestTime: null, // Start as null until first real completion
                    averageTime: 0,
                    totalCompletions: 0,
                    totalWordsCompleted: 0
                },
                highScores: {
                    topTen: [], // Array of {initials, time, date, wordsCount}
                    historical: [] // All scores that were once in top 10
                },
                sessions: [],
                settings: {}
            };
        }
        
        // Ensure highScores structure exists (for existing saves)
        if (!data.games[this.gameId].highScores) {
            console.log('High score data: Adding high scores structure to existing save');
            data.games[this.gameId].highScores = {
                topTen: [],
                historical: []
            };
        }

        // Add session with generated ID
        const sessionWithId = {
            sessionId: `session_${Date.now()}`,
            endTime: new Date().toISOString(),
            ...session
        };

        data.games[this.gameId].sessions.push(sessionWithId);
        data.games[this.gameId].gameInfo.totalSessions++;
        data.games[this.gameId].gameInfo.lastPlayed = sessionWithId.endTime;
        
        // Update stats only if completed with valid duration
        if (session.completed && session.duration > 0) {
            const stats = data.games[this.gameId].stats;
            stats.totalCompletions++;
            stats.totalWordsCompleted += session.wordsCount;
            
            // Only update bestTime if we have a valid time and it's better than current best
            if (stats.bestTime === null || session.duration < stats.bestTime) {
                stats.bestTime = session.duration;
            }
            
            // Calculate average time from completed sessions only
            const completedSessions = data.games[this.gameId].sessions.filter(s => s.completed && s.duration > 0);
            if (completedSessions.length > 0) {
                stats.averageTime = Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length);
            }
        }

        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('Game session saved:', sessionWithId);
    }

    // Get game statistics
    getStats() {
        const data = this.initData();
        const gameStats = data.games[this.gameId]?.stats || {};
        
        // Return stats with safe defaults
        return {
            bestTime: gameStats.bestTime || null,
            averageTime: gameStats.averageTime || 0,
            totalCompletions: gameStats.totalCompletions || 0,
            totalWordsCompleted: gameStats.totalWordsCompleted || 0
        };
    }
    
    // Check if time qualifies for top 10
    isTopTenScore(time) {
        const data = this.initData();
        const topTen = data.games[this.gameId]?.highScores?.topTen || [];
        
        // Always qualifies if less than 10 scores
        if (topTen.length < 10) return true;
        
        // Check if better than worst score
        const worstScore = topTen[topTen.length - 1];
        return time < worstScore.time;
    }
    
    // Add high score with initials
    addHighScore(initials, time, wordsCount) {
        const data = this.initData();
        const scoreEntry = {
            initials: initials.toUpperCase().substring(0, 3), // Max 3 characters
            time: time,
            date: new Date().toISOString(),
            wordsCount: wordsCount,
            timestamp: Date.now()
        };
        
        const highScores = data.games[this.gameId].highScores;
        
        // Add to topTen
        highScores.topTen.push(scoreEntry);
        
        // Sort by time (fastest first)
        highScores.topTen.sort((a, b) => a.time - b.time);
        
        // If more than 10, move extras to historical
        while (highScores.topTen.length > 10) {
            const removedScore = highScores.topTen.pop();
            // Only add to historical if not already there
            const alreadyHistorical = highScores.historical.find(h => 
                h.timestamp === removedScore.timestamp
            );
            if (!removedScore.wasInTopTen && !alreadyHistorical) {
                removedScore.wasInTopTen = true;
                removedScore.removedFromTopTen = new Date().toISOString();
                highScores.historical.push(removedScore);
            }
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('High score added:', scoreEntry);
        
        return highScores.topTen.findIndex(score => score.timestamp === scoreEntry.timestamp) + 1; // Return rank
    }
    
    // Get high scores
    getHighScores() {
        const data = this.initData();
        return {
            topTen: data.games[this.gameId]?.highScores?.topTen || [],
            historical: data.games[this.gameId]?.highScores?.historical || []
        };
    }
}

// Initialize game data manager
const gameData = new GameDataManager('word-practice', 'Word Practice', 'Videogame Workshop LLC');

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
    
    // Show celebration if it was also a best time
    if (wasNewBest) {
        console.log('🎉 Showing celebration for new best time');
        // Switch to practice screen for celebration
        showScreen('practice');
        
        // Use a longer delay to ensure screen transition is complete
        setTimeout(() => {
            console.log('🎊 Creating celebration...');
            const celebrationMessage = wordsCount === 1 ? 'FIRST COMPLETION!' : 'NEW BEST TIME!';
            createCelebration(scoreTime, celebrationMessage);
            
            // Go to end screen after celebration
            setTimeout(() => {
                console.log('✅ Going to end screen after celebration');
                showScreen('end');
            }, 4500);
        }, 200);
    } else {
        console.log('➡️ Going directly to end screen (not a new best)');
        // Go directly to end screen
        showScreen('end');
    }
}

// Update high score input display
function updateHighScoreInput() {
    if (!highScoreInputScreen || !highScoreInputScreen.visible) return;
    
    const inputDisplay = highScoreInputScreen.children[2]; // Third child is input display
    const displayText = currentInitials.padEnd(3, '_');
    inputDisplay.text = displayText;
}

// Update high score view with current scores
function updateHighScoreView() {
    if (!highScoreViewScreen) return;
    
    const scoresContainer = highScoreViewScreen.children[1]; // Second child is scores container
    scoresContainer.removeChildren();
    
    const scores = gameData.getHighScores();
    
    if (scores.topTen.length === 0) {
        const noScoresText = new PIXI.Text('No high scores yet!\n\nComplete the word practice to set your first score.', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x666666,
            align: 'center'
        });
        noScoresText.anchor.set(0.5);
        scoresContainer.addChild(noScoresText);
        return;
    }
    
    scores.topTen.forEach((score, index) => {
        const rankText = `${index + 1}.`;
        const timeText = `${score.time}s`;
        const initialsText = score.initials;
        const wordsText = `${score.wordsCount} words`;
        
        const scoreText = new PIXI.Text(`${rankText.padEnd(4)} ${initialsText.padEnd(4)} ${timeText.padEnd(8)} ${wordsText}`, {
            fontFamily: 'Courier New',
            fontSize: index === 0 ? 20 : 18,
            fontWeight: index === 0 ? 'bold' : 'normal',
            fill: index === 0 ? 0xFFD700 : 0x333333,
            align: 'left'
        });
        scoreText.anchor.set(0.5, 0);
        scoreText.y = index * 30;
        scoresContainer.addChild(scoreText);
    });
    
    // Show total historical scores if any
    if (scores.historical.length > 0) {
        const historicalText = new PIXI.Text(`\n${scores.historical.length} historical scores tracked`, {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0x888888,
            align: 'center'
        });
        historicalText.anchor.set(0.5, 0);
        historicalText.y = scores.topTen.length * 30 + 20;
        scoresContainer.addChild(historicalText);
    }
}

// Reset all save data to defaults
function resetSaveData() {
    // Show confirmation in console
    console.log('🔄 Resetting all save data...');
    
    // Remove all saved data
    localStorage.removeItem('gameAppData');
    
    // Force re-initialization with defaults
    const newData = gameData.initData();
    
    console.log('✅ Save data reset complete. New data structure:', newData);
    console.log('📊 All stats, best times, and session history have been cleared.');
}

// Create rainbow gradient background
function createRainbowBackground() {
    backgroundGradient = new PIXI.Graphics();
    
    // Create canvas for gradient
    const canvas = document.createElement('canvas');
    canvas.width = app.screen.width || 800;
    canvas.height = app.screen.height || 600;
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
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
    
    backgroundGradient.addChild(sprite);
    
    return backgroundGradient;
}

// Initialize the Pixi Application
async function init() {
    // Create the application with v7 API
    app = new PIXI.Application({
        resizeTo: window,
        backgroundColor: 0xffffff
    });
    
    document.body.appendChild(app.view);
    
    // Create and add rainbow background
    const rainbow = createRainbowBackground();
    app.stage.addChild(rainbow);
    
    // Load words from CSV
    await loadWords();
    
    // Create all screens
    createTitleScreen();
    createPracticeScreen();
    raceScreen = createRaceScreenModule(app, createWordDisplay, createNavigationButtons);
    app.stage.addChild(raceScreen);
    createEndScreen();
    createOptionsScreen();
    createHighScoreInputScreen();
    createHighScoreViewScreen();
    
    // Show title screen
    showScreen('title');
    
    // Add keyboard listeners
    window.addEventListener('keydown', handleKeyPress);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
}

// Load words from CSV file
async function loadWords() {
    try {
        const response = await fetch('words.csv');
        const text = await response.text();
        words = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        console.log(`Loaded ${words.length} words`);
    } catch (error) {
        console.error('Error loading words:', error);
        words = ['Error', 'loading', 'words'];
    }
}

// Shuffle words using Fisher-Yates algorithm
function shuffleWords() {
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }
    console.log('Words shuffled');
}

// Create Title Screen
function createTitleScreen() {
    titleScreen = new PIXI.Container();
    
    // Title text
    const title = new PIXI.Text('Word Practice', {
        fontFamily: 'Arial',
        fontSize: 72,
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    title.anchor.set(0.5);
    title.x = app.screen.width / 2;
    title.y = app.screen.height / 3;
    titleScreen.addChild(title);
    
    // Start button
    const startButton = createButton('Start', app.screen.width / 2, app.screen.height / 2 + 20);
    startButton.on('pointerdown', () => {
        shuffleWords();
        currentWordIndex = 0;
        sessionStartTime = new Date().toISOString();
        backButtonUses = 0;
        showScreen('practice');
        updateWord();
    });
    titleScreen.addChild(startButton);
    
    // Race button (race mode)
    const raceButton = createButton('Race', app.screen.width / 2, app.screen.height / 2 + 100);
    raceButton.on('pointerdown', () => {
        shuffleWords();
        currentWordIndex = 0;
        sessionStartTime = new Date().toISOString();
        backButtonUses = 0;
        initRaceMode(words, gameData);
        showScreen('race');
        updateWord();
    });
    titleScreen.addChild(raceButton);
    
    // Options button
    const optionsButton = createButton('Options', app.screen.width / 2, app.screen.height / 2 + 180);
    optionsButton.on('pointerdown', () => {
        showScreen('options');
    });
    titleScreen.addChild(optionsButton);
    
    // High Scores button
    const highScoresButton = createButton('High Scores', app.screen.width / 2, app.screen.height / 2 + 260);
    highScoresButton.on('pointerdown', () => {
        showScreen('highScoreView');
    });
    titleScreen.addChild(highScoresButton);
    
    app.stage.addChild(titleScreen);
}

// Create Practice Screen
function createPracticeScreen() {
    practiceScreen = new PIXI.Container();
    
    // Create shared word display
    wordText = createWordDisplay(practiceScreen);
    
    // Progress bar background
    progressBarBg = new PIXI.Graphics();
    progressBarBg.beginFill(0xcccccc);
    progressBarBg.drawRoundedRect(0, 0, 400, 20, 10);
    progressBarBg.endFill();
    progressBarBg.x = app.screen.width / 2 - 200;
    progressBarBg.y = app.screen.height - 50;
    practiceScreen.addChild(progressBarBg);
    
    // Progress bar fill
    progressBarFill = new PIXI.Graphics();
    progressBarFill.x = app.screen.width / 2 - 200;
    progressBarFill.y = app.screen.height - 50;
    practiceScreen.addChild(progressBarFill);
    
    // Progress text
    progressText = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0x666666,
        align: 'center'
    });
    progressText.anchor.set(0.5);
    progressText.x = app.screen.width / 2;
    progressText.y = app.screen.height - 20;
    practiceScreen.addChild(progressText);
    
    // Celebration container (hidden by default)
    celebrationContainer = new PIXI.Container();
    celebrationContainer.visible = false;
    practiceScreen.addChild(celebrationContainer);
    
    // Create shared navigation buttons
    const buttons = createNavigationButtons(practiceScreen);
    backButton = buttons.back;
    nextButton = buttons.next;
    
    app.stage.addChild(practiceScreen);
}

// Create End Screen
function createEndScreen() {
    endScreen = new PIXI.Container();
    
    // Congratulations text
    const congratsText = new PIXI.Text('Great job! The End.', {
        fontFamily: 'Arial',
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0x00aa00,
        align: 'center'
    });
    congratsText.anchor.set(0.5);
    congratsText.x = app.screen.width / 2;
    congratsText.y = app.screen.height / 3;
    endScreen.addChild(congratsText);
    
    // Return to title button
    const returnButton = createButton('Return to Title', app.screen.width / 2, app.screen.height / 2 + 50);
    returnButton.on('pointerdown', () => {
        currentWordIndex = 0;
        showScreen('title');
    });
    
    // Shuffle again button
    const shuffleAgainButton = createButton('Shuffle & Restart', app.screen.width / 2, app.screen.height / 2 + 120);
    shuffleAgainButton.on('pointerdown', () => {
        shuffleWords();
        currentWordIndex = 0;
        sessionStartTime = new Date().toISOString();
        backButtonUses = 0;
        showScreen('practice');
        updateWord();
    });
    endScreen.addChild(returnButton);
    endScreen.addChild(shuffleAgainButton);
    
    app.stage.addChild(endScreen);
}

// Create Options Screen
function createOptionsScreen() {
    optionsScreen = new PIXI.Container();
    
    // Options title
    const optionsTitle = new PIXI.Text('Options', {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    optionsTitle.anchor.set(0.5);
    optionsTitle.x = app.screen.width / 2;
    optionsTitle.y = app.screen.height / 4;
    optionsScreen.addChild(optionsTitle);
    
    // Reset Progress button
    const resetButton = createButton('Reset Progress', app.screen.width / 2, app.screen.height / 2 - 50);
    resetButton.on('pointerdown', () => {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            resetSaveData();
            showScreen('title'); // Return to title after reset
        }
    });
    optionsScreen.addChild(resetButton);
    
    // Test Celebration button (for debugging)
    const testCelebrationButton = createButton('Test Celebration', app.screen.width / 2, app.screen.height / 2 + 20);
    testCelebrationButton.on('pointerdown', () => {
        // Set up minimal test data
        const originalWords = words.slice(); // Save original words
        const originalIndex = currentWordIndex;
        
        // Set test word and index
        words = ['TEST']; // Single word for testing
        currentWordIndex = 0;
        
        // Show practice screen first so celebration renders properly
        showScreen('practice');
        updateWord(); // Update display with test word
        updateProgressBar(); // Update progress bar
        
        // Trigger celebration after a brief delay
        setTimeout(() => {
            const testTime = Math.floor(Math.random() * 60) + 30; // Random time between 30-90 seconds
            const messages = ['NEW BEST TIME!', 'FIRST COMPLETION!'];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            createCelebration(testTime, randomMessage);
            
            // Restore original data after celebration
            setTimeout(() => {
                words = originalWords;
                currentWordIndex = originalIndex;
                console.log('Test celebration complete. Original data restored.');
            }, 5000); // Restore after 5 seconds (after celebration ends)
        }, 100);
    });
    optionsScreen.addChild(testCelebrationButton);
    
    // Back to Title button
    const backToTitleButton = createButton('Back to Title', app.screen.width / 2, app.screen.height / 2 + 100);
    backToTitleButton.on('pointerdown', () => {
        showScreen('title');
    });
    optionsScreen.addChild(backToTitleButton);
    
    app.stage.addChild(optionsScreen);
}

// Create High Score Input Screen
function createHighScoreInputScreen() {
    highScoreInputScreen = new PIXI.Container();
    
    // Congratulations text
    const congratsText = new PIXI.Text('New High Score!', {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0xFFD700,
        align: 'center'
    });
    congratsText.anchor.set(0.5);
    congratsText.x = app.screen.width / 2;
    congratsText.y = app.screen.height / 4;
    highScoreInputScreen.addChild(congratsText);
    
    // Instructions
    const instructionsText = new PIXI.Text('Enter your initials (3 letters):', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0x333333,
        align: 'center'
    });
    instructionsText.anchor.set(0.5);
    instructionsText.x = app.screen.width / 2;
    instructionsText.y = app.screen.height / 2 - 60;
    highScoreInputScreen.addChild(instructionsText);
    
    // Input display
    const inputDisplay = new PIXI.Text('___', {
        fontFamily: 'Courier New',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center'
    });
    inputDisplay.anchor.set(0.5);
    inputDisplay.x = app.screen.width / 2;
    inputDisplay.y = app.screen.height / 2;
    highScoreInputScreen.addChild(inputDisplay);
    
    // Instructions for controls
    const controlsText = new PIXI.Text('Type your initials and press ENTER\n(or click Submit)', {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0x666666,
        align: 'center'
    });
    controlsText.anchor.set(0.5);
    controlsText.x = app.screen.width / 2;
    controlsText.y = app.screen.height / 2 + 60;
    highScoreInputScreen.addChild(controlsText);
    
    // Submit button
    const submitButton = createButton('Submit', app.screen.width / 2, app.screen.height / 2 + 120);
    submitButton.on('pointerdown', () => {
        console.log('🖱️ Submit button clicked');
        submitHighScore();
    });
    highScoreInputScreen.addChild(submitButton);
    
    app.stage.addChild(highScoreInputScreen);
}

// Create High Score View Screen
function createHighScoreViewScreen() {
    highScoreViewScreen = new PIXI.Container();
    
    // Title
    const titleText = new PIXI.Text('High Scores', {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    titleText.anchor.set(0.5);
    titleText.x = app.screen.width / 2;
    titleText.y = 80;
    highScoreViewScreen.addChild(titleText);
    
    // Scores container (will be populated dynamically)
    const scoresContainer = new PIXI.Container();
    scoresContainer.x = app.screen.width / 2;
    scoresContainer.y = 150;
    highScoreViewScreen.addChild(scoresContainer);
    
    // Back button
    const backButton = createButton('Back to Title', app.screen.width / 2, app.screen.height - 100);
    backButton.on('pointerdown', () => {
        showScreen('title');
    });
    highScoreViewScreen.addChild(backButton);
    
    app.stage.addChild(highScoreViewScreen);
}

// Shared function to create word display - used by both practice and race modes
function createWordDisplay(parentContainer) {
    // Word text (will be updated dynamically)
    const wordDisplay = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center'
    });
    wordDisplay.anchor.set(0.5);
    wordDisplay.x = app.screen.width / 2;
    wordDisplay.y = app.screen.height / 2;
    parentContainer.addChild(wordDisplay);
    
    return wordDisplay;
}

// Shared function to create navigation buttons - used by both practice and race modes
function createNavigationButtons(parentContainer) {
    // Back button
    const backBtn = createButton('Back', app.screen.width / 2 - 120, app.screen.height - 100);
    backBtn.on('pointerdown', handleBack);
    parentContainer.addChild(backBtn);
    
    // Next button
    const nextBtn = createButton('Next', app.screen.width / 2 + 120, app.screen.height - 100);
    nextBtn.on('pointerdown', handleNext);
    parentContainer.addChild(nextBtn);
    
    return { back: backBtn, next: nextBtn };
}

// Shared function to update word display with font randomization - used by both modes
function updateWordDisplay(wordDisplayElement) {
    if (currentWordIndex >= 0 && currentWordIndex < words.length) {
        const word = words[currentWordIndex];
        const randomFont = GOOGLE_FONTS[Math.floor(Math.random() * GOOGLE_FONTS.length)];
        
        wordDisplayElement.text = word;
        wordDisplayElement.style.fontFamily = randomFont;
        currentFont = randomFont;
        
        console.log(`Word ${currentWordIndex + 1}/${words.length}: "${word}" in ${randomFont}`);
    }
}

// Show a specific screen
function showScreen(screen) {
    currentScreen = screen;
    
    titleScreen.visible = (screen === 'title');
    practiceScreen.visible = (screen === 'practice');
    raceScreen.visible = (screen === 'race');
    endScreen.visible = (screen === 'end');
    optionsScreen.visible = (screen === 'options');
    
    // Set the correct wordText reference for the active screen
    if (screen === 'race') {
        wordText = raceScreen.wordText;
    } else if (screen === 'practice') {
        // wordText is already set to the practice screen's word display
        // No need to change it since it was created directly in createPracticeScreen
    }
    
    if (highScoreInputScreen) {
        highScoreInputScreen.visible = (screen === 'highScoreInput');
        if (screen === 'highScoreInput') {
            updateHighScoreInput();
        }
    }
    if (highScoreViewScreen) {
        highScoreViewScreen.visible = (screen === 'highScoreView');
        if (screen === 'highScoreView') {
            updateHighScoreView();
        }
    }
}

// Update the displayed word with a random font
function updateWord() {
    // Update the word display using shared function
    updateWordDisplay(wordText);
    
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
    const fillWidth = 400 * progress;
    const percentage = Math.round(progress * 100);
    
    // Update fill bar
    progressBarFill.clear();
    progressBarFill.beginFill(0x4CAF50);
    progressBarFill.drawRoundedRect(0, 0, fillWidth, 20, 10);
    progressBarFill.endFill();
    
    // Update text with percentage
    progressText.text = `${percentage}% Complete (${currentWordIndex + 1}/${words.length})`;
}

// Create celebration effect for new best time
function createCelebration(newBestTime, message = 'NEW BEST TIME!') {
    celebrationActive = true;
    celebrationContainer.visible = true;
    celebrationContainer.removeChildren(); // Clear any existing celebration
    
    // Hide practice screen UI elements during celebration
    if (wordText) wordText.visible = false;
    if (progressBarBg) progressBarBg.visible = false;
    if (progressBarFill) progressBarFill.visible = false;
    if (progressText) progressText.visible = false;
    if (backButton) backButton.visible = false;
    if (nextButton) nextButton.visible = false;
    
    // Create celebration text
    celebrationText = new PIXI.Text(`🎉 ${message} 🎉`, {
        fontFamily: 'Arial',
        fontSize: 48,
        fontWeight: 'bold',
        fill: 0xFFD700, // Gold
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 3
    });
    celebrationText.anchor.set(0.5);
    celebrationText.x = app.screen.width / 2;
    celebrationText.y = app.screen.height / 2 - 100;
    celebrationContainer.addChild(celebrationText);
    
    // Create time display
    const timeText = new PIXI.Text(`${newBestTime} seconds!`, {
        fontFamily: 'Arial',
        fontSize: 32,
        fontWeight: 'bold',
        fill: 0xFFD700,
        align: 'center'
    });
    timeText.anchor.set(0.5);
    timeText.x = app.screen.width / 2;
    timeText.y = app.screen.height / 2 - 50;
    celebrationContainer.addChild(timeText);
    
    // Create confetti particles
    createConfetti();
    
    // Animate celebration text
    animateCelebrationText();
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        hideCelebration();
    }, 4000);
}

// Create confetti particles
function createConfetti() {
    confettiParticles = [];
    const colors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA726, 0x66BB6A, 0xAB47BC];
    
    for (let i = 0; i < 50; i++) {
        const particle = new PIXI.Graphics();
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        
        // Random shape - rectangle or circle
        if (Math.random() > 0.5) {
            particle.beginFill(color);
            particle.drawRect(0, 0, size, size);
            particle.endFill();
        } else {
            particle.beginFill(color);
            particle.drawCircle(0, 0, size / 2);
            particle.endFill();
        }
        
        // Random starting position across top of screen
        particle.x = Math.random() * app.screen.width;
        particle.y = -20;
        
        // Random physics properties
        particle.vx = (Math.random() - 0.5) * 4; // horizontal velocity
        particle.vy = Math.random() * 3 + 2; // falling velocity
        particle.rotation = Math.random() * Math.PI * 2;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
        particle.gravity = 0.1;
        
        confettiParticles.push(particle);
        celebrationContainer.addChild(particle);
    }
    
    // Start confetti animation
    animateConfetti();
}

// Animate confetti particles
function animateConfetti() {
    if (!celebrationActive) return;
    
    confettiParticles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.rotationSpeed;
        
        // Remove particles that fall off screen
        if (particle.y > app.screen.height + 50) {
            celebrationContainer.removeChild(particle);
            confettiParticles.splice(index, 1);
        }
    });
    
    // Continue animation
    if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
    }
}

// Animate celebration text (bouncing effect)
function animateCelebrationText() {
    if (!celebrationActive || !celebrationText) return;
    
    let bouncePhase = 0;
    const originalY = celebrationText.y;
    
    function bounce() {
        if (!celebrationActive || !celebrationText) return;
        
        bouncePhase += 0.1;
        celebrationText.y = originalY + Math.sin(bouncePhase) * 10;
        celebrationText.scale.set(1 + Math.sin(bouncePhase * 2) * 0.1);
        
        if (bouncePhase < Math.PI * 8) { // Bounce for ~4 seconds
            requestAnimationFrame(bounce);
        }
    }
    
    bounce();
}

// Hide celebration
function hideCelebration() {
    celebrationActive = false;
    if (celebrationContainer) {
        celebrationContainer.visible = false;
        celebrationContainer.removeChildren();
    }
    confettiParticles = [];
    
    // Restore practice screen UI elements
    if (wordText) wordText.visible = true;
    if (progressBarBg) progressBarBg.visible = true;
    if (progressBarFill) progressBarFill.visible = true;
    if (progressText) progressText.visible = true;
    if (backButton) backButton.visible = true;
    if (nextButton) nextButton.visible = true;
}

// Handle next button/arrow key
function handleNext() {
    const currentTime = Date.now();
    
    // Check if cooldown period has passed
    if (currentTime - lastNextTime < BUTTON_COOLDOWN) {
        return; // Still in cooldown, ignore the press
    }
    
    lastNextTime = currentTime;
    
    if (currentWordIndex < words.length - 1) {
        currentWordIndex++;
        updateWord();
    } else {
        // Reached the end - handle completion based on current screen
        if (currentScreen === 'race') {
            const raceResult = handleRaceCompletionModule(sessionStartTime, words, backButtonUses, handlePracticeCompletion);
            if (raceResult.shouldShowEnd) {
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

// Handle practice mode completion (contains original completion logic)
function handlePracticeCompletion() {
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
        backButtonUses: backButtonUses
    });
    
    // Check if it's a high score
    if (gameData.isTopTenScore(duration)) {
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
        createCelebration(duration, celebrationMessage);
    }
    
    showScreen('end');
}

// Handle back button/arrow key
function handleBack() {
    const currentTime = Date.now();
    
    // Check if cooldown period has passed
    if (currentTime - lastBackTime < BUTTON_COOLDOWN) {
        return; // Still in cooldown, ignore the press
    }
    
    lastBackTime = currentTime;
    
    if (currentWordIndex > 0) {
        currentWordIndex--;
        backButtonUses++;
        updateWord();
    }
}

// Handle keyboard input
function handleKeyPress(event) {
    if (currentScreen === 'practice' || currentScreen === 'race') {
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
            updateHighScoreInput();
        } else if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
            if (currentInitials.length < 3) {
                currentInitials += event.key.toUpperCase();
                updateHighScoreInput();
            }
        }
    }
}

// Handle window resize
function handleResize() {
    if (!app) return;
    
    // Update background gradient size
    if (backgroundGradient && backgroundGradient.children[0]) {
        backgroundGradient.children[0].width = app.screen.width;
        backgroundGradient.children[0].height = app.screen.height;
    }
    
    // Update title screen positions
    if (titleScreen && titleScreen.children.length > 0) {
        titleScreen.children[0].x = app.screen.width / 2; // title
        titleScreen.children[0].y = app.screen.height / 3;
        titleScreen.children[1].x = app.screen.width / 2; // start button
        titleScreen.children[1].y = app.screen.height / 2 + 20;
        if (titleScreen.children.length > 2) {
            titleScreen.children[2].x = app.screen.width / 2; // shuffle button
            titleScreen.children[2].y = app.screen.height / 2 + 100;
        }
        if (titleScreen.children.length > 3) {
            titleScreen.children[3].x = app.screen.width / 2; // options button
            titleScreen.children[3].y = app.screen.height / 2 + 180;
        }
        if (titleScreen.children.length > 4) {
            titleScreen.children[4].x = app.screen.width / 2; // high scores button
            titleScreen.children[4].y = app.screen.height / 2 + 260;
        }
    }
    
    // Update options screen positions
    if (optionsScreen && optionsScreen.children.length > 0) {
        optionsScreen.children[0].x = app.screen.width / 2; // title
        optionsScreen.children[0].y = app.screen.height / 4;
        optionsScreen.children[1].x = app.screen.width / 2; // reset button
        optionsScreen.children[1].y = app.screen.height / 2 - 50;
        if (optionsScreen.children.length > 2) {
            optionsScreen.children[2].x = app.screen.width / 2; // test celebration button
            optionsScreen.children[2].y = app.screen.height / 2 + 20;
        }
        if (optionsScreen.children.length > 3) {
            optionsScreen.children[3].x = app.screen.width / 2; // back button
            optionsScreen.children[3].y = app.screen.height / 2 + 100;
        }
    }
    
    // Update practice screen positions
    if (practiceScreen && practiceScreen.children.length > 0) {
        wordText.x = app.screen.width / 2;
        wordText.y = app.screen.height / 2;
        
        // Update progress bar positions
        if (progressBarBg) {
            progressBarBg.x = app.screen.width / 2 - 200;
            progressBarBg.y = app.screen.height - 50;
        }
        if (progressBarFill) {
            progressBarFill.x = app.screen.width / 2 - 200;
            progressBarFill.y = app.screen.height - 50;
        }
        if (progressText) {
            progressText.x = app.screen.width / 2;
            progressText.y = app.screen.height - 20;
        }
        
        // Update celebration positions if active
        if (celebrationActive && celebrationText) {
            celebrationText.x = app.screen.width / 2;
            if (celebrationContainer.children.length > 1) {
                celebrationContainer.children[1].x = app.screen.width / 2; // time text
            }
        }
        
        // Update navigation button positions
        if (backButton) {
            backButton.x = app.screen.width / 2 - 120;
            backButton.y = app.screen.height - 100;
        }
        if (nextButton) {
            nextButton.x = app.screen.width / 2 + 120;
            nextButton.y = app.screen.height - 100;
        }
    }
    
    // Update race screen positions
    if (raceScreen && raceScreen.visible && raceScreen.wordText) {
        raceScreen.wordText.x = app.screen.width / 2;
        raceScreen.wordText.y = app.screen.height / 2;
        
        // Update race navigation button positions
        if (raceScreen.backButton) {
            raceScreen.backButton.x = app.screen.width / 2 - 120;
            raceScreen.backButton.y = app.screen.height - 100;
        }
        if (raceScreen.nextButton) {
            raceScreen.nextButton.x = app.screen.width / 2 + 120;
            raceScreen.nextButton.y = app.screen.height - 100;
        }
    }
    
    // Update end screen positions
    if (endScreen && endScreen.children.length > 0) {
        endScreen.children[0].x = app.screen.width / 2; // congratulations text
        endScreen.children[0].y = app.screen.height / 3;
        endScreen.children[1].x = app.screen.width / 2; // return button
        endScreen.children[1].y = app.screen.height / 2 + 50;
        if (endScreen.children.length > 2) {
            endScreen.children[2].x = app.screen.width / 2; // shuffle again button
            endScreen.children[2].y = app.screen.height / 2 + 120;
        }
    }
}

// Start the application
init();
