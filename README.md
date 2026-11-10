# Sposta l’auto

Prototipo React/Vite ottimizzato per iPhone. Salva localmente il parcheggio, acquisisce il GPS, ricava l’indirizzo con OpenStreetMap/Nominatim e consulta i dati AMIU tramite una Netlify Function.

## Avvio locale

```bash
npm install
npm run dev
```

Per provare anche la Function in locale, installare la Netlify CLI ed eseguire `netlify dev`.

## Pubblicazione su Netlify

1. Caricare questa cartella in un repository GitHub.
2. In Netlify scegliere **Add new project > Import an existing project**.
3. Selezionare il repository. Netlify leggerà automaticamente `netlify.toml`.
4. Pubblicare. Il comando è `npm run build` e la cartella risultante è `dist`.
5. Aprire l’URL HTTPS assegnato da Netlify su Safari iPhone e autorizzare la posizione.

## Controlli dopo il deploy

- `/api/amiu` deve restituire JSON.
- In fondo alla schermata deve apparire “Dati AMIU: aggiornati online”.
- Il GPS richiede HTTPS e il consenso dell’utente.
- Gli avvisi sono per ora solo visualizzati: le notifiche a sito chiuso richiederanno PWA + Web Push.
