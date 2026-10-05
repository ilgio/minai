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
  "Salva": "Save", "Annulla": "Cancel", "Carico il rig…": "Loading the rig…", "Carico…": "Loading…", "Altri rig": "Other rigs",
  "Gestiti da minai-server.": "Managed by minai-server.", "Apri sul server ›": "Open on the server ›",
  "Gestiti da minai-server: da qui puoi avviarli e fermarli.": "Managed by minai-server: from here you can start and stop them.", "Prova": "Try it", "Salva sul server": "Save on the server",
  "Salva come nuovo lancio": "Save as a new launch", "Scarta": "Discard", "Continua la prova": "Keep testing",
  "Riprendi la prova": "Resume the test", "Lancio di prova": "Test launch",
  "Vuoi tenere il lancio di prova?": "Do you want to keep the test launch?",
  "Nome del nuovo lancio": "Name of the new launch",
  "Prova avviata solo su questo rig: guarda il log qui sotto.": "Test started on this rig only: watch the log below.",
  "Lancio di prova in corso": "Test launch running",
  ": questo rig sta usando una versione temporanea, non quella del catalogo. Se non la confermi, torna da solo al lancio del catalogo dopo 10 minuti.":
    ": this rig is running a temporary version, not the catalog one. If you don't confirm it, it goes back to the catalog launch by itself after 10 minutes.",
  "Salvato sul server: il lancio viene aggiornato su tutti i rig che lo usano.": "Saved on the server: the launch is updated on all rigs that use it.",
  "Prova scartata: il rig torna al lancio del catalogo.": "Test discarded: the rig goes back to the catalog launch.",
  "Il lancio di prova è vuoto": "The test launch is empty", "Nessun lancio attivo da provare": "No active launch to test",
  "I miner del catalogo vengono installati e aggiornati da soli su tutti i rig.": "Catalog miners are installed and updated automatically on all rigs.",
  "Allineo": "Syncing", "Allineo il rig": "Syncing the rig", "Allineato": "In sync", "Da allineare": "Out of sync", "Modifica lancio": "Edit launch", "Salva per tutti i rig": "Save for all rigs",
  "Salva solo per questo rig": "Save for this rig only", "Salva per tutti": "Save for all", "Salvo…": "Saving…",
  "In errore, riprovo…": "Failing, retrying…",
  "Salvato per tutti i rig che lo usano: il miner riparte, guarda il log qui sotto.": "Saved for all rigs using it: the miner restarts, watch the log below.",
  "Salvato: il miner riparte, guarda il log qui sotto.": "Saved: the miner restarts, watch the log below.",
  "Questo lancio non è nel catalogo di minai-server.": "This launch is not in the minai-server catalog.",
  "Il link porta a una pagina web, non al file del miner: apri la release e copia il link del file (.tar.gz o .zip)":
    "The link points to a web page, not to the miner file: open the release and copy the file link (.tar.gz or .zip)",
  "Questo è il link di una pagina: apri la release e copia il link del file (.tar.gz o .zip)":
    "This is a page link: open the release and copy the file link (.tar.gz or .zip)", "Attiva": "Enabled", "Disattivata": "Disabled", "Riattiva": "Enable", "Disattiva": "Disable",
  "GPU disattivata": "GPU disabled", "GPU non trovata": "GPU not found",
  "Almeno una GPU deve restare attiva: per fermare il miner usa Ferma.": "At least one GPU must stay enabled: to stop the miner use Stop.",
  "%GPU_ENABLED% diventa l'elenco delle GPU attive del rig, per esempio 0,1: usalo nei miner che vogliono l'elenco delle GPU. Le GPU si attivano e disattivano dal pannello di ogni rig.":
    "%GPU_ENABLED% becomes the list of the rig's enabled GPUs, for example 0,1: use it with miners that need the GPU list. GPUs are enabled and disabled from each rig's panel.", "♥ Dona": "♥ Donate", "Sostieni minai": "Support minai",
  "minai è gratuito e open source. Se ti è utile, puoi fare una donazione in crypto. Grazie!":
    "minai is free and open source. If you find it useful, you can make a crypto donation. Thank you!",
  "Rete Bitcoin": "Bitcoin network", "Rete Ethereum": "Ethereum network", "Rete Solana": "Solana network",
  "Ethereum (ERC-20) o BNB Smart Chain (BEP-20)": "Ethereum (ERC-20) or BNB Smart Chain (BEP-20)",
  "Invia solo sulla rete indicata: i fondi inviati su una rete diversa possono andare persi.":
    "Send only on the network shown: funds sent on a different network may be lost.", "Conferma": "Confirm", "OK": "OK", "No": "No", "Scollega": "Disconnect",
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
  "Nome del rig: lettere minuscole, numeri e trattini, senza spazi (per esempio rig-01).":
    "Rig name: lowercase letters, numbers and dashes, no spaces (for example rig-01).",

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
  "Facoltativo:": "Optional:",
  "collega Tailscale per gestire il rig da remoto e aggiungerlo a minai-server con indirizzo e token qui sotto. Puoi farlo anche più tardi, da Impostazioni.":
    "connect Tailscale to manage the rig remotely and add it to minai-server with the address and token below. You can also do it later, from Settings.",
  "Salta per ora": "Skip for now",
  "Dopo potrai collegare il rig a Tailscale, per gestirlo da remoto e da minai-server. È facoltativo: il rig funziona anche da solo, in rete locale.":
    "Afterwards you can connect the rig to Tailscale, to manage it remotely and from minai-server. It's optional: the rig also works on its own, on your local network.",
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
  [/^Lancio «(.+)», non più nel catalogo: con Prova gira solo su questo rig, e salvandolo ti chiederò un nome\.$/,
   "Launch «$1», no longer in the catalog: Try it runs it on this rig only, and saving it will ask for a name."],
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
  [/^Lancio di prova basato su «(.+)»: gira solo su questo rig\.$/, "Test launch based on «$1»: it runs on this rig only."],
  [/^Lancio «(.+)» del catalogo: modificalo e premi Prova\. La nuova versione gira solo su questo rig finché non decidi\.$/,
   "Catalog launch «$1»: edit it and press Try it. The new version runs on this rig only until you decide."],
  [/^Installo (.+)$/, "Installing $1"], [/^Scrivo (.+)$/, "Writing $1"], [/^Tolgo (.+)$/, "Removing $1"],
  [/^Allineamento: (.+)$/, (m, x) => `Syncing: ${trOne(x)}`], [/^Non allineato: (.+)$/, (m, x) => `Out of sync: ${trOne(x)}`],
  [/^Rinominare il miner (.+) in (.+)\? Sui rig la cartella viene rinominata \(dati compresi\) e i lanci che lo usano vengono aggiornati\.$/,
   "Rename miner $1 to $2? On the rigs the folder is renamed (data included) and the launches using it are updated."],
  [/^Eliminare il miner (.+)\? Viene tolto da tutti i rig, insieme alla sua cartella e ai dati che contiene \(per esempio modelli scaricati\)\.$/,
   "Delete miner $1? It is removed from all rigs, together with its folder and the data in it (for example downloaded models)."],
  [/^Eliminare il lancio (.+)\? È in uso su (.+): verrà fermato su quei rig\. Il lancio viene tolto da tutti i rig\.$/,
   "Delete launch $1? It is in use on $2: it will be stopped on those rigs. The launch is removed from all rigs."],
  [/^Eliminare il lancio (.+)\? Viene tolto da tutti i rig\.$/, "Delete launch $1? It is removed from all rigs."],
  [/^Esiste già un miner (.+)$/, "A miner named $1 already exists"],
  [/^Il comando usa la cartella del miner (.+), ma nel campo Miner hai scelto (.+): sui rig verrebbe installato (.+)\. Vuoi usare (.+)\?$/,
   "The command uses the folder of miner $1, but the Miner field says $2: rigs would install $3. Use $4?"],
  [/^Usa (.+)$/, "Use $1"], [/^Tieni (.+)$/, "Keep $1"],
  [/^Il miner è indicato nel campo Miner dei lanci del catalogo: (.+)\. Elimina quei lanci o cambia il loro miner, poi riprova\.$/,
   "This miner is set in the Miner field of these catalog launches: $1. Delete those launches or change their miner, then try again."],
  [/^Lancio «(.+)», copia dedicata a questo rig\.$/, "Launch «$1», a copy dedicated to this rig."],
  [/^Lancio «(.+)» del catalogo, usato su (\d+) rig\.$/, "Launch «$1» from the catalog, used on $2 rig(s)."],
  [/^Lancio «(.+)» di questo rig\.$/, "Launch «$1» of this rig."],
  [/^Salvare il lancio «(.+)» per tutti i rig che lo usano\? Ripartiranno con la nuova versione\.$/, "Save launch «$1» for all rigs using it? They will restart with the new version."],
  [/^Riattivare la GPU (\d+)\? Il miner verrà riavviato\.$/, "Enable GPU $1 again? The miner will restart."],
  [/^Disattivare la GPU (\d+)\? Il miner verrà riavviato senza questa scheda\.$/, "Disable GPU $1? The miner will restart without this card."],
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

