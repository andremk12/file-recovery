import {
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  History,
  Info,
  ScanSearch,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import "./Home.css";

const QUICK_ACTIONS = [
  {
    title: "Nova recuperação",
    description:
      "Selecione uma origem e procure arquivos excluídos.",
    path: "/scan",
    icon: ScanSearch,
    tone: "primary",
  },
  {
    title: "Consultar histórico",
    description:
      "Acompanhe as recuperações realizadas anteriormente.",
    path: "/history",
    icon: History,
    tone: "secondary",
  },
  {
    title: "Configurações",
    description:
      "Personalize o funcionamento e as preferências do app.",
    path: "/settings",
    icon: Settings,
    tone: "neutral",
  },
];

const PLATFORM_LABELS = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux",
};

function formatUserName(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return "";
  }

  const accountName =
    value
      .split("\\")
      .at(-1)
      ?.trim() ?? "";

  const firstName =
    accountName
      .split(/[._\-\s]+/)
      .filter(Boolean)[0] ?? "";

  if (!firstName) {
    return "";
  }

  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1).toLowerCase()
  );
}

function getCurrentDateLabel() {
  const formattedDate =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
      },
    ).format(new Date());

  return (
    formattedDate.charAt(0).toUpperCase() +
    formattedDate.slice(1)
  );
}

