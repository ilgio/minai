"use strict";
/* minai: lingua dell'interfaccia (italiano / inglese).
   Le pagine sono scritte in italiano: questo modulo traduce in inglese tutto quello che compare
   (testi fissi, testi creati dal codice, messaggi del server, finestre di conferma). */

const LANG = (() => {
  try {
    const saved = localStorage.getItem("minai-lang");
    if (saved === "it" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "en").toLowerCase().startsWith("it") ? "it" : "en";
})();
const LOCALE = LANG === "it" ? "it-IT" : "en-GB";
document.documentElement.lang = LANG;

function setLang(lang) {
  try { localStorage.setItem("minai-lang", lang); } catch {}
  location.reload();
}

/* ---------- testi fissi e brevi: corrispondenza esatta ---------- */
const EN = {
  // generale
  "Caricamento…": "Loading…", "Entra": "Log in", "Password": "Password", "Ripeti la password": "Repeat the password",
  "Salva e entra": "Save and log in", "Esci": "Log out", "Impostazioni": "Settings", "Menu": "Menu", "Sezioni": "Sections",
  "Salva": "Save", "Annulla": "Cancel", "Conferma": "Confirm", "OK": "OK", "No": "No", "Scollega": "Disconnect",
  "Aggiorna i rig": "Update the rigs", "Togli": "Remove", "Chiudi": "Close", "Copia": "Copy", "Copiato": "Copied", "Salvato": "Saved",
  "Avvia": "Start", "Riavvia": "Restart", "Ferma": "Stop", "Modifica": "Edit", "Elimina": "Delete", "Rimuovi": "Remove",
  "Collega": "Connect", "Installa": "Install", "Nome": "Name", "Comando": "Command", "Origine": "Source",
  "Lancio": "Launch", "Lanci": "Launches", "Miner": "Miners", "Rig": "Rigs", "Generale": "Overview", "Terminale": "Terminal",
  "Log": "Log", "GPU": "GPUs", "Stato": "Status", "Indirizzo": "Address", "Rete": "Network",
  "Controlla aggiornamenti": "Check for updates", "Aggiornamento…": "Updating…", "Applico…": "Applying…", "Fatto.": "Done.",
  "Server non raggiungibile.": "Server unreachable.", "Password errata.": "Wrong password.", "Password errata": "Wrong password",
  "Le due password non coincidono.": "The two passwords don't match.", "Accesso richiesto": "Login required",
  "Usa almeno 8 caratteri": "Use at least 8 characters", "La password è già stata scelta": "The password has already been set",
  "Non trovato": "Not found", "JSON non valido": "Invalid JSON", "Valori non numerici": "Non-numeric values",
  "Tutti i rig": "All rigs", "Lingua": "Language",

  // stato e intestazione
  "In esecuzione": "Running", "Fermo": "Stopped", "nessun lancio attivo": "no active launch", "fermo": "stopped",
  "Temp CPU": "CPU temp", "Carico CPU": "CPU load", "Consumo": "Power", "Consumo totale": "Total power", "Consumo GPU": "GPU power",
  "Ferma miner": "Stop miner", "Autofan": "Autofan", "Autofan spento": "Autofan off", "in uso": "in use", "offline": "offline",

  // primo avvio
  "Primo avvio: dai un nome a questo rig e scegli la sua password (almeno 8 caratteri).":
    "First start: give this rig a name and choose its password (at least 8 characters).",
  "Primo avvio: scegli la password del pannello (almeno 8 caratteri).":
    "First start: choose the panel password (at least 8 characters).",
  "Nome del rig": "Rig name",
  "Nome del rig: lettere minuscole, numeri e trattini, senza spazi (per esempio backup3).":
    "Rig name: lowercase letters, numbers and dashes, no spaces (for example backup3).",

  // tab Generale e GPU
  "Per iniziare": "Getting started",
  ": questo rig non ha ancora un lancio. Su minai-server vai su": ": this rig has no launch yet. In minai-server go to",
  ", scegli": ", choose", "Avvia su…": "Start on…",
  "e spunta questo rig: il server installa il miner e lo fa partire da solo.":
    "and tick this rig: the server installs the miner and starts it for you.",
  "Vai ai lanci sul server": "Go to launches on the server",
  "Temp": "Temp", "Potenza": "Power", "Uso": "Usage", "Core": "Core", "Memoria": "Memory", "Ventola": "Fan",

  // miner
  "Miner installati": "Installed miners", "Installa miner": "Install miner", "Miner e lanci sono": "Miners and launches are",
  "gestiti da minai-server": "managed by minai-server",
  ": creali e modificali da lì, e il server li aggiorna su questo rig.": ": create and edit them there, and the server updates them on this rig.",
  ": creali e modificali da lì. Da qui puoi comunque avviarli e fermarli.": ": create and edit them there. You can still start and stop them from here.",
  "Apri il catalogo sul server": "Open the catalog on the server", "Apri i lanci sul server": "Open launches on the server",
  "Link del pacchetto (.tar.gz, .zip o binario)": "Package link (.tar.gz, .zip or binary)",
  "Nessun miner installato.": "No miners installed.",
  "Nessun miner ancora: vengono installati da soli quando avvii un lancio da minai-server (Lanci → Avvia su…).":
    "No miners yet: they are installed automatically when you start a launch from minai-server (Launches → Start on…).",
  "Vedi release": "View release", "Modifica link": "Edit link", "Controllo aggiornamenti in corso…": "Checking for updates…",
  "Nome miner non valido: lettere, numeri, . _ -": "Invalid miner name: letters, numbers, . _ -",
  "Il link deve iniziare con http:// o https://": "The link must start with http:// or https://",
  "Aggiungi miner": "Add miner", "Aggiorna": "Update",
  "Il miner viene installato da solo su ogni rig la prima volta che ci avvii un lancio che lo usa.":
    "The miner is installed automatically on each rig the first time you start a launch that uses it.",
  "Nessun miner. Aggiungine uno, oppure importa quelli di un rig dalle sue impostazioni (⋯).":
    "No miners. Add one, or import a rig's miners from its settings (⋯).",
  "Scegli un miner del catalogo": "Choose a miner from the catalog",

  // lanci
  "Nuovo lancio": "New launch", "Comando completo (pool, wallet, parametri)": "Full command (pool, wallet, parameters)",
  "Nessun lancio. Crea il primo con “Nuovo lancio”.": "No launches. Create the first one with “New launch”.",
  "Nessun lancio ancora: su minai-server vai su Lanci → Avvia su… e scegli questo rig.":
    "No launches yet: in minai-server go to Launches → Start on… and choose this rig.",
  "Nessun lancio. Creane uno, oppure importa quelli di un rig dalle sue impostazioni (⋯).":
    "No launches. Create one, or import a rig's launches from its settings (⋯).",
  "Salva e riavvia": "Save and restart", "Installa prima almeno un miner.": "Install at least one miner first.",
  "Aggiungi prima almeno un miner.": "Add at least one miner first.",
  "Nome lancio non valido: lettere, numeri, . _ -": "Invalid launch name: letters, numbers, . _ -",
  "Ferma il miner prima di eliminare il lancio in uso.": "Stop the miner before deleting the launch in use.",
  "Lancio non trovato": "Launch not found",
  "Miner e lanci sono gestiti da minai-server: modificali da lì": "Miners and launches are managed by minai-server: edit them there",
  "Su ogni rig": "On every rig",
  "diventa il nome del rig. I percorsi sono uguali per tutti: miner in": "becomes the rig name. Paths are the same everywhere: miners in",
  ", modelli in": ", models in",
  "Aggiorna e riavvia i rig che lo stanno usando": "Update and restart the rigs using it",
  "Avvia lancio": "Start launch",
  "Scegli i rig: se manca il miner viene installato, poi il lancio parte al posto di quello attuale.":
    "Choose the rigs: if the miner is missing it gets installed, then the launch replaces the current one.",
  "Scegli almeno un rig": "Choose at least one rig",

  // terminale
  "La sessione resta aperta sul rig: se ti disconnetti o cambi app, quando torni riprendi da dove eri.":
    "The session stays open on the rig: if you disconnect or switch apps, you pick up where you left off.",

  // impostazioni e Tailscale
  "Ultimo passo: collega il rig a Tailscale, poi aggiungilo in minai-server con indirizzo e token qui sotto.":
    "Last step: connect the rig to Tailscale, then add it in minai-server with the address and token below.",
  "Tailscale": "Tailscale", "Collega con il tuo account Tailscale": "Connect with your Tailscale account",
  "Accedi a Tailscale nella scheda che si è aperta (se non si è aperta, usa questo link:":
    "Log in to Tailscale in the tab that just opened (if it didn't open, use this link:",
  "accedi a Tailscale": "log in to Tailscale",
  "). Quando hai fatto, quella scheda si chiude da sola e torni qui.": "). When you're done, that tab closes by itself and you come back here.",
  "Oppure incolla una chiave di autenticazione": "Or paste an auth key", "Collega con la chiave": "Connect with the key",
  "Scollega da Tailscale": "Disconnect from Tailscale", "Collegato": "Connected", "Da collegare": "Not connected",
  "Non installato": "Not installed", "Spento": "Off", "Sconosciuto": "Unknown",
  "In rete locale il rig risponde a": "On the local network the rig answers at", "nome": "name",
  "Collegamento a minai-server": "Link to minai-server",
  "In minai-server: menu > Aggiungi rig, e incolla questi due valori.": "In minai-server: menu > Add rig, and paste these two values.",
  "Indirizzo Tailscale": "Tailscale address", "Token del rig": "Rig token", "collega prima Tailscale": "connect Tailscale first",
  "Incolla prima la chiave.": "Paste the key first.",
  "Scollegare da Tailscale? Se stai usando il pannello attraverso Tailscale, perderai la connessione.":
    "Disconnect from Tailscale? If you're using the panel through Tailscale, you'll lose the connection.",
  "Tailscale non ha risposto": "Tailscale didn't respond", "Tailscale ha rifiutato il collegamento": "Tailscale refused the connection",
  "Tailscale non è installato: rilancia l'installer": "Tailscale is not installed: run the installer again",
  "Nome non valido: lettere minuscole, numeri e trattini, senza spazi": "Invalid name: lowercase letters, numbers and dashes, no spaces",
  "Impossibile cambiare il nome su questo sistema": "Can't change the name on this system",

  // autofan
  "Regola le ventole in automatico": "Control fans automatically", "Temperatura obiettivo, °C": "Target temperature, °C",
  "Ventola minima, %": "Minimum fan, %", "Ventola massima, %": "Maximum fan, %", "Temperatura critica, °C": "Critical temperature, °C",
  "Se si supera la critica": "When critical is exceeded", "Ferma il miner (riparte da solo)": "Stop the miner (restarts by itself)",
  "Nessuna azione": "No action",
  "La temperatura critica e la sua azione valgono anche con l'autofan spento. Con l'autofan acceso, la ventola impostata nell'overclock viene ignorata.":
    "The critical temperature and its action apply even with autofan off. With autofan on, the fan set in overclock is ignored.",
  "La temperatura obiettivo deve essere sotto quella critica": "The target temperature must be below the critical one",
  "La ventola minima non può superare la massima": "The minimum fan can't exceed the maximum",

  // overclock
  "Overclock": "Overclock", "Ritardo prima di applicare, s": "Delay before applying, s", "Ventola, % (0 = auto)": "Fan, % (0 = auto)",
  "Salva e applica": "Save and apply", "Azzera": "Reset", "GPU non valida": "Invalid GPU",
  "Nessuna configurazione di overclock.": "No overclock configuration.",
  "Terminale non disponibile: controlla il servizio miner-terminal": "Terminal not available: check the miner-terminal service", "  ventole: gestite dall'autofan": "  fans: managed by autofan",

  // alimentazione e aggiornamenti
  "Riavvio in corso: il pannello torna disponibile tra un paio di minuti.": "Rebooting: the panel will be back in a couple of minutes.",
  "Spegnimento in corso. Per riaccenderlo serve il pulsante di accensione o il Wake-on-LAN.":
    "Shutting down. To turn it back on you need the power button or Wake-on-LAN.",
  "Azione non valida": "Invalid action",
  "L'aggiornamento non è andato a buon fine: i dettagli sono in /opt/miners/update.log":
    "The update failed: details are in /opt/miners/update.log",
  "L'aggiornamento di minai-server non è andato a buon fine: i dettagli sono in /var/log/minai-server-update.log":
    "The minai-server update failed: details are in /var/log/minai-server-update.log",
  "Aggiornamento di minai in corso: il pannello si ricarica da solo.": "minai is updating: the panel will reload by itself.",
  "Controllo se c'è una nuova versione di minai…": "Checking for a new version of minai…",
  "Nessuna nuova versione da installare": "No new version to install",
  "Aggiornamento di minai in corso…": "minai is updating…",

  // server: rig
  "minai server": "minai server", "Rig online": "Rigs online", "Aggiungi rig": "Add rig", "Nessun rig collegato.": "No rigs connected.",
  "Aggiungi il primo rig": "Add the first rig", "mai visto": "never seen", "token non valido": "invalid token",
  "Per iniziare: avvia un lancio": "Getting started: start a launch", "Fermo · avvia un lancio": "Stopped · start a launch",
  "Lancio da avviare su questo rig": "Launch to start on this rig", "Importa miner e lanci da questo rig": "Import miners and launches from this rig",
  "Sul rig, con minai e Tailscale installati, questi due comandi ti danno indirizzo e token:":
    "On the rig, with minai and Tailscale installed, these two commands give you the address and token:",
  "lascia vuoto per non cambiarlo": "leave empty to keep it", "incolla il token del rig": "paste the rig token",
  "vuoto: usa il nome del rig": "empty: use the rig's name", "Controllo il collegamento…": "Checking the connection…",
  "Il rig risponde, ma il token non è corretto": "The rig answers, but the token is wrong",
  "Indirizzo non valido": "Invalid address", "Rig non trovato": "Rig not found", "Token del rig non valido": "Invalid rig token",
  "Indirizzo non valido: usa l'IP Tailscale (100.x.x.x) o il nome del rig": "Invalid address: use the Tailscale IP (100.x.x.x) or the rig name",
  "Token mancante: lo trovi sul rig con  sudo python3 /opt/miners/panel/server.py --token":
    "Missing token: you'll find it on the rig with  sudo python3 /opt/miners/panel/server.py --token",
  "Vuoi installare la nuova versione anche sui rig che la stanno usando? Il miner verrà riavviato.":
    "Install the new version on the rigs using it too? The miner will be restarted.",
  "Preparo": "Preparing", "Scrivo il lancio": "Writing the launch", "Avvio": "Starting",
  "token del rig non valido": "invalid rig token", "installazione troppo lunga, controlla il rig": "installation taking too long, check the rig",
  "rig o lancio non trovato": "rig or launch not found", "nessun dispositivo": "no devices", "fatto, tutto a posto": "done, all good",

  // server: scadenza Tailscale
  "Evita che i dispositivi si scolleghino": "Keep devices from disconnecting",
  "Tailscale chiede di rifare l'accesso ogni sei mesi. Per server e rig conviene disattivarlo: è una cosa da fare":
    "Tailscale asks you to log in again every six months. For the server and rigs it's best to turn this off: you do it",
  "una volta sola": "only once", "per ogni dispositivo.": "for each device.", "Da sistemare:": "To fix:",
  "Apri la pagina dei dispositivi qui sotto, ed entra con l'account Tailscale di minai.":
    "Open the devices page below, and log in with minai's Tailscale account.",
  "Accanto al dispositivo, clicca i tre puntini": "Next to the device, click the three dots", "Scegli": "Choose",
  "(2). Ripeti per ogni dispositivo dell'elenco.": "(2). Repeat for each device in the list.",
  "Quando hai fatto, questo avviso sparisce da solo entro pochi secondi.": "When you're done, this notice disappears by itself within a few seconds.",
  "Apri la pagina dei dispositivi": "Open the devices page",
  "Pagina Machines di Tailscale: menu dei tre puntini aperto con la voce Disable key expiry evidenziata":
    "Tailscale Machines page: three-dot menu open with Disable key expiry highlighted",
  // avanzamento dell'avvio di un lancio dal server
  "Preparo": "Preparing", "Scrivo il lancio": "Writing the launch", "Avvio": "Starting", "Importo…": "Importing…",
  "token del rig non valido": "rig token not valid", "rig o lancio non trovato": "rig or launch not found",
  "installazione troppo lunga, controlla il rig": "installation is taking too long, check the rig",
};

/* ---------- testi con parti variabili: espressioni regolari ---------- */
const EN_RX = [
  [/^Autofan attivo, obiettivo (.+)°C$/, "Autofan on, target $1°C"],
  [/^Ultimo intervento: (.+)$/, (m, e) => `Last action: ${trOne(e)}`],
  [/^GPU (\S+) W \+ CPU (\S+) W \(senza il resto del PC\)$/, "GPU $1 W + CPU $2 W (excluding the rest of the PC)"],
  [/^Aggiorna a (.+)$/, "Update to $1"],
  [/^nuova (.+)$/, "new $1"],
  [/^C'è un aggiornamento disponibile · ultimo controllo (.+)$/, "An update is available · last check $1"],
  [/^Ci sono (\d+) aggiornamenti disponibili · ultimo controllo (.+)$/, "$1 updates are available · last check $2"],
  [/^Tutti i miner sono aggiornati · ultimo controllo (.+)$/, "All miners are up to date · last check $1"],
  [/^Aggiornamenti disponibili: (\d+) · ultimo controllo (.+)$/, "Updates available: $1 · last check $2"],
  [/^Tutto aggiornato · ultimo controllo (.+)$/, "Everything up to date · last check $1"],
  [/^Scarico e installo (.+)…$/, "Downloading and installing $1…"],
  [/^(.+) installato in (\S+)(\. È in uso: riavvia il lancio per usare la nuova versione\.)?$/,
    (m, a, b, c) => `${a} installed in ${b}${c ? ". It's in use: restart the launch to use the new version." : ""}`],
  [/^Installazione di (.+) non riuscita: ([\s\S]*)$/, "Installation of $1 failed: $2"],
  [/^Installazione di (.+) già in corso$/, "Installation of $1 already in progress"],
  [/^Aggiornare (.+) alla versione (.+)\? Se è in uso, dopo l'aggiornamento riavvia il lancio\.$/,
    "Update $1 to version $2? If it's in use, restart the launch after the update."],
  [/^Eliminare il miner (.+)\? I lanci che lo usano non partiranno più\.$/, "Delete the miner $1? Launches that use it won't start anymore."],
  [/^Eliminare il lancio (.+) dal catalogo\? I rig che lo usano continuano a minare\.$/, "Delete the launch $1 from the catalog? Rigs using it keep mining."],
  [/^Eliminare il lancio (.+)\?$/, "Delete the launch $1?"],
  [/^Modifica (.+)$/, "Edit $1"],
  [/^Overclock GPU (.+)$/, "Overclock GPU $1"],
  [/^Vuoi davvero riavviare il rig\? Il miner si fermerà\.$/, "Do you really want to reboot the rig? The miner will stop."],
  [/^Vuoi davvero spegnere il rig\? Il miner si fermerà\.$/, "Do you really want to shut down the rig? The miner will stop."],
  [/^v(.+) disponibile$/, "v$1 available"],
  [/^Aggiornare minai alla v(.+)\?\nIl miner continua a lavorare; il pannello si ricarica da solo tra un minuto circa\.$/,
    "Update minai to v$1?\nThe miner keeps working; the panel reloads by itself in about a minute."],
  [/^Aggiornare minai-server alla v(.+)\?\nI rig continuano a minare; la pagina si ricarica da sola tra un minuto circa\.$/,
    "Update minai-server to v$1?\nRigs keep mining; the page reloads by itself in about a minute."],
  [/^Aggiornare minai alla v(.+) su: (.+)\?\nIl mining non si ferma\.$/, "Update minai to v$1 on: $2?\nMining doesn't stop."],
  [/^È disponibile minai v(.+): tocca il pulsante arancione accanto al logo\.$/, "minai v$1 is available: tap the orange button next to the logo."],
  [/^È disponibile minai-server v(.+): tocca il pulsante arancione accanto al logo\.$/, "minai-server v$1 is available: tap the orange button next to the logo."],
  [/^minai è aggiornato \(v(.+)\)\.$/, "minai is up to date (v$1)."],
  [/^minai-server è aggiornato \(v(.+)\)\.$/, "minai-server is up to date (v$1)."],
  [/^visto (\d+) s fa$/, "seen $1 s ago"],
  [/^visto (\d+) min fa$/, "seen $1 min ago"],
  [/^visto (.+)$/, "seen $1"],
  [/^Impostazioni di (.+)$/, "Settings of $1"],
  [/^minai v(.+) → v(.+) · aggiorna$/, "minai v$1 → v$2 · update"],
  [/^Tailscale: scade il (.+) · come evitarlo$/, "Tailscale: expires on $1 · how to avoid it"],
  [/^(\d+) W totali$/, "$1 W total"],
  [/^CPU (\d+)°C$/, "CPU $1°C"],
  [/^autofan (\d+)°$/, "autofan $1°"],
  [/^C'è minai v(.+) per (\d+) rig\. Tocca qui per aggiornarli tutti\.$/, "minai v$1 is available for $2 rigs. Tap here to update them all."],
  [/^(.+) si scollegherà da Tailscale tra qualche mese\. Tocca qui per evitarlo \(una volta sola\)\.$/,
    "$1 will disconnect from Tailscale in a few months. Tap here to prevent it (one time only)."],
  [/^(\d+) dispositivi si scollegheranno da Tailscale tra qualche mese\. Tocca qui per evitarlo \(una volta sola\)\.$/,
    "$1 devices will disconnect from Tailscale in a few months. Tap here to prevent it (one time only)."],
  [/^Rimuovere (.+) da minai server\? Il rig continua a minare, ma non lo vedrai più qui\.$/,
    "Remove $1 from minai server? The rig keeps mining, but you won't see it here anymore."],
  [/^Importati (\d+) miner e (\d+) lanci da (.+)\. Nei lanci il nome del rig è stato sostituito con %WORKER_NAME%: dai un'occhiata per verificare\.$/,
    "Imported $1 miners and $2 launches from $3. In the launches the rig name was replaced with %WORKER_NAME%: take a look to check."],
  [/^in uso su (.+)$/, "in use on $1"],
  [/^miner: (.+)$/, "miner: $1"],
  [/^Togliere (.+) dal catalogo\? Sui rig resta installato\.$/, "Remove $1 from the catalog? It stays installed on the rigs."],
  [/^Avvia (.+)$/, "Start $1"],
  [/^(.+) \(offline\)$/, "$1 (offline)"],
  [/^Installo (.+)$/, "Installing $1"],
  [/^(.+) avviato$/, "$1 started"],
  [/^Il miner è usato dai lanci: (.+)$/, "The miner is used by launches: $1"],
  [/^Nome (miner|lancio) non valido: lettere, numeri, \. _ -$/, (m, w) => `Invalid ${w === "miner" ? "miner" : "launch"} name: letters, numbers, . _ -`],
  [/^Non riesco a leggere il rig: (.+)$/, "Can't read the rig: $1"],
  [/^Non riesco a raggiungere (.+): il rig è acceso, con minai e Tailscale attivi\?$/, "Can't reach $1: is the rig on, with minai and Tailscale running?"],
  [/^non raggiungibile: (.+)$/, "unreachable: $1"],
  [/^Valore non numerico per (.+)$/, "Non-numeric value for $1"],
  [/^Cambio del nome non riuscito: (.+)$/, "Renaming failed: $1"],
  [/^Comando non trovato: (.+)$/, "Command not found: $1"],
  [/^Tempo scaduto: (.+)$/, "Timed out: $1"],
  [/^systemctl (\S+) non riuscito: (.+)$/, "systemctl $1 failed: $2"],
  [/^il miner (.+) non è nel catalogo$/, "the miner $1 is not in the catalog"],
  [/^installazione di (.+) non riuscita: ([\s\S]*)$/, "installation of $1 failed: $2"],
  [/^(.+): GPU a (\d+)°C, miner fermato$/, "$1: GPU at $2°C, miner stopped"],
  [/^(.+): GPU a (\d+)°C, (reboot|shutdown)$/, "$1: GPU at $2°C, $3"],
  [/^(.+): GPU scesa a (\d+)°C, miner ripartito$/, "$1: GPU down to $2°C, miner restarted"],
  [/^GPU (\d+): (\d+)°C, ventola (.+)%$/, "GPU $1: $2°C, fan $3%"],
  [/^Attendo (\d+) s prima di applicare$/, "Waiting $1 s before applying"],
  [/^Impossibile applicare l'overclock: (.+)$/, "Can't apply the overclock: $1"],
  [/^  (.+): ok$/, (m, l) => `  ${trLabel(l)}: ok`],
  [/^  (.+): ERRORE (.+)$/, (m, l, e) => `  ${trLabel(l)}: ERROR ${e}`],
  [/^Errore (\d+)$/, "Error $1"],
  // "lancio: passo…" e "lancio: errore" sulla scheda del rig
  [/^([^:]+): (.+)…$/, (m, a, b) => `${a}: ${trOne(b)}…`],
  [/^([^:]+): (.+)$/, (m, a, b) => `${a}: ${trOne(b)}`],
];

// voci dell'output dell'overclock
function trLabel(l) {
  return l.replace(/^lock (core|mem) disattivato$/, "lock $1 off")
          .replace(/^ventola (\d+) al (\d+)%$/, "fan $1 at $2%")
          .replace(/^ventola (\d+) automatica$/, "fan $1 automatic");
}

function trOne(s) {
  if (LANG === "it" || !s) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  const core = s.trim();
  if (!core) return s;
  if (Object.prototype.hasOwnProperty.call(EN, core)) return lead + EN[core] + trail;
  if (Object.prototype.hasOwnProperty.call(EN, s)) return EN[s];
  for (const [rx, rep] of EN_RX) {
    if (rx.test(s)) return s.replace(rx, rep);
    if (rx.test(core)) return lead + core.replace(rx, rep) + trail;
  }
  // testi composti da più parti, come "279 W totali · CPU 64°C · autofan 70°"
  if (core.includes(" · ")) return lead + core.split(" · ").map(trOne).join(" · ") + trail;
  return s;
}

// traduce un testo; quelli su più righe riga per riga
function tr(s) {
  if (LANG === "it" || typeof s !== "string") return s;
  if (s.includes("\n")) {
    const whole = trOne(s);
    if (whole !== s) return whole;
    return s.split("\n").map(trOne).join("\n");
  }
  return trOne(s);
}

/* ---------- traduzione automatica della pagina ---------- */
const NO_I18N = "pre#log, textarea, code, .gpu-name, .rigtitle strong, #hostName, .wordmark, .item .sub, td.src, [data-noi18n]";

function trNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (!p || p.closest(NO_I18N) || p.closest("script,style")) return;
    const t = tr(node.nodeValue);
    if (t !== node.nodeValue) node.nodeValue = t;
  } else if (node.nodeType === 1) {
    if (node.matches && node.matches(NO_I18N)) return;
    for (const a of ["placeholder", "title", "aria-label"]) {
      const v = node.getAttribute && node.getAttribute(a);
      if (v) { const t = tr(v); if (t !== v) node.setAttribute(a, t); }
    }
    for (const c of node.childNodes) trNode(c);
  }
}

if (LANG !== "it") {
  const origConfirm = window.confirm.bind(window), origAlert = window.alert.bind(window);
  window.confirm = m => origConfirm(tr(String(m)));
  window.alert = m => origAlert(tr(String(m)));
  const start = () => {
    trNode(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === "characterData") trNode(m.target);
        else if (m.type === "attributes") trNode(m.target);
        else for (const n of m.addedNodes) trNode(n);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true,
                                attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
}

/* ---------- scelta della lingua ---------- */
function langPicker(container) {
  const box = document.createElement("div");
  box.className = "langpick";
  for (const [code, label] of [["it", "Italiano"], ["en", "English"]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("data-noi18n", "");
    b.className = code === LANG ? "on" : "";
    b.addEventListener("click", () => { if (code !== LANG) setLang(code); });
    box.append(b);
  }
  container.append(box);
}
document.addEventListener("DOMContentLoaded", () => {
  for (const c of document.querySelectorAll("[data-langpick]")) langPicker(c);
});

/* ---------- finestre di conferma e di avviso dentro la pagina (al posto di quelle del browser) ---------- */
function ask(message, { ok = "Conferma", cancel = "Annulla", danger = false } = {}) {
  return new Promise(resolve => {
    const d = document.createElement("dialog");
    d.className = "askdlg";
    const p = document.createElement("p");
    p.textContent = message;
    const actions = document.createElement("div");
    actions.className = "actions";
    const bOk = document.createElement("button");
    bOk.textContent = ok;
    bOk.className = danger ? "dangerfill" : "primary";
    actions.append(bOk);
    let bNo = null;
    if (cancel) {
      bNo = document.createElement("button");
      bNo.textContent = cancel;
      actions.append(bNo);
    }
    d.append(p, actions);
    document.body.append(d);
    const done = v => { d.close(); d.remove(); resolve(v); };
    bOk.addEventListener("click", () => done(true));
    if (bNo) bNo.addEventListener("click", () => done(false));
    d.addEventListener("cancel", ev => { ev.preventDefault(); done(false); });  // tasto Esc
    d.showModal();
    bOk.focus();
  });
}
const info = message => ask(message, { ok: "OK", cancel: null });
