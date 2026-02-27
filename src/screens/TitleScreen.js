/**
 * Title Screen Module - Main menu with navigation buttons
 *
 * Buttons:
 *  - Play        → mode select screen
 *  - Options     → options screen
 *  - High Score  → high score view screen
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Create the title screen with Play / Options / High Score buttons.
 * @param {PIXI.Application} app - The main PIXI application
 * @param {Object}           callbacks
 * @param {Function}         callbacks.onPlay       - Called when Play is clicked
 * @param {Function}         callbacks.onOptions    - Called when Options is clicked
 * @param {Function}         callbacks.onHighScores - Called when High Score is clicked
 * @returns {PIXI.Container} The title screen container
 */
export function createTitleScreen(app, callbacks) {
    const titleScreen = new PIXI.Container();

    // Get title screen layout
    const titleLayout = layoutManager.getTitleScreen();

    // Title text               child[0]
    const title = new PIXI.Text('Word Practice', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(144),
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    title.anchor.set(0.5);
    title.x = titleLayout.centerX;
    title.y = titleLayout.logoY;
    titleScreen.addChild(title);

    // Play button – top-center     child[1]
    const playButton = createButton('Play', titleLayout.centerX, titleLayout.grid.topLeft.y);
    playButton.on('pointerdown', () => { if (callbacks.onPlay) callbacks.onPlay(); });
    titleScreen.addChild(playButton);

    // Options button – bottom-left  child[2]
    const optionsButton = createButton('Options', titleLayout.grid.bottomLeft.x, titleLayout.grid.bottomLeft.y);
    optionsButton.on('pointerdown', () => { if (callbacks.onOptions) callbacks.onOptions(); });
    titleScreen.addChild(optionsButton);

    // High Score button – bottom-right  child[3]
    const highScoresButton = createButton('High Score', titleLayout.grid.bottomRight.x, titleLayout.grid.bottomRight.y);
    highScoresButton.on('pointerdown', () => { if (callbacks.onHighScores) callbacks.onHighScores(); });
    titleScreen.addChild(highScoresButton);

    return titleScreen;
}

/**
 * Update title screen positions for window resize.
 * Children order: [0] title, [1] Play, [2] Options, [3] High Score
 * @param {PIXI.Container} titleScreen - The title screen container
 */
export function updateTitleScreenLayout(titleScreen) {
    if (!titleScreen || titleScreen.children.length === 0) return;

    const titleLayout = layoutManager.getTitleScreen();

    // Title
    titleScreen.children[0].x = titleLayout.centerX;
    titleScreen.children[0].y = titleLayout.logoY;
    titleScreen.children[0].style.fontSize = layoutManager.scaleFontSize(144);

    // Play  (top-center)
    if (titleScreen.children[1]) {
        titleScreen.children[1].x = titleLayout.centerX;
        titleScreen.children[1].y = titleLayout.grid.topLeft.y;
    }

    // Options (bottom-left)
    if (titleScreen.children[2]) {
        titleScreen.children[2].x = titleLayout.grid.bottomLeft.x;
        titleScreen.children[2].y = titleLayout.grid.bottomLeft.y;
    }

    // High Score (bottom-right)
    if (titleScreen.children[3]) {
        titleScreen.children[3].x = titleLayout.grid.bottomRight.x;
        titleScreen.children[3].y = titleLayout.grid.bottomRight.y;
    }
}