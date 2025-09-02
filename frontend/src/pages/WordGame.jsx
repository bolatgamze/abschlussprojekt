import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import Gandalf from "../icons/gandalf-iconn.png";
import Loki from "../icons/loki-iconn.png";
import Rufus from "../icons/rufus-iconn.png";
import Simba from "../icons/simba-iconn.png";
import trophyIcon from "../icons/trophy.png";

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
    { q: "Welches Hightech-Gerät ist nur eine teure Version vom Karton?", a: "KATZENBETT" },
    { q: "Wie nennt man den geheimen Angriff auf Füße unter der Decke?", a: "MONSTERJAGD" },
    { q: "Was ist laut Katze die beste Jahreszeit?", a: "FRUEHLING" },
    { q: "Wie heißt das altehrwürdige Ritual, Tastaturen zu blockieren?", a: "SCHREIBSPERRE" }
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
    { q: "Wie nennt man den großen Wettkampf, wer schneller frisst?", a: "NAPFSPRINT" },
    { q: "Was ist die wahre Aufgabe jedes Spaziergangs?", a: "MARKIEREN" },
    { q: "Wie heißt das alte Ritual, sich im Schlamm zu wälzen?", a: "SPAABAD" },
    { q: "Welches Wort ist magischer als jedes andere?", a: "LECKERLI" }
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function maskAnswer(answer, revealedIdx) {
    return answer.split("").map((ch, i) => (revealedIdx.has(i) ? ch : null));
}

