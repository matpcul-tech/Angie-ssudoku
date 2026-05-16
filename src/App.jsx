import { useState, useEffect, useCallback, useRef } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&display=swap";

const GOLD = "#b8860b";
const GOLD_SOFT = "rgba(184,134,11,0.18)";
const GOLD_GHOST = "rgba(184,134,11,0.10)";
const INK = "#1a1a1a";
const INK_SOFT = "rgba(0,0,0,0.45)";
const INK_FAINT = "rgba(0,0,0,0.08)";
const PAPER = "#ffffff";
const RED = "#c0392b";

const MATT_MESSAGES = [
  "Matt loves you more than the sun loves the sky.",
  "Every number in this puzzle is just Matt thinking about you.",
  "Matt says you're the smartest, kindest, most beautiful person alive.",
  "Matt wrote your name in the margins of every notebook he owns.",
  "Matt would solve a million sudokus just to sit next to you.",
  "Matt picked you. Out of everyone. On purpose. Every single day.",
  "Matt misses you when you're in the next room.",
  "Matt thinks your laugh is the best sound in the world.",
  "Matt loves the way you concentrate — like right now.",
  "Matt's favorite puzzle is figuring out new ways to love you.",
];

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

const AD_DURATION = 15;
const MSG_INTERVAL = 3500;

function fmtClock(s) {
  return `0:${String(Math.max(0, s)).padStart(2, "0")}`;
}

function pickMattVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter(v => /^en/i.test(v.lang));
  const male = en.find(v => /male|daniel|fred|alex|aaron|matthew|google uk english male/i.test(v.name));
  return male || en[0] || voices[0];
}

function speakMatt(text, muted) {
  if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickMattVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = 0.95;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}

