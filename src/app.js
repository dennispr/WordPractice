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
import { createEndScreen, updateEndScreenLayout } from './screens/EndScreen.js';
import { createOptionsScreen, updateOptionsScreenLayout } from './screens/OptionsScreen.js';
import {
    createHighScoreInputScreen,
    createHighScoreViewScreen,
    updateHighScoreInput as refreshHighScoreInput,
    updateHighScoreView as refreshHighScoreView
} from './screens/HighScoreScreen.js';
import { loadPracticeWords, loadHomeworkWords, getPracticeWords, getHomeworkWords, prepareWords } from './core/WordManager.js';
import { FontManager } from './utils/FontManager.js';
import { CelebrationSystem } from './utils/CelebrationSystem.js';
import { layoutManager } from './utils/LayoutManager.js';
import { ButtonParticles } from './effects/ButtonParticles.js';
import { screenManager } from './core/ScreenManager.js';

// App state
let app;
let words = [];            // working word list for the current session
let currentWordsSource = null; // reference to the pool used (practice or homework)
let currentWordIndex = 0;
let currentScreen = 'title'; // 'title', 'modeSelect', 'practice', 'race', 'end' …

// Background elements
let backgroundGradient;

// UI containers
let titleScreen;
let modeSelectScreen;
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
let buttonParticles;

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
            currentWordsSource = getHomeworkWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
        },
        onPractice: () => {
            currentWordsSource = getPracticeWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
        },
        onRace: () => {
            currentWordsSource = getPracticeWords();
            words = prepareWords(currentWordsSource);
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            initRaceMode(words, gameData);
            showScreen('race');
            updateWord();
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
    
    // Get layout positions
    const progressLayout = layoutManager.getProgressBar();
    
    // Progress bar background
    progressBarBg = new PIXI.Graphics();
    progressBarBg.beginFill(0xcccccc);
    progressBarBg.drawRoundedRect(0, 0, progressLayout.width, progressLayout.height, 10);
    progressBarBg.endFill();
    progressBarBg.x = progressLayout.x;
    progressBarBg.y = progressLayout.y;
    practiceScreen.addChild(progressBarBg);
    
    // Progress bar fill
    progressBarFill = new PIXI.Graphics();
    progressBarFill.x = progressLayout.x;
    progressBarFill.y = progressLayout.y;
    practiceScreen.addChild(progressBarFill);
    
    // Progress text
    progressText = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(36),  // Doubled from 18
        fontWeight: 'bold',
        fill: 0x666666,
        align: 'center'
    });
    progressText.anchor.set(0.5);
    progressText.x = layoutManager.centerX();
    progressText.y = progressLayout.textY;
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

// Create End Screen
function createEndScreenWrapper() {
    endScreen = createEndScreen({
        onReturnToTitle: () => {
            currentWordIndex = 0;
            showScreen('title');
        },
        onShuffleRestart: () => {
            words = prepareWords(currentWordsSource || getPracticeWords());
            currentWordIndex = 0;
            sessionStartTime = new Date().toISOString();
            backButtonUses = 0;
            showScreen('practice');
            updateWord();
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
    const progressLayout = layoutManager.getProgressBar();
    const progress = (currentWordIndex + 1) / words.length;
    const fillWidth = progressLayout.width * progress;
    const percentage = Math.round(progress * 100);
    
    // Update fill bar using proper scaled dimensions
    progressBarFill.clear();
    progressBarFill.beginFill(0x4CAF50);
    progressBarFill.drawRoundedRect(0, 0, fillWidth, progressLayout.height, 10);
    progressBarFill.endFill();
    
    // Update text with percentage - show 100 words explicitly
    progressText.text = `${percentage}% Complete (${currentWordIndex + 1}/100 words)`;
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
    const screens = [titleScreen, modeSelectScreen, practiceScreen, raceScreen, endScreen, optionsScreen];
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
    if (endScreen) updateEndScreenLayout(endScreen, app);
    if (optionsScreen) updateOptionsScreenLayout(optionsScreen);
}

function updatePracticeScreenLayout() {
    if (!practiceScreen) return;
    
    const wordLayout = layoutManager.getWordDisplay();
    const progressLayout = layoutManager.getProgressBar();
    const buttonLayout = layoutManager.getNavigationButtons();
    
    // Update word display position
    if (wordText) {
        wordText.x = wordLayout.x;
        wordText.y = wordLayout.y;
        // Update font size
        if (wordText.style) {
            wordText.style.fontSize = wordLayout.fontSize;
        }
    }
    
    // Update progress bar positions
    if (progressBarBg) {
        progressBarBg.x = progressLayout.x;
        progressBarBg.y = progressLayout.y;
        progressBarBg.clear();
        progressBarBg.beginFill(0xcccccc);
        progressBarBg.drawRoundedRect(0, 0, progressLayout.width, progressLayout.height, 10);
        progressBarBg.endFill();
    }
    if (progressBarFill) {
        progressBarFill.x = progressLayout.x;
        progressBarFill.y = progressLayout.y;
    }
    if (progressText) {
        progressText.x = layoutManager.centerX();
        progressText.y = progressLayout.textY;
        progressText.style.fontSize = layoutManager.scaleFontSize(36);
    }
    
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
    else if (screen === endScreen) updateEndScreenLayout(endScreen, app);
    else if (screen === optionsScreen) updateOptionsScreenLayout(optionsScreen);
}

// Start the application
init();
