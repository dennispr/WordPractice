/**
 * Lyrics Screen - Displays CSV lyrics lines word by word.
 *
 * Up to 4 words from the current line are shown at once.
 * The active (current) word is colored blue; the rest are black.
 * "Next" advances one word at a time. When the window boundary is
 * reached the display shifts to the next 4-word chunk of the same line,
 * or moves to the next line if the line is exhausted.
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Create the lyrics screen container.
 *
 * @param {PIXI.Application} app
 * @param {Object}   callbacks
 * @param {Function} callbacks.onNext - Called when Next is pressed
 * @param {Function} callbacks.onBack - Called when Back is pressed
 * @returns {PIXI.Container}
 */
export function createLyricsScreen(app, callbacks) {
    const screen = new PIXI.Container();

    // Container that is rebuilt on every state update to hold per-word Text objects
    const wordContainer = new PIXI.Container();
    screen.addChild(wordContainer); // child[0]

    // Line progress label  ("Line X / Y")
    const progressText = new PIXI.Text('', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(36),
        fontWeight: 'bold',
        fill: 0x666666,
        align: 'center',
    });
    progressText.anchor.set(0.5);
    const progressLayout = layoutManager.getProgressBar();
    progressText.x = layoutManager.centerX();
    progressText.y = progressLayout.textY;
    screen.addChild(progressText); // child[1]

    // Navigation buttons
    const buttonLayout = layoutManager.getNavigationButtons();

    const backBtn = createButton('Back', buttonLayout.back.x, buttonLayout.back.y);
    backBtn.on('pointerdown', () => { if (callbacks.onBack) callbacks.onBack(); });
    screen.addChild(backBtn); // child[2]

    const nextBtn = createButton('Next', buttonLayout.next.x, buttonLayout.next.y);
    nextBtn.on('pointerdown', () => { if (callbacks.onNext) callbacks.onNext(); });
    screen.addChild(nextBtn); // child[3]

    // Expose key elements for external updates
    screen.wordContainer = wordContainer;
    screen.progressText  = progressText;
    screen.backButton    = backBtn;
    screen.nextButton    = nextBtn;

    return screen;
}

/**
 * Rebuild the word display for the current lyrics state.
 *
 * Words in the active 4-word window are rendered as separate PIXI.Text
 * objects and centered horizontally. The active word is blue; others black.
 *
 * @param {PIXI.Container} screen          - Lyrics screen returned by createLyricsScreen
 * @param {string[]}       lineWords       - All tokens for the current lyrics line
 * @param {number}         windowStart     - Index of the first word in the visible 4-word window
 * @param {number}         activeWordIndex - Index (within lineWords) of the highlighted word
 * @param {number}         lineIndex       - 0-based current line index
 * @param {number}         totalLines      - Total number of lyrics lines
 */
export function updateLyricsWordDisplay(screen, lineWords, windowStart, activeWordIndex, lineIndex, totalLines) {
    const container = screen.wordContainer;
    container.removeChildren();

    const windowEnd  = Math.min(windowStart + 4, lineWords.length);
    const windowWords = lineWords.slice(windowStart, windowEnd);

    const gameArea    = layoutManager.getGameArea();
    const centerX     = layoutManager.centerX();
    const centerY     = gameArea.y + gameArea.height * 0.4;
    const fontSize    = layoutManager.scaleFontSize(72);
    const wordSpacing = layoutManager.scale(28);

    // Build one Text object per visible word
    const textObjects = windowWords.map((word, i) => {
        const isActive = (windowStart + i) === activeWordIndex;
        return new PIXI.Text(word, {
            fontFamily: 'Arial',
            fontSize,
            fontWeight: 'bold',
            // Blue for the active word, near-black for inactive
            fill: isActive ? 0x0055FF : 0x111111,
        });
    });

    // Compute total rendered width so we can center the group
    const totalWidth = textObjects.reduce((sum, t) => sum + t.width, 0)
        + wordSpacing * Math.max(textObjects.length - 1, 0);

    // Position each word left-to-right, group centered at centerX
    let x = centerX - totalWidth / 2;
    textObjects.forEach((textObj) => {
        textObj.anchor.set(0, 0.5);
        textObj.x = x;
        textObj.y = centerY;
        x += textObj.width + wordSpacing;
        container.addChild(textObj);
    });

    // Update progress label
    screen.progressText.text = `Line ${lineIndex + 1} / ${totalLines}`;
    screen.progressText.x = layoutManager.centerX();
}

/**
 * Reposition all static elements of the lyrics screen after a window resize.
 * The wordContainer's children are recreated on each state update, so they
 * do not need special handling here — just call updateLyricsWordDisplay again
 * after this to redraw at the new scale.
 *
 * @param {PIXI.Container} screen - Lyrics screen returned by createLyricsScreen
 */
export function updateLyricsScreenLayout(screen) {
    if (!screen) return;

    const progressLayout = layoutManager.getProgressBar();
    const buttonLayout   = layoutManager.getNavigationButtons();

    if (screen.progressText) {
        screen.progressText.x = layoutManager.centerX();
        screen.progressText.y = progressLayout.textY;
        screen.progressText.style.fontSize = layoutManager.scaleFontSize(36);
    }
    if (screen.backButton) {
        screen.backButton.x = buttonLayout.back.x;
        screen.backButton.y = buttonLayout.back.y;
    }
    if (screen.nextButton) {
        screen.nextButton.x = buttonLayout.next.x;
        screen.nextButton.y = buttonLayout.next.y;
    }
}
