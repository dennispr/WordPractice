/**
 * Title Screen Module - Main menu with navigation buttons
 * 
 * Features:
 * - Game title display
 * - Start button for practice mode
 * - Race button for race mode
 * - Options menu access
 * - High scores leaderboard access
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Create the title screen with all navigation buttons
 * @param {PIXI.Application} app - The main PIXI application
 * @param {Object} callbacks - Object containing callback functions
 * @param {Function} callbacks.onStart - Called when Start button is clicked
 * @param {Function} callbacks.onRace - Called when Race button is clicked
 * @param {Function} callbacks.onOptions - Called when Options button is clicked
 * @param {Function} callbacks.onHighScores - Called when High Scores button is clicked
 * @returns {PIXI.Container} The title screen container
 */
export function createTitleScreen(app, callbacks) {
    const titleScreen = new PIXI.Container();
    
    // Get title screen layout
    const titleLayout = layoutManager.getTitleScreen();
    
    // Title text
    const title = new PIXI.Text('Word Practice', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(144),  // Doubled from 72
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    title.anchor.set(0.5);
    title.x = titleLayout.centerX;
    title.y = titleLayout.logoY;
    titleScreen.addChild(title);
    
    // Start button (top-left)
    const startButton = createButton('Start', titleLayout.grid.topLeft.x, titleLayout.grid.topLeft.y);
    startButton.on('pointerdown', () => {
        if (callbacks.onStart) callbacks.onStart();
    });
    titleScreen.addChild(startButton);
    
    // Race button (top-right)
    const raceButton = createButton('Race', titleLayout.grid.topRight.x, titleLayout.grid.topRight.y);
    raceButton.on('pointerdown', () => {
        if (callbacks.onRace) callbacks.onRace();
    });
    titleScreen.addChild(raceButton);
    
    // Options button (bottom-left)
    const optionsButton = createButton('Options', titleLayout.grid.bottomLeft.x, titleLayout.grid.bottomLeft.y);
    optionsButton.on('pointerdown', () => {
        if (callbacks.onOptions) callbacks.onOptions();
    });
    titleScreen.addChild(optionsButton);
    
    // High Scores button (bottom-right)
    const highScoresButton = createButton('High Scores', titleLayout.grid.bottomRight.x, titleLayout.grid.bottomRight.y);
    highScoresButton.on('pointerdown', () => {
        if (callbacks.onHighScores) callbacks.onHighScores();
    });
    titleScreen.addChild(highScoresButton);
    
    return titleScreen;
}

/**
 * Update title screen positions for window resize
 * @param {PIXI.Container} titleScreen - The title screen container
 * @param {PIXI.Application} app - The main PIXI application
 */
export function updateTitleScreenLayout(titleScreen, app) {
    if (!titleScreen || titleScreen.children.length === 0) return;
    
    // Get updated title screen layout
    const titleLayout = layoutManager.getTitleScreen();
    
    // Update title text position and size
    titleScreen.children[0].x = titleLayout.centerX; // title
    titleScreen.children[0].y = titleLayout.logoY;
    titleScreen.children[0].style.fontSize = layoutManager.scaleFontSize(144);
    
    // Update button positions in 2x2 grid
    titleScreen.children[1].x = titleLayout.grid.topLeft.x;     // start button
    titleScreen.children[1].y = titleLayout.grid.topLeft.y;
    
    if (titleScreen.children.length > 2) {
        titleScreen.children[2].x = titleLayout.grid.topRight.x;  // race button
        titleScreen.children[2].y = titleLayout.grid.topRight.y;
    }
    if (titleScreen.children.length > 3) {
        titleScreen.children[3].x = titleLayout.grid.bottomLeft.x; // options button
        titleScreen.children[3].y = titleLayout.grid.bottomLeft.y;
    }
    if (titleScreen.children.length > 4) {
        titleScreen.children[4].x = titleLayout.grid.bottomRight.x; // high scores button
        titleScreen.children[4].y = titleLayout.grid.bottomRight.y;
    }
}