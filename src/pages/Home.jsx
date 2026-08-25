import { useEffect, useState } from "react";

function Home() {
  const [appInfo, setAppInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAppInfo() {
      try {
        if (!window.desktopAPI) {
          throw new Error("A API do Electron não está disponível.");
        }

        const information = await window.desktopAPI.getAppInfo();
        setAppInfo(information);
      } catch (err) {
        setError(err.message);
      }
    }

    loadAppInfo();
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Visão geral</h1>
        <p>Acompanhe o estado da aplicação e inicie novas recuperações.</p>
      </header>

      <article className="info-card">
        <h2>Informações do sistema</h2>

        {appInfo && (
          <>
            <p>Versão da aplicação: {appInfo.version}</p>
            <p>Sistema operacional: {appInfo.platform}</p>
            <p>Versão do Electron: {appInfo.electronVersion}</p>
          </>
        )}

        {error && <p>{error}</p>}
      </article>
    </section>
  );
}

export default Home;