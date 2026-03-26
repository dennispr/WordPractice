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
 * @param {Function} callbacks.onExportScores     - Export top 10 as CSV
 * @param {Function} callbacks.onShowGraph        - Show time vs date graph
 * @param {Function} callbacks.onBackToTitle      - Return to title screen
 * @returns {PIXI.Container}
 *
 * Children order:
 *   [0] title
 *   [1] resetButton        (left col,  row 1)
 *   [2] testCelebButton    (left col,  row 2)
 *   [3] exportButton       (right col, row 1)
 *   [4] graphButton        (right col, row 2)
 *   [5] backButton         (center,    bottom)
 */
export function createOptionsScreen(app, callbacks) {
    const screen = new PIXI.Container();

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const colOffset = gameArea.width * 0.26;
    const row1Y = gameArea.y + gameArea.height * 0.40;
    const row2Y = gameArea.y + gameArea.height * 0.60;
    const backY  = gameArea.y + gameArea.height * 0.82;

    // Title  [0]
    const optionsTitle = new PIXI.Text('Options', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(48),
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    optionsTitle.anchor.set(0.5);
    optionsTitle.x = centerX;
    optionsTitle.y = gameArea.y + gameArea.height * 0.15;
    screen.addChild(optionsTitle);

    // Reset Progress  [1] — left col, row 1
    const resetButton = createButton('Reset Progress', centerX - colOffset, row1Y);
    resetButton.on('pointerdown', () => {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            if (callbacks.onReset) callbacks.onReset();
        }
    });
    screen.addChild(resetButton);

    // Test Celebration  [2] — left col, row 2
    const testCelebrationButton = createButton('Test Celebration', centerX - colOffset, row2Y);
    testCelebrationButton.on('pointerdown', () => {
        if (callbacks.onTestCelebration) callbacks.onTestCelebration();
    });
    screen.addChild(testCelebrationButton);

    // Export Scores  [3] — right col, row 1
    const exportButton = createButton('Export Top 10 (CSV)', centerX + colOffset, row1Y);
    exportButton.on('pointerdown', () => {
        if (callbacks.onExportScores) callbacks.onExportScores();
    });
    screen.addChild(exportButton);

    // Score Graph  [4] — right col, row 2
    const graphButton = createButton('Score Graph', centerX + colOffset, row2Y);
    graphButton.on('pointerdown', () => {
        if (callbacks.onShowGraph) callbacks.onShowGraph();
    });
    screen.addChild(graphButton);

    // Back to Title  [5] — center, bottom
    const backToTitleButton = createButton('Back to Title', centerX, backY);
    backToTitleButton.on('pointerdown', () => {
        if (callbacks.onBackToTitle) callbacks.onBackToTitle();
    });
    screen.addChild(backToTitleButton);

    return screen;
}

/**
 * Reposition all Options screen children after a window resize.
 * Children: [0] title, [1] reset, [2] testCelebration, [3] exportScores, [4] scoreGraph, [5] back
 * @param {PIXI.Container} screen
 */
export function updateOptionsScreenLayout(screen) {
    if (!screen || screen.children.length === 0) return;

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const colOffset = gameArea.width * 0.26;
    const row1Y = gameArea.y + gameArea.height * 0.40;
    const row2Y = gameArea.y + gameArea.height * 0.60;
    const backY  = gameArea.y + gameArea.height * 0.82;

    if (screen.children[0]) {
        screen.children[0].x = centerX;
        screen.children[0].y = gameArea.y + gameArea.height * 0.15;
        screen.children[0].style.fontSize = layoutManager.scaleFontSize(48);
    }
    if (screen.children[1]) {
        screen.children[1].x = centerX - colOffset;
        screen.children[1].y = row1Y;
    }
    if (screen.children[2]) {
        screen.children[2].x = centerX - colOffset;
        screen.children[2].y = row2Y;
    }
    if (screen.children[3]) {
        screen.children[3].x = centerX + colOffset;
        screen.children[3].y = row1Y;
    }
    if (screen.children[4]) {
        screen.children[4].x = centerX + colOffset;
        screen.children[4].y = row2Y;
    }
    if (screen.children[5]) {
        screen.children[5].x = centerX;
        screen.children[5].y = backY;
    }
}
