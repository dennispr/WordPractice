/**
 * Options Screen Module
 *
 * Follows the same pattern as TitleScreen.js:
 *   - createOptionsScreen(app, callbacks) → PIXI.Container  [children: 0=title, 1=reset, 2=testCelebration, 3=back]
 *   - updateOptionsScreenLayout(screen)  → repositions on resize
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Build the Options screen container.
 * @param {PIXI.Application} app
 * @param {Object}   callbacks
 * @param {Function} callbacks.onReset            - Reset all saved progress
 * @param {Function} callbacks.onTestCelebration  - Trigger a test celebration
 * @param {Function} callbacks.onBackToTitle      - Return to title screen
 * @returns {PIXI.Container}
 */
export function createOptionsScreen(app, callbacks) {
    const screen = new PIXI.Container();

    // Title  [0]
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
    screen.addChild(optionsTitle);

    // Reset Progress  [1]
    const resetButton = createButton('Reset Progress', app.screen.width / 2, app.screen.height / 2 - 50);
    resetButton.on('pointerdown', () => {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            if (callbacks.onReset) callbacks.onReset();
        }
    });
    screen.addChild(resetButton);

    // Test Celebration  [2]
    const testCelebrationButton = createButton('Test Celebration', app.screen.width / 2, app.screen.height / 2 + 20);
    testCelebrationButton.on('pointerdown', () => {
        if (callbacks.onTestCelebration) callbacks.onTestCelebration();
    });
    screen.addChild(testCelebrationButton);

    // Back to Title  [3]
    const backToTitleButton = createButton('Back to Title', app.screen.width / 2, app.screen.height / 2 + 100);
    backToTitleButton.on('pointerdown', () => {
        if (callbacks.onBackToTitle) callbacks.onBackToTitle();
    });
    screen.addChild(backToTitleButton);

    return screen;
}

/**
 * Reposition all Options screen children after a window resize.
 * Children order: [0] title, [1] reset, [2] testCelebration, [3] back
 * @param {PIXI.Container} screen
 */
export function updateOptionsScreenLayout(screen) {
    if (!screen || screen.children.length === 0) return;

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();

    if (screen.children[0]) {
        screen.children[0].x = centerX;
        screen.children[0].y = gameArea.y + gameArea.height / 4;
    }
    if (screen.children[1]) {
        screen.children[1].x = centerX;
        screen.children[1].y = gameArea.y + gameArea.height / 2 - layoutManager.scale(50);
    }
    if (screen.children[2]) {
        screen.children[2].x = centerX;
        screen.children[2].y = gameArea.y + gameArea.height / 2 + layoutManager.scale(20);
    }
    if (screen.children[3]) {
        screen.children[3].x = centerX;
        screen.children[3].y = gameArea.y + gameArea.height / 2 + layoutManager.scale(100);
    }
}
