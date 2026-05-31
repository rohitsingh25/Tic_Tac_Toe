# Neon Tic-Tac-Toe

**Live Demo**: [neontictac.vercel.app](https://neontictac.vercel.app/)

A premium, highly responsive, glassmorphic Tic-Tac-Toe single-page application. Features real-time win, draw, and loss probability calculations, a minimax AI hint engine, and dual-difficulty bot configurations.

---

## Features

- **Premium Aesthetics**: Deep space background with glowing neon player marks (`X` in cyan, `O` in magenta) and modern glassmorphic UI card designs.
- **Real-Time Probability Engine**: A recursive mathematical solver calculations updated after every move, providing the user's current probabilities:
  - **Win Probability**: Expected percentage of winning paths from the current layout.
  - **Draw Probability**: Expected percentage of drawing paths.
  - **Loss Probability**: Expected percentage of losing paths.
- **Dual-Difficulty Bots**:
  - **Normal Mode**: Bot moves randomly among available squares. The probability solver assumes the bot plays randomly and user plays optimally.
  - **Master Mode**: Bot uses Minimax theory to play optimally. The probability solver models optimal plays from both sides (resulting in 100% deterministic outputs).
- **First Move Randomness**: Randomly delegates the starting move to either the player or the bot on every initialization or restart.
- **Minimax Hint System**: A hint button that highlights the optimal square(s) using a pulsing green glow animation.
- **Restartability**: Quickly restart the game at any point.

---

## File Structure

```
├── .gitignore         # Files ignored by Git
├── host.md            # Detailed deployment instructions for Vercel/Render
├── index.html         # Application entry point (markup)
├── src/               # Source directory
│   ├── css/
│   │   └── style.css  # Styling, glassmorphic tokens, and animations
│   └── js/
│       └── script.js  # Game mechanics, solver engine, and AI logic
└── README.md          # Project documentation (this file)
```

---

## Running Locally

To run the application locally, you just need a simple static web server. Since there is no build step, you can use any of the following methods:

### Option A: Python HTTP Server (Standard)
If you have Python installed, run this command in your project root:
```bash
python -m http.server 8000
```
Then open your browser and navigate to `http://localhost:8000`.

### Option B: Node.js (npx serve)
If you have Node.js installed, run:
```bash
npx serve
```
Then open the local URL printed in the console.

### Option C: Browser Double-Click
You can also simply open the `index.html` file in any modern web browser by double-clicking it. However, a local server is recommended for testing all browser features accurately.

---

## Deployment & Hosting

Detailed step-by-step instructions for deploying to GitHub and hosting on **Vercel** and **Render** are available in the [host.md](host.md) file.

---

Developed with ❤️ by **Rohit Singh Yadav**
