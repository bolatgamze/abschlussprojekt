import { useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"

const API = import.meta.env.VITE_API_URL || "http://localhost:8080"

export default function Login() {
    const { setMe } = useOutletContext()
    const [username, setU] = useState("")
    const [password, setP] = useState("")
    const [message, setMsg] = useState("")
    const [isSuccess, setIsSuccess] = useState(null) // null = none, true = success, false = error
    const nav = useNavigate()

    async function post(path, body) {
        const res = await fetch(API + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        let data = {};
        const text = await res.text();
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text || res.statusText };
        }

        return { ok: res.ok, data };
    }

    async function handleRegister() {
        const { ok, data } = await post("/api/auth/register", { username, password })
        if (ok) {
            setMe(data)
            setIsSuccess(true)
            setMsg(data.message || "Registrierung erfolgreich")
            setTimeout(() => nav(`/profile/${data.userId}`), 1000)
        } else {
            setIsSuccess(false)
            setMsg(data.message || "Fehler bei Registrierung")
        }
    }

    async function handleLogin() {
        const { ok, data } = await post("/api/auth/login", { username, password })
        if (ok) {
            setMe(data)
            setIsSuccess(true)
            setMsg(data.message || "Login erfolgreich")
            setTimeout(() => nav(`/profile/${data.userId}`), 1000)
        } else {
            setIsSuccess(false)
            setMsg(data.message || "Fehler bei Login")
        }
    }

    function handleGuest() {
        setMe({ userId: "guest", username: "Gast" })
        nav("/")
    }

    return (
        <section className="center">
            <div className="card form" style={{ maxWidth: "350px" }}>
                <h1>Anmelden / Registrieren</h1>

                <label style={{ display: "block", marginBottom: "12px" }}>
                    <span>Benutzername</span>
                    <input
                        value={username}
                        onChange={(e) => setU(e.target.value)}
                        style={{ width: "100%", marginTop: "5px" }}
                    />
                </label>

                <label style={{ display: "block", marginBottom: "20px" }}>
                    <span>Passwort</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setP(e.target.value)}
                        style={{ width: "100%", marginTop: "5px" }}
                    />
                </label>

                <div
                    className="row"
                    style={{ display: "flex", gap: "10px", marginBottom: "15px" }}
                >
                    <button className="btn" onClick={handleRegister}>
                        Registrieren
                    </button>
                    <button className="btn" onClick={handleLogin}>
                        Einloggen
                    </button>
                </div>

                {message && (
                    <p className={isSuccess ? "success-msg" : "error-msg"}>
                        {message}
                    </p>
                )}

                <hr style={{ margin: "20px 0" }} />
                <p className="muted">Oder als Gast spielen (ohne Speicherung)</p>
                <button
                    className="btn"
                    style={{ marginTop: "8px" }}
                    onClick={handleGuest}
                >
                    Als Gast spielen
                </button>
            </div>
        </section>
    )
}
