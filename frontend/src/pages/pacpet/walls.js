// src/pages/pacpet/walls.js
import { TILE } from "./constants";

// Tile-Typen wie im Original
export const T = {
    WALL: 0,
    BISCUIT: 1,
    EMPTY: 2,
    BLOCK: 3,
    PILL: 4,
};

// ---- Deine Basis-Map (19×22) ----
const BASE_MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
    [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
    [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
    [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
    [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
    [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
    [0,0,0,0,1,0,1,0,0,3,0,0,1,0,1,0,0,0,0],
    [2,2,2,2,1,1,1,0,3,3,3,0,1,1,1,2,2,2,2],
    [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
    [2,2,2,0,1,0,1,1,1,2,1,1,1,0,1,0,2,2,2],
    [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0],
    [0,4,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,4,0],
    [0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0],
    [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
    [0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ---- Upscaling: jede Basiszelle -> SCALE×SCALE Zellen ----
const SCALE = 2; // für Sprite SIZE=32 bei TILE=16; setz auf 1, falls SIZE=16

// === DOT-STATE (auf Basis der BASE_MAP, nicht der upgescalten level) ===
export const BASE_ROWS = BASE_MAP.length;
export const BASE_COLS = BASE_MAP[0].length;

// dots[r][c] = '' | 'b' (BISCUIT) | 'p' (PILL)
const dots = Array.from({ length: BASE_ROWS }, (_, r) =>
    Array.from({ length: BASE_COLS }, (_, c) => {
        const v = BASE_MAP[r][c];
        return v === T.BISCUIT ? "b" : v === T.PILL ? "p" : "";
    })
);

// Punktewerte (bei Bedarf anpassen)
const SCORE_BISCUIT = 10;
const SCORE_PILL    = 50;

// Konsumiere Dot am GITTER-KNOTEN (vx, vy) — Avatar läuft auf Kanten, Knoten sind integer.
// Für SCALE=2 liegt der Dot genau im Knoten (2c+1, 2r+1) → (vx-1)%2==0 & (vy-1)%2==0.
export function consumeDotAtVertex(vx, vy) {
    const S = SCALE; // 2
    if (((vx - 1) % S) !== 0 || ((vy - 1) % S) !== 0) return 0; // kein Blockzentrum
    const bc = (vx - 1) / S;
    const br = (vy - 1) / S;
    const d = dots[br]?.[bc];
    if (!d) return 0;
    dots[br][bc] = ""; // entfernen

    return d === "p" ? SCORE_PILL : SCORE_BISCUIT;
}

// **NEU**: Dots zählen (aus dem `dots`-Array, nicht aus `level`)
export function dotsLeft() {
    let n = 0;
    for (let r = 0; r < BASE_ROWS; r++) {
        for (let c = 0; c < BASE_COLS; c++) {
            if (dots[r][c]) n++;
        }
    }
    return n;
}

// **NEU**: Dots zurücksetzen (nur das `dots`-Array)
export function resetDots() {
    for (let r = 0; r < BASE_ROWS; r++) {
        for (let c = 0; c < BASE_COLS; c++) {
            const v = BASE_MAP[r][c];
            dots[r][c] = (v === T.BISCUIT) ? "b" : (v === T.PILL) ? "p" : "";
        }
    }
}

function upscale(src, s) {
    const rows = src.length, cols = src[0].length;
    const out = Array.from({ length: rows * s }, () => Array(cols * s).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const v = src[r][c];
            for (let dy = 0; dy < s; dy++) {
                for (let dx = 0; dx < s; dx++) {
                    out[r * s + dy][c * s + dx] = v;
                }
            }
        }
    }
    return out;
}

export const level = upscale(BASE_MAP, SCALE);
export const ROWS = level.length;
export const COLS = level[0].length;

// ---- Kollision auf Tile-Ebene ----
// Blockierend sind WALL (0). (Falls BLOCK (3) auch blockieren soll, ergänze das.)
export function isTileWall(tx, ty) {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return true;
    tx = Math.floor(tx); ty = Math.floor(ty);
    const rows = level.length, cols = level[0].length;
    if (ty < 0 || ty >= rows || tx < 0 || tx >= cols) return true;
    const cell = level[ty][tx];
    return cell === T.WALL;
}

// ---- Dots zeichnen (genau 1 pro 2×2-Block) ----
export function drawDots(ctx) {
    ctx.save();
    const S = SCALE;           // 2
    const unit = TILE * S;     // Größe eines BASE_MAP-Feldes in Pixeln

    for (let r = 0; r < BASE_ROWS; r++) {
        for (let c = 0; c < BASE_COLS; c++) {
            const d = dots[r][c];
            if (!d) continue;
            const cx = (c + 0.5) * unit;
            const cy = (r + 0.5) * unit;
            const isPill = d === "p";
            const radius = isPill ? unit * 0.18 : unit * 0.09;

            ctx.beginPath();
            ctx.fillStyle = isPill ? "#fff" : "#ffd35a";
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

// ---- Wände zeichnen (tileweise „neonblau“) ----
export function drawWalls(ctx) {
    ctx.save();
    ctx.strokeStyle = "#8a2be6";
    ctx.lineWidth = 2;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (isTileWall(c, r)) {
                ctx.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
            }
        }
    }
    ctx.restore();
}

export function isDoor(tx, ty) {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return false;
    tx = Math.floor(tx); ty = Math.floor(ty);
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return false;
    return level[ty][tx] === T.BLOCK;
}