/* ---------- crediti e donazioni, in fondo alla pagina ---------- */
const MINAI_REPO_URL = "https://github.com/ilgio/minai";
const DONATE = [{"name": "Bitcoin", "sym": "BTC", "net": "Rete Bitcoin", "addr": "bc1qwu78fsvm0xsg5s9pmclktetaxzc8fnea0vxy08", "size": 33, "qr": "M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM13 2h1v1h-1zM14 2h1v1h-1zM17 2h1v1h-1zM18 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM21 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM27 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM11 3h1v1h-1zM12 3h1v1h-1zM13 3h1v1h-1zM17 3h1v1h-1zM19 3h1v1h-1zM20 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM13 4h1v1h-1zM14 4h1v1h-1zM18 4h1v1h-1zM19 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM12 5h1v1h-1zM14 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM20 5h1v1h-1zM21 5h1v1h-1zM24 5h1v1h-1zM26 5h1v1h-1zM27 5h1v1h-1zM28 5h1v1h-1zM30 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM14 6h1v1h-1zM15 6h1v1h-1zM17 6h1v1h-1zM18 6h1v1h-1zM19 6h1v1h-1zM20 6h1v1h-1zM24 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM13 7h1v1h-1zM17 7h1v1h-1zM18 7h1v1h-1zM19 7h1v1h-1zM21 7h1v1h-1zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM11 9h1v1h-1zM12 9h1v1h-1zM17 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM15 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM21 10h1v1h-1zM23 10h1v1h-1zM25 10h1v1h-1zM2 11h1v1h-1zM4 11h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM9 11h1v1h-1zM10 11h1v1h-1zM11 11h1v1h-1zM14 11h1v1h-1zM16 11h1v1h-1zM18 11h1v1h-1zM19 11h1v1h-1zM20 11h1v1h-1zM22 11h1v1h-1zM24 11h1v1h-1zM25 11h1v1h-1zM27 11h1v1h-1zM30 11h1v1h-1zM2 12h1v1h-1zM3 12h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM8 12h1v1h-1zM15 12h1v1h-1zM16 12h1v1h-1zM21 12h1v1h-1zM22 12h1v1h-1zM25 12h1v1h-1zM26 12h1v1h-1zM28 12h1v1h-1zM29 12h1v1h-1zM3 13h1v1h-1zM6 13h1v1h-1zM10 13h1v1h-1zM12 13h1v1h-1zM15 13h1v1h-1zM16 13h1v1h-1zM18 13h1v1h-1zM21 13h1v1h-1zM22 13h1v1h-1zM23 13h1v1h-1zM25 13h1v1h-1zM26 13h1v1h-1zM28 13h1v1h-1zM2 14h1v1h-1zM3 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM15 14h1v1h-1zM17 14h1v1h-1zM18 14h1v1h-1zM19 14h1v1h-1zM23 14h1v1h-1zM24 14h1v1h-1zM27 14h1v1h-1zM30 14h1v1h-1zM2 15h1v1h-1zM7 15h1v1h-1zM10 15h1v1h-1zM11 15h1v1h-1zM12 15h1v1h-1zM15 15h1v1h-1zM16 15h1v1h-1zM19 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM27 15h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM12 16h1v1h-1zM14 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM22 16h1v1h-1zM25 16h1v1h-1zM27 16h1v1h-1zM28 16h1v1h-1zM30 16h1v1h-1zM2 17h1v1h-1zM5 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM10 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM15 17h1v1h-1zM16 17h1v1h-1zM18 17h1v1h-1zM19 17h1v1h-1zM20 17h1v1h-1zM21 17h1v1h-1zM23 17h1v1h-1zM30 17h1v1h-1zM2 18h1v1h-1zM3 18h1v1h-1zM7 18h1v1h-1zM8 18h1v1h-1zM9 18h1v1h-1zM10 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM16 18h1v1h-1zM19 18h1v1h-1zM23 18h1v1h-1zM25 18h1v1h-1zM5 19h1v1h-1zM6 19h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM11 19h1v1h-1zM12 19h1v1h-1zM13 19h1v1h-1zM14 19h1v1h-1zM15 19h1v1h-1zM18 19h1v1h-1zM20 19h1v1h-1zM22 19h1v1h-1zM24 19h1v1h-1zM25 19h1v1h-1zM28 19h1v1h-1zM29 19h1v1h-1zM30 19h1v1h-1zM2 20h1v1h-1zM5 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM16 20h1v1h-1zM18 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM27 20h1v1h-1zM28 20h1v1h-1zM29 20h1v1h-1zM30 20h1v1h-1zM4 21h1v1h-1zM9 21h1v1h-1zM10 21h1v1h-1zM12 21h1v1h-1zM13 21h1v1h-1zM17 21h1v1h-1zM18 21h1v1h-1zM19 21h1v1h-1zM21 21h1v1h-1zM25 21h1v1h-1zM29 21h1v1h-1zM2 22h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM6 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM14 22h1v1h-1zM15 22h1v1h-1zM17 22h1v1h-1zM22 22h1v1h-1zM23 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM26 22h1v1h-1zM27 22h1v1h-1zM28 22h1v1h-1zM30 22h1v1h-1zM10 23h1v1h-1zM13 23h1v1h-1zM16 23h1v1h-1zM19 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM29 23h1v1h-1zM30 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM11 24h1v1h-1zM12 24h1v1h-1zM15 24h1v1h-1zM16 24h1v1h-1zM18 24h1v1h-1zM20 24h1v1h-1zM22 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM29 24h1v1h-1zM2 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM14 25h1v1h-1zM15 25h1v1h-1zM16 25h1v1h-1zM20 25h1v1h-1zM22 25h1v1h-1zM26 25h1v1h-1zM27 25h1v1h-1zM28 25h1v1h-1zM29 25h1v1h-1zM30 25h1v1h-1zM2 26h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM12 26h1v1h-1zM13 26h1v1h-1zM16 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM27 26h1v1h-1zM2 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM10 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM13 27h1v1h-1zM14 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM24 27h1v1h-1zM26 27h1v1h-1zM28 27h1v1h-1zM29 27h1v1h-1zM2 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM13 28h1v1h-1zM18 28h1v1h-1zM19 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM26 28h1v1h-1zM30 28h1v1h-1zM2 29h1v1h-1zM8 29h1v1h-1zM12 29h1v1h-1zM16 29h1v1h-1zM19 29h1v1h-1zM22 29h1v1h-1zM25 29h1v1h-1zM26 29h1v1h-1zM29 29h1v1h-1zM2 30h1v1h-1zM3 30h1v1h-1zM4 30h1v1h-1zM5 30h1v1h-1zM6 30h1v1h-1zM7 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM12 30h1v1h-1zM13 30h1v1h-1zM14 30h1v1h-1zM15 30h1v1h-1zM17 30h1v1h-1zM18 30h1v1h-1zM19 30h1v1h-1zM21 30h1v1h-1zM22 30h1v1h-1zM23 30h1v1h-1zM24 30h1v1h-1zM25 30h1v1h-1zM26 30h1v1h-1zM27 30h1v1h-1zM29 30h1v1h-1z"}, {"name": "Ethereum", "sym": "ETH", "net": "Rete Ethereum", "addr": "0x7192010b5a6A29844530b01078A11277e3Fc40AF", "size": 33, "qr": "M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM16 2h1v1h-1zM17 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM27 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM12 3h1v1h-1zM13 3h1v1h-1zM18 3h1v1h-1zM19 3h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h1v1h-1zM13 4h1v1h-1zM15 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM19 5h1v1h-1zM20 5h1v1h-1zM24 5h1v1h-1zM26 5h1v1h-1zM27 5h1v1h-1zM28 5h1v1h-1zM30 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM16 6h1v1h-1zM19 6h1v1h-1zM21 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM11 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM18 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM14 10h1v1h-1zM17 10h1v1h-1zM18 10h1v1h-1zM19 10h1v1h-1zM20 10h1v1h-1zM21 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM26 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM30 10h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM13 11h1v1h-1zM14 11h1v1h-1zM17 11h1v1h-1zM21 11h1v1h-1zM22 11h1v1h-1zM23 11h1v1h-1zM26 11h1v1h-1zM28 11h1v1h-1zM29 11h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM8 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM12 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM19 12h1v1h-1zM20 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM28 12h1v1h-1zM29 12h1v1h-1zM2 13h1v1h-1zM3 13h1v1h-1zM4 13h1v1h-1zM6 13h1v1h-1zM7 13h1v1h-1zM10 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM25 13h1v1h-1zM26 13h1v1h-1zM29 13h1v1h-1zM2 14h1v1h-1zM4 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM16 14h1v1h-1zM17 14h1v1h-1zM20 14h1v1h-1zM21 14h1v1h-1zM24 14h1v1h-1zM25 14h1v1h-1zM30 14h1v1h-1zM7 15h1v1h-1zM12 15h1v1h-1zM13 15h1v1h-1zM14 15h1v1h-1zM15 15h1v1h-1zM17 15h1v1h-1zM22 15h1v1h-1zM25 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM30 15h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM15 16h1v1h-1zM17 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM26 16h1v1h-1zM29 16h1v1h-1zM30 16h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM11 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM24 17h1v1h-1zM25 17h1v1h-1zM26 17h1v1h-1zM28 17h1v1h-1zM30 17h1v1h-1zM4 18h1v1h-1zM6 18h1v1h-1zM7 18h1v1h-1zM8 18h1v1h-1zM10 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM13 18h1v1h-1zM17 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM23 18h1v1h-1zM27 18h1v1h-1zM29 18h1v1h-1zM30 18h1v1h-1zM2 19h1v1h-1zM3 19h1v1h-1zM4 19h1v1h-1zM5 19h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM11 19h1v1h-1zM13 19h1v1h-1zM17 19h1v1h-1zM18 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM25 19h1v1h-1zM26 19h1v1h-1zM29 19h1v1h-1zM2 20h1v1h-1zM3 20h1v1h-1zM5 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM13 20h1v1h-1zM14 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM27 20h1v1h-1zM30 20h1v1h-1zM2 21h1v1h-1zM3 21h1v1h-1zM7 21h1v1h-1zM9 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM15 21h1v1h-1zM17 21h1v1h-1zM21 21h1v1h-1zM24 21h1v1h-1zM26 21h1v1h-1zM27 21h1v1h-1zM28 21h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM11 22h1v1h-1zM13 22h1v1h-1zM15 22h1v1h-1zM16 22h1v1h-1zM17 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM22 22h1v1h-1zM23 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM26 22h1v1h-1zM28 22h1v1h-1zM29 22h1v1h-1zM30 22h1v1h-1zM10 23h1v1h-1zM14 23h1v1h-1zM16 23h1v1h-1zM17 23h1v1h-1zM18 23h1v1h-1zM19 23h1v1h-1zM21 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM28 23h1v1h-1zM29 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM17 24h1v1h-1zM18 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM2 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM11 25h1v1h-1zM12 25h1v1h-1zM18 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM22 25h1v1h-1zM26 25h1v1h-1zM2 26h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM13 26h1v1h-1zM14 26h1v1h-1zM15 26h1v1h-1zM16 26h1v1h-1zM17 26h1v1h-1zM19 26h1v1h-1zM21 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM29 26h1v1h-1zM2 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM10 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM16 27h1v1h-1zM17 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM27 27h1v1h-1zM28 27h1v1h-1zM30 27h1v1h-1zM2 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM12 28h1v1h-1zM15 28h1v1h-1zM16 28h1v1h-1zM17 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM29 28h1v1h-1zM30 28h1v1h-1zM2 29h1v1h-1zM8 29h1v1h-1zM11 29h1v1h-1zM12 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM16 29h1v1h-1zM18 29h1v1h-1zM21 29h1v1h-1zM26 29h1v1h-1zM28 29h1v1h-1zM30 29h1v1h-1zM2 30h1v1h-1zM3 30h1v1h-1zM4 30h1v1h-1zM5 30h1v1h-1zM6 30h1v1h-1zM7 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM15 30h1v1h-1zM16 30h1v1h-1zM17 30h1v1h-1zM18 30h1v1h-1zM20 30h1v1h-1zM22 30h1v1h-1zM25 30h1v1h-1zM26 30h1v1h-1zM27 30h1v1h-1z"}, {"name": "Tether", "sym": "USDT", "net": "Ethereum (ERC-20) o BNB Smart Chain (BEP-20)", "addr": "0x7192010b5a6A29844530b01078A11277e3Fc40AF", "size": 33, "qr": "M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM16 2h1v1h-1zM17 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM27 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM12 3h1v1h-1zM13 3h1v1h-1zM18 3h1v1h-1zM19 3h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h1v1h-1zM13 4h1v1h-1zM15 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM19 5h1v1h-1zM20 5h1v1h-1zM24 5h1v1h-1zM26 5h1v1h-1zM27 5h1v1h-1zM28 5h1v1h-1zM30 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM16 6h1v1h-1zM19 6h1v1h-1zM21 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM11 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM18 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM14 10h1v1h-1zM17 10h1v1h-1zM18 10h1v1h-1zM19 10h1v1h-1zM20 10h1v1h-1zM21 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM26 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM30 10h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM13 11h1v1h-1zM14 11h1v1h-1zM17 11h1v1h-1zM21 11h1v1h-1zM22 11h1v1h-1zM23 11h1v1h-1zM26 11h1v1h-1zM28 11h1v1h-1zM29 11h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM8 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM12 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM19 12h1v1h-1zM20 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM28 12h1v1h-1zM29 12h1v1h-1zM2 13h1v1h-1zM3 13h1v1h-1zM4 13h1v1h-1zM6 13h1v1h-1zM7 13h1v1h-1zM10 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM25 13h1v1h-1zM26 13h1v1h-1zM29 13h1v1h-1zM2 14h1v1h-1zM4 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM16 14h1v1h-1zM17 14h1v1h-1zM20 14h1v1h-1zM21 14h1v1h-1zM24 14h1v1h-1zM25 14h1v1h-1zM30 14h1v1h-1zM7 15h1v1h-1zM12 15h1v1h-1zM13 15h1v1h-1zM14 15h1v1h-1zM15 15h1v1h-1zM17 15h1v1h-1zM22 15h1v1h-1zM25 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM30 15h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM15 16h1v1h-1zM17 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM26 16h1v1h-1zM29 16h1v1h-1zM30 16h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM11 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM24 17h1v1h-1zM25 17h1v1h-1zM26 17h1v1h-1zM28 17h1v1h-1zM30 17h1v1h-1zM4 18h1v1h-1zM6 18h1v1h-1zM7 18h1v1h-1zM8 18h1v1h-1zM10 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM13 18h1v1h-1zM17 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM23 18h1v1h-1zM27 18h1v1h-1zM29 18h1v1h-1zM30 18h1v1h-1zM2 19h1v1h-1zM3 19h1v1h-1zM4 19h1v1h-1zM5 19h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM11 19h1v1h-1zM13 19h1v1h-1zM17 19h1v1h-1zM18 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM25 19h1v1h-1zM26 19h1v1h-1zM29 19h1v1h-1zM2 20h1v1h-1zM3 20h1v1h-1zM5 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM13 20h1v1h-1zM14 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM27 20h1v1h-1zM30 20h1v1h-1zM2 21h1v1h-1zM3 21h1v1h-1zM7 21h1v1h-1zM9 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM15 21h1v1h-1zM17 21h1v1h-1zM21 21h1v1h-1zM24 21h1v1h-1zM26 21h1v1h-1zM27 21h1v1h-1zM28 21h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM11 22h1v1h-1zM13 22h1v1h-1zM15 22h1v1h-1zM16 22h1v1h-1zM17 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM22 22h1v1h-1zM23 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM26 22h1v1h-1zM28 22h1v1h-1zM29 22h1v1h-1zM30 22h1v1h-1zM10 23h1v1h-1zM14 23h1v1h-1zM16 23h1v1h-1zM17 23h1v1h-1zM18 23h1v1h-1zM19 23h1v1h-1zM21 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM28 23h1v1h-1zM29 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM17 24h1v1h-1zM18 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM2 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM11 25h1v1h-1zM12 25h1v1h-1zM18 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM22 25h1v1h-1zM26 25h1v1h-1zM2 26h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM13 26h1v1h-1zM14 26h1v1h-1zM15 26h1v1h-1zM16 26h1v1h-1zM17 26h1v1h-1zM19 26h1v1h-1zM21 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM29 26h1v1h-1zM2 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM10 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM16 27h1v1h-1zM17 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM27 27h1v1h-1zM28 27h1v1h-1zM30 27h1v1h-1zM2 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM12 28h1v1h-1zM15 28h1v1h-1zM16 28h1v1h-1zM17 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM29 28h1v1h-1zM30 28h1v1h-1zM2 29h1v1h-1zM8 29h1v1h-1zM11 29h1v1h-1zM12 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM16 29h1v1h-1zM18 29h1v1h-1zM21 29h1v1h-1zM26 29h1v1h-1zM28 29h1v1h-1zM30 29h1v1h-1zM2 30h1v1h-1zM3 30h1v1h-1zM4 30h1v1h-1zM5 30h1v1h-1zM6 30h1v1h-1zM7 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM15 30h1v1h-1zM16 30h1v1h-1zM17 30h1v1h-1zM18 30h1v1h-1zM20 30h1v1h-1zM22 30h1v1h-1zM25 30h1v1h-1zM26 30h1v1h-1zM27 30h1v1h-1z"}, {"name": "BNB", "sym": "BNB", "net": "BNB Smart Chain (BEP-20)", "addr": "0x7192010b5a6A29844530b01078A11277e3Fc40AF", "size": 33, "qr": "M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM16 2h1v1h-1zM17 2h1v1h-1zM19 2h1v1h-1zM20 2h1v1h-1zM24 2h1v1h-1zM25 2h1v1h-1zM26 2h1v1h-1zM27 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM12 3h1v1h-1zM13 3h1v1h-1zM18 3h1v1h-1zM19 3h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h1v1h-1zM13 4h1v1h-1zM15 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM27 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM13 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM19 5h1v1h-1zM20 5h1v1h-1zM24 5h1v1h-1zM26 5h1v1h-1zM27 5h1v1h-1zM28 5h1v1h-1zM30 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM16 6h1v1h-1zM19 6h1v1h-1zM21 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h1v1h-1zM27 6h1v1h-1zM28 6h1v1h-1zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM11 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM22 7h1v1h-1zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM25 8h1v1h-1zM26 8h1v1h-1zM27 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM13 9h1v1h-1zM14 9h1v1h-1zM15 9h1v1h-1zM18 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM14 10h1v1h-1zM17 10h1v1h-1zM18 10h1v1h-1zM19 10h1v1h-1zM20 10h1v1h-1zM21 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM26 10h1v1h-1zM28 10h1v1h-1zM29 10h1v1h-1zM30 10h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM13 11h1v1h-1zM14 11h1v1h-1zM17 11h1v1h-1zM21 11h1v1h-1zM22 11h1v1h-1zM23 11h1v1h-1zM26 11h1v1h-1zM28 11h1v1h-1zM29 11h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM8 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM12 12h1v1h-1zM17 12h1v1h-1zM18 12h1v1h-1zM19 12h1v1h-1zM20 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM28 12h1v1h-1zM29 12h1v1h-1zM2 13h1v1h-1zM3 13h1v1h-1zM4 13h1v1h-1zM6 13h1v1h-1zM7 13h1v1h-1zM10 13h1v1h-1zM17 13h1v1h-1zM19 13h1v1h-1zM22 13h1v1h-1zM25 13h1v1h-1zM26 13h1v1h-1zM29 13h1v1h-1zM2 14h1v1h-1zM4 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM7 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM16 14h1v1h-1zM17 14h1v1h-1zM20 14h1v1h-1zM21 14h1v1h-1zM24 14h1v1h-1zM25 14h1v1h-1zM30 14h1v1h-1zM7 15h1v1h-1zM12 15h1v1h-1zM13 15h1v1h-1zM14 15h1v1h-1zM15 15h1v1h-1zM17 15h1v1h-1zM22 15h1v1h-1zM25 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM29 15h1v1h-1zM30 15h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM12 16h1v1h-1zM15 16h1v1h-1zM17 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM26 16h1v1h-1zM29 16h1v1h-1zM30 16h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM6 17h1v1h-1zM7 17h1v1h-1zM11 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM16 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h1v1h-1zM24 17h1v1h-1zM25 17h1v1h-1zM26 17h1v1h-1zM28 17h1v1h-1zM30 17h1v1h-1zM4 18h1v1h-1zM6 18h1v1h-1zM7 18h1v1h-1zM8 18h1v1h-1zM10 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM13 18h1v1h-1zM17 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM23 18h1v1h-1zM27 18h1v1h-1zM29 18h1v1h-1zM30 18h1v1h-1zM2 19h1v1h-1zM3 19h1v1h-1zM4 19h1v1h-1zM5 19h1v1h-1zM7 19h1v1h-1zM9 19h1v1h-1zM11 19h1v1h-1zM13 19h1v1h-1zM17 19h1v1h-1zM18 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM23 19h1v1h-1zM25 19h1v1h-1zM26 19h1v1h-1zM29 19h1v1h-1zM2 20h1v1h-1zM3 20h1v1h-1zM5 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM13 20h1v1h-1zM14 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM21 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM25 20h1v1h-1zM27 20h1v1h-1zM30 20h1v1h-1zM2 21h1v1h-1zM3 21h1v1h-1zM7 21h1v1h-1zM9 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM15 21h1v1h-1zM17 21h1v1h-1zM21 21h1v1h-1zM24 21h1v1h-1zM26 21h1v1h-1zM27 21h1v1h-1zM28 21h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM6 22h1v1h-1zM7 22h1v1h-1zM8 22h1v1h-1zM9 22h1v1h-1zM10 22h1v1h-1zM11 22h1v1h-1zM13 22h1v1h-1zM15 22h1v1h-1zM16 22h1v1h-1zM17 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM22 22h1v1h-1zM23 22h1v1h-1zM24 22h1v1h-1zM25 22h1v1h-1zM26 22h1v1h-1zM28 22h1v1h-1zM29 22h1v1h-1zM30 22h1v1h-1zM10 23h1v1h-1zM14 23h1v1h-1zM16 23h1v1h-1zM17 23h1v1h-1zM18 23h1v1h-1zM19 23h1v1h-1zM21 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM28 23h1v1h-1zM29 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM17 24h1v1h-1zM18 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM2 25h1v1h-1zM8 25h1v1h-1zM10 25h1v1h-1zM11 25h1v1h-1zM12 25h1v1h-1zM18 25h1v1h-1zM19 25h1v1h-1zM20 25h1v1h-1zM22 25h1v1h-1zM26 25h1v1h-1zM2 26h1v1h-1zM4 26h1v1h-1zM5 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM10 26h1v1h-1zM12 26h1v1h-1zM13 26h1v1h-1zM14 26h1v1h-1zM15 26h1v1h-1zM16 26h1v1h-1zM17 26h1v1h-1zM19 26h1v1h-1zM21 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM25 26h1v1h-1zM26 26h1v1h-1zM29 26h1v1h-1zM2 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM10 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM16 27h1v1h-1zM17 27h1v1h-1zM20 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM27 27h1v1h-1zM28 27h1v1h-1zM30 27h1v1h-1zM2 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM8 28h1v1h-1zM12 28h1v1h-1zM15 28h1v1h-1zM16 28h1v1h-1zM17 28h1v1h-1zM20 28h1v1h-1zM21 28h1v1h-1zM22 28h1v1h-1zM25 28h1v1h-1zM26 28h1v1h-1zM29 28h1v1h-1zM30 28h1v1h-1zM2 29h1v1h-1zM8 29h1v1h-1zM11 29h1v1h-1zM12 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM16 29h1v1h-1zM18 29h1v1h-1zM21 29h1v1h-1zM26 29h1v1h-1zM28 29h1v1h-1zM30 29h1v1h-1zM2 30h1v1h-1zM3 30h1v1h-1zM4 30h1v1h-1zM5 30h1v1h-1zM6 30h1v1h-1zM7 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM15 30h1v1h-1zM16 30h1v1h-1zM17 30h1v1h-1zM18 30h1v1h-1zM20 30h1v1h-1zM22 30h1v1h-1zM25 30h1v1h-1zM26 30h1v1h-1zM27 30h1v1h-1z"}, {"name": "Solana", "sym": "SOL", "net": "Rete Solana", "addr": "8EnZmovmtahHDPwg3FGTvUabgixCAFeLbnYtmzjty1r7", "size": 37, "qr": "M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM12 2h1v1h-1zM13 2h1v1h-1zM14 2h1v1h-1zM15 2h1v1h-1zM16 2h1v1h-1zM19 2h1v1h-1zM23 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM31 2h1v1h-1zM32 2h1v1h-1zM33 2h1v1h-1zM34 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM14 3h1v1h-1zM15 3h1v1h-1zM16 3h1v1h-1zM17 3h1v1h-1zM20 3h1v1h-1zM25 3h1v1h-1zM28 3h1v1h-1zM34 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM12 4h1v1h-1zM15 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM22 4h1v1h-1zM23 4h1v1h-1zM24 4h1v1h-1zM25 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM31 4h1v1h-1zM32 4h1v1h-1zM34 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM14 5h1v1h-1zM15 5h1v1h-1zM16 5h1v1h-1zM17 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM20 5h1v1h-1zM21 5h1v1h-1zM22 5h1v1h-1zM23 5h1v1h-1zM24 5h1v1h-1zM25 5h1v1h-1zM28 5h1v1h-1zM30 5h1v1h-1zM31 5h1v1h-1zM32 5h1v1h-1zM34 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM11 6h1v1h-1zM15 6h1v1h-1zM16 6h1v1h-1zM20 6h1v1h-1zM21 6h1v1h-1zM22 6h1v1h-1zM26 6h1v1h-1zM28 6h1v1h-1zM30 6h1v1h-1zM31 6h1v1h-1zM32 6h1v1h-1zM34 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h1v1h-1zM13 7h1v1h-1zM17 7h1v1h-1zM18 7h1v1h-1zM20 7h1v1h-1zM21 7h1v1h-1zM23 7h1v1h-1zM26 7h1v1h-1zM28 7h1v1h-1zM34 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM29 8h1v1h-1zM30 8h1v1h-1zM31 8h1v1h-1zM32 8h1v1h-1zM33 8h1v1h-1zM34 8h1v1h-1zM17 9h1v1h-1zM18 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM23 9h1v1h-1zM24 9h1v1h-1zM26 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM13 10h1v1h-1zM14 10h1v1h-1zM15 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM25 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM29 10h1v1h-1zM2 11h1v1h-1zM3 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM9 11h1v1h-1zM10 11h1v1h-1zM15 11h1v1h-1zM17 11h1v1h-1zM18 11h1v1h-1zM19 11h1v1h-1zM22 11h1v1h-1zM23 11h1v1h-1zM24 11h1v1h-1zM25 11h1v1h-1zM26 11h1v1h-1zM27 11h1v1h-1zM28 11h1v1h-1zM33 11h1v1h-1zM34 11h1v1h-1zM3 12h1v1h-1zM4 12h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM9 12h1v1h-1zM14 12h1v1h-1zM15 12h1v1h-1zM16 12h1v1h-1zM18 12h1v1h-1zM20 12h1v1h-1zM21 12h1v1h-1zM22 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM30 12h1v1h-1zM31 12h1v1h-1zM32 12h1v1h-1zM34 12h1v1h-1zM4 13h1v1h-1zM6 13h1v1h-1zM9 13h1v1h-1zM10 13h1v1h-1zM11 13h1v1h-1zM12 13h1v1h-1zM14 13h1v1h-1zM15 13h1v1h-1zM20 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM24 13h1v1h-1zM27 13h1v1h-1zM31 13h1v1h-1zM33 13h1v1h-1zM2 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM13 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM18 14h1v1h-1zM20 14h1v1h-1zM22 14h1v1h-1zM24 14h1v1h-1zM25 14h1v1h-1zM27 14h1v1h-1zM28 14h1v1h-1zM34 14h1v1h-1zM2 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM11 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM17 15h1v1h-1zM19 15h1v1h-1zM20 15h1v1h-1zM22 15h1v1h-1zM23 15h1v1h-1zM27 15h1v1h-1zM28 15h1v1h-1zM30 15h1v1h-1zM32 15h1v1h-1zM3 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM13 16h1v1h-1zM14 16h1v1h-1zM16 16h1v1h-1zM17 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM20 16h1v1h-1zM21 16h1v1h-1zM23 16h1v1h-1zM25 16h1v1h-1zM26 16h1v1h-1zM27 16h1v1h-1zM28 16h1v1h-1zM31 16h1v1h-1zM33 16h1v1h-1zM3 17h1v1h-1zM4 17h1v1h-1zM5 17h1v1h-1zM9 17h1v1h-1zM11 17h1v1h-1zM18 17h1v1h-1zM19 17h1v1h-1zM20 17h1v1h-1zM22 17h1v1h-1zM23 17h1v1h-1zM24 17h1v1h-1zM29 17h1v1h-1zM30 17h1v1h-1zM33 17h1v1h-1zM2 18h1v1h-1zM4 18h1v1h-1zM5 18h1v1h-1zM7 18h1v1h-1zM8 18h1v1h-1zM9 18h1v1h-1zM10 18h1v1h-1zM15 18h1v1h-1zM17 18h1v1h-1zM19 18h1v1h-1zM23 18h1v1h-1zM24 18h1v1h-1zM26 18h1v1h-1zM28 18h1v1h-1zM29 18h1v1h-1zM30 18h1v1h-1zM31 18h1v1h-1zM32 18h1v1h-1zM33 18h1v1h-1zM4 19h1v1h-1zM10 19h1v1h-1zM11 19h1v1h-1zM13 19h1v1h-1zM17 19h1v1h-1zM18 19h1v1h-1zM19 19h1v1h-1zM21 19h1v1h-1zM26 19h1v1h-1zM31 19h1v1h-1zM32 19h1v1h-1zM33 19h1v1h-1zM3 20h1v1h-1zM4 20h1v1h-1zM7 20h1v1h-1zM8 20h1v1h-1zM18 20h1v1h-1zM19 20h1v1h-1zM23 20h1v1h-1zM26 20h1v1h-1zM27 20h1v1h-1zM28 20h1v1h-1zM29 20h1v1h-1zM33 20h1v1h-1zM34 20h1v1h-1zM2 21h1v1h-1zM5 21h1v1h-1zM6 21h1v1h-1zM7 21h1v1h-1zM11 21h1v1h-1zM12 21h1v1h-1zM15 21h1v1h-1zM17 21h1v1h-1zM18 21h1v1h-1zM21 21h1v1h-1zM22 21h1v1h-1zM24 21h1v1h-1zM25 21h1v1h-1zM4 22h1v1h-1zM5 22h1v1h-1zM8 22h1v1h-1zM10 22h1v1h-1zM12 22h1v1h-1zM13 22h1v1h-1zM17 22h1v1h-1zM19 22h1v1h-1zM22 22h1v1h-1zM27 22h1v1h-1zM29 22h1v1h-1zM32 22h1v1h-1zM33 22h1v1h-1zM34 22h1v1h-1zM3 23h1v1h-1zM4 23h1v1h-1zM6 23h1v1h-1zM13 23h1v1h-1zM14 23h1v1h-1zM15 23h1v1h-1zM16 23h1v1h-1zM17 23h1v1h-1zM19 23h1v1h-1zM21 23h1v1h-1zM23 23h1v1h-1zM26 23h1v1h-1zM28 23h1v1h-1zM31 23h1v1h-1zM32 23h1v1h-1zM34 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM6 24h1v1h-1zM8 24h1v1h-1zM9 24h1v1h-1zM10 24h1v1h-1zM11 24h1v1h-1zM12 24h1v1h-1zM18 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM28 24h1v1h-1zM29 24h1v1h-1zM31 24h1v1h-1zM32 24h1v1h-1zM33 24h1v1h-1zM34 24h1v1h-1zM3 25h1v1h-1zM4 25h1v1h-1zM6 25h1v1h-1zM10 25h1v1h-1zM11 25h1v1h-1zM13 25h1v1h-1zM15 25h1v1h-1zM17 25h1v1h-1zM21 25h1v1h-1zM22 25h1v1h-1zM23 25h1v1h-1zM24 25h1v1h-1zM27 25h1v1h-1zM28 25h1v1h-1zM30 25h1v1h-1zM31 25h1v1h-1zM33 25h1v1h-1zM34 25h1v1h-1zM2 26h1v1h-1zM4 26h1v1h-1zM6 26h1v1h-1zM8 26h1v1h-1zM9 26h1v1h-1zM10 26h1v1h-1zM14 26h1v1h-1zM15 26h1v1h-1zM19 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM24 26h1v1h-1zM26 26h1v1h-1zM27 26h1v1h-1zM28 26h1v1h-1zM29 26h1v1h-1zM30 26h1v1h-1zM31 26h1v1h-1zM33 26h1v1h-1zM10 27h1v1h-1zM13 27h1v1h-1zM19 27h1v1h-1zM22 27h1v1h-1zM23 27h1v1h-1zM25 27h1v1h-1zM26 27h1v1h-1zM30 27h1v1h-1zM31 27h1v1h-1zM32 27h1v1h-1zM2 28h1v1h-1zM3 28h1v1h-1zM4 28h1v1h-1zM5 28h1v1h-1zM6 28h1v1h-1zM7 28h1v1h-1zM8 28h1v1h-1zM11 28h1v1h-1zM12 28h1v1h-1zM16 28h1v1h-1zM19 28h1v1h-1zM20 28h1v1h-1zM24 28h1v1h-1zM26 28h1v1h-1zM28 28h1v1h-1zM30 28h1v1h-1zM31 28h1v1h-1zM33 28h1v1h-1zM2 29h1v1h-1zM8 29h1v1h-1zM10 29h1v1h-1zM11 29h1v1h-1zM13 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM16 29h1v1h-1zM17 29h1v1h-1zM19 29h1v1h-1zM20 29h1v1h-1zM22 29h1v1h-1zM23 29h1v1h-1zM24 29h1v1h-1zM26 29h1v1h-1zM30 29h1v1h-1zM2 30h1v1h-1zM4 30h1v1h-1zM5 30h1v1h-1zM6 30h1v1h-1zM8 30h1v1h-1zM12 30h1v1h-1zM14 30h1v1h-1zM15 30h1v1h-1zM16 30h1v1h-1zM17 30h1v1h-1zM20 30h1v1h-1zM21 30h1v1h-1zM22 30h1v1h-1zM26 30h1v1h-1zM27 30h1v1h-1zM28 30h1v1h-1zM29 30h1v1h-1zM30 30h1v1h-1zM34 30h1v1h-1zM2 31h1v1h-1zM4 31h1v1h-1zM5 31h1v1h-1zM6 31h1v1h-1zM8 31h1v1h-1zM10 31h1v1h-1zM12 31h1v1h-1zM13 31h1v1h-1zM15 31h1v1h-1zM17 31h1v1h-1zM18 31h1v1h-1zM20 31h1v1h-1zM21 31h1v1h-1zM23 31h1v1h-1zM24 31h1v1h-1zM25 31h1v1h-1zM28 31h1v1h-1zM29 31h1v1h-1zM30 31h1v1h-1zM31 31h1v1h-1zM33 31h1v1h-1zM2 32h1v1h-1zM4 32h1v1h-1zM5 32h1v1h-1zM6 32h1v1h-1zM8 32h1v1h-1zM11 32h1v1h-1zM14 32h1v1h-1zM15 32h1v1h-1zM16 32h1v1h-1zM17 32h1v1h-1zM18 32h1v1h-1zM19 32h1v1h-1zM21 32h1v1h-1zM22 32h1v1h-1zM23 32h1v1h-1zM24 32h1v1h-1zM26 32h1v1h-1zM29 32h1v1h-1zM30 32h1v1h-1zM32 32h1v1h-1zM34 32h1v1h-1zM2 33h1v1h-1zM8 33h1v1h-1zM11 33h1v1h-1zM12 33h1v1h-1zM15 33h1v1h-1zM16 33h1v1h-1zM19 33h1v1h-1zM20 33h1v1h-1zM21 33h1v1h-1zM22 33h1v1h-1zM23 33h1v1h-1zM26 33h1v1h-1zM28 33h1v1h-1zM30 33h1v1h-1zM2 34h1v1h-1zM3 34h1v1h-1zM4 34h1v1h-1zM5 34h1v1h-1zM6 34h1v1h-1zM7 34h1v1h-1zM8 34h1v1h-1zM10 34h1v1h-1zM12 34h1v1h-1zM13 34h1v1h-1zM14 34h1v1h-1zM17 34h1v1h-1zM18 34h1v1h-1zM21 34h1v1h-1zM25 34h1v1h-1zM26 34h1v1h-1zM27 34h1v1h-1zM29 34h1v1h-1zM31 34h1v1h-1zM33 34h1v1h-1z"}];
const GH_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

