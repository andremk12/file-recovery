import {
  readdir,
  stat,
} from "node:fs/promises";
import path from "node:path";

const RECOVERY_FOLDER_PATTERN =
  /^Recovery_/i;

const MAX_VISIBLE_RESULTS = 2000;

function getCandidateRoots(
  destinationPath,
  destinationDrive,
) {
  const candidates = [
    destinationPath,
    `${destinationDrive}\\`,
  ].filter(Boolean);

  const uniqueRoots = new Map();

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);

    uniqueRoots.set(
      resolved.toLowerCase(),
      resolved,
    );
  }

  return [...uniqueRoots.values()];
}

async function getRecoveryFolders({
  destinationPath,
  destinationDrive,
}) {
  const roots = getCandidateRoots(
    destinationPath,
    destinationDrive,
  );

  const folders = [];

  for (const root of roots) {
    let entries;

    try {
      entries = await readdir(root, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        !RECOVERY_FOLDER_PATTERN.test(
          entry.name,
        )
      ) {
        continue;
      }

      const folderPath =
        path.join(root, entry.name);

      try {
        const folderStats =
          await stat(folderPath);

        folders.push({
          path: folderPath,
          createdAt:
            folderStats.birthtimeMs,
          modifiedAt:
            folderStats.mtimeMs,
        });
      } catch {
        // Ignora pastas que desapareceram
        // ou não puderam ser consultadas.
      }
    }
  }

  const uniqueFolders = new Map();

  for (const folder of folders) {
    uniqueFolders.set(
      folder.path.toLowerCase(),
      folder,
    );
  }

  return [...uniqueFolders.values()];
}

export async function snapshotRecoveryFolders(
  options,
) {
  const folders =
    await getRecoveryFolders(options);

  return folders.map(
    (folder) => folder.path,
  );
}

async function walkRecoveryFolder(
  directoryPath,
  recoveryRoot,
  accumulator,
) {
  let entries;

  try {
    entries = await readdir(
      directoryPath,
      {
        withFileTypes: true,
      },
    );
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath =
      path.join(
        directoryPath,
        entry.name,
      );

    if (entry.isDirectory()) {
      await walkRecoveryFolder(
        fullPath,
        recoveryRoot,
        accumulator,
      );

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    accumulator.totalFiles += 1;

    if (
      accumulator.results.length >=
      MAX_VISIBLE_RESULTS
    ) {
      continue;
    }

    try {
      const fileStats =
        await stat(fullPath);

      accumulator.results.push({
        id: `${fullPath}:${fileStats.size}:${fileStats.mtimeMs}`,

        name: entry.name,

        recoveredPath: fullPath,

        relativePath:
          path.relative(
            recoveryRoot,
            fullPath,
          ),

        sizeBytes:
          fileStats.size,

        recoverability:
          "recovered",
      });
    } catch {
      // Arquivo pode ter sido alterado
      // durante a leitura.
    }
  }
}

export async function collectRecoveredResults({
  destinationPath,
  destinationDrive,
  previousFolders = [],
  startedAt = 0,
}) {
  const folders =
    await getRecoveryFolders({
      destinationPath,
      destinationDrive,
    });

  const previousFolderSet =
    new Set(
      previousFolders.map(
        (folderPath) =>
          folderPath.toLowerCase(),
      ),
    );

  let currentRecoveryFolders =
    folders.filter(
      (folder) =>
        !previousFolderSet.has(
          folder.path.toLowerCase(),
        ),
    );

  // Fallback caso o WinFR reutilize ou
  // atualize uma pasta já existente.
  if (
    currentRecoveryFolders.length === 0 &&
    startedAt
  ) {
    currentRecoveryFolders =
      folders.filter((folder) => {
        const latestTimestamp =
          Math.max(
            folder.createdAt,
            folder.modifiedAt,
          );

        return (
          latestTimestamp >=
          startedAt - 60_000
        );
      });
  }

  const accumulator = {
    totalFiles: 0,
    results: [],
  };

  for (
    const folder of
    currentRecoveryFolders
  ) {
    await walkRecoveryFolder(
      folder.path,
      folder.path,
      accumulator,
    );
  }

  accumulator.results.sort(
    (firstFile, secondFile) =>
      firstFile.name.localeCompare(
        secondFile.name,
        "pt-BR",
      ),
  );

  return {
    filesFound:
      accumulator.totalFiles,

    results:
      accumulator.results,

    resultsTruncated:
      accumulator.totalFiles >
      accumulator.results.length,

    recoveryFolders:
      currentRecoveryFolders.map(
        (folder) => folder.path,
      ),
  };
}