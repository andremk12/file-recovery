import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  StringDecoder,
} from "node:string_decoder";

import {
  getRecoveryEngineStatus,
} from "./recoveryEngineService.js";

import {
  buildWinfrCommand,
} from "./winfrCommandBuilder.js";


import { 
    collectRecoveredResults, 
    snapshotRecoveryFolders 
  } from "./recoveryResultService.js";

let activeRecovery = null;

function isProbablyUtf16(buffer) {
  if (
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xfe
  ) {
    return true;
  }

  let nullBytes = 0;

  for (
    let index = 1;
    index < buffer.length;
    index += 2
  ) {
    if (buffer[index] === 0) {
      nullBytes += 1;
    }
  }

  return nullBytes > buffer.length / 8;
}

function createProcessDecoder() {
  let decoder = null;

  function cleanOutput(value) {
    return value
      .replace(/^\uFEFF/, "")
      .replace(/\u0000/g, "");
  }

  return {
    write(chunk) {
      if (!decoder) {
        decoder = new StringDecoder(
          isProbablyUtf16(chunk)
            ? "utf16le"
            : "utf8",
        );
      }

      return cleanOutput(
        decoder.write(chunk),
      );
    },

    end() {
      if (!decoder) {
        return "";
      }

      return cleanOutput(
        decoder.end(),
      );
    },
  };
}

function extractLatestProgress(value) {
  const matches = [
    ...value.matchAll(
      /(\d{1,3})%/g,
    ),
  ];

  if (matches.length === 0) {
    return null;
  }

  const progress = Number(
    matches[matches.length - 1][1],
  );

  if (
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 100
  ) {
    return null;
  }

  return progress;
}

function cleanProgressOutput(value) {
  return value
    .replace(/\x08/g, "")
    .replace(/\d{1,3}%/g, "")
    .replace(/\r/g, "\n")
    .trim();
}

function terminateWindowsProcess(pid) {
  return new Promise((resolve) => {
    const taskkill = spawn(
      "taskkill.exe",
      [
        "/PID",
        String(pid),
        "/T",
        "/F",
      ],
      {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      },
    );

    taskkill.once("error", () => {
      resolve(false);
    });

    taskkill.once(
      "close",
      (exitCode) => {
        resolve(exitCode === 0);
      },
    );
  });
}

