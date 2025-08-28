import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";



// 🐱 Katzen-Fragen (lustig)
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

// 🐶 Hunde-Fragen (lustig)
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
    const { theme } = useParams(); // "KATZE" | "HUND"
    const isCat = theme === "KATZE";
    const ICON = isCat ? "🐱" : "🐶";
    const POOL = isCat ? CAT_QA : DOG_QA;
    const MAX_TRIES = 10;

    const [sessionId, setSessionId] = useState(null);
    const [qa, setQa] = useState(() => pickRandom(POOL));
    const [revealed, setRevealed] = useState(new Set());
    const [guess, setGuess] = useState("");
    const [tries, setTries] = useState(0);
    const [score, setScore] = useState(0);
    const [state, setState] = useState("playing");
    const startedAtRef = useRef(Date.now());

    useEffect(() => {
        setScore(0);
    }, [theme]);

    useEffect(() => {
        const len = qa.a.length;
        const min = Math.ceil(len * 0.30);
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
    }, [qa]);

    useEffect(() => {
        const start = async () => {
            try {
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gameType: "WORD", playerTheme: theme, userId: null }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch { /* non-blocking */ }
        };
        start();
    }, [theme]);

    const masked = useMemo(() => maskAnswer(qa.a, revealed, ICON), [qa, revealed, ICON]);

    const finishSession = async (finalScore, meta) => {
        if (!sessionId) return;
        try {
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata: meta }),
            });
        } catch { /* non-blocking */ }
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
            // Sieg
            const all = new Set(answer.split("").map((_, i) => i));
            setRevealed(all);
            setState("won");
            const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);

            finishSession(score, { result: "WIN", question: qa.q, answer: qa.a, tries: newTries, durationSec, theme });
            return;
        }

        if (newTries >= MAX_TRIES) {
            setState("lost");
            const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
            finishSession(score, { result: "LOSE", question: qa.q, answer: qa.a, tries: newTries, durationSec, theme });
            return;
        }

        setGuess("");
    };

    const handleNextQuestion = () => {

        const pool = isCat ? CAT_QA : DOG_QA;
        setQa(pickRandom(pool));
    };

    const triesLeft = MAX_TRIES - tries;
    const nextBtnLabel = state === "won" ? "Nächste Frage" : "Neue Frage"; // ⬅️ Label-Umschaltung

    return (
        <section className="card center" style={{ maxWidth: 720 }}>
            <h1>Wort-Raten – {isCat ? "🐱 Katze" : "🐶 Hund"}</h1>

            <div className="row" style={{ gap: 16, marginTop: 8 }}>
                <div className="badge">Punkte: <b>{score}</b></div>
                <div className="badge">Versuche übrig: <b>{triesLeft}</b> / {MAX_TRIES}</div>
            </div>

            <div style={{ marginTop: 20 }}>
                <h2 style={{ marginBottom: 8 }}>Frage</h2>
                <p style={{ fontSize: 18 }}>{qa.q}</p>
            </div>

            <div style={{ marginTop: 18 }}>
                <h2 style={{ marginBottom: 8 }}>Antwort</h2>
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
                                background: revealed.has(i) ? "#ffffff" : "#fafafa",
                                color: revealed.has(i) ? "#111111" : "inherit",
                                fontWeight: revealed.has(i) ? 700 : 400,
                                userSelect: "none",
                            }}
                        >
              {ch}
            </span>
                    ))}
                </div>

                <div className="row" style={{ gap: 12 }}>
                    <button className="btn" type="button" onClick={handleRevealHint}>
                        Hinweis aufdecken (–5)
                    </button>
                </div>
            </div>

            {state !== "lost" && (
                <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                    <label style={{ display: "block" }}>
                        <span>Dein Tipp</span>
                        <input
                            autoFocus
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Antwort hier eingeben"
                            style={{ textTransform: "uppercase" }}
                        />
                    </label>
                    <div className="row" style={{ marginTop: 12 }}>
                        <button className="btn" type="submit" disabled={state === "won"}>Prüfen</button>
                        <button className="btn" type="button" onClick={handleNextQuestion}>{nextBtnLabel}</button>
                    </div>
                </form>
            )}

            {state === "won" && (
                <div style={{ marginTop: 18 }}>
                    <h2>🎉 Richtig!</h2>
                    <p> Lösung: <b>{qa.a}</b></p>
                </div>
            )}

            {state === "lost" && (
                <div style={{ marginTop: 18 }}>
                    <h2>😿😢 Leider verloren!</h2>
                    <p>Du hast leider nach {MAX_TRIES} Versuchen das Wort nicht erraten.</p>
                    <p>Gesuchte Lösung: <b>{qa.a}</b></p>
                    <button className="btn" type="button" onClick={handleNextQuestion} style={{ marginTop: 8 }}>
                        Nochmal spielen
                    </button>
                </div>
            )}
        </section>
    );
}
