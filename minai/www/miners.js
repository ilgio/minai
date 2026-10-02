"use strict";
const LAUNCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.sh$/;
const MINER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const OC_FIELDS = ["core_offset", "lock_core", "mem_offset", "lock_mem", "power", "delay", "fan"];
const OC_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 15l4-5"/></svg>';

const $ = id => document.getElementById(id);
// aperto attraverso minai-server (indirizzo /rig/<id>/): niente login e c'è il ritorno all'elenco dei rig
const VIA_SERVER = /\/rig\/[^/]+\//.test(location.pathname);
const SERVER_HOME = location.pathname.replace(/\/rig\/[^/]+\/.*$/, "/");
const enc = encodeURIComponent;
let active = null, running = false, editing = null, miners = [], binDir = "", launchMiners = {};
let oc = {}, ocGpu = null, installPoll = null, checkPoll = null, started = false, managed = false;

/* ---------- richieste al server ---------- */
async function api(method, path, body) {
  const opts = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`api/${path}`, opts);
  if (res.status === 401) { showLogin(); throw new Error("Accesso richiesto"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}

function msg(id, text) { $(id).textContent = text || ""; $(id).hidden = !text; }
const showError = e => msg("error", e ? (e.message || String(e)) : "");

function button(label, onClick, cls) {
  const b = document.createElement("button");
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener("click", onClick);
  return b;
}

function row(cells, actions, cls) {
  const tr = document.createElement("tr");
  if (cls) tr.className = cls;
  for (const c of cells) {
    const td = document.createElement("td");
    if (c instanceof Node) td.append(c); else td.textContent = c;
    tr.append(td);
  }
  const td = document.createElement("td");
  const box = document.createElement("div");
  box.className = "actions";
  box.style.justifyContent = "flex-end";
  box.append(...actions);
  td.append(box);
  tr.append(td);
  return tr;
}

/* ---------- login ---------- */
let setupMode = false;
function showLogin(setup = false, host = "") {
  setupMode = setup;
  $("setupHint").hidden = !setup;
  $("nameRow").hidden = !setup;
  if (setup && host && !/^minai-/.test(host)) $("setupName").value = host;
  $("repeatRow").hidden = !setup;
  $("loginPassword").autocomplete = setup ? "new-password" : "current-password";
  $("btnLogin").textContent = setup ? "Salva e entra" : "Entra";
  $("app").hidden = true;
  $("login").hidden = false;
  $("loginPassword").focus();
}

$("loginForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  msg("loginError", "");
  const password = $("loginPassword").value;
  if (setupMode && password !== $("loginRepeat").value) { msg("loginError", "Le due password non coincidono."); return; }
  const name = $("setupName").value.trim().toLowerCase();
  if (setupMode && !/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(name)) {
    msg("loginError", "Nome del rig: lettere minuscole, numeri e trattini, senza spazi (per esempio backup3).");
    return;
  }
  const res = await fetch(setupMode ? "api/setup" : "api/login", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(setupMode ? { password, name } : { password }),
  }).catch(() => null);
  if (!res || !res.ok) {
    const err = res ? (await res.json().catch(() => ({}))).error : null;
    msg("loginError", !res ? "Server non raggiungibile." : res.status === 401 ? "Password errata." : (err || `Errore ${res.status}`));
    return;
  }
  const firstRun = setupMode;
  $("loginPassword").value = ""; $("loginRepeat").value = "";
  $("login").hidden = true;
  await start();
  if (firstRun) {  // primo avvio: subito al collegamento con Tailscale
    $("firstRunHint").hidden = false;
    openSettings();
  }
});

