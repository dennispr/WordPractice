# Word Practice App

A Pixi.js web application for practicing with words. Words are displayed one at a time with randomly selected Google Fonts.

## Features

- **Title Screen**: Start button to begin word practice
- **Word Practice**: 
  - Display words one at a time, centered on screen
  - Navigate with Next/Back buttons or arrow keys (←/→)
  - Random Google Fonts applied to each word (6 fonts available)
- **End Screen**: Completion message with option to return to title

## How to Run

### Option 1: Using npm (Recommended)
```bash
npm install
npm start
```
This will start a local server and open the app in your browser at http://localhost:8080

### Option 2: Direct File Access
Simply open `index.html` in a modern web browser. Note: Due to CORS restrictions, you may need to use a local web server.

### Option 3: Using Python
```bash
python -m http.server 8080
```
Then open http://localhost:8080 in your browser.

## How to Add New Words

Edit the `words.csv` file and add one word per line:

```
word
apple
banana
cat
dog
elephant
```

Simply add or remove lines to customize your word list. The app will automatically load all words from this file.

## Controls

- **Mouse**: Click on buttons to navigate
- **Keyboard**: 
  - Right Arrow (→): Next word
  - Left Arrow (←): Previous word

## Technology Stack

- **Pixi.js v7**: High-performance 2D rendering engine
- **Google Fonts**: 6 different fonts (Roboto, Open Sans, Lato, Oswald, Montserrat, Playfair Display)
- **Vanilla JavaScript**: No additional frameworks required

## Browser Compatibility

Works on all modern browsers that support:
- ES6+ JavaScript
- Canvas API
- Fetch API
