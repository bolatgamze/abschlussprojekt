import { useSearchParams, useNavigate } from 'react-router-dom'

export default function PlayerSelect(){
    const [sp] = useSearchParams()
    const next = sp.get('next') || 'spiel1'
    const nav = useNavigate()

    const go = (t) => nav(`/${next}/${t}`) // z.B.: /spiel1/KATZE

    return (
        <section className="center">
            <div className="card">
                <h1>Wähle deinen Spieler</h1>
                <p className="muted">
                    Katze oder Hund? Das Design ändert sich je nach Auswahl.
                </p>
                <div className="row">
                    <button className="btn" onClick={()=>go('KATZE')}>🐱 Katze</button>
                    <button className="btn" onClick={()=>go('HUND')}>🐶 Hund</button>
                </div>
                <p className="small muted">
                    Nächstes Spiel: <code>{next}</code>
                </p>
            </div>
        </section>
    )
}
