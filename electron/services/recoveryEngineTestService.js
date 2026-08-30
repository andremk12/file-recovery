import { spawn } from "node:child_process";

import {
  getRecoveryEngineStatus,
} from "./recoveryEngineService.js";

const TEST_TIMEOUT_MS = 10_000;

function decodeProcessOutput(chunks) {
  if (chunks.length === 0) {
    return "";
  }

  const buffer = Buffer.concat(chunks);

  const hasUtf16Bom =
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xfe;

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

  const probablyUtf16 =
    hasUtf16Bom ||
    nullBytes > buffer.length / 8;

  return buffer
    .toString(
      probablyUtf16
        ? "utf16le"
        : "utf8",
    )
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .trim();
}

export async function testRecoveryEngine() {
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

  return new Promise((resolve, reject) => {
    const childProcess = spawn(
      engineStatus.executablePath,
      ["/?"],
      {
        shell: false,
        windowsHide: true,
        stdio: [
          "ignore",
          "pipe",
          "pipe",
        ],
      },
    );

    const stdoutChunks = [];
    const stderrChunks = [];

    let finished = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        timedOut = true;
        childProcess.kill();
      }
    }, TEST_TIMEOUT_MS);

    childProcess.stdout.on(
      "data",
      (chunk) => {
        stdoutChunks.push(
          Buffer.from(chunk),
        );
      },
    );

    childProcess.stderr.on(
      "data",
      (chunk) => {
        stderrChunks.push(
          Buffer.from(chunk),
        );
      },
    );

    childProcess.once(
      "error",
      (processError) => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeout);

        reject(
          new Error(
            `Não foi possível executar o WinFR: ${processError.message}`,
          ),
        );
      },
    );

    childProcess.once(
      "close",
      (exitCode, signal) => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeout);

        const stdout =
          decodeProcessOutput(
            stdoutChunks,
          );

        const stderr =
          decodeProcessOutput(
            stderrChunks,
          );

        const output = (
          stdout || stderr
        ).trim();

        resolve({
          success:
            !timedOut &&
            exitCode === 0 &&
            output.length > 0,

          executablePath:
            engineStatus.executablePath,

          arguments: ["/?"],

          exitCode,
          signal,
          timedOut,
          stdout,
          stderr,
          output,
        });
      },
    );
  });
}