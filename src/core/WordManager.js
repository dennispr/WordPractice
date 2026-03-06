/**
 * WordManager - Handles all word-list loading and session preparation.
 *
 * Responsibilities:
 *  - Fetch and cache practice words (words.csv)
 *  - Fetch and cache homework words (homework.csv)
 *  - Return a shuffled, length-capped copy for a new session
 *
 * Has zero dependencies on PIXI or any game state.
 */

let _allPracticeWords = [];
let _allHomeworkWords = [];
let _allLyricsLines = [];

/** Return the full practice word list (read-only reference). */
export function getPracticeWords() {
    return _allPracticeWords;
}

/** Return the full homework word list (read-only reference). */
export function getHomeworkWords() {
    return _allHomeworkWords;
}

/**
 * Return the lyrics lines array.
 * Each entry is a string[] of whitespace-split tokens for that line.
 */
export function getLyricsLines() {
    return _allLyricsLines;
}

/**
 * Load practice words from words.csv.
 * Must be awaited during app init before starting any session.
 */
export async function loadPracticeWords() {
    try {
        const response = await fetch('words.csv');
        const text = await response.text();
        _allPracticeWords = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        console.log(`Loaded ${_allPracticeWords.length} practice words`);
    } catch (error) {
        console.error('Error loading practice words:', error);
        _allPracticeWords = ['Error', 'loading', 'words'];
    }
}

/**
 * Load homework words from homework.csv.
 * Must be awaited during app init before starting any session.
 */
export async function loadHomeworkWords() {
    try {
        const response = await fetch('homework.csv');
        const text = await response.text();
        _allHomeworkWords = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        console.log(`Loaded ${_allHomeworkWords.length} homework words`);
    } catch (error) {
        console.error('Error loading homework words:', error);
        _allHomeworkWords = ['homework', 'words', 'missing'];
    }
}

/**
 * Load lyrics lines from lyrics.csv.
 * Each non-empty line is split by whitespace into an array of tokens.
 * Must be awaited during app init before starting any lyrics session.
 */
export async function loadLyricsLines() {
    try {
        const response = await fetch('lyrics.csv');
        const text = await response.text();
        _allLyricsLines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.split(/\s+/));
        console.log(`Loaded ${_allLyricsLines.length} lyrics lines`);
    } catch (error) {
        console.error('Error loading lyrics:', error);
        _allLyricsLines = [['Error', 'loading', 'lyrics']];
    }
}

/**
 * Return a new shuffled copy of `sourceArray`, capped at `count` entries.
 * Uses Fisher-Yates so the original array is never mutated.
 *
 * @param {string[]} sourceArray - The word pool to draw from
 * @param {number}   count       - Max words per session (default 100)
 * @returns {string[]} Shuffled word list ready for a game session
 */
export function prepareWords(sourceArray, count = 100) {
    const copy = [...sourceArray];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const result = copy.slice(0, count);
    console.log(`Selected ${result.length} words for this session`);
    return result;
}
