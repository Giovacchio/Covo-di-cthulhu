# 🐙 Covo di Cthulhu

App di coppia con lista film, estrazione casuale, votazioni, watchlist, date planner e recensioni.
Dati sincronizzati in tempo reale tra i telefoni via Firebase.

---

## Guida passo passo

### STEP 1 — Crea il progetto Firebase

1. Vai su **https://console.firebase.google.com**
2. Clicca **Aggiungi progetto** → nome: `covo-di-cthulhu` → continua
3. Disattiva Google Analytics (non serve) → **Crea progetto**
4. Aspetta che sia pronto → **Continua**

### STEP 2 — Attiva Authentication

1. Nel menu a sinistra clicca **Authentication** → **Inizia**
2. Nella tab **Metodo di accesso** clicca **Google**
3. Attivalo con il toggle, scegli una email di supporto (la tua) → **Salva**

### STEP 3 — Crea il database Firestore

1. Nel menu a sinistra clicca **Firestore Database** → **Crea database**
2. Scegli la posizione più vicina (es. `europe-west6`) → **Avanti**
3. Scegli **Avvia in modalità test** → **Crea**
4. Una volta creato, vai su tab **Regole** e incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /covo/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Clicca **Pubblica**

### STEP 4 — Registra l'app web e copia le credenziali

1. Dalla home del progetto Firebase, clicca l'icona **</>** (Web)
2. Nome app: `covo-web` → **Registra app** (NON attivare Firebase Hosting)
3. Ti mostra un blocco `firebaseConfig` — copia i valori
4. Apri `src/firebase.js` e incolla i valori al posto dei `"INCOLLA_QUI"`

### STEP 5 — Crea la repository su GitHub

1. Vai su **https://github.com/new**
2. Nome: `covo-di-cthulhu` → **Create repository**
3. Sul tuo PC nella cartella del progetto:

```bash
git init
git add .
git commit -m "primo commit"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/covo-di-cthulhu.git
git push -u origin main
```

### STEP 6 — Attiva GitHub Pages

1. Nella repo vai su **Settings → Pages**
2. Source: seleziona **GitHub Actions**
3. Il workflow è già incluso nel progetto
4. Dopo 1-2 minuti il sito sarà live su: `https://TUO_USERNAME.github.io/covo-di-cthulhu/`

### STEP 7 — Aggiungi il dominio a Firebase Auth

1. Torna su **Firebase Console → Authentication → Settings → Domini autorizzati**
2. Clicca **Aggiungi dominio**: `TUO_USERNAME.github.io`
3. Senza questo passo il login Google non funzionerà!

### STEP 8 — APK con PWABuilder (opzionale)

1. Vai su **https://www.pwabuilder.com**
2. Inserisci l'URL di GitHub Pages
3. Package for stores → Android → Download
4. Installa l'APK o firmalo con Android Studio

---

## Sviluppo locale

```bash
npm install
npm run dev
```

## Struttura

```
src/
  firebase.js   ← credenziali Firebase (DA COMPILARE)
  App.jsx       ← tutta l'app
  main.jsx      ← entry point
```