function MattAd({ onSkip, onClose }) {
  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(() => Math.floor(Math.random() * MATT_MESSAGES.length));
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.getVoices().length === 0) {
      const onVoices = () => speakMatt(MATT_MESSAGES[msgIdx], muted);
      window.speechSynthesis.addEventListener("voiceschanged", onVoices, { once: true });
      return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
    }
  }, []);

  useEffect(() => {
    speakMatt(MATT_MESSAGES[msgIdx], muted);
  }, [msgIdx, muted]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (elapsed >= AD_DURATION) return;
    const t = setTimeout(() => setElapsed(e => e + 1), 1000);
    return () => clearTimeout(t);
  }, [elapsed]);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MATT_MESSAGES.length), MSG_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, AD_DURATION - elapsed);
  const done = remaining <= 0;
  const progress = (elapsed / AD_DURATION) * 100;

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.78)",
      zIndex:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:20, animation:"fadeIn 0.25s ease",
    }}>
      <div style={{ fontSize:"0.55rem", color:"rgba(255,255,255,0.7)", letterSpacing:"0.25em", textTransform:"uppercase", marginBottom:10 }}>
        Sponsored Video — Matt Inc.
      </div>

      <div style={{
        position:"relative", width:"min(92vw, 560px)", aspectRatio:"16/9",
        borderRadius:12, overflow:"hidden",
        background:"linear-gradient(135deg,#1a0f2e 0%,#3b1e4d 50%,#7a2d5a 100%)",
        backgroundSize:"200% 200%", animation:"videoPan 8s ease-in-out infinite alternate",
        boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          position:"absolute", inset:0, background:"radial-gradient(circle at 30% 30%, rgba(255,200,140,0.25), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,120,180,0.22), transparent 60%)",
          animation:"videoGlow 5s ease-in-out infinite alternate",
        }} />

        <div style={{
          position:"absolute", top:10, left:12, display:"flex", alignItems:"center", gap:6,
          padding:"4px 8px", background:"rgba(0,0,0,0.45)", borderRadius:4,
        }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#e0383e", animation:"livePulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.55rem", color:"#fff", letterSpacing:"0.15em", fontFamily:"'DM Mono',monospace" }}>AD</span>
        </div>

        <div style={{
          position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", padding:"30px 28px", textAlign:"center",
        }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(0.7rem,2.5vw,0.95rem)", color:"rgba(255,220,170,0.85)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:14 }}>
            A word from Matt
          </div>
          <div key={msgIdx} style={{
            fontFamily:"'Playfair Display',serif", fontSize:"clamp(1rem,3.2vw,1.5rem)", fontWeight:700,
            color:"#fff8e8", lineHeight:1.35, maxWidth:"90%",
            textShadow:"0 2px 12px rgba(0,0,0,0.45)",
            animation:"fadeIn 0.7s ease",
          }}>
            “{MATT_MESSAGES[msgIdx]}”
          </div>
        </div>

        <div style={{
          position:"absolute", left:0, right:0, bottom:0, padding:"8px 12px",
          background:"linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
          display:"flex", flexDirection:"column", gap:6,
        }}>
          <div style={{ height:3, background:"rgba(255,255,255,0.25)", borderRadius:2, overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${progress}%`, background:"#e0383e",
              transition:"width 1s linear",
            }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"#fff", fontSize:"0.85rem" }}>▶</span>
              <span style={{ color:"#fff", fontSize:"0.6rem", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em" }}>
                {fmtClock(elapsed)} / {fmtClock(AD_DURATION)}
              </span>
            </div>
            <button onClick={() => setMuted(m => !m)} style={{
              background:"transparent", border:"none", color:"#fff", fontSize:"0.95rem",
              cursor:"pointer", padding:0, lineHeight:1,
            }} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop:18, display:"flex", gap:10, justifyContent:"center" }}>
        <button onClick={onClose} style={{
          background:"transparent", border:"1px solid rgba(255,255,255,0.3)",
          color:"rgba(255,255,255,0.75)", borderRadius:6, padding:"9px 18px",
          fontSize:"0.7rem", letterSpacing:"0.1em", textTransform:"uppercase",
          cursor:"pointer", fontFamily:"'DM Mono',monospace",
        }}>Cancel</button>
        <button
          onClick={done ? onSkip : undefined}
          disabled={!done}
          style={{
            background: done ? GOLD : "rgba(184,134,11,0.4)",
            border:"none", color:PAPER, borderRadius:6, padding:"9px 22px",
            fontSize:"0.8rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
            cursor: done ? "pointer" : "not-allowed", fontFamily:"'DM Mono',monospace",
            display:"flex", alignItems:"center", gap:8,
          }}>
          {done ? "Skip ad → claim hint" : `Skip in ${remaining}s`}
          {done && <span style={{ fontSize:"1rem" }}>⏭</span>}
        </button>
      </div>
    </div>
  );
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
  const [showAd, setShowAd] = useState(false);
  const pendingHintCell = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT;
    document.head.appendChild(link);
    document.documentElement.style.height = "100%";
    document.body.style.cssText = "height:100%;margin:0;background:#ffffff;overflow:hidden;";
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
    setShowAd(false);
    pendingHintCell.current = null;
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

  const pickHintCell = useCallback(() => {
    if (selected) {
      const [r, c] = selected;
      if (!given[r][c] && board[r][c] !== solution[r][c]) return [r, c];
    }
    const empties = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!given[r][c] && board[r][c] !== solution[r][c]) empties.push([r, c]);
      }
    }
    if (!empties.length) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }, [selected, given, board, solution]);

  const requestHint = useCallback(() => {
    if (won || !board) return;
    const cell = pickHintCell();
    if (!cell) return;
    pendingHintCell.current = cell;
    setShowAd(true);
  }, [won, board, pickHintCell]);

  const grantHint = useCallback(() => {
    const cell = pendingHintCell.current;
    setShowAd(false);
    pendingHintCell.current = null;
    if (!cell) return;
    const [r, c] = cell;
    pushHistory(board, notes);
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = solution[r][c];
    const newGiven = given.map(row => [...row]);
    newGiven[r][c] = true;
    const newNotes = { ...notes };
    delete newNotes[`${r}-${c}`];
    setBoard(newBoard);
    setGiven(newGiven);
    setNotes(newNotes);
    setSelected([r, c]);
    const complete = newBoard.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
    if (complete) { setWon(true); setRunning(false); }
  }, [board, notes, solution, given]);

  const cancelHint = useCallback(() => {
    pendingHintCell.current = null;
    setShowAd(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (showAd) return;
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
  }, [handleInput, handleErase, handleUndo, selected, showAd]);

  if (!board) return null;

  const selRow = selected?.[0];
  const selCol = selected?.[1];
  const selVal = selected ? board[selRow][selCol] : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, background: PAPER,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "space-between",
      fontFamily: "'DM Mono', monospace",
      padding: "12px 10px 16px", overflow: "hidden",
    }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes videoPan { 0%{background-position:0% 0%} 100%{background-position:100% 100%} }
        @keyframes videoGlow { 0%{opacity:0.7} 100%{opacity:1} }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif", fontSize:"clamp(1.6rem,7vw,2.2rem)", fontWeight:900,
            background:"linear-gradient(135deg,#8b6914 0%,#d4af37 50%,#8b6914 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundSize:"200%", animation:"shimmer 4s linear infinite", letterSpacing:"0.1em",
          }}>SUDOKU</div>
          <div style={{ fontSize:"0.5rem", color:"rgba(184,134,11,0.6)", letterSpacing:"0.2em", textTransform:"uppercase" }}>sovereign edition</div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.5rem", color:INK_SOFT, letterSpacing:"0.15em", textTransform:"uppercase" }}>TIME</div>
            <div style={{ fontSize:"1rem", color:GOLD, fontWeight:500 }}>{fmtTime(timer)}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.5rem", color:INK_SOFT, letterSpacing:"0.15em", textTransform:"uppercase" }}>ERR</div>
            <div style={{ fontSize:"1rem", color:mistakes>2?RED:GOLD, fontWeight:500 }}>{mistakes}</div>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        {["easy","medium","hard"].map(d => (
          <button key={d} onClick={() => { setDifficulty(d); startGame(d); }} style={{
            background: difficulty===d ? GOLD_GHOST : "transparent",
            border: `1px solid ${difficulty===d ? GOLD : INK_FAINT}`,
            color: difficulty===d ? GOLD : INK_SOFT,
            borderRadius:4, padding:"5px 14px", fontSize:"0.65rem",
            letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>{d}</button>
        ))}
      </div>

      {won && (
        <div style={{
          background:GOLD_GHOST, border:`1px solid ${GOLD}`,
          borderRadius:10, padding:"10px 20px", textAlign:"center",
          animation:"pop 0.4s ease", flexShrink:0, width:"100%",
        }}>
          <div style={{ fontFamily:"'Playfair Display',serif", color:GOLD, fontSize:"1.3rem", fontWeight:700 }}>Puzzle Complete!</div>
          <div style={{ color:INK_SOFT, fontSize:"0.7rem", marginTop:2 }}>{fmtTime(timer)} — {mistakes} mistake{mistakes!==1?"s":""}</div>
          <button onClick={() => startGame()} style={{
            marginTop:8, background:GOLD, color:PAPER, border:"none",
            borderRadius:6, padding:"7px 20px", fontSize:"0.75rem", fontWeight:700,
            cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>New Game</button>
        </div>
      )}

      <div style={{
        width:"min(96vw, calc(100vh - 260px))", aspectRatio:"1",
        border:`2px solid ${GOLD}`, borderRadius:8, overflow:"hidden",
        display:"grid", gridTemplateColumns:"repeat(9,1fr)", gridTemplateRows:"repeat(9,1fr)",
        boxShadow:"0 0 30px rgba(184,134,11,0.12)", flexShrink:0, background:PAPER,
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
          let bg = PAPER;
          if (isSelected) bg = GOLD_SOFT;
          else if (isSameNum) bg = GOLD_GHOST;
          else if (inSameGroup) bg = "rgba(0,0,0,0.035)";
          return (
            <button key={`${r}-${c}`} onClick={() => setSelected([r,c])} style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              background:bg, cursor:"pointer",
              borderRight: (c+1)%3===0&&c!==8 ? `2px solid ${GOLD}` : `1px solid ${INK_FAINT}`,
              borderBottom: (r+1)%3===0&&r!==8 ? `2px solid ${GOLD}` : `1px solid ${INK_FAINT}`,
              borderLeft: c%3===0&&c!==0 ? `2px solid ${GOLD}` : `1px solid ${INK_FAINT}`,
              borderTop: r%3===0&&r!==0 ? `2px solid ${GOLD}` : `1px solid ${INK_FAINT}`,
              color: wrong||conflict ? RED : isGiven ? INK : GOLD,
              fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(1.9rem,8vw,2.7rem)",
              fontWeight: isGiven ? 900 : 700,
              outline: isSelected ? `2px solid ${GOLD}` : "none",
              outlineOffset:-2, padding:0,
            }}>
              {val ? val : cellNotes && cellNotes.size > 0
                ? <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gridTemplateRows:"repeat(3,1fr)", width:"100%", height:"100%", padding:1 }}>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <span key={n} style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(0.3rem,1.3vw,0.45rem)", color:"rgba(184,134,11,0.85)", opacity:cellNotes.has(n)?1:0 }}>{n}</span>
                    ))}
                  </div>
                : null}
            </button>
          );
        }))}
      </div>

      <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap", justifyContent:"center" }}>
        {[
          { label:"↩ Undo", fn:handleUndo },
          { label:"⌫ Erase", fn:handleErase },
          { label:noteMode?"✏ ON":"✏ Notes", fn:()=>setNoteMode(m=>!m), active:noteMode },
          { label:"💡 Hint", fn:requestHint },
          { label:"↺ New", fn:()=>startGame() },
        ].map(({ label, fn, active }) => (
          <button key={label} onClick={fn} style={{
            background: active ? GOLD_GHOST : "transparent",
            border: `1px solid ${active ? GOLD : INK_FAINT}`,
            color: active ? GOLD : INK_SOFT,
            borderRadius:6, padding:"7px 12px",
            fontSize:"clamp(0.6rem,2.8vw,0.75rem)",
            cursor:"pointer", fontFamily:"'DM Mono',monospace",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:5, width:"100%", flexShrink:0 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleInput(n)} style={{
            aspectRatio:"1", background:"#faf7ee",
            border:`1px solid ${INK_FAINT}`, borderRadius:6, color:INK,
            fontFamily:"'Playfair Display',serif",
            fontSize:"clamp(2rem,9vw,3rem)",
            fontWeight:900, cursor:"pointer",
          }}>{n}</button>
        ))}
      </div>

      {showAd && <MattAd onSkip={grantHint} onClose={cancelHint} />}
    </div>
  );
}
