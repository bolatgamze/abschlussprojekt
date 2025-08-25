# Abschlussprojekt – Dokumentation

## Backend

Das Backend wurde mit **Spring Boot** entwickelt.
Die wichtigsten Teile sind:

### 1. Authentifizierung (`/api/auth`)

* **Register** (`POST /api/auth/register`)
  Neue Benutzer können sich registrieren. Benutzername und Passwort werden in der Datenbank gespeichert, das Passwort wird mit `BCryptPasswordEncoder` verschlüsselt.
* **Login** (`POST /api/auth/login`)
  Ein Benutzer kann sich mit seinen Zugangsdaten anmelden. Es wird geprüft, ob Benutzername und Passwort passen.
* **Profil** (`GET /api/auth/profile/{userId}`)
  Zeigt Statistiken, letzte Spiele und Bestleistungen eines Spielers. (Die Logik greift auf das `GameSessionRepository` zu.)

### 2. Datenbank & Entities

* **User**: Enthält `id`, `username`, `passwordHash`.
* **GameSession**: Speichert gespielte Runden, Punktzahl, Datum, etc.
* Die Datenbank ist **PostgreSQL**. Migrationen werden über **Flyway** verwaltet.

### 3. Security

* CSRF ist deaktiviert (da wir ein SPA-Frontend haben).
* Endpunkte `/api/auth/**` sind öffentlich erreichbar.
* Passwörter werden mit `BCrypt` gehasht.

---

## Frontend

Das Frontend wurde mit **React + Vite** erstellt. Wir nutzen **react-router-dom** für die Navigation.

### 1. Navigation (`App.jsx`)

* **Home** (`/`) – Startseite mit Buttons zu den Spielen.
* **Login** (`/login`) – Anmelden oder Registrieren.
* **Profil** (`/profile/:userId`) – Zeigt die Statistiken des eingeloggten Benutzers.
* **Spielen** (`/spielen`) – Auswahl der Spielerfigur (Katze oder Hund).
* **Spiele**:

    * `spiel1/:theme` → **TicTacToe**
    * `spiel2/:theme` → **Wort-Raten** (noch nicht fertig)
    * `spiel3/:theme` → **Pac-Pet** (noch nicht fertig)

### 2. Login / Register

* Über das Formular kann man sich registrieren oder anmelden.
* Nach erfolgreichem Login wird man zum Profil (`/profile/:userId`) weitergeleitet.

### 3. Profilseite

* Holt Daten von `/api/auth/profile/:userId`.
* Zeigt:

    * letzte Spiele
    * Bestleistungen
    * Statistiken (z.B. gespielte Spiele, Durchschnitt, Lieblingsthema)

### 4. Spiele

* **TicTacToe**

    * Spieler wählt Katze 🐱 oder Hund 🐶.
    * Gegner ist der Computer, der Fische 🐟 oder Knochen 🦴 setzt.
    * Gewinner wird automatisch erkannt (3 in einer Reihe).

* **Wort-Raten** (Platzhalter)

* **Pac-Pet** (Platzhalter)

---

## Zusammenfassung

Das Projekt besteht also aus zwei Hauptteilen:

* **Backend**: Verwaltung von Benutzern, Spielen und Statistiken (Spring Boot + PostgreSQL).
* **Frontend**: Darstellung der Oberfläche, Spielelogik, Login/Register und Profil (React + Vite).

Die Verbindung erfolgt über **REST-API**.
Das Projekt ist modular aufgebaut: Jeder Teil (Auth, Spiele, UI) kann erweitert werden.

---

## ToDo (für die Zukunft)

* JWT-Authentifizierung statt einfachem Login.
* Spiele 2 & 3 implementieren.
* Styling verbessern.
* Multiplayer-Modus prüfen.
