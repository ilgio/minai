"use strict";
const $ = id => document.getElementById(id);
let rigs = [], editing = null, started = false;
let cat = { miners: [], launches: [], deploy: {} }, editingMiner = null, editingLaunch = null, deployLaunch = null, checkPoll = null;

async function api(method, path, body) {
  const opts = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch(`api/${path}`, opts);
  if (res.status === 401) { showLogin(); throw new Error("Accesso richiesto"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
  return data;
}
function msg(id, text) { $(id).textContent = text || ""; $(id).hidden = !text; }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/* ---------- login ---------- */
let setupMode = false;
function showLogin(setup = false) {
  setupMode = setup;
  $("setupHint").hidden = !setup;
  $("repeatRow").hidden = !setup;
  $("loginPassword").autocomplete = setup ? "new-password" : "current-password";
  $("btnLogin").textContent = setup ? "Salva e entra" : "Entra";
  $("app").hidden = true; $("login").hidden = false; $("loginPassword").focus();
}
$("loginForm").addEventListener("submit", async ev => {
  ev.preventDefault();
  msg("loginError", "");
  const password = $("loginPassword").value;
  if (setupMode && password !== $("loginRepeat").value) { msg("loginError", "Le due password non coincidono."); return; }
  const res = await fetch(setupMode ? "api/setup" : "api/login", { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
  if (!res || !res.ok) {
    const err = res ? (await res.json().catch(() => ({}))).error : null;
    msg("loginError", !res ? "Server non raggiungibile." : res.status === 401 ? "Password errata." : (err || `Errore ${res.status}`));
    return;
  }
  $("loginPassword").value = ""; $("loginRepeat").value = ""; $("login").hidden = true; start();
});
async function logout() { await fetch("api/logout", { method: "POST" }).catch(() => {}); showLogin(); }

/* ---------- elenco rig ---------- */
function ago(ts) {
  if (!ts) return "mai visto";
  const s = Math.max(0, Math.round(Date.now() / 1000 - ts));
  if (s < 90) return `visto ${s} s fa`;
  if (s < 5400) return `visto ${Math.round(s / 60)} min fa`;
  return `visto ${new Date(ts * 1000).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" })}`;
}

function rigCard(r) {
  const st = r.status || {};
  const sys = st.sys || {};
  const running = r.online && st.running;
  const card = el("a", "rig card" + (r.online ? "" : " offline"));
  card.href = `rig/${r.id}/`;
  if (r.error) card.title = r.error;

  const head = el("div", "righead");
  const rs = (st && st.state) || (running ? "running" : "stopped");
  const dot = el("span", "dot " + (!r.online ? "gone" : rs === "running" ? "on" : rs === "failing" ? "fail" : "off"));
  if (r.online && rs === "failing") dot.title = "In errore, riprovo…";
  const title = el("div", "rigtitle");
  title.append(el("strong", "", r.name));
  if (st.test) title.append(el("span", "testtag", "Lancio di prova"));
  title.append(el("span", "muted", !r.online ? (r.error && r.error.includes("token") ? "token non valido" : "offline") : running ? (st.active || "").replace(/\.sh$/, "") : "fermo"));
  const more = el("button", "iconbtn more");
  more.setAttribute("aria-label", `Impostazioni di ${r.name}`);
  more.innerHTML = '<svg><use href="#i-dots"/></svg>';
  more.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); openRig(r); });
  head.append(dot, title, more);
  card.append(head);

  if (running && st.speed && st.speed.value) {
    const sp = el("div", "speed");
    sp.append(st.speed.value, el("small", "", st.speed.unit));
    card.append(sp);
  }

  const rigVer = r.online && st.version;
  if (rigVer && rigUpdating[r.id] && (newerVer(rigVer, "0") && !newerVer(rigLatest, rigVer) || Date.now() - rigUpdating[r.id] > 5 * 60000)) delete rigUpdating[r.id];
  if (rigVer && (rigUpdating[r.id] || st.updating)) {
    card.append(el("div", "deploy running", "Aggiornamento di minai in corso…"));
  } else if (rigVer && newerVer(rigLatest, rigVer)) {
    const u = el("button", "rigupd", `minai v${rigVer} → v${rigLatest} · aggiorna`);
    u.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); updateRigs([r]); });
    card.append(u);
  }
  if (r.online && !running && !(r.deploy && r.deploy.state === "running")) {
    const go = el("button", "rigstart", st.active ? "Fermo · avvia un lancio" : "Per iniziare: avvia un lancio");
    go.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); openRig(r); });
    card.append(go);
  }
  if (r.online && r.ts_expiry) {
    const w = el("button", "expirywarn", `Tailscale: scade il ${fmtDate(r.ts_expiry)} · come evitarlo`);
    w.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); openExpiry(); });
    card.append(w);
  }
  const sy = r.sync;
  if (r.online && sy && sy.state !== "ok") {
    card.append(el("div", "syncnote" + (sy.state === "error" ? " err" : ""),
      sy.state === "error" ? `Non allineato: ${sy.msg}` : sy.state === "running" ? `Allineamento: ${sy.msg || "Allineo"}` : "Da allineare"));
  }
  const dep = r.deploy;
  if (dep && (dep.state !== "ok" || Date.now() / 1000 - dep.time < 120)) {
    card.append(el("div", `deploy ${dep.state}`, dep.state === "running" ? `${dep.launch}: ${dep.step}…` : dep.state === "error" ? `${dep.launch}: ${dep.step}` : dep.step));
  }
  if (r.online) {
    const gl = el("div", "gpulist");
    for (const [i, name, t, p, u, , , fan, en] of r.gpus || []) {
      const g = el("div", "gpurow" + (en === "0" ? " off" : ""));
      if (en === "0") g.title = "GPU disattivata";
      const temp = Number(t);
      g.append(el("span", "gname", `#${i} ${name.replace(/^NVIDIA GeForce /, "")}`),
               el("span", "gv " + (temp >= 80 ? "hot" : temp >= 70 ? "warm" : ""), `${t}°C`),
               el("span", "gv", `${Math.round(p)} W`),
               el("span", "gv", `${fan}%`));
      gl.append(g);
    }
    card.append(gl);
    const foot = el("div", "rigfoot muted");
    const bits = [];
    if (sys.total_power != null) bits.push(`${sys.total_power} W totali`);
    if (sys.cpu_temp != null) bits.push(`CPU ${sys.cpu_temp}°C`);
    if (st.autofan && st.autofan.enabled) bits.push(`autofan ${st.autofan.target}°`);
    foot.textContent = bits.join(" · ");
    card.append(foot);
  } else {
    card.append(el("div", "rigfoot muted", ago(r.last_seen)));
  }
  return card;
}

