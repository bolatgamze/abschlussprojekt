import {advanceGhost, chooseDirAtNodeForwardBiased} from "./base.js";
import {START} from "../constants.js";

export function createBlinky(
    startVX = START.blinky.vx,
    startVY = START.blinky.vy,
    startDir = START.blinky.dir
    ) {
    return {
        name: "blinky",
        color: "#ff0000",
        vx: startVX, vy: startVY,
        dir: {...startDir },
        edge: { ...startDir },
        along: 0,
        mode: "scatter",          // "scatter" | "chase"
        allowUTurnOnce: false,
    };
}

export function targetForBlinky(ghost, player, cols) {
    if (ghost.mode === "scatter") return { x: cols - 1, y: 1 }; // oben rechts
    return { x: player.vx, y: player.vy };                       // Chase: Pac
}

// wird in jedem Frame aus der loop aufgerufen
export function updateBlinky(ghost, dt, speed, canEdge, cols, player, isFrightened) {
    const target = ghost.mode === "scatter" ? { x: cols - 1, y: 1 } : { x: player.vx, y: player.vy };
    ghost.debugTarget = target;                  // ← neu

    const chooser = isFrightened ? (ghost, t, ce, c) => chooseDirAtNodeForwardBiased(ghost, t, ce, c, 0.7) : undefined;
    advanceGhost(ghost, dt, speed, canEdge, cols, target, chooser);
}

