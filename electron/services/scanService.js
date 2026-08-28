import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

const SIMULATED_FILE_TEMPLATES = [
  {
    name: "Projeto-final.docx",
    directory: "Users\\Public\\Documents",
    sizeBytes: 482304,
    category: "document",
    recoverability: "high",
  },
  {
    name: "Relatorio-financeiro.xlsx",
    directory: "Users\\Public\\Documents",
    sizeBytes: 756224,
    category: "spreadsheet",
    recoverability: "high",
  },
  {
    name: "Apresentacao.pptx",
    directory: "Users\\Public\\Desktop",
    sizeBytes: 3248128,
    category: "presentation",
    recoverability: "medium",
  },
  {
    name: "Foto-evento.jpg",
    directory: "Users\\Public\\Pictures",
    sizeBytes: 2457600,
    category: "image",
    recoverability: "high",
  },
  {
    name: "Captura-de-tela.png",
    directory: "Users\\Public\\Pictures",
    sizeBytes: 1348608,
    category: "image",
    recoverability: "medium",
  },
  {
    name: "Backup-projeto.zip",
    directory: "Users\\Public\\Downloads",
    sizeBytes: 15728640,
    category: "archive",
    recoverability: "low",
  },
  {
    name: "Codigo-fonte.js",
    directory: "Users\\Public\\Documents\\Projetos",
    sizeBytes: 18432,
    category: "code",
    recoverability: "high",
  },
  {
    name: "Video-apresentacao.mp4",
    directory: "Users\\Public\\Videos",
    sizeBytes: 52428800,
    category: "video",
    recoverability: "medium",
  },
];

const ALLOWED_SCAN_MODES = new Set([
  "regular",
  "extensive",
]);

const SIMULATION_STEPS = [
  {
    progress: 5,
    phase: "preparing",
    message: "Preparando a varredura...",
    filesFound: 0,
    delayMs: 700,
  },
  {
    progress: 20,
    phase: "analyzing",
    message: "Analisando a estrutura do disco...",
    filesFound: 2,
    delayMs: 900,
  },
  {
    progress: 40,
    phase: "searching",
    message: "Procurando arquivos excluídos...",
    filesFound: 8,
    delayMs: 1100,
  },
  {
    progress: 65,
    phase: "searching",
    message: "Verificando registros encontrados...",
    filesFound: 17,
    delayMs: 1100,
  },
  {
    progress: 85,
    phase: "organizing",
    message: "Organizando os resultados...",
    filesFound: 24,
    delayMs: 900,
  },
  {
    progress: 100,
    phase: "completed",
    message: "Varredura concluída.",
    filesFound: 27,
    delayMs: 700,
  },
];

function createSimulatedResults(scanId, sourceDrive) {
  return SIMULATED_FILE_TEMPLATES.map(
    (file, index) => ({
      id: `${scanId}-${index + 1}`,
      name: file.name,
      originalPath:
       `${sourceDrive}\\${file.directory}` + `\\${file.name}`,
       sizeBytes: file.sizeBytes,
       category: file.category,
       recoverability: file.recoverability,
       status: "recoverable",
    })
  )
}


function validateScanRequest(input) {
  if (!input || typeof input !== "object") {
    throw new Error(
      "Os dados da varredura são inválidos.",
    );
  }

  const sourceDrive =
    typeof input.sourceDrive === "string"
      ? input.sourceDrive.trim().toUpperCase()
      : "";

  const destinationPath =
    typeof input.destinationPath === "string"
      ? input.destinationPath.trim()
      : "";

  const mode = input.mode ?? "regular";

  if (!/^[A-Z]:$/.test(sourceDrive)) {
    throw new Error(
      "O disco de origem é inválido.",
    );
  }

  if (
    !/^[A-Za-z]:[\\/]/.test(destinationPath)
  ) {
    throw new Error(
      "A pasta de destino é inválida.",
    );
  }

  if (!ALLOWED_SCAN_MODES.has(mode)) {
    throw new Error(
      "O modo de varredura é inválido.",
    );
  }

  const destinationDrive =
    destinationPath
      .slice(0, 2)
      .toUpperCase();

  /*
   * A interface já realiza esta validação,
   * mas o processo principal também deve se proteger.
   */
  if (sourceDrive === destinationDrive) {
    throw new Error(
      "A origem e o destino não podem estar no mesmo volume.",
    );
  }

  return {
    sourceDrive,
    destinationPath,
    destinationDrive,
    mode,
  };
}

function createAbortError() {
  const error = new Error(
    "A varredura foi cancelada.",
  );

  error.name = "AbortError";

  return error;
}

function wait(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    let timeoutId;

    function cleanup() {
      signal.removeEventListener(
        "abort",
        handleAbort,
      );
    }

    function handleAbort() {
      clearTimeout(timeoutId);
      cleanup();
      reject(createAbortError());
    }

    timeoutId = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);

    signal.addEventListener(
      "abort",
      handleAbort,
      { once: true },
    );
  });
}

export function createSimulatedScan(input) {
  const request = validateScanRequest(input);

  const scanId = randomUUID();

  const results = createSimulatedResults(
    scanId,
    request.sourceDrive
  )

  const controller = new AbortController();
  const scan = new EventEmitter();

  let status = "idle";
  let progress = 0;
  let filesFound = 0;
  let startedAt = null;

  scan.id = scanId;
  scan.request = request;

  scan.getSnapshot = () => ({
    scanId,
    status,
    progress,
    filesFound,
    startedAt,
    request,
  });

  scan.start = () => {
    if (status !== "idle") {
      throw new Error(
        "Esta varredura já foi iniciada.",
      );
    }

    status = "running";
    startedAt = Date.now();

    void runSimulation();

    return scan.getSnapshot();
  };

  scan.cancel = () => {
    if (status !== "running") {
      return false;
    }

    status = "cancelling";
    controller.abort();

    return true;
  };

  async function runSimulation() {
    try {
      for (const step of SIMULATION_STEPS) {
        await wait(
          step.delayMs,
          controller.signal,
        );

        progress = step.progress;
        filesFound = step.filesFound;

        scan.emit("progress", {
          scanId,
          status: "running",
          progress,
          filesFound,
          phase: step.phase,
          message: step.message,
          elapsedMs: Date.now() - startedAt,
        });
      }

      status = "completed";
      filesFound = results.length

      scan.emit("completed", {
        scanId,
        status,
        progress: 100,
        filesFound,
        durationMs: Date.now() - startedAt,
        results
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        status = "cancelled";

        scan.emit("cancelled", {
          scanId,
          status,
          progress,
          filesFound,
          durationMs: Date.now() - startedAt,
        });

        return;
      }

      status = "failed";

      scan.emit("failed", {
        scanId,
        status,
        message:
          error instanceof Error
            ? error.message
            : "A varredura simulada falhou.",
      });
    }
  }

  return scan;
}