const vt = v => (String(v || "").match(/\d+/g) || []).map(Number);
function newerVer(a, b) {
  const x = vt(a), y = vt(b);
  if (!x.length || !y.length) return false;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}
let rigLatest = null, outdated = [];
const rigUpdating = {};

/* ---------- aggiornamenti di minai (server e rig) ---------- */
let selfUpd = { from: null, since: 0 };
function showSelfUpdate(d) {
  const b = $("btnSelfUpdate");
  if (selfUpd.from && d.version && d.version !== selfUpd.from) { location.reload(); return; }
  if (selfUpd.from && Date.now() - selfUpd.since > 5 * 60000 && !d.updating) {
    selfUpd.from = null;
    msg("error", "L'aggiornamento di minai-server non è andato a buon fine: i dettagli sono in /var/log/minai-server-update.log");
  }
  const busy = !!selfUpd.from || d.updating;
  b.hidden = !d.update && !busy;
  b.disabled = busy;
  b.textContent = busy ? "Aggiornamento…" : `v${d.update} disponibile`;
  b.dataset.version = d.update || "";
}
async function selfUpdate() {
  const v = $("btnSelfUpdate").dataset.version;
  if (!await ask(`Aggiornare minai-server alla v${v}?\nI rig continuano a minare; la pagina si ricarica da sola tra un minuto circa.`, { ok: "Aggiorna" })) return;
  try {
    await api("POST", "selfupdate");
    selfUpd = { from: $("appVersion").textContent.replace("minai server v", ""), since: Date.now() };
    showSelfUpdate({ updating: true });
  } catch (e) { msg("error", e.message); }
}
async function updateRigs(list) {
  const names = list.map(r => r.name).join(", ");
  if (!await ask(`Aggiornare minai alla v${rigLatest} su: ${names}?\nIl mining non si ferma.`, { ok: "Aggiorna" })) return;
  for (const r of list) {
    try { await api("POST", `rigs/${r.id}/selfupdate`); rigUpdating[r.id] = Date.now(); }
    catch (e) { msg("error", e.message); }
  }
  refresh().catch(() => {});
}

