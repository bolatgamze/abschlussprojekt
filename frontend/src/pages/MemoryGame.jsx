import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Karten-Sets für Katze und Hund
const catCards = [
    { name: "fish", symbol: "🐟" },
    { name: "mouse", symbol: "🐭" },
    { name: "ball", symbol: "⚽" },
    { name: "yarn", symbol: "🧶" },
    { name: "milk", symbol: "🍼" },
    { name: "bed", symbol: "🛏️" }
];

const dogCards = [
    { name: "bone", symbol: "🦴" },
    { name: "ball", symbol: "⚽" },
    { name: "house", symbol: "🏠" },
    { name: "bowl", symbol: "🥣" },
    { name: "paw", symbol: "🐾" },
    { name: "water", symbol: "💧" }
];

// Karten duplizieren und mischen
function shuffleCards(base) {
    const doubled = [...base, ...base];
    return doubled
        .map(card => ({ ...card, id: Math.random(), flipped: true, matched: false })) // am Anfang offen
        .sort(() => Math.random() - 0.5);
}

export default function MemoryGame() {
    const { theme } = useParams(); // "KATZE" | "HUND"
    const set = theme === "KATZE" ? catCards : dogCards;

    const [cards, setCards] = useState([]);
    const [choiceOne, setChoiceOne] = useState(null);
    const [choiceTwo, setChoiceTwo] = useState(null);
    const [disabled, setDisabled] = useState(true); // Spiel am Anfang deaktiviert
    const [timer, setTimer] = useState(10);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(10);
    const [finished, setFinished] = useState(false);

    // Spiel initialisieren
    useEffect(() => {
        setCards(shuffleCards(set));
        setTimer(10);
        setDisabled(true);
        setScore(0);
        setLives(10);
        setFinished(false);

        // 10 Sekunden Countdown, Karten sichtbar
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Karten umdrehen
                    setCards(prevCards =>
                        prevCards.map(c => ({ ...c, flipped: false }))
                    );
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
        } else if (lives <= 0) {
            setFinished(true);
        }
    }, [cards, lives]);

    // Rückseite hängt von Spieler ab (Katze oder Hund)
    const backSymbol = theme === "KATZE" ? "🐱" : "🐶";

    return (
        <section className="card center">
            <h1>Memory Spiel – {theme === "KATZE" ? "🐱 Katze" : "🐶 Hund"}</h1>

            {/* Countdown-Anzeige */}
            {timer > 0 && (
                <div style={{ fontSize: "1.5rem", color: "green", marginBottom: "10px" }}>
                    Karten sichtbar für: {timer}s
                </div>
            )}

            {/* Spielbrett */}
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
                        {card.flipped || card.matched ? card.symbol : backSymbol}
                    </div>
                ))}
            </div>

            {/* Punktestand & Leben */}
            <div style={{ marginTop: "20px" }}>
                <p>Punkte: {score}</p>
                <p>Fehlversuche übrig: {lives}</p>
            </div>

            {/* Ergebnisnachricht */}
            {finished && (
                <div style={{ marginTop: "20px" }}>
                    {lives > 0
                        ? <h2>Glückwunsch! Endpunktzahl: {score}</h2>
                        : <h2>Leider verloren! Endpunktzahl: {score}</h2>
                    }
                </div>
            )}
        </section>
    );
}
