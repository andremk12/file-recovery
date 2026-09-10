import {
  execFile,
} from "node:child_process";

import {
  promisify,
} from "node:util";

const execFileAsync =
  promisify(execFile);

const ADMINISTRATOR_CHECK_COMMAND = `
$currentIdentity =
  [Security.Principal.WindowsIdentity]::GetCurrent()

$currentPrincipal =
  New-Object Security.Principal.WindowsPrincipal(
    $currentIdentity
  )

$currentPrincipal.IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
`.trim();

export async function getAdministratorStatus() {
  if (process.platform !== "win32") {
    return {
      supported: false,
      checked: false,
      isAdministrator: null,
      reason:
        "A verificação administrativa está disponível somente no Windows.",
    };
  }

  try {
    const {
      stdout,
    } = await execFileAsync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        ADMINISTRATOR_CHECK_COMMAND,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 64 * 1024,
      },
    );

    const normalizedResult =
      stdout
        .trim()
        .toLowerCase();

    if (
      normalizedResult !== "true" &&
      normalizedResult !== "false"
    ) {
      throw new Error(
        "O PowerShell retornou um resultado inesperado.",
      );
    }

    return {
      supported: true,
      checked: true,

      isAdministrator:
        normalizedResult === "true",

      reason: null,
    };
  } catch (error) {
    console.error(
      "Não foi possível verificar os privilégios administrativos:",
      error,
    );

    return {
      supported: true,
      checked: false,
      isAdministrator: null,
      reason:
        "Não foi possível verificar os privilégios do aplicativo.",
    };
  }
}