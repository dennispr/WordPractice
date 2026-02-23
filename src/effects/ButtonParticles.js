// ButtonParticles - Particle effects for button interactions
import * as PIXI from 'pixi.js';
import { layoutManager } from '../utils/LayoutManager.js';

/**
 * Button particle effect system for creating celebratory animations
 */
export class ButtonParticles {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.particleContainer = new PIXI.Container();
        this.particles = [];
        // Don't add particle container yet - will be added when particles are created
        
        // Emoji options for particles
        this.celebrationEmojis = ['⭐', '🌟', '✨', '🦄', '💫', '🎉'];
    }
    
    /**
     * Create celebration particles at button position
     * @param {number} x - Button center X position
     * @param {number} y - Button center Y position
     * @param {Object} options - Particle options
     */
    createButtonCelebration(x, y, options = {}) {
        const particleCount = options.count || 12;
        const duration = options.duration || 1500;
        const spreadRange = options.spreadRange || layoutManager.scale(150);
        
        // Ensure particle container is on top of other elements
        if (this.particleContainer.parent !== this.container) {
            this.container.addChild(this.particleContainer);
        } else {
            // Move to top by removing and re-adding
            this.container.removeChild(this.particleContainer);
            this.container.addChild(this.particleContainer);
        }
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(x, y, spreadRange, duration);
        }
        
        // Clean up after animation completes
        setTimeout(() => {
            this.cleanupParticles();
        }, duration + 500);
    }
    
    /**
     * Create individual particle
     * @param {number} x - Start X position
     * @param {number} y - Start Y position
     * @param {number} spreadRange - How far particles can travel
     * @param {number} duration - Animation duration
     */
    createParticle(x, y, spreadRange, duration) {
        // Random emoji from celebration set
        const emoji = this.celebrationEmojis[Math.floor(Math.random() * this.celebrationEmojis.length)];
        
        const particle = new PIXI.Text(emoji, {
            fontSize: layoutManager.scaleFontSize(32),
            align: 'center'
        });
        
        particle.anchor.set(0.5);
        particle.x = x;
        particle.y = y;
        
        // Random velocity and direction
        const angle = Math.random() * Math.PI * 2;
        const speed = layoutManager.scale(2 + Math.random() * 4);
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed - layoutManager.scale(2); // Slight upward bias
        
        // Animation properties
        particle.velocityX = velocityX;
        particle.velocityY = velocityY;
        particle.gravity = layoutManager.scale(0.15);
        particle.rotation = (Math.random() - 0.5) * 0.2;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
        particle.alpha = 1;
        particle.scale.set(0.5 + Math.random() * 0.5);
        
        this.particleContainer.addChild(particle);
        this.particles.push(particle);
        
        // Animate particle
        this.animateParticle(particle, duration);
    }
    
    /**
     * Animate individual particle
     * @param {PIXI.Text} particle - Particle to animate
     * @param {number} duration - Animation duration
     */
    animateParticle(particle, duration) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // Animation complete - remove particle
                if (particle.parent) {
                    particle.parent.removeChild(particle);
                }
                const index = this.particles.indexOf(particle);
                if (index > -1) {
                    this.particles.splice(index, 1);
                }
                return;
            }
            
            // Update position
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            particle.velocityY += particle.gravity; // Apply gravity
            
            // Update rotation
            particle.rotation += particle.rotationSpeed;
            
            // Fade out in last 30% of animation
            if (progress > 0.7) {
                const fadeProgress = (progress - 0.7) / 0.3;
                particle.alpha = 1 - fadeProgress;
            }
            
            // Scale effect (slight bounce at start)
            if (progress < 0.2) {
                const bounceProgress = progress / 0.2;
                const bounceScale = 1 + Math.sin(bounceProgress * Math.PI) * 0.3;
                particle.scale.set((0.5 + Math.random() * 0.5) * bounceScale);
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Clean up old particles
     */
    cleanupParticles() {
        // Remove any remaining particles
        this.particles.forEach(particle => {
            if (particle.parent) {
                particle.parent.removeChild(particle);
            }
        });
        this.particles = [];
    }
    
    /**
     * Create "Next" button celebration effect
     * @param {number} buttonX - Button center X
     * @param {number} buttonY - Button center Y
     */
    celebrateNext(buttonX, buttonY) {
        this.createButtonCelebration(buttonX, buttonY, {
            count: 15,
            duration: 1800,
            spreadRange: layoutManager.scale(180)
        });
    }
}