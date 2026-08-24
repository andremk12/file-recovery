import { useEffect, useState } from "react";
import "./App.css"

function App() {
  const [appInfo, setAppInfo] = useState(null)
  const [error, setError] = useState("")

    useEffect(() => {
      async function loadAppInfo() {
        try {
          if (!window.desktopAPI) {
            throw new Error("A API do Electron não está disponível.")
          }

          const information = await window.desktopAPI.getAppInfo()
          setAppInfo(information)
        } catch (err) {
          setError(err.message)
        }
      }

      loadAppInfo()
    }, [])

    return (
      <main>
         <h1>File Recovery</h1>
         <p>Aplicação para recuperação de arquivos</p>

         {appInfo && (
           <section>
              <h2>Informações de aplicação</h2>
              <p>Versão: {appInfo.version}</p>
              <p>Sistema: {appInfo.plataform}</p>
              <p>Electron: {appInfo.electronVersion}</p>
           </section>
         )}

         {error && <p>{error}</p>}
      </main>
    )
}

export default App