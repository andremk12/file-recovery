import { useCallback, useEffect, useState } from "react";
import { HardDrive, RefreshCw, CheckCircle2, FolderOpen, AlertTriangle, XCircle, X, Search } from "lucide-react";
import "./Scan.css"

const DRIVE_TYPE_LABELS = {
    fixed: "Disco local",
    removable: "Dispositivo removível",
    network: "Unidade de rede",
    optical: "Unidade óptica",
    ram: "Disco em memória",
    unknown: "Tipo desconhecido"
}

const INITIAL_SCAN_STATE = {
    scanId: null,
    status: "idle",
    progress: 0,
    phase: "",
    message: "",
    filesFound: 0,
    elapsedMS: 0,
}

function formatElapsedTime(milliseconds) {
    const totalSeconds = Math.floor(
        milliseconds / 1000,
    )

    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`
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

    
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);


    const [scanState, setScanState] = useState(
        () => ({...INITIAL_SCAN_STATE})
    )

    const [scanError, setScanError] = useState("")

 
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

    useEffect(() => {
            if (!window.desktopAPI?.onScanUpdate) {
                return undefined;
            }

            const removeListener =
                window.desktopAPI.onScanUpdate((update) => {
                setScanState((currentState) => {
                    if (
                    currentState.scanId &&
                    update.scanId !== currentState.scanId
                    ) {
                    return currentState;
                    }

                    let message = update.message;

                    if (
                    update.type === "completed" &&
                    !message
                    ) {
                    message = "Varredura concluída.";
                    }

                    if (
                    update.type === "cancelled" &&
                    !message
                    ) {
                    message = "Varredura cancelada.";
                    }

                    return {
                    ...currentState,
                    scanId: update.scanId,
                    status: update.status,
                    progress:
                        update.progress ??
                        currentState.progress,
                    phase:
                        update.phase ??
                        currentState.phase,
                    message:
                        message ??
                        currentState.message,
                    filesFound:
                        update.filesFound ??
                        currentState.filesFound,
                    elapsedMs:
                        update.elapsedMs ??
                        update.durationMs ??
                        currentState.elapsedMs,
                    };
                });

                if (update.type === "failed") {
                    setScanError(
                    update.message ||
                        "A varredura falhou.",
                    );
                }
                });

            return removeListener;
            }, []);

    const selectedDrive = drives.find(
        (drive) => drive.id === selectedDriveId,
    )

       const isScanActive = [
        "starting",
        "running",
        "cancelling"
    ].includes(scanState.status)

    const canStartScan = Boolean(
        selectedDrive && destinationPath &&
        !destinationError && !isScanActive
    )


    function handleSelectDrive(driveId) {
        if (driveId !== selectedDriveId) {
            setDestinationPath("")
            setDestinationError("")
            setDestinationWarning("")
        }

        setSelectedDriveId(driveId)
    }

    async function handleStartScan() {
  if (!canStartScan) {
    setScanError(
      "Selecione a origem e a pasta de destino.",
    );

    return;
  }

  if (!window.desktopAPI?.startScan) {
    setScanError(
      "A varredura não está disponível.",
    );

    return;
  }
  setIsScanModalOpen(true)
  setScanError("");

  setScanState({
    ...INITIAL_SCAN_STATE,
    status: "starting",
    message: "Iniciando a varredura...",
  });

  try {
    const startedScan =
      await window.desktopAPI.startScan({
        sourceDrive: selectedDrive.letter,
        destinationPath,
        mode: "regular",
      });

    setScanState((currentState) => ({
      ...currentState,
      scanId: startedScan.scanId,
      status: startedScan.status,
      progress: startedScan.progress ?? 0,
      filesFound:
        startedScan.filesFound ?? 0,
    }));
  } catch (startError) {
    const message =
      startError instanceof Error
        ? startError.message
        : "Não foi possível iniciar a varredura.";

    setScanState({
      ...INITIAL_SCAN_STATE,
      status: "failed",
      message,
    });

    setScanError(message);
  }
}

async function handleCancelScan() {
  if (
    !scanState.scanId ||
    !window.desktopAPI?.cancelScan
  ) {
    return;
  }

  setScanError("");

  setScanState((currentState) => ({
    ...currentState,
    status: "cancelling",
    message: "Cancelando a varredura...",
  }));

  try {
    const result =
      await window.desktopAPI.cancelScan(
        scanState.scanId,
      );

    if (!result.cancelled) {
      setScanError(
        result.message ||
          "Não foi possível cancelar.",
      );
    }
  } catch (cancelError) {
    setScanState((currentState) => ({
      ...currentState,
      status: "running",
    }));

    setScanError(
      cancelError instanceof Error
        ? cancelError.message
        : "Não foi possível cancelar.",
    );
  }
}

function handleCloseScanModal() {
    if (isScanActive) {
        return
    }

    setIsScanModalOpen(false)
}

useEffect(() => {
  if (!isScanModalOpen) {
    return undefined;
  }

  const previousOverflow =
    document.body.style.overflow;

  document.body.style.overflow = "hidden";

  function handleKeyDown(event) {
    if (
      event.key === "Escape" &&
      !isScanActive
    ) {
      setIsScanModalOpen(false);
    }
  }

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  return () => {
    document.body.style.overflow =
      previousOverflow;

    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );
  };
}, [isScanModalOpen, isScanActive]);

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
                            disabled={
                                isSelectingDestination ||
                                isScanActive
                            }
                            >
                            <FolderOpen size={18} aria-hidden="true" />

                            {isSelectingDestination
                                ? "Abrindo..."
                                : destinationPath
                                ? "Alterar destino"
                                : "Selecionar destino"}
                            </button>

                            <div className="scan-actions">
                            <button
                                type="button"
                                className="start-scan-button"
                                onClick={handleStartScan}
                                disabled={!canStartScan}
                            >
                                <Search size={18} aria-hidden="true" />

                                {scanState.status === "idle"
                                ? "Iniciar varredura"
                                : "Executar novamente"}
                            </button>
                            </div>

                    
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

         {isScanModalOpen && (
            <div
                className="scan-modal-backdrop"
                onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !isScanActive
                ) {
                    handleCloseScanModal();
                }
                }}
            >
            <section
            className={`scan-modal is-${scanState.status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-modal-title"
            aria-describedby="scan-modal-description"
            >
            <header className="scan-modal-header">
                <div className="scan-modal-heading">
                <div className="scan-modal-icon">
                    {scanState.status === "completed" && (
                    <CheckCircle2
                        size={25}
                        aria-hidden="true"
                    />
                    )}

                    {scanState.status === "cancelled" && (
                    <XCircle
                        size={25}
                        aria-hidden="true"
                    />
                    )}

                    {scanState.status === "failed" && (
                    <AlertTriangle
                        size={25}
                        aria-hidden="true"
                    />
                    )}

                    {isScanActive && (
                    <RefreshCw
                        size={25}
                        className="is-spinning"
                        aria-hidden="true"
                    />
                    )}
                </div>

                <div>
                    <h2 id="scan-modal-title">
                    Varredura de arquivos
                    </h2>

                    <p id="scan-modal-description">
                    {scanState.message ||
                        "Preparando a varredura..."}
                    </p>
                </div>
                </div>

                <button
                type="button"
                className="scan-modal-close"
                onClick={handleCloseScanModal}
                disabled={isScanActive}
                aria-label="Fechar varredura"
                >
                <X size={20} />
                </button>
            </header>

            <div
                className="scan-modal-progress"
                aria-live="polite"
            >
                <div className="scan-progress-information">
                <span>Progresso</span>
                <strong>
                    {scanState.progress}%
                </strong>
                </div>

                <div
                className="scan-progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={scanState.progress}
                >
                <div
                    className="scan-progress-value"
                    style={{
                    width: `${scanState.progress}%`,
                    }}
                />
                </div>

                <div className="scan-modal-metrics">
                <div>
                    <span>Arquivos encontrados</span>
                    <strong>
                    {scanState.filesFound}
                    </strong>
                </div>

                <div>
                    <span>Tempo decorrido</span>
                    <strong>
                    {formatElapsedTime(
                        scanState.elapsedMs,
                    )}
                    </strong>
                </div>
                </div>
            </div>

            {scanError && (
                <div
                className="scan-operation-error"
                role="alert"
                >
                <AlertTriangle
                    size={20}
                    aria-hidden="true"
                />

                <span>{scanError}</span>
                </div>
            )}

            <footer className="scan-modal-actions">
                {isScanActive ? (
                <button
                    type="button"
                    className="cancel-scan-button"
                    onClick={handleCancelScan}
                    disabled={
                    scanState.status === "cancelling" ||
                    !scanState.scanId
                    }
                >
                    <XCircle
                    size={18}
                    aria-hidden="true"
                    />

                    {scanState.status === "cancelling"
                    ? "Cancelando..."
                    : "Cancelar"}
                </button>
                ) : (
                <button
                    type="button"
                    className="close-scan-button"
                    onClick={handleCloseScanModal}
                >
                    Fechar
                </button>
                )}
            </footer>
            </section>
        </div>
        )}

        </section>
    )
}

export default Scan;