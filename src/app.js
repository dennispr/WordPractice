// Word Practice App using Pixi.js
import * as PIXI from 'pixi.js';

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

// UI containers
let titleScreen;
let practiceScreen;
let endScreen;
let optionsScreen;

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
                sessions: [],
                settings: {}
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
}

// Initialize game data manager
const gameData = new GameDataManager('word-practice', 'Word Practice', 'Videogame Workshop LLC');

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

// Initialize the Pixi Application
async function init() {
    // Create the application with v7 API
    app = new PIXI.Application({
        resizeTo: window,
        backgroundColor: 0xffffff
    });
    
    document.body.appendChild(app.view);
    
    // Load words from CSV
    await loadWords();
    
    // Create all screens
    createTitleScreen();
    createPracticeScreen();
    createEndScreen();
    createOptionsScreen();
    
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
        currentWordIndex = 0;
        sessionStartTime = new Date().toISOString();
        backButtonUses = 0;
        showScreen('practice');
        updateWord();
    });
    titleScreen.addChild(startButton);
    
    // Shuffle button
    const shuffleButton = createButton('Shuffle Words', app.screen.width / 2, app.screen.height / 2 + 100);
    shuffleButton.on('pointerdown', () => {
        shuffleWords();
        currentWordIndex = 0;
    });
    titleScreen.addChild(shuffleButton);
    
    // Options button
    const optionsButton = createButton('Options', app.screen.width / 2, app.screen.height / 2 + 180);
    optionsButton.on('pointerdown', () => {
        showScreen('options');
    });
    titleScreen.addChild(optionsButton);
    
    app.stage.addChild(titleScreen);
}

// Create Practice Screen
function createPracticeScreen() {
    practiceScreen = new PIXI.Container();
    
    // Word text (will be updated dynamically)
    wordText = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center'
    });
    wordText.anchor.set(0.5);
    wordText.x = app.screen.width / 2;
    wordText.y = app.screen.height / 2;
    practiceScreen.addChild(wordText);
    
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
    
    // Back button
    backButton = createButton('Back', app.screen.width / 2 - 120, app.screen.height - 100);
    backButton.on('pointerdown', handleBack);
    practiceScreen.addChild(backButton);
    
    // Next button
    nextButton = createButton('Next', app.screen.width / 2 + 120, app.screen.height - 100);
    nextButton.on('pointerdown', handleNext);
    practiceScreen.addChild(nextButton);
    
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
    const resetButton = createButton('Reset Progress', app.screen.width / 2, app.screen.height / 2);
    resetButton.on('pointerdown', () => {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            resetSaveData();
            showScreen('title'); // Return to title after reset
        }
    });
    optionsScreen.addChild(resetButton);
    
    // Back to Title button
    const backToTitleButton = createButton('Back to Title', app.screen.width / 2, app.screen.height / 2 + 100);
    backToTitleButton.on('pointerdown', () => {
        showScreen('title');
    });
    optionsScreen.addChild(backToTitleButton);
    
    app.stage.addChild(optionsScreen);
}

// Helper function to create a button
function createButton(text, x, y) {
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    
    // Button background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x4CAF50);
    bg.drawRoundedRect(-100, -30, 200, 60, 10);
    bg.endFill();
    button.addChild(bg);
    
    // Button text
    const buttonText = new PIXI.Text(text, {
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    // Hover effects
    button.on('pointerover', () => {
        bg.clear();
        bg.beginFill(0x45a049);
        bg.drawRoundedRect(-100, -30, 200, 60, 10);
        bg.endFill();
    });
    
    button.on('pointerout', () => {
        bg.clear();
        bg.beginFill(0x4CAF50);
        bg.drawRoundedRect(-100, -30, 200, 60, 10);
        bg.endFill();
    });
    
    return button;
}

// Show a specific screen
function showScreen(screen) {
    currentScreen = screen;
    
    titleScreen.visible = (screen === 'title');
    practiceScreen.visible = (screen === 'practice');
    endScreen.visible = (screen === 'end');
    optionsScreen.visible = (screen === 'options');
}

// Update the displayed word with a random font
function updateWord() {
    if (currentWordIndex >= 0 && currentWordIndex < words.length) {
        const word = words[currentWordIndex];
        const randomFont = GOOGLE_FONTS[Math.floor(Math.random() * GOOGLE_FONTS.length)];
        
        wordText.text = word;
        wordText.style.fontFamily = randomFont;
        currentFont = randomFont;
        
        // Update progress bar
        updateProgressBar();
        
        console.log(`Word ${currentWordIndex + 1}/${words.length}: "${word}" in ${randomFont}`);
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
        // Reached the end - save session data
        if (sessionStartTime) {
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
            
            // Show celebration for first completion or new best time
            if (isNewBest) {
                const celebrationMessage = isFirstCompletion ? 'FIRST COMPLETION!' : 'NEW BEST TIME!';
                createCelebration(duration, celebrationMessage);
            }
        }
        
        showScreen('end');
    }
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
    if (currentScreen === 'practice') {
        if (event.key === 'ArrowRight') {
            handleNext();
        } else if (event.key === 'ArrowLeft') {
            handleBack();
        }
    }
}

// Handle window resize
function handleResize() {
    if (!app) return;
    
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
    }
    
    // Update options screen positions
    if (optionsScreen && optionsScreen.children.length > 0) {
        optionsScreen.children[0].x = app.screen.width / 2; // title
        optionsScreen.children[0].y = app.screen.height / 4;
        optionsScreen.children[1].x = app.screen.width / 2; // reset button
        optionsScreen.children[1].y = app.screen.height / 2;
        optionsScreen.children[2].x = app.screen.width / 2; // back button
        optionsScreen.children[2].y = app.screen.height / 2 + 100;
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
        
        backButton.x = app.screen.width / 2 - 120;
        backButton.y = app.screen.height - 100;
        nextButton.x = app.screen.width / 2 + 120;
        nextButton.y = app.screen.height - 100;
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
