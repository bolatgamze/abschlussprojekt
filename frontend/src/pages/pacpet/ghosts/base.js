// src/pages/pacpet/ghosts/base.js
import { SIZE, TILE } from "../constants.js";

/* ---------------- Normalizer ---------------- */
export function normalizeGhost(g) {
    if (!g || typeof g !== "object") return;
    if (!Number.isFinite(g.vx)) g.vx = 0;
    if (!Number.isFinite(g.vy)) g.vy = 0;

    if (!g.dir || !Number.isFinite(g.dir.x) || !Number.isFinite(g.dir.y)) {
        g.dir = { x: 1, y: 0 }; // Default nach rechts
    }
    if (!g.edge || !Number.isFinite(g.edge.x) || !Number.isFinite(g.edge.y)) {
        g.edge = { ...g.dir };
    }

    if (!Number.isFinite(g.along) || g.along < 0) g.along = 0;
    if (g.along >= TILE) g.along = g.along % TILE;
}

/* ---------------- Konstanten ---------------- */
export const DIRS = [
    { x:  1, y:  0 },
    { x: -1, y:  0 },
    { x:  0, y:  1 },
    { x:  0, y: -1 },
];

/* --------- Zielgerichtete Richtungswahl --------- */
export function chooseDirAtNode(g, target, canEdge, cols) {
    const back = g.dir ? { x: -g.dir.x, y: -g.dir.y } : { x: 0, y: 0 };

    let options = DIRS.filter(d => {
        if (g.allowUTurnOnce !== true && back.x === d.x && back.y === d.y) return false;
        return canEdge(g.vx, g.vy, d.x, d.y);
    });

    // Sackgasse -> U-Turn zulassen
    if (options.length === 0) {
        options = DIRS.filter(d => canEdge(g.vx, g.vy, d.x, d.y));
    }
    if (options.length === 0) return { x: 0, y: 0 };

    let best = options[0], bestDist = Infinity;
    for (const d of options) {
        let nx = g.vx + d.x, ny = g.vy + d.y;
        if (d.x !== 0) { if (nx < 0) nx = cols; else if (nx > cols) nx = 0; }
        const dx = nx - target.x, dy = ny - target.y;
        const dist = dx*dx + dy*dy;
        if (dist < bestDist) { bestDist = dist; best = d; }
    }
    g.allowUTurnOnce = false;
    return best;
}

/* ---- Frightened: vorwärts-basiert, selten U-Turn ---- */
export function chooseDirAtNodeForwardBiased(
    g, _target, canEdge, cols, forwardBias = 0.7, uturnChance = 0.1
) {
    const back = g.dir ? { x: -g.dir.x, y: -g.dir.y } : { x: 0, y: 0 };

    // kleine Chance auf U-Turn, um Schlingen zu lösen
    if (Math.random() < uturnChance && canEdge(g.vx, g.vy, back.x, back.y)) {
        return back;
    }

    let opts = DIRS.filter(d => {
        if (d.x === back.x && d.y === back.y) return false; // kein U-Turn
        return canEdge(g.vx, g.vy, d.x, d.y);
    });

    if (opts.length === 0) {
        // Sackgasse -> U-Turn erlaubt
        opts = DIRS.filter(d => canEdge(g.vx, g.vy, d.x, d.y));
    }
    if (opts.length === 0) return { x: 0, y: 0 };

    const forward = g.dir && opts.find(d => d.x === g.dir.x && d.y === g.dir.y);
    if (forward && Math.random() < forwardBias) return forward;

    return opts[(Math.random() * opts.length) | 0];
}

