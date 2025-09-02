import { useState, useEffect, useRef } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import gandalfIcon from "../icons/gandalf-iconn.png";
import lokiIcon from "../icons/loki-iconn.png";
import rufusIcon from "../icons/rufus-iconn.png";
import simbaIcon from "../icons/simba-iconn.png";

// Item-Icons (Vintage-Stil)
import fishIcon from "../icons/fish.png";
import boneIcon from "../icons/bone.png";
import heartIcon from "../icons/heart.png";
import skullIcon from "../icons/skull.png";
import syringeIcon from "../icons/syringe.png";
import pawIcon from "../icons/paw.png";
import trophyIcon from "../icons/trophy.png"; // 🏆 Vintage Trophy

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

const characterIcons = {
    GANDALF: gandalfIcon,
    LOKI: lokiIcon,
    RUFUS: rufusIcon,
    SIMBA: simbaIcon,
};

export default function PawPanik() {
    const { theme } = useParams(); // GANDALF | LOKI | RUFUS | SIMBA
    const { me } = useOutletContext();

    const playerRef = useRef({ x: 340, y: 340 });
    const [items, setItems] = useState([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45);
    const [lives, setLives] = useState(3);
    const [running, setRunning] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    // Effekte
    const [frozen, setFrozen] = useState(false);
    const [freezeTime, setFreezeTime] = useState(0);
    const [doubleTime, setDoubleTime] = useState(0);

    // 🎯 Items je nach Charakter
    const isCat = theme === "GANDALF" || theme === "SIMBA";
    const GOOD = isCat ? fishIcon : boneIcon;
    const BAD = skullIcon;
    const FREEZE = syringeIcon;
    const BONUS = pawIcon;

    // Session starten
    useEffect(() => {
        const start = async () => {
            if (!me || me.userId === "guest") return;
            try {
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gameType: "PAWPANIK",
                        playerTheme: theme,
                        userId: me.userId,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("Fehler beim Starten der Session", err);
            }
        };
        start();
    }, [theme, me]);

    // Steuerung
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!running || frozen) return;
            if (e.key === "ArrowLeft") {
                playerRef.current.x = Math.max(0, playerRef.current.x - 30);
            }
            if (e.key === "ArrowRight") {
                playerRef.current.x = Math.min(680, playerRef.current.x + 30);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [running, frozen]);

    // Items spawnen
    useEffect(() => {
        if (!running) return;
        const spawnInterval = setInterval(() => {
            const rand = Math.random();
            let type;

            if (rand < 0.75) type = GOOD;
            else if (rand < 0.9) type = BAD;
            else if (rand < 0.97) type = FREEZE;
            else type = BONUS;

            setItems((prev) => [
                ...prev,
                { id: Date.now() + Math.random(), x: Math.random() * 680, y: 0, type },
            ]);
        }, 800);
        return () => clearInterval(spawnInterval);
    }, [running, GOOD, BAD, FREEZE, BONUS]);

    // Spiel-Loop
    useEffect(() => {
        if (!running) return;
        const gameLoop = setInterval(() => {
            setItems((prev) =>
                prev.map((it) => ({ ...it, y: it.y + 8 })).filter((it) => it.y < 400)
            );

            setItems((prev) => {
                const newItems = [];
                for (const it of prev) {
                    if (
                        it.y > 300 &&
                        it.x > playerRef.current.x - 40 &&
                        it.x < playerRef.current.x + 40
                    ) {
                        if (it.type === GOOD) {
                            setScore((s) => s + (doubleTime > 0 ? 20 : 10));
                        } else if (it.type === BAD) {
                            setLives((l) => {
                                const newLives = l - 1;
                                if (newLives > 0) {
                                    resetRound();
                                } else {
                                    setRunning(false);
                                    finishSession(score, { result: "LOSE" });
                                }
                                return newLives;
                            });
                        } else if (it.type === FREEZE) {
                            setFrozen(true);
                            setFreezeTime(10);
                        } else if (it.type === BONUS) {
                            setDoubleTime(10);
                        }
                    } else {
                        newItems.push(it);
                    }
                }
                return newItems;
            });
        }, 60);
        return () => clearInterval(gameLoop);
    }, [running, score, doubleTime]);

    // Timer
    useEffect(() => {
        if (!running) return;
        if (timeLeft <= 0) {
            setRunning(false);
            finishSession(score, { result: "TIMEUP" });
            return;
        }
        const t = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(t);
    }, [running, timeLeft]);

    // Freeze-Counter
    useEffect(() => {
        if (freezeTime <= 0) {
            setFrozen(false);
            return;
        }
        const t = setInterval(() => setFreezeTime((f) => f - 1), 1000);
        return () => clearInterval(t);
    }, [freezeTime]);

    // Double Points-Counter
    useEffect(() => {
        if (doubleTime <= 0) return;
        const t = setInterval(() => setDoubleTime((d) => d - 1), 1000);
        return () => clearInterval(t);
    }, [doubleTime]);

    function resetRound() {
        playerRef.current = { x: 340, y: 340 };
        setItems([]);
        setRunning(true);
    }

    const fetchLeaderboard = async () => {
        try {const res = await fetch(
                     `${API}/api/game/leaderboard?gameType=PAWPANIK`);
            if (res.ok) {
                setLeaderboard(await res.json());
            } else {
                setError("Leaderboard konnte nicht geladen werden.");
            }
        } catch (err) {
            console.error("Fehler beim Laden der Bestenliste:", err);
            setError("Netzwerkfehler beim Laden der Bestenliste.");
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
            console.error("Fehler beim Speichern", err);
        }
    };

    // === Endscreen ===
    if (!running) {
        return (
            <section className="paw-card" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>
                    Game Over
                </h1>
                <p>
                    Dein Endscore: <b>{score}</b>
                </p>
                {error && (
                    <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>
                )}

                {leaderboard.length > 0 && (
                    <>
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
                                    width: "36px",
                                    height: "36px",
                                    objectFit: "contain",
                                    imageRendering: "pixelated",
                                    filter:
                                        "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                }}
                            />
                            Bestenliste
                            <img
                                src={trophyIcon}
                                alt="Trophy"
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    objectFit: "contain",
                                    imageRendering: "pixelated",
                                    filter:
                                        "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                }}
                            />
                        </h2>
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {leaderboard.map((row, i) => (
                                <li
                                    key={i}
                                    style={{
                                        margin: "6px 0",
                                        fontSize: "12px",
                                        textTransform: "uppercase", // ALLE NAMEN GROSS
                                    }}
                                >
                                    {i + 1}.{" "}
                                    <span style={{ color: "var(--accent4)" }}>
                                        {row.username}
                                    </span>{" "}
                                    — {row.score}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        );
    }

    // === Spiel läuft ===
    return (
        <section className="paw-card">
            <h1
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",   // ortala
                    gap: "10px",
                    textAlign: "center"
                }}
            >
                Paw Panik – {theme}
                {characterIcons[theme] && (
                    <img
                        src={characterIcons[theme]}
                        alt={theme}
                        style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                            filter:
                                "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                        }}
                    />
            )}
            </h1>

            <div className="game-info">
  <span className="zeit" style={{ color: "lime" }}>
    ⏱ Zeit: {timeLeft}s
  </span>
                <span className="score" style={{ color: "dodgerblue" }}>
    Score: {score}
  </span>
                <span className="leben flex items-center gap-1">
    {Array.from({ length: lives }).map((_, i) => (
        <img
            key={i}
            src={heartIcon}
            alt="leben"
            style={{
                width: "24px",
                height: "24px",
                objectFit: "contain",
                imageRendering: "pixelated",
                filter:
                    "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
            }}
        />
    ))}
  </span>
            </div>



            <div className="game-area">
                {/* Spieler */}
                <div
                    style={{
                        position: "absolute",
                        left: playerRef.current.x,
                        top: playerRef.current.y,
                        width: "48px",
                        height: "48px",
                    }}
                >
                    <img
                        src={characterIcons[theme]}
                        alt={theme}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                            opacity: frozen ? 0.5 : 1,
                            filter:
                                "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                        }}
                    />
                </div>

                {/* Items */}
                {items.map((it) => (
                    <div
                        key={it.id}
                        style={{
                            position: "absolute",
                            left: it.x,
                            top: it.y,
                            width: "36px",
                            height: "36px",
                        }}
                    >
                        <img
                            src={it.type}
                            alt="item"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                imageRendering: "pixelated",
                                filter:
                                    "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                            }}
                        />
                    </div>
                ))}

                {/* Freeze */}
                {freezeTime > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontSize: "22px",
                            fontWeight: "bold",
                            color: "red",
                            textShadow: "0 0 8px rgba(255,0,0,0.9)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Freeze {freezeTime}s
                    </div>
                )}

                {/* Double Points */}
                {doubleTime > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            fontSize: "22px",
                            fontWeight: "bold",
                            color: "var(--accent1)",
                            textShadow: "0 0 8px rgba(255,174,0,0.9)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Double Points {doubleTime}s
                    </div>
                )}
            </div>
        </section>
    );
}
