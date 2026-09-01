import { useCallback, useEffect, useState } from "react";
import { HardDrive, RefreshCw, CheckCircle2, FolderOpen, AlertTriangle, XCircle, X, Search, FileText, Settings2} from "lucide-react";
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
    elapsedMs: 0,
    results: [],
}

const RECOVERABILITY_LABELS = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  recovered: "Recuperado",
}


const RECOVERY_FILE_GROUPS = {
  all: {
    label: "Todos os arquivos",
    description:
      "Procura todos os tipos suportados pelo Windows File Recovery.",
    filters: [],
  },

  documents: {
    label: "Documentos",
    description:
      "Word, PDF, Excel, PowerPoint e arquivos de texto.",
    filters: [
      "*.docx",
      "*.pdf",
      "*.xlsx",
      "*.pptx",
      "*.txt",
    ],
  },

  images: {
    label: "Imagens",
    description:
      "Fotos e imagens nos formatos mais comuns.",
    filters: [
      "*.jpg",
      "*.jpeg",
      "*.png",
      "*.gif",
    ],
  },

  videos: {
    label: "Vídeos",
    description:
      "Arquivos MP4, MOV, AVI e MKV.",
    filters: [
      "*.mp4",
      "*.mov",
      "*.avi",
      "*.mkv",
    ],
  },

  archives: {
    label: "Arquivos compactados",
    description:
      "Arquivos ZIP, RAR e 7Z.",
    filters: [
      "*.zip",
      "*.rar",
      "*.7z",
    ],
  },

  quickTest: {
  label: "Teste rápido (.txt)",
  description:
    "Procura apenas arquivos TXT. Ideal para testes durante o desenvolvimento.",
  filters: [
    "*.txt",
  ],
},

};

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "Indisponível"
    }

    const units = ["B", "KB", "MB", "GB"]
    let value = bytes
    let unitIndex = 0

    while (
        value >= 1024 && unitIndex < units.length - 1
    ) {
        value /= 1024
        unitIndex += 1
    }

    const decimals = unitIndex === 0 ? 0 : 1

    return `${value.toFixed(decimals)} ${
        units[unitIndex]
    }`
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

function buildRecoveryFilters(
  fileGroup,
  sourceFolder,
) {
  const group =
    RECOVERY_FILE_GROUPS[fileGroup];

  if (!group) {
    return [];
  }

  const rawFolder =
    typeof sourceFolder === "string"
      ? sourceFolder.trim()
      : "";

  if (!rawFolder) {
    return group.filters;
  }

  let folder =
    rawFolder.replace(/\//g, "\\");

  if (!folder.startsWith("\\")) {
    folder = `\\${folder}`;
  }

  if (!folder.endsWith("\\")) {
    folder += "\\";
  }

  if (group.filters.length === 0) {
    return [folder];
  }

  return group.filters.map(
    (filter) =>
      `${folder}${filter}`,
  );
}

function getRecoveryDisplayMessage(
  message,
  status,
) {
  if (status === "starting") {
    return "Preparando a recuperação...";
  }

  if (!message) {
    return "Aguardando informações do Windows File Recovery...";
  }

  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("pass 1") &&
    normalized.includes("scanning")
  ) {
    return "Analisando e processando o disco...";
  }

  if (
    normalized.includes("pass 2") ||
    normalized.includes("recovering files")
  ) {
    return "Recuperando os arquivos encontrados...";
  }

  if (
    normalized.includes(
      "no recoverable files",
    )
  ) {
    return "Nenhum arquivo recuperável foi encontrado com esta configuração.";
  }

  if (
    normalized.includes(
      "windows file recovery iniciado",
    )
  ) {
    return "Windows File Recovery iniciado...";
  }

  return message;
}


