import { useCallback, useEffect, useState } from "react";
import { HardDrive, RefreshCw, CheckCircle2, FolderOpen, AlertTriangle } from "lucide-react";
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

    function extractDriveLetter(directoryPath) {
        if (typeof directoryPath !== "string") {
            return null
        }

        const match = directoryPath.match(/^[A-Za-z]:/);

        return match ? match[0].toUpperCase() : null
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
    const [selectedDriveId, setSelectedDriveId] = useState(null)

    const [destinationPath, setDestinationPath] = useState("")
    const [isSelectingDestination, setIsSelectingDestination] = useState(false)
    const [destinationError, setDestinationError] = useState("")

    const [destinationWarning, setDestinationWarning] = useState("")

    async function handleSelectDestination() {
    if (!selectedDrive) {
        setDestinationError(
            "Selecione primeiro o disco que será analisado"
        )
        
        return
    }

      if (!window.desktopAPI?.selectDestination) {
    setDestinationError(
      "A seleção de destino não está disponível.",
    );

    return;
  }

    setIsSelectingDestination(true)
    setDestinationError("")

    try {
        const selectedPath = await window.desktopAPI.selectDestination()

        if (!selectedPath) {
            return
        }

        setDestinationWarning("")

        const destinationDriveLetter = extractDriveLetter(selectedPath)

        if (!destinationDriveLetter) {
            setDestinationPath("")
            setDestinationError(
                "Não foi possível identificar o disco da parte selecionada."
            )

            return
        }

        const sourceDriveLetter = selectedDrive.letter.toUpperCase()

        if (
            destinationDriveLetter === sourceDriveLetter
        ) {
            setDestinationPath("");
            setDestinationError(
                `Escolha uma pasta fora do disco ${sourceDriveLetter}. ` +
                "Gravar arquivos no disco analisado pode sobrescrever dados recuperáveis."
            )

            return
        }

        const refreshedResult = await window.desktopAPI.getDrive()

        const refreshedDrives = Array.isArray(refreshedResult) ? refreshedResult : drives

        setDrives(refreshedDrives)

           const refreshedSource =
                refreshedDrives.find(
                    (drive) => drive.id === selectedDrive.id,
      ) ?? selectedDrive;


        const destinationDrive = refreshedDrives.find(
                (drive) => 
                    drive.letter?.toUpperCase() === destinationDriveLetter,
        )

        const sourceDiskNumber = refreshedSource.diskNumber

        const destinationDiskNumber = destinationDrive?.diskNumber

        const physicalDisksIdentified = Number.isInteger(sourceDiskNumber) && Number.isInteger(destinationDiskNumber)

        if (physicalDisksIdentified && sourceDiskNumber == destinationDiskNumber) {
            setDestinationPath("")
            setDestinationError(
                `${sourceDriveLetter} e ${destinationDriveLetter}` + `pertence ao mesmo dísco físico ${sourceDiskNumber}.`
                + `Escolha outro HD, SSD ou pendrive` 
            )

            return
        }

        if (!physicalDisksIdentified) {
            setDestinationWarning(
                "Os Volumes são diferentes, mas não foi possível " +
                "confirmar se pertencem a discos físicos diferentes"
            )
        }


        setDestinationPath(selectedPath)
    } catch (selectionError) {
        const message = selectionError instanceof Error ? selectionError.message : "Não foi possível selecionar o destino."

        setDestinationPath("");
        setDestinationWarning("")
        setDestinationError(message)

    } finally {
        setIsSelectingDestination(false)
    }
}

    const loadDrives = useCallback(async () => {
        setIsLoading(true);
        setSelectedDriveId(false)
        setError("")

        try {
            if(!window.desktopAPI?.getDrive) {
                throw new Error (
                    "A consulta de discos não esta disponível.",
                )
            }

            const result = await window.desktopAPI.getDrive()

            const avaliableDrives = Array.isArray(result) ? result : []

            setDrives(avaliableDrives)

            setSelectedDriveId((currentDriveId) => {
                const driveStillExists = avaliableDrives.some(
                    (drive) => drive.id === currentDriveId,
                )

                return driveStillExists ? currentDriveId : null
            })

        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Não foi possível consultar os discos"

            setError(message)
            setDrives([])
            setSelectedDriveId(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadDrives()
    }, [loadDrives])

    const selectedDrive = drives.find(
        (drive) => drive.id === selectedDriveId,
    )

    function handleSelectDrive(driveId) {
        if (driveId !== selectedDriveId) {
            setDestinationPath("")
            setDestinationError("")
            setDestinationWarning("")
        }

        setSelectedDriveId(driveId)
    }
   

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
               <>
               <div 
                    className="drive-grid"
                    role="group"
                    aria-label="Discos disponíveis"
                >
                    {drives.map((drive) => {
                        const usedPercentage = calculateUsedPercentage(drive)

                        return (
                                <button
                                    type="button"
                                    className={`drive-card ${
                                        selectedDriveId === drive.id ? "is-selected" : ""
                                    }`}
                                    key={drive.id}
                                    aria-pressed={selectedDriveId === drive.id}
                                    aria-label={`Selecionar disco ${drive.letter}`}
                                    onClick={() => handleSelectDrive(drive.id)}
                                    >
                                    <span className="drive-card-header">
                                        <span className="drive-icon">
                                        <HardDrive size={24} />
                                        </span>

                                        <span className="drive-heading">
                                        <span className="drive-title">
                                            {drive.label}
                                        </span>

                                        <span className="drive-subtitle">
                                            {drive.letter} ·{" "}
                                            {DRIVE_TYPE_LABELS[drive.type] ||
                                            DRIVE_TYPE_LABELS.unknown}
                                        </span>
                                        </span>

                                        {selectedDriveId === drive.id && (
                                        <CheckCircle2
                                            className="selected-icon"
                                            size={22}
                                            aria-hidden="true"
                                        />
                                        )}
                                    </span>

                                    {drive.isSystem && (
                                        <span className="system-badge">
                                        Disco do sistema
                                        </span>
                                    )}

                                    <span className="drive-details">
                                        <span>
                                        Sistema de arquivos
                                        <strong>{drive.fileSystem}</strong>
                                        </span>

                                        <span>
                                        Espaço disponível
                                        <strong>{formatBytes(drive.freeBytes)}</strong>
                                        </span>
                                    </span>

                                    <span className="storage">
                                        <span className="storage-track">
                                        <span
                                            className="storage-used"
                                            style={{ width: `${usedPercentage}%` }}
                                        />
                                        </span>

                                        <span className="storage-description">
                                        {formatBytes(drive.freeBytes)} disponíveis de{" "}
                                        {formatBytes(drive.totalBytes)}
                                        </span>
                                    </span>
                                    </button>
                        )
                    })}
                    
                </div>

                    {selectedDrive && (
                        <div className="selection-summary" role="status">
                            <CheckCircle2
                            size={22}
                            aria-hidden="true"
                            />

                            <div>
                            <strong>
                                Disco {selectedDrive.letter} selecionado
                            </strong>

                            <p>
                                {selectedDrive.label} ·{" "}
                                {formatBytes(selectedDrive.totalBytes)}
                            </p>
                            </div>
                        </div>
                        )}
                </>      
            )}

            {selectedDrive && (
                    <section
                        className="destination-section"
                        aria-labelledby="destination-title"
                    >
                        <div className="destination-heading">
                        <div className="destination-icon">
                            <FolderOpen
                            size={24}
                            aria-hidden="true"
                            />
                        </div>

                        <div>
                            <h2 id="destination-title">
                            Pasta de destino
                            </h2>

                            <p>
                            Escolha uma pasta em outro disco para
                            armazenar os arquivos recuperados.
                            </p>
                        </div>
                        </div>

                        <div className="source-write-warning" role="note">
                            <AlertTriangle size={21} aria-hidden="true"/>
                            <div>
                                Evite utilizar o disco {selectedDrive.letter}
                            </div>

                            <span>
                                Criar, baixar ou instalar arquivos nesse disco pode
                                sobrescrever dados que ainda poderiam ser recuperados.
                            </span>

                        </div>

                        <button
                        type="button"
                        className="destination-button"
                        onClick={handleSelectDestination}
                        disabled={isSelectingDestination}
                        >
                        <FolderOpen
                            size={18}
                            aria-hidden="true"
                        />

                        {isSelectingDestination
                            ? "Abrindo..."
                            : destinationPath
                            ? "Alterar destino"
                            : "Selecionar destino"}
                        </button>

                        {destinationPath && (
                        <div
                            className="destination-success"
                            role="status"
                        >
                            <CheckCircle2
                            size={20}
                            aria-hidden="true"
                            />

                            <div>
                            <strong>Destino selecionado</strong>
                            <span>{destinationPath}</span>
                            </div>
                        </div>
                        )}

                        {destinationWarning && (
                                <div
                                    className="destination-warning"
                                    role="status"
                                >
                                    <AlertTriangle
                                        size={20}
                                        aria-hidden="true"
                                    />

                                    <span>{destinationWarning}</span>
                                </div>
                        )

                        }

                        {destinationError && (
                        <div
                            className="destination-error"
                            role="alert"
                        >
                            <AlertTriangle
                            size={20}
                            aria-hidden="true"
                            />

                            <span>{destinationError}</span>
                        </div>
                        )}
                    </section>
                    )}

        </section>
    )
}

export default Scan;