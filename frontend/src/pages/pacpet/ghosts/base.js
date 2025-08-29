import {SIZE, TILE} from "../constants.js";

export const DIRS = [
    { x:  1, y:  0 },
    { x: -1, y:  0 },
    { x:  0, y:  1 },
    { x:  0, y: -1 },
];

const sqr = n => n * n;

// wählt an einem Knoten die Richtung mit kleinster Distanz zum Target
export function chooseDirAtNode(g, target, canEdge, cols) {
    const back = { x: -g.dir.x, y: -g.dir.y };

    let options = DIRS.filter(d => {
        if (!g.allowUTurnOnce && d.x === back.x && d.y === back.y) return false;
        return canEdge(g.vx, g.vy, d.x, d.y);
    });

    if (options.length === 0) {
        // Sackgasse → U-Turn zulassen
        options = DIRS.filter(d => canEdge(g.vx, g.vy, d.x, d.y));
    }

    let best = options[0];
    let bestDist = Infinity;
    for (const d of options) {
        let nx = g.vx + d.x;
        let ny = g.vy + d.y;
        // horizontaler Warp (Vertex-Ebene)
        if (d.x !== 0) {
            if (nx < 0) nx = cols;
            else if (nx > cols) nx = 0;
        }
        const dist = sqr(nx - target.x) + sqr(ny - target.y);
        if (dist < bestDist) { bestDist = dist; best = d; }
    }
    g.allowUTurnOnce = false;
    return best;
}

// bewegt einen Geist entlang der Kanten (mit Warp & 2×2-Clearance via canEdge)
export function advanceGhost(g, dt, speed, canEdge, cols, target) {
    let dist = speed * dt;

    while (dist > 0) {
        let toNext = TILE - g.along;
        if (toNext <= 0) toNext = TILE;
        if (dist < toNext) {
            g.along += dist;
            return; }

        // nächsten Knoten erreichen
        dist -= toNext;
        g.along = 0;
        g.vx += g.dir.x;
        g.vy += g.dir.y;

        // horizontaler Warp (Vertex)
        if (g.vx < 0) g.vx = cols;
        else if (g.vx > cols) g.vx = 0;

        // neue Richtung an Kreuzung wählen
        const ndir = chooseDirAtNode(g, target, canEdge, cols);
        if (ndir.x !== g.dir.x || ndir.y !== g.dir.y) {
            g.dir = { ...ndir };
            g.edge = { ...ndir };
        }

        if (!canEdge(g.vx, g.vy, g.dir.x, g.dir.y)) {
            g.dir = { x: 0, y: 0 };
            return;
        }
    }
}

export function drawGhost(ctx, g) {
    // Pixelposition aus Vertex + Kantenfortschritt
    let gx = g.vx * TILE;
    let gy = g.vy * TILE;
    if (g.edge?.x) gx += g.edge.x * g.along;
    if (g.edge?.y) gy += g.edge.y * g.along;

    const x = gx - SIZE / 2;
    const y = gy - SIZE / 2;

    ctx.save();

    // Körper
    ctx.fillStyle = g.color || "#ff0000";
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

