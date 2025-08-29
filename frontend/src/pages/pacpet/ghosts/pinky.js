import {advanceGhost, chooseDirAtNodeForwardBiased} from "./base.js";
import { START } from "../constants.js";

// Start rechts von der Box (pass bei Bedarf an)
export function createPinky(
    startVX = START.pinky.vx,
    startVY = START.pinky.vy,
    startDir = START.pinky.dir
    ){
    return {
        name: "pinky",
        color: "#ffb8ff",          // klassisches Pink
        vx: startVX, vy: startVY,
        dir: {...startDir},      // Richtung zur Mitte
        edge: {...startDir},
        along: 0,
        mode: "scatter",           // "scatter" | "chase"
        allowUTurnOnce: false,
    };
}

// Zielkachel (Chase): 4 Tiles vor Pac-Man; Up-Bug: (−4, −4) statt (0, −4)
function targetForPinky(ghost, player, cols) {
    if (ghost.mode === "scatter") return { x: 1, y: 1 }; // oben-links Ecke

    const fx = player.face.x;
    const fy = player.face.y;

    let tx = player.vx;
    let ty = player.vy;

    if (fx === 1)       { tx += 4; }           // rechts
    else if (fx === -1) { tx -= 4; }           // links
    else if (fy === 1)  { ty += 4; }           // unten
    else if (fy === -1) { tx -= 4; ty -= 4; }  // ↑: Up-Bug (vor + links)

    // horizontal darf das Ziel über den Rand hinausgehen; chooseDirAtNode berücksichtigt Wrap
    return { x: tx, y: ty };
}

// pro Frame von der Loop aufrufen
export function updatePinky(ghost, dt, speed, canEdge, cols, player, isFrightened) {
    const target = targetForPinky(ghost, player, cols);
    ghost.debugTarget = target;                  // ← neu

    const chooser = isFrightened ? (ghost, t, ce, c) => chooseDirAtNodeForwardBiased(ghost, t, ce, c, 0.7) : undefined;
    advanceGhost(ghost, dt, speed, canEdge, cols, target, chooser);
}

