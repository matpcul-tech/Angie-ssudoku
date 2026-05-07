import { useState, useEffect, useCallback } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&display=swap";

// --- Sudoku logic ---
function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
    const br = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const bc = 3 * Math.floor(col / 3) + (i % 3);
    if (board[br][bc] === num) return false;
  }
  return true;
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (solve(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePuzzle(difficulty) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(board);
  const solution = board.map(r => [...r]);
  const remove = difficulty === "easy" ? 35 : difficulty === "medium" ? 45 : 55;
  const puzzle = board.map(r => [...r]);
  let removed = 0;
  while (removed < remove) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) { puzzle[r][c] = 0; removed++; }
  }
  return { puzzle, solution };
}

function checkConflict(board, row, col, val) {
  if (!val) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === val) return true;
    if (i !== row && board[i][col] === val) return true;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === val) return true;
    }
  }
  return false;
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState("medium");
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState(null);
  const [given, setGiven] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState({});
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    let interval;
    if (running && !won) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running, won]);

  const startGame = useCallback((diff = difficulty) => {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    const g = p.map(r => r.map(v => v !== 0));
    setPuzzle(p);
    setSolution(s);
    setBoard(p.map(r => [...r]));
    setGiven(g);
    setSelected(null);
    setNotes({});
    setNoteMode(false);
    setMistakes(0);
    setWon(false);
    setTimer(0);
    setRunning(true);
    setHistory([]);
  }, [difficulty]);

  useEffect(() => { startGame(); }, []);

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const handleCell = (r, c) => setSelected([r, c]);

  const pushHistory = (b, n) => setHistory(h => [...h, { board: b.map(r=>[...r]), notes: JSON.parse(JSON.stringify(n)) }]);

  const handleInput = useCallback((num) => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    if (noteMode) {
      pushHistory(board, notes);
      const key = `${r}-${c}`;
      const curr = notes[key] || new Set();
      const next = new Set(curr);
      if (next.has(num)) next.delete(num); else next.add(num);
      setNotes(n => ({ ...n, [key]: next }));
      return;
    }
    pushHistory(board, notes);
    const newBoard = board.map(row => [...row]);
    if (newBoard[r][c] === num) { newBoard[r][c] = 0; }
    else {
      newBoard[r][c] = num;
      if (solution[r][c] !== num) setMistakes(m => m + 1);
    }
    // clear notes for this cell
    const newNotes = { ...notes };
    delete newNotes[`${r}-${c}`];
    setNotes(newNotes);
    setBoard(newBoard);
    // check win
    const complete = newBoard.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
    if (complete) { setWon(true); setRunning(false); }
  }, [selected, given, noteMode, board, notes, solution, won]);

  const handleErase = useCallback(() => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (given[r][c]) return;
    pushHistory(board, notes);
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 0;
    const newNotes = { ...notes };
    delete newNotes[`${r}-${c}`];
    setBoard(newBoard);
    setNotes(newNotes);
  }, [selected, given, board, notes, won]);

  const handleUndo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setBoard(prev.board);
    setNotes(prev.notes);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  useEffect(() => {
    const onKey = (e) => {
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) handleInput(n);
      if (e.key === "Backspace" || e.key === "Delete") handleErase();
      if (e.key === "n" || e.key === "N") setNoteMode(m => !m);
      if ((e.ctrlKey || e.metaKey) && e.key === "z") handleUndo();
      if (!selected) return;
      const [r, c] = selected;
      if (e.key === "ArrowUp" && r > 0) setSelected([r-1, c]);
      if (e.key === "ArrowDown" && r < 8) setSelected([r+1, c]);
      if (e.key === "ArrowLeft" && c > 0) setSelected([r, c-1]);
      if (e.key === "ArrowRight" && c < 8) setSelected([r, c+1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleInput, handleErase, handleUndo, selected]);

  if (!board) return null;

  const selRow = selected?.[0];
  const selCol = selected?.[1];
  const selVal = selected ? board[selRow][selCol] : 0;

  return (
    <div style={styles.root}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0e0c; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes pop { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        .cell-btn:hover { background: rgba(212,175,55,0.12) !important; }
        .num-btn:hover { background: rgba(212,175,55,0.2) !important; transform: scale(1.07); }
        .action-btn:hover { border-color: #d4af37 !important; color: #d4af37 !important; }
        .diff-btn:hover { border-color: #d4af37 !important; }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.title}>SUDOKU</span>
            <span style={styles.subtitle}>sovereign edition</span>
          </div>
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>TIME</span>
              <span style={styles.statVal}>{fmtTime(timer)}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>MISTAKES</span>
              <span style={styles.statVal} style={{color: mistakes > 2 ? "#e05c5c" : "#d4af37"}}>{mistakes}</span>
            </div>
            <div style={styles.diffRow}>
              {["easy","medium","hard"].map(d => (
                <button key={d} className="diff-btn" onClick={() => { setDifficulty(d); startGame(d); }}
                  style={{...styles.diffBtn, ...(difficulty===d ? styles.diffBtnActive : {})}}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </header>

        {won && (
          <div style={styles.winBanner}>
            <span style={styles.winText}>Puzzle Complete!</span>
            <span style={styles.winSub}>{fmtTime(timer)} — {mistakes} mistake{mistakes!==1?"s":""}</span>
            <button onClick={() => startGame()} style={styles.newGameBtn}>New Game</button>
          </div>
        )}

        <div style={styles.boardWrapper}>
          <div style={styles.board}>
            {board.map((row, r) =>
              row.map((val, c) => {
                const isGiven = given[r][c];
                const isSelected = selRow===r && selCol===c;
                const isSameNum = selVal && val === selVal && !isSelected;
                const inSameGroup = selRow===r || selCol===c ||
                  (Math.floor(selRow/3)===Math.floor(r/3) && Math.floor(selCol/3)===Math.floor(c/3));
                const conflict = val && checkConflict(board, r, c, val);
                const wrong = val && !isGiven && solution[r][c] !== val;
                const noteKey = `${r}-${c}`;
                const cellNotes = notes[noteKey];

                let bg = "transparent";
                if (isSelected) bg = "rgba(212,175,55,0.22)";
                else if (isSameNum) bg = "rgba(212,175,55,0.13)";
                else if (inSameGroup && selected) bg = "rgba(255,255,255,0.04)";

                const borderR = (c+1)%3===0 && c!==8 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.08)";
                const borderB = (r+1)%3===0 && r!==8 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.08)";

                return (
                  <button key={`${r}-${c}`} className="cell-btn"
                    onClick={() => handleCell(r, c)}
                    style={{
                      ...styles.cell,
                      background: bg,
                      borderRight: borderR,
                      borderBottom: borderB,
                      borderLeft: c%3===0 && c!==0 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.08)",
                      borderTop: r%3===0 && r!==0 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.08)",
                      color: wrong ? "#e05c5c" : conflict ? "#e05c5c" : isGiven ? "#f5f0e8" : "#d4af37",
                      fontWeight: isGiven ? "700" : "400",
                      fontSize: val ? "1.2rem" : "0.6rem",
                      outline: isSelected ? "2px solid #d4af37" : "none",
                      outlineOffset: "-2px",
                    }}>
                    {val
                      ? val
                      : cellNotes && cellNotes.size > 0
                      ? <div style={styles.notesGrid}>
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <span key={n} style={{...styles.noteNum, opacity: cellNotes.has(n) ? 1 : 0}}>{n}</span>
                          ))}
                        </div>
                      : null
                    }
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.controls}>
          <div style={styles.actions}>
            <button className="action-btn" onClick={handleUndo} style={styles.actionBtn}>↩ Undo</button>
            <button className="action-btn" onClick={handleErase} style={styles.actionBtn}>⌫ Erase</button>
            <button className="action-btn" onClick={() => setNoteMode(m=>!m)}
              style={{...styles.actionBtn, ...(noteMode ? styles.actionBtnActive : {})}}>
              ✏ Notes{noteMode ? " ON" : ""}
            </button>
            <button className="action-btn" onClick={() => startGame()} style={styles.actionBtn}>↺ New</button>
          </div>

          <div style={styles.numpad}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} className="num-btn" onClick={() => handleInput(n)} style={styles.numBtn}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <footer style={styles.footer}>
          <span>Arrow keys to navigate · N to toggle notes · Ctrl+Z to undo</span>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0f0e0c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono', monospace",
    padding: "16px",
    animation: "fadeIn 0.5s ease",
  },
  container: {
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  titleRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "2.4rem",
    fontWeight: "900",
    color: "#f5f0e8",
    letterSpacing: "0.12em",
    background: "linear-gradient(135deg, #d4af37 0%, #f5e577 50%, #b8960c 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundSize: "200%",
    animation: "shimmer 4s linear infinite",
  },
  subtitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.65rem",
    color: "rgba(212,175,55,0.5)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statLabel: {
    fontSize: "0.55rem",
    letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: "1.1rem",
    color: "#d4af37",
    fontWeight: "500",
  },
  diffRow: {
    display: "flex",
    gap: "6px",
    marginLeft: "auto",
  },
  diffBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.4)",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "0.6rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'DM Mono', monospace",
  },
  diffBtnActive: {
    border: "1px solid #d4af37",
    color: "#d4af37",
    background: "rgba(212,175,55,0.08)",
  },
  winBanner: {
    background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
    border: "1px solid rgba(212,175,55,0.4)",
    borderRadius: "10px",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    alignItems: "center",
    animation: "pop 0.4s ease",
  },
  winText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.5rem",
    color: "#d4af37",
    fontWeight: "700",
  },
  winSub: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.1em",
  },
  newGameBtn: {
    marginTop: "6px",
    background: "#d4af37",
    color: "#0f0e0c",
    border: "none",
    borderRadius: "6px",
    padding: "8px 20px",
    fontSize: "0.75rem",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontFamily: "'DM Mono', monospace",
  },
  boardWrapper: {
    display: "flex",
    justifyContent: "center",
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(9, 1fr)",
    gridTemplateRows: "repeat(9, 1fr)",
    border: "2px solid #d4af37",
    borderRadius: "8px",
    overflow: "hidden",
    width: "min(100%, 440px)",
    aspectRatio: "1",
    boxShadow: "0 0 40px rgba(212,175,55,0.12), 0 20px 60px rgba(0,0,0,0.6)",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    cursor: "pointer",
    transition: "background 0.15s",
    position: "relative",
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.2rem",
    padding: 0,
  },
  notesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(3, 1fr)",
    width: "100%",
    height: "100%",
    padding: "1px",
  },
  noteNum: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.45rem",
    color: "rgba(212,175,55,0.7)",
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1,
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  actionBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.5)",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "0.7rem",
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.05em",
    fontFamily: "'DM Mono', monospace",
  },
  actionBtnActive: {
    border: "1px solid #d4af37",
    color: "#d4af37",
    background: "rgba(212,175,55,0.1)",
  },
  numpad: {
    display: "grid",
    gridTemplateColumns: "repeat(9, 1fr)",
    gap: "6px",
  },
  numBtn: {
    aspectRatio: "1",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#f5f0e8",
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  footer: {
    textAlign: "center",
    fontSize: "0.55rem",
    color: "rgba(255,255,255,0.2)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    paddingBottom: "8px",
  },
};