function copyAddress(text, btn) {
  const done = () => { const o = btn.textContent; btn.textContent = "Copiato"; setTimeout(() => { btn.textContent = o; }, 1500); };
  if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, () => {}); return; }
  const t = document.createElement("textarea");
  t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
  document.body.append(t); t.select();
  try { document.execCommand("copy"); done(); } catch {}
  t.remove();
}

function openDonate() {
  const d = document.createElement("dialog");
  d.className = "donatedlg";
  const h = document.createElement("h2"); h.textContent = "Sostieni minai";
  const p = document.createElement("p"); p.className = "small muted";
  p.textContent = "minai è gratuito e open source. Se ti è utile, puoi fare una donazione in crypto. Grazie!";
  d.append(h, p);
  for (const c of DONATE) {
    const row = document.createElement("div"); row.className = "drow";
    const head = document.createElement("div"); head.className = "dhead";
    const name = document.createElement("strong"); name.textContent = c.name;
    const sym = document.createElement("span"); sym.className = "dsym"; sym.textContent = c.sym;
    const net = document.createElement("span"); net.className = "dnet"; net.textContent = c.net;
    head.append(name, sym, net);
    const line = document.createElement("div"); line.className = "daddr";
    const code = document.createElement("code"); code.textContent = c.addr; code.setAttribute("data-noi18n", "");
    const bCopy = document.createElement("button"); bCopy.textContent = "Copia";
    bCopy.addEventListener("click", () => copyAddress(c.addr, bCopy));
    const bQr = document.createElement("button"); bQr.textContent = "QR";
    const qr = document.createElement("div"); qr.className = "dqr"; qr.hidden = true;
    qr.innerHTML = `<svg viewBox="0 0 ${c.size} ${c.size}" shape-rendering="crispEdges" aria-label="QR ${c.sym}"><rect width="${c.size}" height="${c.size}" fill="#fff"/><path d="${c.qr}" fill="#000"/></svg>`;
    bQr.addEventListener("click", () => { qr.hidden = !qr.hidden; });
    line.append(code, bCopy, bQr);
    row.append(head, line, qr);
    d.append(row);
  }
  const warn = document.createElement("p"); warn.className = "dwarn";
  warn.textContent = "Invia solo sulla rete indicata: i fondi inviati su una rete diversa possono andare persi.";
  const close = document.createElement("button"); close.textContent = "Chiudi";
  const actions = document.createElement("div"); actions.className = "actions"; actions.append(close);
  d.append(warn, actions);
  document.body.append(d);
  const done = () => { d.close(); d.remove(); };
  close.addEventListener("click", done);
  d.addEventListener("cancel", ev => { ev.preventDefault(); done(); });
  d.showModal();
}

