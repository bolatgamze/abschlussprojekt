import rufusOpen from "../../assets/rufus_open.png";
import rufusClosed from "../../assets/rufus_closed.png";
import gandalfOpen from "../../assets/gandalf_open.png";
import gandalfClosed from "../../assets/gandalf_closed.png";
import simbaOpen from "../../assets/simba_open.png";
import simbaClosed from "../../assets/simba_closed.png";
import lokiOpen from "../../assets/loki_open.png";
import lokiClosed from "../../assets/loki_closed.png";

import red from "../../assets/Red.png";
import yellow from "../../assets/Yellow.png";
import blue from "../../assets/HellBlau.png";
import rose from "../../assets/Rose.png";
import { setGhostSprites } from "./ghosts/spriteStore.js";


const SKIN_FILES = {
    RUFUS:   { open: rufusOpen,   closed: rufusClosed },
    GANDALF: { open: gandalfOpen, closed: gandalfClosed },
    SIMBA:   { open: simbaOpen,   closed: simbaClosed },
    LOKI:    { open: lokiOpen,    closed: lokiClosed },
};
// lädt genau einen Skin (open/closed) anhand des Namens
export async function loadPlayerSkinByName(name) {
    const key = String(name || '').toUpperCase();
    const def = SKIN_FILES[key];
    if (!def) console.warn(`[skins] unknown skin "${key}", falling back to RUFUS`);
    const use = def || SKIN_FILES.RUFUS;
    const [open, closed] = await Promise.all([loadImage(use.open), loadImage(use.closed)]);
    return { open, closed, name: def ? key : 'RUFUS' };
}

// wendet den Skin auf dein bestehendes sprites-Objekt an
export function applyNamedPlayerSkin(sprites, skin) {
    sprites.playerOpen   = skin.open;
    sprites.playerClosed = skin.closed;
    sprites.playerSkinName = skin.name;
}
// src/pages/pacpet/assets.js
export async function loadSprites() {
    // schon vorhandenes Laden deiner Spieler-Sprites…
    const [open, closed] = await Promise.all([
        loadImage(rufusOpen),   // ← passe Pfade an
        loadImage(rufusClosed),
    ]);

    // NEU: Ghost-Sprites
    const ghosts = await loadGhostsFromPublic();
    setGhostSprites(ghosts);
    return {
        player: { open, closed },
        ghosts, // { blinky, pinky, inky, clyde }
    };
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function loadGhostsFromPublic() {
    const files = {
        blinky: red,
        pinky:  rose,
        inky:   blue,
        clyde:  yellow,
    };
    const entries = await Promise.all(
        Object.entries(files).map(async ([name, path]) => [name, await loadImage(path)])
    );
    return Object.fromEntries(entries);
}

