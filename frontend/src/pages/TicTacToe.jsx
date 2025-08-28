import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function TicTacToe() {
    const { theme } = useParams();  // "KATZE" | "HUND"
    const { me } = useOutletContext();
    const player = theme === "KATZE" ? "cat" : "dog";

    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState("player");
    const [winner, setWinner] = useState(null);   // "player" | "bot" | "draw"
    const [score, setScore] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [error, setError] = useState(null);

    const symbols = {
        cat: { player: "🐱", bot: "🐟" },
        dog: { player: "🐶", bot: "🦴" }
    };

    // Session starten
    useEffect(() => {
        const start = async () => {
            try {
                if (!me || me.userId === "guest") return; // Gäste nicht speichern
                const res = await fetch(`${API}/api/game/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gameType: "TICTACTOE", playerTheme: theme, userId: me.userId }),
                });
                const data = await res.json();
                if (res.ok && data.sessionId) setSessionId(data.sessionId);
            } catch (err) {
                console.error("Fehler beim Starten der Session:", err);
            }
        };
        start();
    }, [theme, me]);

    function checkWinner(board, symbol) {
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        return lines.some(([a,b,c]) =>
            board[a] === symbol && board[b] === symbol && board[c] === symbol
        );
    }

    function handleMove(index) {
        if (board[index] || turn !== "player" || winner) return;

        const newBoard = [...board];
        newBoard[index] = symbols[player].player;
        setBoard(newBoard);

        if (checkWinner(newBoard, symbols[player].player)) {
            setWinner("player");
            setScore(100);
            finishSession(100, { result: "WIN" });
            return;
        }
        if (newBoard.every(cell => cell !== null)) {
            setWinner("draw");
            setScore(50);
            finishSession(50, { result: "DRAW" });
            return;
        }

        setTurn("bot");
        setTimeout(() => botMove(newBoard), 600);
    }

    function botMove(currentBoard) {
        const free = currentBoard.map((v, i) => v ? null : i).filter(v => v !== null);
        if (free.length === 0 || winner) return;

        const choice = free[Math.floor(Math.random() * free.length)];
        const newBoard = [...currentBoard];
        newBoard[choice] = symbols[player].bot;

        setBoard(newBoard);

        setTimeout(() => {
            if (checkWinner(newBoard, symbols[player].bot)) {
                setWinner("bot");
                setScore(0);
                finishSession(0, { result: "LOSE" });
                return;
            }
            if (newBoard.every(cell => cell !== null)) {
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
            const res = await fetch(`${API}/api/game/leaderboard?gameType=TICTACTOE&playerTheme=${theme}`);
            if (res.ok) {
                setLeaderboard(await res.json());
            } else {
                setError("Leaderboard konnte nicht geladen werden.");
            }
        } catch (err) {
            console.error("Fehler beim Laden der Bestenliste:", err);
            setError("Netzwerkfehler beim Laden der Bestenliste.");
        }
    };

    const finishSession = async (finalScore, meta) => {
        if (!sessionId) {
            fetchLeaderboard(); // Gäste
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

    // === Endscreen mit Scoreboard ===
    if (winner) {
        return (
            <section className="card center" style={{ textAlign: "center" }}>
                <h1 style={{ color: "var(--accent1)", marginBottom: "20px" }}>
                    {winner === "player" ? "Gewonnen" :
                        winner === "bot"   ? "Verloren" : " Unentschieden"}
                </h1>
                <p>Dein Endscore: <b>{score}</b></p>
                {error && <p style={{ color: "var(--accent2)", marginTop: "10px" }}>{error}</p>}

                {leaderboard.length > 0 && (
                    <>
                        <h2 style={{ color: "var(--accent3)", margin: "20px 0" }}>🏆 Leaderboard 🏆</h2>
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {leaderboard.map((row, i) => (
                                <li key={i} style={{ margin: "6px 0", fontSize: "12px" }}>
                                    {i + 1}. <span style={{ color: "var(--accent4)" }}>{row.username}</span> — {row.score}
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
            <h1>Tic Tac Toe – {player === "cat" ? "🐱 Katze" : "🐶 Hund"}</h1>

            <div className="board" style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 80px)",
                gap: "10px",
                marginTop: "20px"
            }}>
                {board.map((cell, i) => (
                    <div key={i}
                         onClick={() => handleMove(i)}
                         style={{
                             width: "80px",
                             height: "80px",
                             border: "2px solid #555",
                             display: "flex",
                             alignItems: "center",
                             justifyContent: "center",
                             fontSize: "2rem",
                             cursor: cell || winner ? "not-allowed" : "pointer",
                             background: "#fafafa"
                         }}>
                        {cell}
                    </div>
                ))}
            </div>
        </section>
    );
}
