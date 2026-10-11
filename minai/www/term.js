// minai: terminale del rig nel browser. Disegna con xterm.js e parla con ttyd (che tiene aperta la sessione tmux).
// La misura (colonne e righe) si ricalcola a ogni cambio e si comunica a tmux: così testo e cursore restano allineati.
"use strict";
const phone = matchMedia("(max-width: 700px)").matches;
// su telefono la dimensione parte da quella che fa stare 80 colonne (come nvidia-smi) senza andare a capo
function autoFont() {
  if (!phone) return 14;
  const w = Math.max(280, innerWidth - 8);
  return Math.max(7, Math.min(12, Math.floor(w / (80 * 0.602) * 2) / 2));
}
let savedFont = 0;
try { savedFont = parseFloat(localStorage.getItem("minai.termfont")) || 0; } catch {}
const term = new Terminal({
  fontFamily: 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace',
  fontSize: savedFont || autoFont(), lineHeight: 1.15, letterSpacing: 0,
  cursorBlink: false, scrollback: 5000, macOptionClickForcesSelection: true, rightClickSelectsWord: false,
  theme: { background: "#0b0e14", foreground: "#d6deeb", cursor: "#38d6e8", cursorAccent: "#0b0e14",
           selectionBackground: "#2b4a7a" },
});
const fit = new FitAddon.FitAddon();
term.loadAddon(fit);
term.open(document.getElementById("t"));
window.term = term;

const sc = document.getElementById("sc"), tEl = document.getElementById("t");
const enc = new TextEncoder();
const st = document.getElementById("st");
let ws = null, retry = 0;

function send(cmd, data) { if (ws && ws.readyState === 1) ws.send(enc.encode(cmd + data)); }
function sendSize() { send("1", JSON.stringify({ columns: term.cols, rows: term.rows })); }

// modo largo: 114 colonne (nvidia-smi sta intero) anche se più larghe dello schermo; si scorre con un dito
const WIDE = 114;
let wide = false;
try { wide = localStorage.getItem("minai.termwide") === "1"; } catch {}
function cellW() {
  const s = document.createElement("span");
  s.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:" + term.options.fontSize + "px " + term.options.fontFamily;
  s.textContent = "M".repeat(100); document.body.appendChild(s);
  const w = s.getBoundingClientRect().width / 100; s.remove(); return w;
}
function layoutWide() {
  if (wide) tEl.style.width = Math.ceil(WIDE * cellW() + 8) + "px";
  else { tEl.style.width = ""; sc.scrollLeft = 0; }
}
window.termWide = on => {
  wide = on === undefined ? !wide : !!on;
  try { localStorage.setItem("minai.termwide", wide ? "1" : "0"); } catch {}
  layoutWide(); setTimeout(() => { doFit(true); term.focus(); }, 30);
  return wide;
};
window.termIsWide = () => wide;

// ricalcola la misura; se è uguale a prima la rimanda comunque a tmux quando serve (force)
function doFit(force) {
  layoutWide();
  let d = null;
  try { d = fit.proposeDimensions(); } catch {}
  if (!d || !(d.cols > 4) || !(d.rows > 2)) return;   // riquadro nascosto: si riprova quando ricompare
  if (d.cols !== term.cols || d.rows !== term.rows) term.resize(d.cols, d.rows);  // onResize manda la misura
  else if (force) sendSize();
}
window.refit = () => { doFit(true); term.focus(); };
window.termSend = data => { send("0", data); term.focus(); };
// carattere più grande/piccolo (si ricorda)
window.termFont = delta => {
  const f = Math.max(6, Math.min(22, (term.options.fontSize || 11) + delta));
  term.options.fontSize = f;
  try { localStorage.setItem("minai.termfont", String(f)); } catch {}
  setTimeout(() => { doFit(true); term.focus(); }, 30);
  return f;
};
// Ctrl "a scatto": si preme, poi la lettera successiva (anche dalla tastiera dell'iPhone) diventa Ctrl+lettera
let ctrlOn = false;
window.termCtrl = on => { ctrlOn = on === undefined ? !ctrlOn : !!on; if (window.onCtrl) window.onCtrl(ctrlOn); term.focus(); return ctrlOn; };
function applyCtrl(d) {
  if (!ctrlOn || d.length !== 1) return d;
  const c = d.toUpperCase().charCodeAt(0);
  if (c < 64 || c > 95) return d;
  ctrlOn = false; if (window.onCtrl) window.onCtrl(false);
  return String.fromCharCode(c - 64);
}

