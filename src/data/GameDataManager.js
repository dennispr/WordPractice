/**
 * Game Data Manager - Handles localStorage for game sessions, stats, and high scores
 * 
 * Features:
 * - Session tracking with timing and completion data
 * - Best time and average time statistics
 * - Top 10 high score leaderboard with historical tracking
 * - Automatic data validation and migration
 * - Robust error handling for corrupted save data
 */

export class GameDataManager {
    /**
     * Create a new GameDataManager instance
     * @param {string} gameId - Unique identifier for this game
     * @param {string} gameName - Human-readable game name
     * @param {string} developer - Developer/company name
     */
    constructor(gameId, gameName, developer) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.developer = developer;
        this.storageKey = 'gameAppData';
    }

    /**
     * Initialize or load existing data from localStorage
     * @returns {Object} Complete game data structure
     */
    initData() {
        let data;
        try {
            const existing = localStorage.getItem(this.storageKey);
            data = existing ? JSON.parse(existing) : null;
        } catch (e) {
            console.warn('Failed to parse saved data, creating new:', e);
            data = null;
        }
        
        if (!data) {
            data = {
                version: "1.0",
                developer: this.developer || "Unknown Developer",
                user: {
                    userId: `user_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    preferences: {}
                },
                games: {},
                achievements: []
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        
        // Ensure all required fields exist with defaults
        if (!data.version) {
            console.log('Save data: Missing version, applying default "1.0"');
            data.version = "1.0";
        }
        if (!data.developer) {
            console.log('Save data: Missing developer, applying default:', this.developer || "Unknown Developer");
            data.developer = this.developer || "Unknown Developer";
        }
        if (!data.user) {
            console.log('Save data: Missing user object, creating default');
            data.user = {};
        }
        if (!data.user.userId) {
            console.log('Save data: Missing user ID, generating new one');
            data.user.userId = `user_${Date.now()}`;
        }
        if (!data.user.createdAt) {
            console.log('Save data: Missing user creation date, applying current timestamp');
            data.user.createdAt = new Date().toISOString();
        }
        if (!data.user.preferences) {
            console.log('Save data: Missing user preferences, creating empty object');
            data.user.preferences = {};
        }
        if (!data.games) {
            console.log('Save data: Missing games object, creating empty object');
            data.games = {};
        }
        if (!data.achievements) {
            console.log('Save data: Missing achievements array, creating empty array');
            data.achievements = [];
        }
        
        return data;
    }

    /**
     * Save a new game session
     * @param {Object} sessionData - Session data to save
     * @param {string} sessionData.startTime - ISO timestamp when session started
     * @param {number} sessionData.duration - Session duration in seconds
     * @param {boolean} sessionData.completed - Whether session was completed
     * @param {number} sessionData.wordsCount - Number of words in session
     * @param {boolean} sessionData.shuffled - Whether words were shuffled
     * @param {number} sessionData.backButtonUses - Number of times back button was used
     */
    saveSession(sessionData) {
        const data = this.initData();
        
        // Ensure sessionData has defaults
        const session = {};
        
        if (!sessionData.startTime) {
            console.log('Session data: Missing start time, using current timestamp');
            session.startTime = new Date().toISOString();
        } else {
            session.startTime = sessionData.startTime;
        }
        
        if (sessionData.duration === undefined || sessionData.duration === null) {
            console.log('Session data: Missing duration, defaulting to 0');
            session.duration = 0;
        } else {
            session.duration = sessionData.duration;
        }
        
        if (sessionData.completed === undefined || sessionData.completed === null) {
            console.log('Session data: Missing completed status, defaulting to false');
            session.completed = false;
        } else {
            session.completed = sessionData.completed;
        }
        
        if (!sessionData.wordsCount) {
            console.log('Session data: Missing word count, defaulting to 0');
            session.wordsCount = 0;
        } else {
            session.wordsCount = sessionData.wordsCount;
        }
        
        if (sessionData.shuffled === undefined || sessionData.shuffled === null) {
            console.log('Session data: Missing shuffle status, defaulting to false');
            session.shuffled = false;
        } else {
            session.shuffled = sessionData.shuffled;
        }
        
        if (!sessionData.backButtonUses) {
            console.log('Session data: Missing back button usage, defaulting to 0');
            session.backButtonUses = 0;
        } else {
            session.backButtonUses = sessionData.backButtonUses;
        }
        
        if (!data.games[this.gameId]) {
            data.games[this.gameId] = {
                gameInfo: {
                    name: this.gameName || "Unknown Game",
                    developer: this.developer || "Unknown Developer",
                    version: "1.0",
                    firstPlayed: new Date().toISOString(),
                    totalSessions: 0
                },
                stats: {
                    bestTime: null, // Start as null until first real completion
                    averageTime: 0,
                    totalCompletions: 0,
                    totalWordsCompleted: 0
                },
                highScores: {
                    topTen: [], // Array of {initials, time, date, wordsCount}
                    historical: [] // All scores that were once in top 10
                },
                sessions: [],
                settings: {}
            };
        }
        
        // Ensure highScores structure exists (for existing saves)
        if (!data.games[this.gameId].highScores) {
            console.log('High score data: Adding high scores structure to existing save');
            data.games[this.gameId].highScores = {
                topTen: [],
                historical: []
            };
        }

        // Add session with generated ID
        const sessionWithId = {
            sessionId: `session_${Date.now()}`,
            endTime: new Date().toISOString(),
            ...session
        };

        data.games[this.gameId].sessions.push(sessionWithId);
        data.games[this.gameId].gameInfo.totalSessions++;
        data.games[this.gameId].gameInfo.lastPlayed = sessionWithId.endTime;
        
        // Update stats only if completed with valid duration
        if (session.completed && session.duration > 0) {
            const stats = data.games[this.gameId].stats;
            stats.totalCompletions++;
            stats.totalWordsCompleted += session.wordsCount;
            
            // Only update bestTime if we have a valid time and it's better than current best
            if (stats.bestTime === null || session.duration < stats.bestTime) {
                stats.bestTime = session.duration;
            }
            
            // Calculate average time from completed sessions only
            const completedSessions = data.games[this.gameId].sessions.filter(s => s.completed && s.duration > 0);
            if (completedSessions.length > 0) {
                stats.averageTime = Math.round(completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length);
            }
        }

        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('Game session saved:', sessionWithId);
    }

    /**
     * Get game statistics
     * @returns {Object} Stats object with bestTime, averageTime, totalCompletions, totalWordsCompleted
     */
    getStats() {
        const data = this.initData();
        const gameStats = data.games[this.gameId]?.stats || {};
        
        // Return stats with safe defaults
        return {
            bestTime: gameStats.bestTime || null,
            averageTime: gameStats.averageTime || 0,
            totalCompletions: gameStats.totalCompletions || 0,
            totalWordsCompleted: gameStats.totalWordsCompleted || 0
        };
    }
    
    /**
     * Check if a time qualifies for the top 10 high scores
     * @param {number} time - Time in seconds to check
     * @returns {boolean} True if time qualifies for top 10
     */
    isTopTenScore(time) {
        const data = this.initData();
        const topTen = data.games[this.gameId]?.highScores?.topTen || [];
        
        // Always qualifies if less than 10 scores
        if (topTen.length < 10) return true;
        
        // Check if better than worst score
        const worstScore = topTen[topTen.length - 1];
        return time < worstScore.time;
    }
    
    /**
     * Add a new high score entry
     * @param {string} initials - Player's initials (max 3 characters)
     * @param {number} time - Completion time in seconds
     * @param {number} wordsCount - Number of words completed
     * @returns {number} Rank of the new score (1-10)
     */
    addHighScore(initials, time, wordsCount) {
        const data = this.initData();
        const scoreEntry = {
            initials: initials.toUpperCase().substring(0, 3), // Max 3 characters
            time: time,
            date: new Date().toISOString(),
            wordsCount: wordsCount,
            timestamp: Date.now()
        };
        
        const highScores = data.games[this.gameId].highScores;
        
        // Add to topTen
        highScores.topTen.push(scoreEntry);
        
        // Sort by time (fastest first)
        highScores.topTen.sort((a, b) => a.time - b.time);
        
        // If more than 10, move extras to historical
        while (highScores.topTen.length > 10) {
            const removedScore = highScores.topTen.pop();
            // Only add to historical if not already there
            const alreadyHistorical = highScores.historical.find(h => 
                h.timestamp === removedScore.timestamp
            );
            if (!removedScore.wasInTopTen && !alreadyHistorical) {
                removedScore.wasInTopTen = true;
                removedScore.removedFromTopTen = new Date().toISOString();
                highScores.historical.push(removedScore);
            }
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('High score added:', scoreEntry);
        
        return highScores.topTen.findIndex(score => score.timestamp === scoreEntry.timestamp) + 1; // Return rank
    }
    
    /**
     * Get high scores data
     * @returns {Object} Object with topTen and historical arrays
     */
    getHighScores() {
        const data = this.initData();
        return {
            topTen: data.games[this.gameId]?.highScores?.topTen || [],
            historical: data.games[this.gameId]?.highScores?.historical || []
        };
    }

    /**
     * Reset all save data for this game (useful for testing/debugging)
     */
    resetData() {
        localStorage.removeItem(this.storageKey);
        console.log('🔄 Game data reset complete');
    }
}