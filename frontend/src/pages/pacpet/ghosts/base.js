// src/pages/pacpet/ghosts/base.js
import { SIZE, TILE } from "../constants.js";
import { getGhostSprite } from "./spriteStore.js";

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
export function drawGhost(ctx, g, frightTimer = 0) {
    // Pixelposition (wie gehabt)
    let gx = g.vx * TILE, gy = g.vy * TILE;
    if (g.edge?.x) gx += g.edge.x * g.along;
    if (g.edge?.y) gy += g.edge.y * g.along;

    const cx = gx;          // Zentrum
    const cy = gy;
    const bodySize = SIZE;  // ggf. 0.9*SIZE, wenn du mehr Luft willst
    const half = bodySize / 2;

    // Falls "nur Augen" (eaten/eyes mode) – nur Augen zeichnen
    const eyesOnly = g.eyes === true;

    ctx.save();
    ctx.translate(cx, cy);

    // 1) Körper: Staubsauger-Bild (wenn nicht eyesOnly)
    if (!eyesOnly) {
        const img = g.img || getGhostSprite(g.name);
        if (img) {
            ctx.drawImage(img, -half, -half, bodySize, bodySize);
        } else {
            // Fallback: einfacher Kreis in Geisterfarbe
            ctx.fillStyle = g.color || "#ff0000";
            ctx.beginPath();
            ctx.arc(0, 0, half, 0, Math.PI * 2);
            ctx.fill();
        }

        // Frightened: blauer Overlay + evtl. Blinken am Ende
        const FRIGHT_OVERLAY = false; // <— easy switch
        const isFright = g.frightened && frightTimer > 0;
        if (FRIGHT_OVERLAY && isFright) {
            const blink = frightTimer < 1.5 && ((performance.now()/120|0)%2===0);
            ctx.fillStyle = blink ? "rgba(255,255,255,0.35)" : "rgba(63,179,255,0.35)";
            ctx.fillRect(-half, -half, bodySize, bodySize);
        }
    }

    // 2) Augen (immer)
    // --- Augen (kleiner, weiter oben) ---
    const isFright = g.frightened && frightTimer > 0;
    ctx.fillStyle = isFright ? "#fff" : "#fff";

// Position/Größe feinjustieren:
    const eyeCenterY = -SIZE * 0.15;      // ↑ weiter nach oben (negativ = Richtung Kopf)
    const eyeSep     = SIZE * 0.16;        // horizontaler Abstand der Augen vom Mittelpunkt
    const eyeW       = SIZE * 0.12;        // Breite eines Auges
    const eyeH       = SIZE * 0.16;        // Höhe eines Auges

// linkes/rechtes Auge
    ctx.beginPath();
    ctx.ellipse(-eyeSep, eyeCenterY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(+eyeSep, eyeCenterY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

// Pupillen (Richtung andeuten)
    ctx.fillStyle = "#1c1c1c";


    const pupDX = isFright ? 0 : (g.dir?.x || 0) * eyeW * 0.45;  // Bewegungsrichtung stärker sichtbar
    const pupDY = isFright ? 0 : (g.dir?.y || 0) * eyeH * 0.45;
    const pupR  = isFright ? (eyeW * 0.64) : (eyeW * 0.32);

    ctx.beginPath();
    ctx.arc(-eyeSep + pupDX, eyeCenterY + pupDY, pupR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(+eyeSep + pupDX, eyeCenterY + pupDY, pupR, 0, Math.PI * 2);
    ctx.fill();

    if (isFright && frightTimer < 1.5) {
        const pulse = 1 + 0.10 * Math.sin(performance.now() * 0.02);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(-eyeSep + pupDX, eyeCenterY + pupDY, pupR * pulse, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(+eyeSep + pupDX, eyeCenterY + pupDY, pupR * pulse, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }


    ctx.restore();
}