export async function startWinfrRecovery(
  request,
  onUpdate = () => {},
) {
  if (activeRecovery) {
    throw new Error(
      "Já existe uma recuperação em andamento.",
    );
  }

  const engineStatus =
    await getRecoveryEngineStatus();

  if (
    !engineStatus.available ||
    !engineStatus.executablePath
  ) {
    throw new Error(
      engineStatus.reason ||
        "O Windows File Recovery não está disponível.",
    );
  }

  const command =
    buildWinfrCommand(request);

  const recoveryId = randomUUID();
  const startedAt = Date.now();

let recoveryFoldersBefore = [];

  try {
    recoveryFoldersBefore =
      await snapshotRecoveryFolders({
        destinationPath:
          command.destinationFolder,

        destinationDrive:
          command.destinationDrive,
      });
  } catch (error) {
    console.warn(
      "Não foi possível criar o snapshot das pastas de recuperação:",
      error,
    );
  }

  const childProcess = spawn(
    engineStatus.executablePath,
    command.args,
    {
      shell: false,
      windowsHide: true,
      stdio: [
        "pipe",
        "pipe",
        "pipe",
      ],
    },
  );

  const stdoutDecoder =
    createProcessDecoder();

  const stderrDecoder =
    createProcessDecoder();

  let progressBuffer = "";
  let lastProgress = 0;
  let finalized = false;
  let interactionBuffer = "";
  let duplicateResponseSent = false;

  const operation = {
    recoveryId,
    childProcess,
    command,
    startedAt,
    cancelRequested: false,

    recoveryFoldersBefore,
  };

  activeRecovery = operation;

  function emit(update) {
    onUpdate({
      recoveryId,
      elapsedMs:
        Date.now() - startedAt,
      ...update,
    });
  }
function handleInteractivePrompt(
  decodedOutput,
) {
  interactionBuffer = (
    interactionBuffer +
    decodedOutput
  )
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .slice(-4096);

  const isOverwritePrompt =
    /keep\s+\(b\)oth\s+always/i.test(
      interactionBuffer,
    );

  if (
    !isOverwritePrompt ||
    duplicateResponseSent
  ) {
    return;
  }

  if (!childProcess.stdin?.writable) {
    emit({
      type: "output",
      status: "running",
      stream: "stderr",
      message:
        "O WinFR solicitou uma confirmação, mas a entrada não está disponível.",
    });

    return;
  }

  const allowedResponses = [
    "a",
    "n",
    "b",
  ];

  const promptResponse =
    allowedResponses.includes(
      command.duplicatePromptResponse,
    )
      ? command.duplicatePromptResponse
      : "b";

  const responseMessages = {
    a:
      "Arquivos repetidos encontrados. Substituindo os arquivos existentes.",

    n:
      "Arquivos repetidos encontrados. Ignorando os arquivos duplicados.",

    b:
      "Arquivos repetidos encontrados. Mantendo todas as versões.",
  };

  duplicateResponseSent = true;
  interactionBuffer = "";

  childProcess.stdin.write(
    `${promptResponse}\r\n`,
    (inputError) => {
      if (inputError) {
        duplicateResponseSent = false;

        emit({
          type: "output",
          status: "running",
          stream: "stderr",
          message:
            `Não foi possível responder ao WinFR: ${inputError.message}`,
        });

        return;
      }

      emit({
        type: "interaction",
        status: "running",
        progress: lastProgress,
        message:
          responseMessages[
            promptResponse
          ],
      });
    },
  );
}

  function clearActiveRecovery() {
    if (
      activeRecovery?.recoveryId ===
      recoveryId
    ) {
      activeRecovery = null;
    }
  }

  childProcess.once("spawn", () => {
    emit({
      type: "started",
      status: "running",
      pid: childProcess.pid,
      progress: 0,
      message:
        "Windows File Recovery iniciado.",
      command:
        command.displayCommand,
    });
  });

  childProcess.stdout.on(
    "data",
    (chunk) => {
      const decodedOutput =
        stdoutDecoder.write(chunk);

        handleInteractivePrompt( decodedOutput);

      progressBuffer = (
        progressBuffer +
        decodedOutput
      ).slice(-128);

      const progress =
        extractLatestProgress(
          progressBuffer,
        );

      if (
        progress !== null &&
        progress !== lastProgress
      ) {
        lastProgress = progress;

        emit({
          type: "progress",
          status: "running",
          progress,
          message:
            `Recuperando arquivos... ${progress}%`,
        });
      }

      const readableOutput =
        cleanProgressOutput(
          decodedOutput,
        );

      if (readableOutput) {
        emit({
          type: "output",
          status: "running",
          stream: "stdout",
          message: readableOutput,
        });
      }
    },
  );

  childProcess.stderr.on(
    "data",
    (chunk) => {
      const decodedOutput =
        stderrDecoder.write(chunk);

      const message =
        cleanProgressOutput(
          decodedOutput,
        );

      if (message) {
        emit({
          type: "output",
          status: "running",
          stream: "stderr",
          message,
        });
      }
    },
  );

  childProcess.once(
    "error",
    (processError) => {
      if (finalized) {
        return;
      }

      finalized = true;
      clearActiveRecovery();

      emit({
        type: "failed",
        status: "failed",
        message:
          `Não foi possível executar o WinFR: ${processError.message}`,
      });
    },
  );

  childProcess.once(
    "close",
    async (exitCode, signal) => {
      if (finalized) {
        return;
      }

      finalized = true;

      const remainingStdout =
        cleanProgressOutput(
          stdoutDecoder.end(),
        );

      const remainingStderr =
        cleanProgressOutput(
          stderrDecoder.end(),
        );

      if (remainingStdout) {
        emit({
          type: "output",
          status: "running",
          stream: "stdout",
          message: remainingStdout,
        });
      }

      if (remainingStderr) {
        emit({
          type: "output",
          status: "running",
          stream: "stderr",
          message: remainingStderr,
        });
      }

      if (operation.cancelRequested) {
        clearActiveRecovery();

        emit({
          type: "cancelled",
          status: "cancelled",
          progress: lastProgress,
          exitCode,
          signal,
          message:
            "Recuperação cancelada.",
        });

        return;
      }

      if (exitCode !== 0) {
        clearActiveRecovery();

        emit({
          type: "failed",
          status: "failed",
          progress: lastProgress,
          exitCode,
          signal,
          message:
            `O WinFR foi encerrado com o código ${exitCode}.`,
        });

        return;
      }

   const engineFinishedAt =
  Date.now();

try {
  emit({
    type: "finalizing",
    status: "running",
    progress: 100,
    message:
      "Organizando os arquivos recuperados...",
  });

  /*
   * Agora começa a leitura e organização
   * dos arquivos recuperados pelo Node.
   */
  const recoveredResults =
    await collectRecoveredResults({
      destinationPath:
        command.destinationFolder,

      previousFolders:
        operation.recoveryFoldersBefore,

      startedAt:
        operation.startedAt,

      resultFilters: command.resultFilters,
    });

  /*
   * Neste momento a organização terminou.
   */
  const resultIndexFinishedAt =
    Date.now();

  clearActiveRecovery();

  emit({
    type: "completed",
    status: "completed",
    progress: 100,
    exitCode,
    signal,

    destinationFolder:
      command.destinationFolder,

    filesFound:
      recoveredResults.filesFound,

    results:
      recoveredResults.results,

    resultsTruncated:
      recoveredResults.resultsTruncated,

    recoveryFolders:
      recoveredResults.recoveryFolders,

      

    filesRecoveredByEngine: recoveredResults.filesRecoveredByEngine,
    filesFilteredOut: recoveredResults.filesFilteredOut,

    /*
     * INSIRA O timings AQUI,
     * dentro do evento completed.
     */
    timings: {
      engineMs:
        engineFinishedAt -
        operation.startedAt,

      resultIndexMs:
        resultIndexFinishedAt -
        engineFinishedAt,
    },

    message:
      `${recoveredResults.filesFound} arquivo(s) correspondente(s) aos filtros.`,
  });
} catch (resultError) {
  clearActiveRecovery();

  emit({
    type: "failed",
    status: "failed",
    progress: 100,
    exitCode,
    signal,

    message:
      resultError instanceof Error
        ? `A recuperação terminou, mas não foi possível processar os resultados: ${resultError.message}`
        : "A recuperação terminou, mas não foi possível processar os resultados.",
  });
}
    },
  );

  return {
    recoveryId,
    pid: childProcess.pid,
    status: "starting",
    progress: 0,
    sourceDrive:
      command.sourceDrive,
    destinationDrive:
      command.destinationDrive,
    destinationFolder:
      command.destinationFolder,
    mode: command.mode,
    filters: command.filters,
    command: command.displayCommand,
  };
}

