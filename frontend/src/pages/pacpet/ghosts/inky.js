// src/pages/pacpet/ghosts/inky.js
import { START, COLS, ROWS } from "../constants.js";
import {advanceGhost, chooseDirAtNodeForwardBiased} from "./base.js";

// Fabrik
export function createInky(
    startVX = START.inky.vx,
    startVY = START.inky.vy,
    startDir = START.inky.dir
) {
    return {
        name: "inky",
        color: "#00ffff",        // cyan
        vx: startVX, vy: startVY,
        dir:  { ...startDir },
        edge: { ...startDir },
        along: 0,
        mode: "scatter",         // "scatter" | "chase"
        allowUTurnOnce: false,
    };
}

// Target-Regel:
// 1) Tile T = 2 vor Pac-Man (mit Up-Bug: oben ⇒ (-2,-2))
// 2) Vektor B→T verdoppeln; Ziel = B + 2*(T - B)
function targetForInky(ghost, player, blinky, cols, rows) {
    // "2 tiles ahead" -> bei SCALE=2 sind das 4 Vertex-Schritte
    const AHEAD = -6;

    // Scatter: unten rechts (Ziel darf am Rand liegen)
    if (ghost.mode === "scatter") {
        return { x: cols*2-1, y: rows*2-1 };
    }

    // Chase:
    // 1) Zielpunkt 2 Tiles vor Pac-Man (inkl. originalem "Up-Bug")
    const fx = player.face.x;
    const fy = player.face.y;
    let tx = player.vx;
    let ty = player.vy;

    if (fx ===  1)       tx += AHEAD;
    else if (fx === -1)  tx -= AHEAD;
    else if (fy ===  1)  ty += AHEAD;
    else if (fy === -1) { // Up-Bug: statt (0,-AHEAD) wird (-AHEAD,-AHEAD)
        tx -= AHEAD;
        ty -= AHEAD;
    }

    // 2) Vektor von Blinky zu diesem Punkt verdoppeln
    const dx = tx - blinky.vx;
    const dy = ty - blinky.vy;
    let rx =  2 * dx;
    let ry =  2 * dy;

    // 3) Clamp ins gültige Vertex-Areal (0..cols / 0..rows)
    rx = Math.max(0, Math.min(cols, rx));
    ry = Math.max(0, Math.min(rows, ry));

    return { x: tx, y: ty };
}


// pro Frame von der Loop aufrufen
export function updateInky(ghost, dt, speed, canEdge, cols, player, blinky, isFrightened) {
    const target = targetForInky(ghost, player, blinky, COLS, ROWS);
    ghost.debugTarget = target;                  // ← neu

    const chooser = isFrightened ? (ghost, t, ce, c) =>
        chooseDirAtNodeForwardBiased(ghost, t, ce, c, 0.7, 0.1) : undefined;
    advanceGhost(ghost, dt, speed, canEdge, cols, target, chooser);
}