function getErrorMessage(
  error,
  fallback,
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

function Home() {
  const navigate = useNavigate();

  const [appInfo, setAppInfo] =
    useState(null);

  const [
    recoveryEngineStatus,
    setRecoveryEngineStatus,
  ] = useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let disposed = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      const desktopAPI =
        window.desktopAPI;

      if (!desktopAPI) {
        setError(
          "A conexão com o Electron não está disponível.",
        );

        setIsLoading(false);
        return;
      }

      const [
        appInformationResult,
        engineStatusResult,
      ] = await Promise.allSettled([
        desktopAPI.getAppInfo(),
        desktopAPI
          .getRecoveryEngineStatus(),
      ]);

      if (disposed) {
        return;
      }

      const errors = [];

      if (
        appInformationResult.status ===
        "fulfilled"
      ) {
        setAppInfo(
          appInformationResult.value,
        );
      } else {
        errors.push(
          getErrorMessage(
            appInformationResult.reason,
            "Não foi possível consultar a aplicação.",
          ),
        );
      }

      if (
        engineStatusResult.status ===
        "fulfilled"
      ) {
        setRecoveryEngineStatus(
          engineStatusResult.value,
        );
      } else {
        errors.push(
          getErrorMessage(
            engineStatusResult.reason,
            "Não foi possível consultar o mecanismo de recuperação.",
          ),
        );
      }

      setError(errors.join(" "));
      setIsLoading(false);
    }

    void loadDashboard();

    return () => {
      disposed = true;
    };
  }, []);

  const displayName =
    formatUserName(
      appInfo?.userName,
    );

  const isEngineAvailable =
    recoveryEngineStatus?.available ===
    true;

  const environmentChecks = [
    {
      label:
        "Comunicação com o Electron",
      completed: Boolean(appInfo),
    },
    {
      label:
        "Windows File Recovery disponível",
      completed: isEngineAvailable,
    },
  ];

  const completedChecks =
    environmentChecks.filter(
      (item) => item.completed,
    ).length;

  const preparationPercentage =
    Math.round(
      (
        completedChecks /
        environmentChecks.length
      ) * 100,
    );

  const engineStatusLabel =
    isLoading
      ? "Verificando..."
      : isEngineAvailable
        ? "Pronto para recuperar"
        : "Atenção necessária";

  const engineStatusClass =
    isLoading
      ? "is-loading"
      : isEngineAvailable
        ? "is-ready"
        : "is-warning";

  return (
    <section className="page home-page">
      <header className="home-hero">
        <div className="home-hero-decoration" />

        <div className="home-hero-content">
          <span className="home-eyebrow">
            <Sparkles
              size={16}
              aria-hidden="true"
            />

            {getCurrentDateLabel()}
          </span>

          <h1>
            {displayName
              ? `Olá, ${displayName}!`
              : "Olá! Bom te ver por aqui."}
          </h1>

          <p>
            Seus arquivos podem ter uma
            segunda chance. Prepare uma
            recuperação segura em poucos
            passos.
          </p>

          <button
            type="button"
            className="home-primary-action"
            onClick={() =>
              navigate("/scan")
            }
          >
            <ScanSearch
              size={19}
              aria-hidden="true"
            />

            Iniciar nova recuperação

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          className={`home-engine-status ${engineStatusClass}`}
          aria-live="polite"
        >
          <div className="home-engine-icon">
            <ShieldCheck
              size={27}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>
              Mecanismo de recuperação
            </span>

            <strong>
              {engineStatusLabel}
            </strong>

            <small>
              {isLoading
                ? "Consultando o sistema..."
                : isEngineAvailable
                  ? "O WinFR está instalado e acessível."
                  : recoveryEngineStatus
                      ?.reason ||
                    "O WinFR precisa ser verificado."}
            </small>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="home-error"
          role="alert"
        >
          <AlertTriangle
            size={20}
            aria-hidden="true"
          />

          <span>{error}</span>
        </div>
      )}

      <div className="home-content-grid">
        <div className="home-main-column">
          <section
            className="home-section"
            aria-labelledby="highlights-title"
          >
            <div className="home-section-heading">
              <div>
                <span className="home-section-eyebrow">
                  Destaques
                </span>

                <h2 id="highlights-title">
                  Antes de começar
                </h2>
              </div>
            </div>

            <div className="home-highlights">
              <article className="home-highlight is-warning">
                <div className="home-highlight-icon">
                  <AlertTriangle
                    size={22}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Use outro disco como
                    destino
                  </strong>

                  <p>
                    Salvar no mesmo disco
                    analisado pode
                    sobrescrever arquivos
                    que ainda poderiam ser
                    recuperados.
                  </p>
                </div>
              </article>

              <article className="home-highlight is-tip">
                <div className="home-highlight-icon">
                  <ShieldCheck
                    size={22}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Quanto antes, melhor
                  </strong>

                  <p>
                    Evite criar, instalar ou
                    baixar arquivos no disco
                    de origem antes da
                    recuperação.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section
            className="home-section"
            aria-labelledby="quick-actions-title"
          >
            <div className="home-section-heading">
              <div>
                <span className="home-section-eyebrow">
                  Acesso rápido
                </span>

                <h2 id="quick-actions-title">
                  O que deseja fazer?
                </h2>
              </div>
            </div>

            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map(
                (action) => {
                  const Icon =
                    action.icon;

                  return (
                    <button
                      key={action.path}
                      type="button"
                      className={`quick-action-card is-${action.tone}`}
                      onClick={() =>
                        navigate(
                          action.path,
                        )
                      }
                    >
                      <span className="quick-action-icon">
                        <Icon
                          size={23}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="quick-action-content">
                        <strong>
                          {action.title}
                        </strong>

                        <small>
                          {
                            action.description
                          }
                        </small>
                      </span>

                      <ArrowRight
                        className="quick-action-arrow"
                        size={19}
                        aria-hidden="true"
                      />
                    </button>
                  );
                },
              )}
            </div>
          </section>
        </div>

        <aside className="home-side-column">
          <article className="readiness-card">
            <div className="readiness-header">
              <div>
                <span className="home-section-eyebrow">
                  Preparação
                </span>

                <h2>
                  Ambiente de recuperação
                </h2>
              </div>

              <strong>
                {preparationPercentage}%
              </strong>
            </div>

            <div
              className="readiness-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={
                preparationPercentage
              }
            >
              <span
                style={{
                  width:
                    `${preparationPercentage}%`,
                }}
              />
            </div>

            <div className="readiness-checks">
              {environmentChecks.map(
                (item) => (
                  <div
                    key={item.label}
                    className={
                      item.completed
                        ? "is-completed"
                        : ""
                    }
                  >
                    {item.completed ? (
                      <CheckCircle2
                        size={18}
                        aria-hidden="true"
                      />
                    ) : (
                      <Info
                        size={18}
                        aria-hidden="true"
                      />
                    )}

                    <span>
                      {item.label}
                    </span>
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              className="readiness-action"
              onClick={() =>
                navigate("/settings")
              }
            >
              Revisar configurações

              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </button>
          </article>

          <article className="system-card">
            <div className="system-card-heading">
              <Info
                size={20}
                aria-hidden="true"
              />

              <h2>
                Informações do sistema
              </h2>
            </div>

            <dl>
              <div>
                <dt>Aplicativo</dt>
                <dd>
                  {isLoading
                    ? "..."
                    : `v${appInfo?.version || "-"}`}
                </dd>
              </div>

              <div>
                <dt>Sistema</dt>
                <dd>
                  {PLATFORM_LABELS[
                    appInfo?.platform
                  ] ||
                    appInfo?.platform ||
                    "-"}
                </dd>
              </div>

              <div>
                <dt>Electron</dt>
                <dd>
                  {appInfo
                    ?.electronVersion ||
                    "-"}
                </dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default Home;