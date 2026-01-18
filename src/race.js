// race.js - Race Mode Module
import * as PIXI from 'pixi.js';

// Race mode elements
let raceTrack;
let racers = {}; // Will hold cat, dog, bird racers
let raceData = {
    bestTime: 300, // Default 5 minutes in seconds
    recentTime: 600, // Default 10 minutes in seconds
    currentStartTime: null,
    totalWords: 0
};

// Create race screen
export function createRaceScreen(app, createWordDisplay, createNavigationButtons) {
    const raceScreen = new PIXI.Container();
    
    // Race track container
    const raceTrackContainer = new PIXI.Container();
    raceTrackContainer.y = 20;
    raceScreen.addChild(raceTrackContainer);
    
    // Race track background
    const trackBg = new PIXI.Graphics();
    trackBg.beginFill(0xf0f0f0);
    trackBg.drawRoundedRect(50, 0, app.screen.width - 100, 80, 10);
    trackBg.endFill();
    trackBg.beginFill(0xcccccc);
    trackBg.drawRoundedRect(55, 5, app.screen.width - 110, 70, 8);
    trackBg.endFill();
    raceTrackContainer.addChild(trackBg);
    
    // Finish line
    const finishLine = new PIXI.Graphics();
    finishLine.lineStyle(3, 0x000000);
    for (let i = 0; i < 8; i++) {
        finishLine.moveTo(app.screen.width - 60, 10 + i * 10);
        finishLine.lineTo(app.screen.width - 50, 10 + i * 10);
    }
    raceTrackContainer.addChild(finishLine);
    
    // Create racers
    const raceTrackWidth = app.screen.width - 110;
    
    // Best time racer (cat) - top lane
    racers.best = new PIXI.Text('🐱', { fontSize: 24 });
    racers.best.anchor.set(0.5);
    racers.best.x = 70;
    racers.best.y = 25;
    raceTrackContainer.addChild(racers.best);
    
    // Current player racer (dog) - middle lane
    racers.current = new PIXI.Text('🐶', { fontSize: 24 });
    racers.current.anchor.set(0.5);
    racers.current.x = 70;
    racers.current.y = 45;
    raceTrackContainer.addChild(racers.current);
    
    // Recent score racer (bird) - bottom lane
    racers.recent = new PIXI.Text('🐦', { fontSize: 24 });
    racers.recent.anchor.set(0.5);
    racers.recent.x = 70;
    racers.recent.y = 65;
    raceTrackContainer.addChild(racers.recent);
    
    // Racer labels
    const bestLabel = new PIXI.Text('Best Time', { fontSize: 12, fill: 0x666666 });
    bestLabel.x = 10;
    bestLabel.y = 15;
    raceTrackContainer.addChild(bestLabel);
    
    const currentLabel = new PIXI.Text('You', { fontSize: 12, fill: 0x0066CC, fontWeight: 'bold' });
    currentLabel.x = 10;
    currentLabel.y = 35;
    raceTrackContainer.addChild(currentLabel);
    
    const recentLabel = new PIXI.Text('Last Score', { fontSize: 12, fill: 0x666666 });
    recentLabel.x = 10;
    recentLabel.y = 55;
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
        width: raceTrackWidth,
        startX: 70,
        endX: app.screen.width - 70
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
    
    if (scores.topTen.length > 0) {
        raceData.bestTime = scores.topTen[0].time;
        raceData.recentTime = scores.topTen[scores.topTen.length - 1].time;
    } else {
        // Defaults: 5 min best, 10 min recent
        raceData.bestTime = 300;
        raceData.recentTime = 600;
    }
    
    // Reset racer positions (with safety check)
    if (raceTrack && racers.best && racers.current && racers.recent) {
        racers.best.x = raceTrack.startX;
        racers.current.x = raceTrack.startX;
        racers.recent.x = raceTrack.startX;
    } else {
        console.error('Race track or racers not properly initialized');
        return;
    }
    
    console.log(`Race initialized: Best ${raceData.bestTime}s, Recent ${raceData.recentTime}s, Words ${raceData.totalWords}`);
}

// Update race positions
export function updateRacePositions(currentWordIndex, currentScreen) {
    if (currentScreen !== 'race' || !raceData.currentStartTime) return;
    if (!raceTrack || !racers.best || !racers.current || !racers.recent) {
        console.error('Race components not properly initialized');
        return;
    }
    
    const currentTime = (new Date() - raceData.currentStartTime) / 1000; // seconds elapsed
    const currentProgress = currentWordIndex / raceData.totalWords; // 0 to 1
    const trackDistance = raceTrack.endX - raceTrack.startX;
    
    // Update current player position (based on word progress)
    racers.current.x = raceTrack.startX + (currentProgress * trackDistance);
    
    // Update best time racer (steady pace to finish at best time)
    const bestProgress = Math.min(currentTime / raceData.bestTime, 1);
    racers.best.x = raceTrack.startX + (bestProgress * trackDistance);
    
    // Update recent score racer (steady pace to finish at recent time)
    const recentProgress = Math.min(currentTime / raceData.recentTime, 1);
    racers.recent.x = raceTrack.startX + (recentProgress * trackDistance);
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