function getAutomaticRecoveryMode(drive) {
  const fileSystem =
    drive?.fileSystem?.toUpperCase();

  return fileSystem === "NTFS"
    ? "regular"
    : "extensive";
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
    const [showScanResults, setShowScanResults,] = useState(false)


    const [recoveryMode, setRecoveryMode] = useState("regular");

    const [recoveryCommandPreview, setRecoveryCommandPreview] = useState(null)
    const [recoveryFileGroup, setRecoveryFileGroup] = useState("all")
    const [recoveryCommandError, setRecoveryCommandError] = useState("")
    const [isPreparingRecovery, setIsPreparingRecovery] = useState(false)

    const [isRecoveryConfigModalOpen, setIsRecoveryConfigModalOpen] = useState(false)

    const [recoverySourceFolder, setRecoverySourceFolder] = useState("")

    const [recoveryStartedAt,setRecoveryStartedAt] = useState(null);

    const [ liveElapsedMs, setLiveElapsedMs] = useState(0);

    function handleOpenRecoveryConfig() {
  setRecoveryCommandError("");
  setIsRecoveryConfigModalOpen(true);
}

function handleCloseRecoveryConfig() {
  if (isPreparingRecovery) {
    return;
  }

  setRecoveryCommandError("");
  setIsRecoveryConfigModalOpen(false);
}


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
                "Não foi possível identificar o disco da pasta selecionada."
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

        if (physicalDisksIdentified && sourceDiskNumber === destinationDiskNumber) {
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

    async function handlePrepareRecovery() {
        if (!selectedDrive) {
            setRecoveryCommandError("Selecione o disco de origem")
            return
        }


         if (!destinationPath) {
        setRecoveryCommandError("Selecione uma pasta de destino")
        return
    }

        if (!window.desktopAPI?.previewRecoveryCommand) {
        setRecoveryCommandError ("A preparação da recuperação não esta disponível.")
        return 
    }

     const filters =
        buildRecoveryFilters(
            recoveryFileGroup,
            recoverySourceFolder,
  );

     setIsPreparingRecovery(true)
     setRecoveryCommandError("")
     setRecoveryCommandPreview(null)

     try {
        const preview = await window.desktopAPI
                        .previewRecoveryCommand(
                            {
                                sourceDrive: selectedDrive.letter,
                                destinationPath,
                                mode: recoveryMode,
                                filters,
                            })
                            setRecoveryCommandPreview(preview)
                            setIsRecoveryConfigModalOpen(false);
            
         } catch (preparationError) {
            const message = preparationError instanceof Error
                            ? preparationError.message
                            : "Não foi possível preparar a recuperação."
            setRecoveryCommandError(message)
         } finally {
            setIsPreparingRecovery(false)
         }

    }


    const loadDrives = useCallback(async () => {
        setIsLoading(true);
        setError("")
        setSelectedDriveId(null);

        setDestinationPath("");
        setDestinationError("");
        setDestinationWarning("");

        setRecoveryCommandPreview(null);
        setRecoveryCommandError("");
        setRecoveryMode("regular");
        setRecoveryFileGroup("all");
        setIsRecoveryConfigModalOpen(false);

        setScanState({
            ...INITIAL_SCAN_STATE,
        });

        setScanError("");
        setShowScanResults(false);
        setIsScanModalOpen(false);


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
  if (!window.desktopAPI?.onRealRecoveryUpdate) {
    return undefined;
  }

  const removeListener =
    window.desktopAPI.onRealRecoveryUpdate((update) => {

        
      setScanState((currentState) => {
        if (
          currentState.scanId &&
          update.recoveryId !== currentState.scanId
        ) {
          return currentState;
        }

        return {
          ...currentState,

          scanId:
            update.recoveryId ??
            currentState.scanId,

          status:
            update.status ??
            currentState.status,

          progress:
            update.progress ??
            currentState.progress,

          message:
            update.message ??
            currentState.message,

          elapsedMs:
            update.elapsedMs ??
            currentState.elapsedMs,

          filesFound:
            update.filesFound ??
            currentState.filesFound,

          results:
            Array.isArray(update.results)
              ? update.results
              : currentState.results,
        };
      });

      if (
  Number.isFinite(update.elapsedMs)
) {
  setLiveElapsedMs(
    update.elapsedMs,
  );
}
      if (update.type === "completed") {
        setShowScanResults(true);
      }

      if (update.type === "failed") {
        setScanError(
          update.message ||
          "A recuperação falhou.",
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

    const isProgressIndeterminate =
        isScanActive &&
        scanState.progress <= 0;

        const recoveryDisplayMessage =
        getRecoveryDisplayMessage(
            scanState.message,
            scanState.status,
        );

    useEffect(() => {
  if (
    !isScanActive ||
    !recoveryStartedAt
  ) {
    return undefined;
  }

  function updateElapsedTime() {
    setLiveElapsedMs(
      Date.now() - recoveryStartedAt,
    );
  }

  updateElapsedTime();

  const intervalId =
    setInterval(
      updateElapsedTime,
      1000,
    );

  return () => {
    clearInterval(intervalId);
  };
}, [
  isScanActive,
  recoveryStartedAt,
]);

    const canStartScan = Boolean(
        selectedDrive && destinationPath && recoveryCommandPreview &&
        !destinationError && !isScanActive && !isPreparingRecovery
    )


function handleSelectDrive(driveId) {
  const drive = drives.find(
    (item) => item.id === driveId
  );

  if (driveId !== selectedDriveId) {
    setDestinationPath("");
    setDestinationError("");
    setDestinationWarning("");

    setRecoveryCommandPreview(null);
    setRecoveryCommandError("");
  }

  setSelectedDriveId(driveId);

  if (!drive) {
    return;
  }

  setRecoveryMode(
    getAutomaticRecoveryMode(drive)
  );
}

async function handleStartScan() {
  if (!canStartScan) {
    setScanError(
      "Selecione a origem, o destino e configure a recuperação.",
    );

    return;
  }

  if (!window.desktopAPI?.startRealRecovery) {
    setScanError(
      "A recuperação real não está disponível.",
    );

    return;
  }

  const startedAt = Date.now();

  setRecoveryStartedAt(startedAt);
  setLiveElapsedMs(0);

  setShowScanResults(false);
  setIsScanModalOpen(true);
  setScanError("");

  setScanState({
    ...INITIAL_SCAN_STATE,
    status: "starting",
    message: "Iniciando a recuperação...",
  });

  try {
    const filters =
      buildRecoveryFilters(
        recoveryFileGroup,
        recoverySourceFolder,
      );

    const startedRecovery =
      await window.desktopAPI.startRealRecovery({
        sourceDrive: selectedDrive.letter,
        destinationPath,
        mode: recoveryMode,
        filters,
      });

    setScanState((currentState) => ({
      ...currentState,

      scanId: startedRecovery.recoveryId,

      status:
        startedRecovery.status ??
        "starting",

      progress:
        startedRecovery.progress ?? 0,

      message:
        "Windows File Recovery iniciado.",
    }));
  } catch (startError) {
    const message =
      startError instanceof Error
        ? startError.message
        : "Não foi possível iniciar a recuperação.";

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
    !window.desktopAPI?.cancelRealRecovery
  ) {
    return;
  }

  setScanError("");

  setScanState((currentState) => ({
    ...currentState,
    status: "cancelling",
    message: "Cancelando a recuperação...",
  }));

  try {
    const result =
      await window.desktopAPI.cancelRealRecovery(
        scanState.scanId,
      );

    if (!result.cancelled) {
      setScanState((currentState) => ({
        ...currentState,
        status: "running",
      }));

      setScanError(
        result.message ||
          "Não foi possível cancelar a recuperação.",
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
        : "Não foi possível cancelar a recuperação.",
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

    useEffect(() => {
    setRecoveryCommandPreview(null);
    setRecoveryCommandError("");
    }, [
        selectedDriveId,
        destinationPath,
        recoveryMode,
        recoveryFileGroup,
        recoverySourceFolder,
    ]);

    useEffect(() => {
  if (!isRecoveryConfigModalOpen) {
    return undefined;
  }

  const previousOverflow =
    document.body.style.overflow;

  document.body.style.overflow =
    "hidden";

  function handleKeyDown(event) {
    if (
      event.key === "Escape" &&
      !isPreparingRecovery
    ) {
      setIsRecoveryConfigModalOpen(false);
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
}, [
  isRecoveryConfigModalOpen,
  isPreparingRecovery,
]);

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
                                <strong>
                                Evite utilizar o disco {selectedDrive.letter}
                                </strong>
                      

                            <span>
                                Criar, baixar ou instalar arquivos nesse disco pode
                                sobrescrever dados que ainda poderiam ser recuperados.
                            </span>
                        </div>
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

                                {destinationPath && (
                                        <div className="recovery-configuration">
                                            {recoveryCommandPreview && (
                                            <div
                                                className="recovery-configuration-summary"
                                                role="status"
                                            >
                                                <CheckCircle2
                                                size={20}
                                                aria-hidden="true"
                                                />

                                                <div>
                                                <strong>
                                                    Configuração validada
                                                </strong>

                                                <span>
                                                    Modo:{" "}
                                                    {recoveryMode === "regular"
                                                    ? "Regular"
                                                    : "Extensivo"}
                                                    {" · "}
                                                    {
                                                    RECOVERY_FILE_GROUPS[
                                                        recoveryFileGroup
                                                    ].label
                                                    }
                                                </span>
                                                </div>
                                            </div>
                                            )}

                                            <div className="recovery-action-buttons">
                                            <button
                                                type="button"
                                                className="configure-recovery-button"
                                                onClick={
                                                handleOpenRecoveryConfig
                                                }
                                                disabled={isScanActive}
                                            >
                                                <Settings2
                                                size={18}
                                                aria-hidden="true"
                                                />

                                                {recoveryCommandPreview
                                                ? "Alterar configuração"
                                                : "Configurar recuperação"}
                                            </button>

                                            <button
                                                type="button"
                                                className="start-scan-button"
                                                onClick={handleStartScan}
                                                disabled={!canStartScan}
                                            >
                                                <Search
                                                size={18}
                                                aria-hidden="true"
                                                />

                                                {scanState.status === "idle"
                                                ? "Iniciar varredura"
                                                : "Executar novamente"}
                                            </button>
                                            </div>
                                        </div>
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
                         Recuperação de arquivos
                    </h2>

                   <p id="scan-modal-description">
                        {recoveryDisplayMessage}
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

          {!showScanResults && (
            <div
                className="scan-modal-progress"
                aria-live="polite"
            >
                <div className="scan-progress-information">
                <span>Progresso</span>
              <strong>
                {isProgressIndeterminate
                    ? "Analisando..."
                    : `${scanState.progress}%`}
                </strong>
                </div>

              <div
                    className={`scan-progress-track ${
                        isProgressIndeterminate
                        ? "is-indeterminate"
                        : ""
                    }`}
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={
                        isProgressIndeterminate
                        ? undefined
                        : scanState.progress
                    }
                    aria-valuetext={
                        isProgressIndeterminate
                        ? "Analisando o disco"
                        : undefined
                    }
                    >
                    <div
                        className={`scan-progress-value ${
                        isProgressIndeterminate
                            ? "is-indeterminate"
                            : ""
                        }`}
                        style={
                        isProgressIndeterminate
                            ? undefined
                            : {
                                width:
                                `${scanState.progress}%`,
                            }
                        }
                    />
                    </div>

                <div className="scan-modal-metrics">
                <div>
                    <span>Arquivos Recuperados</span>
                    <strong>
                    {scanState.filesFound}
                    </strong>
                </div>

                <div>
                    <span>Tempo decorrido</span>
                    <strong>
                    {formatElapsedTime(
                        liveElapsedMs,
                    )}
                    </strong>
                </div>
                </div>


                <div className="scan-recovery-context">
                    <div>
                        <span>Origem</span>

                        <strong>
                        {selectedDrive?.letter || "-"}
                        </strong>
                    </div>

                    <div>
                        <span>Destino</span>

                        <strong>
                        {extractDriveLetter(
                            destinationPath,
                        ) || "-"}
                        </strong>
                    </div>

                    <div>
                        <span>Modo</span>

                        <strong>
                        {recoveryMode === "regular"
                            ? "Regular"
                            : "Extensivo"}
                        </strong>
                    </div>

                    <div>
                        <span>Filtro</span>

                        <strong>
                        {
                            RECOVERY_FILE_GROUPS[
                            recoveryFileGroup
                            ]?.label
                        }
                        </strong>
                    </div>
                    </div>
            </div>
         )}

        

         {showScanResults && (
            <div className="scan-results">
                <div className="scan-results-header">
                    <div>
                       <h3>Arquivos recuperados</h3>
                            <p>
                            Arquivos recuperados pelo
                            Windows File Recovery.
                            </p>
                    </div>

                    <span className="results-count">
                        {scanState.results.length}
                    </span>
                </div>

                <div className="scan-results-list">
                    {scanState.results.map((file) => (
                        <article
                            className = "scan-result-item"
                            key = {file.id}
                        >
                            <div className="scan-result-icon">
                                <FileText
                                    size={20}
                                    aria-hidden="true"
                                />
                            </div>


                            <div className="scan-result-information">
                                <strong>{file.name}</strong>

                                <span title={file.recoveredPath}>
                                    {file.recoveredPath}
                                </span>
                            </div>

                            <div className="scan-result-metadata">
                                <strong>
                                    {formatFileSize(file.sizeBytes)}
                                </strong>


                                <span
                                    className={`recoverability is-${file.recoverability}`}
                                >
                                    {
                                        RECOVERABILITY_LABELS[
                                            file.recoverability
                                        ] || "Desconhecida"
                                    } 
                                </span>
                            </div>

                        </article>
                    ))}
                </div>

            </div>
         )

         }

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
                {isScanActive && (
                    <button
                    type="button"
                    className="cancel-scan-button"
                    onClick={handleCancelScan}
                    disabled={
                        scanState.status === "cancelling" ||
                        !scanState.scanId
                    }
                    >
                    <XCircle size={15} aria-hidden="true" />

                    {scanState.status === "cancelling"
                        ? "Cancelando..."
                        : "Cancelar"}
                    </button>
                )}

                {!isScanActive &&
                    scanState.status === "completed" &&
                    !showScanResults && (
                    <>
                        <button
                        type="button"
                        className="modal-secondary-button"
                        onClick={handleCloseScanModal}
                        >
                        Fechar
                        </button>

                        <button
                        type="button"
                        className="view-results-button"
                        onClick={() =>
                            setShowScanResults(true)
                        }
                        >
                        Ver arquivos encontrados
                        </button>
                    </>
                    )}

                {!isScanActive && showScanResults && (
                    <>
                    <button
                        type="button"
                        className="modal-secondary-button"
                        onClick={() =>
                        setShowScanResults(false)
                        }
                    >
                        Voltar
                    </button>

                    <button
                        type="button"
                        className="close-scan-button"
                        onClick={handleCloseScanModal}
                    >
                        Fechar
                    </button>
                    </>
                )}

                {!isScanActive &&
                    scanState.status !== "completed" &&
                    !showScanResults && (
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

         {isRecoveryConfigModalOpen && (
                <div
                    className="scan-modal-backdrop"
                    onMouseDown={(event) => {
                    if (
                        event.target ===
                        event.currentTarget &&
                        !isPreparingRecovery
                    ) {
                        handleCloseRecoveryConfig();
                    }
                    }}
                >
                    <section
                    className="recovery-config-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="recovery-config-title"
                    aria-describedby="recovery-config-description"
                    >
                    <header className="scan-modal-header">
                        <div className="scan-modal-heading">
                        <div className="scan-modal-icon">
                            <Settings2
                            size={24}
                            aria-hidden="true"
                            />
                        </div>

                        <div>
                            <h2 id="recovery-config-title">
                            Configurar recuperação
                            </h2>

                            <p id="recovery-config-description">
                            Escolha o modo e os tipos
                            de arquivo que deseja procurar.
                            </p>
                        </div>
                        </div>

                        <button
                        type="button"
                        className="scan-modal-close"
                        onClick={
                            handleCloseRecoveryConfig
                        }
                        disabled={isPreparingRecovery}
                        aria-label="Fechar configurações"
                        >
                        <X size={20} />
                        </button>
                    </header>

                    <div className="recovery-options">
                        <fieldset className="mode-options">
                        <legend>
                            Modo de recuperação
                        </legend>

                    <label
                        className={
                            recoveryMode === "regular"
                            ? "mode-option is-selected"
                            : "mode-option"
                        }
                        >
                        <input
                            type="radio"
                            name="recovery-mode"
                            value="regular"
                            checked={recoveryMode === "regular"}
                            disabled
                            readOnly
                        />

                        <span>
                            <strong>Regular</strong>

                            <small>
                            Usado automaticamente para discos NTFS.
                            </small>
                        </span>
                                        </label>

                                        <label
                    className={
                        recoveryMode === "extensive"
                        ? "mode-option is-selected"
                        : "mode-option"
                    }
                    >
                    <input
                        type="radio"
                        name="recovery-mode"
                        value="extensive"
                        checked={recoveryMode === "extensive"}
                        disabled
                        readOnly
                    />

                    <span>
                        <strong>Extensivo</strong>

                        <small>
                        Usado automaticamente para FAT32, exFAT
                        e outros sistemas de arquivos.
                        </small>
                    </span>
                    </label>
                        </fieldset>

                        <label className="file-group-field">
                        <span>Tipos de arquivo</span>

                        <select
                            value={recoveryFileGroup}
                            onChange={(event) =>
                            setRecoveryFileGroup(
                                event.target.value,
                            )
                            }
                        >
                            {Object.entries(
                            RECOVERY_FILE_GROUPS,
                            ).map(([groupId, group]) => (
                            <option
                                key={groupId}
                                value={groupId}
                            >
                                {group.label}
                            </option>
                            ))}
                        </select>

                        <small>
                            {
                            RECOVERY_FILE_GROUPS[
                                recoveryFileGroup
                            ].description
                            }
                        </small>
                        </label>

                        <label className="file-group-field">
                                <span>Pasta de origem</span>

                                <input
                                    type="text"
                                    value={recoverySourceFolder}
                                    onChange={(event) =>
                                    setRecoverySourceFolder(
                                        event.target.value,
                                    )
                                    }
                                    placeholder="\RecoveryTest\"
                                />

                                <small>
                                    Opcional. Deixe vazio para analisar
                                    todo o disco.
                                </small>
                        </label>

                        {recoveryCommandError && (
                        <div
                            className="recovery-command-error"
                            role="alert"
                        >
                            {recoveryCommandError}
                        </div>
                        )}
                    </div>

                    <footer className="recovery-config-actions">
                        <button
                        type="button"
                        className="modal-secondary-button"
                        onClick={
                            handleCloseRecoveryConfig
                        }
                        disabled={isPreparingRecovery}
                        >
                        Cancelar
                        </button>

                        <button
                        type="button"
                        className="prepare-recovery-button"
                        onClick={handlePrepareRecovery}
                        disabled={isPreparingRecovery}
                        >
                        {isPreparingRecovery
                            ? "Validando..."
                            : "Validar configuração"}
                        </button>
                    </footer>
                    </section>
                </div>
                )}

        </section>
    )
}

export default Scan;