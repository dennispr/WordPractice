/**
 * Mode Select Screen - Lets the player choose between Homework, Practice, and Race
 *
 * Features:
 * - Three mode buttons that tween in from the sides on activation
 *   - Homework  : slides in from the left
 *   - Practice  : slides up from the bottom
 *   - Race      : slides in from the right
 * - Back button returns to the Title screen
 */

import * as PIXI from 'pixi.js';
import { createButton } from '../ui/Button.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Create the mode select screen
 * @param {PIXI.Application} app        - The main PIXI application (needed for ticker)
 * @param {Object}           callbacks
 * @param {Function}         callbacks.onHomework - Homework mode selected
 * @param {Function}         callbacks.onPractice - Practice mode selected
 * @param {Function}         callbacks.onRace     - Race mode selected
 * @param {Function}         callbacks.onBack     - Back to title
 * @returns {PIXI.Container} The screen container
 */
export function createModeSelectScreen(app, callbacks) {
    const screen = new PIXI.Container();

    // ── Title ────────────────────────────────────────────────────────────────
    const titleText = new PIXI.Text('Select Mode', {
        fontFamily: 'Arial',
        fontSize: layoutManager.scaleFontSize(100),
        fontWeight: 'bold',
        fill: 0x333333,
        align: 'center'
    });
    titleText.anchor.set(0.5);
    titleText.x = layoutManager.centerX();
    titleText.y = layoutManager.getGameArea().y + layoutManager.getGameArea().height * 0.25;
    screen.addChild(titleText); // child[0]

    // ── Mode buttons (positions reset during onActivate tween) ───────────────
    const homeworkBtn = createButton('Homework', 0, 0);
    homeworkBtn.on('pointerdown', () => { if (callbacks.onHomework) callbacks.onHomework(); });
    screen.addChild(homeworkBtn); // child[1]

    const practiceBtn = createButton('Practice', 0, 0);
    practiceBtn.on('pointerdown', () => { if (callbacks.onPractice) callbacks.onPractice(); });
    screen.addChild(practiceBtn); // child[2]

    const raceBtn = createButton('Race', 0, 0);
    raceBtn.on('pointerdown', () => { if (callbacks.onRace) callbacks.onRace(); });
    screen.addChild(raceBtn); // child[3]

    // ── Back button ───────────────────────────────────────────────────────────
    const backBtn = createButton('Back', layoutManager.centerX(),
        layoutManager.getGameArea().y + layoutManager.getGameArea().height * 0.85);
    backBtn.on('pointerdown', () => { if (callbacks.onBack) callbacks.onBack(); });
    screen.addChild(backBtn); // child[4]

    // ── Tween-in animation (runs every time the screen is shown) ─────────────
    let tweenTickerFn = null;

    screen.onActivate = () => {
        // Cancel any running tween first
        if (tweenTickerFn) {
            app.ticker.remove(tweenTickerFn);
            tweenTickerFn = null;
        }

        // Resolve layout values fresh each activation (handles window resize)
        const centerX  = layoutManager.centerX();
        const gameArea = layoutManager.getGameArea();
        const buttonY  = gameArea.y + gameArea.height * 0.55;
        const spacing  = layoutManager.scale(560);

        const homeworkTargetX = centerX - spacing;
        const practiceTargetX = centerX;
        const raceTargetX     = centerX + spacing;

        const startLeft   = gameArea.x - 500;
        const startRight  = gameArea.x + gameArea.width + 500;
        const startBottom = gameArea.y + gameArea.height + 400;

        // Also update the title & back button positions in case of resize
        titleText.x = centerX;
        titleText.y = gameArea.y + gameArea.height * 0.25;
        titleText.style.fontSize = layoutManager.scaleFontSize(100);

        backBtn.x = centerX;
        backBtn.y = gameArea.y + gameArea.height * 0.85;

        // Place mode buttons at their start (off-screen) positions
        homeworkBtn.x = startLeft;
        homeworkBtn.y = buttonY;

        practiceBtn.x = practiceTargetX;
        practiceBtn.y = startBottom;

        raceBtn.x = startRight;
        raceBtn.y = buttonY;

        // Run the tween
        let elapsed = 0;
        const duration = 600; // ms

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        tweenTickerFn = function () {
            elapsed += app.ticker.elapsedMS;
            const t    = Math.min(elapsed / duration, 1);
            const ease = easeOut(t);

            homeworkBtn.x = startLeft   + (homeworkTargetX - startLeft)   * ease;
            practiceBtn.y = startBottom + (buttonY         - startBottom)  * ease;
            raceBtn.x     = startRight  + (raceTargetX     - startRight)   * ease;

            if (t >= 1) {
                // Snap to exact targets
                homeworkBtn.x = homeworkTargetX;
                practiceBtn.y = buttonY;
                raceBtn.x     = raceTargetX;
                app.ticker.remove(tweenTickerFn);
                tweenTickerFn = null;
            }
        };

        app.ticker.add(tweenTickerFn);
    };

    return screen;
}

/**
 * Update the mode select screen layout after a window resize.
 * Only repositions elements that are already at their target (resting) positions.
 * The tween will recalculate fresh targets on the next activation anyway.
 * @param {PIXI.Container} screen - The mode select screen container
 */
export function updateModeSelectScreenLayout(screen) {
    if (!screen || screen.children.length < 5) return;

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const buttonY  = gameArea.y + gameArea.height * 0.55;
    const spacing  = layoutManager.scale(560);

    // Title
    screen.children[0].x = centerX;
    screen.children[0].y = gameArea.y + gameArea.height * 0.25;
    screen.children[0].style.fontSize = layoutManager.scaleFontSize(100);

    // Mode buttons (resting positions)
    screen.children[1].x = centerX - spacing; // Homework
    screen.children[1].y = buttonY;

    screen.children[2].x = centerX;           // Practice
    screen.children[2].y = buttonY;

    screen.children[3].x = centerX + spacing; // Race
    screen.children[3].y = buttonY;

    // Back button
    screen.children[4].x = centerX;
    screen.children[4].y = gameArea.y + gameArea.height * 0.85;
}
