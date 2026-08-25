import { NavLink, Outlet } from "react-router-dom";
import {
    History as HistoryIcon,
    LayoutDashboard,
    ScanSearch,
    Settings,
    ShieldCheck,
} from "lucide-react"

import "./AppLayout.css"

const navigationItems = [
    {
        label: "Visão Geral",
        path: "/",
        icon: LayoutDashboard,
    },
    {
        label: "Nova varredura",
        path: "/scan",
        icon: ScanSearch,
    },
    {
        label: "Histórico",
        path: "/history",
        icon: HistoryIcon
    },

    {
        label: "Configurações",
        path: "/settings",
        icon: Settings,
    }
]

function AppLayout() {
    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">
                        <ShieldCheck size = {24}/>
                    </div>


                    <div>
                        <strong>File Recovery</strong>
                        <span>Recuperação segura</span>
                    </div>
                </div>


                <nav className="sidebar-navigation">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to = {item.path}
                                end = {item.path === "/"}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? "is-active": ""}`
                                }
                            >
                                <Icon size = {20}/>
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>
            </aside>

            <main className="main-content">
                    <Outlet/>
            </main>
        </div>
    )
}

export default AppLayout