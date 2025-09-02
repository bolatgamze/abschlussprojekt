import { W, H, SIZE, BG } from "./constants";
import {drawWalls} from "./walls.js";
import {drawGrid} from "./grid.js";
import {drawDots} from "./walls.js";

function getPlayerImg(sprites, frame) {
    const openImg   = sprites.playerOpen  || sprites.open;
    const closedImg = sprites.playerClosed || sprites.closed;
    const img = frame === 0 ? openImg : closedImg;
    return img || null;
}

export function drawFrame(ctx, sprites, x, y, frame, faceX, faceY) {
    // Hintergrund
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    drawWalls(ctx);
    //drawGrid(ctx);
    drawDots(ctx);

    // um die Mitte transformieren
    const cx = x + SIZE / 2;
    const cy = y + SIZE / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Basis-Sprite schaut LINKS:
    if (faceX === 1 && faceY === 0) {
        // rechts → horizontal spiegeln (kein Kopfstand)
        ctx.scale(-1, 1);
    } else if (faceX === 0 && faceY === -1) {
        // oben
        ctx.rotate(-Math.PI / 2);
        ctx.scale(-1, 1);
    } else if (faceX === 0 && faceY === 1) {
        // unten
        ctx.rotate(Math.PI / 2);
        ctx.scale(-1, 1);
    }
    // links: keine Transformation

    const img = getPlayerImg(sprites, frame);

    if (img && typeof img.naturalWidth === "number") {
        ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    } else {
        // Fallback-Placeholder, damit kein drawImage-Fehler fliegt
        // (einmalige Warnung hilft beim Debuggen)
        if (!drawFrame._warnedOnce) {
            console.warn("[drawFrame] player image not ready/shape mismatch", { sprites });
            drawFrame._warnedOnce = true;
        }
        ctx.fillStyle = "#ffd35a";
        ctx.beginPath();
        ctx.arc(0, 0, SIZE/2, 0, Math.PI*2);
        ctx.fill();
    }

    // optional dein roter Rahmen etc.
    ctx.restore();
}
