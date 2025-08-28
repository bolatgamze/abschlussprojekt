import { W, H, SIZE, SPEED, FRAME_TIME, TILE } from "./constants";
import { drawFrame } from "./draw";
import { isTileWall, consumeDotAtVertex } from "./walls";

export function startGameLoop(ctx, sprites, input) {
    const COLS = Math.floor(W / TILE);
    const ROWS = Math.floor(H / TILE);

    const state = {
        vx: 19,
        vy: 25,

        dir:  { x: 0, y: 0 },
        want: { x: -1, y: 0 },

        along: 0,
        edge:  { x: 0, y: 0 },

        // Basis-Sprite schaut LINKS
        face:  { x: -1, y: 0 },

        pendingStop: false,

        last: performance.now(),
        acc: 0,
        frame: 0,
        rafId: 0,

        score:0,
    };

    const isZero = (v) => v.x === 0 && v.y === 0;
    const inVertexBounds = (x, y) => x >= 0 && y >= 0 && x <= COLS && y <= ROWS;

    // Normale Tile-Abfrage (keine Wraps)
    const tileIsWallOrOut = (tx, ty) =>
        tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS ? true : isTileWall(tx, ty);

    // Wrap-tolerante Tile-Abfrage: wrappt HORIZONTAL (für Tunnel),
    // vertikal NICHT (oben/unten kein Warp).
    function tileIsWallWrapX(tx, ty) {
        if (ty < 0 || ty >= ROWS) return true;        // vertikal weiterhin out=blocked
        const wx = ((tx % COLS) + COLS) % COLS;       // wrap X in [0..COLS-1]
        return isTileWall(wx, ty);
    }

    // 2×2-Kantenprüfung, horizontale Kanten erlauben Wrap über den Rand
    function canEdge2x2Wrap(x, y, dx, dy) {
        let nx = x + dx, ny = y + dy;

        // Vertex-Bounds mit horizontalem Wrap erlauben
        if (dx !== 0 && dy === 0) {
            if (ny < 0 || ny > ROWS) return false;
            // nx in [0..COLS] mit Wrap
            nx = (nx < 0) ? COLS : (nx > COLS) ? 0 : nx;
        } else {
            // vertikale Kanten: keine Wraps
            if (!inVertexBounds(x, y) || !inVertexBounds(nx, ny)) return false;
        }

        if (dx !== 0 && dy === 0) {
            // horizontale Kante: belegte Zeilen = y-1, y
            const rows = [y - 1, y];
            // Spalten abhängig von Richtung (wie zuvor) – aber HIER mit X-Wrap
            const cols = dx > 0 ? [x - 1, x, x + 1] : [x - 2, x - 1, x];
            for (const r of rows) {
                for (const c of cols) {
                    if (r < 0 || r >= ROWS) return false;
                    if (tileIsWallWrapX(c, r)) return false;
                }
            }
            return true;
        }

        if (dy !== 0 && dx === 0) {
            // vertikale Kante: wie gehabt, KEIN Wrap
            const cols = [x - 1, x];
            const rows = dy > 0 ? [y - 1, y, y + 1] : [y - 2, y - 1, y];
            for (const r of rows) {
                if (r < 0 || r >= ROWS) return false;
                for (const c of cols) {
                    if (tileIsWallOrOut(c, r)) return false;
                }
            }
            return true;
        }

        return false;
    }

    function readWant(keys) {
        // horizontale Eingaben zuerst (Pac-Man-Feeling)
        if (keys.left && !keys.right)  return { x: -1, y: 0 };
        if (keys.right && !keys.left)  return { x:  1, y: 0 };
        if (keys.up && !keys.down)     return { x:  0, y: -1 };
        if (keys.down && !keys.up)     return { x:  0, y:  1 };
        return { x: 0, y: 0 };
    }

    function setFaceFromDir() {
        if (state.dir.x !== 0) state.face = { x: state.dir.x, y: 0 };
        else if (state.dir.y !== 0) state.face = { x: 0, y: state.dir.y };
    }

    function tryStartFromStandstill() {
        if (isZero(state.dir) && !isZero(state.want)) {
            if (canEdge2x2Wrap(state.vx, state.vy, state.want.x, state.want.y)) {
                state.dir = { ...state.want };
                state.edge = { ...state.dir };
                state.along = 0;
                setFaceFromDir();
            }
        }
    }

    function advanceMovement(dt) {
        if (isZero(state.dir)) return;

        let dist = SPEED * dt;
        while (dist > 0) {
            const toNext = TILE - state.along;

            if (dist < toNext) {
                state.along += dist;
                dist = 0;
                continue;
            }

            // Knoten erreichen
            dist -= toNext;
            state.along = 0;
            state.vx += state.dir.x;
            state.vy += state.dir.y;

            const gained = consumeDotAtVertex(state.vx, state.vy);
            if (gained) state.score += gained;

            // --- HORIZONTALER WARP der Vertex-Koordinate ---
            if (state.vx < 0) state.vx = COLS;
            else if (state.vx > COLS) state.vx = 0;

            // Stoppen am Knoten, falls angefordert
            if (state.pendingStop) {
                state.dir = { x: 0, y: 0 };
                state.pendingStop = false;
                break;
            }

            // Abbiegen (wenn möglich)
            if ((state.want.x !== state.dir.x || state.want.y !== state.dir.y) &&
                canEdge2x2Wrap(state.vx, state.vy, state.want.x, state.want.y)) {
                state.dir = { ...state.want };
                state.edge = { ...state.dir };
            }

            // Geradeaus weiter? (mit Wrap-Check für horizontal)
            if (!canEdge2x2Wrap(state.vx, state.vy, state.dir.x, state.dir.y)) {
                state.dir = { x: 0, y: 0 };
                break;
            }

            state.edge = { ...state.dir };
            setFaceFromDir();
        }
    }

    function updateAnimation(dt) {
        if (!isZero(state.dir)) {
            state.acc += dt;
            while (state.acc >= FRAME_TIME) {
                state.frame = (state.frame + 1) % 2;
                state.acc -= FRAME_TIME;
            }
        } else {
            state.frame = 1;
        }
    }

    function pixelPosition() {
        let px = state.vx * TILE;
        let py = state.vy * TILE;
        if (state.edge.x) px += state.edge.x * state.along;
        if (state.edge.y) py += state.edge.y * state.along;
        return { x: px, y: py };
    }

    function step(now) {
        const dt = Math.min(0.033, (now - state.last) / 1000);
        state.last = now;

        const k = input.keys;
        const anyKey = k.left || k.right || k.up || k.down;
        state.want = readWant(k);

        // „Tasten losgelassen → am nächsten Knoten stoppen“
        if (!anyKey && !isZero(state.dir)) state.pendingStop = true;
        if (anyKey) state.pendingStop = false;

        tryStartFromStandstill();
        advanceMovement(dt);
        updateAnimation(dt);

        const p = pixelPosition();
        drawFrame(
            ctx,
            sprites,
            p.x - SIZE / 2,
            p.y - SIZE / 2,
            state.frame,
            state.face.x,
            state.face.y
        );

        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(`SCORE ${state.score}`, 8, 18);
        ctx.restore();

        state.rafId = requestAnimationFrame(step);
    }

    state.rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.rafId);
}
