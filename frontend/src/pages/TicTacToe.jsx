import { useState } from "react"
import { useParams } from "react-router-dom"

export default function TicTacToe(){
    const { theme } = useParams()  // "KATZE" | "HUND"
    const player = theme === "KATZE" ? "cat" : "dog"

    const [board, setBoard] = useState(Array(9).fill(null))
    const [turn, setTurn] = useState("player")
    const [winner, setWinner] = useState(null)   // "player" | "bot" | "draw"

    const symbols = {
        cat: { player: "🐱", bot: "🐟" },
        dog: { player: "🐶", bot: "🦴" }
    }

    function checkWinner(board, symbol){
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ]
        return lines.some(([a,b,c]) =>
            board[a] === symbol && board[b] === symbol && board[c] === symbol
        )
    }

    function handleMove(index){
        if(board[index] || turn !== "player" || winner) return

        const newBoard = [...board]
        newBoard[index] = symbols[player].player
        setBoard(newBoard)

        if(checkWinner(newBoard, symbols[player].player)){
            setWinner("player")
            return
        }
        if(newBoard.every(cell => cell !== null)){
            setWinner("draw")
            return
        }

        setTurn("bot")
        setTimeout(()=>botMove(newBoard), 500)
    }

    function botMove(currentBoard){
        const free = currentBoard.map((v,i)=> v ? null : i).filter(v=>v!==null)
        if(free.length === 0 || winner) return

        const choice = free[Math.floor(Math.random()*free.length)]
        const newBoard = [...currentBoard]
        newBoard[choice] = symbols[player].bot

        if(checkWinner(newBoard, symbols[player].bot)){
            setBoard(newBoard)
            setWinner("bot")
            return
        }
        if(newBoard.every(cell => cell !== null)){
            setBoard(newBoard)
            setWinner("draw")
            return
        }

        setBoard(newBoard)
        setTurn("player")
    }

    return (
        <section className="card center">
            <h1>Tic Tac Toe – {player === "cat" ? "🐱 Katze" : "🐶 Hund"}</h1>

            <div className="board" style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 80px)",
                gap: "10px",
                marginTop: "20px"
            }}>
                {board.map((cell, i)=>(
                    <div key={i}
                         onClick={()=>handleMove(i)}
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

            {winner && (
                <div style={{ marginTop: "20px" }}>
                    {winner === "player" && <h2>🎉 gewonnen!</h2>}
                    {winner === "bot" && <h2>😢 verloren!</h2>}
                    {winner === "draw" && <h2>🤝 keinen gewinner!</h2>}
                </div>
            )}
        </section>
    )
}