/* ----------------- Bewegung/Logik ----------------- */
export function advanceGhost(
    g, dt, speed, canEdge, cols, target,
    chooser = chooseDirAtNode
) {
    normalizeGhost(g);

    let dist = speed * dt;
    let safety = 16; // max 16 Knoten pro Frame

    while (dist > 0 && safety-- > 0) {
        let toNext = TILE - g.along;
        if (toNext <= 0) toNext = TILE;

        if (dist < toNext) {
            g.along += dist;
            return;
        }

        // --- Knoten erreichen ---
        dist -= toNext;
        const prev = { vx: g.vx, vy: g.vy, dir: { ...g.dir } }; // für Failsafe merken
        g.along = 0;
        g.vx += g.dir.x;
        g.vy += g.dir.y;

        // horizontaler Warp (Vertex)
        if (g.vx < 0) g.vx = cols;
        else if (g.vx > cols) g.vx = 0;

        // --- Failsafe: hat dieser Knoten irgendeinen Ausgang? ---
        const hasAnyExit =
            canEdge(g.vx, g.vy,  1, 0) ||
            canEdge(g.vx, g.vy, -1, 0) ||
            canEdge(g.vx, g.vy,  0, 1) ||
            canEdge(g.vx, g.vy,  0,-1);

        if (!hasAnyExit) {
            // 1) vom vorherigen Knoten eine Quer-Richtung probieren
            const perps = [
                { x:  prev.dir.y, y: -prev.dir.x }, // 90° rechts
                { x: -prev.dir.y, y:  prev.dir.x }, // 90° links
            ];
            const choice = perps.find(d => canEdge(prev.vx, prev.vy, d.x, d.y));
            if (choice) {
                g.vx = prev.vx; g.vy = prev.vy;
                g.dir  = { ...choice };
                g.edge = { ...choice };
                g.along = 1; // sanfter „Nudge“
                return;
            }

            // 2) sonst halbe Kante zurück und umdrehen
            g.vx = prev.vx; g.vy = prev.vy;
            g.dir  = { x: -prev.dir.x, y: -prev.dir.y };
            g.edge = { ...g.dir };
            g.along = TILE * 0.5;
            return;
        }

        // --- Richtungswahl ---
        let ndir = chooser(g, target, canEdge, cols) || { x: 0, y: 0 };
        if (ndir.x === 0 && ndir.y === 0) {
            // Fallback: deterministisch
            ndir = chooseDirAtNode(g, target, canEdge, cols) || { x: 0, y: 0 };
            if (ndir.x === 0 && ndir.y === 0) {
                g.dir = { x: 0, y: 0 };
                g.edge = { x: 0, y: 0 };
                return;
            }
        }

        if (ndir.x !== g.dir.x || ndir.y !== g.dir.y) {
            g.dir  = { ...ndir };
            g.edge = { ...ndir };
        }

        // Sicherheitscheck der neuen Kante
        if (!canEdge(g.vx, g.vy, g.dir.x, g.dir.y)) {
            g.dir = { x: 0, y: 0 };
            g.edge = { x: 0, y: 0 };
            return;
        }
    }
}

/* ----------------- Rendering ----------------- */
export function drawGhost(ctx, g, frightTimer) {
    // Pixelposition aus Vertex + Kantenfortschritt
    let gx = g.vx * TILE;
    let gy = g.vy * TILE;
    if (g.edge?.x) gx += g.edge.x * g.along;
    if (g.edge?.y) gy += g.edge.y * g.along;

    const x = gx - SIZE / 2;
    const y = gy - SIZE / 2;

    ctx.save();

    // Körper
    const blink = frightTimer > 0 && frightTimer < 1.5 && ((performance.now()/120|0)%2===0);
    ctx.fillStyle = g.frightened ? (blink ? "#ffffff" : "#3fb3ff") : (g.color || "#ff0000");
    const r = SIZE / 2;
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, Math.PI, 0, false); // Halbkreis oben
    ctx.lineTo(x + SIZE, y + SIZE);              // gerade Unterkante
    ctx.lineTo(x, y + SIZE);
    ctx.closePath();
    ctx.fill();

    // Augen
    ctx.fillStyle = "#fff";
    const exCenter = x + r;            // Augenmittelpunkt grob mittig
    const ey = y + r * 0.9;
    const dx = SIZE * 0.18;
    const ew = SIZE * 0.16;
    const eh = SIZE * 0.22;

    // linkes Auge
    ctx.beginPath();
    ctx.ellipse(exCenter - dx, ey, ew, eh, 0, 0, Math.PI * 2);
    ctx.fill();
    // rechtes Auge
    ctx.beginPath();
    ctx.ellipse(exCenter + dx, ey, ew, eh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupillen (Richtung andeuten)
    ctx.fillStyle = "#1c1c1c";
    const px = (g.dir?.x || 0) * ew * 0.5;
    const py = (g.dir?.y || 0) * eh * 0.5;
    const pr = ew * 0.35;
    ctx.beginPath(); ctx.arc(exCenter - dx + px, ey + py, pr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(exCenter + dx + px, ey + py, pr, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}
