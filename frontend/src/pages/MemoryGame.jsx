import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";


import Ball from "../icons/Ball.png";
import BallKatzen from "../icons/BallKatzen.png";
import Feder from "../icons/Feder.png";
import Fisch from "../icons/Fisch.png";
import Fleisch from "../icons/Fleisch.png";
import Fleischkeule from "../icons/Fleischkeule.png";
import Frisbee from "../icons/Frisbee.png";
import Hundeseil from "../icons/Hundeseil.png";
import Knochen from "../icons/Knochen.png";
import Kratzbaum from "../icons/Kratzbaum.png";
import Mouse from "../icons/Mouse.png";
import Pfoten from "../icons/Pfoten.png";
import Rufus from "../icons/rufus-iconn.png";
import Simba from "../icons/simba-iconn.png";
import Gandalf from "../icons/gandalf-iconn.png";
import Loki from "../icons/loki-iconn.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Karten-Sets für Katze und Hund
const catCards = [
    { name: "fish", symbol: Fisch },
    { name: "mouse", symbol: Mouse },
    { name: "ballKatzen", symbol: BallKatzen },
    { name: "Kratzbaum", symbol: Kratzbaum},
    { name: "Pfoten", symbol: Pfoten },
    { name: "Feder", symbol:  Feder}
];

const dogCards = [
    { name: "knochen", symbol: Knochen },
    { name: "ball", symbol: Ball},
    { name: "Hundeseil", symbol: Hundeseil },
    { name: "Frisbee", symbol: Frisbee },
    { name: "Fleisch", symbol: Fleisch },
    { name: "Fleischkeule", symbol: Fleischkeule },
];

// Karten duplizieren und mischen
function shuffleCards(base) {
    const doubled = [...base, ...base];
    return doubled
        .map(card => ({ ...card, id: Math.random(), flipped: true, matched: false }))
        .sort(() => Math.random() - 0.5);
}