const fmtDate = iso => new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
let expiring = [];
function openExpiry() {
  $("expiryList").textContent = expiring.join(", ") || "nessun dispositivo";
  $("expiryDialog").showModal();
}

async function refresh() {
  const d = await api("GET", "rigs");
  rigLatest = d.rig_latest;
  showSelfUpdate(d);
  outdated = d.rigs.filter(r => r.online && r.status && r.status.version && newerVer(rigLatest, r.status.version)
                                && !rigUpdating[r.id] && !r.status.updating);
  $("rigsUpdateBanner").hidden = outdated.length < 2;
  $("rigsUpdateBanner").textContent = `C'è minai v${rigLatest} per ${outdated.length} rig. Tocca qui per aggiornarli tutti.`;
  expiring = [...(d.server_expiry ? ["minai-server"] : []), ...d.rigs.filter(r => r.ts_expiry).map(r => r.name)];
  $("expiryBanner").hidden = !expiring.length;
  $("expiryBanner").textContent = expiring.length === 1
    ? `${expiring[0]} si scollegherà da Tailscale tra qualche mese. Tocca qui per evitarlo (una volta sola).`
    : `${expiring.length} dispositivi si scollegheranno da Tailscale tra qualche mese. Tocca qui per evitarlo (una volta sola).`;
  if ($("expiryDialog").open) $("expiryList").textContent = expiring.join(", ") || "fatto, tutto a posto";
  rigs = d.rigs.sort((a, b) => (b.online === true) - (a.online === true));  // online prima, poi per nome
  $("hostName").textContent = d.host;
  $("appVersion").textContent = `minai server v${d.version}`;
  document.title = `minai server – ${d.host}`;
  const box = $("rigs");
  box.replaceChildren(...rigs.map(rigCard));
  $("empty").hidden = rigs.length > 0;

  const online = rigs.filter(r => r.online);
  $("sumRigs").textContent = `${online.length}/${rigs.length}`;
  $("sumGpus").textContent = online.reduce((n, r) => n + (r.gpus || []).length, 0);
  const watts = online.reduce((n, r) => n + ((r.status && r.status.sys && r.status.sys.total_power) || 0), 0);
  $("sumPower").textContent = watts >= 1000 ? `${(watts / 1000).toFixed(2)} kW` : `${watts} W`;
  // velocità sommate per unità (coin diverse non si possono sommare tra loro)
  const byUnit = {};
  for (const r of online) {
    const sp = r.status && r.status.running && r.status.speed;
    if (sp && sp.value) byUnit[sp.unit] = (byUnit[sp.unit] || 0) + parseFloat(String(sp.value).replace(",", "."));
  }
  const sp = $("sumSpeeds");
  sp.replaceChildren(...Object.entries(byUnit).map(([u, v]) => {
    const e = el("span", "speed"); e.append(v.toFixed(2), el("small", "", u)); return e;
  }));
  sp.hidden = !Object.keys(byUnit).length;
}

