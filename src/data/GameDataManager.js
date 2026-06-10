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
        this.topTenRetentionDays = 30;
        this.topTenRetentionMs = this.topTenRetentionDays * 24 * 60 * 60 * 1000;
    }

    /**
     * Initialize or load existing data from localStorage
     * @returns {Object} Complete game data structure
     */
    initData() {
        let data;
        let shouldSave = false;
        try {
            const existing = localStorage.getItem(this.storageKey);
            data = existing ? JSON.parse(existing) : null;
        } catch (e) {
            console.warn('Failed to parse saved data, creating new:', e);
            data = null;
        }
        
        if (!data) {
            data = {
                version: "1.2",
                developer: this.developer || "Unknown Developer",
                user: {
                    userId: `user_${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    preferences: {}
                },
                games: {},
                achievements: []
            };
            shouldSave = true;
        }
        
        // Ensure all required fields exist with defaults
        if (!data.version) {
            console.log('Save data: Missing version, applying default "1.2"');
            data.version = "1.2";
            shouldSave = true;
        }
        if (!data.developer) {
            console.log('Save data: Missing developer, applying default:', this.developer || "Unknown Developer");
            data.developer = this.developer || "Unknown Developer";
            shouldSave = true;
        }
        if (!data.user) {
            console.log('Save data: Missing user object, creating default');
            data.user = {};
            shouldSave = true;
        }
        if (!data.user.userId) {
            console.log('Save data: Missing user ID, generating new one');
            data.user.userId = `user_${Date.now()}`;
            shouldSave = true;
        }
        if (!data.user.createdAt) {
            console.log('Save data: Missing user creation date, applying current timestamp');
            data.user.createdAt = new Date().toISOString();
            shouldSave = true;
        }
        if (!data.user.preferences) {
            console.log('Save data: Missing user preferences, creating empty object');
            data.user.preferences = {};
            shouldSave = true;
        }
        if (!data.games) {
            console.log('Save data: Missing games object, creating empty object');
            data.games = {};
            shouldSave = true;
        }
        if (!data.achievements) {
            console.log('Save data: Missing achievements array, creating empty array');
            data.achievements = [];
            shouldSave = true;
        }

        if (this.ensureGameData(data)) {
            shouldSave = true;
        }
        if (this.ensureTrickyWordsData(data)) {
            shouldSave = true;
        }
        if (this.retireExpiredTopTenScores(data)) {
            shouldSave = true;
        }

        if (shouldSave) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        
        return data;
    }

    createDefaultGameData() {
        return {
            gameInfo: {
                name: this.gameName || 'Unknown Game',
                developer: this.developer || 'Unknown Developer',
                version: '1.2',
                firstPlayed: new Date().toISOString(),
                totalSessions: 0
            },
            stats: {
                bestTime: null,
                averageTime: 0,
                totalCompletions: 0,
                totalWordsCompleted: 0
            },
            highScores: {
                topTen: [],
                historical: []
            },
            trickyWords: {
                playCount: 0,
                words: {}
            },
            sessions: [],
            settings: {}
        };
    }

    ensureGameData(data) {
        let changed = false;

        if (!data.games[this.gameId]) {
            data.games[this.gameId] = this.createDefaultGameData();
            changed = true;
        }

        const game = data.games[this.gameId];
        if (!game.gameInfo) {
            game.gameInfo = this.createDefaultGameData().gameInfo;
            changed = true;
        }
        if (!game.stats) {
            game.stats = this.createDefaultGameData().stats;
            changed = true;
        }
        if (!game.highScores) {
            game.highScores = { topTen: [], historical: [] };
            changed = true;
        }
        if (!Array.isArray(game.highScores.topTen)) {
            game.highScores.topTen = [];
            changed = true;
        }
        if (!Array.isArray(game.highScores.historical)) {
            game.highScores.historical = [];
            changed = true;
        }
        if (!Array.isArray(game.sessions)) {
            game.sessions = [];
            changed = true;
        }
        if (!game.settings) {
            game.settings = {};
            changed = true;
        }
        if (!game.trickyWords || typeof game.trickyWords !== 'object') {
            game.trickyWords = {
                playCount: 0,
                words: {}
            };
            changed = true;
        }
        if (typeof game.trickyWords.playCount !== 'number' || Number.isNaN(game.trickyWords.playCount)) {
            game.trickyWords.playCount = 0;
            changed = true;
        }
        if (!game.trickyWords.words || typeof game.trickyWords.words !== 'object') {
            game.trickyWords.words = {};
            changed = true;
        }

        const normalizedTopTen = game.highScores.topTen.map((entry) => this.normalizeScoreEntry(entry));
        const normalizedHistorical = game.highScores.historical.map((entry) => this.normalizeScoreEntry(entry));
        if (JSON.stringify(normalizedTopTen) !== JSON.stringify(game.highScores.topTen)) {
            game.highScores.topTen = normalizedTopTen;
            changed = true;
        }
        if (JSON.stringify(normalizedHistorical) !== JSON.stringify(game.highScores.historical)) {
            game.highScores.historical = normalizedHistorical;
            changed = true;
        }

        game.highScores.topTen.sort((a, b) => this.getTimePerWord(a) - this.getTimePerWord(b));
        while (game.highScores.topTen.length > 10) {
            const removedScore = game.highScores.topTen.pop();
            if (this.pushHistoricalUnique(game.highScores, removedScore, 'overflow')) {
                changed = true;
            }
        }

        if (this.pruneExpiredTrickyWords(game)) {
            changed = true;
        }

        return changed;
    }

    ensureTrickyWordsData(data) {
        let changed = false;
        const game = data.games[this.gameId];
        if (!game) {
            return false;
        }

        if (!game.trickyWords || typeof game.trickyWords !== 'object') {
            game.trickyWords = {
                playCount: 0,
                words: {}
            };
            return true;
        }

        if (typeof game.trickyWords.playCount !== 'number' || Number.isNaN(game.trickyWords.playCount)) {
            game.trickyWords.playCount = 0;
            changed = true;
        }
        if (!game.trickyWords.words || typeof game.trickyWords.words !== 'object') {
            game.trickyWords.words = {};
            changed = true;
        }

        if (this.pruneExpiredTrickyWords(game)) {
            changed = true;
        }

        return changed;
    }

    normalizeWordKey(word) {
        return String(word || '').trim().toLowerCase();
    }

    createDefaultTrickyWordRecord(word) {
        return {
            word,
            score: 0,
            points: [],
            totalEvents: 0,
            backtrackEvents: 0,
            slowestEvents: 0,
            totalDwellMs: 0,
            maxDwellMs: 0,
            lastSeenAt: null,
            lastReason: null,
            lastPlayCount: 0,
            lastUpdatedAt: null,
            notes: []
        };
    }

    addTrickyPoint(trickyWordsData, word, reason, playCount, details = {}) {
        const key = this.normalizeWordKey(word);
        if (!key) {
            return false;
        }

        if (!trickyWordsData.words[key]) {
            trickyWordsData.words[key] = this.createDefaultTrickyWordRecord(key);
        }

        const record = trickyWordsData.words[key];
        const point = {
            reason,
            addedAtPlay: playCount,
            expiresAtPlay: playCount + 4,
            addedAt: new Date().toISOString(),
            ...details
        };

        record.points.push(point);
        record.totalEvents += 1;
        record.lastSeenAt = point.addedAt;
        record.lastReason = reason;
        record.lastPlayCount = playCount;
        record.lastUpdatedAt = point.addedAt;
        record.notes.push(reason);
        if (reason === 'backtracked') {
            record.backtrackEvents += 1;
        }
        if (reason === 'slowest') {
            record.slowestEvents += 1;
        }
        if (typeof details.dwellMs === 'number') {
            record.totalDwellMs += details.dwellMs;
            if (details.dwellMs > record.maxDwellMs) {
                record.maxDwellMs = details.dwellMs;
            }
        }

        return true;
    }

    pruneExpiredTrickyWords(game) {
        if (!game?.trickyWords?.words) {
            return false;
        }

        const currentPlayCount = game.trickyWords.playCount || 0;
        let changed = false;

        Object.values(game.trickyWords.words).forEach((record) => {
            if (!record.points) {
                record.points = [];
                record.score = 0;
                changed = true;
                return;
            }

            const activePoints = record.points.filter((point) => point.expiresAtPlay > currentPlayCount);
            if (activePoints.length !== record.points.length) {
                record.points = activePoints;
                changed = true;
            }

            const score = activePoints.length;
            if (record.score !== score) {
                record.score = score;
                changed = true;
            }
        });

        return changed;
    }

    recordPracticeTrickyAnalytics(analytics = {}) {
        const data = this.initData();
        this.ensureGameData(data);
        this.ensureTrickyWordsData(data);

        const game = data.games[this.gameId];
        const trickyWords = game.trickyWords;
        trickyWords.playCount += 1;

        const playCount = trickyWords.playCount;
        const events = [];

        if (analytics.slowestWord) {
            events.push({
                word: analytics.slowestWord,
                reason: 'slowest',
                dwellMs: analytics.slowestWordDwellMs || 0
            });
        }

        if (Array.isArray(analytics.backtrackedWords)) {
            analytics.backtrackedWords.forEach((entry) => {
                if (!entry) {
                    return;
                }
                if (typeof entry === 'string') {
                    events.push({ word: entry, reason: 'backtracked', dwellMs: 0 });
                    return;
                }
                events.push({
                    word: entry.word,
                    reason: entry.reason || 'backtracked',
                    dwellMs: entry.dwellMs || 0
                });
            });
        }

        events.forEach((event) => {
            this.addTrickyPoint(trickyWords, event.word, event.reason, playCount, {
                dwellMs: event.dwellMs,
                sessionId: analytics.sessionId || null,
                sessionStartedAt: analytics.sessionStartedAt || null,
                sessionEndedAt: analytics.sessionEndedAt || null
            });
        });

        if (events.length === 0) {
            this.pruneExpiredTrickyWords(game);
        }

        localStorage.setItem(this.storageKey, JSON.stringify(data));

        return this.getTrickyWordsReport();
    }

    getTrickyWordsReport() {
        const data = this.initData();
        this.ensureGameData(data);
        const game = data.games[this.gameId];
        const trickyWords = game.trickyWords;

        if (this.pruneExpiredTrickyWords(game)) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }

        const records = Object.values(trickyWords.words || {})
            .map((record) => ({
                ...record,
                score: Array.isArray(record.points)
                    ? record.points.filter((point) => point.expiresAtPlay > trickyWords.playCount).length
                    : 0
            }))
            .filter((record) => record.score > 0)
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return (b.totalDwellMs || 0) - (a.totalDwellMs || 0);
            });

        return {
            generatedAt: new Date().toISOString(),
            playCount: trickyWords.playCount || 0,
            activeWordCount: records.length,
            summary: {
                totalActivePoints: records.reduce((sum, record) => sum + record.score, 0),
                wordsWithBacktracks: records.filter((record) => record.backtrackEvents > 0).length,
                wordsWithSlowestHits: records.filter((record) => record.slowestEvents > 0).length
            },
            words: records
        };
    }

    normalizeScoreEntry(entry) {
        const normalized = { ...entry };
        if (!normalized.date) {
            normalized.date = new Date().toISOString();
        }
        if (!normalized.timestamp || Number.isNaN(Number(normalized.timestamp))) {
            const parsedTs = Date.parse(normalized.date);
            normalized.timestamp = Number.isNaN(parsedTs) ? Date.now() : parsedTs;
        }
        if (!normalized.wordsCount || normalized.wordsCount <= 0) {
            normalized.wordsCount = 119;
        }
        return normalized;
    }

    scoreIdentity(scoreEntry) {
        if (scoreEntry.timestamp) {
            return `ts:${scoreEntry.timestamp}`;
        }
        return `legacy:${scoreEntry.initials || 'UNK'}:${scoreEntry.time || 0}:${scoreEntry.date || ''}:${scoreEntry.wordsCount || 0}`;
    }

    pushHistoricalUnique(highScores, scoreEntry, reason = 'overflow') {
        const entry = this.normalizeScoreEntry(scoreEntry);
        const id = this.scoreIdentity(entry);
        const alreadyHistorical = highScores.historical.some((h) => this.scoreIdentity(h) === id);
        if (alreadyHistorical) {
            return false;
        }

        const removedAt = new Date().toISOString();
        highScores.historical.push({
            ...entry,
            wasInTopTen: true,
            removedFromTopTen: entry.removedFromTopTen || removedAt,
            removedReason: entry.removedReason || reason
        });
        return true;
    }

    retireExpiredTopTenScores(data) {
        const game = data.games[this.gameId];
        if (!game?.highScores?.topTen?.length) {
            return false;
        }

        const now = Date.now();
        const retained = [];
        let changed = false;

        game.highScores.topTen.forEach((entry) => {
            const normalized = this.normalizeScoreEntry(entry);
            const ageMs = now - Number(normalized.timestamp || 0);
            if (ageMs > this.topTenRetentionMs) {
                if (this.pushHistoricalUnique(game.highScores, normalized, 'retired-age')) {
                    changed = true;
                }
                changed = true;
                return;
            }
            retained.push(normalized);
        });

        if (retained.length !== game.highScores.topTen.length) {
            game.highScores.topTen = retained;
            changed = true;
        }

        return changed;
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
        this.ensureGameData(data);
        
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
     * Calculate time per word for a score entry
     * @param {Object} scoreEntry - Score entry with time and wordsCount
     * @returns {number} Time per word in seconds
     */
    getTimePerWord(scoreEntry) {
        if (!scoreEntry.wordsCount || scoreEntry.wordsCount === 0) {
            // For legacy scores without wordsCount, assume old default (119 words)
            return scoreEntry.time / 119;
        }
        return scoreEntry.time / scoreEntry.wordsCount;
    }

    /**
     * Check if a time qualifies for the top 10 high scores (now based on time per word)
     * @param {number} time - Total time in seconds to check
     * @param {number} wordsCount - Number of words completed
     * @returns {boolean} True if time qualifies for top 10
     */
    isTopTenScore(time, wordsCount = 100) {
        const data = this.initData();
        this.ensureGameData(data);
        this.retireExpiredTopTenScores(data);
        const topTen = data.games[this.gameId]?.highScores?.topTen || [];
        
        // Always qualifies if less than 10 scores
        if (topTen.length < 10) return true;
        
        // Calculate time per word for the new score
        const newTimePerWord = time / wordsCount;
        
        // Check if better than worst score (by time per word)
        const worstScore = topTen[topTen.length - 1];
        const worstTimePerWord = this.getTimePerWord(worstScore);
        return newTimePerWord < worstTimePerWord;
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
        this.ensureGameData(data);
        this.retireExpiredTopTenScores(data);
        const scoreEntry = {
            initials: initials.toUpperCase().substring(0, 3), // Max 3 characters
            time: time,
            date: new Date().toISOString(),
            timestamp: Date.now(),
            wordsCount: wordsCount || 119
        };
        
        const highScores = data.games[this.gameId].highScores;
        
        // Add to topTen
        highScores.topTen.push(scoreEntry);
        
        // Sort by time per word (fastest per word first) for backwards compatibility
        highScores.topTen.sort((a, b) => {
            const timePerWordA = this.getTimePerWord(a);
            const timePerWordB = this.getTimePerWord(b);
            return timePerWordA - timePerWordB;
        });
        
        // If more than 10, move extras to historical
        while (highScores.topTen.length > 10) {
            const removedScore = highScores.topTen.pop();
            this.pushHistoricalUnique(highScores, removedScore, 'overflow');
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
        this.ensureGameData(data);
        const retired = this.retireExpiredTopTenScores(data);
        if (retired) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        return {
            topTen: data.games[this.gameId]?.highScores?.topTen || [],
            historical: data.games[this.gameId]?.highScores?.historical || []
        };
    }

    /**
     * Return an export-friendly snapshot of all saved records for this game.
     * @returns {Object}
     */
    getExportData() {
        const data = this.initData();
        this.ensureGameData(data);
        const retired = this.retireExpiredTopTenScores(data);
        if (retired) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }

        const game = data.games[this.gameId] || this.createDefaultGameData();
        return {
            exportedAt: new Date().toISOString(),
            gameId: this.gameId,
            gameName: this.gameName,
            developer: this.developer,
            retentionDays: this.topTenRetentionDays,
            user: {
                userId: data.user?.userId || null,
                createdAt: data.user?.createdAt || null,
                preferences: data.user?.preferences || {},
                wordCollection: data.user?.wordCollection || { unlocked: [], nextIndex: 0 }
            },
            stats: game.stats || {},
            highScores: game.highScores || { topTen: [], historical: [] },
            sessions: game.sessions || [],
            settings: game.settings || {}
        };
    }

    /**
     * Reset all save data for this game (useful for testing/debugging)
     */
    resetData() {
        localStorage.removeItem(this.storageKey);
        console.log('🔄 Game data reset complete');
    }

    // ─── Word Collection (Fry / Dolch unlock system) ───────────────────────

    /**
     * Return the player's word collection state.
     * @returns {{ unlocked: string[], nextIndex: number }}
     *   unlocked   – words the player has already been introduced to
     *   nextIndex  – index into the combined target-word pool for the next unlock
     */
    getWordCollection() {
        const data = this.initData();
        if (!data.user.wordCollection) {
            data.user.wordCollection = { unlocked: [], nextIndex: 0 };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
        return data.user.wordCollection;
    }

    /**
     * Mark a word as unlocked (introduced to the player).
     * Safely ignores duplicates.
     * @param {string} word
     */
    unlockWord(word) {
        const data = this.initData();
        if (!data.user.wordCollection) {
            data.user.wordCollection = { unlocked: [], nextIndex: 0 };
        }
        const col = data.user.wordCollection;
        if (!col.unlocked.includes(word)) {
            col.unlocked.push(word);
            col.nextIndex = col.unlocked.length;
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
    }

    /**
     * Check whether a specific word has already been unlocked.
     * @param {string} word
     * @returns {boolean}
     */
    isWordUnlocked(word) {
        return this.getWordCollection().unlocked.includes(word);
    }

    /**
     * Return all unlocked words as an array.
     * @returns {string[]}
     */
    getUnlockedWords() {
        return this.getWordCollection().unlocked;
    }

    /**
     * Return the next word to introduce from the given pool, without unlocking it.
     * Returns null if the entire pool has been unlocked.
     * @param {string[]} pool  Ordered array of target words (e.g. from fry100.json)
     * @returns {string|null}
     */
    peekNextWord(pool) {
        const { nextIndex } = this.getWordCollection();
        return nextIndex < pool.length ? pool[nextIndex] : null;
    }
}