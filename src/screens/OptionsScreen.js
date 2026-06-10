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
 * @param {Function} callbacks.onExportCsv        - Export saved records as CSV
 * @param {Function} callbacks.onExportJson       - Export saved records as JSON
 * @param {Function} callbacks.onShowTrickyReport - Show tricky word analytics report
 * @param {Function} callbacks.onShowGraph        - Show time vs date graph
 * @param {Function} callbacks.onBackToTitle      - Return to title screen
 * @returns {PIXI.Container}
 *
 * Children order:
 *   [0] title
 *   [1] resetButton        (left col,  row 1)
 *   [2] testCelebButton    (left col,  row 2)
 *   [3] exportCsvButton    (right col, row 1)
 *   [4] exportJsonButton   (right col, row 2)
 *   [5] graphButton        (left col,  row 3)
 *   [6] trickyButton       (right col, row 3)
 *   [7] backButton         (center,    bottom)
 */
export function createOptionsScreen(app, callbacks) {
    const screen = new PIXI.Container();

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const colOffset = gameArea.width * 0.26;
    const row1Y = gameArea.y + gameArea.height * 0.40;
    const row2Y = gameArea.y + gameArea.height * 0.60;
    const row3Y = gameArea.y + gameArea.height * 0.72;
    const backY  = gameArea.y + gameArea.height * 0.86;

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

    // Export CSV  [3] — right col, row 1
    const exportCsvButton = createButton('Export Records (CSV)', centerX + colOffset, row1Y);
    exportCsvButton.on('pointerdown', () => {
        if (callbacks.onExportCsv) callbacks.onExportCsv();
    });
    screen.addChild(exportCsvButton);

    // Export JSON  [4] — right col, row 2
    const exportJsonButton = createButton('Export Records (JSON)', centerX + colOffset, row2Y);
    exportJsonButton.on('pointerdown', () => {
        if (callbacks.onExportJson) callbacks.onExportJson();
    });
    screen.addChild(exportJsonButton);

    // Score Graph  [5] — left col, row 3
    const graphButton = createButton('Score Graph', centerX - colOffset, row3Y);
    graphButton.on('pointerdown', () => {
        if (callbacks.onShowGraph) callbacks.onShowGraph();
    });
    screen.addChild(graphButton);

    // Tricky Word Report  [6] — right col, row 3
    const trickyReportButton = createButton('Tricky Word Report', centerX + colOffset, row3Y);
    trickyReportButton.on('pointerdown', () => {
        if (callbacks.onShowTrickyReport) callbacks.onShowTrickyReport();
    });
    screen.addChild(trickyReportButton);

    // Back to Title  [7] — center, bottom
    const backToTitleButton = createButton('Back to Title', centerX, backY);
    backToTitleButton.on('pointerdown', () => {
        if (callbacks.onBackToTitle) callbacks.onBackToTitle();
    });
    screen.addChild(backToTitleButton);

    return screen;
}

/**
 * Reposition all Options screen children after a window resize.
 * Children: [0] title, [1] reset, [2] testCelebration, [3] exportCsv, [4] exportJson, [5] scoreGraph, [6] trickyReport, [7] back
 * @param {PIXI.Container} screen
 */
export function updateOptionsScreenLayout(screen) {
    if (!screen || screen.children.length === 0) return;

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const colOffset = gameArea.width * 0.26;
    const row1Y = gameArea.y + gameArea.height * 0.40;
    const row2Y = gameArea.y + gameArea.height * 0.60;
    const row3Y = gameArea.y + gameArea.height * 0.72;
    const backY  = gameArea.y + gameArea.height * 0.86;

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
        screen.children[5].x = centerX - colOffset;
        screen.children[5].y = row3Y;
    }
    if (screen.children[6]) {
        screen.children[6].x = centerX + colOffset;
        screen.children[6].y = row3Y;
    }
    if (screen.children[7]) {
        screen.children[7].x = centerX;
        screen.children[7].y = backY;
    }
}