function addCredits() {
  const foot = document.querySelector(".foot");
  if (!foot || foot.querySelector(".credits")) return;
  const box = document.createElement("span"); box.className = "credits";
  const gh = document.createElement("a");
  gh.className = "gh"; gh.href = MINAI_REPO_URL; gh.target = "_blank"; gh.rel = "noopener";
  gh.innerHTML = GH_ICON;
  gh.append("by ilgio");
  const don = document.createElement("button"); don.className = "donatebtn"; don.textContent = "♥ Dona";
  don.addEventListener("click", openDonate);
  box.append(gh, don);
  foot.append(box);
}
addCredits();

function choose(message, options) {
  // options: [{label, value, cls}] — l'ultima con value null è "annulla"
  return new Promise(resolve => {
    const d = document.createElement("dialog"); d.className = "askdlg";
    const p = document.createElement("p"); p.textContent = message;
    const actions = document.createElement("div"); actions.className = "actions choices";
    const done = v => { d.close(); d.remove(); resolve(v); };
    for (const o of options) {
      const b = document.createElement("button"); b.textContent = o.label;
      if (o.cls) b.className = o.cls;
      b.addEventListener("click", () => done(o.value));
      actions.append(b);
    }
    d.append(p, actions); document.body.append(d);
    d.addEventListener("cancel", ev => { ev.preventDefault(); done(null); });
    d.showModal();
  });
}

function askText(message, value = "") {
  return new Promise(resolve => {
    const d = document.createElement("dialog"); d.className = "askdlg";
    const p = document.createElement("p"); p.textContent = message;
    const input = document.createElement("input"); input.value = value; input.autocapitalize = "off"; input.spellcheck = false;
    const actions = document.createElement("div"); actions.className = "actions";
    const ok = document.createElement("button"); ok.className = "primary"; ok.textContent = "OK";
    const no = document.createElement("button"); no.textContent = "Annulla";
    const done = v => { d.close(); d.remove(); resolve(v); };
    ok.addEventListener("click", () => done(input.value.trim() || null));
    no.addEventListener("click", () => done(null));
    input.addEventListener("keydown", ev => { if (ev.key === "Enter") done(input.value.trim() || null); });
    d.addEventListener("cancel", ev => { ev.preventDefault(); done(null); });
    actions.append(ok, no); d.append(p, input, actions); document.body.append(d);
    d.showModal(); input.focus(); input.select();
  });
}