export default function WordGame() {
    const { theme } = useParams(); // z.B. "gandalf"
    const player = String(theme || "").toUpperCase();

    const ICONS = {
        GANDALF: Gandalf,
        LOKI: Loki,
        RUFUS: Rufus,
        SIMBA: Simba,
    };
    const DISPLAY_NAMES = {
        GANDALF: "Gandalf",
        LOKI: "Loki",
        RUFUS: "Rufus",
        SIMBA: "Simba",
    };

    const { me } = useOutletContext();

    // Katze/Hund Pool
    const isCat = player === "GANDALF" || player === "SIMBA";
    const POOL = isCat ? CAT_QA : DOG_QA;
    const MAX_TRIES = 10;
    const MAX_QUESTIONS = 5;

    const [sessionId, setSessionId] = useState(null);
    const [qa, setQa] = useState(null);            // aktuelle Frage
    const [asked, setAsked] = useState(new Set()); // bereits gestellte Fragen
    const [revealed, setRevealed] = useState(new Set());
    const [guess, setGuess] = useState("");
    const [tries, setTries] = useState(0);
    const [score, setScore] = useState(0);
    const [state, setState] = useState("playing"); // "playing" | "won" | "lost" | "finished"
    const [leaderboard, setLeaderboard] = useState([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [error, setError] = useState(null);
    const startedAtRef = useRef(Date.now());

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

    useEffect(() => {
        const first = pickRandom(POOL);
        setQa(first);
        setAsked(new Set([first.q]));
        setQuestionCount(0);
        setTries(0);
        setScore(0);
        setState("playing");
        setGuess("");
    }, [player]);


    useEffect(() => {
        if (!qa) return; // warten, bis Frage gesetzt wurde

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

    const masked = useMemo(() => (qa ? maskAnswer(qa.a, revealed) : []), [qa, revealed]);

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
            const res = await fetch(
                `${API}/api/game/leaderboard?gameType=WORD`);
            if (res.ok) {
                setLeaderboard(await res.json());
            } else {
                setError("Leaderboard konnte nicht geladen werden.");
            }
        } catch {
            setError("Netzwerkfehler beim Laden des Leaderboards.");
        }
    };

    // ---- Actions ----
    const handleRevealHint = () => {
        if (state !== "playing" || !qa) return;
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
        if (state !== "playing" || !qa) return;

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
            // Nächste Frage nur aus den restlichen
            const remaining = POOL.filter((item) => !asked.has(item.q));
            if (remaining.length > 0) {
                const next = pickRandom(remaining);
                setQa(next);
                setAsked((prev) => {
                    const n = new Set(prev);
                    n.add(next.q);
                    return n;
                });
            } else {
                setState("finished");
            }
        }
    };


    const LETTER_SIZE = 44;
    const GAP = 8;

    const answerLen = qa ? qa.a.length : 0;
    const perRow = answerLen;
    const QUESTION_H = 110;


    const ANSWER_H = LETTER_SIZE + 24;

    const gridWidth = perRow > 0 ? perRow * LETTER_SIZE + (perRow - 1) * GAP : 0;


    if (!qa) {
        return (
            <section
                className="card center"
                style={{
                    width: "min(92vw, 640px)",
                    minHeight: 560,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    padding: 16,
                    boxSizing: "border-box",
                }}
            >
                <p style={{ opacity: 0.8 }}>Lade Frage…</p>
            </section>
        );
    }

    if (state === "finished") {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>Spiel vorbei</h1>
                <p>Dein Endscore: <b>{score < 0 ? 0 : score}</b></p>
                {error && <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>}

                {/* Trophy headline */}
                <h2
                    style={{
                        color: "var(--accent3)",
                        margin: "20px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                    }}
                >
                    <img
                        src={trophyIcon}
                        alt="Trophy"
                        style={{
                            width: 32,
                            height: 32,
                            objectFit: "contain",
                            filter:
                                "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                        }}
                    />
                    Bestenliste
                    <img
                        src={trophyIcon}
                        alt="Trophy"
                        style={{
                            width: 32,
                            height: 32,
                            objectFit: "contain",
                            filter:
                                "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                        }}
                    />
                </h2>

                {/* Leaderboard list */}
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {leaderboard.map((row, i) => (
                        <li key={i} style={{ margin: "6px 0", fontSize: "13px", fontWeight: 600 }}>
                            {i + 1}.{" "}
                            <span style={{ color: "var(--accent4)", textTransform: "uppercase" }}>
                            {row.username}
                        </span>{" "}
                            — {row.score}
                        </li>
                    ))}
                </ul>
            </section>
        );
}

    return (
        <section
            className="card center"
            style={{
                width: `max(min(92vw, 640px), ${gridWidth + 48}px)`,
                minHeight: 560, // wächst bei langen Antworten automatisch
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                padding: 16,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateRows: "auto 1fr auto",
                    rowGap: 16,
                    height: "100%",
                }}
            >
                <div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto", // links dehnbar, rechts so breit wie nötig
                            columnGap: 12,
                            alignItems: "start",
                        }}
                    >
                        <h1
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                margin: 0,
                                flexWrap: "wrap",
                                lineHeight: 1.1,
                            }}
                        >
                            <span>Wort-Raten</span>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    whiteSpace: "nowrap",
                                }}
                            >
    {ICONS[player] && (
        <img
            src={ICONS[player]}
            alt=""
            aria-hidden="true"
            style={{
                width: 64,
                height: 64,
                objectFit: "contain",

                padding: 6,
                background: "transparent",
                filter:
                    "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)" // 👈 beyaz glow etkisi
            }}
        />

    )}
                                <span>{DISPLAY_NAMES[player]}</span>
  </span>
                        </h1>



                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "stretch",
                                gap: 6,
                                fontWeight: 700,
                                minWidth: 160,
                                justifySelf: "end",
                            }}
                        >
                            <div className="scoreboard">
                                <span className="score-box">Punkte: {score}</span>
                                <span className="score-box">Frage: {questionCount + 1}/{MAX_QUESTIONS}</span>
                                <span className="score-box">Versuche: {Math.max(0, MAX_TRIES - tries)}</span>
                            </div>

                        </div>

                    </div>

                    {error && <p style={{ color: "var(--accent2)", marginTop: 6 }}>{error}</p>}
                </div>

                <main>
                    {/* Frage */}
                    <div>
                        <h2 style={{ margin: "8px 0" }}>Frage</h2>
                        <p
                            style={{
                                height: QUESTION_H,      // feste Höhe
                                overflowY: "auto",       // falls sehr lang, scrollt NUR der Fragetext
                                margin: 0,
                                lineHeight: 1.35,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                            }}
                        >
                            {qa.q}
                        </p>
                    </div>

                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                        <h2 style={{ margin: 0 }}>Antwort</h2>

                        {/* äußere Hülle: zentriert + dynamische Höhe → stabil, kein Scroll nötig */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: ANSWER_H,
                                padding: "10px 0",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${perRow}, ${LETTER_SIZE}px)`,
                                    gap: GAP,
                                    width: perRow > 0 ? gridWidth : "auto",
                                    justifyItems: "center",
                                }}
                            >
                                {masked.map((ch, i) => (
                                    <span
                                        key={i}
                                        style={{
                                            width: LETTER_SIZE,
                                            height: LETTER_SIZE,
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
                                            lineHeight: "1",
                                            boxSizing: "border-box",
                                        }}
                                    >
                    {ch !== null ? (
                        ch
                    ) : (
                        <img
                            src={ICONS[player]}
                            alt=""
                            style={{ width: "70%", height: "70%", objectFit: "contain", opacity: 0.85 }}
                        />
                    )}
                  </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>

                <footer>
                    {state !== "lost" && state !== "won" && (
                        <form onSubmit={handleSubmit}>
                            <input
                                autoFocus
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="ANTWORT HIER EINGEBEN"
                                style={{
                                    display: "block",
                                    margin: "0 auto",
                                    width: "min(90%, 380px)",
                                    textTransform: "uppercase",
                                    textAlign: "center",
                                }}
                            />
                            <div
                                className="row"
                                style={{
                                    marginTop: 12,
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <button className="btn" type="submit" disabled={state === "won"}>
                                    Prüfen
                                </button>
                                <button className="btn" type="button" onClick={handleNextQuestion}>
                                    {state === "won" ? "Nächste Frage" : "Neue Frage"}
                                </button>
                                <button
                                    className="btn"
                                    type="button"
                                    onClick={handleRevealHint}
                                    disabled={state !== "playing"}
                                    title="Deckt einen Buchstaben auf (–5 Punkte)"
                                >
                                    Hinweis aufdecken (–5)
                                </button>
                            </div>
                        </form>
                    )}

                    {state === "won" && (
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ margin: "8px 0" }}>Richtig!</h2>
                            <p>
                                Lösung: <b>{qa.a}</b>
                            </p>
                            <button className="btn" type="button" onClick={handleNextQuestion} style={{ marginTop: 8 }}>
                                Nächste Frage
                            </button>
                        </div>
                    )}

                    {state === "lost" && (
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ margin: "8px 0" }}>Leider verloren!</h2>
                            <p>
                                Gesuchte Lösung: <b>{qa.a}</b>
                            </p>
                            <button className="btn" type="button" onClick={handleNextQuestion} style={{ marginTop: 8 }}>
                                Nochmal spielen
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </section>
    );
}
