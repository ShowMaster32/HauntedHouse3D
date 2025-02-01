# HauntedHouse3D

## Descrizione

**HauntedHouse3D** è un'applicazione 3D interattiva che simula una casa infestata. L'utente può esplorare la casa, interagire con vari oggetti e vivere un'esperienza immersiva grazie all'uso di WebGL per la grafica 3D. Il progetto è stato sviluppato come parte di un corso di Computer Graphics all'Università di Bologna.

### Caratteristiche

- **Visualizzazione 3D in proiezione prospettica**: La scena viene resa con una telecamera prospettica, fornendo un'esperienza realistica.
- **Illuminazione dinamica e ombre**: L'applicazione utilizza fonti di luce dinamiche e calcoli delle ombre per creare un'atmosfera inquietante.
- **Texture mapping avanzato**: Gli oggetti della scena sono dotati di texture realistiche, migliorando la qualità visiva.
- **Interazione utente**: L'utente può esplorare l'ambiente 3D con la tastiera (tasti WASD per muoversi) e il mouse per controllare la visuale. È possibile accendere e spegnere luci e interagire con oggetti specifici.
- **Pannello di controllo interattivo**: Attraverso il tasto `P`, è possibile aprire un pannello di controllo che consente di attivare o disattivare ombre, riflessioni e il contatore di FPS.
- **Supporto per dispositivi mobili**: Il progetto è ottimizzato per l'uso su dispositivi mobili, con il supporto per gesture touch come swipe e pinch-to-zoom.
- **Effetti audio**: Suoni inquietanti vengono riprodotti casualmente durante l'esplorazione per intensificare l'atmosfera.

## Requisiti

- **Browser moderno**: Il progetto è stato testato su Chrome, ma può funzionare anche su altri browser che supportano WebGL.
- **Node.js e npm**: Per eseguire il server locale tramite il plugin *Live Server* di Visual Studio Code.

## Installazione

1. **Clone del repository**:
    ```bash
    git clone https://github.com/tuo-utente/HauntedHouse3D.git
    cd HauntedHouse3D
    ```

2. **Avvio del server locale**:
   - Apri il progetto in *Visual Studio Code*.
   - Installa il plugin **Live Server**.
   - Avvia il server locale tramite il comando "Go Live" disponibile nel plugin.

## Utilizzo

- **Movimento**: Utilizza i tasti `W`, `A`, `S`, `D` per muovere il personaggio.
- **Interazione**: Premi `F` per accendere e spegnere le luci quando sei vicino agli interruttori.
- **Pannello di controllo**: Premi `P` per aprire il pannello di controllo e attivare/disattivare ombre, riflessioni e il contatore di FPS.
- **Esperienza audio**: Alcuni oggetti interattivi nella casa, come una bambola o un orologio a pendolo, emettono suoni inquietanti quando ti avvicini.

## Struttura del progetto

- **`index.html`**: Il file principale HTML che gestisce la struttura della pagina e l'integrazione con WebGL.
- **`main.css`**: Contiene tutti gli stili per rendere l'interfaccia coerente e responsiva.
- **`/models`**: Include i modelli 3D (in formato OBJ e MTL) utilizzati nella scena.
- **`/textures`**: Include tutte le texture mappate sugli oggetti 3D.
- **`/sounds`**: Contiene i file audio utilizzati per l'atmosfera.

## Tecnologie utilizzate

- **WebGL**: Utilizzato per il rendering della grafica 3D direttamente nel browser.
- **Three.js**: Libreria utilizzata per semplificare l'uso di WebGL e gestire le scene 3D.
- **JavaScript**: Linguaggio di scripting principale per gestire logiche di interazione, animazione e rendering.
- **HTML5/CSS3**: Struttura della pagina e stili responsivi.
- **GLSL**: Utilizzato per la gestione avanzata del rendering come ombre e trasparenze.

## Funzionalità aggiuntive (opzionali)

- **Rendering avanzato**: È possibile attivare il rendering avanzato, che include effetti di riflessione e ombre più realistiche, tramite il pannello di controllo.
- **Effetti speciali**: L'orologio a pendolo e la bambola della casa sono oggetti interattivi che attivano suoni particolari in determinate condizioni (ad esempio, quando la luce è spenta).

## Problemi conosciuti

- Alcuni modelli potrebbero non caricare correttamente tutte le texture se i percorsi non sono configurati correttamente nel file `.mtl`.
- Le performance possono variare a seconda del dispositivo mobile o browser in uso.

## Conclusioni

**HauntedHouse3D** è stato sviluppato come progetto individuale per il corso di *Computer Graphics* e soddisfa tutti i requisiti proposti dal docente. L'obiettivo principale era creare un'applicazione interattiva in 3D che sfruttasse WebGL per gestire la grafica e l'interazione in tempo reale.

## Crediti

- **Modelli 3D**: Creati tramite Blender e risorse esterne gratuite.
- **Suoni e texture**: Prelevati da fonti royalty-free o creati appositamente per il progetto.
