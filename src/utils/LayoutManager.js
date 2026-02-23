/**
 * Layout Manager - Centralized responsive layout system
 * 
 * Maintains 16:9 aspect ratio while scaling to fit different screen sizes.
 * Provides consistent spacing and positioning for all UI elements.
 */

export class LayoutManager {
    constructor() {
        this.targetAspectRatio = 16 / 9;
        this.baseWidth = 1600;  // Base design width (16:9)
        this.baseHeight = 900;  // Base design height (16:9)
        
        this.currentScale = 1;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.gameArea = { width: this.baseWidth, height: this.baseHeight, x: 0, y: 0 };
        this.screenArea = { width: window.innerWidth, height: window.innerHeight };
        
        this.calculateLayout();
        
        // Layout constants - all values are for base resolution and will be scaled
        this.layout = {
            // Margins and padding
            margins: {
                screen: 40,
                component: 20,
                small: 10
            },
            
            // Button sizing and positioning (doubled from original)
            buttons: {
                width: 400,  // Doubled from 200
                height: 120, // Doubled from 60
                fontSize: 48, // Doubled from 24
                spacing: 480, // Doubled from 240 - distance between button centers
                bottomOffset: 200 // Doubled from 100
            },
            
            // Progress bar (doubled)
            progressBar: {
                width: 800,  // Doubled from 400
                height: 40,  // Doubled from 20
                bottomOffset: 100, // Doubled from 50
                textOffset: 60  // Doubled from 30 - Text below progress bar
            },
            
            // Word display (doubled)
            wordDisplay: {
                centerY: 0.4, // Percentage from top (40% down)
                fontSize: {
                    base: 96,  // Doubled from 48
                    large: 128, // Doubled from 64
                    small: 72   // Doubled from 36
                }
            },
            
            // Race track (doubled)
            raceTrack: {
                topOffset: 40,  // Doubled from 20
                width: 0.85, // Percentage of game width
                height: 160,  // Doubled from 80
                margin: 100   // Doubled from 50
            },
            
            // Title screen (2x2 button grid)
            title: {
                logoY: 0.25, // 25% from top
                buttonSpacing: 160,  // Doubled from 80 - vertical spacing between rows
                horizontalSpacing: 560, // Button width (400) + gap (160) for proper spacing
                startY: 0.63, // Moved down by ~1 button height (was 0.5)
                gridColumns: 2, // 2x2 grid
                gridRows: 2
            },
            
            // End screen (doubled spacing)
            endScreen: {
                titleY: 0.2,
                statsY: 0.35,
                buttonY: 0.7,
                spacing: 80  // Doubled from 40
            }
        };
    }
    
    /**
     * Calculate the current layout based on screen size
     */
    calculateLayout() {
        this.screenArea.width = window.innerWidth;
        this.screenArea.height = window.innerHeight;
        
        const screenAspect = this.screenArea.width / this.screenArea.height;
        
        if (screenAspect > this.targetAspectRatio) {
            // Screen is wider than 16:9 - fit by height
            this.gameArea.height = this.screenArea.height;
            this.gameArea.width = this.gameArea.height * this.targetAspectRatio;
            this.gameArea.x = (this.screenArea.width - this.gameArea.width) / 2;
            this.gameArea.y = 0;
        } else {
            // Screen is taller than 16:9 - fit by width
            this.gameArea.width = this.screenArea.width;
            this.gameArea.height = this.gameArea.width / this.targetAspectRatio;
            this.gameArea.x = 0;
            this.gameArea.y = (this.screenArea.height - this.gameArea.height) / 2;
        }
        
        this.currentScale = this.gameArea.width / this.baseWidth;
    }
    
    /**
     * Get scaled value for the current resolution with font optimization
     * @param {number} baseValue - Value at base resolution
     * @returns {number} Scaled value
     */
    scale(baseValue) {
        return baseValue * this.currentScale;
    }
    
    /**
     * Get font size optimized for current resolution to reduce blurriness
     * @param {number} baseFontSize - Font size at base resolution
     * @returns {number} Optimized font size
     */
    scaleFontSize(baseFontSize) {
        // Scale font size and round to avoid sub-pixel rendering issues
        const scaledSize = baseFontSize * this.currentScale;
        // Round to nearest even number for better rendering
        return Math.round(scaledSize / 2) * 2;
    }
    
    /**
     * Get X coordinate relative to game area
     * @param {number} x - X position in base coordinates
     * @returns {number} Scaled X coordinate
     */
    x(x) {
        return this.gameArea.x + (x * this.currentScale);
    }
    
    /**
     * Get Y coordinate relative to game area
     * @param {number} y - Y position in base coordinates
     * @returns {number} Scaled Y coordinate
     */
    y(y) {
        return this.gameArea.y + (y * this.currentScale);
    }
    
    /**
     * Get center X coordinate of game area
     * @returns {number} Center X coordinate
     */
    centerX() {
        return this.gameArea.x + (this.gameArea.width / 2);
    }
    
