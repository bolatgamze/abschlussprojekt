import {COLS, ROWS, TILE} from "./constants.js";


export const toTile = (px) => Math.floor(px / TILE);
export const centerOf = (tx, ty) => ({
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
});

export function drawGrid(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#ceced6";
    ctx.lineWidth = 1;

    for (let c = 0; c <= COLS*2; c++) {
        const x = c * TILE + 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ROWS*2 * TILE); ctx.stroke();
    }
    for (let r = 0; r <= ROWS*2; r++) {
        const y = r * TILE + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(COLS*2 * TILE, y); ctx.stroke();
    }
    ctx.restore();
}

// 🔽 NEU: Zentrumserkennung / -snapping
export function nearestCenter(px, py) {
    const tx = toTile(px);
    const ty = toTile(py);
    return centerOf(tx, ty);
}

export function atCenter(px, py, eps = 1) {
    const c = nearestCenter(px, py);
    return Math.abs(px - c.x) <= eps && Math.abs(py - c.y) <= eps;
}

export function snapToCenter(px, py) {
    const c = nearestCenter(px, py);
    return { x: c.x, y: c.y };
}
