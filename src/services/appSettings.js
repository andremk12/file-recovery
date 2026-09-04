const SETTINGS_STORAGE_KEY =
  "file-recovery:settings";

export const DEFAULT_APP_SETTINGS =
  Object.freeze({
    defaultRecoveryMode: "automatic",
    defaultFileGroup: "documents",
    duplicatePolicy: "keepBoth",

    confirmBeforeRecovery: true,
    openDestinationAfterRecovery: true,
    notifyWhenFinished: true,

    showTechnicalDetails: false,
    reduceAnimations: false,
  });

const ALLOWED_RECOVERY_MODES =
  new Set([
    "automatic",
    "regular",
    "extensive",
  ]);

const ALLOWED_FILE_GROUPS =
  new Set([
    "all",
    "documents",
    "images",
    "videos",
    "archives",
    "quickTest",
  ]);

const ALLOWED_DUPLICATE_POLICIES =
  new Set([
    "keepBoth",
    "skip",
    "overwrite",
  ]);

function normalizeBoolean(
  value,
  fallback,
) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function normalizeAppSettings(value) {
  const settings =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    defaultRecoveryMode:
      ALLOWED_RECOVERY_MODES.has(
        settings.defaultRecoveryMode,
      )
        ? settings.defaultRecoveryMode
        : DEFAULT_APP_SETTINGS
            .defaultRecoveryMode,

    defaultFileGroup:
      ALLOWED_FILE_GROUPS.has(
        settings.defaultFileGroup,
      )
        ? settings.defaultFileGroup
        : DEFAULT_APP_SETTINGS
            .defaultFileGroup,

    duplicatePolicy:
      ALLOWED_DUPLICATE_POLICIES.has(
        settings.duplicatePolicy,
      )
        ? settings.duplicatePolicy
        : DEFAULT_APP_SETTINGS
            .duplicatePolicy,

    confirmBeforeRecovery:
      normalizeBoolean(
        settings.confirmBeforeRecovery,
        DEFAULT_APP_SETTINGS
          .confirmBeforeRecovery,
      ),

    openDestinationAfterRecovery:
      normalizeBoolean(
        settings
          .openDestinationAfterRecovery,
        DEFAULT_APP_SETTINGS
          .openDestinationAfterRecovery,
      ),

    notifyWhenFinished:
      normalizeBoolean(
        settings.notifyWhenFinished,
        DEFAULT_APP_SETTINGS
          .notifyWhenFinished,
      ),

    showTechnicalDetails:
      normalizeBoolean(
        settings.showTechnicalDetails,
        DEFAULT_APP_SETTINGS
          .showTechnicalDetails,
      ),

    reduceAnimations:
      normalizeBoolean(
        settings.reduceAnimations,
        DEFAULT_APP_SETTINGS
          .reduceAnimations,
      ),
  };
}

export function loadAppSettings() {
  try {
    const storedValue =
      window.localStorage.getItem(
        SETTINGS_STORAGE_KEY,
      );

    if (!storedValue) {
      return {
        ...DEFAULT_APP_SETTINGS,
      };
    }

    return normalizeAppSettings(
      JSON.parse(storedValue),
    );
  } catch {
    return {
      ...DEFAULT_APP_SETTINGS,
    };
  }
}

export function saveAppSettings(
  settings,
) {
  const normalizedSettings =
    normalizeAppSettings(settings);

  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(
      normalizedSettings,
    ),
  );

  window.dispatchEvent(
    new CustomEvent(
      "file-recovery:settings-changed",
      {
        detail: normalizedSettings,
      },
    ),
  );

  return normalizedSettings;
}

export function applyRendererSettings(
  settings,
) {
  if (
    typeof document === "undefined"
  ) {
    return;
  }

  document.documentElement.dataset
    .reduceMotion =
    settings.reduceAnimations
      ? "true"
      : "false";
}