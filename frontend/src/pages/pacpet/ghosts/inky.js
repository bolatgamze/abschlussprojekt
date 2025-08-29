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
    if (ghost.mode === "scatter") {
        // Scatter-Ecke: unten-rechts
        return { x: (cols*2)-1, y: (rows*2)-1 }; // weit unten-rechts „ziehen“
    }

    // 2 vor Pac, inkl. Up-Bug
    const fx = player.face.x;
    const fy = player.face.y;
    let tx = player.vx;
    let ty = player.vy;

    if (fx ===  1)       tx += 2;
    else if (fx === -1)  tx -= 2;
    else if (fy ===  1)  ty += 2;
    else if (fy === -1) { tx -= 2; ty -= 2; } // Up-Bug

    // Spiegel am Blinky → doppelt
    const dx = tx - blinky.vx;
    const dy = ty - blinky.vy;
    return { x: blinky.vx + 2 * dx, y: blinky.vy + 2 * dy };
}

// pro Frame von der Loop aufrufen
export function updateInky(ghost, dt, speed, canEdge, cols, player, blinky, isFrightened) {
    const target = targetForInky(ghost, player, blinky, COLS, ROWS);
    ghost.debugTarget = target;                  // ← neu

    const chooser = isFrightened ? (ghost, t, ce, c) =>
        chooseDirAtNodeForwardBiased(ghost, t, ce, c, 0.7, 0.1) : undefined;
    advanceGhost(ghost, dt, speed, canEdge, cols, target, chooser);
}

