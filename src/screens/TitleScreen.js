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

    // Flying star                       child[4]
    const star = new PIXI.Text('⭐', {
        fontSize: layoutManager.scaleFontSize(288)
    });
    star.anchor.set(0.5);
    star.alpha = 0;
    titleScreen.addChild(star);

    // ── Tween-in animation ──────────────────────────────────────────────────
    let tweenTickerFn = null;

    titleScreen.onActivate = () => {
        if (tweenTickerFn) {
            app.ticker.remove(tweenTickerFn);
            tweenTickerFn = null;
        }

        const tl     = layoutManager.getTitleScreen();
        const ga     = layoutManager.getGameArea();

        // Target positions
        const titleTargetY   = tl.logoY;
        const playTargetY    = tl.grid.topLeft.y;
        const optTargetX     = tl.grid.bottomLeft.x;
        const hsTargetX      = tl.grid.bottomRight.x;
        const buttonsTargetY = tl.grid.bottomLeft.y;

        // Start positions (off-screen)
        const titleStartY  = ga.y - 300;
        const playStartY   = ga.y + ga.height + 300;
        const optStartX    = ga.x - 500;
        const hsStartX     = ga.x + ga.width + 500;

        // Star arc — quadratic bezier from lower-left to upper-right
        // P0: lower-left corner area
        const starP0x = ga.x + layoutManager.scale(80);
        const starP0y = ga.y + ga.height - layoutManager.scale(80);
        // P2: upper-right corner area
        const starP2x = ga.x + ga.width  - layoutManager.scale(150);
        const starP2y = ga.y + layoutManager.scale(150);
        // P1 (control point): pulls the arc outward through the upper-left area
        const starP1x = ga.x + ga.width  * 0.25;
        const starP1y = ga.y + layoutManager.scale(60);

        star.alpha    = 0;
        star.rotation = 0;
        star.x = starP0x;
        star.y = starP0y;

        // Snap all UI elements to their start positions
        title.x          = tl.centerX;
        title.y          = titleStartY;
        title.alpha      = 0;

        playButton.x     = tl.centerX;
        playButton.y     = playStartY;
        playButton.alpha = 0;

        optionsButton.x     = optStartX;
        optionsButton.y     = buttonsTargetY;
        optionsButton.alpha = 0;

        highScoresButton.x     = hsStartX;
        highScoresButton.y     = buttonsTargetY;
        highScoresButton.alpha = 0;

        let elapsed = 0;
        const duration = 1400; // ms — doubled so the star arc is clearly visible

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        tweenTickerFn = () => {
            elapsed += app.ticker.elapsedMS;
            const t    = Math.min(elapsed / duration, 1);
            const ease = easeOut(t);

            title.y          = titleStartY + (titleTargetY  - titleStartY)  * ease;
            title.alpha      = ease;

            playButton.y     = playStartY  + (playTargetY   - playStartY)   * ease;
            playButton.alpha = ease;

            optionsButton.x     = optStartX  + (optTargetX  - optStartX)   * ease;
            optionsButton.alpha = ease;

            highScoresButton.x     = hsStartX + (hsTargetX  - hsStartX)    * ease;
            highScoresButton.alpha = ease;

            // Star: quadratic bezier position
            const mt = 1 - t;
            star.x = mt * mt * starP0x + 2 * mt * t * starP1x + t * t * starP2x;
            star.y = mt * mt * starP0y + 2 * mt * t * starP1y + t * t * starP2y;
            // Fade in quickly, then fade out in the last 25%
            star.alpha    = t < 0.15 ? t / 0.15 : (t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1);
            star.rotation = t * Math.PI * 2; // one full spin over the arc

            if (t >= 1) {
                title.y          = titleTargetY;   title.alpha          = 1;
                playButton.y     = playTargetY;    playButton.alpha     = 1;
                optionsButton.x  = optTargetX;     optionsButton.alpha  = 1;
                highScoresButton.x = hsTargetX;    highScoresButton.alpha = 1;
                star.alpha       = 0; // gone after arc
                app.ticker.remove(tweenTickerFn);
                tweenTickerFn = null;
            }
        };

        app.ticker.add(tweenTickerFn);
    };

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
    titleScreen.children[0].alpha = 1;

    // Play  (top-center)
    if (titleScreen.children[1]) {
        titleScreen.children[1].x = titleLayout.centerX;
        titleScreen.children[1].y = titleLayout.grid.topLeft.y;
        titleScreen.children[1].alpha = 1;
    }

    // Options (bottom-left)
    if (titleScreen.children[2]) {
        titleScreen.children[2].x = titleLayout.grid.bottomLeft.x;
        titleScreen.children[2].y = titleLayout.grid.bottomLeft.y;
        titleScreen.children[2].alpha = 1;
    }

    // High Score (bottom-right)
    if (titleScreen.children[3]) {
        titleScreen.children[3].x = titleLayout.grid.bottomRight.x;
        titleScreen.children[3].y = titleLayout.grid.bottomRight.y;
        titleScreen.children[3].alpha = 1;
    }
}