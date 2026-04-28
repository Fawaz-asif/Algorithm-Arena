// Maze Generation Helper
function generateMaze(width, height) {
    const grid = Array.from({ length: height }, () => Array(width).fill(1)); // 1 is wall, 0 is path
    
    // Recursive Backtracking
    function dig(r, c) {
        grid[r][c] = 0;
        const dirs = [ [0, -2], [0, 2], [-2, 0], [2, 0] ];
        // Shuffle directions
        dirs.sort(() => Math.random() - 0.5);
        for (let [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr > 0 && nr < height - 1 && nc > 0 && nc < width - 1 && grid[nr][nc] === 1) {
                grid[r + dr/2][c + dc/2] = 0;
                dig(nr, nc);
            }
        }
    }
    dig(1, 1);
    
    // Knock down ~8% of walls to create loops (imperfect maze). 
    // This allows DFS to make mistakes and take sub-optimal paths, proving BFS is better for shortest path.
    for (let r = 1; r < height - 1; r++) {
        for (let c = 1; c < width - 1; c++) {
            if (grid[r][c] === 1 && Math.random() < 0.08) {
                grid[r][c] = 0;
            }
        }
    }
    
    grid[0][1] = 0; // Start
    grid[height - 1][width - 2] = 0; // End
    return grid;
}

// Helper to get neighbors
function getMazeNeighbors(r, c, grid, width, height) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const neighbors = [];
    for (let [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === 0) {
            neighbors.push([nr, nc]);
        }
    }
    return neighbors;
}

// 1. Maze Algorithms
function* mazeBFS(grid, startR, startC, endR, endC) {
    const width = grid[0].length, height = grid.length;
    const queue = [{r: startR, c: startC, path: [[startR, startC]]}];
    const visited = new Set([`${startR},${startC}`]);
    let nodesExplored = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        nodesExplored++;
        
        yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: false };

        if (current.r === endR && current.c === endC) {
            yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: true };
            return;
        }

        const neighbors = getMazeNeighbors(current.r, current.c, grid, width, height);
        for (let [nr, nc] of neighbors) {
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: nr, c: nc, path: [...current.path, [nr, nc]] });
            }
        }
    }
    yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: [], stats: { nodesExplored, pathLength: 0 }, done: true };
}

function* mazeDFS(grid, startR, startC, endR, endC) {
    const width = grid[0].length, height = grid.length;
    const stack = [{r: startR, c: startC, path: [[startR, startC]]}];
    const visited = new Set([`${startR},${startC}`]);
    let nodesExplored = 0;

    while (stack.length > 0) {
        const current = stack.pop();
        nodesExplored++;
        
        if (!visited.has(`${current.r},${current.c}`)) {
            visited.add(`${current.r},${current.c}`);
        }

        yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: false };

        if (current.r === endR && current.c === endC) {
            yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: true };
            return;
        }

        const neighbors = getMazeNeighbors(current.r, current.c, grid, width, height);
        for (let [nr, nc] of neighbors) {
            if (!visited.has(`${nr},${nc}`)) {
                stack.push({ r: nr, c: nc, path: [...current.path, [nr, nc]] });
            }
        }
    }
    yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: [], stats: { nodesExplored, pathLength: 0 }, done: true };
}

