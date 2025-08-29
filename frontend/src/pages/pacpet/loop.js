import {
    W,
    H,
    SIZE,
    SPEED,
    GHOST_SPEED,
    FRAME_TIME,
    TILE,
    START,
    MAX_STEPS,
    HUD_HEIGHT,
    HIT_R2,
    FRIGHT_TIME, FRIGHT_SPEED_FACTOR
} from "./constants";
import { drawFrame } from "./draw";
import { isTileWall, consumeDotAtVertex } from "./walls";
import { createBlinky, updateBlinky } from "./ghosts/blinky.js";
import { createPinky,  updatePinky  } from "./ghosts/pinky.js";
import { createInky,   updateInky   } from "./ghosts/inky.js";
import { createClyde,  updateClyde  } from "./ghosts/clyde.js";
import { chooseDirAtNode } from "./ghosts/base.js"; // hinzufügen

import {drawGhost} from "./ghosts/base.js";


const DEBUG_GHOST_PATH = true;
const DEBUG_GHOST_TARGET = true; // Target-Punkt anzeigen (ein/aus)




export function startGameLoop(ctx, sprites, input) {
    const COLS = Math.floor(W / TILE);
    const ROWS = Math.floor(H / TILE);

    // ---- BLINKY ----

    const blinky = createBlinky(START.blinky.vx, START.blinky.vy, START.blinky.dir);
    const pinky = createPinky(START.pinky.vx, START.pinky.vy, START.pinky.dir);
    const inky   = createInky  (START.inky.vx,   START.inky.vy,   START.inky.dir);
    const clyde  = createClyde (START.clyde.vx,  START.clyde.vy,  START.clyde.dir);

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
        readyTimer: 0,          // Sekunden bis Start
        readyAutoStart: false,  // true = nach Countdown automatisch starten
        frightTimer: 0,
        ghostEatChain: 200, // 200→400→800→1600 während eines Fright-Zyklus


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
            const ghosts = [blinky, pinky, inky, clyde].filter(Boolean);
            ghosts.forEach(g => {
                if (!g.dir) g.dir = { x: 1, y: 0 };
                g.mode = next.mode;
                g.dir  = { x: -g.dir.x, y: -g.dir.y };
                g.edge = { ...g.dir };
                g.along = (g.along > 1e-6) ? (TILE - g.along) : 0;
                g.allowUTurnOnce = true;
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

        // Inky
        inky.mode = PHASES[0].mode;
        inky.allowUTurnOnce = false;
        inky.vx   = START.inky.vx;
        inky.vy   = START.inky.vy;
        inky.dir  = { ...START.inky.dir };
        inky.edge = { ...START.inky.dir };
        inky.along = 0;

        // Clyde
        clyde.mode = PHASES[0].mode;
        clyde.allowUTurnOnce = false;
        clyde.vx   = START.clyde.vx;
        clyde.vy   = START.clyde.vy;
        clyde.dir  = { ...START.clyde.dir };
        clyde.edge = { ...START.clyde.dir };
        clyde.along = 0;



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
        if (!Number.isFinite(ty) || !Number.isFinite(tx)) return true;
        ty = Math.floor(ty);
        if (ty < 0 || ty >= ROWS) return true;
        const wx = ((Math.floor(tx) % COLS) + COLS) % COLS;
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
        let safety = 16; // max 16 Knoten pro Frame

        while (dist > 0 && safety-- > 0) {
            let toNext = TILE - state.along;
            if (toNext <= 0) toNext = TILE; // Guard

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

            // Punkte (Dots)
            const gained = consumeDotAtVertex(state.vx, state.vy);
            if (gained) state.score += gained;
            // Pill-Detection (fallback: gained >= 50 gilt als Pille)
            if (gained === 50) {
                state.frightTimer = FRIGHT_TIME;
                state.ghostEatChain = 200;
                // alle Geister auf frightened setzen + sofortiges U-Turn
                [blinky, pinky, inky, clyde].forEach(g => {
                    if (!g) return;
                    g.frightened = true;
                    g.dir  = { x: -g.dir.x, y: -g.dir.y };
                    g.edge = { ...g.dir };
                    if (g.along > 1e-6) g.along = TILE - g.along; else g.along = 0;
                    g.allowUTurnOnce = true;
                });
            }




            // horizontaler Warp
            if (state.vx < 0) state.vx = COLS;
            else if (state.vx > COLS) state.vx = 0;

            // Stop am Knoten?
            if (state.pendingStop) {
                state.dir = { x: 0, y: 0 };
                state.pendingStop = false;
                break;
            }

            // Abbiegen wenn möglich
            if ((state.want.x !== state.dir.x || state.want.y !== state.dir.y) &&
                canEdge2x2Wrap(state.vx, state.vy, state.want.x, state.want.y)) {
                state.dir = { ...state.want };
                state.edge = { ...state.dir };
            }

            // Geradeaus blockiert? → stoppen
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

    function drawReadyOverlay(secondsLeft, autoStart) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (secondsLeft > 0) {
            // Countdown-Zahl
            const n = Math.ceil(secondsLeft);
            ctx.fillStyle = "#1dbf00";
            ctx.font = "bold 48px 'Press Start 2P', monospace";

            ctx.fillText(`${n}`, W / 2, H / 2 - 45);

            ctx.font = "bold 14px 'Press Start 2P', monospace";

            ctx.fillText(autoStart ? "gleich geht's weiter…" : "gleich startbereit…", W / 2, H / 2 + 24);
        } else {
            // Timer abgelaufen
            ctx.fillStyle = "#1dbf00";
            ctx.font = "bold 20px 'Press Start 2P', monospace";

            ctx.fillText("READY!", W / 2, H / 2 -45);

            ctx.font = "bold 14px 'Press Start 2P', monospace";

            ctx.fillText(
                autoStart ? "…" : "Drücke eine Richtungstaste",
                W / 2,
                H / 2 + 16
            );
        }

        ctx.restore();
    }


    function drawHUDBelow(ctx, score, curPhase, phaseTime) {
        // Bereich unter dem Spielfeld als Hintergrund
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H, W, HUD_HEIGHT);

        // Phase / Label / Progress
        const label = curPhase.mode.toUpperCase(); // "SCATTER" | "CHASE"
        const color = curPhase.mode === "scatter" ? "#00e676" : "#ff5252";
        const finite = Number.isFinite(curPhase.t);
        const prog = finite ? Math.min(1, Math.max(0, phaseTime / curPhase.t)) : 1;

        // Score links
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "bold 16px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffd35a";
        ctx.fillText(`SCORE ${score}`, 12, H + HUD_HEIGHT / 2);

        // Mode rechts
        ctx.textAlign = "right";
        ctx.fillStyle = color;
        ctx.fillText(label, W - 12, H + HUD_HEIGHT / 2);

        // Progressbar mittig (nur wenn Phase endlich)
        if (finite) {
            const barW = Math.min(240, W * 0.5);
            const barH = 6;
            const x = (W - barW) / 2;
            const y = H + HUD_HEIGHT / 2 + 18;
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW * prog, barH);
        }

        ctx.restore();
    }

    function pixelPosFromEdge(vx, vy, edge, along) {
        let x = vx * TILE, y = vy * TILE;
        if (edge?.x) x += edge.x * along;
        if (edge?.y) y += edge.y * along;
        return { x, y };
    }

    // Simuliere die nächsten Junction-Schritte (ändert den echten Geist NICHT)
    function computeGhostPath(g, target, canEdge, cols, rows, maxSteps) {
        // Ziel sauber clampen & runden
        const tx = Math.max(0, Math.min(cols, Math.round(target.x)));
        const ty = Math.max(0, Math.min(rows, Math.round(target.y)));

        const sim = {
            vx: g.vx, vy: g.vy,
            dir: { ...(g.dir || { x: 0, y: 0 }) },
            edge:{ ...(g.edge|| { x: 0, y: 0 }) },
            along: Number.isFinite(g.along) ? g.along : 0,
            allowUTurnOnce: false,
        };

        const pts = [pixelPosFromEdge(sim.vx, sim.vy, sim.edge, sim.along)];

        for (let i = 0; i < maxSteps; i++) {
            // Falls keine Richtung (z.B. gerade gestoppt): eine wählen
            if (sim.dir.x === 0 && sim.dir.y === 0) {
                const nd = chooseDirAtNode(sim, { x: tx, y: ty }, canEdge, cols);
                sim.dir = { ...nd };
                sim.edge = { ...nd };
            }

            // zum nächsten Knoten „springen“
            let nx = sim.vx + sim.dir.x;
            let ny = sim.vy + sim.dir.y;
            if (sim.dir.x !== 0) {
                if (nx < 0) nx = cols;
                else if (nx > cols) nx = 0;
            }
            sim.vx = nx;
            sim.vy = ny;
            sim.along = 0;
            sim.edge = { ...sim.dir };

            pts.push({ x: sim.vx * TILE, y: sim.vy * TILE });

            if (sim.vx === tx && sim.vy === ty) break;

            const ndir = chooseDirAtNode(sim, { x: tx, y: ty }, canEdge, cols);
            sim.dir = { ...ndir };
            sim.edge = { ...ndir };
        }

        return pts;
    }

    function drawGhostPath(ctx, g, color) {
        if (!DEBUG_GHOST_PATH || !g.debugTarget) return;
        const pts = computeGhostPath(g, g.debugTarget, canEdge2x2Wrap, COLS, ROWS, MAX_STEPS);
        if (pts.length < 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
    }

    function drawGhostTarget(ctx, g, cols, rows, color) {
        if (!DEBUG_GHOST_TARGET || !g.debugTarget) return;

        // Ziel robust runden & clampen
        const tx = Math.max(0, Math.min(cols, Math.round(g.debugTarget.x)));
        const ty = Math.max(0, Math.min(rows, Math.round(g.debugTarget.y)));

        const x = tx * TILE;
        const y = ty * TILE;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // kleiner Kontrast-Ring, damit es auf dunklen Wänden sichtbar bleibt
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.stroke();
        ctx.restore();
    }

// Zentren
    function playerCenter() {
        const p = pixelPosition(); // liefert schon das Zentrum (weil du beim Draw -SIZE/2 verwendest)
        return { x: p.x, y: p.y };
    }

    function ghostCenter(g) {
        // gleiche Berechnung wie in drawGhost / debug
        let x = g.vx * TILE, y = g.vy * TILE;
        if (g.edge?.x) x += g.edge.x * g.along;
        if (g.edge?.y) y += g.edge.y * g.along;
        return { x, y };
    }

// Kollisionstest


    function collideWithGhosts(ghosts) {
        const pc = playerCenter();
        for (const g of ghosts) {
            if (!g) continue;
            const gc = ghostCenter(g);
            const dx = gc.x - pc.x;
            const dy = gc.y - pc.y;
            if (dx*dx + dy*dy <= HIT_R2) return g; // getroffen
        }
        return null;
    }

    function enterReady({ autoStart = true, seconds = 3, keepScore = true, levelReset = false } = {}) {
        // Run zurücksetzen (Positionen/Phasen etc.)
        resetRun({ keepScore, levelReset });

        state.mode = "ready";
        state.readyTimer = seconds;
        state.readyAutoStart = autoStart;
    }



    function step(now) {
        const dt = Math.min(0.033, (now - state.last) / 1000);
        state.last = now;

        const k = input.keys;
        const anyKey = k.left || k.right || k.up || k.down;
        state.want = readWant(k);

        if (state.mode === "ready") {
            // Countdown ticken lassen
            if (state.readyTimer > 0) {
                state.readyTimer -= dt;
            }

            // Szene zeichnen (Player/Geister stehen)
            const p = pixelPosition();
            drawFrame(ctx, sprites, p.x - SIZE / 2, p.y - SIZE / 2, 1, state.face.x, state.face.y);
            // Geister im Ready zeigen:
            drawGhost(ctx, blinky);
            drawGhost(ctx, pinky);
            drawGhost(ctx, inky);
            drawGhost(ctx, clyde);

            // Overlay
            drawReadyOverlay(state.readyTimer, state.readyAutoStart);
            const cur = PHASES[phaseIdx];
            drawHUDBelow(ctx, state.score, cur, phaseTime);


            // Start-Logik
            if (state.readyTimer <= 0) {
                if (state.readyAutoStart) {
                    state.mode = "play";              // automatisch los
                    state.last = performance.now();   // sauberes dt
                } else if (anyKey) {
                    state.mode = "play";              // per Taste los
                    // (optional) Phase/Run nochmal resetten, wenn du willst:
                    // resetRun({ keepScore: true });
                    state.last = performance.now();
                }
            }

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

        // Fright-Countdown
        if (state.frightTimer > 0) {
            state.frightTimer -= dt;
            if (state.frightTimer <= 0) {
                state.frightTimer = 0;
                state.ghostEatChain = 200;
                [blinky, pinky, inky, clyde].forEach(g => { if (g) g.frightened = false; });
            }
        } else {
            // Nur wenn NICHT frightened: Scatter/Chase-Phasen weiterticken
            updatePhase(dt);
        }


        // --- BLINKY updaten (NEU) ---
        const gSpeed = state.frightTimer > 0 ? GHOST_SPEED * FRIGHT_SPEED_FACTOR : GHOST_SPEED;
        const fr = state.frightTimer > 0;

        updateBlinky(blinky, dt, gSpeed, canEdge2x2Wrap, COLS, state, fr);
        updatePinky (pinky,  dt, gSpeed, canEdge2x2Wrap, COLS, state, fr);
        updateInky  (inky,   dt, gSpeed, canEdge2x2Wrap, COLS, state, blinky, ROWS, fr);
        updateClyde (clyde,  dt, gSpeed, canEdge2x2Wrap, COLS, state, ROWS, fr);


        // --- Kollision prüfen ---
        const hit = collideWithGhosts([blinky, pinky, inky, clyde]);
        if (hit) {
            if (state.frightTimer > 0 && hit.frightened) {
                // Geist wird gegessen
                state.score += state.ghostEatChain;
                // Kettenwert verdoppeln (max 1600)
                if (state.ghostEatChain < 1600) state.ghostEatChain *= 2;

                // Geist „auferstehen“: zurück auf Start, frightened aus
                const STARTS = { blinky: START.blinky, pinky: START.pinky, inky: START.inky, clyde: START.clyde };
                const st = STARTS[hit.name] || START.blinky;
                hit.vx = st.vx; hit.vy = st.vy;
                hit.dir = { ...st.dir }; hit.edge = { ...st.dir };
                hit.along = 0;
                hit.frightened = false;
                hit.allowUTurnOnce = false;
            } else {
                // normaler Tod → Ready mit Countdown
                enterReady({ autoStart: true, seconds: 3, keepScore: true });
                // sofort Ready-Frame zeichnen & return (wie bereits bei dir)
                const p = pixelPosition();
                drawFrame(ctx, sprites, p.x - SIZE / 2, p.y - SIZE / 2, 1, state.face.x, state.face.y);
                drawGhost(ctx, blinky); drawGhost(ctx, pinky); drawGhost(ctx, inky); drawGhost(ctx, clyde);
                drawReadyOverlay(state.readyTimer, state.readyAutoStart);
                state.rafId = requestAnimationFrame(step);
                return;
            }
        }



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
        drawGhost(ctx, blinky, state.frightTimer);
        drawGhost(ctx, pinky, state.frightTimer);
        drawGhost(ctx, inky, state.frightTimer);
        drawGhost(ctx, clyde, state.frightTimer);

        drawGhostPath(ctx, blinky, "#ff5252");
        drawGhostPath(ctx, pinky,  "#ff80ff");
        drawGhostPath(ctx, inky,   "#40e0e0");
        drawGhostPath(ctx, clyde,  "#ffb852");

        drawGhostTarget(ctx, blinky, COLS, ROWS, "#ff5252");
        drawGhostTarget(ctx, pinky,  COLS, ROWS, "#ff80ff");
        drawGhostTarget(ctx, inky,   COLS, ROWS, "#40e0e0");
        drawGhostTarget(ctx, clyde,  COLS, ROWS, "#ffb852");

        // HUD unten zeichnen
        const cur = PHASES[phaseIdx];
        drawHUDBelow(ctx, state.score, cur, phaseTime);




        state.rafId = requestAnimationFrame(step);
    }

    state.rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.rafId);
}
