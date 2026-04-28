const { useState, useEffect, useRef, useMemo } = React;

const CATEGORIES = {
    UNINFORMED: { id: 'maze', name: 'Maze Solver', label: 'Uninformed Search', icon: '🌀' },
    INFORMED: { id: 'path', name: 'Word Ladder Solver', label: 'Informed Search', icon: '📝' },
    ADVERSARIAL: { id: 'ttt', name: 'Tic-Tac-Toe Arena', label: 'Adversarial Search', icon: '⚔️' },
    LOCAL: { id: 'puzzle', name: '8-Puzzle Solver', label: 'Local Search', icon: '🧩' }
};

const ALGO_OPTIONS = {
    maze: ['BFS', 'DFS', 'UCS', 'DLS', 'IDDFS'],
    path: ['Greedy BFS', 'A*', 'IDA*', 'RBFS'],
    ttt: ['Minimax', 'Alpha-Beta', 'Greedy', 'Random'],
    puzzle: ['Hill Climbing', 'Simulated Annealing', 'Beam Search']
};

function useAlgoRace(genFactoryA, genFactoryB, tickMs = 80, dependencies = []) {
    const [stateA, setStateA] = useState(null);
    const [stateB, setStateB] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, running, finished
    const [winner, setWinner] = useState(null);

    const runnersRef = useRef({ a: null, b: null });
    const timerRef = useRef(null);

    const start = () => {
        runnersRef.current = { a: genFactoryA(), b: genFactoryB() };
        setStatus('running');
        setWinner(null);
        setStateA(null);
        setStateB(null);
    };

    const stop = () => {
        setStatus('idle');
    };

    useEffect(() => {
        if (status !== 'running') return;

        const interval = setInterval(() => {
            let aDone = false, bDone = false;
            
            if (runnersRef.current.a) {
                const resA = runnersRef.current.a.next();
                if (resA.value) setStateA(resA.value);
                if (resA.done) { aDone = true; runnersRef.current.a = null; }
            } else { aDone = true; }

            if (runnersRef.current.b) {
                const resB = runnersRef.current.b.next();
                if (resB.value) setStateB(resB.value);
                if (resB.done) { bDone = true; runnersRef.current.b = null; }
            } else { bDone = true; }

            if (aDone && bDone) {
                setStatus('finished');
            }
        }, tickMs);

        return () => clearInterval(interval);
    }, [status, tickMs, ...dependencies]);

    return { stateA, stateB, status, start, stop, setWinner, winner };
}

const ResultModal = ({ winner, reason, statsA, statsB, nameA, nameB, onClose }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 rounded-xl p-8 max-w-2xl w-full border border-zinc-800 shadow-2xl slide-up">
            <h2 className="text-3xl font-bold mb-2 text-center text-white">
                {winner === 'A' ? <span className="text-emerald-500">You Won!</span> : winner === 'B' ? <span className="text-violet-500">Computer Won!</span> : "It's a Tie!"}
            </h2>
            <p className="text-zinc-300 text-center mb-6 italic">{reason}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-8 text-center bg-zinc-950 rounded-lg p-4">
                <div className="font-bold text-emerald-400">{nameA} (You)</div>
                <div className="font-semibold text-zinc-500">vs</div>
                <div className="font-bold text-violet-400">{nameB} (Comp)</div>
                
                {Object.keys(statsA || {}).map(k => (
                    <React.Fragment key={k}>
                        <div className="text-zinc-300">{statsA[k]}</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-wider self-center">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-zinc-300">{statsB?.[k]}</div>
                    </React.Fragment>
                ))}
            </div>
            
            <button onClick={onClose} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors">
                Close
            </button>
        </div>
    </div>
);

