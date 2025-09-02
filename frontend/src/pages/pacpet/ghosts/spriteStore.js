let GHOST_SPRITES = {};

/** Einmalig nach dem Laden setzen */
export function setGhostSprites(map) {
    GHOST_SPRITES = map || {};
}

/** Im Draw: Bild per Name holen (z.B. "blinky") */
export function getGhostSprite(name) {
    return (name && GHOST_SPRITES[name]) || null;
}