    /**
     * Get center Y coordinate of game area
     * @returns {number} Center Y coordinate
     */
    centerY() {
        return this.gameArea.y + (this.gameArea.height / 2);
    }
    
    /**
     * Get full screen dimensions (for backgrounds)
     * @returns {Object} Screen dimensions
     */
    getScreenDimensions() {
        return {
            width: this.screenArea.width,
            height: this.screenArea.height
        };
    }
    
    /**
     * Get game area dimensions (16:9 content area)
     * @returns {Object} Game area dimensions and position
     */
    getGameArea() {
        return { ...this.gameArea };
    }
    
    /**
     * Get navigation button positions
     * @returns {Object} Button positions
     */
    getNavigationButtons() {
        const spacing = this.scale(this.layout.buttons.spacing);
        const bottomOffset = this.scale(this.layout.buttons.bottomOffset);
        const buttonWidth = this.scale(this.layout.buttons.width);
        
        return {
            back: {
                x: this.centerX() - spacing / 2,
                y: this.gameArea.y + this.gameArea.height - bottomOffset,
                width: buttonWidth,
                height: this.scale(this.layout.buttons.height)
            },
            next: {
                x: this.centerX() + spacing / 2,
                y: this.gameArea.y + this.gameArea.height - bottomOffset,
                width: buttonWidth,
                height: this.scale(this.layout.buttons.height)
            }
        };
    }
    
    /**
     * Get progress bar layout
     * @returns {Object} Progress bar position and size
     */
    getProgressBar() {
        const width = this.scale(this.layout.progressBar.width);
        const height = this.scale(this.layout.progressBar.height);
        const bottomOffset = this.scale(this.layout.progressBar.bottomOffset);
        
        return {
            x: this.centerX() - width / 2,
            y: this.gameArea.y + this.gameArea.height - bottomOffset,
            width: width,
            height: height,
            textY: this.gameArea.y + this.gameArea.height - this.scale(this.layout.progressBar.textOffset)
        };
    }
    
    /**
     * Get word display position
     * @returns {Object} Word display position
     */
    getWordDisplay() {
        return {
            x: this.centerX(),
            y: this.gameArea.y + (this.gameArea.height * this.layout.wordDisplay.centerY),
            fontSize: this.scaleFontSize(this.layout.wordDisplay.fontSize.base)
        };
    }
    
    /**
     * Get race track layout
     * @returns {Object} Race track position and dimensions
     */
    getRaceTrack() {
        const width = this.gameArea.width * this.layout.raceTrack.width;
        const height = this.scale(this.layout.raceTrack.height);
        const margin = this.scale(this.layout.raceTrack.margin);
        
        return {
            x: this.gameArea.x + (this.gameArea.width - width) / 2,
            y: this.gameArea.y + this.scale(this.layout.raceTrack.topOffset),
            width: width,
            height: height,
            startX: this.gameArea.x + margin,
            endX: this.gameArea.x + this.gameArea.width - margin
        };
    }
    
    /**
     * Get title screen layout
     * @returns {Object} Title screen positions
     */
    getTitleScreen() {
        const logoY = this.gameArea.y + (this.gameArea.height * this.layout.title.logoY);
        const buttonStartY = this.gameArea.y + (this.gameArea.height * this.layout.title.startY);
        const verticalSpacing = this.scale(this.layout.title.buttonSpacing);
        const horizontalSpacing = this.scale(this.layout.title.horizontalSpacing);
        
        return {
            logoY: logoY,
            buttonY: buttonStartY,
            buttonSpacing: verticalSpacing,
            horizontalSpacing: horizontalSpacing,
            centerX: this.centerX(),
            // 2x2 grid positions
            grid: {
                topLeft: { x: this.centerX() - horizontalSpacing / 2, y: buttonStartY },
                topRight: { x: this.centerX() + horizontalSpacing / 2, y: buttonStartY },
                bottomLeft: { x: this.centerX() - horizontalSpacing / 2, y: buttonStartY + verticalSpacing },
                bottomRight: { x: this.centerX() + horizontalSpacing / 2, y: buttonStartY + verticalSpacing }
            }
        };
    }
    
    /**
     * Update layout on window resize
     */
    updateOnResize() {
        this.calculateLayout();
        // Update device pixel ratio in case monitor changed
        this.devicePixelRatio = window.devicePixelRatio || 1;
    }
    
    /**
     * Create a bounce animation for resize
     * @param {PIXI.Container} container - Container to animate
     * @param {Function} callback - Callback when animation completes
     */
    bounceResize(container, callback) {
        // Simple bounce effect
        container.scale.set(0.8);
        
        // Use a simple easing animation
        const startTime = performance.now();
        const duration = 300; // 300ms animation
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Bounce easing
            const bounceScale = 1 + Math.sin(progress * Math.PI) * 0.2;
            const scale = 0.8 + (0.2 * progress) + (bounceScale - 1) * (1 - progress);
            
            container.scale.set(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                container.scale.set(1);
                if (callback) callback();
            }
        };
        
        requestAnimationFrame(animate);
    }
}

// Singleton instance
export const layoutManager = new LayoutManager();