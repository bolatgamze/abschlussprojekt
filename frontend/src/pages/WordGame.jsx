import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

// 🐱 Katzen-Fragen
const CAT_QA = [
    { q: "Wie nennt man die geheime Kunst des Blicks, der um 4 Uhr morgens Futter erzwingt?", a: "LASERBLICK" },
    { q: "Welches edle Möbel ist laut Katze eindeutig ein Kratzbaum?", a: "SOFA" },
    { q: "Wie heißt das olympische Katzensport-Event ‘alles vom Tisch schubsen’?", a: "GRAVITATIONSTEST" },
    { q: "Welches Getränk ist nur aus dem Menschen-Glas wirklich schmackhaft?", a: "WASSER" },
    { q: "Wie heißt der Jobtitel für das nächtliche Rennen quer durch die Wohnung?", a: "ZOOMIES" },
    { q: "Welches Instrument spielen Katzen, wenn die Tür halb offen steht?", a: "MIAUKONZERT" },
    { q: "Wie nennt man den Tempel, in dem die Sonne durch’s Fenster scheint?", a: "FENSTERBRETT" },
    { q: "Die oberste Regel der Kartons lautet: Wenn ich sitze, bin ich…?", a: "RICH" },
];

// 🐶 Hunde-Fragen
const DOG_QA = [
    { q: "Wie heißt die Wissenschaft des perfekten Schwanzwedelns?", a: "WEDOLOGIE" },
    { q: "Welches Spiel ist auch dann Pflicht, wenn der Mensch Schuhe anzieht?", a: "HOLEN" },
    { q: "Wie nennt man die große Mission, jeden Busch zu scannen?", a: "SCHNUEFFELTOUR" },
    { q: "Was ist laut Hund die korrekte Antwort auf jede Türglocke?", a: "BELLEN" },
    { q: "Welches himmlische Objekt ist heimlicher Erzfeind am Himmel?", a: "DRONE" },
    { q: "Wie heißt die Disziplin, Menschen zum Kraulen zu überreden?", a: "BLICKTRAINING" },
    { q: "Womit beweist der Hund echte Liebe und sabbert dabei?", a: "KUSS" },
    { q: "Wer ist der offiziell beste Junge?", a: "ICH" },
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function maskAnswer(answer, revealedIdx, icon) {
    return answer.split("").map((ch, i) => (revealedIdx.has(i) ? ch : icon));
}

export default function WordGame() {
    const { theme } = useParams(); // GANDALF | LOKI | RUFUS | SIMBA
    const { me } = useOutletContext(); // context from App.jsx

    // Zuordnung: welche Charaktere sind Katze, welche Hund?
    const isCat = (theme === "GANDALF" || theme === "SIMBA");
    const ICON = isCat ? "🐱" : "🐶";
    const POOL = isCat ? CAT_QA : DOG_QA;
    const MAX_TRIES = 10;
    const MAX_QUESTIONS = 5;

    const [sessionId, setSessionId] = useState(null);
    const [qa, setQa] = useState(() => pickRandom(POOL));
    const [revealed, setRevealed] = useState(new Set());
    const [guess, setGuess] = useState("");
    const [tries, setTries] = useState(0);
    const [score, setScore] = useState(0);
    const [state, setState] = useState("playing");
    const [leaderboard, setLeaderboard] = useState([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [error, setError] = useState(null);
    const startedAtRef = useRef(Date.now());

    // === Session starten ===
    useEffect(() => {
        if (!me || me.userId === "guest") return;
        const start = async () => {
            try {
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gameType: "WORD", playerTheme: theme, userId: me.userId }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) {
                    setSessionId(data.sessionId);
                } else {
                    setError("Spiel-Session konnte nicht gestartet werden.");
                }
            } catch {
                setError("Netzwerkfehler beim Starten der Session.");
            }
        };
        start();
    }, [theme, me]);

    // === Frage-Logik ===
    useEffect(() => {
        if (questionCount >= MAX_QUESTIONS) {
            setState("finished");
            const finalScore = score < 0 ? 0 : score;

            if (me && me.userId !== "guest" && finalScore > 0) {
                finishSession(finalScore, { result: "FINISHED", totalQuestions: MAX_QUESTIONS });
            } else {
                loadLeaderboard();
            }
        } else {
            const len = qa.a.length;
            const min = Math.ceil(len * 0.3);
            const max = Math.ceil(len * 0.5);
            const revealCount = Math.max(1, Math.floor(Math.random() * (max - min + 1)) + min);
            const idxs = new Set();
            while (idxs.size < revealCount && idxs.size < len) {
                idxs.add(Math.floor(Math.random() * len));
            }
            setRevealed(idxs);
            setTries(0);
            setState("playing");
            setGuess("");
            startedAtRef.current = Date.now();
        }
    }, [qa, questionCount]);

    const masked = useMemo(() => maskAnswer(qa.a, revealed, ICON), [qa, revealed, ICON]);

    const finishSession = async (finalScore, meta) => {
        if (!sessionId) return;
        try {
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata: meta }),
            });
            await loadLeaderboard();
        } catch {
            setError("Spiel-Session konnte nicht gespeichert werden.");
        }
    };

    const loadLeaderboard = async () => {
        try {
            const res = await fetch(`${API}/api/game/leaderboard?gameType=WORD&playerTheme=${theme}`);
            if (res.ok) {
                setLeaderboard(await res.json());
            } else {
                setError("Leaderboard konnte nicht geladen werden.");
            }
        } catch {
            setError("Netzwerkfehler beim Laden des Leaderboards.");
        }
    };

    const handleRevealHint = () => {
        if (state !== "playing") return;
        const hiddenIdx = qa.a.split("").map((_, i) => i).filter((i) => !revealed.has(i));
        if (hiddenIdx.length === 0) return;
        const r = hiddenIdx[Math.floor(Math.random() * hiddenIdx.length)];
        const next = new Set(revealed);
        next.add(r);
        setRevealed(next);
        setScore((s) => s - 5);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (state !== "playing") return;

        const cleanGuess = (guess || "").trim().toUpperCase();
        if (!cleanGuess) return;

        const answer = qa.a.toUpperCase();
        const newRevealed = new Set(revealed);
        let newlyCorrectLetters = 0;

        for (let i = 0; i < Math.min(cleanGuess.length, answer.length); i++) {
            if (cleanGuess[i] === answer[i] && !newRevealed.has(i)) {
                newRevealed.add(i);
                newlyCorrectLetters++;
            }
        }
        if (newlyCorrectLetters > 0) {
            setScore((s) => s + newlyCorrectLetters * 10);
        }
        setRevealed(newRevealed);

        const newTries = tries + 1;
        setTries(newTries);

        if (cleanGuess === answer) {
            const all = new Set(answer.split("").map((_, i) => i));
            setRevealed(all);
            setState("won");
            return;
        }

        if (newTries >= MAX_TRIES) {
            setState("lost");
            return;
        }

        setGuess("");
    };

    const handleNextQuestion = () => {
        setQuestionCount((c) => c + 1);
        if (questionCount + 1 < MAX_QUESTIONS) {
            setQa(pickRandom(POOL));
        }
    };

    // --- UI ---
    if (state === "finished") {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>Spiel vorbei</h1>
                <p>Dein Endscore: <b>{score < 0 ? 0 : score}</b></p>
                {error && <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>}
                <h2 style={{ color: "var(--accent3)", margin: "20px 0" }}>🏆 Leaderboard 🏆</h2>
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {leaderboard.map((row, i) => (
                        <li key={i} style={{ margin: "6px 0", fontSize: "12px" }}>
                            {i + 1}. <span style={{ color: "var(--accent4)" }}>{row.username}</span> — {row.score}
                        </li>
                    ))}
                </ul>
            </section>
        );
    }

    return (
        <section className="card center">
            <h1>Wort-Raten – {isCat ? "🐱 Katze" : "🐶 Hund"}</h1>

            {error && <p style={{ color: "var(--accent2)" }}>{error}</p>}

            <div style={{ marginTop: 20 }}>
                <h2>Frage</h2>
                <p>{qa.q}</p>
            </div>

            <div style={{ marginTop: 20 }}>
                <h2>Antwort</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 0" }}>
                    {masked.map((ch, i) => (
                        <span
                            key={i}
                            style={{
                                width: 44,
                                height: 44,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid #555",
                                borderRadius: 8,
                                fontSize: revealed.has(i) ? 20 : 24,
                                background: revealed.has(i) ? "#fff" : "#fafafa",
                                color: revealed.has(i) ? "#111" : "inherit",
                                fontWeight: revealed.has(i) ? 700 : 400,
                                userSelect: "none",
                            }}
                        >
              {ch}
            </span>
                    ))}
                </div>
                <button className="btn" type="button" onClick={handleRevealHint}>
                    Hinweis aufdecken (–5)
                </button>
            </div>

            {state !== "lost" && (
                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                    <input
                        autoFocus
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        placeholder="Antwort hier eingeben"
                        style={{ textTransform: "uppercase" }}
                    />
                    <div className="row" style={{ marginTop: 12 }}>
                        <button className="btn" type="submit" disabled={state === "won"}>
                            Prüfen
                        </button>
                        <button className="btn" type="button" onClick={handleNextQuestion}>
                            {state === "won" ? "Nächste Frage" : "Neue Frage"}
                        </button>
                    </div>
                </form>
            )}

            {state === "won" && (
                <div style={{ marginTop: 18 }}>
                    <h2> Richtig!</h2>
                    <p>Lösung: <b>{qa.a}</b></p>
                </div>
            )}

            {state === "lost" && (
                <div style={{ marginTop: 18 }}>
                    <h2>Leider verloren!</h2>
                    <p>Gesuchte Lösung: <b>{qa.a}</b></p>
                    <button className="btn" type="button" onClick={handleNextQuestion} style={{ marginTop: 8 }}>
                        Nochmal spielen
                    </button>
                </div>
            )}
        </section>
    );
}
