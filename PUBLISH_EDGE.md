# Pubblicare SkipFlow su Microsoft Edge Add-ons

Pacchetto: **SkipFlow 1.0.0**. Registrazione al programma Edge e invio dell’estensione: **gratuiti**.

- [Scarica lo ZIP per lo store](https://github.com/Berserk-hub150/SkipFlow/raw/refs/heads/main/downloads/SkipFlow-edge-store-1.0.0.zip).
- [Scarica il logo PNG](https://github.com/Berserk-hub150/SkipFlow/raw/refs/heads/main/icons/icon128.png).
- [Apri Partner Center](https://partner.microsoft.com/).

Lo ZIP per lo store contiene il manifest alla radice e i file necessari all’estensione. Per caricarlo nello store mantienilo compresso.

## 1. Registra l’account sviluppatore

1. Accedi a Partner Center con un account Microsoft personale.
2. Apri **Account settings → Programs → Microsoft Edge → Get started**, se il modulo Edge non appare subito.
3. Inserisci il tuo Paese di residenza; scegli **Individual** se pubblichi come persona.
4. Scegli un nome editore disponibile, per esempio **Luca Magrini**. Compila i tuoi recapiti, leggi l’accordo e completa con **Finish**.
5. Attendi la verifica dell’account.

## 2. Prova il pacchetto in Edge

Estrai una copia dello ZIP. Apri `edge://extensions`, attiva **Modalità sviluppatore**, premi **Carica decompressa** e scegli la cartella contenente `manifest.json`.

Ricarica una pagina con un video HTML5 registrato e verifica:

- I pulsanti −10/+10 e −30/+30 cambiano la posizione correttamente.
- Il pulsante 2× cambia velocità; premendolo ancora torna al valore precedente.
- A e B delimitano il tratto da ripetere; disattivare Loop A–B interrompe la ripetizione.
- Un segnalibro salvato è disponibile dopo aver ricaricato lo stesso video.
- Le impostazioni si salvano e il popup controlla il video scelto.

I test automatici già eseguiti sono documentati in [VERIFICA.md](VERIFICA.md). La prova in Edge reale resta da eseguire prima dell’invio.

## 3. Crea la scheda nello store

Apri **Home → Workspaces → Edge → Create new extension**. Carica lo ZIP per lo store, quindi completa **Availability**, **Properties**, **Privacy** e **Store listings**. Usa **Public** per rendere la scheda ricercabile. Se disponibile, scegli una categoria di produttività e aggiungi la lingua italiana.

### Collegamenti

| Campo | Valore |
| --- | --- |
| Website | https://github.com/Berserk-hub150/SkipFlow |
| Support | https://github.com/Berserk-hub150/SkipFlow/issues |
| Privacy Policy URL | https://github.com/Berserk-hub150/SkipFlow/blob/main/PRIVACY.md |

### Descrizione italiana da incollare

SkipFlow aggiunge un telecomando ai video HTML5 per ritrovare un passaggio, seguire una lezione e controllare il ritmo della visione.

• Vai avanti e indietro con salti brevi e lunghi personalizzabili: inizialmente 10 e 30 secondi.
• Regola la velocità da 0,25× a 4×, torna a 1× o passa a 2× con un pulsante.
• Ripeti un intervallo con il loop A–B.
• Salva punti del video con un’etichetta e riaprili dal popup.
• Annulla l’ultimo salto e consulta la stima del tempo residuo.
• Sposta il pannello, usa le scorciatoie e disattiva i controlli sui siti che preferisci.
• Apri il mini player Picture-in-Picture o lo schermo intero quando consentito dal player.

Preferenze e segnalibri restano nel profilo locale del browser. SkipFlow non richiede un account e non include pubblicità, telemetria o servizi remoti.

Compatibilità e singole funzioni dipendono dal sito e dal player. Non tutti i video sono controllabili e le dirette prive di una timeline navigabile non consentono salti temporali.

### Privacy: testi per i campi

**Single purpose**

Controllare la riproduzione dei video HTML5 con salti temporali, regolazione della velocità, ripetizione A–B e segnalibri.

**Permesso storage**

Salvare nel profilo locale del browser le preferenze, i siti esclusi, l’ultima velocità scelta e i segnalibri dei video. Non viene usata la sincronizzazione cloud.

**Permesso activeTab**

Collegare il popup aperto dall’utente alla scheda corrente per individuare i video disponibili e inviare i comandi al player scelto.

**Accesso alle pagine / content scripts, se richiesto**

Rilevare i video HTML5 nelle pagine e nei frame accessibili, mostrarne i controlli e modificarne posizione, velocità e ripetizione. L’accesso ai file locali è facoltativo. Nessun contenuto della pagina viene inviato a server.

**Remote code**

No. Il codice eseguito dall’estensione è incluso nel pacchetto.

**Data usage**

Compila il questionario in coerenza con [PRIVACY.md](PRIVACY.md): preferenze e segnalibri sono locali; le identità dei video sono conservate come hash; titolo della pagina e dati del player vengono letti temporaneamente. Non ci sono raccolta su server, vendita, pubblicità o trasferimenti a terzi. Le risposte devono riflettere anche l’eventuale definizione di accesso o trattamento locale mostrata nel modulo.

### Logo e immagini

Carica **icons/icon128.png** come logo: rispetta il minimo di 128×128. Gli screenshot sono facoltativi; se li aggiungi, usa catture reali a 640×480 o 1280×800.

### Note per la certificazione

L’estensione non richiede credenziali proprie. Per provarla, aprire una pagina accessibile con un video HTML5 registrato, ricaricarla dopo l’installazione e avviare il video. Verificare i salti ±10/±30 secondi, la velocità 2× e il ripristino, il loop A–B e un segnalibro. Il pulsante dell’estensione apre il telecomando completo. Le pagine interne del browser e i player con restrizioni possono impedire l’iniezione o singole funzioni.

## 4. Invia

Dopo la prova in Edge e il completamento dei campi, controlla l’anteprima e invia alla certificazione. La pubblicazione dipende dall’esito della revisione Microsoft.

## Riferimenti ufficiali

Verificati il 18 ottobre 2026:

- [Registrazione e gratuità del programma Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account).
- [Procedura e requisiti della scheda](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).
