/**
 * Mode Select Screen - Lets the player choose between Homework, Practice, Race, and Lines
 *
 * Features:
 * - Four mode buttons arranged in a 2×2 grid that tween in on activation
 *   - Homework : slides in from the left  (top-left)
 *   - Practice : slides in from the right (top-right)
 *   - Race     : slides up from the bottom (bottom-left)
 *   - Lines    : slides up from the bottom (bottom-right)
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
 * @param {Function}         callbacks.onLines    - Lines mode selected
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
    titleText.y = layoutManager.getGameArea().y + layoutManager.getGameArea().height * 0.20;
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

    const linesBtn = createButton('Lines', 0, 0);
    linesBtn.on('pointerdown', () => { if (callbacks.onLines) callbacks.onLines(); });
    screen.addChild(linesBtn); // child[4]

    // ── Back button ───────────────────────────────────────────────────────────
    const backBtn = createButton('Back', layoutManager.centerX(),
        layoutManager.getGameArea().y + layoutManager.getGameArea().height * 0.85);
    backBtn.on('pointerdown', () => { if (callbacks.onBack) callbacks.onBack(); });
    screen.addChild(backBtn); // child[5]

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
        const hSpacing = layoutManager.scale(400);
        const buttonY1 = gameArea.y + gameArea.height * 0.43; // top row
        const buttonY2 = gameArea.y + gameArea.height * 0.65; // bottom row

        // 2×2 grid resting positions
        const homeworkTargetX = centerX - hSpacing; // top-left
        const practiceTargetX = centerX + hSpacing; // top-right
        const raceTargetX     = centerX - hSpacing; // bottom-left
        const linesTargetX    = centerX + hSpacing; // bottom-right

        const startLeft   = gameArea.x - 500;
        const startRight  = gameArea.x + gameArea.width + 500;
        const startBottom = gameArea.y + gameArea.height + 400;

        // Refresh title & back button in case of resize
        titleText.x = centerX;
        titleText.y = gameArea.y + gameArea.height * 0.20;
        titleText.style.fontSize = layoutManager.scaleFontSize(100);

        backBtn.x = centerX;
        backBtn.y = gameArea.y + gameArea.height * 0.85;

        // Place mode buttons at their start (off-screen) positions
        // Homework & Practice slide in from the sides (top row)
        homeworkBtn.x = startLeft;
        homeworkBtn.y = buttonY1;
        practiceBtn.x = startRight;
        practiceBtn.y = buttonY1;
        // Race & Lines rise from below (bottom row)
        raceBtn.x  = raceTargetX;
        raceBtn.y  = startBottom;
        linesBtn.x = linesTargetX;
        linesBtn.y = startBottom;

        // Run the tween
        let elapsed = 0;
        const duration = 600; // ms

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        tweenTickerFn = function () {
            elapsed += app.ticker.elapsedMS;
            const t    = Math.min(elapsed / duration, 1);
            const ease = easeOut(t);

            homeworkBtn.x = startLeft  + (homeworkTargetX - startLeft)  * ease;
            practiceBtn.x = startRight + (practiceTargetX - startRight) * ease;
            raceBtn.y     = startBottom + (buttonY2 - startBottom) * ease;
            linesBtn.y    = startBottom + (buttonY2 - startBottom) * ease;

            if (t >= 1) {
                // Snap to exact targets
                homeworkBtn.x = homeworkTargetX;
                practiceBtn.x = practiceTargetX;
                raceBtn.y     = buttonY2;
                linesBtn.y    = buttonY2;
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
    if (!screen || screen.children.length < 6) return;

    const centerX  = layoutManager.centerX();
    const gameArea = layoutManager.getGameArea();
    const hSpacing = layoutManager.scale(400);
    const buttonY1 = gameArea.y + gameArea.height * 0.43;
    const buttonY2 = gameArea.y + gameArea.height * 0.65;

    // Title
    screen.children[0].x = centerX;
    screen.children[0].y = gameArea.y + gameArea.height * 0.20;
    screen.children[0].style.fontSize = layoutManager.scaleFontSize(100);

    // Mode buttons – resting positions in 2×2 grid
    screen.children[1].x = centerX - hSpacing; // Homework (top-left)
    screen.children[1].y = buttonY1;

    screen.children[2].x = centerX + hSpacing; // Practice (top-right)
    screen.children[2].y = buttonY1;

    screen.children[3].x = centerX - hSpacing; // Race (bottom-left)
    screen.children[3].y = buttonY2;

    screen.children[4].x = centerX + hSpacing; // Lines (bottom-right)
    screen.children[4].y = buttonY2;

    // Back button
    screen.children[5].x = centerX;
    screen.children[5].y = gameArea.y + gameArea.height * 0.85;
}
