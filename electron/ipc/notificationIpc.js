import {
  ipcMain,
  Notification,
} from "electron";

const NOTIFY_RECOVERY_CHANNEL =
  "recovery:notify-finished";

const ALLOWED_STATUSES =
  new Set([
    "completed",
    "failed",
    "cancelled",
  ]);

function normalizeNotificationData(
  value,
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Os dados da notificação são inválidos.",
    );
  }

  const status =
    typeof value.status === "string"
      ? value.status.trim()
      : "";

  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(
      "O estado da recuperação é inválido.",
    );
  }

  const filesFound =
    Number.isFinite(value.filesFound)
      ? Math.max(
          0,
          Math.trunc(value.filesFound),
        )
      : 0;

  return {
    status,
    filesFound,
  };
}

function getNotificationContent({
  status,
  filesFound,
}) {
  if (status === "completed") {
    return {
      title:
        "Recuperação concluída",
      body:
        filesFound === 1
          ? "1 arquivo correspondente foi encontrado."
          : `${filesFound} arquivos correspondentes foram encontrados.`,
    };
  }

  if (status === "cancelled") {
    return {
      title:
        "Recuperação cancelada",
      body:
        "A operação foi cancelada pelo usuário.",
    };
  }

  return {
    title:
      "Falha na recuperação",
    body:
      "A recuperação terminou com erro. Abra o aplicativo para consultar os detalhes.",
  };
}

export function registerNotificationIpc() {
  ipcMain.handle(
    NOTIFY_RECOVERY_CHANNEL,
    async (_event, notificationData) => {
      if (!Notification.isSupported()) {
        return {
          shown: false,
          reason: "not-supported",
        };
      }

      const normalizedData =
        normalizeNotificationData(
          notificationData,
        );

      const content =
        getNotificationContent(
          normalizedData,
        );

      const notification =
        new Notification({
          title: content.title,
          body: content.body,
          silent: false,
        });

      notification.show();

      return {
        shown: true,
        status:
          normalizedData.status,
      };
    },
  );
}