async function logout() {
  if (VIA_SERVER) { location.href = SERVER_HOME; return; }
  await fetch("api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  showLogin();
}

/* ---------- stato ---------- */
async function refreshStatus() {
  const s = await api("GET", "status");
  active = s.active; running = s.running; binDir = s.bin;
  document.title = `minai – ${s.host}`;
  $("hostName").textContent = s.host;
  $("appVersion").textContent = `minai v${s.version}`;
  showSelfUpdate(s);
  setManaged(!!s.managed);
  $("startHint").hidden = !(s.managed && !s.active);
  $("driverVersion").textContent = s.driver ? `Driver NVIDIA ${s.driver}` : "";
  if (s.speed && s.speed.value) {
    const small = document.createElement("small");
    small.textContent = s.speed.unit;
    $("speed").replaceChildren(s.speed.value, small);
    $("speed").hidden = !running;
  }
  const af = s.autofan || {};
  $("btnFan").classList.toggle("on", !!af.enabled);
  $("fanLabel").textContent = af.enabled ? `${af.target}°` : "";
  $("btnFan").title = (af.enabled ? `Autofan attivo, obiettivo ${af.target}°C` : "Autofan spento") + (af.event ? `\nUltimo intervento: ${af.event}` : "");
  $("dot").className = "dot " + (running ? "on" : "off");
  $("state").textContent = running ? "In esecuzione" : "Fermo";
  $("activeName").textContent = active ? active.replace(/\.sh$/, "") : "nessun lancio attivo";
  $("btnStop").disabled = !running;
  $("speed").hidden = !running || !$("speed").textContent;
  showSys(s.sys || {});
}

function showSys(x) {
  const has = v => v !== null && v !== undefined;
  if (!has(x.cpu_temp) && !has(x.cpu_load) && !has(x.total_power)) return;
  $("sysline").hidden = false;
  const t = $("sysCpuTemp");
  t.textContent = has(x.cpu_temp) ? `${x.cpu_temp}°C` : "–";
  t.className = "v" + (x.cpu_temp >= 85 ? " hot" : x.cpu_temp >= 75 ? " warm" : "");
  $("sysCpuLoad").textContent = has(x.cpu_load) ? `${x.cpu_load}%` : "–";
  $("sysPowerLabel").textContent = has(x.cpu_power) ? "Consumo totale" : "Consumo GPU";
  $("sysPower").textContent = has(x.total_power) ? `${x.total_power} W` : "–";
  $("sysPower").parentElement.title = has(x.cpu_power) ? `GPU ${x.gpu_power ?? 0} W + CPU ${x.cpu_power} W (senza il resto del PC)` : "";
}

/* ---------- gestione da minai-server ---------- */
function setManaged(on) {
  const changed = on !== managed;
  managed = on;
  for (const box of document.querySelectorAll(".managedbox")) box.hidden = !on;
  for (const a of document.querySelectorAll(".gotoServer")) a.hidden = !(on && VIA_SERVER);
  for (const id of ["btnNewMiner", "btnNewLaunch", "btnCheck"]) $(id).hidden = on;
  if (on) { $("minerForm").hidden = true; $("editor").hidden = true; }
  if (changed && started) { refreshMiners().catch(() => {}); refreshLaunches().catch(() => {}); }
}
for (const a of document.querySelectorAll(".gotoServer")) {
  a.href = SERVER_HOME;
  a.addEventListener("click", () => {
    try { localStorage.setItem("srv-tab", a.closest("#tab-miner") ? "miner" : "lanci"); } catch {}
  });
}

/* ---------- 1) miner ---------- */
async function refreshMiners() {
  const d = await api("GET", "miners");
  miners = d.miners;
  const body = $("miners");
  body.replaceChildren();
  $("noMiners").hidden = miners.length > 0;
  $("noMiners").textContent = managed
    ? "Nessun miner ancora: vengono installati da soli quando avvii un lancio da minai-server (Lanci → Avvia su…)."
    : "Nessun miner installato.";
  $("countMiners").textContent = miners.length || "";
  const updates = d.updates || {};
  let pending = 0;
  for (const m of miners) {
    const u = updates[m.name] || {};
    const label = document.createElement("span");
    label.textContent = m.name;
    if (u.current) {
      const v = document.createElement("span");
      v.className = "badge ver"; v.textContent = u.current;
      label.append(v);
    }
    const actions = [];
    if (u.update) {
      pending++;
      const n = document.createElement("span");
      n.className = "badge upd"; n.textContent = `nuova ${u.latest}`;
      label.append(n);
      if (u.url) actions.push(button(`Aggiorna a ${u.latest}`, () => updateMiner(m.name, u.url, u.latest), "primary"));
      else actions.push(button("Vedi release", () => window.open(u.page, "_blank", "noopener")));
    }
    if (managed) actions.length = 0;
    else actions.push(button("Modifica link", () => openMinerForm(m.name, m.source)),
                      button("Elimina", () => removeMiner(m.name), "danger"));
    const tr = row([label, m.source || "—"], actions);
    tr.children[1].className = "src";
    if (u.error) tr.children[1].title = u.error;
    body.append(tr);
  }
  document.querySelector('[data-tab="miner"]').classList.toggle("has-upd", pending > 0);
  const when = d.checked ? new Date(d.checked * 1000).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" }) : "";
  $("checkInfo").textContent = d.checking ? "Controllo aggiornamenti in corso…"
    : pending ? `${pending === 1 ? "C'è un aggiornamento disponibile" : `Ci sono ${pending} aggiornamenti disponibili`} · ultimo controllo ${when}`
    : when ? `Tutti i miner sono aggiornati · ultimo controllo ${when}` : "";
  $("btnCheck").disabled = d.checking;
  if (d.checking && !checkPoll) checkPoll = setInterval(() => refreshMiners().catch(() => {}), 2000);
  if (!d.checking && checkPoll) { clearInterval(checkPoll); checkPoll = null; }
  $("launchMiner").replaceChildren(...miners.map(m => new Option(m.name, m.name)));
  handleJob(d.job);
}

function handleJob(job) {
  if (job && job.state === "running") {
    msg("notice", `Scarico e installo ${job.name}…`);
    $("btnInstall").disabled = true;
    if (!installPoll) installPoll = setInterval(() => refreshMiners().catch(showError), 2000);
    return;
  }
  if (!installPoll) return;  // mostriamo l'esito solo di un'installazione seguita da questa pagina
  clearInterval(installPoll);
  installPoll = null;
  $("btnInstall").disabled = false;
  if (job && job.state === "ok") {
    const inUse = running && active && launchMiners[active] === job.name;
    msg("notice", `${job.name} installato in ${binDir}/${job.name}` + (inUse ? ". È in uso: riavvia il lancio per usare la nuova versione." : ""));
    $("minerForm").hidden = true;
  } else if (job) {
    msg("notice", "");
    showError(new Error(`Installazione di ${job.name} non riuscita: ${job.output}`));
  }
}

function openMinerForm(name, url) {
  $("minerForm").hidden = false;
  $("minerName").value = name || "";
  $("minerName").disabled = !!name;
  $("minerUrl").value = url || "";
  (name ? $("minerUrl") : $("minerName")).focus();
}

async function installMiner() {
  const name = $("minerName").value.trim();
  const url = $("minerUrl").value.trim();
  if (!MINER_RE.test(name)) return showError(new Error("Nome miner non valido: lettere, numeri, . _ -"));
  if (!/^https?:\/\//.test(url)) return showError(new Error("Il link deve iniziare con http:// o https://"));
  showError(null);
  try {
    await api("POST", "miners", { name, url });
    await refreshMiners();
  } catch (e) { showError(e); }
}

async function updateMiner(name, url, version) {
  if (!await ask(`Aggiornare ${name} alla versione ${version}? Se è in uso, dopo l'aggiornamento riavvia il lancio.`, { ok: "Aggiorna" })) return;
  showError(null);
  try {
    await api("POST", "miners", { name, url });
    await refreshMiners();
  } catch (e) { showError(e); }
}

async function checkUpdates() {
  try { await api("POST", "miners/check"); await refreshMiners(); } catch (e) { showError(e); }
}

async function removeMiner(name) {
  if (!await ask(`Eliminare il miner ${name}? I lanci che lo usano non partiranno più.`, { ok: "Elimina", danger: true })) return;
  try { await api("DELETE", `miners/${enc(name)}`); } catch (e) { showError(e); }
  refreshMiners().catch(showError);
}

/* ---------- 2) lanci ---------- */
const template = (miner, exe) => `#!/bin/bash
# Lancio: pool, wallet e parametri
cd ${binDir}/${miner}
exec ./${exe || miner} \\
  -a ALGORITMO \\
  -o POOL_URL \\
  -u WALLET_O_WORKER -p x
`;

async function newTemplate(miner) {
  let exe = "";
  try { exe = (await api("GET", `miners/${enc(miner)}/exe`)).exe; } catch {}
  return template(miner, exe);
}

async function refreshLaunches() {
  const { launches } = await api("GET", "launches");
  launchMiners = Object.fromEntries(launches.map(l => [l.file, l.miner]));
  const body = $("launches");
  body.replaceChildren();
  $("noLaunches").hidden = launches.length > 0;
  $("noLaunches").textContent = managed
    ? "Nessun lancio ancora: su minai-server vai su Lanci → Avvia su… e scegli questo rig."
    : "Nessun lancio. Crea il primo con “Nuovo lancio”.";
  $("countLaunches").textContent = launches.length || "";
  for (const { file, miner } of launches) {
    const isActive = file === active;
    const inUse = isActive && running;
    const label = document.createElement("span");
    label.textContent = file.replace(/\.sh$/, "");
    if (inUse) {
      const b = document.createElement("span");
      b.className = "badge"; b.textContent = "in uso";
      label.append(b);
    }
    body.append(row([label, miner || "—"], [
      ...(inUse ? [button("Ferma", stop)] : []),
      button(inUse ? "Riavvia" : "Avvia", () => activate(file), "primary"),
      ...(managed ? [] : [button("Modifica", () => openEditor(file)), button("Elimina", () => removeLaunch(file), "danger")]),
    ], isActive ? "active" : ""));
  }
}

async function activate(file) {
  $("speed").textContent = ""; keySpeedSeen = false;
  try { await api("POST", `launches/${enc(file)}/start`); } catch (e) { showError(e); }
  refresh();
}

async function stop() {
  try { await api("POST", "stop"); } catch (e) { showError(e); }
  refresh();
}

async function openEditor(file) {
  editing = file;
  $("editor").hidden = false;
  $("newFields").hidden = !!file;
  $("editorTitle").textContent = file ? `Modifica ${file.replace(/\.sh$/, "")}` : "Nuovo lancio";
  $("btnSave").textContent = file && file === active && running ? "Salva e riavvia" : "Salva";
  if (file) {
    try { $("content").value = (await api("GET", `launches/${enc(file)}`)).content; }
    catch (e) { showError(e); }
    $("content").focus();
  } else {
    if (!miners.length) showError(new Error("Installa prima almeno un miner."));
    $("launchName").value = "";
    $("content").value = miners.length ? await newTemplate($("launchMiner").value) : "";
    $("launchName").focus();
  }
}

function closeEditor() { editing = null; $("editor").hidden = true; }

async function saveLaunch() {
  let file = editing;
  if (!file) {
    file = `${$("launchName").value.trim().replace(/\.sh$/, "")}.sh`;
    if (!LAUNCH_RE.test(file)) return showError(new Error("Nome lancio non valido: lettere, numeri, . _ -"));
  }
  try {
    await api("PUT", `launches/${enc(file)}`, { content: $("content").value });
    closeEditor();
    showError(null);
  } catch (e) { showError(e); }
  refresh();
}

async function removeLaunch(file) {
  if (file === active && running) return showError(new Error("Ferma il miner prima di eliminare il lancio in uso."));
  if (!await ask(`Eliminare il lancio ${file.replace(/\.sh$/, "")}?`, { ok: "Elimina", danger: true })) return;
  try { await api("DELETE", `launches/${enc(file)}`); } catch (e) { showError(e); }
  refresh();
}

/* ---------- log ---------- */
// Converte i codici colore ANSI dei miner in span con classi CSS
function ansiToHtml(raw) {
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const line = raw.split("\r").filter(Boolean).pop() || "";
  const clean = line.replace(/\x1b\[[0-9;?]*[A-Za-ln-z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
  const parts = clean.split(/\x1b\[([0-9;]*)m/);
  let out = "", color = null, bold = false;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (!parts[i]) continue;
      const cls = [color !== null ? `c${color}` : "", bold ? "b" : ""].filter(Boolean).join(" ");
      out += cls ? `<span class="${cls}">${esc(parts[i])}</span>` : esc(parts[i]);
    } else {
      for (const c of (parts[i] || "0").split(";").map(Number)) {
        if (c === 0) { color = null; bold = false; }
        else if (c === 1) bold = true;
        else if (c === 22) bold = false;
        else if (c >= 30 && c <= 37) color = c - 30;
        else if (c >= 90 && c <= 97) color = c - 90;
        else if (c === 39) color = null;
      }
    }
  }
  return out;
}

// Velocità del miner letta dal log: preferisce le righe con "total"/"hashrate"/"speed"
const SPEED_RE = /(\d+(?:[.,]\d+)?)\s*([kKMGTPE]?(?:H|Sol|N)\/s)\b/g;
const SPEED_KEY = /total|hashrate|speed/i;
let keySpeedSeen = false;
function parseSpeed(raw) {
  const line = raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  const found = [...line.matchAll(SPEED_RE)];
  if (!found.length) return;
  const isKey = SPEED_KEY.test(line);
  if (!isKey && keySpeedSeen) return;
  if (isKey) keySpeedSeen = true;
  const [, value, unit] = found[found.length - 1];
  const small = document.createElement("small");
  small.textContent = unit;
  $("speed").replaceChildren(value, small);
  $("speed").hidden = !running;
}

const logLines = [];
let logCursor = "", logBusy = false;
async function pollLog() {
  if (logBusy) return;
  logBusy = true;
  try {
    const d = await api("GET", `log${logCursor ? `?cursor=${enc(logCursor)}` : ""}`);
    logCursor = d.cursor || logCursor;
    const fresh = d.lines.flatMap(l => l.split("\n")).filter(l => l.trim());
    if (fresh.length) {
      fresh.forEach(parseSpeed);
      logLines.push(...fresh);
      if (logLines.length > 500) logLines.splice(0, logLines.length - 500);
      const pre = $("log");
      const atBottom = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 20;
      pre.innerHTML = logLines.map(ansiToHtml).join("\n");
      if (atBottom) pre.scrollTop = pre.scrollHeight;
    }
  } catch {} finally { logBusy = false; }
}

/* ---------- GPU e overclock ---------- */
async function gpus() {
  let list = [];
  try { list = (await api("GET", "gpus")).gpus; } catch { return; }
  const box = $("gpus");
  box.replaceChildren();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  for (const [i, name, t, p, u, sm, mem, fan] of list) {
    const card = el("article", "gpu");
    const head = el("div", "gpu-head");
    const title = el("div", "gpu-name");
    title.append(el("span", "", `#${i}`), name);
    const b = button("OC", () => openOc(i, name), "iconbtn");
    b.insertAdjacentHTML("afterbegin", OC_ICON);
    b.setAttribute("aria-label", `Overclock GPU ${i}`);
    head.append(title, b);
    const temp = Number(t);
    const stats = el("div", "stats");
    for (const [k, v, cls, pct] of [
      ["Temp", `${t}°C`, temp >= 80 ? "hot" : temp >= 70 ? "warm" : ""],
      ["Potenza", `${Math.round(p)} W`],
      ["Uso", `${u}%`, "", Number(u)],
      ["Core", `${sm} MHz`],
      ["Memoria", `${mem} MHz`],
      ["Ventola", `${fan}%`, "", Number(fan)],
    ]) {
      const st = el("div", "stat");
      st.append(el("span", "k", k), el("span", `v ${cls || ""}`.trim(), v));
      if (pct != null && !Number.isNaN(pct)) {
        const bar = el("div", "bar"), fill = el("i");
        fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        bar.append(fill); st.append(bar);
      }
      stats.append(st);
    }
    card.append(head, stats);
    box.append(card);
  }
  $("gpuSection").hidden = list.length === 0;
}

async function openOc(i, name) {
  try { oc = (await api("GET", "oc")).oc; } catch (e) { showError(e); }
  ocGpu = i;
  $("ocTitle").textContent = `Overclock GPU ${i}: ${name}`;
  const c = oc[i] || {};
  for (const f of OC_FIELDS) $(`oc_${f}`).value = c[f] ?? "";
  $("ocOut").hidden = true;
  $("ocDialog").showModal();
}

async function applyOc(clear) {
  if (clear) for (const f of OC_FIELDS) $(`oc_${f}`).value = "";
  const values = {};
  for (const f of OC_FIELDS) {
    const v = $(`oc_${f}`).value.trim();
    if (v !== "") values[f] = Number(v);
  }
  const outEl = $("ocOut");
  outEl.hidden = false;
  outEl.textContent = "Applico…";
  $("btnOcApply").disabled = $("btnOcReset").disabled = true;
  try {
    const d = await api("PUT", "oc", { gpu: ocGpu, values });
    oc = d.oc;
    outEl.textContent = d.output || "Fatto.";
  } catch (e) { outEl.textContent = e.message || String(e); }
  $("btnOcApply").disabled = $("btnOcReset").disabled = false;
  gpus();
}

/* ---------- terminale ---------- */
// Il terminale vero (ttyd + tmux) gira sul rig: qui lo mostriamo in un riquadro.
let hiddenSince = 0;
function openTerm(reload) {
  const f = $("termFrame");
  // sul telefono usa il terminale con i caratteri piccoli (stessa sessione tmux)
  const base = matchMedia("(max-width: 700px)").matches ? "termm" : "term";
  if (!f.getAttribute("src") || reload || !f.getAttribute("src").startsWith(base + "/")) f.src = `${base}/?t=${Date.now()}`;
  setTimeout(() => { try { f.contentWindow.focus(); } catch {} }, 300);
}

/* ---------- spegnimento e riavvio ---------- */
async function power(action) {
  const what = action === "reboot" ? "riavviare" : "spegnere";
  if (!await ask(`Vuoi davvero ${what} il rig? Il miner si fermerà.`, { ok: action === "reboot" ? "Reboot" : "Shutdown", danger: true })) return;
  const done = () => msg("notice", action === "reboot"
    ? "Riavvio in corso: il pannello torna disponibile tra un paio di minuti."
    : "Spegnimento in corso. Per riaccenderlo serve il pulsante di accensione o il Wake-on-LAN.");
  try {
    await api("POST", "power", { action });
    done();
  } catch (e) {
    // se il rig si spegne prima di rispondere, la richiesta fallisce ma l'operazione è partita
    if (e instanceof TypeError) done(); else showError(e);
  }
}
$("btnReboot").addEventListener("click", () => power("reboot"));
$("btnPoweroff").addEventListener("click", () => power("poweroff"));

/* ---------- tab ---------- */
function showTab(name) {
  for (const t of document.querySelectorAll('[role="tab"]')) {
    const on = t.dataset.tab === name;
    t.setAttribute("aria-selected", String(on));
    $(`tab-${t.dataset.tab}`).hidden = !on;
  }
  if (name === "generale") $("log").scrollTop = $("log").scrollHeight;
  if (name === "terminale") openTerm(false);
  try { localStorage.setItem("miners-tab", name); } catch {}
}

/* ---------- avvio ---------- */
async function refresh() {
  try { await refreshStatus(); await refreshMiners(); await refreshLaunches(); }
  catch (e) { if (e.message !== "Accesso richiesto") showError(e); throw e; }
}

async function start() {
  if (!VIA_SERVER) {
    try {
      const a = await (await fetch("api/auth", { credentials: "same-origin" })).json();
      if (a.setup) { showLogin(true, a.host); return; }
    } catch {}
  }
  try { await refresh(); } catch { return; }
  $("app").hidden = false;
  pollLog();
  gpus();
  if (started) return;
  started = true;
  setInterval(pollLog, 2000);
  setInterval(gpus, 5000);
  setInterval(() => refreshStatus().catch(() => {}), 5000);
  setInterval(() => refresh().catch(() => {}), 30000);
}

// Tornando sulla pagina (per esempio dopo un cambio app su iPhone) aggiorna subito tutto
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenSince = Date.now(); return; }
  if (started && !$("app").hidden) {
    pollLog(); gpus(); refreshStatus().catch(() => {});
    // dopo qualche secondo in background la connessione del terminale è caduta: la riapriamo (tmux conserva la sessione)
    if (!$("tab-terminale").hidden && Date.now() - hiddenSince > 3000) openTerm(true);
  }
});

for (const t of document.querySelectorAll('[role="tab"]')) t.addEventListener("click", () => showTab(t.dataset.tab));
let startTab = "generale";
// aperto dal server si parte sempre da Generale; da solo si riapre l'ultima tab usata
if (!VIA_SERVER) { try { startTab = localStorage.getItem("miners-tab") || startTab; } catch {} }
showTab($(`tab-${startTab}`) ? startTab : "generale");

/* ---------- autofan ---------- */
const AF_FIELDS = ["target", "min", "max", "critical"];
async function openFan() {
  msg("fanMsg", "");
  try {
    const d = await api("GET", "autofan");
    $("af_enabled").checked = d.config.enabled;
    for (const f of AF_FIELDS) $(`af_${f}`).value = d.config[f];
    $("af_action").value = d.config.action;
    showFanStatus(d.status);
  } catch (e) { showError(e); return; }
  $("fanDialog").showModal();
}

function showFanStatus(st) {
  const box = $("fanStatus");
  box.replaceChildren();
  for (const g of (st && st.gpus) || []) {
    const r = document.createElement("div");
    r.textContent = `GPU ${g.index}: ${g.temp}°C, ventola ${g.fan ?? "–"}%`;
    box.append(r);
  }
  if (st && st.event) {
    const e = document.createElement("div");
    e.className = "muted"; e.textContent = `Ultimo intervento: ${st.event}`;
    box.append(e);
  }
  box.hidden = !box.children.length;
}

async function saveFan() {
  const body = { enabled: $("af_enabled").checked, action: $("af_action").value };
  for (const f of AF_FIELDS) body[f] = Number($(`af_${f}`).value);
  try {
    await api("PUT", "autofan", body);
    $("fanDialog").close();
    refreshStatus().catch(() => {});
  } catch (e) { msg("fanMsg", e.message); }
}
$("btnFan").addEventListener("click", openFan);
$("btnFanSave").addEventListener("click", saveFan);
$("btnFanClose").addEventListener("click", () => $("fanDialog").close());

/* ---------- impostazioni: Tailscale ---------- */
let tsPoll = null, tsWin = null;
function showTs(ts) {
  const box = $("tsState");
  box.replaceChildren();
  const line = (label, value) => { const d = document.createElement("div"); d.append(Object.assign(document.createElement("span"), { className: "k", textContent: label }), value); box.append(d); };
  const running = ts.installed && ts.state === "Running";
  const st = document.createElement("strong");
  st.className = running ? "okc" : "badc";
  st.textContent = !ts.installed ? "Non installato" : running ? "Collegato" : ts.state === "NeedsLogin" ? "Da collegare" : (ts.state || "Spento");
  line("Stato", st);
  if (running) {
    line("Indirizzo", ts.ip || "–");
    if (ts.name) line("Nome", ts.name);
    if (ts.tailnet) line("Rete", ts.tailnet);
  }
  $("tsConnect").hidden = running || !ts.installed;
  $("btnTsLogout").hidden = !running;
  if (ts.login_url) { $("tsLink").href = ts.login_url; $("tsLinkBox").hidden = false; }
  else $("tsLinkBox").hidden = true;
  if (running && tsPoll) { clearInterval(tsPoll); tsPoll = null; }
  if (running && tsWin) {  // accesso fatto: chiudiamo la scheda di Tailscale e torniamo qui
    try { if (!tsWin.closed) tsWin.close(); } catch {}
    tsWin = null;
    window.focus();
  }
}
async function loadSettings() {
  const d = await api("GET", "settings");
  showTs(d.tailscale);
  if (typeof showLinkInfo === "function") showLinkInfo(d);
  return d;
}
async function openSettings() {
  msg("setMsg", "");
  try { await loadSettings(); } catch (e) { showError ? showError(e) : msg("error", e.message); return; }
  $("setDialog").showModal();
}
async function tsConnect(withKey) {
  msg("setMsg", "");
  const authkey = withKey ? $("tsKey").value.trim() : "";
  if (withKey && !authkey) { msg("setMsg", "Incolla prima la chiave."); return; }
  const b = withKey ? $("btnTsKey") : $("btnTsLink");
  b.disabled = true;
  if (!withKey) {
    // la scheda va aperta subito, al tocco: dopo un'attesa iPhone e browser la bloccherebbero
    tsWin = window.open("", "minai-tailscale");
    if (tsWin) {
      try { tsWin.document.write("<p style='font:16px system-ui;padding:2rem'>Apro Tailscale…</p>"); } catch {}
    }
  }
  try {
    const d = await api("POST", "tailscale/up", { authkey });
    $("tsKey").value = "";
    if (d.url) {
      $("tsLink").href = d.url;
      $("tsLinkBox").hidden = false;
      if (tsWin && !tsWin.closed) tsWin.location.href = d.url;
    } else if (tsWin) { try { tsWin.close(); } catch {} tsWin = null; }
    if (!tsPoll) tsPoll = setInterval(() => loadSettings().catch(() => {}), 3000);
    await loadSettings();
  } catch (e) {
    msg("setMsg", e.message);
    if (tsWin) { try { tsWin.close(); } catch {} tsWin = null; }
  }
  b.disabled = false;
}
async function tsLogout() {
  if (!await ask("Scollegare da Tailscale? Se stai usando il pannello attraverso Tailscale, perderai la connessione.", { ok: "Scollega", danger: true })) return;
  try { await api("POST", "tailscale/logout"); await loadSettings(); } catch (e) { msg("setMsg", e.message); }
}
function copyText(id) {
  const t = $(id).textContent;
  const done = () => { const b = document.querySelector(`[data-copy="${id}"]`); if (b) { const o = b.textContent; b.textContent = "Copiato"; setTimeout(() => { b.textContent = o; }, 1500); } };
  if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(done, () => {}); return; }
  const r = document.createRange(); r.selectNodeContents($(id)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  try { document.execCommand("copy"); done(); } catch {}
}
$("btnSettings").addEventListener("click", openSettings);
$("btnTsLink").addEventListener("click", () => tsConnect(false));
$("btnTsKey").addEventListener("click", () => tsConnect(true));
$("btnTsLogout").addEventListener("click", tsLogout);
$("btnSetClose").addEventListener("click", () => { $("setDialog").close(); if (tsPoll) { clearInterval(tsPoll); tsPoll = null; } });
for (const b of document.querySelectorAll("[data-copy]")) b.addEventListener("click", () => copyText(b.dataset.copy));

$("btnRename").addEventListener("click", async () => {
  msg("setMsg", "");
  try {
    const d = await api("POST", "rename", { name: $("rigNameInput").value });
    $("nameLocal").textContent = d.host;
    $("hostName").textContent = d.host;
    msg("setMsg", "");
    $("btnRename").textContent = "Salvato";
    setTimeout(() => { $("btnRename").textContent = "Salva"; }, 1500);
  } catch (e) { msg("setMsg", e.message); }
});

function showLinkInfo(d) {
  $("rigNameInput").value = d.host;
  $("nameLocal").textContent = d.host;
  const ts = d.tailscale || {};
  $("setAddr").textContent = ts.state === "Running" && ts.ip ? ts.ip : "collega prima Tailscale";
  $("setToken").textContent = d.token;
  document.querySelector('[data-copy="setAddr"]').disabled = !(ts.state === "Running" && ts.ip);
}

/* ---------- aggiornamento di minai ---------- */
let selfUpd = { from: null, since: 0 };
function showSelfUpdate(s) {
  const b = $("btnSelfUpdate");
  if (selfUpd.from) {
    if (s.version !== selfUpd.from) { location.reload(); return; }       // nuova versione attiva
    if (Date.now() - selfUpd.since > 5 * 60000 && !s.updating) {
      selfUpd.from = null;
      showError(new Error("L'aggiornamento non è andato a buon fine: i dettagli sono in /opt/miners/update.log"));
    }
  }
  const busy = !!selfUpd.from || s.updating;
  b.hidden = !s.update && !busy;
  b.disabled = busy;
  b.textContent = busy ? "Aggiornamento…" : `v${s.update} disponibile`;
  b.dataset.version = s.update || "";
}
async function selfUpdate() {
  const v = $("btnSelfUpdate").dataset.version;
  if (!await ask(`Aggiornare minai alla v${v}?\nIl miner continua a lavorare; il pannello si ricarica da solo tra un minuto circa.`, { ok: "Aggiorna" })) return;
  try {
    await api("POST", "selfupdate");
    selfUpd = { from: $("appVersion").textContent.replace("minai v", ""), since: Date.now() };
    msg("notice", "Aggiornamento di minai in corso: il pannello si ricarica da solo.");
    showSelfUpdate({ updating: true });
  } catch (e) { showError(e); }
}
$("btnSelfUpdate").addEventListener("click", selfUpdate);
$("btnSelfCheck").addEventListener("click", async () => {
  // nessun messaggio: se c'è una nuova versione compare il badge arancione accanto al logo
  try { await api("POST", "selfcheck"); await refreshStatus(); } catch (e) { showError(e); }
});

/* ---------- menu in alto a destra ---------- */
function setMenu(open) {
  $("menuPanel").hidden = !open;
  $("btnMenu").setAttribute("aria-expanded", String(open));
}
$("btnMenu").addEventListener("click", ev => { ev.stopPropagation(); setMenu($("menuPanel").hidden); });
$("menuPanel").addEventListener("click", ev => { if (ev.target.closest("button")) setMenu(false); });
document.addEventListener("click", ev => { if (!ev.target.closest(".menu")) setMenu(false); });
document.addEventListener("keydown", ev => { if (ev.key === "Escape") setMenu(false); });

$("btnStop").addEventListener("click", stop);
$("btnLogout").addEventListener("click", logout);
$("btnNewMiner").addEventListener("click", () => openMinerForm());
$("btnCheck").addEventListener("click", checkUpdates);
$("btnCancelMiner").addEventListener("click", () => { $("minerForm").hidden = true; });
$("btnInstall").addEventListener("click", installMiner);
$("btnNewLaunch").addEventListener("click", () => openEditor(null));
$("launchMiner").addEventListener("change", async () => { if (!editing) $("content").value = await newTemplate($("launchMiner").value); });
$("btnSave").addEventListener("click", saveLaunch);
$("btnCancel").addEventListener("click", closeEditor);
$("btnOcClose").addEventListener("click", () => $("ocDialog").close());
$("btnOcApply").addEventListener("click", () => applyOc(false));
$("btnOcReset").addEventListener("click", () => applyOc(true));

if (VIA_SERVER) {
  $("backLink").hidden = false;
  $("backLink").href = SERVER_HOME;
  $("btnLogout").lastChild.textContent = "Tutti i rig";
}

start();