/* ---------- aggiungi / modifica rig ---------- */
function openRig(r) {
  editing = r || null;
  $("rigTitle").textContent = r ? `Impostazioni di ${r.name}` : "Aggiungi rig";
  $("rigName").value = r ? r.name : "";
  $("rigAddress").value = r ? r.address : "";
  $("rigToken").value = "";
  $("rigToken").placeholder = r ? "lascia vuoto per non cambiarlo" : "incolla il token del rig";
  $("btnRigSave").textContent = r ? "Salva" : "Collega";
  $("btnRigDelete").hidden = !r;
  $("rigLaunchBox").hidden = !r;
  if (r) {
    $("rigLaunch").replaceChildren(...cat.launches.map(l => new Option(l.name, l.name)));
    const active = r.status && r.status.active && r.status.active.replace(/\.sh$/, "");
    if (active && cat.launches.some(l => l.name === active)) $("rigLaunch").value = active;
    $("btnRigStart").disabled = !cat.launches.length || !r.online;
    $("btnRigImport").disabled = !r.online;
  }
  msg("rigMsg", "");
  $("rigDialog").showModal();
  (r ? $("rigName") : $("rigName")).focus();
}

async function saveRig() {
  const body = { name: $("rigName").value.trim(), address: $("rigAddress").value.trim(), token: $("rigToken").value.trim() };
  $("btnRigSave").disabled = true;
  msg("rigMsg", editing ? "" : "Controllo il collegamento…");
  try {
    if (editing) await api("PUT", `rigs/${editing.id}`, body);
    else await api("POST", "rigs", body);
    $("rigDialog").close();
    setTimeout(() => refresh().catch(() => {}), 1200);
  } catch (e) { msg("rigMsg", e.message); }
  $("btnRigSave").disabled = false;
}

async function deleteRig() {
  if (!editing || !await ask(`Rimuovere ${editing.name} da minai server? Il rig continua a minare, ma non lo vedrai più qui.`, { ok: "Rimuovi", danger: true })) return;
  try { await api("DELETE", `rigs/${editing.id}`); $("rigDialog").close(); refresh(); } catch (e) { msg("rigMsg", e.message); }
}

async function rigStart() {
  if (!editing) return;
  try {
    await api("POST", "deploy", { launch: $("rigLaunch").value, rigs: [editing.id] });
    $("rigDialog").close();
    setTimeout(refreshAll, 800);
  } catch (e) { msg("rigMsg", e.message); }
}

async function rigImport() {
  if (!editing) return;
  msg("rigMsg", "Importo…");
  try {
    const d = await api("POST", `catalog/import/${editing.id}`);
    msg("rigMsg", "");
    $("rigDialog").close();
    await refreshCatalog();
    await info(`Importati ${d.miners} miner e ${d.launches} lanci da ${editing.name}. Nei lanci il nome del rig è stato sostituito con %WORKER_NAME%: dai un'occhiata per verificare.`);
  } catch (e) { msg("rigMsg", e.message); }
}

/* ---------- catalogo: miner ---------- */
function rowEl(main, sub, actions, badges = []) {
  const r = el("div", "item card");
  const info = el("div", "info");
  const t = el("div", "title");
  t.append(el("strong", "", main), ...badges);
  info.append(t);
  if (sub) info.append(el("div", "sub", sub));
  const a = el("div", "actions");
  a.append(...actions);
  r.append(info, a);
  return r;
}
function btn(label, fn, cls) { const b = el("button", cls || "", label); b.addEventListener("click", fn); return b; }
function badge(text, cls) { return el("span", `badge ${cls || ""}`.trim(), text); }

