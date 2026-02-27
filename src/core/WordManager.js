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

/** Return the full practice word list (read-only reference). */
export function getPracticeWords() {
    return _allPracticeWords;
}

/** Return the full homework word list (read-only reference). */
export function getHomeworkWords() {
    return _allHomeworkWords;
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