export default function MemoryGame() {
    const { theme } = useParams(); // GANDALF | LOKI | RUFUS | SIMBA
    const { me } = useOutletContext();

    // 🐱🐶 Welche Karten verwenden?
    const isCat = (theme === "GANDALF" || theme === "SIMBA");
    const set = isCat ? catCards : dogCards;

    // 🎭 Rückseiten-Icons pro Charakter
    const backIcons = {
        GANDALF: Gandalf,
        LOKI: Loki,
        RUFUS: Rufus,
        SIMBA: Simba
    };
    const displayNames = {
        GANDALF: "Gandalf",
        LOKI: "Loki",
        RUFUS: "Rufus",
        SIMBA: "Simba",
    };
    const backSymbol = backIcons[theme] || "❓";

    const [sessionId, setSessionId] = useState(null);
    const [cards, setCards] = useState([]);
    const [choiceOne, setChoiceOne] = useState(null);
    const [choiceTwo, setChoiceTwo] = useState(null);
    const [disabled, setDisabled] = useState(true);
    const [timer, setTimer] = useState(10);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(10);
    const [finished, setFinished] = useState(false);

    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    // Session starten
    useEffect(() => {
        const start = async () => {
            try {
                if (!me || me.userId === "guest") return;
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gameType: "MEMORY", playerTheme: theme, userId: me.userId }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("Fehler beim Starten der Session:", err);
            }
        };
        start();
    }, [theme, me]);

    // Spiel initialisieren
    useEffect(() => {
        setCards(shuffleCards(set));
        setTimer(10);
        setDisabled(true);
        setScore(0);
        setLives(10);
        setFinished(false);

        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCards(prevCards => prevCards.map(c => ({ ...c, flipped: false })));
                    setDisabled(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [theme]);

    // Klick auf eine Karte
    function handleChoice(card) {
        if (disabled || card.flipped || card.matched) return;
        card.flipped = true;
        if (!choiceOne) {
            setChoiceOne(card);
        } else if (!choiceTwo) {
            setChoiceTwo(card);
            setDisabled(true);
        }
        setCards([...cards]);
    }

    // Zwei Karten vergleichen
    useEffect(() => {
        if (choiceOne && choiceTwo) {
            if (choiceOne.name === choiceTwo.name) {
                setCards(prev =>
                    prev.map(c =>
                        c.name === choiceOne.name ? { ...c, matched: true } : c
                    )
                );
                setScore(prev => prev + 10);
            } else {
                setLives(prev => prev - 1);
                setScore(prev => prev - 2);
                setTimeout(() => {
                    setCards(prev =>
                        prev.map(c =>
                            c.id === choiceOne.id || c.id === choiceTwo.id
                                ? { ...c, flipped: false }
                                : c
                        )
                    );
                }, 800);
            }
            setChoiceOne(null);
            setChoiceTwo(null);
            setDisabled(false);
        }
    }, [choiceOne, choiceTwo]);

    // Spielende prüfen
    useEffect(() => {
        if (cards.length > 0 && cards.every(c => c.matched)) {
            setFinished(true);
            finishSession(score, { result: "WIN" });
        } else if (lives <= 0) {
            setFinished(true);
            finishSession(score, { result: "LOSE" });
        }
    }, [cards, lives]);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`${API}/api/game/leaderboard?gameType=MEMORY&playerTheme=${theme}`);
            const data = await res.json();
            setLeaderboard(data);
        } catch (err) {
            console.error("Fehler beim Laden der Bestenliste:", err);
            setError("Leaderboard konnte nicht geladen werden.");
            setLeaderboard([]);
        }
    };

    const finishSession = async (finalScore, meta) => {
        if (!sessionId) {
            fetchLeaderboard();
            return;
        }
        try {
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata: meta }),
            });
            fetchLeaderboard();
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
            setError("Ergebnis konnte nicht gespeichert werden.");
        }
    };

    // === Fertiges Layout ===
    if (finished) {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>
                    Spiel vorbei
                </h1>
                <p>Dein Endscore: <b>{score}</b></p>
                {error && <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>}
                {leaderboard.length > 0 && (
                    <>
                        <h2 style={{ color: "var(--accent3)", margin: "20px 0" }}>🏆 Leaderboard 🏆</h2>
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {leaderboard.map((row, i) => (
                                <li key={i} style={{ margin: "6px 0", fontSize: "12px" }}>
                                    {i + 1}. <span style={{ color: "var(--accent4)" }}>{row.username}</span> — {row.score}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        );
    }

    // Normales Spiel-UI
    return (
        <section className="card center">
            <h1 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                Memory –
                {backIcons[theme] && (
                    <img
                        src={backIcons[theme]}
                        alt={displayNames?.[theme] || theme}
                        style={{ width: 28, height: 28, objectFit: "contain" }}
                    />
                )}
                {displayNames?.[theme] || theme}
            </h1>


            {timer > 0 && (
                <div style={{ fontSize: "1.2rem", color: "green", marginBottom: "10px" }}>
                    Karten sichtbar für: {timer}s
                </div>
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 80px)",
                    gap: "10px",
                    marginTop: "20px"
                }}
            >
                {cards.map(card => (
                    <div
                        key={card.id}
                        onClick={() => handleChoice(card)}
                        style={{
                            width: "80px",
                            height: "80px",
                            border: "2px solid #555",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                            cursor: card.flipped || card.matched || disabled ? "default" : "pointer",
                            background: "#fafafa"
                        }}
                    >
                        {card.flipped || card.matched ? (
                            <img src={card.symbol} alt={card.name}
                                 style={{ width: "70%", height: "70%", objectFit: "contain" }} />
                        ) : backSymbol ? (
                            <img src={backSymbol} alt="back"
                                 style={{ width: "70%", height: "70%", objectFit: "contain" }} />
                        ) : (
                            <span style={{ fontSize: "2rem" }}>❓</span>
                        )}


                    </div>
                ))}
            </div>

            <div style={{ marginTop: "20px" }}>
                <p>Punkte: {score}</p>
                <p>Fehlversuche übrig: {lives}</p>
            </div>
        </section>
    );
}
