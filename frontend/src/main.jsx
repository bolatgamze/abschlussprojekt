
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import PlayerSelect from './pages/PlayerSelect.jsx'
import Login from './pages/Login.jsx'
import './App.css'

const router = createBrowserRouter([
    { path: '/', element: <App/>, children: [
            { index: true, element: <Home/> },
            { path: 'spielen', element: <PlayerSelect/> },
            { path: 'login', element: <Login/> },
        ] }
])

createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>)
