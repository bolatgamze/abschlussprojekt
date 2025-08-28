import React from "react";
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import PlayerSelect from './pages/PlayerSelect.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import TicTacToe from './pages/TicTacToe.jsx'
import MemoryGame from './pages/MemoryGame.jsx'
import WordGame from './pages/WordGame.jsx'
import PacPetCurrent from "./pages/PacPet.jsx";
import './App.css'

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <Home /> },
            { path: "spielen", element: <PlayerSelect /> },
            { path: "login", element: <Login /> },
            { path: "profile/:userId", element: <Profile /> },
            { path: "spiel1/:theme", element: <TicTacToe /> },
            { path: 'spiel4/:theme', element: <MemoryGame /> },
            { path: 'spiel2/:theme', element: <WordGame /> },
            { path: "spiel3/:theme", element: <PacPetCurrent /> },
            { path: "*", element: <p>404 – Seite nicht gefunden</p> },
        ],
    },
]);




createRoot(document.getElementById('root')).render(
    <RouterProvider router={router}/>
)
