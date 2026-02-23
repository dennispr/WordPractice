// race.js - Race Mode Module
import * as PIXI from 'pixi.js';
import { layoutManager } from './utils/LayoutManager.js';

// Race mode elements
let raceTrack;
let racers = {}; // Will hold cat, dog, bird racers
let raceData = {
    bestTime: 300, // Default 5 minutes in seconds
    recentTime: 600, // Default 10 minutes in seconds
    currentStartTime: null,
    totalWords: 0,
    maxWordIndex: 0 // Track furthest progress to prevent backwards movement
};

// Create race screen
export function createRaceScreen(app, createWordDisplay, createNavigationButtons) {
    const raceScreen = new PIXI.Container();
    
    // Get race track layout
    const raceTrackLayout = layoutManager.getRaceTrack();
    
    // Race track container
    const raceTrackContainer = new PIXI.Container();
    raceTrackContainer.x = raceTrackLayout.x;
    raceTrackContainer.y = raceTrackLayout.y;
    raceScreen.addChild(raceTrackContainer);
    
    // Race track background
    const trackBg = new PIXI.Graphics();
    trackBg.beginFill(0xf0f0f0);
    trackBg.drawRoundedRect(0, 0, raceTrackLayout.width, raceTrackLayout.height, 10);
    trackBg.endFill();
    trackBg.beginFill(0xcccccc);
    trackBg.drawRoundedRect(5, 5, raceTrackLayout.width - 10, raceTrackLayout.height - 10, 8);
    trackBg.endFill();
    raceTrackContainer.addChild(trackBg);
    
    // Create lane dividers with dotted lines
    const laneHeight = raceTrackLayout.height / 3; // 3 lanes
    
    // Divider between lane 1 and 2
    const divider1 = new PIXI.Graphics();
    divider1.lineStyle(layoutManager.scale(2), 0xFFFFFF, 0.8);
    const y1 = laneHeight;
    for (let x = 10; x < raceTrackLayout.width - 10; x += layoutManager.scale(20)) {
        divider1.moveTo(x, y1);
        divider1.lineTo(x + layoutManager.scale(10), y1);
    }
    raceTrackContainer.addChild(divider1);
    
    // Divider between lane 2 and 3
    const divider2 = new PIXI.Graphics();
    divider2.lineStyle(layoutManager.scale(2), 0xFFFFFF, 0.8);
    const y2 = laneHeight * 2;
    for (let x = 10; x < raceTrackLayout.width - 10; x += layoutManager.scale(20)) {
        divider2.moveTo(x, y2);
        divider2.lineTo(x + layoutManager.scale(10), y2);
    }
    raceTrackContainer.addChild(divider2);
    
    // Finish line
    const finishLine = new PIXI.Graphics();
    finishLine.lineStyle(3, 0x000000);
    for (let i = 0; i < 8; i++) {
        finishLine.moveTo(raceTrackLayout.width - 10, 10 + i * 10);
        finishLine.lineTo(raceTrackLayout.width, 10 + i * 10);
    }
    raceTrackContainer.addChild(finishLine);
    
    // Create racers with aligned positioning
    const laneCenter1 = laneHeight / 2;
    const laneCenter2 = laneHeight + (laneHeight / 2);
    const laneCenter3 = (laneHeight * 2) + (laneHeight / 2);
    const startX = layoutManager.scale(60); // More space from left edge
    
    // Best time racer (cat) - top lane
    racers.best = new PIXI.Text('🐱', { fontSize: layoutManager.scaleFontSize(48) });
    racers.best.anchor.set(0.5);
    racers.best.x = startX;
    racers.best.y = laneCenter1;
    racers.best.targetX = startX; // For tweening
    raceTrackContainer.addChild(racers.best);
    
    // Current player racer (dog) - middle lane  
    racers.current = new PIXI.Text('🐶', { fontSize: layoutManager.scaleFontSize(48) });
    racers.current.anchor.set(0.5);
    racers.current.x = startX;
    racers.current.y = laneCenter2;
    racers.current.targetX = startX; // For tweening
    raceTrackContainer.addChild(racers.current);
    
    // Recent score racer (bird) - bottom lane
    racers.recent = new PIXI.Text('🐦', { fontSize: layoutManager.scaleFontSize(48) });
    racers.recent.anchor.set(0.5);
    racers.recent.x = startX;
    racers.recent.y = laneCenter3;
    racers.recent.targetX = startX; // For tweening
    raceTrackContainer.addChild(racers.recent);
    
    // Racer labels - aligned with lane centers
    const bestLabel = new PIXI.Text('Racer #1', { fontSize: layoutManager.scaleFontSize(24), fill: 0x666666 });
    bestLabel.x = -layoutManager.scale(100);
    bestLabel.y = laneCenter1 - layoutManager.scale(12); // Center vertically with racer
    raceTrackContainer.addChild(bestLabel);
    
    const currentLabel = new PIXI.Text('You', { fontSize: layoutManager.scaleFontSize(24), fill: 0x0066CC, fontWeight: 'bold' });
    currentLabel.x = -layoutManager.scale(100);
    currentLabel.y = laneCenter2 - layoutManager.scale(12);
    raceTrackContainer.addChild(currentLabel);
    
    const recentLabel = new PIXI.Text('Racer #2', { fontSize: layoutManager.scaleFontSize(24), fill: 0x666666 });
    recentLabel.x = -layoutManager.scale(100);
    recentLabel.y = laneCenter3 - layoutManager.scale(12);
    raceTrackContainer.addChild(recentLabel);
    
    // Create shared word display (will be set as active wordText when in race mode)
    const raceWordDisplay = createWordDisplay(raceScreen);
    raceScreen.wordText = raceWordDisplay;
    
    // Create shared navigation buttons
    const raceButtons = createNavigationButtons(raceScreen);
    raceScreen.backButton = raceButtons.back;
    raceScreen.nextButton = raceButtons.next;
    
    // Store race track reference for updates
    raceTrack = {
        width: raceTrackLayout.width - layoutManager.scale(120), // Account for margins
        startX: layoutManager.scale(60),
        endX: raceTrackLayout.width - layoutManager.scale(60)
    };
    
    return raceScreen;
}

