Abschlussprojekt – Dokumentation
Architekturüberblick

Das Projekt besteht aus Spring Boot Backend und React + Vite Frontend.
Kommunikation erfolgt über eine REST-API. Daten werden in einer PostgreSQL-Datenbank gespeichert.

Backend
1. Technologien

Spring Boot (REST-API)

Spring Security (Password-Hashing mit BCrypt)

JPA / Hibernate

PostgreSQL + Flyway

Lombok

Jackson für JSON

2. Authentifizierung (/api/auth)

Register (POST /api/auth/register)
Neue Benutzer können sich registrieren. Passwörter werden verschlüsselt gespeichert.

Login (POST /api/auth/login)
Benutzer kann sich mit Zugangsdaten anmelden.

Profil (GET /api/profile/{userId})
Gibt Statistiken, letzte Spiele und Bestleistungen zurück.

👉 Hinweis: GET /api/auth/profile/{userId} im AuthController ist deprecated und wurde durch ProfileController ersetzt.

3. Datenbank & Entities

User (ap_user)

id (UUID, PK)

username (unique)

password_hash

role

created_at

GameSession (ap_game_session)

id (UUID, PK)

user_id (FK, nullable → Gäste möglich)

game_type (z. B. TICTACTOE, MEMORY, WORD)

player_theme (z. B. GANDALF, LOKI, RUFUS, SIMBA)

started_at, finished_at

score

metadata (jsonb)

4. Repositories

UserRepository

findByUsername

existsByUsername

GameSessionRepository

findTop5ByUserIdOrderByFinishedAtDesc

findBestScoresByUser

findStatsByUser

findTopThemeByUser

findTop10ByGameAndTheme (Leaderboard)

5. REST-Endpunkte
   AuthController (/api/auth)

POST /register → Benutzer registrieren

POST /login → Benutzer einloggen

ProfileController (/api/profile)

GET /{userId} → Profil (Statistiken, letzte Spiele, Bestleistungen)

GameController (/api/game)

POST /session → Session starten

POST /session/{id}/finish → Session beenden & Score speichern

GET /leaderboard?gameType=...&playerTheme=... → Top 10 Scoreboard

UserController (/api/users)

GET /api/users → alle Benutzer

POST /api/users → neuen Benutzer anlegen

GET /api/users/{id} → Benutzer abfragen

GET /api/users/exists/{username} → Benutzername existiert?

PingController

GET /api/ping → Healthcheck

6. Security

CSRF deaktiviert (SPA)

/api/auth/** ist öffentlich

CORS erlaubt für http://localhost:5173 & http://localhost:3000

Passwörter werden mit BCrypt gehasht

Frontend (React + Vite)
1. Navigation (Router)

/ → Home

/login → Login/Register

/profile/:userId → Profil

/spielen → Charakter-Auswahl

/spiel1/:theme → TicTacToe

/spiel2/:theme → WordGame

/spiel3/:theme → PacPet

/spiel4/:theme → MemoryGame

/spiel5/:theme → PawPanik

/character/:id → Charakter-Seite

* → 404

2. Login & Registrierung

Registrierung/Login mit /api/auth

Gastmodus möglich (keine Speicherung)

3. Profilseite

Lädt Daten von /api/profile/:userId

Zeigt letzte Spiele, Bestleistungen, Statistiken

4. Spiele

TicTacToe (Spieler vs. Bot, Score 0/50/100)

WordGame (Quiz, Katze/Hund Fragen, Leaderboard)

MemoryGame (Paare finden, Punkte/Leben)

PacPet (Platzhalter)

PawPanik (Platzhalter)

ToDo

JWT Auth

Multiplayer-Modus

PacPet & PawPanik fertigstellen

Styling verbessern