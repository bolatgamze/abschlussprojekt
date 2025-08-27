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
// Blockierend sind WALL (0) und BLOCK (3). Alles andere ist begehbar.
export function isTileWall(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    const v = level[ty][tx];
    return v === T.WALL;
}

export function drawDots(ctx) {
    ctx.save();

    const S = SCALE;           // 2 bei upscaling, 1 wenn nicht
    const unit = TILE * S;     // Kantenlänge eines 1×1 BASE_MAP-Felds in Pixeln

    // iteriere in BLOCKS à S×S (z.B. 2×2)
    for (let r = 0; r < ROWS; r += S) {
        for (let c = 0; c < COLS; c += S) {
            const v = level[r][c]; // alle S×S Zellen tragen denselben Wert
            if (v === T.BISCUIT || v === T.PILL) {
                const cx = (c + S / 2) * TILE; // Mittelpunkt des S×S-Blocks
                const cy = (r + S / 2) * TILE;

                ctx.beginPath();
                ctx.fillStyle = v === T.PILL ? "#fff" : "#ffd35a";
                // Größe relativ zum Block-Abstand wählen
                const radius = v === T.PILL ? unit * 0.18 : unit * 0.09;
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.restore();
}

// ---- Wände zeichnen (tileweise „neonblau“) ----
export function drawWalls(ctx) {
    ctx.save();
    ctx.strokeStyle = "#2e4cff";
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
