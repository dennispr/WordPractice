/**
 * ScreenManager - Centralized screen handling and transitions
 * 
 * Manages screen visibility, transitions, and state in a clean, maintainable way.
 * Eliminates the need for manual visibility management and scattered screen logic.
 */

export class ScreenManager {
    constructor() {
        this.screens = new Map();
        this.currentScreenName = null;
        this.currentScreen = null;
    }

    /**
     * Register a screen with the manager
     * @param {string} name - Screen identifier
     * @param {PIXI.Container} screen - Screen container
     */
    addScreen(name, screen) {
        this.screens.set(name, screen);
        screen.visible = false;
        console.log(`📺 Registered screen: ${name}`);
    }

    /**
     * Show a specific screen and hide all others
     * @param {string} name - Screen name to show
     * @returns {boolean} Success status
     */
    showScreen(name) {
        const screen = this.screens.get(name);
        
        if (!screen) {
            console.error(`❌ Screen '${name}' not found`);
            return false;
        }

        // Hide current screen
        if (this.currentScreen) {
            this.currentScreen.visible = false;
            console.log(`🙈 Hidden screen: ${this.currentScreenName}`);
        }

        // Show new screen
        screen.visible = true;
        this.currentScreen = screen;
        this.currentScreenName = name;
        
        console.log(`👁️ Showing screen: ${name}`);

        // Call screen-specific activation if available
        if (screen.onActivate && typeof screen.onActivate === 'function') {
            screen.onActivate();
        }

        return true;
    }

    /**
     * Get the currently active screen
     * @returns {string|null} Current screen name
     */
    getCurrentScreen() {
        return this.currentScreenName;
    }

    /**
     * Check if a specific screen is currently visible
     * @param {string} name - Screen name to check
     * @returns {boolean} Visibility status
     */
    isScreenVisible(name) {
        return this.currentScreenName === name;
    }

    /**
     * Hide all screens
     */
    hideAllScreens() {
        this.screens.forEach((screen, name) => {
            screen.visible = false;
        });
        this.currentScreen = null;
        this.currentScreenName = null;
        console.log('🙈 All screens hidden');
    }

    /**
     * Get all registered screen names
     * @returns {string[]} Array of screen names
     */
    getScreenNames() {
        return Array.from(this.screens.keys());
    }

    /**
     * Remove a screen from management
     * @param {string} name - Screen name to remove
     * @returns {boolean} Success status
     */
    removeScreen(name) {
        const screen = this.screens.get(name);
        if (screen) {
            if (this.currentScreenName === name) {
                this.hideAllScreens();
            }
            this.screens.delete(name);
            console.log(`🗑️ Removed screen: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Update screen-specific word text reference for active screen
     * This handles the current pattern where different screens have different wordText objects
     * @param {PIXI.Text} practiceWordText - Word text from practice screen
     * @param {PIXI.Text} raceWordText - Word text from race screen  
     * @returns {PIXI.Text|null} The appropriate wordText for current screen
     */
    getActiveWordText(practiceWordText, raceWordText) {
        switch (this.currentScreenName) {
            case 'race':
                return raceWordText;
            case 'practice':
                return practiceWordText;
            default:
                return null;
        }
    }
}

// Create singleton instance for global use
export const screenManager = new ScreenManager();