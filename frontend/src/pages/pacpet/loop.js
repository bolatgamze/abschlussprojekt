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
    FRIGHT_TIME, FRIGHT_SPEED_FACTOR, START_LIVES
} from "./constants";
import { drawFrame } from "./draw";
import { isTileWall, consumeDotAtVertex, dotsLeft, resetDots, isDoor } from "./walls";
import { createBlinky, updateBlinky } from "./ghosts/blinky.js";
import { createPinky,  updatePinky  } from "./ghosts/pinky.js";
import { createInky,   updateInky   } from "./ghosts/inky.js";
import { createClyde,  updateClyde  } from "./ghosts/clyde.js";
import { advanceGhost, chooseDirAtNode } from "./ghosts/base.js"; // hinzufügen

import {drawGhost} from "./ghosts/base.js";


const DEBUG_GHOST_PATH = true;
const DEBUG_GHOST_TARGET = false; // Target-Punkt anzeigen (ein/aus)

// --- Bonus-Items (Fruit) ---
const FRUIT_SPAWN_DOTS = [70, 170];   // pro Leben: 1. Fruit nach 70, 2. nach 170
const FRUIT_LIFETIME   = 9.0;         // Sekunden sichtbar

// Punkte/„Arten“ je Level (vereinfachte Tabelle)
const FRUIT_TABLE = [
    { name: "cherry",   value: 100,  color: "#ff3b30" },
    { name: "straw",    value: 300,  color: "#ff2d55" },
    { name: "orange",   value: 500,  color: "#ff9500" },
    { name: "apple",    value: 700,  color: "#34c759" },
    { name: "melon",    value: 1000, color: "#30d158" },
    { name: "galaxian", value: 2000, color: "#5ac8fa" },
    { name: "bell",     value: 3000, color: "#ffd60a" },
    { name: "key",      value: 5000, color: "#ffd60a" },
];
function fruitForLevel(level) {
    const idx = Math.min(level - 1, FRUIT_TABLE.length - 1);
    return FRUIT_TABLE[idx];
}



export function startGameLoop(ctx, sprites, input) {
    const COLS = Math.floor(W / TILE);
    const ROWS = Math.floor(H / TILE);

    // Ermittelt die Tür-Bounds (T.BLOCK) und liefert den besten Exit-Vertex:
// - doorVx: Vertex-Spalte mittig unter der Tür (so dass [vx-1,vx] komplett in der Tür liegt)
// - doorBelowVy: Vertex-Reihe direkt UNTER der Tür (Startpunkt), nach oben geht's raus
    // Tür finden (gerichtet nach OBEN, d. h. Blinky steht über der Tür, Clyde innen)
    function findDoorExit() {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                if (isDoor(tx, ty)) {
                    if (tx < minX) minX = tx;
                    if (tx > maxX) maxX = tx;
                    if (ty < minY) minY = ty;
                    if (ty > maxY) maxY = ty;
                }
            }
        }
        // Fallback (falls isDoor leer wäre)
        if (!Number.isFinite(minX)) {
            const cx = (COLS / 2) | 0;
            const cy = (ROWS / 2) | 0;
            return { doorVx: cx, doorBelowVy: cy + 1, doorTopTy: cy, doorCols: [cx - 1, cx] };
        }

        // Mitte der Tür in Tile-Koordinaten & passende Vertex-Spalte (2×2: [vx-1, vx])
        const doorCenterTile = Math.round((minX + maxX) / 2);
        const doorVx = Math.max(minX + 1, Math.min(doorCenterTile, maxX));

        const doorTopTy   = minY;         // oberste Tür-Zeile
        const doorBelowVy = doorTopTy + 1; // Start-Vertex direkt UNTER der Tür (wir öffnen die Reihe darüber virtuell)
        const doorCols    = [doorVx - 1, doorVx];

        return { doorVx, doorBelowVy, doorTopTy, doorCols };
    }

    const DOOR = findDoorExit();   // { doorVx, doorBelowVy }

    function findFruitSpot(passable) {
        // Start mittig unter der Tür
        let vx = DOOR.doorVx;
        let vy = DOOR.doorBelowVy + 4;
        // Fallback-Suche nach unten
        for (let o = 0; o < 6; o++) {
            const y = vy + o;
            const ok = passable(vx - 1, y - 1) && passable(vx, y - 1) &&
                passable(vx - 1, y)     && passable(vx, y);
            if (ok) return { vx, vy: y };
        }
        // letzter Fallback: Mitte des Boards
        return { vx: (COLS/2)|0, vy: ((ROWS/2)|0) + 4 };
    }
    const FRUIT_POS = findFruitSpot((tx,ty)=>!isTileWall(tx,ty) && !isDoor(tx,ty));

    // Zielpunkt für Augen: 1 Vertex INSIDE über der Tür
    function ghostHomeTarget() {
        return { x: DOOR.doorVx, y: DOOR.doorBelowVy };
    }

