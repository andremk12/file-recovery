import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Files,
  FolderOpen,
  HardDrive,
  History as HistoryIcon,
  Search,
  TimerReset,
  XCircle,
} from "lucide-react";

import "./History.css";

const RECOVERY_STATUS = {
  completed: {
    label: "Concluída",
    icon: CheckCircle2,
  },

  cancelled: {
    label: "Cancelada",
    icon: XCircle,
  },

  failed: {
    label: "Falhou",
    icon: AlertTriangle,
  },
};

const MOCK_RECOVERIES = [
  {
    id: "REC-20260910-001",
    title: "Documentos — RecoveryLab",
    status: "completed",
    createdAt: "10 set 2026, 18:42",
    source:
      "C:\\Users\\Andre\\Downloads\\RecoveryLab",
    destination:
      "D:\\Recuperações\\Recovery_20260910",
    mode: "Regular",
    fileGroup: "Documentos",
    filesFound: 14,
    duration: "6 min 32 s",
  },
  {
    id: "REC-20260909-002",
    title: "Imagens — pasta FOTOS",
    status: "completed",
    createdAt: "9 set 2026, 21:08",
    source:
      "C:\\Users\\Andre\\Downloads\\FOTOS",
    destination:
      "D:\\Recuperações\\Recovery_20260909",
    mode: "Regular",
    fileGroup: "Imagens",
    filesFound: 32,
    duration: "11 min 05 s",
  },
  {
    id: "REC-20260909-001",
    title: "Teste rápido — TXT",
    status: "cancelled",
    createdAt: "9 set 2026, 15:17",
    source:
      "C:\\RecoveryLab",
    destination:
      "D:\\Teste-Resultado",
    mode: "Regular",
    fileGroup: "Arquivos TXT",
    filesFound: 0,
    duration: "2 min 41 s",
  },
  {
    id: "REC-20260908-001",
    title: "Arquivos compactados",
    status: "failed",
    createdAt: "8 set 2026, 19:50",
    source: "E:\\Arquivos",
    destination: "D:\\Recuperações",
    mode: "Extensivo",
    fileGroup: "Arquivos compactados",
    filesFound: 0,
    duration: "48 s",
  },
];

function History() {
  return (
    <section className="page history-page">
      <header className="history-hero">
        <div className="history-hero-content">
          <span className="history-eyebrow">
            <HistoryIcon
              size={16}
              aria-hidden="true"
            />

            Atividade local
          </span>

          <h1>
            Histórico de recuperações
          </h1>

          <p>
            Acompanhe as operações realizadas,
            consulte os resultados e encontre
            rapidamente os arquivos recuperados.
          </p>
        </div>

        <div className="history-hero-highlight">
          <div className="history-hero-icon">
            <CheckCircle2
              size={24}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>Última recuperação</span>
            <strong>Concluída com sucesso</strong>
            <small>
              14 arquivos recuperados hoje
            </small>
          </div>
        </div>
      </header>

      <div className="history-summary-grid">
        <article className="history-summary-card">
          <div className="history-summary-icon">
            <HistoryIcon
              size={21}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>Recuperações</span>
            <strong>12</strong>
            <small>Operações registradas</small>
          </div>
        </article>

        <article className="history-summary-card is-success">
          <div className="history-summary-icon">
            <Files
              size={21}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>Arquivos recuperados</span>
            <strong>386</strong>
            <small>Em todas as operações</small>
          </div>
        </article>

        <article className="history-summary-card is-rate">
          <div className="history-summary-icon">
            <CheckCircle2
              size={21}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>Taxa de conclusão</span>
            <strong>83%</strong>
            <small>10 de 12 recuperações</small>
          </div>
        </article>

        <article className="history-summary-card is-time">
          <div className="history-summary-icon">
            <TimerReset
              size={21}
              aria-hidden="true"
            />
          </div>

          <div>
            <span>Tempo médio</span>
            <strong>18 min</strong>
            <small>Por recuperação</small>
          </div>
        </article>
      </div>

      <section className="history-panel">
        <header className="history-panel-header">
          <div>
            <span className="history-section-eyebrow">
              Registros
            </span>

            <h2>Recuperações recentes</h2>

            <p>
              Selecione uma operação para consultar
              mais informações.
            </p>
          </div>

          <span className="history-result-count">
            4 registros
          </span>
        </header>

        <div className="history-toolbar">
          <label className="history-search">
            <Search
              size={18}
              aria-hidden="true"
            />

            <input
              type="search"
              placeholder="Pesquisar por pasta ou identificação..."
              aria-label="Pesquisar no histórico"
            />
          </label>

          <select
            className="history-filter"
            defaultValue="all"
            aria-label="Filtrar pelo status"
          >
            <option value="all">
              Todos os status
            </option>

            <option value="completed">
              Concluídas
            </option>

            <option value="cancelled">
              Canceladas
            </option>

            <option value="failed">
              Com falha
            </option>
          </select>

          <button
            type="button"
            className="history-period-button"
          >
            <CalendarDays
              size={17}
              aria-hidden="true"
            />

            Últimos 30 dias
          </button>
        </div>

        <div className="history-list">
          {MOCK_RECOVERIES.map((recovery) => {
            const status =
              RECOVERY_STATUS[recovery.status];

            const StatusIcon = status.icon;

            return (
              <article
                className={`history-recovery-card is-${recovery.status}`}
                key={recovery.id}
              >
                <div className="history-recovery-heading">
                  <div className="history-status-icon">
                    <StatusIcon
                      size={22}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="history-recovery-title">
                    <div>
                      <strong>
                        {recovery.title}
                      </strong>

                      <span
                        className={`history-status-badge is-${recovery.status}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <small>
                      {recovery.createdAt}
                      {" · "}
                      {recovery.id}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="history-details-button"
                    aria-label={`Ver detalhes de ${recovery.title}`}
                  >
                    <ChevronRight
                      size={20}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="history-paths">
                  <div>
                    <HardDrive
                      size={16}
                      aria-hidden="true"
                    />

                    <span>
                      <small>Origem</small>
                      <strong
                        title={recovery.source}
                      >
                        {recovery.source}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <FolderOpen
                      size={16}
                      aria-hidden="true"
                    />

                    <span>
                      <small>Destino</small>
                      <strong
                        title={recovery.destination}
                      >
                        {recovery.destination}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="history-recovery-metrics">
                  <div>
                    <span>Modo</span>
                    <strong>{recovery.mode}</strong>
                  </div>

                  <div>
                    <span>Filtro</span>
                    <strong>
                      {recovery.fileGroup}
                    </strong>
                  </div>

                  <div>
                    <span>Arquivos</span>
                    <strong>
                      {recovery.filesFound}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <Clock3
                        size={13}
                        aria-hidden="true"
                      />

                      Duração
                    </span>

                    <strong>
                      {recovery.duration}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export default History;