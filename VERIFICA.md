# Verifiche del pacchetto SkipFlow 1.0.0

Data: **17 ottobre 2026**.

## Verifiche superate

**`npm test`: 21 test superati, 0 falliti.** Runtime Node 24.19.0; jsdom 26.1.0.

- 5 test di logica: limiti dei salti e intervalli seekable; parsing dei timestamp; normalizzazione delle preferenze; riconoscimento delle scorciatoie; identità e contenuto dei segnalibri.
- 16 test d’integrazione del DOM: pannello e pulsanti, annulla salto, live senza timeline, velocità e 2× reversibile, loop A–B, protezione dei campi di testo, persistenza dei segnalibri, fallback hash per HTTP, scoperta dei video aggiunti e shadow DOM aperto, disattivazione per sito e globale, preferenze aggiornate nelle schede, popup con più frame simulati, timestamp, etichette trattate come testo e cancellazione dei segnalibri, impostazioni, mostra/nascondi e limite di archiviazione.
- Sintassi JavaScript verificata con `node --check`.
- Manifest JSON letto correttamente e presenza verificata di tutti i 10 file referenziati direttamente: script, pagine e icone.
- Dimensioni delle icone PNG verificate: 16, 32, 48 e 128 pixel.
- Filmato originale della demo verificato con ffprobe: WebM/VP9, 960 × 540, 60 secondi, senza audio.
- L’archivio consegnato viene controllato per integrità e per escludere dipendenze di sviluppo e file temporanei.

## Limiti di queste verifiche

I test DOM eseguono gli script reali dell’estensione, del popup e delle impostazioni, ma **simulano le API del browser, gli elementi multimediali e lo scambio di messaggi**. Non verificano la decodifica reale di un video né l’effettiva iniezione dell’estensione in frame di siti esterni.

È stato preparato anche `tests/browser.cjs`, destinato a una vera istanza Chromium con l’estensione caricata. **Non è stato possibile eseguirlo fino alle verifiche dell’estensione**: il browser si arresta all’avvio perché l’ambiente di esecuzione non consente i socket Unix richiesti da Chromium. Non viene dichiarato superato.

Restano da provare in un browser reale: installazione/caricamento del manifest, aspetto e posizionamento, permessi e gesto utente per Picture-in-Picture e fullscreen, comportamento sui singoli siti (inclusi YouTube e Moodle), iframe reali e URL di file locali. Non viene dichiarata compatibilità verificata con ogni player.

## Prova manuale suggerita

1. Carica la cartella come indicato in `INSTALLA.txt` e ricarica una pagina video.
2. Prova −10/+10 e −30/+30, anche a inizio e fine video; annulla un salto.
3. Passa a 1.5×, attiva 2× dal pannello e premilo di nuovo per tornare a 1.5×.
4. Segna A e B a qualche secondo di distanza e controlla che l’intervallo si ripeta.
5. Crea un segnalibro, ricarica la stessa pagina e torna al punto salvato dal popup.
6. Cambia gli intervalli nelle impostazioni e prova nuovamente i pulsanti.
7. Controlla mini player e fullscreen; se il sito ne limita l’uso dal popup, prova i pulsanti direttamente sul video.
8. Disattiva il sito o l’estensione e verifica che pannello, loop e scorciatoie si fermino.
