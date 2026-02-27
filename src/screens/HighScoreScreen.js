/**
 * High Score Screen Module
 *
 * Exports two screen factories and two update helpers:
 *
 *   createHighScoreInputScreen(app, callbacks)
 *     children: [0] congratsText, [1] instructions, [2] inputDisplay,
 *               [3] controlsText, [4] submitButton
 *
 *   createHighScoreViewScreen(app, callbacks)
 *     children: [0] titleText, [1] scoresContainer, [2] backButton
 *
 *   updateHighScoreInput(screen, initials)
 *     — Call whenever the player types a letter or backspaces.
 *
 *   updateHighScoreView(screen, gameData, newScore?)
 *     — Call to fully repopulate the leaderboard display.
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';

// ─── Input screen ─────────────────────────────────────────────────────────────

/**
 * @param {PIXI.Application} app
 * @param {Object}           callbacks
 * @param {Function}         callbacks.onSubmit - Player confirmed their initials
 * @returns {PIXI.Container}
 */
export function createHighScoreInputScreen(app, callbacks) {
    const screen = new PIXI.Container();
    const cx = app.screen.width / 2;

    const congratsText = new PIXI.Text('New High Score!', {
        fontFamily: 'Arial', fontSize: 48, fontWeight: 'bold',
        fill: 0xFFD700, align: 'center'
    });
    congratsText.anchor.set(0.5);
    congratsText.x = cx;
    congratsText.y = app.screen.height / 4;
    screen.addChild(congratsText); // [0]

    const instructionsText = new PIXI.Text('Enter your initials (3 letters):', {
        fontFamily: 'Arial', fontSize: 24, fill: 0x333333, align: 'center'
    });
    instructionsText.anchor.set(0.5);
    instructionsText.x = cx;
    instructionsText.y = app.screen.height / 2 - 60;
    screen.addChild(instructionsText); // [1]

    const inputDisplay = new PIXI.Text('___', {
        fontFamily: 'Courier New', fontSize: 48, fontWeight: 'bold',
        fill: 0x000000, align: 'center'
    });
    inputDisplay.anchor.set(0.5);
    inputDisplay.x = cx;
    inputDisplay.y = app.screen.height / 2;
    screen.addChild(inputDisplay); // [2]

    const controlsText = new PIXI.Text('Type your initials and press ENTER\n(or click Submit)', {
        fontFamily: 'Arial', fontSize: 18, fill: 0x666666, align: 'center'
    });
    controlsText.anchor.set(0.5);
    controlsText.x = cx;
    controlsText.y = app.screen.height / 2 + 60;
    screen.addChild(controlsText); // [3]

    const submitButton = createButton('Submit', cx, app.screen.height / 2 + 120);
    submitButton.on('pointerdown', () => {
        if (callbacks.onSubmit) callbacks.onSubmit();
    });
    screen.addChild(submitButton); // [4]

    return screen;
}

/**
 * Refresh the three-character initials display.
 * @param {PIXI.Container} screen   - The highScoreInput screen
 * @param {string}         initials - Current string (0–3 chars)
 */
export function updateHighScoreInput(screen, initials) {
    if (!screen || !screen.visible) return;
    screen.children[2].text = initials.padEnd(3, '_');
}

// ─── View screen ──────────────────────────────────────────────────────────────

/**
 * @param {PIXI.Application} app
 * @param {Object}           callbacks
 * @param {Function}         callbacks.onBack - Return to title
 * @returns {PIXI.Container}
 */
export function createHighScoreViewScreen(app, callbacks) {
    const screen = new PIXI.Container();

    const titleText = new PIXI.Text('High Scores', {
        fontFamily: 'Arial', fontSize: 48, fontWeight: 'bold',
        fill: 0x333333, align: 'center'
    });
    titleText.anchor.set(0.5);
    titleText.x = app.screen.width / 2;
    titleText.y = 80;
    screen.addChild(titleText); // [0]

    const scoresContainer = new PIXI.Container();
    scoresContainer.x = app.screen.width / 2;
    scoresContainer.y = 150;
    screen.addChild(scoresContainer); // [1]

    const backButton = createButton('Back to Title', app.screen.width / 2, app.screen.height - 100);
    backButton.on('pointerdown', () => {
        if (callbacks.onBack) callbacks.onBack();
    });
    screen.addChild(backButton); // [2]

    return screen;
}

