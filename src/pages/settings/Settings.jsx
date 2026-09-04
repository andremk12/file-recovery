import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileSearch,
  Gauge,
  Info,
  MonitorCog,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import {
  applyRendererSettings,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
} from "../../services/appSettings"

import "./Settings.css";

function ToggleSetting({
  checked,
  description,
  label,
  onChange,
}) {
  return (
    <label className="setting-toggle-row">
      <span className="setting-toggle-text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
      />

      <span
        className="setting-switch"
        aria-hidden="true"
      >
        <span />
      </span>
    </label>
  );
}

function Settings() {
  const [savedSettings, setSavedSettings] =
    useState(() =>
      loadAppSettings(),
    );

  const [settings, setSettings] =
    useState(() =>
      loadAppSettings(),
    );

  const [feedback, setFeedback] =
    useState("");

  const [
    engineTestStatus,
    setEngineTestStatus,
  ] = useState("idle");

  const [
    engineTestMessage,
    setEngineTestMessage,
  ] = useState(
    "Execute um teste rápido para confirmar que o WinFR está acessível.",
  );

  const hasUnsavedChanges =
    useMemo(
      () =>
        JSON.stringify(settings) !==
        JSON.stringify(savedSettings),
      [settings, savedSettings],
    );

  function updateSetting(
    settingName,
    value,
  ) {
    setSettings(
      (currentSettings) => ({
        ...currentSettings,
        [settingName]: value,
      }),
    );

    setFeedback("");
  }

  function handleSaveSettings() {
    const saved =
      saveAppSettings(settings);

    applyRendererSettings(saved);

    setSettings(saved);
    setSavedSettings(saved);

    setFeedback(
      "Configurações salvas com sucesso.",
    );
  }

  function handleRestoreDefaults() {
    setSettings({
      ...DEFAULT_APP_SETTINGS,
    });

    setFeedback(
      "Valores padrão carregados. Clique em salvar para confirmar.",
    );
  }

  async function handleTestEngine() {
    if (
      !window.desktopAPI
        ?.testRecoveryEngine
    ) {
      setEngineTestStatus("error");

      setEngineTestMessage(
        "O teste do mecanismo não está disponível.",
      );

      return;
    }

    setEngineTestStatus("testing");

    setEngineTestMessage(
      "Testando o Windows File Recovery...",
    );

    try {
      await window.desktopAPI
        .testRecoveryEngine();

      setEngineTestStatus("success");

      setEngineTestMessage(
        "O Windows File Recovery respondeu corretamente.",
      );
    } catch (testError) {
      setEngineTestStatus("error");

      setEngineTestMessage(
        testError instanceof Error
          ? testError.message
          : "Não foi possível testar o mecanismo.",
      );
    }
  }

  return (
    <section className="page settings-page">
      <header className="settings-hero">
        <div>
          <span className="settings-eyebrow">
            <Settings2
              size={16}
              aria-hidden="true"
            />

            Preferências
          </span>

          <h1>
            Configurações do aplicativo
          </h1>

          <p>
            Personalize o comportamento
            das recuperações e a
            experiência de uso do sistema.
          </p>
        </div>

        <div
          className={`settings-save-status ${
            hasUnsavedChanges
              ? "has-changes"
              : "is-saved"
          }`}
        >
          {hasUnsavedChanges ? (
            <AlertTriangle
              size={18}
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />
          )}

          <span>
            {hasUnsavedChanges
              ? "Alterações não salvas"
              : "Configurações salvas"}
          </span>
        </div>
      </header>

      <div className="settings-layout">
        <div className="settings-main-column">
          <article className="settings-card">
            <header className="settings-card-header">
              <div className="settings-card-icon">
                <FileSearch
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2>
                  Preferências de recuperação
                </h2>

                <p>
                  Defina os valores que
                  serão sugeridos ao criar
                  uma nova recuperação.
                </p>
              </div>
            </header>

            <div className="settings-fields-grid">
              <label className="settings-field">
                <span>
                  Modo de recuperação
                </span>

                <select
                  value={
                    settings
                      .defaultRecoveryMode
                  }
                  onChange={(event) =>
                    updateSetting(
                      "defaultRecoveryMode",
                      event.target.value,
                    )
                  }
                >
                  <option value="automatic">
                    Automático — recomendado
                  </option>

                  <option value="regular">
                    Regular
                  </option>

                  <option value="extensive">
                    Extensivo
                  </option>
                </select>

                <small>
                  O modo automático escolhe
                  a opção apropriada para o
                  sistema de arquivos.
                </small>
              </label>

              <label className="settings-field">
                <span>
                  Tipo de arquivo padrão
                </span>

                <select
                  value={
                    settings
                      .defaultFileGroup
                  }
                  onChange={(event) =>
                    updateSetting(
                      "defaultFileGroup",
                      event.target.value,
                    )
                  }
                >
                  <option value="all">
                    Todos os arquivos
                  </option>

                  <option value="documents">
                    Documentos
                  </option>

                  <option value="images">
                    Imagens
                  </option>

                  <option value="videos">
                    Vídeos
                  </option>

                  <option value="archives">
                    Arquivos compactados
                  </option>

                  <option value="quickTest">
                    Teste rápido — TXT
                  </option>
                </select>

                <small>
                  Esse grupo aparecerá
                  inicialmente selecionado
                  na tela de varredura.
                </small>
              </label>

              <label className="settings-field">
                <span>
                  Arquivos duplicados
                </span>

                <select
                  value={
                    settings
                      .duplicatePolicy
                  }
                  onChange={(event) =>
                    updateSetting(
                      "duplicatePolicy",
                      event.target.value,
                    )
                  }
                >
                  <option value="keepBoth">
                    Manter as duas versões
                  </option>

                  <option value="skip">
                    Ignorar o duplicado
                  </option>

                  <option value="overwrite">
                    Substituir o existente
                  </option>
                </select>

                <small>
                  Manter as duas versões é
                  a alternativa mais segura.
                </small>
              </label>
            </div>
          </article>

          <article className="settings-card">
            <header className="settings-card-header">
              <div className="settings-card-icon">
                <Bell
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2>
                  Comportamento
                </h2>

                <p>
                  Escolha como o aplicativo
                  deve agir durante e depois
                  das recuperações.
                </p>
              </div>
            </header>

            <div className="settings-toggle-list">
              <ToggleSetting
                label="Confirmar antes de iniciar"
                description="Exibe uma confirmação final com a origem, o destino e os filtros selecionados."
                checked={
                  settings
                    .confirmBeforeRecovery
                }
                onChange={(value) =>
                  updateSetting(
                    "confirmBeforeRecovery",
                    value,
                  )
                }
              />

              <ToggleSetting
                label="Abrir destino ao finalizar"
                description="Abre automaticamente a pasta que contém os arquivos recuperados."
                checked={
                  settings
                    .openDestinationAfterRecovery
                }
                onChange={(value) =>
                  updateSetting(
                    "openDestinationAfterRecovery",
                    value,
                  )
                }
              />

              <ToggleSetting
                label="Notificar quando terminar"
                description="Mostra uma notificação quando uma recuperação for concluída."
                checked={
                  settings
                    .notifyWhenFinished
                }
                onChange={(value) =>
                  updateSetting(
                    "notifyWhenFinished",
                    value,
                  )
                }
              />
            </div>
          </article>

          <article className="settings-card">
            <header className="settings-card-header">
              <div className="settings-card-icon">
                <MonitorCog
                  size={22}
                  aria-hidden="true"
                />
              </div>

              <div>
                <h2>
                  Interface e diagnóstico
                </h2>

                <p>
                  Controle detalhes visuais
                  e informações técnicas.
                </p>
              </div>
            </header>

            <div className="settings-toggle-list">
              <ToggleSetting
                label="Mostrar detalhes técnicos"
                description="Exibe comandos, tempos internos e informações adicionais da execução."
                checked={
                  settings
                    .showTechnicalDetails
                }
                onChange={(value) =>
                  updateSetting(
                    "showTechnicalDetails",
                    value,
                  )
                }
              />

              <ToggleSetting
                label="Reduzir animações"
                description="Diminui transições e movimentos da interface."
                checked={
                  settings
                    .reduceAnimations
                }
                onChange={(value) =>
                  updateSetting(
                    "reduceAnimations",
                    value,
                  )
                }
              />
            </div>
          </article>
        </div>

        <aside className="settings-side-column">
          <article className="settings-diagnostic-card">
            <div className="settings-diagnostic-icon">
              <ShieldCheck
                size={27}
                aria-hidden="true"
              />
            </div>

            <span className="settings-card-label">
              Diagnóstico
            </span>

            <h2>
              Windows File Recovery
            </h2>

            <p>
              Confirme se o mecanismo
              responsável pelas
              recuperações está instalado
              e acessível.
            </p>

            <div
              className={`engine-test-result is-${engineTestStatus}`}
              role="status"
              aria-live="polite"
            >
              {engineTestStatus ===
              "success" ? (
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                />
              ) : engineTestStatus ===
                "error" ? (
                <AlertTriangle
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
                {engineTestMessage}
              </span>
            </div>

            <button
              type="button"
              className="test-engine-button"
              onClick={handleTestEngine}
              disabled={
                engineTestStatus ===
                "testing"
              }
            >
              <Gauge
                size={18}
                aria-hidden="true"
              />

              {engineTestStatus ===
              "testing"
                ? "Testando..."
                : "Testar mecanismo"}
            </button>
          </article>

          <article className="settings-recommendation">
            <ShieldCheck
              size={21}
              aria-hidden="true"
            />

            <div>
              <strong>
                Configuração recomendada
              </strong>

              <p>
                Use o modo automático e
                mantenha as duas versões em
                caso de arquivos duplicados.
              </p>
            </div>
          </article>
        </aside>
      </div>

      <footer className="settings-actions">
        <div>
          {feedback && (
            <span
              className="settings-feedback"
              role="status"
            >
              {feedback}
            </span>
          )}
        </div>

        <button
          type="button"
          className="restore-settings-button"
          onClick={handleRestoreDefaults}
        >
          <RotateCcw
            size={17}
            aria-hidden="true"
          />

          Restaurar padrões
        </button>

        <button
          type="button"
          className="save-settings-button"
          onClick={handleSaveSettings}
          disabled={
            !hasUnsavedChanges
          }
        >
          <Save
            size={17}
            aria-hidden="true"
          />

          Salvar alterações
        </button>
      </footer>
    </section>
  );
}

export default Settings;