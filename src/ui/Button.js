// Button UI Component
import * as PIXI from 'pixi.js';

// Default button configuration
const DEFAULT_CONFIG = {
    width: 200,
    height: 60,
    borderRadius: 10,
    backgroundColor: 0x4CAF50,
    hoverColor: 0x45a049,
    textColor: 0xffffff,
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'bold'
};

/**
 * Creates a styled button with hover effects
 * @param {string} text - Button text
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} options - Optional configuration overrides
 * @returns {PIXI.Container} Button container
 */
export function createButton(text, x, y, options = {}) {
    // Merge options with defaults
    const config = { ...DEFAULT_CONFIG, ...options };
    
    const button = new PIXI.Container();
    button.x = x;
    button.y = y;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    
    // Button background
    const bg = new PIXI.Graphics();
    drawButtonBackground(bg, config.backgroundColor, config);
    button.addChild(bg);
    
    // Button text
    const buttonText = new PIXI.Text(text, {
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        fill: config.textColor,
        align: 'center'
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    // Hover effects
    button.on('pointerover', () => {
        drawButtonBackground(bg, config.hoverColor, config);
    });
    
    button.on('pointerout', () => {
        drawButtonBackground(bg, config.backgroundColor, config);
    });
    
    return button;
}

/**
 * Helper function to draw button background
 * @param {PIXI.Graphics} graphics - Graphics object to draw on
 * @param {number} color - Fill color
 * @param {Object} config - Button configuration
 */
function drawButtonBackground(graphics, color, config) {
    graphics.clear();
    graphics.beginFill(color);
    graphics.drawRoundedRect(
        -config.width / 2, 
        -config.height / 2, 
        config.width, 
        config.height, 
        config.borderRadius
    );
    graphics.endFill();
}

/**
 * Create a button with custom styling
 * @param {string} text - Button text
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} style - Custom style options
 * @returns {PIXI.Container} Styled button
 */
export function createCustomButton(text, x, y, style) {
    return createButton(text, x, y, style);
}