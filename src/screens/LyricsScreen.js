/**
 * Lyrics Screen - Displays CSV lyrics lines word by word.
 *
 * Up to LYRICS_WINDOW_SIZE words from the current line are shown at once.
 * The active (current) word is colored blue; the rest are black.
 * "Next" advances one word at a time. When the window boundary is
 * reached the display shifts to the next LYRICS_WINDOW_SIZE-word chunk of the same line,
 * or moves to the next line if the line is exhausted.
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';
import { FontManager } from '../utils/FontManager.js';

/** Number of words shown at once in the lyrics window. Change this to adjust the window size. */
export const LYRICS_WINDOW_SIZE = 5;

/**
 * Create the lyrics screen container.
 *
 * @param {Function} createNavigationButtons - Shared factory from app.js (same pattern as race.js)
 * @returns {PIXI.Container}
 */
export function createLyricsScreen(createNavigationButtons) {
    const screen = new PIXI.Container();

    // Container that is rebuilt on every state update to hold per-word Text objects
    const wordContainer = new PIXI.Container();
    screen.addChild(wordContainer); // child[0]

    // Progress bar (bg, fill, text) — built via shared FontManager factory
    const { bg: progressBarBg, fill: progressBarFill, text: progressText } =
        FontManager.createProgressBar(screen); // children[1,2,3]

    // Navigation buttons — shared factory, same pattern as race.js
    const buttons = createNavigationButtons(screen); // children[4,5]

    // Expose key elements for external updates
    screen.wordContainer   = wordContainer;
    screen.progressBarBg   = progressBarBg;
    screen.progressBarFill = progressBarFill;
    screen.progressText    = progressText;
    screen.backButton      = buttons.back;
    screen.nextButton      = buttons.next;

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
 * @param {number}         wordsCompleted  - Total words completed across all lines (0-based)
 * @param {number}         totalWords      - Total words across all lines
 */
export function updateLyricsWordDisplay(screen, lineWords, windowStart, activeWordIndex, lineIndex, totalLines, wordsCompleted, totalWords) {
    const container = screen.wordContainer;
    container.removeChildren();

    const windowEnd  = Math.min(windowStart + LYRICS_WINDOW_SIZE, lineWords.length);
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

    // Update progress bar fill
    if (screen.progressBarFill && totalWords > 0) {
        FontManager.drawProgressFill(screen.progressBarFill, (wordsCompleted + 1) / totalWords);
    }

    // Update progress label
    const pct = totalWords > 0 ? Math.round(((wordsCompleted + 1) / totalWords) * 100) : 0;
    screen.progressText.text = `${pct}% Complete  (Line ${lineIndex + 1} / ${totalLines})`;
    screen.progressText.x = layoutManager.centerX();
}

/**
 * Create a simple "The End" screen shown when all lyrics are complete.
 *
 * @param {Object}   callbacks
 * @param {Function} callbacks.onContinue - Called when the Continue button is pressed
 * @returns {PIXI.Container}
 */
export function createLyricsEndScreen(callbacks) {
    const screen = new PIXI.Container();

    const gameArea = layoutManager.getGameArea();

    const titleText = new PIXI.Text('The End', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(144),
        fontWeight: 'bold',
        fill: 0x00aa00,
        align: 'center',
    });
    titleText.anchor.set(0.5);
    titleText.x = layoutManager.centerX();
    titleText.y = gameArea.y + gameArea.height * 0.35;
    screen.addChild(titleText); // child[0]

    const subText = new PIXI.Text('You made it through all the lyrics!', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(52),
        fill: 0x555555,
        align: 'center',
    });
    subText.anchor.set(0.5);
    subText.x = layoutManager.centerX();
    subText.y = gameArea.y + gameArea.height * 0.52;
    screen.addChild(subText); // child[1]

    const continueBtn = createButton('Continue', layoutManager.centerX(), gameArea.y + gameArea.height * 0.70);
    continueBtn.on('pointerdown', () => { if (callbacks.onContinue) callbacks.onContinue(); });
    screen.addChild(continueBtn); // child[2]

    screen.titleText  = titleText;
    screen.subText    = subText;
    screen.continueButton = continueBtn;

    return screen;
}

/**
 * Reposition the lyrics end screen elements after a window resize.
 * @param {PIXI.Container} screen
 */
export function updateLyricsEndScreenLayout(screen) {
    if (!screen) return;
    const gameArea = layoutManager.getGameArea();

    if (screen.titleText) {
        screen.titleText.x = layoutManager.centerX();
        screen.titleText.y = gameArea.y + gameArea.height * 0.35;
        screen.titleText.style.fontSize = layoutManager.scaleFontSize(144);
    }
    if (screen.subText) {
        screen.subText.x = layoutManager.centerX();
        screen.subText.y = gameArea.y + gameArea.height * 0.52;
        screen.subText.style.fontSize = layoutManager.scaleFontSize(52);
    }
    if (screen.continueButton) {
        screen.continueButton.x = layoutManager.centerX();
        screen.continueButton.y = gameArea.y + gameArea.height * 0.70;
    }
}
/**
 * Reposition all static elements of the lyrics screen after a window resize.
 * @param {PIXI.Container} screen - Lyrics screen returned by createLyricsScreen
 */
export function updateLyricsScreenLayout(screen) {
    if (!screen) return;

    const buttonLayout = layoutManager.getNavigationButtons();

    FontManager.repositionProgressBar(screen.progressBarBg, screen.progressBarFill, screen.progressText);
    if (screen.backButton) {
        screen.backButton.x = buttonLayout.back.x;
        screen.backButton.y = buttonLayout.back.y;
    }
    if (screen.nextButton) {
        screen.nextButton.x = buttonLayout.next.x;
        screen.nextButton.y = buttonLayout.next.y;
    }
}
