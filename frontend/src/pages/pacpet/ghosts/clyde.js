// src/pages/pacpet/ghosts/clyde.js
import { START, ROWS } from "../constants.js";
import {advanceGhost, chooseDirAtNodeForwardBiased} from "./base.js";

export function createClyde(
    startVX = START.clyde.vx,
    startVY = START.clyde.vy,
    startDir = START.clyde.dir
) {
    return {
        name: "clyde",
        color: "#ffb852",       // orange
        vx: startVX, vy: startVY,
        dir:  { ...startDir },
        edge: { ...startDir },
        along: 0,
        mode: "scatter",        // "scatter" | "chase"
        allowUTurnOnce: false,
    };
}

// Chase: wie Blinky; wenn näher als 8 Tiles → Scatter-Ecke unten links
function targetForClyde(ghost, player, rows) {
    const dx = player.vx - ghost.vx;
    const dy = player.vy - ghost.vy;
    const dist2 = dx*dx + dy*dy;
    const THRESH2 = 8 * 8;

    if (ghost.mode === "scatter" || dist2 < THRESH2) {
        // unten-links „ziehen“
        return { x: 1, y: (rows*2)-1 };
    }
    // sonst jagen wie Blinky
    return { x: player.vx, y: player.vy };
}

export function updateClyde(ghost, dt, speed, canEdge, cols, player, isFrightened) {
    const target = targetForClyde(ghost, player, ROWS);
    ghost.debugTarget = target;                  // ← neu

    const chooser = isFrightened ? (ghost, t, ce, c) =>
        chooseDirAtNodeForwardBiased(ghost, t, ce, c, 0.7, 0.1) : undefined;
    advanceGhost(ghost, dt, speed, canEdge, cols, target, chooser);
}

