import { Outlet, Link } from 'react-router-dom'

export default function App(){
    return (
        <div className="page">
            <nav className="nav">
                <div className="nav-inner">
                    <Link to="/" className="brand">Abschlussprojekt</Link>
                    <div className="links">
                        <Link to="/spielen">Spielen</Link>
                        <Link to="/login">Anmelden</Link>
                    </div>
                </div>
            </nav>
            <main className="container">
                <Outlet/>
            </main>
        </div>
    )
}
