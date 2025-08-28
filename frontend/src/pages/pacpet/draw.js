import { W, H, SIZE, BG } from "./constants";
import {drawWalls} from "./walls.js";
import {drawGrid} from "./grid.js";
import {drawDots} from "./walls.js";



export function drawFrame(ctx, sprites, x, y, frame, faceX, faceY) {
    // Hintergrund
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    drawWalls(ctx);
    drawGrid(ctx);
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

    const img = frame === 0 ? sprites.open : sprites.closed;
    ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
// weil wir um die Mitte transformiert haben, liegt das Bild bei (-SIZE/2, -SIZE/2)
    ctx.strokeRect(-SIZE / 2 + 0.5, -SIZE / 2 + 0.5, SIZE - 1, SIZE - 1);
    ctx.restore();
}
