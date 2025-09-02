// src/pages/PacPet.jsx
import { useEffect, useRef, useState } from "react";
import {useOutletContext, useParams} from "react-router-dom";

import { W, H, HUD_HEIGHT } from "./pacpet/constants.js";
import { loadSprites, loadPlayerSkinByName, applyNamedPlayerSkin } from "./pacpet/assets.js";
import { createInput } from "./pacpet/input.js";
import { startGameLoop } from "./pacpet/loop.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function PacmanModular() {
    const { theme } = useParams();          // z.B. RUFUS, GANDALF, SIMBA, LOKI
    const { me } = useOutletContext() || { me: null };

    const canvasRef = useRef(null);
    const stopRef = useRef(null);

    const [sessionId, setSessionId] = useState(null);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!me || me.userId === "guest") return;
            try {
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
                if (!cancelled && res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("Session start failed", err);
            }
        })();
        return () => { cancelled = true; };
    }, [theme, me]);

    // Bestenliste holen
    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API}/api/game/leaderboard?gameType=PACPET`);
            if (res.ok) setLeaderboard(await res.json());
            else setError("Leaderboard konnte nicht geladen werden.");
        } catch (e) {
            setError("Netzwerkfehler beim Laden der Bestenliste.");
        }
    }

    // Session abschließen
    async function finishSession(finalScore, metadata) {
        if (!sessionId) { fetchLeaderboard(); return; }
        try {
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata }),
            });
            fetchLeaderboard();
        } catch (e) {
            console.error("finishSession failed", e);
        }
    }


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

                // NEW: Hooks aus der Loop zurück nach React
                const hooks = {
                    onScoreChange: (s) => setScore(s),
                    onGameOver: (finalScore, meta) => {
                        finishSession(finalScore, meta); // meta z.B. { result: "GAMEOVER", level }
                    },
                    // optional:
                    // onStageClear: (level) => { /* wenn du Level-Ende auch loggen willst */ }
                };
                const stop = startGameLoop(ctx, sprites, input, hooks);
                stopRef.current = () => { stop(); input.detach(); };
            } catch (err) {
                console.error("Sprite/Skin load failed:", err);
                input.detach();
            }
        })();

        return () => {
            cancelled = true;
            if (stopRef.current) stopRef.current();
            else input.detach();
        };
    }, [theme]); // bei URL-Änderung Skin neu laden

    return (
        <div style={{ display: "grid", placeItems: "center", padding: 16 }}>
            <canvas ref={canvasRef} style={{ background: "#000", imageRendering: "pixelated" }} />
        </div>
    );
}
