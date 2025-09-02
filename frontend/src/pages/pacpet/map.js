// src/pages/pacpet/walls.js
import { TILE } from "./constants";

// ---- Tile-Typen (wie im Snippet) ----
export const T = {
    WALL: 0,
    BISCUIT: 1,
    EMPTY: 2,
    BLOCK: 3,
    PILL: 4,
};

// ---- Original-Pacman MAP (19 × 22) ----
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

// ---- Curved wall paths (Tile-Einheiten, .5 möglich) ----
const WALL_PATHS = [
    [{"move":[0,9.5]},{"line":[3,9.5]},{"curve":[3.5,9.5,3.5,9]},{"line":[3.5,8]},
        {"curve":[3.5,7.5,3,7.5]},{"line":[1,7.5]},{"curve":[0.5,7.5,0.5,7]},
        {"line":[0.5,1]},{"curve":[0.5,0.5,1,0.5]},{"line":[9,0.5]},
        {"curve":[9.5,0.5,9.5,1]},{"line":[9.5,3.5]}],

    [{"move":[9.5,1]},{"curve":[9.5,0.5,10,0.5]},{"line":[18,0.5]},
        {"curve":[18.5,0.5,18.5,1]},{"line":[18.5,7]},
        {"curve":[18.5,7.5,18,7.5]},{"line":[16,7.5]},
        {"curve":[15.5,7.5,15.5,8]},{"line":[15.5,9]},
        {"curve":[15.5,9.5,16,9.5]},{"line":[19,9.5]}],

    [{"move":[2.5,5.5]},{"line":[3.5,5.5]}],
    [{"move":[3,2.5]},{"curve":[3.5,2.5,3.5,3]},{"curve":[3.5,3.5,3,3.5]},
        {"curve":[2.5,3.5,2.5,3]},{"curve":[2.5,2.5,3,2.5]}],

    [{"move":[15.5,5.5]},{"line":[16.5,5.5]}],
    [{"move":[16,2.5]},{"curve":[16.5,2.5,16.5,3]},{"curve":[16.5,3.5,16,3.5]},
        {"curve":[15.5,3.5,15.5,3]},{"curve":[15.5,2.5,16,2.5]}],

    [{"move":[6,2.5]},{"line":[7,2.5]},{"curve":[7.5,2.5,7.5,3]},
        {"curve":[7.5,3.5,7,3.5]},{"line":[6,3.5]},
        {"curve":[5.5,3.5,5.5,3]},{"curve":[5.5,2.5,6,2.5]}],

    [{"move":[12,2.5]},{"line":[13,2.5]},{"curve":[13.5,2.5,13.5,3]},
        {"curve":[13.5,3.5,13,3.5]},{"line":[12,3.5]},
        {"curve":[11.5,3.5,11.5,3]},{"curve":[11.5,2.5,12,2.5]}],

    [{"move":[7.5,5.5]},{"line":[9,5.5]},{"curve":[9.5,5.5,9.5,6]},{"line":[9.5,7.5]}],
    [{"move":[9.5,6]},{"curve":[9.5,5.5,10.5,5.5]},{"line":[11.5,5.5]}],

    [{"move":[5.5,5.5]},{"line":[5.5,7]},{"curve":[5.5,7.5,6,7.5]},{"line":[7.5,7.5]}],
    [{"move":[6,7.5]},{"curve":[5.5,7.5,5.5,8]},{"line":[5.5,9.5]}],

    [{"move":[13.5,5.5]},{"line":[13.5,7]},{"curve":[13.5,7.5,13,7.5]},{"line":[11.5,7.5]}],
    [{"move":[13,7.5]},{"curve":[13.5,7.5,13.5,8]},{"line":[13.5,9.5]}],

    [{"move":[0,11.5]},{"line":[3,11.5]},{"curve":[3.5,11.5,3.5,12]},{"line":[3.5,13]},
        {"curve":[3.5,13.5,3,13.5]},{"line":[1,13.5]},{"curve":[0.5,13.5,0.5,14]},
        {"line":[0.5,17]},{"curve":[0.5,17.5,1,17.5]},{"line":[1.5,17.5]}],
    [{"move":[1,17.5]},{"curve":[0.5,17.5,0.5,18]},{"line":[0.5,21]},
        {"curve":[0.5,21.5,1,21.5]},{"line":[18,21.5]},
        {"curve":[18.5,21.5,18.5,21]},{"line":[18.5,18]},
        {"curve":[18.5,17.5,18,17.5]},{"line":[17.5,17.5]}],
    [{"move":[18,17.5]},{"curve":[18.5,17.5,18.5,17]},{"line":[18.5,14]},
        {"curve":[18.5,13.5,18,13.5]},{"line":[16,13.5]},
        {"curve":[15.5,13.5,15.5,13]},{"line":[15.5,12]},
        {"curve":[15.5,11.5,16,11.5]},{"line":[19,11.5]}],

    [{"move":[5.5,11.5]},{"line":[5.5,13.5]}],
    [{"move":[13.5,11.5]},{"line":[13.5,13.5]}],

    [{"move":[2.5,15.5]},{"line":[3,15.5]},{"curve":[3.5,15.5,3.5,16]},{"line":[3.5,17.5]}],
    [{"move":[16.5,15.5]},{"line":[16,15.5]},{"curve":[15.5,15.5,15.5,16]},{"line":[15.5,17.5]}],

    [{"move":[5.5,15.5]},{"line":[7.5,15.5]}],
    [{"move":[11.5,15.5]},{"line":[13.5,15.5]}],

    [{"move":[2.5,19.5]},{"line":[5,19.5]},{"curve":[5.5,19.5,5.5,19]},{"line":[5.5,17.5]}],
    [{"move":[5.5,19]},{"curve":[5.5,19.5,6,19.5]},{"line":[7.5,19.5]}],

    [{"move":[11.5,19.5]},{"line":[13,19.5]},{"curve":[13.5,19.5,13.5,19]},{"line":[13.5,17.5]}],
    [{"move":[13.5,19]},{"curve":[13.5,19.5,14,19.5]},{"line":[16.5,19.5]}],

    [{"move":[7.5,13.5]},{"line":[9,13.5]},{"curve":[9.5,13.5,9.5,14]},{"line":[9.5,15.5]}],
    [{"move":[9.5,14]},{"curve":[9.5,13.5,10,13.5]},{"line":[11.5,13.5]}],

    [{"move":[7.5,17.5]},{"line":[9,17.5]},{"curve":[9.5,17.5,9.5,18]},{"line":[9.5,19.5]}],
    [{"move":[9.5,18]},{"curve":[9.5,17.5,10,17.5]},{"line":[11.5,17.5]}],

    [{"move":[8.5,9.5]},{"line":[8,9.5]},{"curve":[7.5,9.5,7.5,10]},{"line":[7.5,11]},
        {"curve":[7.5,11.5,8,11.5]},{"line":[11,11.5]},{"curve":[11.5,11.5,11.5,11]},
        {"line":[11.5,10]},{"curve":[11.5,9.5,11,9.5]},{"line":[10.5,9.5]}],
];

