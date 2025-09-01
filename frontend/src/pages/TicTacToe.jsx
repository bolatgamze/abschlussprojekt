import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import Gandalf from "../icons/gandalf-iconn.png";
import Loki from "../icons/loki-iconn.png";
import Rufus from "../icons/rufus-iconn.png";
import Simba from "../icons/simba-iconn.png";
import Fisch from "../icons/fish.png";
import Knochen from "../icons/bone.png";
import trophyIcon from "../icons/trophy.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function TicTacToe() {
    const { theme } = useParams(); // GANDALF | LOKI | RUFUS | SIMBA
    const player = String(theme || "").toUpperCase();

    const { me } = useOutletContext();

    // Spieler-Icons (Charakter)
    const playerIcons = {
        GANDALF: Gandalf,
        LOKI: Loki,
        RUFUS: Rufus,
        SIMBA: Simba,
    };

    // Bot-Symbole abhängig von Katze/Hund
    const botSymbols = {
        GANDALF: Fisch, // gegen Gandalf (Katze) → Bot = Fisch
        SIMBA: Fisch,   // gegen Simba (Katze) → Bot = Fisch
        LOKI: Knochen,  // gegen Loki (Hund) → Bot = Knochen
        RUFUS: Knochen, // gegen Rufus (Hund) → Bot = Knochen
    };

    const displayNames = {
        GANDALF: "GANDALF",
        LOKI: "LOKI",
        RUFUS: "RUFUS",
        SIMBA: "SIMBA",
    };

    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState("player");
    const [winner, setWinner] = useState(null);
    const [score, setScore] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    // === Session starten ===
    useEffect(() => {
        const start = async () => {
            try {
                if (!me || me.userId === "guest") return;
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gameType: "TICTACTOE",
                        playerTheme: theme,
                        userId: me.userId,
                    }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("Fehler beim Starten der Session:", err);
            }
        };
        start();
    }, [theme, me]);

    // Gewinner prüfen
    function checkWinner(board, symbol) {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ];
        return lines.some(
            ([a, b, c]) => board[a] === symbol && board[b] === symbol && board[c] === symbol
        );
    }

    // Spielerzug
    function handleMove(index) {
        if (board[index] || turn !== "player" || winner) return;
        const newBoard = [...board];
        newBoard[index] = playerIcons[player]; // Spieler benutzt eigenes Icon
        setBoard(newBoard);

        if (checkWinner(newBoard, playerIcons[player])) {
            setBoard(newBoard);
            setTimeout(() => {
                setWinner("player");
                setScore(100);
                finishSession(100, { result: "WIN" });
            }, 600);
            return;
        }

        if (newBoard.every((cell) => cell !== null)) {
            setWinner("draw");
            setScore(50);
            finishSession(50, { result: "DRAW" });
            return;
        }

        setTurn("bot");
        setTimeout(() => botMove(newBoard), 600);
    }

    // Bot-Zug
    function botMove(currentBoard) {
        const free = currentBoard.map((v, i) => (v ? null : i)).filter((v) => v !== null);
        if (free.length === 0 || winner) return;

        const choice = free[Math.floor(Math.random() * free.length)];
        const newBoard = [...currentBoard];
        newBoard[choice] = botSymbols[player]; // Bot benutzt Fisch oder Knochen
        setBoard(newBoard);

        setTimeout(() => {
            if (checkWinner(newBoard, botSymbols[player])) {
                setBoard(newBoard);
                setTimeout(() => {
                    setWinner("bot");
                    setScore(0);
                    finishSession(0, { result: "LOSE" });
                }, 600);
                return;
            }

            if (newBoard.every((cell) => cell !== null)) {
                setWinner("draw");
                setScore(50);
                finishSession(50, { result: "DRAW" });
                return;
            }
            setTurn("player");
        }, 600);
    }

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(
                `${API}/api/game/leaderboard?gameType=TICTACTOE`
            );
            if (res.ok) setLeaderboard(await res.json());
            else setError("Leaderboard konnte nicht geladen werden.");
        } catch {
            setError("Netzwerkfehler beim Laden des Leaderboards.");
        }
    };

    const finishSession = async (finalScore, meta) => {
        if (!sessionId) {
            fetchLeaderboard();
            return;
        }
        try {
            await fetch(`${API}/api/game/session/${sessionId}/finish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ score: finalScore, metadata: meta }),
            });
            fetchLeaderboard();
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        }
    };

    // === Endscreen ===
    if (winner) {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>
                    {winner === "player"
                        ? "GEWONNEN"
                        : winner === "bot"
                            ? "VERLOREN"
                            : "UNENTSCHIEDEN"}
                </h1>
                <p>Dein Endscore: <b>{score}</b></p>
                {error && (
                    <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>
                )}

                {leaderboard.length > 0 && (
                    <>
                        <h2
                            style={{
                                color: "var(--accent3)",
                                margin: "20px 0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "12px",
                            }}
                        >
                            <img
                                src={trophyIcon}
                                alt="Trophy"
                                style={{
                                    width: 36,
                                    height: 36,
                                    objectFit: "contain",
                                    imageRendering: "pixelated",
                                    filter:
                                        "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                }}
                            />
                            BESTENLISTE
                            <img
                                src={trophyIcon}
                                alt="Trophy"
                                style={{
                                    width: 36,
                                    height: 36,
                                    objectFit: "contain",
                                    imageRendering: "pixelated",
                                    filter:
                                        "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                }}
                            />
                        </h2>
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {leaderboard.map((row, i) => (
                                <li
                                    key={i}
                                    style={{
                                        margin: "6px 0",
                                        fontSize: "12px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {i + 1}.{" "}
                                    <span style={{ color: "var(--accent4)" }}>
                                        {row.username}
                                    </span>{" "}
                                    — {row.score}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        );
    }

    // === Normales Spiel ===
    return (
        <section className="card center">
            <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
                TIC TAC TOE - {displayNames[player]}
                <img
                    src={playerIcons[player]}
                    alt={displayNames[player]}
                    style={{
                        width: 56,
                        height: 56,
                        objectFit: "contain",
                        imageRendering: "pixelated",
                        filter:
                            "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                    }}
                />
            </h1>

            {/* Spielfeld */}
            <div
                className="board"
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 80px)",
                    gap: "10px",
                    marginTop: "20px",
                }}
            >
                {board.map((cell, i) => (
                    <div
                        key={i}
                        onClick={() => handleMove(i)}
                        style={{
                            width: "80px",
                            height: "80px",
                            border: "2px solid #555",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: cell || winner ? "not-allowed" : "pointer",
                            background: "#fafafa",
                        }}
                    >
                        {cell ? (
                            <img
                                src={cell}
                                alt=""
                                style={{ width: "70%", height: "70%", objectFit: "contain" }}
                            />
                        ) : null}
                    </div>
                ))}
            </div>

            {/* Spieler am Zug - fester Platzhalter */}
            <div style={{ minHeight: "28px", marginTop: 16, textAlign: "center" }}>
                {turn === "player" && !winner && (
                    <span
                        style={{
                            color: "var(--accent1)",
                            fontWeight: "bold",
                            textShadow: "0 0 8px var(--accent1)",
                        }}
                    >
                        Du bist dran!
                    </span>
                )}
            </div>
        </section>
    );
}
