import { useState, useEffect, useCallback } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&display=swap";

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
  const remove = difficulty === "easy" ? 42 : difficulty === "medium" ? 52 : 62;
  const puzzle = board.map(r => [...r]);
  let removed = 0;
  const cells = shuffle([...Array(81).keys()]);
  for (const idx of cells) {
    if (removed >= remove) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
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
  const [difficulty, setDifficulty] = useState("hard");
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
    link.rel = "stylesheet"; link.href = FONT;
    document.head.appendChild(link);
    document.documentElement.style.height = "100%";
    document.body.style.cssText = "height:100%;margin:0;background:#0f0e0c;overflow:hidden;";
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    let interval;
    if (running && !won) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running, won]);

  const startGame = useCallback((diff = difficulty) => {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    const g = p.map(r => r.map(v => v !== 0));
    setSolution(s);
    setBoard(p.map(r => [...r]));
    setGiven(g);
    setSelected(null); setNotes({}); setNoteMode(false);
    setMistakes(0); setWon(false); setTimer(0);
    setRunning(true); setHistory([]);
  }, [difficulty]);

  useEffect(() => { startGame(); }, []);

  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
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
    const newNotes = { ...notes };
    delete newNotes[`${r}-${c}`];
    setNotes(newNotes);
    setBoard(newBoard);
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
    setBoard(newBoard); setNotes(newNotes);
  }, [selected, given, board, notes, won]);

  const handleUndo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setBoard(prev.board); setNotes(prev.notes);
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
    <div style={{
      position: "fixed", inset: 0, background: "#0f0e0c",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      fontFamily: "'DM Mono', monospace",
      padding: "12px 10px 16px", overflow: "hidden",
    }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>

      <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif", fontSize:"clamp(1.6rem,7vw,2.2rem)", fontWeight:900,
            background:"linear-gradient(135deg,#d4af37 0%,#f5e577 50%,#b8960c 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundSize:"200%", animation:"shimmer 4s linear infinite", letterSpacing:"0.1em",
          }}>SUDOKU</div>
          <div style={{ fontSize:"0.5rem", color:"rgba(212,175,55,0.4)", letterSpacing:"0.2em", textTransform:"uppercase" }}>sovereign edition</div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em", textTransform:"uppercase" }}>TIME</div>
            <div style={{ fontSize:"1rem", color:"#d4af37", fontWeight:500 }}>{fmtTime(timer)}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em", textTransform:"uppercase" }}>ERR</div>
            <div style={{ fontSize:"1rem", color:mistakes>2?"#e05c5c":"#d4af37", fontWeight:500 }}>{mistakes}</div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        {["easy","medium","hard"].map(d => (
          <button key={d} onClick={() => { setDifficulty(d); startGame(d); }} style={{
            background: difficulty===d ? "rgba(212,175,55,0.12)" : "transparent",
            border: `1px solid ${difficulty===d ? "#d4af37" : "rgba(255,255,255,0.15)"}`,
            color: difficulty===d ? "#d4af37" : "rgba(255,255,255,0.35)",
            borderRadius:4, padding:"5px 14px", fontSize:"0.65rem",
            letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>{d}</button>
        ))}
      </div>

      {won && (
        <div style={{
          background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.4)",
          borderRadius:10, padding:"10px 20px", textAlign:"center",
          animation:"pop 0.4s ease", flexShrink:0, width:"100%",
        }}>
          <div style={{ fontFamily:"'Playfair Display',serif", color:"#d4af37", fontSize:"1.3rem", fontWeight:700 }}>Puzzle Complete!</div>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.7rem", marginTop:2 }}>{fmtTime(timer)} — {mistakes} mistake{mistakes!==1?"s":""}</div>
          <button onClick={() => startGame()} style={{
            marginTop:8, background:"#d4af37", color:"#0f0e0c", border:"none",
            borderRadius:6, padding:"7px 20px", fontSize:"0.75rem", fontWeight:700,
            cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>New Game</button>
        </div>
      )}

      <div style={{
        width:"min(96vw, calc(100vh - 260px))", aspectRatio:"1",
        border:"2px solid #d4af37", borderRadius:8, overflow:"hidden",
        display:"grid", gridTemplateColumns:"repeat(9,1fr)", gridTemplateRows:"repeat(9,1fr)",
        boxShadow:"0 0 30px rgba(212,175,55,0.15)", flexShrink:0,
      }}>
        {board.map((row, r) => row.map((val, c) => {
          const isGiven = given[r][c];
          const isSelected = selRow===r && selCol===c;
          const isSameNum = selVal && val===selVal && !isSelected;
          const inSameGroup = selected && (selRow===r || selCol===c ||
            (Math.floor(selRow/3)===Math.floor(r/3) && Math.floor(selCol/3)===Math.floor(c/3)));
          const wrong = val && !isGiven && solution[r][c]!==val;
          const conflict = val && checkConflict(board, r, c, val);
          const cellNotes = notes[`${r}-${c}`];
          let bg = "transparent";
          if (isSelected) bg = "rgba(212,175,55,0.25)";
          else if (isSameNum) bg = "rgba(212,175,55,0.13)";
          else if (inSameGroup) bg = "rgba(255,255,255,0.04)";
          return (
            <button key={`${r}-${c}`} onClick={() => setSelected([r,c])} style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              background:bg, cursor:"pointer",
              borderRight: (c+1)%3===0&&c!==8 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
              borderBottom: (r+1)%3===0&&r!==8 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
              borderLeft: c%3===0&&c!==0 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
              borderTop: r%3===0&&r!==0 ? "2px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
              color: wrong||conflict ? "#e05c5c" : isGiven ? "#f5f0e8" : "#d4af37",
              fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(1.4rem,6vw,2rem)",
              fontWeight: isGiven ? 700 : 400,
              outline: isSelected ? "2px solid #d4af37" : "none",
              outlineOffset:-2, padding:0,
            }}>
              {val ? val : cellNotes && cellNotes.size > 0
                ? <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gridTemplateRows:"repeat(3,1fr)", width:"100%", height:"100%", padding:1 }}>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <span key={n} style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(0.3rem,1.3vw,0.45rem)", color:"rgba(212,175,55,0.7)", opacity:cellNotes.has(n)?1:0 }}>{n}</span>
                    ))}
                  </div>
                : null}
            </button>
          );
        }))}
      </div>

      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        {[
          { label:"↩ Undo", fn:handleUndo },
          { label:"⌫ Erase", fn:handleErase },
          { label:noteMode?"✏ ON":"✏ Notes", fn:()=>setNoteMode(m=>!m), active:noteMode },
          { label:"↺ New", fn:()=>startGame() },
        ].map(({ label, fn, active }) => (
          <button key={label} onClick={fn} style={{
            background: active ? "rgba(212,175,55,0.1)" : "transparent",
            border: `1px solid ${active ? "#d4af37" : "rgba(255,255,255,0.15)"}`,
            color: active ? "#d4af37" : "rgba(255,255,255,0.45)",
            borderRadius:6, padding:"7px 12px",
            fontSize:"clamp(0.6rem,2.8vw,0.75rem)",
            cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:5, width:"100%", flexShrink:0 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleInput(n)} style={{
            aspectRatio:"1", background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, color:"#f5f0e8",
            fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(1.6rem,7vw,2.4rem)",
            fontWeight:700, cursor:"pointer",
          }}>{n}</button>
        ))}
      </div>
    </div>
  );
}
