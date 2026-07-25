# ADR – Temă – Infrastructură SecureInbox

SecureInbox este aplicația demo folosită în tema de infrastructură. Această
versiune a fost desprinsă din proiectul de licență și redusă intenționat la un
flux local, ușor de explicat și reprodus.

## Stadiul curent

Această etapă conține doar aplicația:

- frontend React + Vite;
- backend Express;
- MongoDB local;
- autentificare reală cu email și parolă;
- JWT pentru păstrarea sesiunii;
- dashboard, inbox și pagina de detaliu a unui mesaj;
- citirea mesajelor și a rezultatelor de scanare din MongoDB;
- notificări demo pentru acțiunile care ar modifica datele.

Nu sunt folosite Gmail, Google OAuth, MongoDB Atlas, Ollama sau alte servicii
externe. Pagina și colecția pentru reguli au fost eliminate. Docker,
monitorizarea, provisioning-ul, backup-ul și seed-ul idempotent vor fi adăugate
în etapele următoare.

## Structură

```text
.
├── backend/
│   ├── src/
│   │   ├── config/        # variabile de mediu
│   │   ├── controllers/   # transformă requesturile în răspunsuri HTTP
│   │   ├── database/      # conexiunea la MongoDB
│   │   ├── middlewares/   # autentificare, validare și erori
│   │   ├── models/        # schemele MongoDB: User, Email și Scan
│   │   ├── routes/        # URL-urile API-ului
│   │   ├── services/      # logica aplicației
│   │   ├── app.js         # configurarea Express
│   │   └── server.js      # conectare la DB și pornirea serverului
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/           # cereri HTTP spre backend
│       ├── components/    # componente React reutilizabile
│       ├── context/       # starea autentificării
│       ├── hooks/         # hook-uri React
│       ├── lib/           # funcții și constante comune
│       ├── pages/         # Login, Dashboard, Inbox, Email Detail
│       └── utils/         # funcții ajutătoare
└── docs/
```

## Cerințe pentru dezvoltare locală

- Node.js 24;
- npm;
- MongoDB Community Edition;
- două terminale.

Pe macOS, MongoDB poate fi instalat cu Homebrew:

```bash
brew tap mongodb/brew
brew trust mongodb/brew
brew install mongodb/brew/mongodb-community
brew services start mongodb-community
```

Homebrew 6 cere încredere explicită pentru tap-urile din afara organizației
Homebrew. Formula MongoDB Community face referire la mai multe formule din
același repository, iar Homebrew trebuie să le poată evalua când rezolvă
dependențele. Comanda acordă încredere întregului tap oficial MongoDB, inclusiv
formulelor sale viitoare.

Verificare:

```bash
mongosh "mongodb://127.0.0.1:27017"
```

În shell-ul MongoDB, comanda `ping` trebuie să răspundă cu `ok: 1`:

```javascript
db.adminCommand({ ping: 1 })
```

Ieșire din `mongosh`:

```javascript
exit
```

Documentație oficială:

- [Instalare MongoDB Community](https://www.mongodb.com/docs/manual/administration/install-community/)
- [MongoDB Shell](https://www.mongodb.com/docs/mongodb-shell/)
- [Node.js](https://nodejs.org/en/download)

## Configurare

Din rădăcina repository-ului:

```bash
cp backend/.env.example backend/.env.development.local
openssl rand -hex 32
```

Ultima comandă generează o valoare aleatorie pentru `JWT_SECRET`. Copiază
rezultatul în `backend/.env.development.local`:

```dotenv
PORT=5500
NODE_ENV=development
DB_URI=mongodb://127.0.0.1:27017/secureinbox_demo
JWT_SECRET=valoarea-generata-cu-openssl
JWT_EXPIRES_IN=8h
FRONTEND_APP_URL=http://localhost:5173
```

Fișierul local nu se urcă în Git. Fișierul `.env.example` documentează doar
numele variabilelor și valori sigure de exemplu.

## Pornire locală

Instalează dependențele:

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

Terminalul 1:

```bash
npm run dev --prefix backend
```

Terminalul 2:

```bash
npm run dev --prefix frontend
```

Deschide `http://localhost:5173`, alege `Register` și creează un cont fictiv.
Parola trebuie să aibă minimum opt caractere, literă mică, literă mare, cifră
și caracter special.

La acest pas, contul este salvat în MongoDB, dar Inbox-ul rămâne gol. Următoarea
etapă va adăuga seed-ul care inserează mesaje fictive o singură dată pentru
fiecare cont.

## Verificări

Cu backend-ul pornit:

```bash
curl http://localhost:5500/api/v1/health
curl http://localhost:5500/api/v1/ready
```

`health` verifică dacă procesul Express rulează. `ready` verifică suplimentar
dacă backend-ul poate comunica cu MongoDB.

Verificările automate:

```bash
npm run lint --prefix backend
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

## Decizii pentru demo

- Register și Login sunt funcționale pentru a demonstra autentificarea și
  separarea datelor pe utilizator.
- Mesajele și scanările sunt citite real din MongoDB.
- Sync, Refresh, Scan Again, Mark Safe și Mark Phishing nu modifică datele;
  afișează un mesaj clar că aplicația este un demo.
- Căutarea, filtrele, paginarea și navigarea sunt funcționale.
- Toate datele viitoare de seed vor fi fictive.

Vezi și [arhitectura aplicației](docs/architecture.md).
