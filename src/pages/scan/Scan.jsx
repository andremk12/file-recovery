import { useCallback, useEffect, useState } from "react";
import { HardDrive, RefreshCw } from "lucide-react";
import "./Scan.css"

const DRIVE_TYPE_LABELS = {
    fixed: "Disco local",
    removable: "Dispositivo removível",
    network: "Unidade de rede",
    optical: "Unidade óptica",
    ram: "Disco em memória",
    unknown: "Tipo desconhecido"
}

function formatBytes(bytes) {
    if (bytes === null || bytes === undefined) {
        return "Indisponível"
    }

    if (bytes === 0) {
        return "0 GB"
    }

    const gigabytes = bytes / 1024 ** 3;

    return `${gigabytes.toFixed(1)} GB`
}

function calculateUsedPercentage(drive) {
    if (!drive.totalBytes || drive.freeBytes === null) {
        return 0
    }

    const usedBytes = drive.totalBytes - drive.freeBytes;
    const percentage = (usedBytes / drive.totalBytes) * 100

    return Math.min(Math.max(percentage, 0), 100)
}


function Scan() {

    const [drives, setDrives] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    const loadDrives = useCallback(async () => {
        setIsLoading(true);
        setError("")

        try {
            if(!window.desktopAPI?.getDrive) {
                throw new Error (
                    "A consulta de discos não esta disponível.",
                )
            }

            const result = await window.desktopAPI.getDrive()

            setDrives(Array.isArray(result) ? result : [])
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Não foi possível consultar os discos"

            setError(message)
            setDrives([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadDrives()
    }, [loadDrives])
   

    return (
        <section className="page">
            <header className="scan-header">
                <div>
                    <h1>Nova varredura</h1>
                    <p>
                        Selecione um disco para procurar arquivos excluídos.
                    </p>
                </div>

                <button
                    type="button"
                    className="refresh-button"
                    onClick={loadDrives}
                    disabled={isLoading}
                >
                    <RefreshCw
                        size={18}
                        className={isLoading ? "is-spinning" : ""}
                    />

                    Atualizar
                </button>
            </header>

            {isLoading && (
                <div className="scan-status" role="status">
                    <div className="loading-indicator"/>
                    <p>Consultando os discos disponiveis...</p>
                </div>
            )}
            
            {!isLoading && error && (
                <div className="scan-error" role="alert"> 
                    <strong>Não foi possível listar os discos</strong>
                    <p>{error}</p>

                    <button type="button" onClick={loadDrives}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {!isLoading && !error && drives.length === 0 && (
                <div className="scan-status">
                    <HardDrive size={32}/>
                    <p>Nenhum disco disponível foi encontrado</p>
                </div>
            )}
            
            {!isLoading && !error && drives.length > 0 && (
                <div className="drive-grid">
                    {drives.map((drive) => {
                        const usedPercentage = calculateUsedPercentage(drive)

                        return (
                            <article className="drive-card" key={drive.id}>
                                <div className="drive-card-header">
                                    <div className="drive-icon">
                                        <HardDrive size = {24}/>
                                    </div>

                                    <div>
                                        <h2>{drive.label}</h2>
                                        <p>
                                            {drive.letter} . {" "}
                                            {DRIVE_TYPE_LABELS[drive.type] ||
                                                DRIVE_TYPE_LABELS.unknown}
                                        </p>
                                    </div>
                                </div>

                                <div className="drive-details">
                                    <span>
                                        Sistema de arquivos
                                        <strong>{drive.fileSystem}</strong>
                                    </span>

                                    <span>
                                        Espaço disponível
                                        <strong>
                                            {formatBytes(drive.freeBytes)}
                                        </strong>
                                    </span>
                                </div>

                                <div className="storage">
                                    <div className="storage-track">
                                         <div
                                            className="storage-used"
                                            style={{width: `${usedPercentage}%`}}
                                         />

                                         <p>
                                            {formatBytes(drive.freeBytes)} disponíveis de{" "}
                                            {formatBytes(drive.totalBytes)}
                                         </p>

                                     
                                    </div>

                                </div>
                            </article>
                        )
                    })}
                
                </div>
            )}

        </section>
    )
}

export default Scan;