// per-Ghost-Speed (Augen sind schneller)
    function speedForGhost(g, base, fright, frightFactor = 0.6, eyesFactor = 1.6) {
        if (g.eyes) return base * eyesFactor;
        if (fright) return base * frightFactor;
        return base;
    }

// Augen-Update: ignoriert Scatter/Chase, steuert auf's Haus
    function updateGhostEyes(g, dt, cols, canEdge) {
        const tgt = ghostHomeTarget();
        const speed = speedForGhost(g, GHOST_SPEED, false);

        // Falls noch keine Richtung, einmal initial wählen
        if (!g.dir || (g.dir.x === 0 && g.dir.y === 0)) {
            const nd = chooseDirAtNode(g, tgt, canEdge, cols);
            g.dir  = { ...nd };
            g.edge = { ...nd };
        }

        // vorankommen
        advanceGhost(g, dt, speed, canEdge, cols, tgt, chooseDirAtNode);

        // Ankunft prüfen: am Zielknoten & genau am Vertex?
        if ( g.vx === tgt.x && g.vy === tgt.y) {
            // Eyes sind zu Hause angekommen → zurückverwandeln
            g.eyes = false;
            g.frightened = false;
            g.inHouse = true;
            g.passingDoor = false;
            g.allowUTurnOnce = false;

            // Respawn: kurz stehen, dann später herauslassen
            g.respawnTimer = 3;     // Sekunden (anpassen nach Geschmack)
            g.dir  = { x: 0, y: 0 };
            g.edge = { x: 0, y: 0 };
            g.along = 0;
        }
    }



    // ---- BLINKY ----

    const blinky = createBlinky(START.blinky.vx, START.blinky.vy, START.blinky.dir);
    const pinky = createPinky(START.pinky.vx, START.pinky.vy, START.pinky.dir);
    const inky   = createInky  (START.inky.vx,   START.inky.vy,   START.inky.dir);
    const clyde  = createClyde (START.clyde.vx,  START.clyde.vy,  START.clyde.dir);

    blinky.img = sprites.ghosts.blinky;
    pinky.img  = sprites.ghosts.pinky;
    inky.img   = sprites.ghosts.inky;
    clyde.img  = sprites.ghosts.clyde;

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
        lives: START_LIVES,
        gameOver: false,
        level: 1,
        stageTimer: 0,         // Countdown für "STAGE CLEAR"
        playTime: 0,                  // hast du evtl. schon – sonst hinzufügen
        pelletsSinceLife: 0,
        fruit: { active: false, vx: 0, vy: 0, ttl: 0, value: 0, color: "#fff", name: "" },
        fruitSpawnedThisLife: 0,      // 0..2
        nextExtraLifeAt: 10000,       // Extra-Life Schwelle(n)
        popups: [],
        fruitsThisLevel: [],

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

    enterReady({
        autoStart: false,
        seconds: 0,
        keepScore: true,
        levelReset: false,
        snapToDoor: false,   // sorgt für zentrierten Exit + passingDoor=true
    });

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
    // loop.js
    function resetRun({
                          keepScore = true,
                          levelReset = false,
                          preserveLives = true,   // <-- NEU: Leben standardmäßig NICHT anfassen
                          snapToDoor = true,
                      } = {}) {

        // Score nur zurücksetzen, wenn explizit gewünscht
        if (!keepScore) state.score = 0;

        // Leben NIEMALS hier erhöhen/zurücksetzen, außer preserveLives === false
        if (!preserveLives) {
            // wenn du hier auf START_LIVES setzen willst, dann explizit:
            state.lives = START_LIVES;
        }

        // Timings zurück
        phaseIdx = 0;
        phaseTime = 0;
        state.frightTimer = 0;
        state.ghostEatChain = 200;

        // Spieler-Startposition/Richtung/etc. (dein bisheriger Code)
        state.vx = START.player.vx;
        state.vy = START.player.vy;
        state.dir = { x: 0, y: 0 };
        state.want = { x: -1, y: 0 };
        state.face = { ...START.player.face };
        state.edge = { x: 0, y: 0 };
        state.along = 0;
        state.pendingStop = false;

        // Geister auf Start (dein bisheriger Code)
        const ghosts = [
            ["blinky", blinky],
            ["pinky",  pinky],
            ["inky",   inky],
            ["clyde",  clyde],
        ].filter(([,g]) => g);

        ghosts.forEach(([name, g]) => {
            const st = START[name];
            g.mode = PHASES[0].mode;
            g.frightened = false;
            g.allowUTurnOnce = false;
            g.vx = st.vx; g.vy = st.vy;
            g.dir = { ...st.dir };
            g.edge = { ...st.dir };
            g.along = 0;
        });

        function markHouseFlags() {
            if (blinky) { blinky.inHouse = false; blinky.eyes = false; blinky.passingDoor = false; }
            if (pinky)  { pinky.inHouse  = true;  pinky.eyes  = false; pinky.passingDoor  = false; }
            if (inky)   { inky.inHouse   = true;  inky.eyes   = false; inky.passingDoor   = false; }
            if (clyde)  { clyde.inHouse  = true;  clyde.eyes  = false; clyde.passingDoor  = false; }
        }

        function setupHouseExit(g) {
            if (!g) return;
            if (g.inHouse) {
                // exakt unter der Tür zentrieren (2×2 passt jetzt hindurch)
                g.vx = DOOR.doorVx;
                g.vy = DOOR.doorBelowVy;

                // Ausrichtung NACH OBEN (durch die Tür)
                g.dir  = { x: 0, y: -1 };
                g.edge = { x: 0, y: -1 };
                g.along = 0;

                // während des Exits darf er die Tür passieren
                g.passingDoor = true;
                // einmaliger U-Turn erlaubt, falls nötig
                g.allowUTurnOnce = true;
            } else {
                g.passingDoor = false;
            }
        }


        // Dots ggf. neu laden
        if (levelReset) {
            // z.B.: resetDots();
        }

        markHouseFlags();

        // nur wenn gewünscht, zur Tür snappen:
        if (snapToDoor) {
            setupHouseExit(pinky);
            setupHouseExit(inky);
            setupHouseExit(clyde);
        } else {
            // nach Tod: im Haus lassen, aber normale Flags
            if (pinky)  { pinky.passingDoor = false; pinky.allowUTurnOnce = true; }
            if (inky)   { inky.passingDoor  = false; inky.allowUTurnOnce  = true; }
            if (clyde)  { clyde.passingDoor = false; clyde.allowUTurnOnce = true; }
        }

        // Blinky bleibt draußen
        if (blinky) { blinky.inHouse = false; blinky.passingDoor = false; }
        state.playTime = 0;
        state.pelletsSinceLife = 0;
        state.fruitSpawnedThisLife = 0;
        state.fruit.active = false;
        state.fruit.ttl = 0;
// Popups leeren
        state.popups.length = 0;
    }


    const isZero = (v) => v.x === 0 && v.y === 0;

    // --- Agent-Passierbarkeit ---
    const passableForPlayer = (tx, ty) => !isTileWall(tx, ty) && !isDoor(tx, ty);

    const passableForGhost = (g) => (tx, ty) => {
        // Wände blocken...
        if (isTileWall(tx, ty)) {
            // ...außer: Ein Geist im Haus darf GENAU EINE Reihe direkt ÜBER der Tür passieren,
            // und zwar nur in den beiden Tür-Spalten (wegen 2×2-Hitbox).
            if (g?.inHouse) {
                const isDoorColumn   = (tx === DOOR.doorCols[0] || tx === DOOR.doorCols[1]);
                const isRowAboveDoor = (ty === DOOR.doorTopTy - 1);
                if (isDoorColumn && isRowAboveDoor) return true; // virtuelle Öffnung
            }
            return false;
        }

        // Die Tür selbst ist passierbar für: Augen, „gerade beim Durchgang“, oder generell solange im Haus
        if (isDoor(tx, ty)) return !!(g?.eyes || g?.passingDoor || g?.inHouse);

        return true;
    };

