import {
  readdir,
  stat,
} from "node:fs/promises";
import path from "node:path";

const RECOVERY_FOLDER_PATTERN =
  /^Recovery_/i;

const MAX_VISIBLE_RESULTS = 2000;

const FILE_STAT_CONCURRENCY = 24;

function createResultFilterSuffixes(
  filters = [],
) {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters
    .filter(
      (filter) =>
        typeof filter === "string" &&
        filter.startsWith("*."),
    )
    .map(
      (filter) =>
        filter
          .slice(1)
          .toLowerCase(),
    );
}

function matchesResultFilters(
  fileName,
  filterSuffixes,
) {
  if (filterSuffixes.length === 0) {
    return true;
  }

  const normalizedName =
    fileName.toLowerCase();

  return filterSuffixes.some(
    (suffix) =>
      normalizedName.endsWith(suffix),
  );
}

async function mapWithConcurrency(
  items,
  concurrency,
  worker,
) {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;

  const workerCount =
    Math.min(
      concurrency,
      items.length,
    );

  const workers =
    Array.from(
      { length: workerCount },
      async () => {
        while (nextIndex < items.length) {
          const currentIndex =
            nextIndex;

          nextIndex += 1;

          await worker(
            items[currentIndex],
          );
        }
      },
    );

  await Promise.all(workers);
}

function getCandidateRoots(destinationPath) {
  if (!destinationPath) {
    return [];
  }

  return [
    path.win32.normalize(destinationPath),
  ];
}

async function getRecoveryFolders({
  destinationPath,
  destinationDrive,
}) {
  const roots = getCandidateRoots(destinationPath);

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
  resultFilterSuffixes
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

  const directories = [];
  const visibleFiles = [];

  for (const entry of entries) {
    const fullPath =
      path.join(
        directoryPath,
        entry.name,
      );

    if (entry.isDirectory()) {
      directories.push(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }


    accumulator.filesRecoveredByEngine += 1;

    if (
      !matchesResultFilters(
        entry.name,
        resultFilterSuffixes,
      )
    ) {
      continue;
    }

    accumulator.totalFiles += 1;

    if (
      accumulator.results.length +
        visibleFiles.length <
      MAX_VISIBLE_RESULTS
    ) {
      visibleFiles.push(fullPath);
    }
  }

  await mapWithConcurrency(
    visibleFiles,
    FILE_STAT_CONCURRENCY,
    async (fullPath) => {
      try {
        const fileStats =
          await stat(fullPath);

        accumulator.results.push({
          id:
            `${fullPath}:` +
            `${fileStats.size}:` +
            `${fileStats.mtimeMs}`,

  
          name:
            path.basename(fullPath),

          recoveredPath:
            fullPath,

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
        // O arquivo pode ter sido movido
        // durante o processamento.
      }
    },
  );

  /*
   * Mantemos a recursão de diretórios
   * sequencial para não gerar milhares de
   * leituras simultâneas.
   */
  for (const childDirectory of directories) {
    await walkRecoveryFolder(
      childDirectory,
      recoveryRoot,
      accumulator,
      resultFilterSuffixes
    );
  }
}

export async function collectRecoveredResults({
  destinationPath,
  destinationDrive,
  previousFolders = [],
  resultFilters = []
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

  const currentRecoveryFolders =
    folders.filter(
      (folder) =>
        !previousFolderSet.has(
          folder.path.toLowerCase(),
        ),
    );

  // O WinFR cria uma pasta Recovery_* por operação. Uma pasta do snapshot
  // não comprova resultados desta execução, mesmo se foi alterada há segundos.
  // Não misturar recuperações anteriores quando nenhuma pasta nova aparecer.

  const resultFilterSuffixes = createResultFilterSuffixes(resultFilters);

  const accumulator = {
    totalFiles: 0,
    filesRecoveredByEngine: 0,
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
      resultFilterSuffixes
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

    filesRecoveredByEngine: 
      accumulator.filesRecoveredByEngine,
    
    fileFilteredOut: 
      accumulator.filesRecoveredByEngine - accumulator.totalFiles,


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