function* mazeUCS(grid, startR, startC, endR, endC) {
    // For unweighted grid, UCS is BFS but managed with a priority queue (cost)
    const width = grid[0].length, height = grid.length;
    const pq = [{cost: 0, r: startR, c: startC, path: [[startR, startC]]}];
    const visited = new Set();
    let nodesExplored = 0;

    while (pq.length > 0) {
        pq.sort((a,b) => a.cost - b.cost);
        const current = pq.shift();
        
        const key = `${current.r},${current.c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        nodesExplored++;

        yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: false };

        if (current.r === endR && current.c === endC) {
            yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: current.path, stats: { nodesExplored, pathLength: current.path.length }, done: true };
            return;
        }

        const neighbors = getMazeNeighbors(current.r, current.c, grid, width, height);
        for (let [nr, nc] of neighbors) {
            if (!visited.has(`${nr},${nc}`)) {
                pq.push({ cost: current.cost + 1, r: nr, c: nc, path: [...current.path, [nr, nc]] });
            }
        }
    }
    yield { visited: Array.from(visited).map(s => s.split(',').map(Number)), current: [], stats: { nodesExplored, pathLength: 0 }, done: true };
}

function* mazeDLS(grid, startR, startC, endR, endC, limit = 20) {
    const width = grid[0].length, height = grid.length;
    let nodesExplored = 0;
    const visitedSet = new Set();
    let found = null;

    function* recursiveDLS(node, path, depth) {
        nodesExplored++;
        visitedSet.add(`${node.r},${node.c}`);
        yield { visited: Array.from(visitedSet).map(s => s.split(',').map(Number)), current: path, stats: { nodesExplored, pathLength: path.length }, done: false };
        
        if (node.r === endR && node.c === endC) {
            found = path;
            return true;
        }
        if (depth === limit) return false;

        const neighbors = getMazeNeighbors(node.r, node.c, grid, width, height);
        for (let [nr, nc] of neighbors) {
            if (!path.find(p => p[0] === nr && p[1] === nc)) {
                const res = yield* recursiveDLS({r:nr, c:nc}, [...path, [nr, nc]], depth + 1);
                if (res) return true;
            }
        }
        return false;
    }
    
    yield* recursiveDLS({r: startR, c: startC}, [[startR, startC]], 0);
    
    if (found) {
        yield { visited: Array.from(visitedSet).map(s => s.split(',').map(Number)), current: found, stats: { nodesExplored, pathLength: found.length }, done: true };
    } else {
        yield { visited: Array.from(visitedSet).map(s => s.split(',').map(Number)), current: [], stats: { nodesExplored, pathLength: 0 }, done: true };
    }
}

function* mazeIDDFS(grid, startR, startC, endR, endC) {
    const width = grid[0].length, height = grid.length;
    let maxDepth = 0;
    let nodesExplored = 0;
    const allVisited = new Set();
    
    while (maxDepth < width * height) {
        const visitedSet = new Set();
        let found = null;
        
        function* recursiveDLS(node, path, depth) {
            nodesExplored++;
            visitedSet.add(`${node.r},${node.c}`);
            allVisited.add(`${node.r},${node.c}`);
            yield { visited: Array.from(allVisited).map(s => s.split(',').map(Number)), current: path, stats: { nodesExplored, pathLength: path.length, currentLimit: maxDepth }, done: false };
            
            if (node.r === endR && node.c === endC) {
                found = path;
                return true;
            }
            if (depth === maxDepth) return false;

            const neighbors = getMazeNeighbors(node.r, node.c, grid, width, height);
            for (let [nr, nc] of neighbors) {
                if (!path.find(p => p[0] === nr && p[1] === nc)) {
                    const res = yield* recursiveDLS({r:nr, c:nc}, [...path, [nr, nc]], depth + 1);
                    if (res) return true;
                }
            }
            return false;
        }
        
        const res = yield* recursiveDLS({r: startR, c: startC}, [[startR, startC]], 0);
        if (res) {
            yield { visited: Array.from(allVisited).map(s => s.split(',').map(Number)), current: found, stats: { nodesExplored, pathLength: found.length, currentLimit: maxDepth }, done: true };
            return;
        }
        maxDepth++;
    }
    yield { visited: Array.from(allVisited).map(s => s.split(',').map(Number)), current: [], stats: { nodesExplored, pathLength: 0 }, done: true };
}


// --- 2. Word Ladder Algorithms (Informed Search) ---
const WORD_DICT = new Set([
    "CAT","BAT","RAT","MAT","HAT","FAT","PAT","SAT","VAT",
    "COT","DOT","HOT","LOT","NOT","POT","ROT","TOT",
    "COG","DOG","LOG","BOG","FOG","HOG","JOG",
    "CAR","BAR","TAR","FAR","JAR","PAR","WAR",
    "CAP","MAP","TAP","GAP","LAP","NAP","RAP",
    "COP","MOP","TOP","HOP","POP",
    "CUT","BUT","HUT","NUT","RUT",
    "CUP","PUP",
    "BUG","HUG","MUG","RUG","TUG","JUG",
    "DIG","BIG","PIG","RIG","WIG","FIG",
    "DIP","LIP","RIP","SIP","TIP","ZIP",
    "BAD","DAD","HAD","MAD","PAD","SAD",
    "BED","FED","LED","RED","WED",
    "BID","DID","HID","KID","LID","RID",
    "BUD","MUD"
]);

function generateWordPair() {
    const pairs = [
        ["CAT", "DOG"], ["BAT", "PIG"], ["WAR", "DOG"],
        ["PUP", "DOG"], ["MUD", "BIG"], ["HUT", "DOG"],
        ["RED", "MAD"], ["SAD", "BUG"]
    ];
    return pairs[Math.floor(Math.random() * pairs.length)];
}

function getWordNeighbors(word) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const neighbors = [];
    for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < letters.length; j++) {
            if (letters[j] !== word[i]) {
                const newWord = word.substring(0, i) + letters[j] + word.substring(i + 1);
                if (WORD_DICT.has(newWord)) {
                    neighbors.push(newWord);
                }
            }
        }
    }
    return neighbors;
}

function getWordHeuristic(word, target) {
    let diff = 0;
    for (let i = 0; i < word.length; i++) {
        if (word[i] !== target[i]) diff++;
    }
    return diff;
}

function* wordGreedy(startWord, endWord) {
    const pq = [{ word: startWord, h: getWordHeuristic(startWord, endWord), path: [startWord], g: 0 }];
    const visited = new Set();
    let nodesExplored = 0;
    
    while (pq.length > 0) {
        pq.sort((a,b) => a.h - b.h);
        const current = pq.shift();
        
        if (visited.has(current.word)) continue;
        visited.add(current.word);
        nodesExplored++;
        
        yield { visited: Array.from(visited), current: current.path, stats: { nodesExplored, cost: current.g }, done: false };
        
        if (current.word === endWord) {
            yield { visited: Array.from(visited), current: current.path, stats: { nodesExplored, cost: current.g }, done: true };
            return;
        }
        
        const neighbors = getWordNeighbors(current.word);
        for (let n of neighbors) {
            if (!visited.has(n)) {
                pq.push({ word: n, h: getWordHeuristic(n, endWord), path: [...current.path, n], g: current.g + 1 });
            }
        }
    }
    yield { visited: Array.from(visited), current: [], stats: { nodesExplored, cost: Infinity }, done: true };
}

function* wordAStar(startWord, endWord) {
    const pq = [{ word: startWord, f: getWordHeuristic(startWord, endWord), g: 0, path: [startWord] }];
    const visited = new Map();
    let nodesExplored = 0;
    
    while (pq.length > 0) {
        pq.sort((a,b) => a.f - b.f);
        const current = pq.shift();
        
        if (visited.has(current.word) && visited.get(current.word) <= current.g) continue;
        visited.set(current.word, current.g);
        nodesExplored++;
        
        yield { visited: Array.from(visited.keys()), current: current.path, stats: { nodesExplored, cost: current.g }, done: false };
        
        if (current.word === endWord) {
            yield { visited: Array.from(visited.keys()), current: current.path, stats: { nodesExplored, cost: current.g }, done: true };
            return;
        }
        
        const neighbors = getWordNeighbors(current.word);
        for (let n of neighbors) {
            const newG = current.g + 1;
            if (!visited.has(n) || visited.get(n) > newG) {
                pq.push({ word: n, f: newG + getWordHeuristic(n, endWord), g: newG, path: [...current.path, n] });
            }
        }
    }
    yield { visited: Array.from(visited.keys()), current: [], stats: { nodesExplored, cost: Infinity }, done: true };
}

function* wordIDAStar(startWord, endWord) {
    let threshold = getWordHeuristic(startWord, endWord);
    let nodesExplored = 0;
    const visitedKeys = new Set();
    
    function* search(path, g, bound) {
        const current = path[path.length - 1];
        const h = getWordHeuristic(current, endWord);
        const f = g + h;
        
        nodesExplored++;
        visitedKeys.add(current);
        yield { visited: Array.from(visitedKeys), current: path, stats: { nodesExplored, cost: g }, done: false, result: null };
        
        if (f > bound) return f;
        if (current === endWord) return "FOUND";
        
        let min = Infinity;
        const neighbors = getWordNeighbors(current);
        for(let n of neighbors) {
            if(!path.includes(n)) {
                const resObj = yield* search([...path, n], g + 1, bound);
                if (resObj === "FOUND") return "FOUND";
                if (resObj < min) min = resObj;
            }
        }
        return min;
    }
    
    let currentPath = [startWord];
    while (true) {
        let res = yield* search(currentPath, 0, threshold);
        if (res === "FOUND") {
            yield { visited: Array.from(visitedKeys), current: currentPath, stats: { nodesExplored, cost: threshold }, done: true };
            return;
        }
        if (res === Infinity) {
            yield { visited: Array.from(visitedKeys), current: [], stats: { nodesExplored, cost: Infinity }, done: true };
            return;
        }
        threshold = res;
    }
}

function* wordRBFS(startWord, endWord) {
    let nodesExplored = 0;
    const visitedKeys = new Set();
    
    function* rbfs(path, g, fLimit) {
        const current = path[path.length - 1];
        const h = getWordHeuristic(current, endWord);
        const f = Math.max(g + h, fLimit);
        
        nodesExplored++;
        visitedKeys.add(current);
        yield { visited: Array.from(visitedKeys), current: path, stats: { nodesExplored, cost: g }, done: false };
        
        if (current === endWord) return {res: "FOUND", f: f};
        
        const neighbors = getWordNeighbors(current).filter(n => !path.includes(n));
        if (neighbors.length === 0) return {res: "FAIL", f: Infinity};
        
        const successors = neighbors.map(n => {
            const hVal = getWordHeuristic(n, endWord);
            return { word: n, g: g + 1, f: Math.max(g + 1 + hVal, f) };
        });
        
        while(true) {
            successors.sort((a,b) => a.f - b.f);
            const best = successors[0];
            if (best.f > fLimit) return {res: "FAIL", f: best.f};
            
            const alt = successors.length > 1 ? successors[1].f : Infinity;
            const newLimit = Math.min(fLimit, alt);
            
            const resObj = yield* rbfs([...path, best.word], best.g, newLimit);
            best.f = resObj.f;
            
            if (resObj.res === "FOUND") return {res: "FOUND", f: best.f};
        }
    }
    
    const hStart = getWordHeuristic(startWord, endWord);
    yield* rbfs([startWord], 0, hStart);
    yield { visited: Array.from(visitedKeys), current: [], stats: { nodesExplored, cost: Infinity }, done: true };
}


// --- 3. Tic-Tac-Toe (Adversarial Search) Algorithms ---

function checkWin(board) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8], // rows
        [0,3,6],[1,4,7],[2,5,8], // cols
        [0,4,8],[2,4,6] // diags
    ];
    for(let [a,b,c] of lines) {
        if(board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return board.includes(null) ? null : 'Tie';
}

function getAvailableMoves(board) {
    return board.map((v, i) => v === null ? i : null).filter(v => v !== null);
}

function* tttMinimax(initialBoard, player) {
    let nodesExplored = 0;
    const opponent = player === 'X' ? 'O' : 'X';

    function* minimax(board, isMaximizing) {
        nodesExplored++;
        yield { board: [...board], stats: { nodesExplored, branchesPruned: 0 }, done: false };

        const winner = checkWin(board);
        if (winner === player) return { score: 10 };
        if (winner === opponent) return { score: -10 };
        if (winner === 'Tie') return { score: 0 };

        const moves = getAvailableMoves(board);
        let bestMove = -1;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                board[move] = player;
                const result = yield* minimax(board, false);
                board[move] = null;
                if (result.score > maxEval) {
                    maxEval = result.score;
                    bestMove = move;
                }
            }
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                board[move] = opponent;
                const result = yield* minimax(board, true);
                board[move] = null;
                if (result.score < minEval) {
                    minEval = result.score;
                    bestMove = move;
                }
            }
            return { score: minEval, move: bestMove };
        }
    }

    const result = yield* minimax([...initialBoard], true);
    yield { board: [...initialBoard], bestMove: result.move, stats: { nodesExplored, branchesPruned: 0 }, done: true };
}

function* tttAlphaBeta(initialBoard, player) {
    let nodesExplored = 0;
    let branchesPruned = 0;
    const opponent = player === 'X' ? 'O' : 'X';

    function* alphabeta(board, depth, alpha, beta, isMaximizing) {
        nodesExplored++;
        yield { board: [...board], stats: { nodesExplored, branchesPruned }, done: false };

        const winner = checkWin(board);
        if (winner === player) return { score: 10 - depth };
        if (winner === opponent) return { score: -10 + depth };
        if (winner === 'Tie') return { score: 0 };

        const moves = getAvailableMoves(board);
        let bestMove = -1;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                board[move] = player;
                const result = yield* alphabeta(board, depth + 1, alpha, beta, false);
                board[move] = null;
                if (result.score > maxEval) {
                    maxEval = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) {
                    branchesPruned++;
                    break;
                }
            }
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                board[move] = opponent;
                const result = yield* alphabeta(board, depth + 1, alpha, beta, true);
                board[move] = null;
                if (result.score < minEval) {
                    minEval = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, result.score);
                if (beta <= alpha) {
                    branchesPruned++;
                    break;
                }
            }
            return { score: minEval, move: bestMove };
        }
    }

    const result = yield* alphabeta([...initialBoard], 0, -Infinity, Infinity, true);
    yield { board: [...initialBoard], bestMove: result.move, stats: { nodesExplored, branchesPruned }, done: true };
}

function* tttRandom(initialBoard, player) {
    yield { board: [...initialBoard], stats: { nodesExplored: 1, branchesPruned: 0 }, done: false };
    const moves = getAvailableMoves(initialBoard);
    const move = moves[Math.floor(Math.random() * moves.length)];
    // Add artificial delay to simulate thinking so it doesn't instantly finish
    for(let i=0; i<5; i++) {
        yield { board: [...initialBoard], stats: { nodesExplored: 1+i, branchesPruned: 0 }, done: false };
    }
    yield { board: [...initialBoard], bestMove: move, stats: { nodesExplored: 5, branchesPruned: 0 }, done: true };
}

function* tttGreedy(initialBoard, player) {
    let nodesExplored = 0;
    const opponent = player === 'X' ? 'O' : 'X';
    const moves = getAvailableMoves(initialBoard);
    
    // Check for immediate win
    for (let move of moves) {
        nodesExplored++;
        let board = [...initialBoard];
        board[move] = player;
        yield { board, stats: { nodesExplored, branchesPruned: 0 }, done: false };
        if (checkWin(board) === player) {
            yield { board: [...initialBoard], bestMove: move, stats: { nodesExplored, branchesPruned: 0 }, done: true };
            return;
        }
    }
    
    // Check for immediate block
    for (let move of moves) {
        nodesExplored++;
        let board = [...initialBoard];
        board[move] = opponent;
        yield { board, stats: { nodesExplored, branchesPruned: 0 }, done: false };
        if (checkWin(board) === opponent) {
            yield { board: [...initialBoard], bestMove: move, stats: { nodesExplored, branchesPruned: 0 }, done: true };
            return;
        }
    }
    
    // Otherwise pick center, then random
    const move = moves.includes(4) ? 4 : moves[0];
    yield { board: [...initialBoard], bestMove: move, stats: { nodesExplored, branchesPruned: 0 }, done: true };
}

// --- 4. 8-Puzzle (Local Search) ---
function generatePuzzle() {
    // Generate a solvable puzzle by making random moves from the goal state
    let board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    for (let i = 0; i < 40; i++) { // Random walk
        const neighbors = getPuzzleNeighbors(board);
        board = neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    return board;
}

function getManhattan(board) {
    let dist = 0;
    for(let i=0; i<9; i++) {
        if(board[i] === 0) continue;
        let targetX = (board[i]-1) % 3;
        let targetY = Math.floor((board[i]-1) / 3);
        let currX = i % 3;
        let currY = Math.floor(i / 3);
        dist += Math.abs(targetX - currX) + Math.abs(targetY - currY);
    }
    return dist;
}

function getPuzzleNeighbors(board) {
    const neighbors = [];
    const z = board.indexOf(0);
    const x = z % 3, y = Math.floor(z / 3);
    const moves = [];
    if(x > 0) moves.push(-1); // left
    if(x < 2) moves.push(1);  // right
    if(y > 0) moves.push(-3); // up
    if(y < 2) moves.push(3);  // down
    
    for(let m of moves) {
        let n = [...board];
        [n[z], n[z+m]] = [n[z+m], n[z]];
        neighbors.push(n);
    }
    return neighbors;
}

function* puzzleHillClimbing(initialBoard, maxIters = 500) {
    let currentBoard = [...initialBoard];
    let currentCost = getManhattan(currentBoard);
    let moves = 0;
    
    for(let iter=0; iter<maxIters; iter++) {
        if (currentCost === 0) break;
        
        const neighbors = getPuzzleNeighbors(currentBoard);
        let bestNeighbor = null;
        let bestCost = Infinity;
        
        for(let n of neighbors) {
            let cost = getManhattan(n);
            if (cost < bestCost) {
                bestCost = cost;
                bestNeighbor = n;
            }
        }
        
        // Strict Hill Climbing: if neighbor isn't better, we are stuck!
        if (bestCost >= currentCost) {
            yield { board: currentBoard, stats: { iteration: iter, cost: currentCost, moves }, done: true, stuck: true };
            return;
        }
        
        currentBoard = bestNeighbor;
        currentCost = bestCost;
        moves++;
        yield { board: currentBoard, stats: { iteration: iter, cost: currentCost, moves }, done: false };
    }
    yield { board: currentBoard, stats: { iteration: maxIters, cost: currentCost, moves }, done: true };
}

function* puzzleSimulatedAnnealing(initialBoard, maxIters = 500) {
    let currentBoard = [...initialBoard];
    let currentCost = getManhattan(currentBoard);
    let T = 100;
    const coolingRate = 0.95;
    let moves = 0;
    
    for(let iter=0; iter<maxIters; iter++) {
        if (currentCost === 0) break;
        
        const neighbors = getPuzzleNeighbors(currentBoard);
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        const cost = getManhattan(neighbor);
        
        if (cost < currentCost || Math.random() < Math.exp((currentCost - cost) / T)) {
            currentBoard = neighbor;
            currentCost = cost;
            moves++;
        }
        
        T *= coolingRate;
        yield { board: currentBoard, stats: { iteration: iter, cost: currentCost, moves }, done: false };
    }
    yield { board: currentBoard, stats: { iteration: maxIters, cost: currentCost, moves }, done: true };
}

function* puzzleBeamSearch(initialBoard, maxIters = 500, k = 3) {
    let beams = [{ board: [...initialBoard], cost: getManhattan(initialBoard) }];
    let bestOverall = beams[0];
    let moves = 0;

    for(let iter=0; iter<maxIters; iter++) {
        if (bestOverall.cost === 0) break;
        moves++;
        
        let allNeighbors = [];
        for(let b of beams) {
            const neighbors = getPuzzleNeighbors(b.board);
            for(let n of neighbors) {
                allNeighbors.push({ board: n, cost: getManhattan(n) });
            }
        }
        
        // Sort and keep top K
        allNeighbors.sort((a,b) => a.cost - b.cost);
        
        // To avoid picking the exact same state for all beams, we could filter unique boards, 
        // but simple beam search just takes top k.
        const uniqueNeighbors = [];
        const seen = new Set();
        for(let n of allNeighbors) {
            const key = n.board.join(',');
            if(!seen.has(key)) {
                seen.add(key);
                uniqueNeighbors.push(n);
            }
        }
        
        beams = uniqueNeighbors.slice(0, k);
        if (beams.length === 0) break; // Dead end
        
        if (beams[0].cost < bestOverall.cost) {
            bestOverall = beams[0];
        } else {
            // If the best beam doesn't improve upon our best, beam search is stuck
            yield { board: bestOverall.board, stats: { iteration: iter, cost: bestOverall.cost, moves }, done: true, stuck: true };
            return;
        }
        
        yield { board: bestOverall.board, stats: { iteration: iter, cost: bestOverall.cost, moves }, done: false };
    }
    yield { board: bestOverall.board, stats: { iteration: maxIters, cost: bestOverall.cost, moves }, done: true };
}

window.Algorithms = {
    generateMaze, mazeBFS, mazeDFS, mazeUCS, mazeDLS, mazeIDDFS,
    generateWordPair, wordGreedy, wordAStar, wordIDAStar, wordRBFS,
    tttMinimax, tttAlphaBeta, tttRandom, tttGreedy,
    generatePuzzle, getManhattan, puzzleHillClimbing, puzzleSimulatedAnnealing, puzzleBeamSearch
};
