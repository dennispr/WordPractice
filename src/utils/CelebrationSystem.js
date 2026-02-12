// CelebrationSystem module - Handles celebration animations and effects
import * as PIXI from 'pixi.js';

/**
 * Celebration system for managing celebration animations, confetti, and effects
 */
export class CelebrationSystem {
    /**
     * Initialize the celebration system
     * @param {Object} app - PIXI application instance  
     * @param {PIXI.Container} parentContainer - Container to add celebrations to
     */
    constructor(app, parentContainer) {
        this.app = app;
        this.parentContainer = parentContainer;
        this.celebrationContainer = null;
        this.celebrationText = null;
        this.confettiParticles = [];
        this.celebrationActive = false;
        this.uiElements = {}; // Store references to UI elements to hide during celebration
        
        this.initializeCelebrationContainer();
    }

    /**
     * Initialize the celebration container
     */
    initializeCelebrationContainer() {
        this.celebrationContainer = new PIXI.Container();
        this.celebrationContainer.visible = false;
        this.parentContainer.addChild(this.celebrationContainer);
    }

    /**
     * Set UI elements that should be hidden during celebration
     * @param {Object} elements - Object containing UI element references
     */
    setUIElements(elements) {
        this.uiElements = elements;
    }

    /**
     * Create and show celebration with confetti and animation
     * @param {number} score - The score to display (usually time in seconds)
     * @param {string} message - Celebration message to show
     * @param {Object} options - Optional configuration
     * @param {number} options.duration - How long to show celebration (ms, default: 4000)
     * @param {Function} options.onComplete - Callback when celebration ends
     */
    createCelebration(score, message = 'GREAT JOB!', options = {}) {
        const { duration = 4000, onComplete } = options;
        
        this.celebrationActive = true;
        this.celebrationContainer.visible = true;
        this.celebrationContainer.removeChildren(); // Clear any existing celebration
        
        // Hide UI elements during celebration
        this.hideUIElements();
        
        // Create celebration text
        this.celebrationText = new PIXI.Text(`🎉 ${message} 🎉`, {
            fontFamily: 'Arial',
            fontSize: 48,
            fontWeight: 'bold',
            fill: 0xFFD700, // Gold
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 3
        });
        this.celebrationText.anchor.set(0.5);
        this.celebrationText.x = this.app.screen.width / 2;
        this.celebrationText.y = this.app.screen.height / 2 - 100;
        this.celebrationContainer.addChild(this.celebrationText);
        
        // Create score display
        const scoreText = new PIXI.Text(`${score} seconds!`, {
            fontFamily: 'Arial',
            fontSize: 32,
            fontWeight: 'bold',
            fill: 0xFFD700,
            align: 'center'
        });
        scoreText.anchor.set(0.5);
        scoreText.x = this.app.screen.width / 2;
        scoreText.y = this.app.screen.height / 2 - 50;
        this.celebrationContainer.addChild(scoreText);
        
        // Create confetti particles
        this.createConfetti();
        
        // Animate celebration text
        this.animateCelebrationText();
        
        // Auto-hide after specified duration
        setTimeout(() => {
            this.hideCelebration();
            if (onComplete) onComplete();
        }, duration);
    }

    /**
     * Create confetti particles with random colors and physics
     */
    createConfetti() {
        this.confettiParticles = [];
        const colors = [0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0xFFA726, 0x66BB6A, 0xAB47BC];
        
        for (let i = 0; i < 50; i++) {
            const particle = new PIXI.Graphics();
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 4;
            
            // Random shape - rectangle or circle
            if (Math.random() > 0.5) {
                particle.beginFill(color);
                particle.drawRect(0, 0, size, size);
                particle.endFill();
            } else {
                particle.beginFill(color);
                particle.drawCircle(0, 0, size / 2);
                particle.endFill();
            }
            
            // Random starting position across top of screen
            particle.x = Math.random() * this.app.screen.width;
            particle.y = -20;
            
            // Random physics properties
            particle.vx = (Math.random() - 0.5) * 4; // horizontal velocity
            particle.vy = Math.random() * 3 + 2; // falling velocity
            particle.rotation = Math.random() * Math.PI * 2;
            particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
            particle.gravity = 0.1;
            
            this.confettiParticles.push(particle);
            this.celebrationContainer.addChild(particle);
        }
        
        // Start confetti animation
        this.animateConfetti();
    }

    /**
     * Animate confetti particles with physics
     */
    animateConfetti() {
        if (!this.celebrationActive) return;
        
        this.confettiParticles.forEach((particle, index) => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity;
            particle.rotation += particle.rotationSpeed;
            
            // Remove particles that fall off screen
            if (particle.y > this.app.screen.height + 50) {
                this.celebrationContainer.removeChild(particle);
                this.confettiParticles.splice(index, 1);
            }
        });
        
        // Continue animation
        if (this.confettiParticles.length > 0) {
            requestAnimationFrame(() => this.animateConfetti());
        }
    }

    /**
     * Animate celebration text with bouncing effect
     */
    animateCelebrationText() {
        if (!this.celebrationActive || !this.celebrationText) return;
        
        let bouncePhase = 0;
        const originalY = this.celebrationText.y;
        
        const bounce = () => {
            if (!this.celebrationActive || !this.celebrationText) return;
            
            bouncePhase += 0.1;
            this.celebrationText.y = originalY + Math.sin(bouncePhase) * 10;
            this.celebrationText.scale.set(1 + Math.sin(bouncePhase * 2) * 0.1);
            
            if (bouncePhase < Math.PI * 8) { // Bounce for ~4 seconds
                requestAnimationFrame(bounce);
            }
        };
        
        bounce();
    }

    /**
     * Hide celebration and restore UI elements
     */
    hideCelebration() {
        this.celebrationActive = false;
        if (this.celebrationContainer) {
            this.celebrationContainer.visible = false;
            this.celebrationContainer.removeChildren();
        }
        this.confettiParticles = [];
        
        // Restore UI elements
        this.showUIElements();
    }

    /**
     * Hide UI elements during celebration
     */
    hideUIElements() {
        Object.values(this.uiElements).forEach(element => {
            if (element && element.visible !== undefined) {
                element.visible = false;
            }
        });
    }

    /**
     * Show UI elements after celebration
     */
    showUIElements() {
        Object.values(this.uiElements).forEach(element => {
            if (element && element.visible !== undefined) {
                element.visible = true;
            }
        });
    }

    /**
     * Check if celebration is currently active
     * @returns {boolean} True if celebration is active
     */
    get isActive() {
        return this.celebrationActive;
    }

    /**
     * Get the celebration container for external manipulation if needed
     * @returns {PIXI.Container} The celebration container
     */
    get container() {
        return this.celebrationContainer;
    }

    /**
     * Destroy the celebration system and clean up resources
     */
    destroy() {
        this.hideCelebration();
        if (this.celebrationContainer && this.parentContainer) {
            this.parentContainer.removeChild(this.celebrationContainer);
        }
        this.celebrationContainer = null;
        this.celebrationText = null;
        this.confettiParticles = [];
        this.uiElements = {};
    }
}