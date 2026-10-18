# SkipFlow

<p><img src="icons/icon128.png" alt="Logo SkipFlow" width="88" height="88"></p>

**[Scarica SkipFlow 1.0.0 per Chrome / Edge](https://github.com/Berserk-hub150/SkipFlow/raw/refs/heads/main/downloads/SkipFlow-1.0.0.zip)** · [Installazione](#installa-in-chrome-windows-macos-o-linux) · [Privacy](PRIVACY.md) · [Verifiche](VERIFICA.md)

**Pubblicazione gratuita su Edge:** [guida e testi per lo store](PUBLISH_EDGE.md) · [ZIP per lo store](https://github.com/Berserk-hub150/SkipFlow/raw/refs/heads/main/downloads/SkipFlow-edge-store-1.0.0.zip)

**Controlla ogni secondo.** Un’estensione Chrome / Edge con pulsanti grandi per andare avanti e indietro nei video, velocità personalizzata e strumenti per ripassare un passaggio.

Implementazione originale ispirata all’idea di [Video Speed Controller](https://github.com/igrigorik/videospeed). Il progetto di riferimento dispone già di scorciatoie per saltare avanti e indietro: SkipFlow dà più spazio ai pulsanti di navigazione e aggiunge un flusso per studio, loop e segnalibri. Nessun suo codice o asset è stato copiato. Nessuna affiliazione.

## Installa in Chrome (Windows, macOS o Linux)

1. Estrai **tutto** lo ZIP, per esempio in `Desktop/SkipFlow`. Non lasciare i file dentro lo ZIP.
2. Nella barra degli indirizzi apri `chrome://extensions`.
3. Attiva **Modalità sviluppatore**, in alto a destra.
4. Premi **Carica estensione non pacchettizzata**.
5. Seleziona la cartella **SkipFlow che contiene `manifest.json`**. Se hai due cartelle annidate con lo stesso nome, apri quella interna.
6. Dal pulsante puzzle di Chrome, fissa **SkipFlow** con la puntina.
7. **Ricarica le pagine video già aperte.** Avvia un video: appare il pannello SkipFlow; il pulsante nella barra apre il telecomando completo.

Per Edge usa `edge://extensions`, poi **Modalità sviluppatore → Carica decompressa** e seleziona la stessa cartella. È richiesto un browser basato su Chromium 116 o successivo. Non è un pacchetto per Firefox o Safari.

Non occorrono Python, Node, npm, compilazione o account per installare l’estensione. Non serve avviare file `.exe` e non servono privilegi amministratore. Mantieni la cartella estratta: il browser carica l’estensione da lì.

## Che cosa trovi

| Controllo | Risultato |
| --- | --- |
| **−10 / +10** | Salto breve, modificabile da 1 a 300 secondi. |
| **−30 / +30** | Salto lungo, modificabile da 1 a 600 secondi. |
| **↶ Annulla salto** | Torna alla posizione prima dell’ultimo salto (massimo 20). |
| **− / +, 1×, 2×** | Velocità da 0.25× a 4×. Il pulsante 2× sul video torna alla velocità precedente con un secondo clic. |
| **Vai a…** nel popup | Inserisci secondi, `mm:ss` o `hh:mm:ss`. |
| **A · Inizio, B · Fine** | Segna un intervallo; impostare B attiva la ripetizione. Con **Loop A–B** la disattivi o riattivi. |
| **☆ Segna / Salva** | Salva un punto del video. Dal popup puoi assegnargli un nome, ritrovarlo e cancellarlo. |
| **PiP / Mini player** | Apre Picture-in-Picture, se consentito dal player e dal browser. |
| **⛶ Intero** | Porta il contenitore del video a schermo intero. |
| **Restano…** | Stima il tempo di visione residuo alla velocità attuale. |
| **Selettore video** nel popup | Sceglie il video da controllare, anche tra frame incorporati accessibili all’estensione. |

**Studio ▾** sul pannello apre loop, segnalibri e altre funzioni. **⠿** sposta il pannello. **×** lo nasconde: riaprilo dal popup o con `Shift+V`. Su player piccoli il pannello compatta alcuni controlli: trovi sempre tutti i pulsanti nel popup.

In **Impostazioni** cambi intervalli, passo velocità, velocità iniziale, posizione e trasparenza. Puoi ricordare l’ultima velocità, spegnere le scorciatoie o disattivare SkipFlow per un sito. Le preferenze si aggiornano anche nelle schede già aperte; la velocità iniziale viene applicata al prossimo video/caricamento.

## Scorciatoie

| Tasti | Azione |
| --- | --- |
| `Shift + ← / →` | Indietro / avanti di un salto breve. |
| `Shift + ↓ / ↑` | Riduci / aumenta la velocità. |
| `Shift + R` | Torna a 1×. |
| `Shift + G` | Attiva 2× / torna alla velocità precedente. |
| `Shift + A` / `Shift + B` | Segna inizio / fine del loop. |
| `Shift + L` | Attiva / disattiva il loop. |
| `Shift + M` | Salva un segnalibro. |
| `Shift + U` | Annulla l’ultimo salto. |
| `Shift + V` | Mostra / nasconde il pannello. |

I comandi restano inattivi mentre scrivi in input, textarea, select e aree di testo modificabili. Nei player incorporati clicca prima sul video per dare il focus al suo frame. Alcuni siti possono intercettare le stesse combinazioni: usa il popup o disattiva le scorciatoie nelle preferenze.

## Prova senza cercare un video

Nei dettagli di SkipFlow in `chrome://extensions` abilita **Consenti l’accesso agli URL dei file**. Apri `demo/index.html`: il filmato di prova è incluso e puoi scegliere anche un tuo video locale. Ricarica la demo se era già aperta quando hai abilitato l’accesso.

## Compatibilità e limiti

- Lavora sui video HTML5 raggiungibili dal DOM: include elementi aggiunti dopo il caricamento, frame con accesso consentito e shadow DOM aperti. Non promette compatibilità con ogni sito.
- Pagine interne come `chrome://…`, Chrome Web Store, player non HTML5, shadow DOM chiusi e frame con restrizioni possono impedire l’iniezione o alcuni comandi. Le live senza una timeline DVR non possono essere mandate avanti o indietro.
- Picture-in-Picture e schermo intero dipendono dalle API del browser e dalle regole del sito. In fullscreen nativo del solo elemento `<video>` il pannello potrebbe non apparire; usa il fullscreen di SkipFlow sul contenitore. I controlli nel mini player PiP restano quelli nativi del browser.
- Un sito può ripristinare la propria velocità. SkipFlow non cerca di aggirare protezioni, paywall, DRM o restrizioni del player.
- Il loop A–B usa gli eventi temporali del player, quindi **non è un montaggio preciso al fotogramma**. Il loop si interrompe cambiando sorgente, pagina o disattivando l’estensione.
- I segnalibri persistono per identità pagina/video. Cambiare URL, sostituire il file del corso o riordinare più player con sorgenti `blob:` può renderli non ritrovabili. Non sono un backup. Sono conservati al massimo 50 punti per video e 100 video; quando superi il limite, i video meno recentemente modificati vengono rimossi.
- Disattivare SkipFlow ferma controlli e loop ma lascia la velocità del player al valore corrente. Puoi tornare a 1× prima di disattivarlo.
- Questa versione viene consegnata come estensione da caricare manualmente: **non è pubblicata sul Chrome Web Store**.

## Privacy e permessi

Nessun server, account, tracciamento o libreria remota. Preferenze e segnalibri restano in `chrome.storage.local`. L’accesso alle pagine permette di rilevare e controllare i video. Leggi [PRIVACY.md](PRIVACY.md) per i dettagli.

## Sviluppo

Il codice eseguito nel browser è JavaScript/CSS/HTML senza dipendenze o build. `shared/core.js` contiene logica condivisa, `content.js` rileva i video e mostra il pannello, `ui/` contiene popup e impostazioni. Un piccolo service worker calcola soltanto le identità hash dei segnalibri sulle pagine HTTP che non espongono Web Crypto; non esegue attività periodiche.

```sh
# Per i test, con Node 20+:
npm install
npm test
# Per i test in Chromium reale:
npx playwright install chromium
npm run test:browser
# ZIP riproducibile con Python 3:
npm run package
```

I test Chromium usano una vera estensione e un video locale generato; non verificano automaticamente siti di terze parti. Vedi [VERIFICA.md](VERIFICA.md) per gli esiti del pacchetto consegnato.

## Licenza

[MIT](LICENSE). Autore del progetto: Luca Magrini.
