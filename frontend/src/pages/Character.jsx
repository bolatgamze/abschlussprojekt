import { useParams } from "react-router-dom"
import { useState, useEffect } from "react"

import gandalf1 from "../icons/3.png"
import gandalf2 from "../icons/4.png"
import Loki1 from "../icons/Loki1.png";
import Loki2 from "../icons/Loki2.png";
import Rufus1 from "../icons/Rufus1.png";
import Rufus2 from "../icons/Rufus2.png";
import Simba1 from "../icons/Simba1.png";
import Simba2 from "../icons/Simba2.png";

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
    ,
    Loki: {
        name: "Loki",
        images: [Loki1 , Loki2],
        description: "Ein verspielter Labrador mit unendlicher Energie und großer Treue.",
        stats: {
            "Süßigkeit": 1000,
            "Intelligenz": 200,
            "Mut": 600,
            "Magie": 120,
            "Schnelligkeit": 800,
            "Faulheit": 0,
        },
},
    Rufus:{
        name: "Rufus",
        images: [Rufus1, Rufus2],
        description: "Ein quirliger Chihuahua/Papillon-Mix, klein, klug und voller Lebensfreude.",
        stats: {
        "Süßigkeit": 1000,
        "Intelligenz": 600,
        "Mut": 900,
        "Magie": 350,
        "Schnelligkeit": 1000,
        "Faulheit": 800,
},

},
    Simba:{
        name: "Simba",
        images: [Simba1, Simba2],
        description: "Ein stolzer BKH-Kater mit großem Herzen und einer Portion Übermut.",
        stats: {
    "Süßigkeit": 1000,
        "Intelligenz": 250,
        "Mut": 500,
        "Magie": 200,
        "Schnelligkeit": 300,
        "Faulheit": 700,
},
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
