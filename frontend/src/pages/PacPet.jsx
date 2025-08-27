import { useEffect, useRef } from "react";
import { W, H } from "./pacpet/constants.js";
import { loadSprites } from "./pacpet/assets.js";
import { createInput } from "./pacpet/input.js";
import { startGameLoop } from "./pacpet/loop.js";

export default function PacmanModular() {
    const canvasRef = useRef(null);
    const stopRef = useRef(null);

    useEffect(() => {
        const el = canvasRef.current;
        const ctx = el?.getContext("2d");
        if (!el || !ctx) return;

        el.width = W;
        el.height = H;
        ctx.imageSmoothingEnabled = false;

        const input = createInput();
        input.attach();

        let cancelled = false;

        loadSprites().then((sprites) => {
            if (cancelled) return;
            const stop = startGameLoop(ctx, sprites, input);
            stopRef.current = () => { stop(); input.detach(); };
        }).catch(() => {
            // optional: Fehlerbehandlung Bild-Load
            input.detach();
        });

        return () => {
            cancelled = true;
            if (stopRef.current) stopRef.current();
            else input.detach();
        };
    }, []);

    return (
        <div style={{backgroundColor: "white"}}>
            <div style={{ display: "grid", placeItems: "center", padding: 16 }}>
                <canvas ref={canvasRef} style={{ background: "#000", imageRendering: "pixelated" }} />
            </div>
        </div>

    );
}