async function refreshCatalog() {
  cat = await api("GET", "catalog");
  $("countMiners").textContent = cat.miners.length || "";
  $("countLaunches").textContent = cat.launches.length || "";
  let pending = 0;
  $("catMiners").replaceChildren(...cat.miners.map(m => {
    const actions = [], badges = [];
    if (m.update) {
      pending++;
      badges.push(badge(m.update.current, "ver"), badge(`nuova ${m.update.latest}`, "upd"));
      if (m.update.url) actions.push(btn(`Aggiorna a ${m.update.latest}`, () => updateMiner(m), "primary"));
    }
    actions.push(btn("Modifica", () => openMiner(m)), btn("Elimina", () => deleteMiner(m), "danger"));
    return rowEl(m.name, m.url, actions, badges);
  }));
  $("noMiners").hidden = cat.miners.length > 0;
  document.querySelector('[data-tab="miner"]').classList.toggle("has-upd", pending > 0);
  const when = cat.checked ? new Date(cat.checked * 1000).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" }) : "";
  $("checkInfo").textContent = cat.checking ? "Controllo aggiornamenti in corso…"
    : pending ? `Aggiornamenti disponibili: ${pending} · ultimo controllo ${when}` : when ? `Tutto aggiornato · ultimo controllo ${when}` : "";
  $("btnCheck").disabled = cat.checking;
  if (cat.checking && !checkPoll) checkPoll = setInterval(() => refreshCatalog().catch(() => {}), 2000);
  if (!cat.checking && checkPoll) { clearInterval(checkPoll); checkPoll = null; }

  $("catLaunches").replaceChildren(...cat.launches.map(l => {
    const names = l.rigs.map(id => (rigs.find(r => r.id === id) || {}).name).filter(Boolean);
    const badges = names.length ? [badge(`in uso su ${names.join(", ")}`, "on")] : [];
    return rowEl(l.name, `miner: ${l.miner}`, [
      btn("Avvia su…", () => openDeploy(l), "primary"), btn("Modifica", () => openLaunch(l)), btn("Elimina", () => deleteLaunch(l), "danger"),
    ], badges);
  }));
  $("noLaunches").hidden = cat.launches.length > 0;
  const sel = $("launchMiner"), chosen = sel.value;
  sel.replaceChildren(...cat.miners.map(m => new Option(m.name, m.name)));
  if (chosen && cat.miners.some(m => m.name === chosen)) sel.value = chosen;  // conserva la scelta
}

function openMiner(m) {
  editingMiner = m || null;
  $("minerForm").hidden = false;
  $("minerName").value = m ? m.name : ""; $("minerName").disabled = false;
  $("minerUrl").value = m ? m.url : "";
  (m ? $("minerUrl") : $("minerName")).focus();
}
async function saveMiner() {
  const name = $("minerName").value.trim();
  try {
    if (editingMiner && name !== editingMiner.name) {
      if (!await ask(`Rinominare il miner ${editingMiner.name} in ${name}? Sui rig la cartella viene rinominata (dati compresi) e i lanci che lo usano vengono aggiornati.`, { ok: "Rinomina" })) return;
      await api("POST", `catalog/miners/${encodeURIComponent(editingMiner.name)}/rename`, { name });
    }
    // lo specchio installa o aggiorna il miner su tutti i rig, e riavvia dove sta girando
    await api("PUT", `catalog/miners/${encodeURIComponent(name)}`, { url: $("minerUrl").value.trim() });
    $("minerForm").hidden = true; msg("error", "");
    refreshAll();
  } catch (e) { msg("error", e.message); }
}
async function updateMiner(m) {
  editingMiner = m;
  $("minerName").value = m.name; $("minerUrl").value = m.update.url;
  await saveMiner();
}
async function deleteMiner(m) {
  if (!await ask(`Eliminare il miner ${m.name}? Viene tolto da tutti i rig, insieme alla sua cartella e ai dati che contiene (per esempio modelli scaricati).`, { ok: "Elimina", danger: true })) return;
  try { await api("DELETE", `catalog/miners/${encodeURIComponent(m.name)}`); refreshCatalog(); } catch (e) { msg("error", e.message); }
}

