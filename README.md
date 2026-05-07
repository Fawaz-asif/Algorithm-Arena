<div align="center">

# ⚔️ Algorithm Arena

### Interactive Search Algorithm Visualization & Comparison

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Static Deployment](https://img.shields.io/badge/Deployed-GitHub_Pages-2EA44F?style=for-the-badge&logo=github&logoColor=white)](#)

**Algorithm Arena** is a web-based educational tool that brings search algorithms to life. It provides side-by-side, real-time visual comparisons of how different algorithms perform pathfinding and search operations under various constraints and speeds.

[Features](#-features) • [Minigames](#-minigames) • [Getting Started](#-getting-started) • [Architecture](#-architecture)

</div>

---

## ✨ Features

- 🏎️ **Real-Time Speed Control**: Adjust the execution speed of algorithms dynamically while they run.
- 📊 **Side-by-Side Comparison**: Watch two different algorithms solve the same puzzle simultaneously to visually compare their efficiency.
- 🧩 **Interactive Minigames**: Test algorithms against specific scenarios (Grid Pathfinding, Word Ladder, etc.).
- 🎨 **Modern UI**: Clean, responsive interface built with React, styled for educational demonstrations.
- 🚀 **Zero Dependencies**: Client-side execution with standalone React components — no build step or backend required.

---

## 🎮 Minigames & Scenarios

### 1. Grid Pathfinding
Algorithms must navigate from a starting point to a destination on a 2D grid while avoiding obstacles.
- **Supported Algorithms**: A*, Dijkstra's, Breadth-First Search (BFS), Depth-First Search (DFS).
- **Visualization**: Shows explored nodes, current path, and the final optimal route.

### 2. Word Ladder
Algorithms solve the classic Word Ladder puzzle, transforming one word into another by changing one letter at a time using valid dictionary words.
- **Supported Algorithms**: BFS (Optimal), Bidirectional Search, A* (Heuristic-based).
- **Visualization**: Generates the word tree as the search expands.

---

## 🚀 Getting Started

Because the project uses standalone React with in-browser Babel compilation, there is no complex build process required.

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Fawaz-asif/Algorithm-Arena.git
   cd Algorithm-Arena
   ```

2. **Serve the files**:
   You can use any local web server. For example, using Python or Node:
   ```bash
   # Using Python
   python -m http.server 8080

   # OR using Node (npx)
   npx serve -p 3000
   ```

3. **Open your browser**:
   Navigate to `http://localhost:8080` (or `3000`) to enter the Arena.

---

## 🏗️ Architecture & Codebase

The codebase is intentionally kept flat and simple to serve as an accessible educational reference.

- **`index.html`**: The main entry point, loads CDN dependencies (React, ReactDOM, Babel, Tailwind CSS).
- **`app.jsx`**: The core React application containing the UI state, minigame routing, and visualization logic.
- **`algorithms.js`**: Pure JavaScript implementations of all search algorithms, built as generator functions (`function*`) to allow pausing and resuming execution for visualization.
- **`Algorithm_Arena_Project_Report.txt`**: Comprehensive documentation on the project's academic goals and findings.

---

## 💡 How It Works (The Generator Pattern)

To achieve real-time visualization without freezing the browser, the algorithms are implemented using JavaScript **Generator Functions**. 

Instead of completing the search in one blocking loop, the algorithms `yield` their current state at each step. The React frontend uses `requestAnimationFrame` or `setTimeout` to process these yields, rendering the step-by-step progress visually!

```javascript
// Simplified example of the visualization pattern
function* bfs(startNode, endNode) {
    let queue = [startNode];
    while(queue.length > 0) {
        let current = queue.shift();
        yield current; // Pause execution and update UI
        // ... process neighbors
    }
}
```

---

## 👨‍💻 Author

**Fawaz Asif**
- GitHub: [@Fawaz-asif](https://github.com/Fawaz-asif)

---

## 📄 License

This project is open-source and available under the MIT License.
