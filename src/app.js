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
import { createEndScreen, updateEndScreenLayout } from './screens/EndScreen.js';
import { FontManager } from './utils/FontManager.js';
import { CelebrationSystem } from './utils/CelebrationSystem.js';

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

// Game Data Manager for localStorage
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
                updateHighScoreView(newScoreInfo); // Refresh high score display with new score info
                showScreen('highScoreView'); // Show high scores instead of going to end screen
            }
        });
    }, 200);
}

// Update high score input display
function updateHighScoreInput() {
    if (!highScoreInputScreen || !highScoreInputScreen.visible) return;
    
    const inputDisplay = highScoreInputScreen.children[2]; // Third child is input display
    const displayText = currentInitials.padEnd(3, '_');
    inputDisplay.text = displayText;
}

// Update high score view with current scores
function updateHighScoreView(newScore = null) {
    if (!highScoreViewScreen) return;
    
    const scoresContainer = highScoreViewScreen.children[1]; // Second child is scores container
    scoresContainer.removeChildren();
    
    const scores = gameData.getHighScores();
    
    if (scores.topTen.length === 0 && !newScore) {
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
    
    // Display top ten scores
    scores.topTen.forEach((score, index) => {
        const rankText = `${index + 1}.`;
        const timeText = `${score.time}s`;
        const initialsText = score.initials;
        const wordsText = `${score.wordsCount} words`;
        
        // Check if this is the newly added score (bold it)
        const isNewScore = newScore && score.time === newScore.time && score.initials === newScore.initials;
        
        const scoreText = new PIXI.Text(`${rankText.padEnd(4)} ${initialsText.padEnd(4)} ${timeText.padEnd(8)} ${wordsText}`, {
            fontFamily: 'Courier New',
            fontSize: index === 0 ? 20 : 18,
            fontWeight: (index === 0 || isNewScore) ? 'bold' : 'normal',
            fill: index === 0 ? 0xFFD700 : (isNewScore ? 0x00AA00 : 0x333333),
            align: 'left'
        });
        scoreText.anchor.set(0.5, 0);
        scoreText.y = index * 30;
        scoresContainer.addChild(scoreText);
    });
    
    // Show current score if it didn't make top ten
    if (newScore && !gameData.isTopTenScore(newScore.time)) {
        // Add separator
        const separatorText = new PIXI.Text('─────────────────────', {
            fontFamily: 'Courier New',
            fontSize: 16,
            fill: 0x999999,
            align: 'center'
        });
        separatorText.anchor.set(0.5, 0);
        separatorText.y = scores.topTen.length * 30 + 15;
        scoresContainer.addChild(separatorText);
        
        // Add current score label
        const currentScoreLabel = new PIXI.Text('CURRENT SCORE', {
            fontFamily: 'Arial',
            fontSize: 16,
            fontWeight: 'bold',
            fill: 0x666666,
            align: 'center'
        });
        currentScoreLabel.anchor.set(0.5, 0);
        currentScoreLabel.y = scores.topTen.length * 30 + 35;
        scoresContainer.addChild(currentScoreLabel);
        
        // Add current score
        const currentScoreText = new PIXI.Text(`${newScore.initials.padEnd(4)} ${newScore.time}s`.padEnd(12) + ` ${newScore.wordsCount} words`, {
            fontFamily: 'Courier New',
            fontSize: 18,
            fontWeight: 'bold',
            fill: 0x0066CC,
            align: 'center'
        });
        currentScoreText.anchor.set(0.5, 0);
        currentScoreText.y = scores.topTen.length * 30 + 55;
        scoresContainer.addChild(currentScoreText);
    }
    
    // Show total historical scores if any
    const historicalOffset = newScore && !gameData.isTopTenScore(newScore.time) ? 100 : 20;
    if (scores.historical.length > 0) {
        const historicalText = new PIXI.Text(`\n${scores.historical.length} historical scores tracked`, {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0x888888,
            align: 'center'
        });
        historicalText.anchor.set(0.5, 0);
        historicalText.y = scores.topTen.length * 30 + historicalOffset;
        scoresContainer.addChild(historicalText);
    }
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
    createTitleScreenWrapper();
    createPracticeScreen();
    raceScreen = createRaceScreenModule(app, (parentContainer) => FontManager.createWordDisplay(parentContainer, app), createNavigationButtons);
    app.stage.addChild(raceScreen);
    raceScreen.visible = false;
    createEndScreenWrapper();
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
function createTitleScreenWrapper() {
    titleScreen = createTitleScreen(app, {
        onStart: () => {
            shuffleWords();
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
        },
        onRace: () => {
            shuffleWords();
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            initRaceMode(words, gameData);
            showScreen('race');
            updateWord();
        },
        onOptions: () => {
            showScreen('options');
        },
        onHighScores: () => {
            showScreen('highScoreView');
        }
    });
    
    app.stage.addChild(titleScreen);
}

// Create Practice Screen
function createPracticeScreen() {
    practiceScreen = new PIXI.Container();
    
    // Create shared word display
    wordText = FontManager.createWordDisplay(practiceScreen, app);
    
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
    practiceScreen.visible = false;
}

// Create End Screen
function createEndScreenWrapper() {
    endScreen = createEndScreen({
        onReturnToTitle: () => {
            currentWordIndex = 0;
            showScreen('title');
        },
        onShuffleRestart: () => {
            shuffleWords();
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
        }
    });
    app.stage.addChild(endScreen);
    endScreen.visible = false;
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
            const messages = ['NEW BEST TIME!', 'FIRST COMPLETION!', 'TOP SCORE!'];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            celebrationSystem.createCelebration(testTime, randomMessage, {
                onComplete: () => {
                    // Restore original data after celebration
                    words = originalWords;
                    currentWordIndex = originalIndex;
                    console.log('Test celebration complete. Original data restored.');
                }
            });
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
    optionsScreen.visible = false;
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
    highScoreInputScreen.visible = false;
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
    highScoreViewScreen.visible = false;
}

// Shared function to create word display - used by both practice and race modes
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
    // Update the word display using FontManager
    FontManager.updateWordDisplay(wordText, words[currentWordIndex], currentWordIndex, words.length);
    
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
        celebrationSystem.createCelebration(duration, celebrationMessage, {
            onComplete: () => {
                // Show high score screen with current score if it's a new best
                const currentScoreInfo = { time: duration, initials: 'YOU', wordsCount: words.length };
                updateHighScoreView(currentScoreInfo);
                showScreen('highScoreView');
            }
        });
    } else {
        // Even if it's not a new best, show their score
        const currentScoreInfo = { time: duration, initials: 'YOU', wordsCount: words.length };
        updateHighScoreView(currentScoreInfo);
        showScreen('highScoreView');
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
    updateTitleScreenLayout(titleScreen, app);
    
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
    updateEndScreenLayout(endScreen, app);
}

// Start the application
init();
