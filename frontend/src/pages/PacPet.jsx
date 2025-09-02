// src/pages/PacPet.jsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import { W, H, HUD_HEIGHT } from "./pacpet/constants.js";
import { loadSprites, loadPlayerSkinByName, applyNamedPlayerSkin } from "./pacpet/assets.js";
import { createInput } from "./pacpet/input.js";
import { startGameLoop } from "./pacpet/loop.js";

export default function PacmanModular() {
    const { theme } = useParams();          // z.B. RUFUS, GANDALF, SIMBA, LOKI
    const canvasRef = useRef(null);
    const stopRef = useRef(null);

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
                // 1) Basis-Sprites laden
                const sprites = await loadSprites();

                // 2) Skin aus URL laden & anwenden (Fallback inside: RUFUS)
                const skin = await loadPlayerSkinByName(theme);
                applyNamedPlayerSkin(sprites, skin);

                if (cancelled) return;
                // 3) Game-Loop starten
                const stop = startGameLoop(ctx, sprites, input);
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
