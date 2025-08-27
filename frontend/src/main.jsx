import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import PlayerSelect from "./pages/PlayerSelect.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import TicTacToe from "./pages/TicTacToe.jsx";
import "./App.css";
import PacPetStage0 from "./pages/PacPetStage0.jsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,           // App ist dein Layout
        children: [
            { index: true, element: <Home /> },
            { path: "spielen", element: <PlayerSelect /> },
            { path: "login", element: <Login /> },
            { path: "profile/:userId", element: <Profile /> },
            { path: "spiel1/:theme", element: <TicTacToe /> },
            { path: "spiel3/:theme", element: <PacPetStage0 /> },
            { path: "*", element: <p>404 – Seite nicht gefunden</p> },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
