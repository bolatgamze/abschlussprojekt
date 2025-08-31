import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

import gandalfIcon from "../icons/gandalf-iconn.png";
import lokiIcon from "../icons/loki-iconn.png";
import rufusIcon from "../icons/rufus-iconn.png";
import simbaIcon from "../icons/simba-iconn.png";

const characterImages = {
    GANDALF: gandalfIcon,
    LOKI: lokiIcon,
    RUFUS: rufusIcon,
    SIMBA: simbaIcon,
};

export default function Profile() {
    const { userId } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(API + "/api/profile/" + userId)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
            })
            .catch(() => {
                setData({ recentGames: [], bestScores: [], stats: {} });
            });
    }, [userId]);

    if (!data) return <p>Lade Profil...</p>;

    return (
        <section className="card bg-black text-green-400 p-6 rounded-2xl shadow-xl relative overflow-hidden text-center">
            <h1 className="profile-title">
                MEIN PROFIL ({data.username?.toUpperCase()})
            </h1>

            <div className="space-y-8">
                {/* Recent Games */}
                <div>
                    <h2 className="profile-heading">== LETZTE SPIELE ==</h2>
                    <div className="space-y-3">
                        {data.recentGames && data.recentGames.length > 0 ? (
                            data.recentGames.map((g, i) => (
                                <div
                                    key={i}
                                    className="bg-gray-900 border border-green-500 p-3 rounded-lg shadow-md text-center"
                                >
                                    {/* Top row: Date + Game */}
                                    <div className="text-sm font-bold mb-1">
                                        [
                                        {g.finishedAt
                                            ? new Date(g.finishedAt).toLocaleDateString()
                                            : "Nicht abgeschlossen"}{" "}
                                        {g.gameType}]
                                    </div>

                                    {/* Bottom row: Character + Score */}
                                    <div className="flex justify-center items-center gap-2">
                                        {characterImages[g.playerTheme] && (
                                            <img
                                                src={characterImages[g.playerTheme]}
                                                alt={g.playerTheme}
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    objectFit: "contain",
                                                    imageRendering: "pixelated",
                                                    filter:
                                                        "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                                }}
                                            />
                                        )}
                                        <span>({g.playerTheme})</span>
                                        <span className="ml-2">— Score: {g.score ?? "-"}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>Noch keine Spiele</p>
                        )}
                    </div>
                </div>

                {/* Best Scores */}
                <div>
                    <h2 className="profile-heading">== BESTLEISTUNGEN ==</h2>
                    <ul className="space-y-2">
                        {data.bestScores && data.bestScores.length > 0 ? (
                            data.bestScores.map((b, i) => (
                                <li
                                    key={i}
                                    className="bg-gray-900 border border-blue-500 p-2 rounded-lg flex justify-between max-w-xs mx-auto"
                                >
                                    <span>{b.gameType}:</span>
                                    <span className="font-bold">{b.maxScore}</span>
                                </li>
                            ))
                        ) : (
                            <li>Noch keine Bestleistungen</li>
                        )}
                    </ul>
                </div>

                {/* Statistics */}
                <div>
                    <h2 className="profile-heading">== STATISTIK ==</h2>
                    <div className="space-y-4">
                        <div className="bg-gray-900 p-4 rounded-lg border border-red-500 max-w-xs mx-auto">
                            <p className="text-lg font-bold">
                                {data.stats?.total ?? 0} Spiele insgesamt
                            </p>
                        </div>

                        {/* Average per GameType */}
                        <div className="bg-gray-900 p-4 rounded-lg border border-red-500 space-y-2 max-w-xs mx-auto">
                            <p className="font-bold">Durchschnitt pro Spieltyp:</p>
                            {data.stats?.avgScores &&
                                Object.entries(data.stats.avgScores).map(
                                    ([gameType, avg]) => (
                                        <p key={gameType}>
                                            {gameType}: {Math.round(avg)}
                                        </p>
                                    )
                                )}
                        </div>

                        {/* Favorite Character */}
                        <div className="bg-gray-900 p-4 rounded-lg border border-red-500 flex flex-col items-center gap-2 max-w-xs mx-auto">
                            <p className="text-sm">Lieblings-Charakter:</p>
                            {data.stats?.topTheme &&
                            characterImages[data.stats.topTheme] ? (
                                <div className="flex flex-col items-center gap-2">
                                    <img
                                        src={characterImages[data.stats.topTheme]}
                                        alt={data.stats.topTheme}
                                        style={{
                                            width: "90px",
                                            height: "90px",
                                            objectFit: "contain",
                                            imageRendering: "pixelated",
                                            filter:
                                                "drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)",
                                        }}
                                    />
                                    <span className="font-bold text-xl">
                                        ({data.stats.topTheme})
                                    </span>
                                </div>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
