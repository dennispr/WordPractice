// EndScreen module - Game completion screen
import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';

/**
 * Creates the end screen with congratulations message and navigation options
 * @param {Object} callbacks - Object containing callback functions
 * @param {Function} callbacks.onReturnToTitle - Called when return to title is clicked
 * @param {Function} callbacks.onShuffleRestart - Called when shuffle & restart is clicked
 * @returns {PIXI.Container} The end screen container
 */
export function createEndScreen(callbacks = {}) {
    const endScreen = new PIXI.Container();
    
    // Congratulations text
    const congratsText = new PIXI.Text('Great job! The End.', {
        fontFamily: 'Arial',
        fontSize: 64,
        fontWeight: 'bold',
        fill: 0x00aa00,
        align: 'center'
    });
    congratsText.anchor.set(0.5);
    congratsText.x = window.innerWidth / 2;
    congratsText.y = window.innerHeight / 3;
    endScreen.addChild(congratsText);
    
    // Return to title button
    const returnButton = createButton('Return to Title', window.innerWidth / 2, window.innerHeight / 2 + 50);
    returnButton.on('pointerdown', () => {
        if (callbacks.onReturnToTitle) {
            callbacks.onReturnToTitle();
        }
    });
    
    // Shuffle again button
    const shuffleAgainButton = createButton('Shuffle & Restart', window.innerWidth / 2, window.innerHeight / 2 + 120);
    shuffleAgainButton.on('pointerdown', () => {
        if (callbacks.onShuffleRestart) {
            callbacks.onShuffleRestart();
        }
    });
    
    endScreen.addChild(returnButton);
    endScreen.addChild(shuffleAgainButton);
    
    return endScreen;
}

/**
 * Updates the layout of the end screen for responsive design
 * @param {PIXI.Container} endScreen - The end screen container
 * @param {Object} app - The PIXI application instance
 */
export function updateEndScreenLayout(endScreen, app) {
    if (!endScreen || !endScreen.children || endScreen.children.length === 0) {
        return;
    }
    
    // Update congratulations text position
    if (endScreen.children[0]) {
        endScreen.children[0].x = app.screen.width / 2;
        endScreen.children[0].y = app.screen.height / 3;
    }
    
    // Update return to title button position
    if (endScreen.children[1]) {
        endScreen.children[1].x = app.screen.width / 2;
        endScreen.children[1].y = app.screen.height / 2 + 50;
    }
    
    // Update shuffle again button position
    if (endScreen.children[2]) {
        endScreen.children[2].x = app.screen.width / 2;
        endScreen.children[2].y = app.screen.height / 2 + 120;
    }
}