/**
 * Repopulate the high score leaderboard.
 * @param {PIXI.Container}  screen   - The highScoreView screen
 * @param {GameDataManager} gameData
 * @param {Object|null}     newScore - {time, initials, wordsCount} for the just-finished session
 */
export function updateHighScoreView(screen, gameData, newScore = null) {
    if (!screen) return;

    const scoresContainer = screen.children[1];
    scoresContainer.removeChildren();

    const scores = gameData.getHighScores();

    if (scores.topTen.length === 0 && !newScore) {
        const noScoresText = new PIXI.Text(
            'No high scores yet!\n\nComplete the word practice to set your first score.',
            { fontFamily: 'Arial', fontSize: 24, fill: 0x666666, align: 'center' }
        );
        noScoresText.anchor.set(0.5);
        scoresContainer.addChild(noScoresText);
        return;
    }

    // Top-ten rows
    scores.topTen.forEach((score, index) => {
        const isNewScore = newScore &&
            score.time === newScore.time &&
            score.initials === newScore.initials;

        const line = `${(index + 1 + '.').padEnd(4)} ${score.initials.padEnd(4)} ` +
                     `${(score.time + 's').padEnd(8)} ${score.wordsCount} words`;

        const scoreText = new PIXI.Text(line, {
            fontFamily: 'Courier New',
            fontSize: index === 0 ? 20 : 18,
            fontWeight: (index === 0 || isNewScore) ? 'bold' : 'normal',
            fill: index === 0 ? 0xFFD700 : (isNewScore ? 0x00AA00 : 0x333333),
            align: 'left'
        });
        scoreText.anchor.set(0.5, 0);
        scoreText.y = index * 30;
        scoresContainer.addChild(scoreText);
    });

    // Current score if it didn't make the top ten
    if (newScore && !gameData.isTopTenScore(newScore.time, newScore.wordsCount)) {
        const separator = new PIXI.Text('─────────────────────', {
            fontFamily: 'Courier New', fontSize: 16, fill: 0x999999, align: 'center'
        });
        separator.anchor.set(0.5, 0);
        separator.y = scores.topTen.length * 30 + 15;
        scoresContainer.addChild(separator);

        const label = new PIXI.Text('CURRENT SCORE', {
            fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold',
            fill: 0x666666, align: 'center'
        });
        label.anchor.set(0.5, 0);
        label.y = scores.topTen.length * 30 + 35;
        scoresContainer.addChild(label);

        const currentText = new PIXI.Text(
            `${newScore.initials.padEnd(4)} ${newScore.time}s`.padEnd(12) + ` ${newScore.wordsCount} words`,
            { fontFamily: 'Courier New', fontSize: 18, fontWeight: 'bold', fill: 0x0066CC, align: 'center' }
        );
        currentText.anchor.set(0.5, 0);
        currentText.y = scores.topTen.length * 30 + 55;
        scoresContainer.addChild(currentText);
    }

    // Historical count footer
    const historicalOffset = newScore && !gameData.isTopTenScore(newScore.time, newScore.wordsCount) ? 100 : 20;
    if (scores.historical.length > 0) {
        const historicalText = new PIXI.Text(
            `\n${scores.historical.length} historical scores tracked`,
            { fontFamily: 'Arial', fontSize: 14, fill: 0x888888, align: 'center' }
        );
        historicalText.anchor.set(0.5, 0);
        historicalText.y = scores.topTen.length * 30 + historicalOffset;
        scoresContainer.addChild(historicalText);
    }
}
