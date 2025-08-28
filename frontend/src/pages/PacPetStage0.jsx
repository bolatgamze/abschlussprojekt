import { useEffect, useRef } from "react";

export default function PacmanStage0() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;

        const W = 448, H = 496;      // typische Pac-Man-Größe
        el.width = W; el.height = H;

        // Hintergrund
        ctx.fillStyle = "#000016";
        ctx.fillRect(0, 0, W, H);

        // statischer Pac-Man (nur zum Testen)
        const x = W / 2, y = H / 2, r = 12;
        ctx.fillStyle = "#FFD83D";
        ctx.beginPath();
        ctx.arc(x, y, r, 0.25 * Math.PI, 1.75 * Math.PI);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // kleine Label-Zeile
        ctx.fillStyle = "#9fb0ff";
        ctx.font = "12px monospace";
        ctx.fillText("Stage 0: static draw (kein Loop)", 10, H - 12);
    }, []);

    return (
        <div style={{ display: "grid", placeItems: "center", padding: 16 }}>
            <canvas ref={canvasRef} style={{ background: "#000", imageRendering: "pixelated" }} />
        </div>
    );
}
