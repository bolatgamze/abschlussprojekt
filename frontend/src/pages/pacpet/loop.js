import {W, H, SIZE, SPEED, FRAME_TIME, TILE, START} from "./constants";
import { drawFrame } from "./draw";
import { isTileWall, consumeDotAtVertex } from "./walls";
import { createBlinky, updateBlinky } from "./ghosts/blinky.js";
import { createPinky,  updatePinky  } from "./ghosts/pinky.js";
import {drawGhost} from "./ghosts/base.js";

export function startGameLoop(ctx, sprites, input) {
    const COLS = Math.floor(W / TILE);
    const ROWS = Math.floor(H / TILE);

    // ---- BLINKY ----
    const GHOST_SPEED = SPEED * 0.95;            // (OBEN ergänzt)
    const blinky = createBlinky(START.blinky.vx, START.blinky.vy, START.blinky.dir);
    const pinky = createPinky(START.pinky.vx, START.pinky.vy, START.pinky.dir);// (OBEN ergänzt)

    const state = {
        mode: "ready", // "ready" wartet auf Start, "play" → läuft
        vx: 19,
        vy: 25,

        dir:  { x: 0, y: 0 },
        want: { x: -1, y: 0 },
        along: 0,
        edge:  { x: 0, y: 0 },
        face:  { x: -1, y: 0 },
        pendingStop: false,
        last: performance.now(),
        acc: 0,
        frame: 0,
        rafId: 0,
        score: 0,
    };

    // ---- Scatter/Chase Phasen (NEU) ----
    // leicht verkürzt: S7, C20, S7, C20, S5, C20, S5, C∞
    const PHASES = [
        { mode: "scatter", t: 7 },
        { mode: "chase",   t: 20 },
        { mode: "scatter", t: 7 },
        { mode: "chase",   t: 20 },
        { mode: "scatter", t: 5 },
        { mode: "chase",   t: 20 },
        { mode: "scatter", t: 5 },
        { mode: "chase",   t: Infinity },
    ];
    let phaseIdx = 0;
    let phaseTime = 0;

    function updatePhase(dt) {
        phaseTime += dt;
        const cur = PHASES[phaseIdx];
        if (phaseTime >= cur.t) {
            phaseTime = 0;
            phaseIdx = Math.min(phaseIdx + 1, PHASES.length - 1);
            const next = PHASES[phaseIdx];

            // alle aktiven Geister hier rein
            const ghosts = [blinky, pinky /*, inky, clyde */];

            ghosts.forEach(g => {
                g.mode = next.mode;
                g.dir  = { x: -g.dir.x, y: -g.dir.y };
                g.edge = { ...g.dir };
                g.along = (g.along > 1e-6) ? (TILE - g.along) : 0; // nicht am Knoten spiegeln
                g.allowUTurnOnce = true;                            // U-Turn am nächsten Knoten erlauben
            });
        }
    }


// Setzt Player + Blinky + Phasen zurück (Dots/Score optional)
    function resetRun({ keepScore = true, levelReset = false } = {}) {
        // Scatter/Chase neu starten
        phaseIdx = 0;
        phaseTime = 0;
        blinky.mode = PHASES[0].mode; // meist "scatter"
        blinky.allowUTurnOnce = false;

        // Blinky-Position/Richtung
        blinky.vx   = START.blinky.vx;
        blinky.vy   = START.blinky.vy;
        blinky.dir  = { ...START.blinky.dir };
        blinky.edge = { ...START.blinky.dir };
        blinky.along = 0;

        // Pinky
        pinky.mode = PHASES[0].mode;
        pinky.allowUTurnOnce = false;
        pinky.vx   = START.pinky.vx;
        pinky.vy   = START.pinky.vy;
        pinky.dir  = { ...START.pinky.dir };
        pinky.edge = { ...START.pinky.dir };
        pinky.along = 0;

        // Player-Position/Richtung
        state.vx = START.player.vx;
        state.vy = START.player.vy;
        state.dir  = { x: 0, y: 0 };
        state.want = { x: -1, y: 0 };
        state.edge = { x: 0, y: 0 };
        state.along = 0;
        state.face  = { ...START.player.face };
        state.pendingStop = false;

        // Animation/Timing
        state.acc = 0;
        state.frame = 1; // Mund zu
        state.last = performance.now();

        // Punkte behalten oder zurücksetzen
        if (!keepScore) state.score = 0;

        // Level komplett zurücksetzen? (Dots etc.) → später:
        // if (levelReset) resetDots(); // (würden wir aus walls.js exportieren)
    }

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

    function drawStartOverlay() {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("READY!", W / 2, H / 2 - 8);
        ctx.font = "14px monospace";
        ctx.fillText("Drücke eine Richtungstaste", W / 2, H / 2 + 16);
        ctx.restore();
    }

    function drawModeHUD(ctx) {
        const cur = PHASES[phaseIdx];
        const label = cur.mode.toUpperCase(); // "SCATTER" | "CHASE"
        const color = cur.mode === "scatter" ? "#00e676" : "#ff5252";
        const prog = Number.isFinite(cur.t) ? Math.min(1, Math.max(0, phaseTime / cur.t)) : 1;

        const padX = 12, padY = 6;
        ctx.save();
        ctx.font = "bold 14px monospace";
        const textW = ctx.measureText(label).width;
        const w = textW + padX * 2;
        const h = 24;

        const x = (W - w) / 2;
        const y = 6;

        // Badge-Hintergrund
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        // Fortschrittsbalken (nur wenn Phase endlich)
        if (Number.isFinite(cur.t)) {
            const barPad = 3;
            const bx = x + barPad, by = y + h - 6, bw = w - barPad * 2, bh = 4;
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = color;
            ctx.fillRect(bx, by, bw * prog, bh);
        }

        // Text
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + w / 2, y + 11);

        ctx.restore();
    }




    function step(now) {
        const dt = Math.min(0.033, (now - state.last) / 1000);
        state.last = now;

        const k = input.keys;
        const anyKey = k.left || k.right || k.up || k.down;
        state.want = readWant(k);

        if (state.mode === "ready") {
            // Start bei erster Richtungstaste
            if (anyKey) {
                state.mode = "play";
                resetRun({ keepScore: true, levelReset: false });

            }

            // trotzdem zeichnen (Idle-Frame + Overlay)
            const p = pixelPosition();
            drawFrame(ctx, sprites, p.x - SIZE / 2, p.y - SIZE / 2, 1, state.face.x, state.face.y);
            drawGhost(ctx, blinky);
            drawGhost(ctx, pinky);
            drawStartOverlay();

            state.rafId = requestAnimationFrame(step);
            return;
        }

        // --- Scatter/Chase-Plan updaten (NEU) ---
        updatePhase(dt);

        // „Tasten losgelassen → am nächsten Knoten stoppen“
        if (!anyKey && !isZero(state.dir)) state.pendingStop = true;
        if (anyKey) state.pendingStop = false;

        tryStartFromStandstill();
        advanceMovement(dt);
        updateAnimation(dt);

        // --- BLINKY updaten (NEU) ---
        updateBlinky(blinky, dt, GHOST_SPEED, canEdge2x2Wrap, COLS, state);
        updatePinky(pinky, dt, GHOST_SPEED, canEdge2x2Wrap, COLS, state);

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

        // (Ghost zeichnen: falls du eine drawGhost()-Routine hast, hier aufrufen)
        drawGhost(ctx, blinky);
        drawGhost(ctx, pinky);

        drawModeHUD(ctx);

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
