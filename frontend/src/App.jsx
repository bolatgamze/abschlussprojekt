import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import image1 from './icons/i1.png'
import image2 from './icons/i2.png'

export default function App() {
    const [me, setMe] = useState(null)
    const nav = useNavigate()

    function randomGame() {
        const spiele = ["spiel1", "spiel2", "spiel3", "spiel4", "spiel5"]
        const zufall = spiele[Math.floor(Math.random() * spiele.length)]
        nav(`/spielen?next=${zufall}`)
    }

    function handleLogout() {
        setMe(null)
        nav("/")
    }

    return (
        <div className="page">
            {/* NAVIGATION */}
            <nav className="nav">
                <div className="nav-inner">
                    <div className="brand">
                        <Link to="/character/Gandalf">
                            <img src="src/icons/gandalf-iconn.png" style={{ width: 28, height: 28, marginRight: 6 }} />
                        </Link>
                        <Link to="/character/Loki">
                            <img src="src/icons/loki-iconn.png" style={{ width: 28, height: 28, marginRight: 6 }} />
                        </Link>
                        <Link to="/character/Rufus">
                            <img src="src/icons/rufus-iconn.png" style={{ width: 28, height: 28, marginRight: 6 }} />
                        </Link>
                        <Link to="/character/Simba">
                            <img src="src/icons/simba-iconn.png" style={{ width: 28, height: 28, marginRight: 6 }} />
                        </Link>
                    </div>

                    <div className="links">
                        <Link
                            to="#"
                            className="btn-link rainbow-text"
                            onClick={e => {
                                e.preventDefault();
                                randomGame();
                            }}
                        >
                            {"Überrasch mich!".split("").map((ch, i) => (
                                <span key={i} className={`char-${i + 1}`}>
                                    {ch === " " ? "\u00A0" : ch}
                                </span>
                            ))}
                        </Link>

                        {(!me || me.userId === "guest") && (
                            <Link to="/login">Anmelden</Link>
                        )}

                        {me && me.userId !== "guest" && (
                            <>
                                <Link to={`/profile/${me.userId}`}>
                                    Profil ({me.username})
                                </Link>
                                <Link
                                    to="#"
                                    className="btn-link"
                                    onClick={e => {
                                        e.preventDefault();
                                        handleLogout()
                                    }}
                                >
                                    Logout
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT */}<main className="container">
            <div
                className="main-wrapper"
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    gap: "30px",
                    marginTop: "40px"
                }}
            >
                <img
                    src={image1}
                    alt="Left decoration"
                    className="side-image"
                    style={{ width: 320, height: "auto" }}
                />

                <div style={{ flex: "none", textAlign: "center" }}>
                    <Outlet context={{ me, setMe }} />
                </div>

                <img
                    src={image2}
                    alt="Right decoration"
                    className="side-image"
                    style={{ width: 320, height: "auto" }}
                />
            </div>
        </main>

            {/* FOOTER */}
            <footer className="footer">
                <div className="footer-inner">
                    <Link to="/" className="brand">4 PAWS ARCADE</Link>
                    <span>© Gamze & Marcel & Shiar</span>
                </div>
            </footer>
        </div>
    )
}
