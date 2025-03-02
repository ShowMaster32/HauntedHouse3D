# Progetto HauntedHouse - Computer Graphics A.A. 2023/2024

## Descrizione
HauntedHouse è un'applicazione 3D interattiva che simula l'esplorazione di una casa infestata. L'utente può muoversi nello spazio e interagire con diversi elementi dell'ambiente come interruttori della luce e oggetti inquietanti.

## Requisiti
- Browser con supporto WebGL 2
- Consigliato: Google Chrome (ultima versione)
- Supporto per Web Audio API
- Supporto per Pointer Lock API

## Struttura del Progetto
```
project/
│
├── index.html              # File HTML principale
├── main2.css               # File CSS per lo stile
│
├── shaders/                # Cartella per gli shader GLSL
│   ├── vertex-shader.glsl
│   ├── fragment-shader.glsl
│   ├── shadow-vertex-shader.glsl
│   └── shadow-fragment-shader.glsl
│
├── js/                     # Cartella per i file JavaScript
│   ├── shader-loader.js    # Caricamento degli shader
│   ├── renderer.js         # Rendering WebGL
│   ├── physics.js          # Sistema fisico
│   ├── audio.js            # Gestione audio
│   ├── input.js            # Gestione input utente
│   ├── game.js             # Logica di gioco
│   ├── main.js             # Inizializzazione
│   ├── constants.js        # Costanti di gioco
│   ├── math-utils.js       # Utility matematiche
│   └── shader-test.js      # Test degli shader
│
├── lib/                    # Librerie consentite
│   ├── webgl-utils.js
│   ├── m4.js
│   ├── glm_utils.js
│   ├── mesh_utils.js
│   ├── dat.gui.js
│   └── jquery-3.6.0.js
│
├── models/                 # Modelli 3D (OBJ e MTL)
├── textures/               # Texture
├── sounds/                 # File audio
└── images/                 # Immagini UI
```

## Istruzioni per l'esecuzione
1. Assicurarsi che tutti i file siano nella struttura corretta
2. Aprire il file `index.html` con un server web locale
   - Consigliato: utilizzare Live Server di Visual Studio Code
   - In alternativa: Python SimpleHTTPServer (`python -m http.server`)
3. Fare clic sul pulsante "START" per iniziare l'esplorazione

## Comandi
- **W, A, S, D**: Movimento del personaggio
- **Mouse**: Rotazione della visuale
- **F**: Accensione/spegnimento luci
- **P**: Apri/chiudi pannello di controllo
- **Spazio**: Salto (se implementato)

## Funzionalità Principali
1. **Rendering 3D**: Proiezione prospettica con WebGL
2. **Illuminazione**: Sistema di illuminazione con ombre
3. **Texture**: Mapping delle texture su oggetti 3D
4. **Interazione**: Controlli utente e interazione con l'ambiente
5. **Mobile**: Supporto per dispositivi touch
6. **Audio**: Sistema audio spaziale per l'atmosfera
7. **Rendering Avanzato**: Tecniche di ombre, riflessi e altro (attivabili dal pannello)

## Pannello di Controllo
Premere **P** per accedere al pannello di controllo che permette di:
- Attivare/disattivare le ombre
- Attivare/disattivare i riflessi
- Attivare/disattivare il contatore FPS
- Attivare/disattivare il rendering avanzato

## Caratteristiche Tecniche
- Utilizzo di WebGL nativo per il rendering 3D
- Shader GLSL personalizzati per effetti visivi
- Sistema di caricamento dinamico di mesh OBJ
- Gestione completa di texture e materiali
- Sistema fisico di collisione per la navigazione
- Gestione della luce con effetti di sfarfallio

## Dispositivi Mobili
L'applicazione supporta dispositivi mobili con:
- Controlli touch per movimento e rotazione
- Rilevamento del pinch per lo zoom
- Interfaccia utente adattiva

## Tecniche Avanzate Implementate
- Shadow mapping per la proiezione di ombre dinamiche
- Effetti di attenuazione della luce
- Gestione della trasparenza
- Effetti di riflesso per superfici lucide
- Caricamento asincrono delle risorse

## Note di Implementazione
- L'applicazione è stata sviluppata utilizzando esclusivamente le librerie consentite dal docente
- Non sono state utilizzate librerie di alto livello come Three.js o Babylon.js
- Tutte le funzionalità sono implementate usando WebGL nativo e librerie di utilità permesse