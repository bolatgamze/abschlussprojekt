import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Profile(){
    const { userId } = useParams()
    const [data, setData] = useState(null)

    useEffect(()=>{
        fetch(API + "/api/auth/profile/" + userId)
            .then(r=>r.json())
            .then(setData)
    }, [userId])

    if(!data) return <p>Lade Profil...</p>

    return (
        <section className="card">
            <h1>Mein Profil</h1>

            <h2>Letzte Spiele</h2>
            <ul>
                {(data.recentGames || []).map((g,i)=>(
                    <li key={i}>
                        {g.finishedAt ? new Date(g.finishedAt).toLocaleDateString() : "Laufend"} —
                        {g.gameType} ({g.playerTheme}) — Score: {g.score}
                    </li>
                ))}
            </ul>

            <h2>Bestleistungen</h2>
            <ul>
                {(data.bestScores || []).map((b,i)=>(
                    <li key={i}>{b.gameType}: {b.maxScore}</li>
                ))}
            </ul>

            <h2>Statistik</h2>
            <p>Insgesamt Spiele: {data.stats?.total ?? 0}</p>
            <p>Durchschnitt: {data.stats?.avg ?? 0}</p>
            <p>Lieblings-Charakter: {data.stats?.topTheme ?? "—"}</p>

        </section>
    )
}