export function getActiveWinfrRecovery() {
  if (!activeRecovery) {
    return null;
  }

  return {
    recoveryId:
      activeRecovery.recoveryId,
    pid:
      activeRecovery.childProcess.pid,
    status:
      activeRecovery.cancelRequested
        ? "cancelling"
        : "running",
    sourceDrive:
      activeRecovery.command
        .sourceDrive,
    destinationFolder:
      activeRecovery.command
        .destinationFolder,
    startedAt:
      activeRecovery.startedAt,
  };
}

export async function cancelWinfrRecovery(
  recoveryId = null,
) {
  if (!activeRecovery) {
    return {
      cancelled: false,
      message:
        "Não existe uma recuperação ativa.",
    };
  }

  const normalizedRecoveryId =
    typeof recoveryId === "string"
      ? recoveryId.trim()
      : null;

  if (
    normalizedRecoveryId &&
    normalizedRecoveryId !==
      activeRecovery.recoveryId
  ) {
    return {
      cancelled: false,
      informedRecoveryId:
        normalizedRecoveryId,
      activeRecoveryId:
        activeRecovery.recoveryId,
      message:
        "O ID informado pertence a outra recuperação.",
    };
  }

  const operation = activeRecovery;

  operation.cancelRequested = true;

  let cancelled = false;

  if (
    process.platform === "win32" &&
    operation.childProcess.pid
  ) {
    cancelled =
      await terminateWindowsProcess(
        operation.childProcess.pid,
      );
  } else {
    cancelled =
      operation.childProcess.kill(
        "SIGTERM",
      );

    if (cancelled) {
      operation.cancelRequested = true;
    }
  }

  return {
    cancelled,
    recoveryId:
      operation.recoveryId,
    pid:
      operation.childProcess.pid,
    status: cancelled
      ? "cancelling"
      : "running",
    message: cancelled
      ? "Cancelamento solicitado."
      : "Não foi possível cancelar.",
  };
}