import path from "node:path"

const ALLOWED_MODES = new Set([
  "regular",
  "extensive",
]);

function normalizeDrive(value, label) {
  const normalized =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "";

  if (!/^[A-Z]:$/.test(normalized)) {
    throw new Error(`${label} é inválido.`);
  }

  return normalized;
}

function normalizeSourceFolder(
  value,
  sourceDrive,
) {
  const rawValue =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!rawValue) {
    return null;
  }

  let relativePath;

  // Caminho absoluto selecionado pelo diálogo.
  if (/^[A-Z]:[\\/]/i.test(rawValue)) {
    const absolutePath =
      path.win32.normalize(rawValue);

    const folderDrive =
      path.win32
        .parse(absolutePath)
        .root
        .slice(0, 2)
        .toUpperCase();

    if (folderDrive !== sourceDrive) {
      throw new Error(
        "A pasta de origem não pertence ao disco selecionado.",
      );
    }

    relativePath =
      path.win32.relative(
        `${sourceDrive}\\`,
        absolutePath,
      );
  } else {
    // Também aceita \RecoveryTest\ digitado.
    relativePath =
      rawValue
        .replace(/\//g, "\\")
        .replace(/^\\+/, "");
  }

  const normalized =
    path.win32
      .normalize(relativePath)
      .replace(/^\\+|\\+$/g, "");

  if (!normalized || normalized === ".") {
    return null;
  }

  if (
    normalized === ".." ||
    normalized.startsWith("..\\") ||
    path.win32.isAbsolute(normalized) ||
    /[\0\r\n"*?<>|:]/.test(normalized)
  ) {
    throw new Error(
      "A pasta de origem é inválida.",
    );
  }

  return `\\${normalized}\\`;
}

function normalizeDestinationPath(value) {
  const rawValue =
    typeof value === "string"
      ? value.trim()
      : "";

  const normalized =
    path.win32.normalize(rawValue);

  if (
    !path.win32.isAbsolute(normalized) ||
    !/^[A-Z]:\\/i.test(normalized)
  ) {
    throw new Error(
      "A pasta de destino é inválida.",
    );
  }

  return normalized;
}

function normalizeFilters(filters) {
  if (filters === undefined) {
    return [];
  }

  if (!Array.isArray(filters)) {
    throw new Error(
      "Os filtros da recuperação são inválidos.",
    );
  }

  if (filters.length > 20) {
    throw new Error(
      "O limite é de 20 filtros por recuperação.",
    );
  }

  return filters.map((filter, index) => {
    const normalized =
      typeof filter === "string"
        ? filter.trim()
        : "";

    if (!normalized) {
      throw new Error(
        `O filtro ${index + 1} está vazio.`,
      );
    }

    if (
      normalized.length > 260 ||
      /[\0\r\n"]/.test(normalized)
    ) {
      throw new Error(
        `O filtro ${index + 1} é inválido.`,
      );
    }

    return normalized;
  });
}

function quoteForDisplay(value) {
  return /\s/.test(value)
    ? `"${value}"`
    : value;
}

export function buildWinfrCommand(request) {
  if (!request || typeof request !== "object") {
    throw new Error(
      "Os dados da recuperação são inválidos.",
    );
  }

  const sourceDrive = normalizeDrive(
    request.sourceDrive,
    "O disco de origem",
  );

  const destinationPath =
    normalizeDestinationPath(
      request.destinationPath,
    );

  const destinationDrive =
  path.win32
    .parse(destinationPath)
    .root
    .slice(0, 2)
    .toUpperCase();

const mode =
  typeof request.mode === "string"
    ? request.mode.trim().toLowerCase()
    : "regular";

if (!ALLOWED_MODES.has(mode)) {
  throw new Error(
    "O modo de recuperação é inválido.",
  );
}

if (sourceDrive === destinationDrive) {
  throw new Error(
    "A origem e o destino não podem estar no mesmo volume.",
  );
}

/*
 * Estes são somente os filtros de arquivo,
 * como *.txt, *.pdf e *.docx.
 */
const extensionFilters =
  normalizeFilters(request.filters);

/*
 * Transforma, por exemplo:
 *
 * C:\RecoveryTest
 *
 * em:
 *
 * \RecoveryTest\
 */
const sourceFolder =
  normalizeSourceFolder(
    request.sourceFolder,
    sourceDrive,
  );

/*
 * Combina pasta e extensão.
 *
 * Exemplo:
 * \RecoveryTest\*.txt
 */
const filters = sourceFolder
  ? extensionFilters.length > 0
    ? extensionFilters.map(
        (filter) =>
          `${sourceFolder}${filter}`,
      )
    : [sourceFolder]
  : extensionFilters;

/*
 * Aqui deve ser destinationPath, e não
 * destinationDrive.
 *
 * O spawn recebe cada item do array como
 * um argumento separado, portanto não coloque
 * aspas manualmente.
 */
const args = [
  sourceDrive,
  destinationPath,
  `/${mode}`,
  "/a",
];

for (const filter of filters) {
  args.push("/n", filter);
}

return {
  command: "winfr.exe",
  args,

  sourceDrive,
  sourceFolder,

  destinationDrive,
  destinationFolder:
    destinationPath,

  requestedDestinationPath:
    destinationPath,

  mode,
  filters,

  displayCommand: [
    "winfr.exe",
    ...args,
  ]
    .map(quoteForDisplay)
    .join(" "),
};
}