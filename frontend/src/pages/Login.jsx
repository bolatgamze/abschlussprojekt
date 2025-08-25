import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export default function Login({ onLogin }){
    const [username, setU] = useState('')
    const [password, setP] = useState('')
    const [message, setMsg] = useState('')
    const nav = useNavigate()

    async function post(path, body){
        const res = await fetch(API + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const data = await res.json().catch(()=> ({}))
        return { ok: res.ok, data }
    }

    async function handleLogin(){
        const { ok, data } = await post('/api/auth/login', { username, password })
        if(ok){
            onLogin(data)
            nav('/profile/' + data.userId)
        } else {
            setMsg(data.message || 'Fehler')
        }
    }

    async function handleRegister(){
        const { ok, data } = await post('/api/auth/register', { username, password })
        if(ok){
            onLogin(data)
            nav('/profile/' + data.userId)
        } else {
            setMsg(data.message || 'Fehler')
        }
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
                    <button type="button" className="btn" onClick={handleRegister}>Registrieren</button>
                    <button type="button" className="btn" onClick={handleLogin}>Einloggen</button>
                </div>

                {message && <p className="muted">{message}</p>}

                <hr/>
                <p className="muted">Oder als Gast spielen (ohne Speicherung)</p>
                <button type="button" className="btn" onClick={()=>nav('/profile/guest')}>Als Gast spielen</button>
            </div>
        </section>
    )
}
