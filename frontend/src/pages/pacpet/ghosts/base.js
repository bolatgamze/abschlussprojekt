import {SIZE, TILE} from "../constants.js";

export function normalizeGhost(g) {
    if (!g || typeof g !== "object") return;
    if (!Number.isFinite(g.vx)) g.vx = 0;
    if (!Number.isFinite(g.vy)) g.vy = 0;

    if (!g.dir || !Number.isFinite(g.dir.x) || !Number.isFinite(g.dir.y)) {
        g.dir = { x: 1, y: 0 };       // Default nach rechts
    }
    if (!g.edge || !Number.isFinite(g.edge.x) || !Number.isFinite(g.edge.y)) {
        g.edge = { ...g.dir };
    }

    if (!Number.isFinite(g.along) || g.along < 0) g.along = 0;
    if (g.along >= TILE) g.along = g.along % TILE;
}

export const DIRS = [
    { x:  1, y:  0 },
    { x: -1, y:  0 },
    { x:  0, y:  1 },
    { x:  0, y: -1 },
];


// wählt an einem Knoten die Richtung mit kleinster Distanz zum Target
export function chooseDirAtNode(g, target, canEdge, cols) {
    const back = g.dir ? { x: -g.dir.x, y: -g.dir.y } : { x: 0, y: 0 };

    let options = DIRS.filter(d => {
        if (g.allowUTurnOnce !== true && back.x === d.x && back.y === d.y) return false;
        return canEdge(g.vx, g.vy, d.x, d.y);
    });

    if (options.length === 0) {
        // Sackgasse → U-Turn zulassen
        options = DIRS.filter(d => canEdge(g.vx, g.vy, d.x, d.y));
    }
    if (options.length === 0) return { x: 0, y: 0 }; // absolut keine Option → stehen

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


// bevorzugt 'geradeaus' wenn möglich, sonst zufällig (kein U-Turn außer Sackgasse)
export function chooseDirAtNodeForwardBiased(g, _target, canEdge, cols, forwardBias = 0.65) {
    const DIRS = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const back = g.dir ? { x: -g.dir.x, y: -g.dir.y } : { x: 0, y: 0 };

    let opts = DIRS.filter(d => {
        if (d.x === back.x && d.y === back.y) return false; // nie direkt zurück (außer Sackgasse)
        return canEdge(g.vx, g.vy, d.x, d.y);
    });
    if (opts.length === 0) {
        // Sackgasse: U-Turn zulassen
        opts = DIRS.filter(d => canEdge(g.vx, g.vy, d.x, d.y));
    }
    if (opts.length === 0) return { x: 0, y: 0 };

    // Vorwärts-Priorität
    const forward = g.dir && opts.find(d => d.x === g.dir.x && d.y === g.dir.y);
    if (forward && Math.random() < forwardBias) return forward;

    // Zufällig aus den Optionen (ohne U-Turn)
    return opts[(Math.random() * opts.length) | 0];
}



export function advanceGhost(
    g, dt, speed, canEdge, cols, target,
    chooser = chooseDirAtNode   // <-- NEU: wählbare Entscheidungsfunktion
) {
    // (dein normalizeGhost etc.)
    let dist = speed * dt;
    let safety = 16;

    while (dist > 0 && safety-- > 0) {
        let toNext = TILE - g.along;
        if (toNext <= 0) toNext = TILE;

        if (dist < toNext) { g.along += dist; return; }

        // Knoten
        dist -= toNext;
        g.along = 0;
        g.vx += g.dir.x;
        g.vy += g.dir.y;

        if (g.vx < 0) g.vx = cols;
        else if (g.vx > cols) g.vx = 0;

        // dead-end failsafe (falls du den schon drin hast, lassen)

        const ndir = chooser(g, target, canEdge, cols) || { x: 0, y: 0 };
        if (ndir.x === 0 && ndir.y === 0) {
            // Fallback: deterministisch wählen
            const det = chooseDirAtNode(g, target, canEdge, cols);
            if (det && (det.x !== 0 || det.y !== 0)) {
                g.dir = { ...det }; g.edge = { ...det };
            } else { g.dir = {x:0,y:0}; g.edge = {x:0,y:0}; return; }
        } else {
            if (ndir.x !== g.dir.x || ndir.y !== g.dir.y) {
                g.dir = { ...ndir }; g.edge = { ...ndir };
            }
        }

        if (!ndir) { g.dir = {x:0,y:0}; g.edge = {x:0,y:0}; return; }

        if (ndir.x !== g.dir.x || ndir.y !== g.dir.y) {
            g.dir = { ...ndir };
            g.edge = { ...ndir };
        }

        if (!canEdge(g.vx, g.vy, g.dir.x, g.dir.y)) {
            g.dir = {x:0,y:0}; g.edge = {x:0,y:0}; return;
        }
    }
}


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