// Initialize race mode
export function initRaceMode(words, gameData) {
    // Get high scores for race opponents
    const scores = gameData.getHighScores();
    
    // Set race data
    raceData.totalWords = words.length;
    raceData.currentStartTime = new Date();
    raceData.maxWordIndex = 0; // Reset max progress for new race
    
    if (scores.topTen.length > 0) {
        // Calculate average time from top 10 scores for best time racer
        const totalTime = scores.topTen.reduce((sum, score) => sum + score.time, 0);
        raceData.bestTime = Math.round(totalTime / scores.topTen.length);
        
        // Set recent racer to run at 60% of the slowest top 10 score (making it faster)
        const slowestScore = scores.topTen[scores.topTen.length - 1].time;
        raceData.recentTime = Math.round(slowestScore * 0.6);
    } else {
        // Defaults for new 100-word system: 5 min best, 3.6 min recent (60% of 6 min)
        raceData.bestTime = 300;
        raceData.recentTime = 216;
    }
    
    // Reset racer positions (with safety check)
    if (raceTrack && racers.best && racers.current && racers.recent) {
        racers.best.x = raceTrack.startX;
        racers.best.targetX = raceTrack.startX;
        racers.current.x = raceTrack.startX;
        racers.current.targetX = raceTrack.startX;
        racers.recent.x = raceTrack.startX;
        racers.recent.targetX = raceTrack.startX;
    } else {
        console.error('Race track or racers not properly initialized');
        return;
    }
    
    console.log(`Race initialized: Racer #1 ${raceData.bestTime}s, Racer #2 ${raceData.recentTime}s, Words ${raceData.totalWords}`);
}

// Update race positions with smooth tweening
export function updateRacePositions(currentWordIndex, currentScreen) {
    if (currentScreen !== 'race' || !raceData.currentStartTime) return;
    if (!raceTrack || !racers.best || !racers.current || !racers.recent) {
        console.error('Race components not properly initialized');
        return;
    }
    
    const currentTime = (new Date() - raceData.currentStartTime) / 1000; // seconds elapsed
    
    // Track the furthest word index reached (only advance, never go back)
    if (currentWordIndex > raceData.maxWordIndex) {
        raceData.maxWordIndex = currentWordIndex;
    }
    
    const currentProgress = raceData.maxWordIndex / raceData.totalWords; // 0 to 1
    const trackDistance = raceTrack.endX - raceTrack.startX;
    
    // Calculate target positions
    const currentTargetX = raceTrack.startX + (currentProgress * trackDistance);
    const bestProgress = Math.min(currentTime / raceData.bestTime, 1);
    const bestTargetX = raceTrack.startX + (bestProgress * trackDistance);
    const recentProgress = Math.min(currentTime / raceData.recentTime, 1);
    const recentTargetX = raceTrack.startX + (recentProgress * trackDistance);
    
    // Set target positions for smooth tweening
    racers.current.targetX = currentTargetX;
    racers.best.targetX = bestTargetX;
    racers.recent.targetX = recentTargetX;
    
    // Apply smooth tweening (easing towards target)
    const tweenSpeed = 0.12; // Adjust for smoothness (0.1 = slow, 0.2 = fast)
    
    racers.current.x += (racers.current.targetX - racers.current.x) * tweenSpeed;
    racers.best.x += (racers.best.targetX - racers.best.x) * tweenSpeed;
    racers.recent.x += (racers.recent.targetX - racers.recent.x) * tweenSpeed;
}

// Handle race mode completion
export function handleRaceCompletion(sessionStartTime, words, backButtonUses, handlePracticeCompletion) {
    if (!sessionStartTime) {
        return { shouldShowEnd: true };
    }
    
    const endTime = new Date();
    const startTime = new Date(sessionStartTime);
    const duration = Math.round((endTime - startTime) / 1000); // seconds
    
    console.log(`🏁 Race completed in ${duration} seconds!`);
    
    // Show race results with position information
    const currentTime = (endTime - raceData.currentStartTime) / 1000;
    let position = 1;
    
    if (currentTime > raceData.bestTime) position++;
    if (currentTime > raceData.recentTime) position++;
    
    console.log(`🏆 Race finish position: ${position}/3`);
    
    // Continue with standard completion logic (high scores, celebrations, etc.)
    return { 
        shouldShowEnd: false, 
        continueWithPracticeCompletion: true 
    };
}

// Export race data getter for external access if needed
export function getRaceData() {
    return raceData;
}