/* ---------- catalogo: lanci ---------- */
const MINERS_DIR = "/home/user/miners";  // uguale su tutti i rig
const LAUNCH_TEMPLATE = miner => `#!/bin/bash
# %WORKER_NAME% diventa il nome del rig
cd ${MINERS_DIR}/${miner || "MINER"}
exec ./${miner || "MINER"} \\
  -a ALGORITMO \\
  -o POOL_URL \\
  -u WALLET.%WORKER_NAME% -p x
`;
function openLaunch(l) {
  if (!cat.miners.length) { msg("error", "Aggiungi prima almeno un miner."); return; }
  editingLaunch = l || null;
  $("launchForm").hidden = false;
  $("launchTitle").textContent = l ? `Modifica ${l.name}` : "Nuovo lancio";
  $("launchName").value = l ? l.name : ""; $("launchName").disabled = !!l;
  $("launchMiner").value = l ? l.miner : cat.miners[0].name;
  $("launchContent").value = l ? l.content : LAUNCH_TEMPLATE($("launchMiner").value);
  $("launchRedeploy").parentElement.hidden = true;  // ora lo specchio aggiorna sempre i rig
  (l ? $("launchContent") : $("launchName")).focus();
}
// il miner indicato dalla riga "cd /home/user/miners/NOME" del comando
function minerFromContent(text) {
  const m = text.match(/\/home\/user\/miners\/([A-Za-z0-9._-]+)/);
  return m && cat.miners.some(x => x.name === m[1]) ? m[1] : null;
}
async function saveLaunch() {
  const name = $("launchName").value.trim().replace(/\.sh$/, "");
  const fromCd = minerFromContent($("launchContent").value), chosen = $("launchMiner").value;
  if (fromCd && fromCd !== chosen) {
    const useCd = await ask(`Il comando usa la cartella del miner ${fromCd}, ma nel campo Miner hai scelto ${chosen}: sui rig verrebbe installato ${chosen}. Vuoi usare ${fromCd}?`,
                            { ok: `Usa ${fromCd}`, cancel: `Tieni ${chosen}` });
    if (useCd) $("launchMiner").value = fromCd;
  }
  try {
    const d = await api("PUT", `catalog/launches/${encodeURIComponent(name)}`, {
      miner: $("launchMiner").value, content: $("launchContent").value,
    });
    $("launchForm").hidden = true; msg("error", "");
    refreshAll();
    if (d.redeployed) showTab("rig");
  } catch (e) { msg("error", e.message); }
}
async function deleteLaunch(l) {
  const users = l.rigs.map(id => (rigs.find(r => r.id === id) || {}).name).filter(Boolean);
  const q = users.length
    ? `Eliminare il lancio ${l.name}? È in uso su ${users.join(", ")}: verrà fermato su quei rig. Il lancio viene tolto da tutti i rig.`
    : `Eliminare il lancio ${l.name}? Viene tolto da tutti i rig.`;
  if (!await ask(q, { ok: "Elimina", danger: true })) return;
  try { await api("DELETE", `catalog/launches/${encodeURIComponent(l.name)}`); refreshCatalog(); } catch (e) { msg("error", e.message); }
}

function openDeploy(l) {
  deployLaunch = l;
  $("deployTitle").textContent = `Avvia ${l.name}`;
  msg("deployMsg", "");
  $("deployRigs").replaceChildren(...rigs.map(r => {
    const lab = el("label", "check");
    const cb = el("input"); cb.type = "checkbox"; cb.value = r.id; cb.disabled = !r.online;
    lab.append(cb, `${r.name}${r.online ? "" : " (offline)"}`);
    return lab;
  }));
  $("deployDialog").showModal();
}
async function goDeploy() {
  const ids = [...$("deployRigs").querySelectorAll("input:checked")].map(c => Number(c.value));
  try {
    await api("POST", "deploy", { launch: deployLaunch.name, rigs: ids });
    $("deployDialog").close();
    showTab("rig");
    setTimeout(refreshAll, 800);
  } catch (e) { msg("deployMsg", e.message); }
}