// 1. Maze Solver
const MazeSolver = ({ userAlgo, compAlgo, speedMultiplier, setSpeedMultiplier, onBack }) => {
    const [grid, setGrid] = useState([]);
    const [mapKey, setMapKey] = useState(0); // For forcing regeneration
    const [winCriteria, setWinCriteria] = useState('nodes'); // 'nodes' or 'path'
    
    useEffect(() => { setGrid(Algorithms.generateMaze(31, 31)); }, [mapKey]);

    const factoryMap = {
        'BFS': () => Algorithms.mazeBFS(grid, 1, 1, 29, 29),
        'DFS': () => Algorithms.mazeDFS(grid, 1, 1, 29, 29),
        'UCS': () => Algorithms.mazeUCS(grid, 1, 1, 29, 29),
        'DLS': () => Algorithms.mazeDLS(grid, 1, 1, 29, 29, 100),
        'IDDFS': () => Algorithms.mazeIDDFS(grid, 1, 1, 29, 29)
    };

    const { stateA, stateB, status, start, stop, winner, setWinner } = useAlgoRace(
        () => factoryMap[userAlgo](), () => factoryMap[compAlgo](), 40 / speedMultiplier, [grid, userAlgo, compAlgo, speedMultiplier]
    );

    useEffect(() => {
        if (status === 'finished' && stateA && stateB) {
            const nodesA = stateA.stats.nodesExplored;
            const nodesB = stateB.stats.nodesExplored;
            const lenA = stateA.stats.pathLength;
            const lenB = stateB.stats.pathLength;
            
            let w = 'Tie';
            if (lenA > 0 && lenB === 0) w = 'A';
            else if (lenB > 0 && lenA === 0) w = 'B';
            else if (lenA > 0 && lenB > 0) {
                if (winCriteria === 'nodes') w = nodesA < nodesB ? 'A' : (nodesB < nodesA ? 'B' : 'Tie');
                else w = lenA < lenB ? 'A' : (lenB < lenA ? 'B' : (nodesA < nodesB ? 'A' : (nodesB < nodesA ? 'B' : 'Tie'))); // tiebreak on nodes
            }
            setWinner(w);
        }
    }, [status, winCriteria]);

    const renderGrid = (state, colorClass) => {
        if (!grid.length) return null;
        return (
            <div className="grid gap-[1px] bg-zinc-800 border-2 border-zinc-700 p-1 rounded inline-block max-w-full overflow-auto">
                {grid.map((row, r) => (
                    <div key={r} className="flex gap-[1px]">
                        {row.map((cell, c) => {
                            const isWall = cell === 1;
                            const isPath = state?.current?.some(p => p[0]===r && p[1]===c);
                            const isVisited = state?.visited?.some(p => p[0]===r && p[1]===c);
                            const isStart = r===1 && c===1;
                            const isEnd = r===29 && c===29;
                            
                            let bg = isWall ? 'bg-zinc-950' : 'bg-zinc-200';
                            if (isStart) bg = 'bg-blue-500';
                            else if (isEnd) bg = 'bg-yellow-500';
                            else if (isPath) bg = colorClass;
                            else if (isVisited) bg = colorClass.replace('500', '900').replace('600', '900') + ' opacity-40';

                            return <div key={c} className={`maze-cell ${bg} rounded-sm`} />
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full fade-in">
             <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">🌀 Maze Solver</h2>
                <div className="flex items-center gap-4">
                    <select value={winCriteria} onChange={e => setWinCriteria(e.target.value)} className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700">
                        <option value="nodes">Win: Fewest Nodes</option>
                        <option value="path">Win: Shortest Path</option>
                    </select>
                    <select value={speedMultiplier} onChange={e => setSpeedMultiplier(Number(e.target.value))} className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700">
                        <option value="0.25">0.25x (Slow)</option>
                        <option value="1">1x (Normal)</option>
                        <option value="3">3x (Fast)</option>
                        <option value="10">10x (Turbo)</option>
                    </select>
                    <button onClick={() => { stop(); setMapKey(k=>k+1); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">New Maze</button>
                    <button onClick={start} disabled={status==='running'} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50 transition-colors">
                        {status === 'idle' ? 'Start Race' : status === 'running' ? 'Racing...' : 'Restart'}
                    </button>
                    <button onClick={onBack} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">Back</button>
                </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 flex flex-col items-center border-r border-zinc-800 bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-emerald-400 mb-6 drop-shadow-md">{userAlgo} (You)</h3>
                    <div className="flex-1 flex items-center justify-center w-full">
                        {renderGrid(stateA, 'bg-emerald-500 glow-emerald')}
                    </div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Nodes Explored</div>
                        <div className="text-3xl font-bold text-emerald-400">{stateA?.stats?.nodesExplored || 0}</div>
                    </div>
                </div>
                
                <div className="w-16 bg-zinc-900 flex flex-col items-center justify-center z-10 shadow-2xl border-x border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center font-black text-xl border-2 border-zinc-700 text-white">VS</div>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-violet-400 mb-6 drop-shadow-md">{compAlgo} (Computer)</h3>
                    <div className="flex-1 flex items-center justify-center w-full">
                        {renderGrid(stateB, 'bg-violet-500 glow-violet')}
                    </div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Nodes Explored</div>
                        <div className="text-3xl font-bold text-violet-400">{stateB?.stats?.nodesExplored || 0}</div>
                    </div>
                </div>
            </div>

            {status === 'finished' && winner && (
                <ResultModal 
                    winner={winner} nameA={userAlgo} nameB={compAlgo} statsA={stateA.stats} statsB={stateB.stats}
                    reason={
                        winCriteria === 'nodes' 
                        ? (winner === 'A' ? `${userAlgo} won by exploring fewer nodes.` : winner === 'B' ? `${compAlgo} won by exploring fewer nodes.` : "Both algorithms explored the same amount of nodes.")
                        : (
                            stateA.stats.pathLength === stateB.stats.pathLength
                            ? (winner === 'A' ? `Path lengths tied! ${userAlgo} won the tiebreaker by exploring fewer nodes.` : winner === 'B' ? `Path lengths tied! ${compAlgo} won the tiebreaker by exploring fewer nodes.` : "Both algorithms tied exactly!")
                            : (winner === 'A' ? `${userAlgo} found a definitively shorter path.` : `${compAlgo} found a definitively shorter path.`)
                        )
                    }
                    onClose={onBack} 
                />
            )}
        </div>
    );
};

// 2. Word Ladder Duel
const WordLadderDuel = ({ userAlgo, compAlgo, speedMultiplier, setSpeedMultiplier, onBack }) => {
    const [words, setWords] = useState(['CAT', 'DOG']);
    const [mapKey, setMapKey] = useState(0);

    useEffect(() => { setWords(Algorithms.generateWordPair()); }, [mapKey]);

    const factoryMap = {
        'Greedy BFS': () => Algorithms.wordGreedy(words[0], words[1]),
        'A*': () => Algorithms.wordAStar(words[0], words[1]),
        'IDA*': () => Algorithms.wordIDAStar(words[0], words[1]),
        'RBFS': () => Algorithms.wordRBFS(words[0], words[1])
    };

    const { stateA, stateB, status, start, stop, winner, setWinner } = useAlgoRace(
        () => factoryMap[userAlgo](), () => factoryMap[compAlgo](), 100 / speedMultiplier, [words, userAlgo, compAlgo, speedMultiplier]
    );

    useEffect(() => {
        if (status === 'finished' && stateA && stateB) {
            const costA = stateA.stats.cost;
            const costB = stateB.stats.cost;
            let w = 'Tie';
            if (costA < costB) w = 'A';
            else if (costB < costA) w = 'B';
            else w = stateA.stats.nodesExplored < stateB.stats.nodesExplored ? 'A' : 'B';
            setWinner(w);
        }
    }, [status]);

    const renderLadder = (state, colorClass) => {
        const path = state?.current || [words[0]];
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-[200px]">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    <span className="px-4 py-2 bg-zinc-800 text-xl font-bold rounded-lg border border-zinc-600">{words[0]}</span>
                    <span className="text-zinc-500 font-black">➔</span>
                    <span className="px-4 py-2 bg-zinc-800 text-xl font-bold rounded-lg border border-zinc-600">{words[1]}</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {path.map((word, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-zinc-600 font-bold">➔</span>}
                            <span className={`px-4 py-2 ${i === path.length - 1 && word !== words[1] ? colorClass + ' text-white glow-emerald' : 'bg-zinc-800 text-zinc-300'} font-bold rounded shadow-lg border border-zinc-700 transition-all duration-200`}>
                                {word}
                            </span>
                        </React.Fragment>
                    ))}
                    {path[path.length - 1] === words[1] && <div className="ml-4 text-2xl">✅</div>}
                </div>
                
                <div className="mt-8 text-zinc-500 italic max-w-sm text-center">
                    {state?.visited?.length ? `Explored ${state.visited.length} words... (e.g. ${state.visited.slice(-3).join(', ')})` : 'Waiting to start...'}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full fade-in">
             <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">📝 Word Ladder Duel</h2>
                <div className="flex items-center gap-4">
                    <select value={speedMultiplier} onChange={e => setSpeedMultiplier(Number(e.target.value))} className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700">
                        <option value="0.25">0.25x (Slow)</option>
                        <option value="1">1x (Normal)</option>
                        <option value="3">3x (Fast)</option>
                        <option value="10">10x (Turbo)</option>
                    </select>
                    <button onClick={() => { stop(); setMapKey(k=>k+1); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">New Words</button>
                    <button onClick={start} disabled={status==='running'} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50 transition-colors">
                        {status === 'idle' ? 'Start Search' : status === 'running' ? 'Searching...' : 'Restart'}
                    </button>
                    <button onClick={onBack} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">Back</button>
                </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 flex flex-col items-center border-r border-zinc-800 bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-emerald-400 mb-6 drop-shadow-md">{userAlgo} (You)</h3>
                    <div className="flex-1 w-full flex items-center justify-center">{renderLadder(stateA, 'bg-emerald-600')}</div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Word Path Length</div>
                        <div className="text-3xl font-bold text-emerald-400">{stateA?.stats?.cost === Infinity ? 'Searching...' : (stateA?.stats?.cost || 0)}</div>
                        <div className="text-zinc-400 text-sm mt-2">Nodes Expanded</div>
                        <div className="text-xl font-semibold text-white">{stateA?.stats?.nodesExplored || 0}</div>
                    </div>
                </div>
                
                <div className="w-16 bg-zinc-900 flex flex-col items-center justify-center z-10 shadow-2xl border-x border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center font-black text-xl border-2 border-zinc-700 text-white">VS</div>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-violet-400 mb-6 drop-shadow-md">{compAlgo} (Computer)</h3>
                    <div className="flex-1 w-full flex items-center justify-center">{renderLadder(stateB, 'bg-violet-600')}</div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Word Path Length</div>
                        <div className="text-3xl font-bold text-violet-400">{stateB?.stats?.cost === Infinity ? 'Searching...' : (stateB?.stats?.cost || 0)}</div>
                        <div className="text-zinc-400 text-sm mt-2">Nodes Expanded</div>
                        <div className="text-xl font-semibold text-white">{stateB?.stats?.nodesExplored || 0}</div>
                    </div>
                </div>
            </div>

            {status === 'finished' && winner && (
                <ResultModal 
                    winner={winner} nameA={userAlgo} nameB={compAlgo} statsA={stateA.stats} statsB={stateB.stats}
                    reason={winner === 'A' ? `${userAlgo} built a shorter/equal word ladder while expanding fewer words.` : `${compAlgo} built a shorter/equal word ladder while expanding fewer words.`}
                    onClose={onBack} 
                />
            )}
        </div>
    );
};

// 3. Tic-Tac-Toe Arena
const TicTacToeArena = ({ userAlgo, compAlgo, speedMultiplier, setSpeedMultiplier, onBack }) => {
    const getInitialBoard = () => {
        return ['X', null, 'O', null, 'X', null, 'O', null, null];
    };
    
    const [board, setBoard] = useState(getInitialBoard());
    const [mapKey, setMapKey] = useState(0);

    useEffect(() => { setBoard(getInitialBoard()); }, [mapKey]);

    const factoryMap = {
        'Minimax': () => Algorithms.tttMinimax(board, 'X'),
        'Alpha-Beta': () => Algorithms.tttAlphaBeta(board, 'X'),
        'Random': () => Algorithms.tttRandom(board, 'X'),
        'Greedy': () => Algorithms.tttGreedy(board, 'X')
    };

    const { stateA, stateB, status, start, stop, winner, setWinner } = useAlgoRace(
        () => factoryMap[userAlgo](), () => factoryMap[compAlgo](), 100 / speedMultiplier, [board, userAlgo, compAlgo, speedMultiplier]
    );

    useEffect(() => {
        if (status === 'finished' && stateA && stateB) {
            const nA = stateA.stats.nodesExplored;
            const nB = stateB.stats.nodesExplored;
            setWinner(nA < nB ? 'A' : (nB < nA ? 'B' : 'Tie'));
        }
    }, [status]);

    const renderBoard = (state, highlightClass) => {
        const b = state?.board || board;
        return (
            <div className={`grid grid-cols-3 gap-2 bg-zinc-800 p-2 rounded-xl shadow-xl ${highlightClass} transition-shadow duration-300 w-full max-w-sm aspect-square mx-auto`}>
                {b.map((val, idx) => (
                    <div key={idx} className={`flex items-center justify-center bg-zinc-950 rounded-lg text-6xl font-black ${val==='X'?'text-blue-500':val==='O'?'text-red-500':''} ${state?.bestMove === idx ? 'bg-zinc-700 anim-pulse' : ''}`}>
                        {val}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full fade-in">
             <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">⚔️ Tic-Tac-Toe Evaluator</h2>
                <div className="flex items-center gap-4">
                    <select value={speedMultiplier} onChange={e => setSpeedMultiplier(Number(e.target.value))} className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700">
                        <option value="0.25">0.25x (Slow)</option>
                        <option value="1">1x (Normal)</option>
                        <option value="3">3x (Fast)</option>
                        <option value="10">10x (Turbo)</option>
                    </select>
                    <button onClick={start} disabled={status==='running'} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50 transition-colors">
                        {status === 'idle' ? 'Start Search' : status === 'running' ? 'Searching...' : 'Restart'}
                    </button>
                    <button onClick={onBack} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">Back</button>
                </div>
            </div>
            
            <div className="p-4 text-center text-zinc-400 italic">
                Both algorithms are finding the best move for 'X' from a mid-game state. Winner expands fewest nodes.
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 flex flex-col border-r border-zinc-800 bg-zinc-950/50 justify-center">
                    <h3 className="text-2xl font-bold text-emerald-400 mb-6 drop-shadow-md text-center">{userAlgo} (You)</h3>
                    {renderBoard(stateA, stateA?.done ? 'glow-emerald border-emerald-500 border-4' : '')}
                    <div className="mt-8 bg-zinc-900 p-4 rounded-lg w-full max-w-sm mx-auto text-center">
                        <div className="text-zinc-400 text-sm">Nodes Evaluated</div>
                        <div className="text-3xl font-bold text-emerald-400">{stateA?.stats?.nodesExplored || 0}</div>
                        <div className="text-zinc-400 text-sm mt-2">Branches Pruned</div>
                        <div className="text-xl font-semibold text-white">{stateA?.stats?.branchesPruned || 0}</div>
                    </div>
                </div>
                
                <div className="w-16 bg-zinc-900 flex flex-col items-center justify-center z-10 shadow-2xl border-x border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center font-black text-xl border-2 border-zinc-700 text-white">VS</div>
                </div>

                <div className="flex-1 p-6 flex flex-col bg-zinc-950/50 justify-center">
                    <h3 className="text-2xl font-bold text-violet-400 mb-6 drop-shadow-md text-center">{compAlgo} (Computer)</h3>
                    {renderBoard(stateB, stateB?.done ? 'glow-violet border-violet-500 border-4' : '')}
                    <div className="mt-8 bg-zinc-900 p-4 rounded-lg w-full max-w-sm mx-auto text-center">
                        <div className="text-zinc-400 text-sm">Nodes Evaluated</div>
                        <div className="text-3xl font-bold text-violet-400">{stateB?.stats?.nodesExplored || 0}</div>
                        <div className="text-zinc-400 text-sm mt-2">Branches Pruned</div>
                        <div className="text-xl font-semibold text-white">{stateB?.stats?.branchesPruned || 0}</div>
                    </div>
                </div>
            </div>

            {status === 'finished' && winner && (
                <ResultModal 
                    winner={winner} nameA={userAlgo} nameB={compAlgo} statsA={stateA.stats} statsB={stateB.stats}
                    reason={winner === 'A' ? `${userAlgo} required evaluating fewer game states to find the move.` : `${compAlgo} evaluated fewer game states by pruning paths earlier.`}
                    onClose={onBack} 
                />
            )}
        </div>
    );
};

// 4. 8-Puzzle Solver (Local Search)
const EightPuzzleSolver = ({ userAlgo, compAlgo, speedMultiplier, setSpeedMultiplier, onBack }) => {
    const [board, setBoard] = useState([]);
    const [mapKey, setMapKey] = useState(0);

    useEffect(() => { setBoard(Algorithms.generatePuzzle()); }, [mapKey]);

    const factoryMap = {
        'Hill Climbing': () => Algorithms.puzzleHillClimbing(board, 500),
        'Simulated Annealing': () => Algorithms.puzzleSimulatedAnnealing(board, 500),
        'Beam Search': () => Algorithms.puzzleBeamSearch(board, 500, 3)
    };

    const { stateA, stateB, status, start, stop, winner, setWinner } = useAlgoRace(
        () => factoryMap[userAlgo](), () => factoryMap[compAlgo](), 60 / speedMultiplier, [board, userAlgo, compAlgo, speedMultiplier]
    );

    useEffect(() => {
        if (status === 'finished' && stateA && stateB) {
            const costA = stateA.stats.cost;
            const costB = stateB.stats.cost;
            const movesA = stateA.stats.moves;
            const movesB = stateB.stats.moves;
            
            if (costA < costB) setWinner('A');
            else if (costB < costA) setWinner('B');
            else if (movesA < movesB) setWinner('A');
            else if (movesB < movesA) setWinner('B');
            else setWinner('Tie');
        }
    }, [status]);

    const renderPuzzle = (state, colorStr) => {
        if (!board.length) return null;
        const b = state?.board || board;
        const isStuck = state?.stuck;
        const isGoal = state?.stats?.cost === 0;
        
        let borderClass = 'border-zinc-800';
        if (isGoal) borderClass = 'border-green-500 glow-emerald';
        else if (isStuck) borderClass = 'border-red-500 glow-violet';

        return (
            <div className={`grid grid-cols-3 gap-1 bg-zinc-800 p-2 rounded-xl shadow-xl border-4 ${borderClass} transition-shadow duration-300 w-full max-w-xs aspect-square mx-auto`}>
                {b.map((val, idx) => (
                    <div key={idx} className={`flex items-center justify-center rounded text-4xl font-black ${val === 0 ? 'bg-zinc-950/50' : 'bg-zinc-700 text-white shadow'}`}>
                        {val !== 0 ? val : ''}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full fade-in">
             <div className="flex justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
                <h2 className="text-xl font-bold flex items-center gap-2">🧩 8-Puzzle Solver (Local Search)</h2>
                <div className="flex items-center gap-4">
                    <select value={speedMultiplier} onChange={e => setSpeedMultiplier(Number(e.target.value))} className="bg-zinc-800 text-white rounded px-2 py-1 outline-none border border-zinc-700">
                        <option value="0.25">0.25x (Slow)</option>
                        <option value="1">1x (Normal)</option>
                        <option value="3">3x (Fast)</option>
                        <option value="10">10x (Turbo)</option>
                    </select>
                    <button onClick={() => { stop(); setMapKey(k=>k+1); }} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">New Puzzle</button>
                    <button onClick={start} disabled={status==='running'} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold disabled:opacity-50 transition-colors">
                        {status === 'idle' ? 'Start Search' : status === 'running' ? 'Searching...' : 'Restart'}
                    </button>
                    <button onClick={onBack} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">Back</button>
                </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 flex flex-col items-center border-r border-zinc-800 bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-emerald-400 mb-6 drop-shadow-md">{userAlgo} (You)</h3>
                    <div className="flex-1 w-full flex items-center justify-center">{renderPuzzle(stateA, '#10b981')}</div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Manhattan Distance</div>
                        <div className="text-3xl font-bold text-emerald-400">{stateA?.stats?.cost ?? Algorithms.getManhattan(board)}</div>
                        <div className="text-zinc-400 text-sm mt-2">Moves / Iteration</div>
                        <div className="text-xl font-semibold text-white">{stateA?.stats?.moves || 0} / {stateA?.stats?.iteration || 0}</div>
                        {stateA?.stuck && <div className="text-red-500 font-bold mt-2">STUCK IN LOCAL OPTIMA!</div>}
                    </div>
                </div>
                
                <div className="w-16 bg-zinc-900 flex flex-col items-center justify-center z-10 shadow-2xl border-x border-zinc-800">
                    <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center font-black text-xl border-2 border-zinc-700 text-white">VS</div>
                </div>

                <div className="flex-1 p-6 flex flex-col items-center bg-zinc-950/50">
                    <h3 className="text-2xl font-bold text-violet-400 mb-6 drop-shadow-md">{compAlgo} (Computer)</h3>
                    <div className="flex-1 w-full flex items-center justify-center">{renderPuzzle(stateB, '#8b5cf6')}</div>
                    <div className="mt-6 bg-zinc-900 p-4 rounded-lg w-full max-w-sm text-center">
                        <div className="text-zinc-400 text-sm">Manhattan Distance</div>
                        <div className="text-3xl font-bold text-violet-400">{stateB?.stats?.cost ?? Algorithms.getManhattan(board)}</div>
                        <div className="text-zinc-400 text-sm mt-2">Moves / Iteration</div>
                        <div className="text-xl font-semibold text-white">{stateB?.stats?.moves || 0} / {stateB?.stats?.iteration || 0}</div>
                        {stateB?.stuck && <div className="text-red-500 font-bold mt-2">STUCK IN LOCAL OPTIMA!</div>}
                    </div>
                </div>
            </div>

            {status === 'finished' && winner && (
                <ResultModal 
                    winner={winner} nameA={userAlgo} nameB={compAlgo} statsA={stateA.stats} statsB={stateB.stats}
                    reason={winner === 'A' ? `${userAlgo} reached a closer state or took fewer moves.` : `${compAlgo} reached a closer state or took fewer moves.`}
                    onClose={onBack} 
                />
            )}
        </div>
    );
};

// Main App Component
const App = () => {
    const [activeGame, setActiveGame] = useState(null);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const [selections, setSelections] = useState({
        maze: { user: 'BFS', comp: 'DFS' },
        path: { user: 'A*', comp: 'Greedy BFS' },
        ttt: { user: 'Alpha-Beta', comp: 'Minimax' },
        puzzle: { user: 'Simulated Annealing', comp: 'Hill Climbing' }
    });

    const updateSelection = (gameId, role, value) => {
        setSelections(prev => ({ ...prev, [gameId]: { ...prev[gameId], [role]: value } }));
    };

    if (activeGame) {
        const props = {
            userAlgo: selections[activeGame].user,
            compAlgo: selections[activeGame].comp,
            speedMultiplier,
            setSpeedMultiplier,
            onBack: () => setActiveGame(null)
        };
        return (
            <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden">
                {activeGame === 'maze' && <MazeSolver {...props} />}
                {activeGame === 'path' && <WordLadderDuel {...props} />}
                {activeGame === 'ttt' && <TicTacToeArena {...props} />}
                {activeGame === 'puzzle' && <EightPuzzleSolver {...props} />}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-zinc-100 p-8 font-sans">
            <header className="max-w-6xl mx-auto mb-12 text-center pt-8 slide-up">
                <h1 className="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-400 drop-shadow-lg mb-4 tracking-tight">
                    Algorithm Arena
                </h1>
                <p className="text-xl text-zinc-400 font-medium">An Interactive AI Search Algorithm Showdown</p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                {Object.values(CATEGORIES).map((cat, idx) => (
                    <div key={cat.id} className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1" style={{animationDelay: `${idx * 0.1}s`}}>
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="text-4xl mb-3 block">{cat.icon}</span>
                                <h2 className="text-2xl font-bold text-white mb-1">{cat.name}</h2>
                                <span className="text-xs font-semibold px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase tracking-wider">{cat.label}</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                <label className="block text-sm font-medium text-emerald-400 mb-2">You (Emerald)</label>
                                <select 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                    value={selections[cat.id].user}
                                    onChange={(e) => updateSelection(cat.id, 'user', e.target.value)}
                                >
                                    {ALGO_OPTIONS[cat.id].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            
                            <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                                <label className="block text-sm font-medium text-violet-400 mb-2">Computer (Violet)</label>
                                <select 
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                    value={selections[cat.id].comp}
                                    onChange={(e) => updateSelection(cat.id, 'comp', e.target.value)}
                                >
                                    {ALGO_OPTIONS[cat.id].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={() => setActiveGame(cat.id)}
                            className="w-full py-4 bg-zinc-800 hover:bg-emerald-600 border border-zinc-700 hover:border-emerald-500 text-white rounded-xl font-bold text-lg transition-all transform active:scale-[0.98]"
                        >
                            Enter Arena
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
