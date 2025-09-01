import openMouth from "../../assets/pacman-chihuahua-open.png";
import closedMouth from "../../assets/pacman-chihuahua-avatar.png";
import red from "../../assets/Red.png";
import yellow from "../../assets/Yellow.png";
import blue from "../../assets/HellBlau.png";
import rose from "../../assets/Rose.png";
import { setGhostSprites } from "./ghosts/spriteStore.js";

// src/pages/pacpet/assets.js
export async function loadSprites() {
    // schon vorhandenes Laden deiner Spieler-Sprites…
    const [open, closed] = await Promise.all([
        loadImage(openMouth),   // ← passe Pfade an
        loadImage(closedMouth),
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