term.onResize(sendSize);
// con più schermi aperti sulla stessa sessione (computer e telefono) tmux usa la misura dell'ultimo attivo:
// chi torna a usare il terminale rimanda la sua
term.textarea && term.textarea.addEventListener("focus", () => doFit(true));
term.onData(d => send("0", applyCtrl(d)));
term.onBinary(d => send("0", d));

/* ---- tocco: scorrere (anche la cronologia di tmux), pizzicare per l'ingrandimento, tenere premuto per copiare ---- */
const LINES_PER_WHEEL = 4;           // righe che tmux scorre a ogni "rotella"
function cellH() { const e = term.element && term.element.querySelector(".xterm-screen"); return e && term.rows ? e.offsetHeight / term.rows : 16; }
function wheel(up) {
  const x = Math.max(1, term.cols >> 1), y = Math.max(1, term.rows >> 1);
  send("0", `\x1b[<${up ? 64 : 65};${x};${y}M`);
}
const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
let tp = null, pinch = null, lp = 0, pt = 0;
const selbar = document.getElementById("selbar");
let anchor = null;
function geom() {
  const r = term.element.querySelector(".xterm-screen").getBoundingClientRect();
  return { r, cw: r.width / term.cols, ch: r.height / term.rows };
}
function cellAt(t) {
  const g = geom();
  return { c: Math.max(0, Math.min(term.cols - 1, Math.floor((t.clientX - g.r.left) / g.cw))),
           y: Math.max(0, Math.min(term.rows - 1, Math.floor((t.clientY - g.r.top) / g.ch))) };
}
function selectRange(a, b) {      // a, b = {c, y} (y = riga visibile); seleziona da a a b in qualunque verso
  const base = term.buffer.active.viewportY;
  let p = a.y * term.cols + a.c, q = b.y * term.cols + b.c;
  if (q < p) [p, q] = [q, p];
  term.select(p % term.cols, base + Math.floor(p / term.cols), q - p + 1);
}
function wordAt(cell) {            // estremi della "parola" sotto il dito
  const l = term.buffer.active.getLine(term.buffer.active.viewportY + cell.y);
  const txt = l ? l.translateToString(false) : "";
  const ok = i => i >= 0 && i < txt.length && txt[i] !== " ";
  let a = cell.c, b = cell.c;
  if (!ok(a)) return { a: cell, b: cell };
  while (ok(a - 1)) a--; while (ok(b + 1)) b++;
  return { a: { c: a, y: cell.y }, b: { c: b, y: cell.y } };
}
function showSel(on) { selbar.classList.toggle("on", on); }
function clearSel() { term.clearSelection(); showSel(false); anchor = null; }
function copySel() {
  const t = term.getSelection();
  if (!t) return false;
  try { navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.cssText = "position:fixed;left:0;top:0;opacity:0;font-size:16px";
    document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length);
    document.execCommand("copy"); ta.remove();
  } catch {}
  st.textContent = "Copiato"; setTimeout(() => { if (st.textContent === "Copiato") st.textContent = ""; }, 1400);
  clearSel(); return true;
}
window.termCopy = () => (term.hasSelection() ? copySel() : false);
window.termHasSel = () => term.hasSelection();
document.getElementById("selCopy").addEventListener("click", copySel);
document.getElementById("selClose").addEventListener("click", clearSel);
document.getElementById("selAll").addEventListener("click", () => {      // tutto lo schermo visibile
  term.selectAll(); 
  const b = term.buffer.active; term.select(0, b.viewportY, term.cols * term.rows);
});
sc.addEventListener("touchstart", e => {
  clearTimeout(lp);
  if (term.hasSelection() && !selbar.contains(e.target)) clearSel();
  if (e.touches.length === 2) { pinch = { d: dist(e), f: term.options.fontSize }; tp = null; return; }
  if (e.touches.length === 1) {
    const t = e.touches[0];
    tp = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, lock: null, acc: 0 };
    // tocco lungo: seleziona la parola, poi si trascina per estendere la selezione
    lp = setTimeout(() => {
      if (!tp || tp.lock) return;
      tp.lock = "sel"; const w = wordAt(cellAt(t)); anchor = w.a; selectRange(w.a, w.b);
      try { navigator.vibrate && navigator.vibrate(15); } catch {}
    }, 450);
  }
}, { passive: false, capture: true });
sc.addEventListener("touchmove", e => {
  if (e.touches.length === 2 && pinch) {
    e.preventDefault(); e.stopPropagation(); clearTimeout(lp);
    const f = Math.max(6, Math.min(22, Math.round(pinch.f * dist(e) / pinch.d * 2) / 2));
    if (f !== term.options.fontSize) {
      term.options.fontSize = f; layoutWide();
      clearTimeout(pt); pt = setTimeout(() => { try { localStorage.setItem("minai.termfont", String(f)); } catch {} doFit(true); }, 80);
    }
    return;
  }
  if (!tp || e.touches.length !== 1) return;
  const t = e.touches[0];
  if (tp.lock === "sel") { e.preventDefault(); e.stopPropagation(); if (anchor) selectRange(anchor, cellAt(t)); return; }
  if (!tp.lock) {
    if (Math.hypot(t.clientX - tp.x, t.clientY - tp.y) < 8) return;
    clearTimeout(lp);
    tp.lock = Math.abs(t.clientY - tp.y) >= Math.abs(t.clientX - tp.x) ? "v" : "h";
  }
  e.preventDefault(); e.stopPropagation();
  const dx = t.clientX - tp.lx, dy = t.clientY - tp.ly;
  tp.lx = t.clientX; tp.ly = t.clientY;
  if (tp.lock === "v") {
    tp.acc += dy;
    const step = cellH() * LINES_PER_WHEEL;
    while (Math.abs(tp.acc) >= step) { wheel(tp.acc > 0); tp.acc -= Math.sign(tp.acc) * step; }
  } else sc.scrollLeft -= dx;
}, { passive: false, capture: true });
const endTouch = e => {
  clearTimeout(lp);
  if (!e.touches.length) {
    if (tp && tp.lock === "sel" && term.hasSelection()) { showSel(true); e.preventDefault && e.preventDefault(); }
    tp = null; pinch = null;
  }
};
sc.addEventListener("touchend", endTouch, { capture: true, passive: false });
sc.addEventListener("touchcancel", endTouch, true);
document.addEventListener("gesturestart", e => e.preventDefault());

let timer = 0;
new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => doFit(false), 60); }).observe(tEl);
new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => doFit(false), 60); }).observe(sc);
document.fonts && document.fonts.ready.then(() => doFit(true));
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => doFit(true), 100); });

async function connect() {
  let token = "";
  try { token = (await (await fetch("term/token", { credentials: "same-origin" })).json()).token || ""; } catch {}
  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${location.pathname.replace(/[^/]*$/, "")}term/ws`;
  ws = new WebSocket(url, ["tty"]);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    retry = 0; st.textContent = "";
    doFit(false);
    ws.send(enc.encode(JSON.stringify({ AuthToken: token, columns: term.cols, rows: term.rows })));
    // dopo l'apertura tmux ridisegna tutto con la misura giusta
    setTimeout(() => doFit(true), 300);
    term.focus();
  };
  ws.onmessage = e => {
    const u = new Uint8Array(e.data);
    if (u[0] === 48) term.write(u.subarray(1));       // "0": testo del terminale
  };
  ws.onclose = () => {
    st.textContent = "Disconnesso: mi ricollego…";
    setTimeout(connect, Math.min(5000, 800 * ++retry));
  };
}
doFit(false);
connect();
