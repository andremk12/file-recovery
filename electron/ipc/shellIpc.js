import {
  ipcMain,
  shell,
} from "electron";

import {
  stat,
} from "node:fs/promises";

import path from "node:path";

const OPEN_FOLDER_CHANNEL =
  "shell:open-folder";

function normalizeFolderPath(value) {
  const rawValue =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!rawValue) {
    throw new Error(
      "O caminho da pasta não foi informado.",
    );
  }

  const normalized =
    path.win32.normalize(rawValue);

  /*
   * Aceita somente caminhos locais
   * absolutos, como D:\\Recuperacao.
   * Isso bloqueia arquivos, URLs e UNC.
   */
  if (
    !path.win32.isAbsolute(normalized) ||
    !/^[A-Z]:\\/i.test(normalized) ||
    /[\0\r\n"]/.test(normalized)
  ) {
    throw new Error(
      "O caminho da pasta é inválido.",
    );
  }

  return normalized;
}

export function registerShellIpc() {
  ipcMain.handle(
    OPEN_FOLDER_CHANNEL,
    async (_event, folderPath) => {
      const normalizedPath =
        normalizeFolderPath(folderPath);

      let folderStats;

      try {
        folderStats =
          await stat(normalizedPath);
      } catch {
        throw new Error(
          "A pasta que seria aberta não existe ou não está acessível.",
        );
      }

      /*
       * Impede que este canal seja usado
       * para executar arquivos.
       */
      if (!folderStats.isDirectory()) {
        throw new Error(
          "O caminho informado não pertence a uma pasta.",
        );
      }

      const openError =
        await shell.openPath(
          normalizedPath,
        );

      if (openError) {
        throw new Error(
          `Não foi possível abrir a pasta: ${openError}`,
        );
      }

      return {
        opened: true,
        path: normalizedPath,
      };
    },
  );
}