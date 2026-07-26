# Arhitectura aplicației demo

## Fluxul unei cereri

```text
Browser
  |
  | HTTP / JSON
  v
React + Vite (localhost:5173)
  |
  | proxy local pentru /api/v1
  v
Express API (localhost:5500)
  |
  | Mongoose
  v
MongoDB (localhost:27017, baza secureinbox_demo)
```

În dezvoltare, proxy-ul din Vite redirecționează cererile care încep cu
`/api/v1` către backend. Acesta este doar proxy-ul local de dezvoltare. Reverse
proxy-ul cerut în tema de infrastructură va fi adăugat ulterior.

## Date

Aplicația folosește trei colecții:

- `users`: conturile demo și hash-ul parolei;
- `emails`: mesajele fictive ale fiecărui utilizator;
- `scans`: scorul, verdictul și regulile deterministe asociate mesajului.

Fiecare email și scan are un `userId`. Backend-ul aplică acest identificator la
interogări, astfel încât un utilizator să nu poată citi datele altui cont.

Schema `Email` are un index unic format din `userId + demoId`, iar `Scan`
folosește `userId + emailId`. Seed-ul face `upsert` pe aceste chei, astfel încât
aceeași înregistrare nu poate fi inserată de două ori pentru același utilizator.

Seed-ul rulează automat la Register și Login. Poate fi pornit și manual cu
`npm run seed --prefix backend`, caz în care creează sau reutilizează contul
demo configurat prin variabilele `DEMO_USER_*`.

## Autentificare

La înregistrare, parola este transformată într-un hash cu `bcryptjs`; parola în
clar nu este salvată. După register sau login, backend-ul emite un JWT.
Frontend-ul trimite token-ul în antetul `Authorization` pentru rutele protejate.

JWT-ul demonstrează o sesiune locală, nu o conectare reală la Google.

## Limita etapei curente

Nu există încă Docker Compose, reverse proxy, monitorizare, alertare,
provisioning sau backup/restore. Aceste componente vor fi construite peste
aplicația locală verificată, fără a amesteca problemele de aplicație cu cele de
infrastructură.
