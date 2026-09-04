import {
    HashRouter,
    Navigate,
    Route,
    Routes
} from "react-router-dom"

import AppLayout from "./components/layout/AppLayout"
import History from "./pages/History"
import Home from "./pages/home/Home"
import Scan from "./pages/scan/Scan"
import Settings from "./pages/settings/Settings"

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route element={<AppLayout/>}>
                    <Route index element={<Home />}/>
                    <Route path="scan" element={<Scan />}/>
                    <Route path="history" element={<History />}/>
                    <Route path="settings" element={<Settings />}/>

                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Route>
            </Routes>
        </HashRouter>
    )
}

export default App;