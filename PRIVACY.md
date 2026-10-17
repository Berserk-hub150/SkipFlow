# Privacy di SkipFlow 1.0

SkipFlow non contiene telemetria, pubblicità, servizi remoti né richieste di rete proprie. Il caricamento dei video resta gestito dai siti che visiti.

## Dati locali

- Le preferenze, i siti esclusi e l’ultima velocità scelta vengono conservati in `chrome.storage.local`, nello spazio locale del profilo del browser. Non usiamo `storage.sync`.
- I segnalibri contengono il tempo e l’etichetta scelta, con un massimo di 50 punti per video e 100 video conservati. Gli elementi dei video meno recentemente modificati vengono eliminati quando viene superato questo limite.
- La chiave dei segnalibri è un hash SHA-256 dell’indirizzo normalizzato della pagina e dell’identità del video. Gli indirizzi in chiaro e gli URL firmati dei flussi non vengono conservati. Un hash non rende anonimi tutti gli indirizzi ipotizzabili.
- Il titolo della pagina e le informazioni del player vengono letti temporaneamente per mostrarti il video nel popup, senza invio a server.

I segnalibri sono locali: non sono un backup e non si trasferiscono automaticamente ad altri dispositivi. Puoi cancellare un punto dal popup. Disinstallare l’estensione rimuove i dati del suo spazio di archiviazione.

## Permessi

| Accesso | Motivo |
| --- | --- |
| `storage` | Salvare preferenze e segnalibri locali. |
| `activeTab` | Collegare il popup alla scheda su cui hai cliccato. |
| Script su pagine HTTP/HTTPS e frame incorporati | Rilevare gli elementi `<video>`, leggere posizione/durata/velocità e mostrare il pannello. Il browser può descrivere questo accesso come lettura e modifica dei dati dei siti. |
| URL `file://` (facoltativo, da abilitare nei dettagli) | Controllare file e pagine HTML locali. |

Non vengono richiesti microfono, fotocamera, download, cronologia, cookie o accesso agli appunti. Le scorciatoie riconoscono soltanto i comandi documentati e non vengono conservate; sono ignorate nei campi di testo.