// ---- Upscaling: jede Original-Zelle -> 2×2 Zellen (Sprite ist 2×2 groß) ----
const SCALE = 1;

function upscaleMap(src, s) {
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

export const level = upscaleMap(BASE_MAP, SCALE);
export const ROWS = level.length;
export const COLS = level[0].length;

// ---- Abfrage, ob ein Tile für Bewegung blockiert ----
// WALL (0) und BLOCK (3) sind „hart“ blockierend.
// BISCUIT/EMPTY/PILL sind frei.
export function isTileWall(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    const v = level[ty][tx];
    return v === T.WALL || v === T.BLOCK;
}

// ---- (Optional) Dots/Pills zeichnen, praktisch zum Testen ----
export function drawDots(ctx) {
    ctx.save();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const v = level[r][c];
            if (v === T.BISCUIT || v === T.PILL) {
                const cx = (c + 0.5) * TILE;
                const cy = (r + 0.5) * TILE;
                ctx.beginPath();
                ctx.fillStyle = v === T.PILL ? "#fff" : "#ffd35a";
                const radius = v === T.PILL ? TILE * 0.35 : TILE * 0.15;
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    ctx.restore();
}

// ---- Curved-Walls zeichnen (mit SCALE × TILE) ----
export function drawWalls(ctx) {
    const unit = TILE * SCALE; // 1 „MAP-Einheit“ = 2 Tiles breit/hoch
    ctx.save();
    ctx.strokeStyle = "#2e4cff";
    ctx.lineWidth = Math.max(2, SCALE * 1.5);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const seg of WALL_PATHS) {
        ctx.beginPath();
        for (const cmd of seg) {
            const k = Object.keys(cmd)[0];
            const v = cmd[k];
            if (k === "move") {
                ctx.moveTo(v[0] * unit, v[1] * unit);
            } else if (k === "line") {
                ctx.lineTo(v[0] * unit, v[1] * unit);
            } else if (k === "curve") {
                // quadratic: [cpx, cpy, x, y]
                ctx.quadraticCurveTo(v[0] * unit, v[1] * unit, v[2] * unit, v[3] * unit);
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}
