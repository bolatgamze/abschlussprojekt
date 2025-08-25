import { Link, Outlet } from 'react-router-dom'
import { useState } from 'react'

export default function App(){
    const [me, setMe] = useState(null)

    return (
        <div className="page">
            <nav className="nav">
                <div className="nav-inner">
                    <Link to="/" className="brand">Abschlussprojekt</Link>
                    <div className="links">
                        <Link to="/spielen">Spielen</Link>
                        {!me && <Link to="/login">Anmelden</Link>}
                        {me && <Link to={`/profile/${me.userId}`}>Profil</Link>}
                    </div>
                </div>
            </nav>

            <main className="container">
                <Outlet />
            </main>
        </div>
    )
}
