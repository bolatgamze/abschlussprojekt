import { useNavigate } from 'react-router-dom'
import gamepad from "../icons/gamepad.png";

export default function Home(){
    const nav = useNavigate()

    return (
        <section className="center">
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                marginTop: "-20px"
            }}>
                <img src={gamepad} alt="Gamepad left" style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
                <h1 style={{ margin: 0 }}>Willkommen im Spielportal</h1>
                <img src={gamepad} alt="Gamepad right" style={{ width: 48, height: 48, imageRendering: "pixelated" }} />
            </div>

            <p className="muted">Wähle ein Spiel</p>

            <div className="stack">
                <button className="btn" onClick={()=>nav('/spielen?next=spiel1')}>
                    Spiel 1 — Tic-Tac-Toe
                </button>
                <button className="btn" onClick={()=>nav('/spielen?next=spiel2')}>
                    Spiel 2 — Wort-Raten
                </button>
                <button className="btn" onClick={()=>nav('/spielen?next=spiel3')}>
                    Spiel 3 — Pac-Pet
                </button>
                <button className="btn" onClick={()=>nav('/spielen?next=spiel4')}>
                    Spiel 4 — Memory
                </button>
                <button className="btn" onClick={()=>nav('/spielen?next=spiel5')}>
                    Spiel 5 — Paw-Panik
                </button>
            </div>
        </section>
    )
}
