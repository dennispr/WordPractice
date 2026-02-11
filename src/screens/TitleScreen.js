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
        if (callbacks.onStart) callbacks.onStart();
    });
    titleScreen.addChild(startButton);
    
    // Race button (race mode)
    const raceButton = createButton('Race', app.screen.width / 2, app.screen.height / 2 + 100);
    raceButton.on('pointerdown', () => {
        if (callbacks.onRace) callbacks.onRace();
    });
    titleScreen.addChild(raceButton);
    
    // Options button
    const optionsButton = createButton('Options', app.screen.width / 2, app.screen.height / 2 + 180);
    optionsButton.on('pointerdown', () => {
        if (callbacks.onOptions) callbacks.onOptions();
    });
    titleScreen.addChild(optionsButton);
    
    // High Scores button
    const highScoresButton = createButton('High Scores', app.screen.width / 2, app.screen.height / 2 + 260);
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
    
    // Update title text position
    titleScreen.children[0].x = app.screen.width / 2; // title
    titleScreen.children[0].y = app.screen.height / 3;
    
    // Update button positions
    titleScreen.children[1].x = app.screen.width / 2; // start button
    titleScreen.children[1].y = app.screen.height / 2 + 20;
    
    if (titleScreen.children.length > 2) {
        titleScreen.children[2].x = app.screen.width / 2; // race button
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