// --- horizontales Wrap für Tile-X ---
    const wrapX = (tx) => ((tx % COLS) + COLS) % COLS;

    /**
     * Prüft, ob eine 2×2-Hitbox die Kante (vx,vy)->(vx+dx,vy+dy) sauber fahren kann.
     * - Horizontal: X-wrap erlaubt (Tunnel), Y out-of-bounds => block
     * - Vertikal:   kein Wrap, both in-bounds
     * passable(tx,ty): true, wenn Tile passierbar für den Agenten
     */
    function canEdge2x2WrapAgent(vx, vy, dx, dy, passable) {
        const inVertexBounds = (x, y) => x >= 0 && y >= 0 && x <= COLS && y <= ROWS;

        // Ziel-Vertex prüfen (mit horizontalem Wrap nur bei Horizontalfahrt)
        let nx = vx + dx, ny = vy + dy;

        if (dx !== 0 && dy === 0) {
            // Horizontal: Y muss gültig sein, X darf wrappen
            if (ny < 0 || ny > ROWS) return false;
            // belegte Zeilen der 2×2-Hitbox
            const rows = [vy - 1, vy];
            // Tiles, die beim Fahren berührt werden
            const cols = dx > 0 ? [vx - 1, vx, vx + 1] : [vx - 2, vx - 1, vx];
            for (const r of rows) {
                if (r < 0 || r >= ROWS) return false;
                for (let c of cols) {
                    c = wrapX(c); // ← Wrap nur horizontal
                    if (!passable(c, r)) return false;
                }
            }
            return true;
        }

        if (dy !== 0 && dx === 0) {
            // Vertikal: kein Wrap, beide Vertices in Bounds
            if (!inVertexBounds(vx, vy) || !inVertexBounds(nx, ny)) return false;
            const cols = [vx - 1, vx];
            const rows = dy > 0 ? [vy - 1, vy, vy + 1] : [vy - 2, vy - 1, vy];
            for (const r of rows) {
                if (r < 0 || r >= ROWS) return false;
                for (const c of cols) {
                    if (c < 0 || c >= COLS) return false;
                    if (!passable(c, r)) return false;
                }
            }
            return true;
        }

        return false; // keine Diagonalen
    }

    const canPlayerEdge = (vx, vy, dx, dy) =>
        canEdge2x2WrapAgent(vx, vy, dx, dy, passableForPlayer);

    const canGhostEdge = (g) => (vx, vy, dx, dy) =>
        canEdge2x2WrapAgent(vx, vy, dx, dy, passableForGhost(g));

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
            if (canPlayerEdge(state.vx, state.vy, state.want.x, state.want.y)) {
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
            state.pelletsSinceLife += 1;
            // Fruit-Spawn prüfen sobald ein Dot gegessen wurde
            maybeSpawnFruit();
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

            if (state.fruit.active && state.along === 0 &&
                state.vx === state.fruit.vx && state.vy === state.fruit.vy) {
                state.score += state.fruit.value;
                // HUD: Fruit als „gesammelt“ markieren (einmalig pro Spawn)
                if (!state.fruitsThisLevel.includes(state.fruit.name)) {
                    state.fruitsThisLevel.push(state.fruit.name);
                }

                const p = pixelPosition();
                pushPopup(p.x, p.y - TILE * 0.8, `${state.fruit.value}`, "#ffd35a");
                state.fruit.active = false;
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
                canPlayerEdge(state.vx, state.vy, state.want.x, state.want.y)) {
                state.dir = { ...state.want };
                state.edge = { ...state.dir };
            }

            // Geradeaus blockiert? → stoppen
            if (!canPlayerEdge(state.vx, state.vy, state.dir.x, state.dir.y)) {
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


    // loop.js
    function drawHUDBelow(ctx, score, curPhase, phaseTime, phaseIdx, frightTimer, frightTotal, lives ) {
        // Hintergrundleiste
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H, W, HUD_HEIGHT);

        // Frightened hat Vorrang vor Scatter/Chase
        const isFright = frightTimer > 0;

        const label = isFright
            ? "FRIGHT"
            : (curPhase.mode || "").toUpperCase(); // "SCATTER"/"CHASE"

        const color = isFright
            ? "#3fb3ff"
            : (curPhase.mode === "scatter" ? "#00e676" : "#ff5252");

        // Fortschritt: bei Fright = Restzeit (Countdown), sonst Phase-Progress
        let prog = 1;
        let showBar = true;
        if (isFright) {
            prog = Math.max(0, Math.min(1, frightTimer / Math.max(0.0001, frightTotal)));
        } else {
            if (Number.isFinite(curPhase.t)) {
                prog = Math.max(0, Math.min(1, phaseTime / curPhase.t));
            } else {
                showBar = false; // letzte unendliche Chase-Phase
            }
        }

        // SCORE links
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "bold 16px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffd35a";
        ctx.fillText(`SCORE ${score}`, 12, H + HUD_HEIGHT / 2);

        // in drawHUDBelow, unten z.B. links neben SCORE:
        ctx.textAlign = "left";
        ctx.fillStyle = "#9be7ff";
        ctx.fillText(`LVL ${state.level}`, 12, H + HUD_HEIGHT/2 + 22);


        // MODE rechts (+ Restsekunden bei Fright)
        ctx.textAlign = "right";
        ctx.fillStyle = color;
        const rightY = H + HUD_HEIGHT / 2;
        if (isFright) {

            ctx.fillText(`${label}`, W - 12, rightY);
        } else {
            ctx.fillText(label, W - 12, rightY);
        }

        // Progressbar mittig
        if (showBar) {
            const barW = Math.min(240, W * 0.5);
            const barH = 6;
            const x = (W - barW) / 2;
            const y = H + HUD_HEIGHT / 2 + 18;
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(x, y, barW, barH);
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW * prog, barH);
        }
// ► Leben (mit Player-Sprite zeichnen, Fallback: Kreise)
        const iconSize = 28;
        const lifeY = H + HUD_HEIGHT/2 ;
        const baseX = 190;
        const gapX = iconSize + 6;

// versuche, ein Player-Icon zu bekommen (offene Mund-Variante)
        const lifeImg = (sprites && (sprites.player.open)) || null;

        for (let i = 0; i < lives; i++) {
            const x = baseX + i * gapX;
            if (lifeImg) {
                ctx.save();
                ctx.translate(x, lifeY);
                // klein, Richtung nach rechts (falls dein Basis-Sprite links schaut → spiegeln)
                // falls dein „open“-Sprite nach links schaut:
                ctx.scale(-1, 1); // nach rechts „blicken“
                ctx.drawImage(lifeImg, -iconSize/2, -iconSize/2, iconSize, iconSize);
                ctx.restore();
            } else {
                // Fallback: Kreis wie bisher
                ctx.beginPath();
                ctx.arc(x, lifeY, 5, 0, Math.PI*2);
                ctx.fillStyle = "#ffd35a";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(0,0,0,0.35)";
                ctx.stroke();
            }
        }


        // --- Fruit-Badges (gesammelte Früchte dieser Stage) ---
        const badgeY = H + HUD_HEIGHT/2 + 22;  // Zeile unter „LVL“
        let bx = 120;                           // Start-x rechts neben Score/LVL
        const bw = 12;                          // Badge-Größe (Radius ~ TILE*0.5)
        const gap = 10;

        for (let i = 0; i < state.fruitsThisLevel.length; i++) {
            const name = state.fruitsThisLevel[i];
            // einfache Farbwahl: aus deiner FRUIT_TABLE nutzen (wenn du sie in loop.js hast)
            // Fallback-Farben:
            let color = "#ffd35a";
            if (name === "cherry") color = "#ff3b30";
            else if (name === "straw") color = "#ff2d55";
            else if (name === "orange") color = "#ff9500";
            else if (name === "apple") color = "#34c759";
            else if (name === "melon") color = "#30d158";
            else if (name === "galaxian") color = "#5ac8fa";
            else if (name === "bell") color = "#ffd60a";
            else if (name === "key") color = "#ffd60a";

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(bx, badgeY, bw*0.5, 0, Math.PI*2);
            ctx.fill();

            // kleiner Kontrast-Ring
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.stroke();

            bx += (bw + gap);
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
        const pts = computeGhostPath(g, g.debugTarget, canGhostEdge(g), COLS, ROWS, MAX_STEPS);
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

    function collideWithGhosts(ghosts, ignoreEyes = true) {
        const pc = playerCenter();
        for (const g of ghosts) {
            if (!g) continue;
            if (ignoreEyes && g.eyes) continue; // Augen berühren nicht
            const gc = ghostCenter(g);
            const dx = gc.x - pc.x;
            const dy = gc.y - pc.y;
            if (dx * dx + dy * dy <= HIT_R2) return g;
        }
        return null;
    }

    function enterReady({ autoStart = true, seconds = 3, keepScore = true, levelReset = false, snapToDoor = true, } = {}) {
        state.mode = "ready";
        state.readyTimer = seconds;
        state.readyAutoStart = autoStart;
        state.readySnapToDoor = !!snapToDoor; // (falls du oben so ein Flag nutzt)
        resetRun({ keepScore, levelReset, preserveLives: true, snapToDoor: false }); // ← durchreichen

    }


    function drawGameOverOverlay() {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 28px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ff5252";
        ctx.fillText("GAME OVER", W/2, H/2 - 10);
        ctx.font = "14px 'Press Start 2P', monospace";
        ctx.fillStyle = "#fff";
        ctx.fillText("Drücke eine Taste für Neustart", W/2, H/2 + 18);
        ctx.restore();
    }

    function enterStageClear(seconds = 3) {
        state.mode = "stageclear";
        state.stageTimer = seconds;
    }

// Optionales Overlay
    function drawStageClearOverlay() {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 24px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffd35a";
        ctx.fillText("STAGE  CLEAR!", W/2, H/2 - 6);

        ctx.font = "14px 'Press Start 2P', monospace";
        ctx.fillStyle = "#fff";
        ctx.fillText("weiter in Kürze…", W/2, H/2 + 18);
        ctx.restore();
    }

    function maybeSpawnFruit() {
        if (state.fruit.active) return;
        if (state.fruitSpawnedThisLife >= FRUIT_SPAWN_DOTS.length) return;
        const need = FRUIT_SPAWN_DOTS[state.fruitSpawnedThisLife];
        if (state.pelletsSinceLife < need) return;

        const info = fruitForLevel(state.level);
        state.fruit.active = true;
        state.fruit.name   = info.name;
        state.fruit.value  = info.value;
        state.fruit.color  = info.color;
        state.fruit.vx     = FRUIT_POS.vx;
        state.fruit.vy     = FRUIT_POS.vy;
        state.fruit.ttl    = FRUIT_LIFETIME;
        state.fruitSpawnedThisLife += 1;
    }

    function updateFruit(dt) {
        if (!state.fruit.active) return;
        state.fruit.ttl -= dt;
        if (state.fruit.ttl <= 0) {
            state.fruit.active = false;
        }
    }

    function drawFruit(ctx) {
        if (!state.fruit.active) return;
        const x = state.fruit.vx * TILE;
        const y = state.fruit.vy * TILE;

        // kleines Icon (Kreis + Blatt)
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = state.fruit.color;
        ctx.beginPath();
        ctx.arc(0, 0, TILE*0.7, 0, Math.PI*2);
        ctx.fill();
        // Blatt
        ctx.fillStyle = "#3ddc84";
        ctx.beginPath();
        ctx.ellipse(-TILE*0.3, -TILE*0.7, TILE*0.25, TILE*0.12, -0.6, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

// Popups
    function pushPopup(px, py, text, color="#fff") {
        state.popups.push({ x:px, y:py, text, color, ttl: 1.0, vy: -28 }); // 1s, fliegt nach oben
    }
    function updateAndDrawPopups(ctx, dt) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = state.popups.length - 1; i >= 0; i--) {
            const p = state.popups[i];
            p.ttl -= dt;
            if (p.ttl <= 0) { state.popups.splice(i,1); continue; }
            const life = p.ttl; // 0..1
            const alpha = Math.min(1, Math.max(0, life));
            p.y += p.vy * dt;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.font = "bold 16px 'Press Start 2P', monospace";
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.restore();
    }







    function step(now) {
        const dt = Math.min(0.033, (now - state.last) / 1000);
        state.last = now;

        const k = input.keys;
        const anyKey = k.left || k.right || k.up || k.down;

        state.playTime += dt;     // falls noch nicht an anderer Stelle
        updateFruit(dt);

        if (state.mode === "stageclear") {
            state.stageTimer -= dt;

            // Szene einfrieren zeichnen (Player/Geister in aktueller Pose)
            const p = pixelPosition();
            drawFrame(ctx, sprites, p.x - SIZE/2, p.y - SIZE/2, 1, state.face.x, state.face.y);
            drawGhost(ctx, blinky, state.frightTimer);
            drawGhost(ctx, pinky,  state.frightTimer);
            drawGhost(ctx, inky,   state.frightTimer);
            drawGhost(ctx, clyde,  state.frightTimer);

            drawStageClearOverlay();
            const cur = PHASES[phaseIdx];
            drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);

            if (state.stageTimer <= 0) {
                // Level erhöhen, Dots zurücksetzen, Run neu starten (Score & Leben behalten)
                state.level += 1;
                resetDots();

                // Optional: Schwierigkeit pro Level leicht erhöhen (wenn gewünscht)
                // z.B. GHOST_SPEED-Faktor in state halten und an update-Aufrufe übergeben.

                // Alles an Start, aber Score/Lives behalten:
                resetRun({ keepScore: true, levelReset: true, preserveLives: true });
                state.fruitsThisLevel = [];
                enterReady({ autoStart:true, seconds:2, keepScore:true, levelReset:false, /* ↓ */ snapToDoor:false });

            }

            // === Boot-Init: einmalig beim Laden ===
            // sorgt dafür, dass markHouseFlags() + setupHouseExit(...) laufen

            state.rafId = requestAnimationFrame(step);
            return () => cancelAnimationFrame(state.rafId);
        }

        if (state.mode === "gameover") {
            // Szene noch einmal zeichnen
            const p = pixelPosition();
            drawFrame(ctx, sprites, p.x - SIZE/2, p.y - SIZE/2, 1, state.face.x, state.face.y);
            drawGhost(ctx, blinky, state.frightTimer);
            drawGhost(ctx, pinky,  state.frightTimer);
            drawGhost(ctx, inky,   state.frightTimer);
            drawGhost(ctx, clyde,  state.frightTimer);

            drawGameOverOverlay();
            const cur = PHASES[phaseIdx];
            drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);

            if (anyKey) {
                // Voller Neustart
                state.score = 0;
                state.lives = START_LIVES;
                state.level = 1;             // Level zurück auf 1 (optional)

                resetDots();// ◀︎ Dots zurücksetzen
                state.fruitsThisLevel = [];

                // Timings/Geister/Player neu (Score/Lives bleiben wie gesetzt)
                phaseIdx = 0; phaseTime = 0;
                state.frightTimer = 0;
                state.ghostEatChain = 200;


                resetRun({ keepScore:true, levelReset:true, preserveLives:true, /* ↓ */ snapToDoor:true });
                enterReady({ autoStart:true, seconds:2, keepScore:true, levelReset:false, /* ↓ */ snapToDoor:false });

                state.gameOver = false;
                }

            state.rafId = requestAnimationFrame(step);
            return;
        }

        state.want = readWant(k);

        if (state.mode === "ready") {
            // Countdown ticken lassen
            if (state.readyTimer > 0) {
                state.readyTimer -= dt;
            }

            if (state.readySnapToDoor) {
                [pinky, inky, clyde].forEach(g => {
                    if (!g) return;
                    if (g.inHouse && g.along === 0) {
                        // Steht er NICHT exakt auf der Tür? Dann einmal hart zentrieren.
                        const vx = g.vx, vy = g.vy;
                        const onDoor =
                            (vy === DOOR.doorBelowVy) &&
                            (vx === DOOR.doorVx || vx === DOOR.doorVx - 1);
                        if (!onDoor) {
                            g.vx = DOOR.doorVx;
                            g.vy = DOOR.doorBelowVy;
                            g.dir = g.edge = { x:0, y:-1 };
                            g.along = 0;
                            g.passingDoor = true;
                        }
                    }
                });
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
            drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);



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
        }


        // --- BLINKY updaten (NEU) ---
        const fr = state.frightTimer > 0;

        const upd = (g, updater, rows) => {
            if (!g) return;
            const canEdge = canGhostEdge(g);
            if (g.eyes) {
                updateGhostEyes(g, dt, COLS, canEdge);
            } else {
                const spd = speedForGhost(g, GHOST_SPEED, fr, FRIGHT_SPEED_FACTOR, 1.6);
                // normale Update-Funktion dieses Geists
                updater(g, dt, spd, canEdge, COLS, state, /*evtl. extra args*/ rows, fr);
            }
        };

        upd(blinky, updateBlinky);
        upd(pinky,  updatePinky);
        upd(inky,   updateInky,  ROWS);  // falls dein Inky updater ROWS erwartet
        upd(clyde,  updateClyde, ROWS);

        updateHouseRespawn(blinky, dt);
        updateHouseRespawn(pinky,  dt);
        updateHouseRespawn(inky,   dt);
        updateHouseRespawn(clyde,  dt);


        function updateHouseRespawn(g, dt) {
            if (!g) return;

            // 1) Respawn-Countdown, solange im Haus & kein Eyes
            if (g.inHouse && !g.eyes) {
                if (g.respawnTimer > 0) {
                    g.respawnTimer -= dt;
                    return; // währenddessen stehen bleiben
                }

                // 2) Exit einleiten: durch die Tür nach oben
                // Tür passieren erlauben
                g.passingDoor = true;

                // Nur am Knoten Richtung setzen
                if (g.along === 0 && (g.dir.x === 0 && g.dir.y === 0)) {
                    // nach oben Richtung Flur
                    g.dir  = { x: 0, y: -1 };
                    g.edge = { x: 0, y: -1 };
                    g.allowUTurnOnce = true; // falls direkt korrigiert werden muss
                }

                // 3) Wenn er die Tür wirklich hinter sich gelassen hat → frei
                // (nutzt deine occupiesDoorAtNode-Helper)
                if (g.along === 0 && !occupiesDoorAtNode(g)) {
                    // außerhalb der Tür angekommen
                    g.inHouse = false;
                    g.passingDoor = false;
                    g.allowUTurnOnce = false;
                }
            }
        }


        function occupiesDoorAtNode(g) {
            if (!g || g.along !== 0) return false;
            const vx = g.vx, vy = g.vy;
            const cols = [vx - 1, vx];
            const rows = [vy - 1, vy];
            for (const r of rows) for (const c of cols) {
                if (isDoor(c, r)) return true;
            }
            return false;
        }

        [blinky, pinky, inky, clyde].forEach(g => {
            if (!g) return;
            // Falls er aus dem Haus heraus ist (nicht mehr auf der Tür am Knoten), Flag löschen:
            if (g.inHouse && g.along === 0 && !occupiesDoorAtNode(g)) {
                g.inHouse = false;
            }
            // (optional) Während er über die Tür fährt, kurz "passingDoor" setzen:
            if (g.along === 0) {
                g.passingDoor = occupiesDoorAtNode(g);
            }
        });

        if (state.frightTimer > 0) {
            [blinky, pinky, inky, clyde].forEach(g => {
                if (!g) return;
                const stopped = (!g.dir || (g.dir.x === 0 && g.dir.y === 0)) && g.along === 0;
                if (stopped) {
                    const canEdge = canGhostEdge(g);
                    const opts = [
                        {x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}
                    ].filter(d => canEdge(g.vx, g.vy, d.x, d.y));

                    if (opts.length) {
                        const pick = opts[(Math.random() * opts.length) | 0];
                        g.dir  = { ...pick };
                        g.edge = { ...pick };
                        g.along = 1; // 1px nudge
                    }
                }
            });
        }

        // Nach dem Movement/Consume: sind alle Dots weg?
        if (state.mode === "play" && dotsLeft() === 0) {
            enterStageClear(2.0);   // 2 Sekunden „Stage Clear“-Screen
            // Optional: sofort rendern & return (wie in anderen Modi)
            const p = pixelPosition();
            drawFrame(ctx, sprites, p.x - SIZE/2, p.y - SIZE/2, 1, state.face.x, state.face.y);
            drawGhost(ctx, blinky, state.frightTimer);
            drawGhost(ctx, pinky,  state.frightTimer);
            drawGhost(ctx, inky,   state.frightTimer);
            drawGhost(ctx, clyde,  state.frightTimer);
            drawStageClearOverlay();
            const cur = PHASES[phaseIdx];
            drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);
            state.rafId = requestAnimationFrame(step);
            return;
        }


        // --- Kollision prüfen ---

// Falls du meine neue Kollisionsfunktion mit Fright-Flag nutzt, ruf so auf:
// const hit = collideWithGhosts([blinky, pinky, inky, clyde], fr);
// Wenn du die alte ohne Flag verwendest:
        const hit = collideWithGhosts([blinky, pinky, inky, clyde], true);

        if (hit) {
            if (hit.eyes) {
                // Nichts passiert – Augen sind „unschädlich“
            } else if (hit.frightened) {
                // ► Geist fressen → Eyes-Return starten
                state.score += state.ghostEatChain;
                const gc = ghostCenter(hit);
                pushPopup(gc.x, gc.y - TILE * 0.6, `${state.ghostEatChain}`, "#ffffff");


                if (state.ghostEatChain < 1600) state.ghostEatChain *= 2;

                hit.eyes = true;
                hit.frightened = false;
                hit.inHouse = false;
                hit.passingDoor = false;
                hit.allowUTurnOnce = true;
                // Richtung darf bleiben; Eyes-Update wählt am Knoten neu
            } else {
                // ► normaler Treffer → Leben verlieren / Game Over
                if (state.lives > 1) {
                    state.lives -= 1;
                    enterReady({ autoStart: true, seconds: 3, keepScore: true });

                    // Sofort zeichnen & return (wie bisher)
                    const p = pixelPosition();
                    drawFrame(ctx, sprites, p.x - SIZE/2, p.y - SIZE/2, 1, state.face.x, state.face.y);
                    drawGhost(ctx, blinky, state.frightTimer);
                    drawGhost(ctx, pinky,  state.frightTimer);
                    drawGhost(ctx, inky,   state.frightTimer);
                    drawGhost(ctx, clyde,  state.frightTimer);
                    drawReadyOverlay(state.readyTimer, state.readyAutoStart);
                    const cur = PHASES[phaseIdx];
                    drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);
                    state.rafId = requestAnimationFrame(step);
                    return;
                } else {
                    state.gameOver = true;
                    state.mode = "gameover";
                    state.readyTimer = 2.0;
                }
            }
        }

        if (state.score >= state.nextExtraLifeAt) {
            state.lives += 1;
            pushPopup(W/2, H*0.18, "1UP", "#00e676");  // hübsches Popup oben
            state.nextExtraLifeAt += 10000;            // nächste Schwelle
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


        drawFruit(ctx);
        updateAndDrawPopups(ctx, dt);
        // HUD unten zeichnen
        const cur = PHASES[phaseIdx];
        drawHUDBelow(ctx, state.score, cur, phaseTime, phaseIdx, state.frightTimer, FRIGHT_TIME, state.lives);

        state.rafId = requestAnimationFrame(step);
    }

    state.rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.rafId);
}
