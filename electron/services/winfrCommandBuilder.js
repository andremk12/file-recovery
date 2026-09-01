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

function normalizeDestinationPath(value) {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!/^[A-Z]:[\\/]/i.test(normalized)) {
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
    destinationPath
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

  const filters = normalizeFilters(
    request.filters,
  );

  const args = [
    sourceDrive,
    destinationDrive,
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
    destinationDrive,
    requestedDestinationPath:destinationPath,
    destinationFolder: `${destinationDrive}\\`,
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