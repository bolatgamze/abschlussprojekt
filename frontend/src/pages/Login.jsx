import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Login(){
    const [username, setU] = useState('gamze')      // Test
    const [password, setP] = useState('geheim123')  // Test
    const [message, setMsg] = useState('')
    const [me, setMe] = useState(null)

    async function post(path, body){
        const res = await fetch(API + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const data = await res.json().catch(()=> ({}))
        return { ok: res.ok, data }
    }

    async function handleRegister(){
        const { ok, data } = await post('/api/auth/register', { username, password })
        setMsg(data.message || (ok ? 'Registriert.' : 'Fehler'))
        if(ok) setMe({ username: data.username })
    }

    async function handleLogin(){
        const { ok, data } = await post('/api/auth/login', { username, password })
        setMsg(data.message || (ok ? 'Angemeldet.' : 'Fehler'))
        if(ok) setMe({ username: data.username })
    }

    return (
        <section className="center">
            <div className="card form">
                <h1>Anmelden / Registrieren</h1>

                <label>
                    <span>Benutzername</span>
                    <input value={username} onChange={e=>setU(e.target.value)} />
                </label>

                <label>
                    <span>Passwort</span>
                    <input type="password" value={password} onChange={e=>setP(e.target.value)} />
                </label>

                <div className="row">
                    <button className="btn" onClick={handleRegister}>Registrieren</button>
                    <button className="btn" onClick={handleLogin}>Einloggen</button>
                </div>

                {me && <p className="ok">Angemeldet als <b>{me.username}</b></p>}
                {message && <p className="muted">{message}</p>}

                <hr/>
                <p className="muted">Oder als Gast spielen (ohne Speicherung)</p>
                <button className="btn" onClick={()=>alert('Gastmodus – Speicherung ist deaktiviert')}>Als Gast spielen</button>
            </div>
        </section>
    )
}
