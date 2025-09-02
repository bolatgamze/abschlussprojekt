export const TILE = 16;
export const W = 19*2*TILE;
export const H = 22*2*TILE;
export const SIZE = 48;
export const SPEED = 200;// px/s
export const GHOST_SPEED = SPEED * 0.80;
export const FRIGHT_TIME = 6.0;            // Sekunden
export const FRIGHT_SPEED_FACTOR = 0.6;    // Geister sind langsamer
export const START_LIVES = 3;


export const BG = "#000016";
export const FRAME_TIME = 0.12;      // 120 ms pro Mund-Frame

export const HUD_HEIGHT = 56; // Platz unter dem Spielfeld

export const EDGE_MARGIN = 0;
export const COLS = 19;
export const ROWS = 22;

export const MAX_STEPS = 20;

export const HIT_R = TILE * 0.9;           // <— hier anpassen, wenn’s zu streng/locker ist
export const HIT_R2 = HIT_R * HIT_R;

export const START = {
    player: { vx: 19, vy: 25, face: { x: -1, y: 0 } },  // Basis-Sprite schaut links
    blinky: { vx: 19, vy: 17, dir: { x: 1, y: 0 } },
    pinky:  { vx: 17, vy: 21, dir: { x: 1, y: 0 } },
    inky:   { vx: 19, vy: 21, dir: { x:  0, y: -1 } },
    clyde:  { vx: 21, vy: 21, dir: { x: 0, y: -1 } },
};