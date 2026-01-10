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

// Practice screen elements
let wordText;
let nextButton;
let backButton;
let currentFont;

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
        showScreen('practice');
        updateWord();
    });
    endScreen.addChild(returnButton);
    endScreen.addChild(shuffleAgainButton);
    
    app.stage.addChild(endScreen);
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
}

// Update the displayed word with a random font
function updateWord() {
    if (currentWordIndex >= 0 && currentWordIndex < words.length) {
        const word = words[currentWordIndex];
        const randomFont = GOOGLE_FONTS[Math.floor(Math.random() * GOOGLE_FONTS.length)];
        
        wordText.text = word;
        wordText.style.fontFamily = randomFont;
        currentFont = randomFont;
        
        console.log(`Word ${currentWordIndex + 1}/${words.length}: "${word}" in ${randomFont}`);
    }
}

// Handle next button/arrow key
function handleNext() {
    if (currentWordIndex < words.length - 1) {
        currentWordIndex++;
        updateWord();
    } else {
        // Reached the end
        showScreen('end');
    }
}

// Handle back button/arrow key
function handleBack() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
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
    }
    
    // Update practice screen positions
    if (practiceScreen && practiceScreen.children.length > 0) {
        wordText.x = app.screen.width / 2;
        wordText.y = app.screen.height / 2;
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
