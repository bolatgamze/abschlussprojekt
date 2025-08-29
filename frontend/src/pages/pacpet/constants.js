export const TILE = 16;
export const W = 19*2*TILE;
export const H = 22*2*TILE;
export const SIZE = 32;
export const SPEED = 200;               // px/s
export const BG = "#000016";
export const FRAME_TIME = 0.12;      // 120 ms pro Mund-Frame

export const EDGE_MARGIN = 0;
export const COLS = 19;
export const ROWS = 22;

export const START = {
    player: { vx: 19, vy: 25, face: { x: -1, y: 0 } },  // Basis-Sprite schaut links
    blinky: { vx: 19, vy: 17, dir: { x: 1, y: 0 } },
    pinky:  { vx: 21, vy: 21, dir: { x: -1, y: 0 } },
};