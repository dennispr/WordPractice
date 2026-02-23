// EndScreen module - Game completion screen
import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Creates the end screen with congratulations message and navigation options
 * @param {Object} callbacks - Object containing callback functions
 * @param {Function} callbacks.onReturnToTitle - Called when return to title is clicked
 * @param {Function} callbacks.onShuffleRestart - Called when shuffle & restart is clicked
 * @returns {PIXI.Container} The end screen container
 */
export function createEndScreen(callbacks = {}) {
    const endScreen = new PIXI.Container();
    
    // Get end screen layout
    const endLayout = layoutManager.layout.endScreen;
    const gameArea = layoutManager.getGameArea();
    
    // Congratulations text
    const congratsText = new PIXI.Text('Great job! The End.', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(128),  // Doubled from 64
        fontWeight: 'bold',
        fill: 0x00aa00,
        align: 'center'
    });
    congratsText.anchor.set(0.5);
    congratsText.x = layoutManager.centerX();
    congratsText.y = gameArea.y + (gameArea.height * endLayout.titleY);
    endScreen.addChild(congratsText);
    
    // Return to title button
    const returnButton = createButton('Return to Title', layoutManager.centerX(), gameArea.y + (gameArea.height * endLayout.buttonY));
    returnButton.on('pointerdown', () => {
        if (callbacks.onReturnToTitle) {
            callbacks.onReturnToTitle();
        }
    });
    
    // Shuffle again button
    const shuffleAgainButton = createButton('Shuffle & Restart', layoutManager.centerX(), gameArea.y + (gameArea.height * endLayout.buttonY) + layoutManager.scale(80));
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
    
    // Get updated end screen layout
    const endLayout = layoutManager.layout.endScreen;
    const gameArea = layoutManager.getGameArea();
    
    // Update congratulations text position and size
    if (endScreen.children[0]) {
        endScreen.children[0].x = layoutManager.centerX();
        endScreen.children[0].y = gameArea.y + (gameArea.height * endLayout.titleY);
        endScreen.children[0].style.fontSize = layoutManager.scaleFontSize(128);
    }
    
    // Update return to title button position
    if (endScreen.children[1]) {
        endScreen.children[1].x = layoutManager.centerX();
        endScreen.children[1].y = gameArea.y + (gameArea.height * endLayout.buttonY);
    }
    
    // Update shuffle again button position
    if (endScreen.children[2]) {
        endScreen.children[2].x = layoutManager.centerX();
        endScreen.children[2].y = gameArea.y + (gameArea.height * endLayout.buttonY) + layoutManager.scale(80);
    }
}