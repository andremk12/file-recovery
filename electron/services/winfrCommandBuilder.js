import path from "node:path"

const ALLOWED_MODES = new Set([
  "regular",
  "extensive",
]);

const DUPLICATE_POLICY_OPTIONS =
  Object.freeze({
    keepBoth: "b",
    skip: "n",
    overwrite: "a",
  });

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

export function normalizeSourceFolder(
  value,
  sourceDrive,
) {
  const normalizedDrive = normalizeDrive(sourceDrive, "O disco de origem");

  if (value != null && typeof value !== "string") {
    throw new Error("A pasta de origem é inválida.");
  }

  const rawValue =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!rawValue) {
    return null;
  }

  const windowsPath = rawValue.replace(/\//g, "\\");

  // Não reinterpretar UNC/dispositivos, C:pasta ou travessias como pastas locais.
  if (
    windowsPath.startsWith("\\\\") ||
    /^[A-Z]:(?!\\)/i.test(windowsPath) ||
    /(^|\\)\.\.(\\|$)/.test(windowsPath) ||
    /[\0\r\n"*?<>|]/.test(windowsPath)
  ) {
    throw new Error("A pasta de origem é inválida. Selecione uma pasta local na unidade de origem.");
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

    if (folderDrive !== normalizedDrive) {
      throw new Error(
        "A pasta de origem não pertence ao disco selecionado.",
      );
    }

    relativePath =
      path.win32.relative(
        `${normalizedDrive}\\`,
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
    throw new Error("Selecione uma pasta de origem abaixo da raiz. A recuperação no disco inteiro não está habilitada.");
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

function normalizeDuplicatePolicy(
  value,
) {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  /*
   * Mantém compatibilidade com requests
   * antigos que ainda não enviam essa
   * configuração.
   */
  if (!normalized) {
    return "keepBoth";
  }

  const isAllowed =
    Object.prototype.hasOwnProperty.call(
      DUPLICATE_POLICY_OPTIONS,
      normalized,
    );

  if (!isAllowed) {
    throw new Error(
      "A política de arquivos duplicados é inválida.",
    );
  }

  return normalized;
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
      !/^\*\.[a-z\d]+(?:\.[a-z\d]+)*$/i.test(normalized)
    ) {
      throw new Error(
        `O filtro ${index + 1} é inválido. Use somente extensões como *.txt, sem caminhos.`,
      );
    }

    return normalized;
  });
}

function quoteForDisplay(value) {
  // Escape a barra final antes das aspas segundo a linha de comando do Windows.
  // As aspas existem somente no preview; spawn recebe os valores originais.
  return /\s/.test(value)
    ? `"${value.replace(/(\\+)$/g, "$1$1")}"`
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

const duplicatePolicy =
  normalizeDuplicatePolicy(
    request.duplicatePolicy,
  );

const duplicatePromptResponse =
  DUPLICATE_POLICY_OPTIONS[
    duplicatePolicy
  ];


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

if (!sourceFolder) {
  throw new Error(
    "Selecione uma pasta de origem. " +
      "A recuperação no disco inteiro não está habilitada.",
  );
}

// Cada /n é uma alternativa completa: pasta e extensão devem estar juntas.
// Sem extensão, a Microsoft documenta a pasta com barra final (sem *.*).
const engineFilters = extensionFilters.length > 0
  ? extensionFilters.map((filter) => `${sourceFolder}${filter}`)
  : [sourceFolder];

const args = [
  sourceDrive,
  destinationPath,
  `/${mode}`,
  "/a",
];

if (mode === "regular") {
  args.push(
    `/o:${duplicatePromptResponse}`,
  );
}

for (const filter of engineFilters) {
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
  filters: engineFilters,
  resultFilters: extensionFilters,
  duplicatePolicy,
  duplicatePromptResponse,

  displayCommand: [
    "winfr.exe",
    ...args,
  ]
    .map(quoteForDisplay)
    .join(" "),
};
}
