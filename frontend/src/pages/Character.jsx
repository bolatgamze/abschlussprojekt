import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"

import gandalf1 from "../icons/3.png"
import gandalf2 from "../icons/4.png"

const data = {
    gandalf: {
        name: "Gandalf",
        images: [gandalf1, gandalf2],
        description: "Ein mächtiger (und fauler) BKH-Kater mit magischem Blick.",
        stats: {
            "Süßigkeit": 1000,
            "Intelligenz": 234,
            "Mut": 75,
            "Magie": 999,
            "Schnelligkeit": 42,
            "Faulheit": 999,
        }
    }
}

export default function Character(){
    const { id } = useParams()
    const char = data[id]
    const [frame, setFrame] = useState(0)

    useEffect(() => {
        if(!char?.images) return
        const interval = setInterval(() => {
            setFrame(prev => (prev + 1) % char.images.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [char])

    if(!char) return <p>Charakter nicht gefunden</p>

    return (
        <div className="character-page">
            <div className="character-left">
                <img
                    src={char.images[frame]}
                    alt={char.name}
                    className="character-img"
                />
            </div>
            <div className="character-right">
                <h2 className="character-title">{char.name}</h2>
                <p className="muted">{char.description}</p>

                {Object.entries(char.stats).map(([key, val]) => (
                    <div key={key} className="stat">
                        <span className="stat-name">{key}</span>
                        <div className="bar">
                            <div
                                className="fill"
                                style={{ width: `${Math.min(val/10,100)}%` }}
                            ></div>
                        </div>
                        <span className="stat-value">{val}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
