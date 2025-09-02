import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import gandalfImg from "../icons/Gandalf2.png";
import lokiImg from "../icons/loki1.png";
import rufusImg from "../icons/rufus1.png";
import simbaImg from "../icons/simba1.png";

// Spieler-Daten
const players = [
    { id: "GANDALF", name: "Gandalf", img: gandalfImg },
    { id: "LOKI", name: "Loki", img: lokiImg },
    { id: "RUFUS", name: "Rufus", img: rufusImg },
    { id: "SIMBA", name: "Simba", img: simbaImg },
];

export default function PlayerSelect() {
    const [sp] = useSearchParams();
    const next = sp.get("next") || "spiel1";
    const nav = useNavigate();

    const [index, setIndex] = useState(0);
    const current = players[index];

    const prev = () =>
        setIndex((i) => (i === 0 ? players.length - 1 : i - 1));
    const nextChar = () =>
        setIndex((i) => (i === players.length - 1 ? 0 : i + 1));

    const go = () => nav(`/${next}/${current.id}`);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") nextChar();
            if (e.key === "Enter") go();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [index]);

    return (
        <section className="center">
            <div className="card" style={{ textAlign: "center", padding: "20px" }}>
                <h1 style={{ marginBottom: "20px" }}>Wähle deinen Spieler</h1>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "20px",
                    }}
                >
                    <button className="btn" onClick={prev}>
                        ◀
                    </button>

                    <div>
                        <img
                            src={current.img}
                            alt={current.name}
                            className={`player-img ${current.id}`}
                            style={{
                                width: "220px",
                                height: "220px",
                                objectFit: "contain",
                                imageRendering: "pixelated",
                                filter: `
                  drop-shadow(1px 0 white)
                  drop-shadow(-1px 0 white)
                  drop-shadow(0 1px white)
                  drop-shadow(0 -1px white)
                `,
                                transition: "transform 0.25s ease, filter 0.25s ease",
                            }}
                        />
                        <h2
                            style={{
                                marginTop: "12px",
                                color: "var(--accent1)",
                                textShadow: "0 0 6px rgba(255,255,255,0.7)",
                            }}
                        >
                            {current.name}
                        </h2>
                    </div>

                    <button className="btn" onClick={nextChar}>
                        ▶
                    </button>
                </div>

                <button
                    className="btn"
                    style={{
                        marginTop: "20px",
                        padding: "10px 30px",
                        fontSize: "1.1rem",
                    }}
                    onClick={go}
                >
                    Start
                </button>
            </div>
        </section>
    );
}