/* ---------- tab ---------- */
function showTab(name) {
  for (const t of document.querySelectorAll('[role="tab"]')) {
    const on = t.dataset.tab === name;
    t.setAttribute("aria-selected", String(on));
    $(`tab-${t.dataset.tab}`).hidden = !on;
  }
  try { localStorage.setItem("srv-tab", name); } catch {}
}
for (const t of document.querySelectorAll('[role="tab"]')) t.addEventListener("click", () => showTab(t.dataset.tab));
let startTab = "rig";
try { startTab = localStorage.getItem("srv-tab") || startTab; } catch {}
showTab($(`tab-${startTab}`) ? startTab : "rig");

async function refreshAll() {
  await refresh();
  await refreshCatalog();
}

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
  try { await loadSettings(); } catch (e) { msg("error", e.message); return; }
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

/* ---------- menu ---------- */
function setMenu(open) { $("menuPanel").hidden = !open; $("btnMenu").setAttribute("aria-expanded", String(open)); }
$("btnMenu").addEventListener("click", ev => { ev.stopPropagation(); setMenu($("menuPanel").hidden); });
$("menuPanel").addEventListener("click", ev => { if (ev.target.closest("button")) setMenu(false); });
document.addEventListener("click", ev => { if (!ev.target.closest(".menu")) setMenu(false); });
document.addEventListener("keydown", ev => { if (ev.key === "Escape") setMenu(false); });

$("btnAdd").addEventListener("click", () => openRig(null));
$("btnAddEmpty").addEventListener("click", () => openRig(null));
$("btnLogout").addEventListener("click", logout);
$("btnRigSave").addEventListener("click", saveRig);
$("btnRigDelete").addEventListener("click", deleteRig);
$("btnRigClose").addEventListener("click", () => $("rigDialog").close());
$("expiryBanner").addEventListener("click", openExpiry);
$("btnSelfUpdate").addEventListener("click", selfUpdate);
$("btnSelfCheck").addEventListener("click", async () => {
  // nessun messaggio: se c'è una nuova versione compare il badge arancione accanto al logo
  msg("error", "");
  try { await api("POST", "selfcheck"); await refresh(); } catch (e) { msg("error", e.message); }
});
$("rigsUpdateBanner").addEventListener("click", () => updateRigs(outdated));
$("btnExpiryClose").addEventListener("click", () => $("expiryDialog").close());
$("btnRigStart").addEventListener("click", rigStart);
$("btnRigImport").addEventListener("click", rigImport);
$("btnNewMiner").addEventListener("click", () => openMiner(null));
$("btnMinerSave").addEventListener("click", saveMiner);
$("btnMinerCancel").addEventListener("click", () => { $("minerForm").hidden = true; });
$("btnCheck").addEventListener("click", () => api("POST", "catalog/check").then(refreshCatalog).catch(e => msg("error", e.message)));
$("btnNewLaunch").addEventListener("click", () => openLaunch(null));
$("launchMiner").addEventListener("change", () => { if (!editingLaunch) $("launchContent").value = LAUNCH_TEMPLATE($("launchMiner").value); });
$("launchContent").addEventListener("input", () => {
  const m = minerFromContent($("launchContent").value);
  if (m) $("launchMiner").value = m;  // scrivendo "cd …/miners/NOME" il miner si sceglie da solo
});
$("btnLaunchSave").addEventListener("click", saveLaunch);
$("btnLaunchCancel").addEventListener("click", () => { $("launchForm").hidden = true; });
$("btnDeployGo").addEventListener("click", goDeploy);
$("btnDeployClose").addEventListener("click", () => $("deployDialog").close());

async function start() {
  try {
    const a = await (await fetch("api/auth", { credentials: "same-origin" })).json();
    if (a.setup) { showLogin(true); return; }
  } catch {}
  try { await refreshAll(); } catch (e) { if (e.message !== "Accesso richiesto") msg("error", e.message); return; }
  $("app").hidden = false;
  if (started) return;
  started = true;
  setInterval(() => refreshAll().catch(e => { if (e.message !== "Accesso richiesto") msg("error", e.message); }), 5000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && started) refreshAll().catch(() => {}); });
start();
