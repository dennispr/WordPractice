// FontManager module - Manages font selection and word display functionality
import * as PIXI from 'pixi.js';

/**
 * Font management class for handling font selection and word display
 */
export class FontManager {
    /**
     * System fonts array - at least 5 different fonts for variety
     */
    static FONTS = [
        'Arial',
        'Georgia', 
        'Times New Roman',
        'Courier New',
        'Verdana',
        'Comic Sans MS'
    ];

    /**
     * Currently selected font name
     * @type {string}
     */
    static currentFont = null;

    /**
     * Gets a random font from the available fonts array
     * @returns {string} Random font family name
     */
    static getRandomFont() {
        return this.FONTS[Math.floor(Math.random() * this.FONTS.length)];
    }

    /**
     * Gets the currently selected font
     * @returns {string|null} Current font family name
     */
    static getCurrentFont() {
        return this.currentFont;
    }

    /**
     * Sets the current font
     * @param {string} fontFamily - Font family name to set as current
     */
    static setCurrentFont(fontFamily) {
        this.currentFont = fontFamily;
    }

    /**
     * Gets all available fonts
     * @returns {string[]} Array of font family names
     */
    static getAvailableFonts() {
        return [...this.FONTS]; // Return a copy to prevent modification
    }

    /**
     * Processes a word for display, applying special replacements like emojis
     * @param {string} word - The word to process
     * @returns {string} The processed word with any special replacements
     */
    static processWordForDisplay(word) {
        if (!word) return word;
        
        // Convert to lowercase for comparison but preserve original case for other words
        const lowerWord = word.toLowerCase();
        
        // Special emoji replacements
        switch (lowerWord) {
            case 'look':
                return 'l👀k';
            default:
                return word;
        }
    }

    /**
     * Creates a word display PIXI text element with default styling
     * @param {PIXI.Container} parentContainer - Container to add the text element to
     * @param {Object} app - PIXI application instance for screen dimensions
     * @param {Object} options - Optional styling overrides
     * @param {string} options.fontFamily - Font family override
     * @param {number} options.fontSize - Font size override
     * @param {string} options.fontWeight - Font weight override
     * @param {number} options.fill - Text color override
     * @param {string} options.align - Text alignment override
     * @returns {PIXI.Text} The created word display text element
     */
    static createWordDisplay(parentContainer, app, options = {}) {
        const textStyle = {
            fontFamily: options.fontFamily || 'Arial',
            fontSize: options.fontSize || 64,
            fontWeight: options.fontWeight || 'bold',
            fill: options.fill !== undefined ? options.fill : 0x000000,
            align: options.align || 'center',
            ...options // Allow any additional text style properties
        };

        const wordDisplay = new PIXI.Text('', textStyle);
        wordDisplay.anchor.set(0.5);
        wordDisplay.x = app.screen.width / 2;
        wordDisplay.y = app.screen.height / 2;
        
        if (parentContainer) {
            parentContainer.addChild(wordDisplay);
        }
        
        return wordDisplay; 
    }

    /**
     * Updates word display element with new text and random font
     * @param {PIXI.Text} wordDisplayElement - The text element to update
     * @param {string} word - The word to display
     * @param {number} wordIndex - Current word index (0-based)
     * @param {number} totalWords - Total number of words
     * @param {Object} options - Update options
     * @param {boolean} options.randomizeFont - Whether to use a random font (default: true)
     * @param {string} options.fontFamily - Specific font to use (overrides randomization)
     * @param {boolean} options.logToConsole - Whether to log word changes (default: true)
     */
    static updateWordDisplay(wordDisplayElement, word, wordIndex, totalWords, options = {}) {
        if (!wordDisplayElement || !word) {
            console.warn('FontManager.updateWordDisplay: Invalid parameters provided');
            return;
        }

        const {
            randomizeFont = true,
            fontFamily = null,
            logToConsole = true
        } = options;

        // Set the word text with special emoji replacements
        const displayWord = this.processWordForDisplay(word);
        wordDisplayElement.text = displayWord;

        // Handle font selection
        let selectedFont;
        if (fontFamily) {
            selectedFont = fontFamily;
        } else if (randomizeFont) {
            selectedFont = this.getRandomFont();
        } else {
            selectedFont = this.currentFont || 'Arial';
        }

        // Apply the font
        wordDisplayElement.style.fontFamily = selectedFont;
        this.setCurrentFont(selectedFont);

        // Log the change if enabled
        if (logToConsole) {
            console.log(`Word ${wordIndex + 1}/${totalWords}: "${word}" in ${selectedFont}`);
        }
    }

    /**
     * Updates the position of a word display element (useful for responsive design)
     * @param {PIXI.Text} wordDisplayElement - The text element to reposition
     * @param {Object} app - PIXI application instance
     * @param {number} xOffset - X offset from center (default: 0)
     * @param {number} yOffset - Y offset from center (default: 0)
     */
    static updateWordDisplayPosition(wordDisplayElement, app, xOffset = 0, yOffset = 0) {
        if (wordDisplayElement && app) {
            wordDisplayElement.x = app.screen.width / 2 + xOffset;
            wordDisplayElement.y = app.screen.height / 2 + yOffset;
        }
    }

    /**
     * Creates a styled text element with font management
     * @param {string} text - Text content
     * @param {Object} style - PIXI text style object
     * @param {Object} position - Position object with x and y properties
     * @param {boolean} useRandomFont - Whether to use a random font instead of the style font
     * @returns {PIXI.Text} Styled text element
     */
    static createStyledText(text, style = {}, position = {}, useRandomFont = false) {
        const textStyle = {
            fontFamily: useRandomFont ? this.getRandomFont() : (style.fontFamily || 'Arial'),
            fontSize: style.fontSize || 24,
            fontWeight: style.fontWeight || 'normal',
            fill: style.fill !== undefined ? style.fill : 0x000000,
            align: style.align || 'left',
            ...style
        };

        const textElement = new PIXI.Text(text, textStyle);
        
        if (position.x !== undefined) textElement.x = position.x;
        if (position.y !== undefined) textElement.y = position.y;
        
        // Set anchor if provided
        if (style.anchor !== undefined) {
            if (Array.isArray(style.anchor)) {
                textElement.anchor.set(style.anchor[0], style.anchor[1]);
            } else if (typeof style.anchor === 'number') {
                textElement.anchor.set(style.anchor);
            }
        }

        return textElement;
    }
}