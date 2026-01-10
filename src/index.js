// Entry point for webpack build
import * as PIXI from 'pixi.js';

// Make PIXI globally available (as it was in the original setup)
window.PIXI = PIXI;

// Import the main app logic
import './app.js';