import { useEffect, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { W, H, HUD_HEIGHT } from "./pacpet/constants.js";
import { loadSprites, loadPlayerSkinByName, applyNamedPlayerSkin } from "./pacpet/assets.js";
import { createInput } from "./pacpet/input.js";
import { startGameLoop } from "./pacpet/loop.js";

import trophyIcon from "../icons/trophy.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PacPet() {
    const { theme } = useParams();
    const { me } = useOutletContext();
    const canvasRef = useRef(null);
    const stopRef = useRef(null);

    const [sessionId, setSessionId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);
    const [finished, setFinished] = useState(false);

    // === Session starten ===
    useEffect(() => {
        const startSession = async () => {
            try {
                if (!me || me.userId === "guest") return;
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gameType: "PACPET",
                        playerTheme: theme,
                        userId: me.userId,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("PacPet Session start failed:", err);
            }
        };
        startSession();
    }, [theme, me]);

    // === Score speichern ===
    const finishSession = async (finalScore, meta) => {
        try {
            if (!sessionId) {
                fetchLeaderboard();
                return;
            }
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata: meta }),
            });
            fetchLeaderboard();
            setFinished(true);
        } catch (err) {
            console.error("PacPet speichern fehlgeschlagen:", err);
        }
    };

    // === Leaderboard laden ===
    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`${API}/api/game/leaderboard?gameType=PACPET`);
            if (res.ok) setLeaderboard(await res.json());
            else setError("Leaderboard konnte nicht geladen werden.");
        } catch {
            setError("Netzwerkfehler beim Laden des Leaderboards.");
        }
    };

    // === Game Loop initialisieren ===
    useEffect(() => {
        const el = canvasRef.current;
        const ctx = el?.getContext("2d");
        if (!el || !ctx) return;

        el.width = W;
        el.height = H + HUD_HEIGHT;
        ctx.imageSmoothingEnabled = false;

        const input = createInput();
        input.attach();

        let cancelled = false;

        (async () => {
            try {
                const sprites = await loadSprites();
                const skin = await loadPlayerSkinByName(theme);
                applyNamedPlayerSkin(sprites, skin);

                if (cancelled) return;

                // Callback: Game Over oder Quit
                const stop = startGameLoop(
                    ctx,
                    sprites,
                    input,
                    (finalScore, meta) => {
                        finishSession(finalScore, meta || { result: "END" });
                    },
                    (quitScore, meta) => {
                        finishSession(quitScore, meta || { result: "QUIT" });
                    }
                );

                stopRef.current = () => {
                    stop();
                    input.detach();
                };
            } catch (err) {
                console.error("Sprite/Skin load failed:", err);
                input.detach();
            }
        })();

        // cleanup
        return () => {
            cancelled = true;
            if (stopRef.current) stopRef.current();
            else input.detach();
        };
    }, [theme, sessionId]);

    // === Fertiges Layout (nur Bestenliste) ===
    if (finished) {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
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
                    BESTENLISTE
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
                {error && (
                    <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>
                )}
                {leaderboard.length > 0 ? (
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {leaderboard.map((row, i) => (
                            <li
                                key={i}
                                style={{
                                    margin: "6px 0",
                                    fontSize: "12px",
                                    textTransform: "uppercase",
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
                ) : (
                    <p>Noch keine Einträge</p>
                )}
            </section>
        );
    }

    // solange Spiel läuft → Canvas
    return (
        <div style={{ display: "grid", placeItems: "center", padding: 16 }}>
            <canvas ref={canvasRef} style={{ background: "#000", imageRendering: "pixelated" }} />
        </div>
    );
}
