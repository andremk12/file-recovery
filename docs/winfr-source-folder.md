# Precisão da pasta de origem no WinFR

Revisão: 21/09/2026. Base remota: `4cabee3919b18940057bd0f408d73a4be77eee42`.

## Diagnóstico e limites da conclusão

A pasta **não era perdida no transporte** na versão inspecionada. O comando `/n \RecoveryLab\` já estava sendo produzido; ele é uma forma válida. Não há evidência suficiente para afirmar que esse comando, sozinho, faz o WinFR ignorar a pasta. O sintoma de arquivos externos no disco de destino ainda precisa de reprodução com a versão instalada e os resultados brutos.

Foram identificados dois defeitos verificáveis:

1. `buildWinfrCommand` normalizava `request.filters`, mas, havendo pasta, sempre escolhia `engineFilters = [sourceFolder]`. Assim, `*.txt` desaparecia do comando e ficava somente em `resultFilters`. O pós-processamento verificava apenas a extensão do nome; isso explica por que o filtro parecia funcionar na tabela, embora o motor recebesse um pedido mais amplo quanto ao tipo de arquivo.
2. `collectRecoveredResults`, quando não encontrava uma pasta nova, voltava a pastas do snapshot anterior se o horário delas estivesse dentro de `startedAt - 60_000`. Isso podia apresentar arquivos de outra recuperação como atuais. Um teste com uma pasta anterior criada 30 segundos antes reproduziu o erro: um arquivo externo retornado quando o esperado era zero. O teste falhou antes e passou depois da remoção desse fallback.

O segundo defeito explica um caminho concreto para a lista mostrar arquivos alheios à operação; não prova que o motor tenha recuperado novamente aqueles arquivos. Também não prova a causa de todas as execuções relatadas.

## Mapa do fluxo revisado

| Etapa | Arquivos e comportamento |
| --- | --- |
| Seleção | `electron/ipc/destinationIpc.js` retorna `filePaths[0]`; `Scan.jsx` verifica a unidade e guarda o caminho completo em `recoverySourceFolder` |
| Grupos e solicitação | `src/pages/scan/Scan.jsx` define os grupos e usa `createRecoveryRequest` tanto na preparação quanto no início; inclui pasta, unidade, destino, modo, duplicados e extensões |
| Preload | `electron/preload.cjs` encaminha a solicitação sem reescrever caminhos |
| IPC real | `electron/ipc/recoveryEngineIpc.js` chama o construtor no preview e o serviço no início |
| Normalização e argumentos | `electron/services/winfrCommandBuilder.js` é a implementação única para ambos |
| Processo | `electron/services/winfrRecoveyService.js` chama `spawn(executablePath, command.args, { shell: false, ... })`; não concatena comando nem insere aspas nos valores |
| Resultados | `electron/services/recoveryResultService.js` percorre as novas pastas `Recovery_*` e aplica o filtro de extensão de exibição |
| Simulação | `scanIpc.js` e `scanService.js` pertencem à varredura simulada, não ao caminho de recuperação real |
| Persistência | A solicitação não é persistida em disco. A operação ativa guarda `command` em memória; preferências usam `appSettings.js`/`localStorage`. A tela de histórico usa `MOCK_RECOVERIES`, ainda sem histórico real |

Já havia validação de unidade, normalização Windows e um construtor compartilhado. A correção reutiliza esses pontos. A restauração da operação ativa recupera seu estado básico, mas não restaura todo o formulário; isso permanece fora desta mudança.

## Correção

- Sem extensão: um único filtro de pasta com barra final.
- Com extensões: um `/n` para cada combinação `pasta + extensão`. Não se adiciona um filtro separado de pasta ampla junto às extensões.
- O campo `filters` retornado pelo construtor contém os filtros do motor; `resultFilters` continua contendo somente extensões para a apresentação.
- A unidade continua sendo a origem posicional. Pasta de outra unidade, UNC/dispositivo, `C:pasta`, travessias `..` e filtros que contenham caminhos são rejeitados.
- Pasta ausente e raiz inteira continuam bloqueadas, como na política anterior. `C:\RecoveryLab` é aceito; `C:\` não habilita recuperação global.
- Espaços, acentos, OneDrive local e maiúsculas/minúsculas da unidade são preservados/normalizados sem transformar o caminho em UNC.
- O preview dobra a barra final antes das aspas apenas na representação Windows. O array mantém uma barra e nenhuma aspa.
- Uma mudança na política de duplicados também invalida o preview na interface.
- Pastas já presentes no snapshot não são reaproveitadas por proximidade de horário.

Não há alteração de layout, novas dependências ou pós-filtro por pasta original. `/a`, `/o` no Regular, resposta de duplicados no Extensivo, cancelamento, progresso, notificações e seleção de destino foram preservados.

## Antes e depois

Solicitação: origem `C:`, pasta `C:\RecoveryLab`, destino `D:\Teste-Resultado`, Regular, manter ambos, `["*.txt"]`.

Antes, no código revisado:

```text
winfr.exe C: D:\Teste-Resultado /regular /a /o:b /n \RecoveryLab\
```

Depois:

```text
winfr.exe C: D:\Teste-Resultado /regular /a /o:b /n \RecoveryLab\*.txt
```

Array real (a barra duplicada abaixo é escape JSON, não duas barras no argumento):

```json
["C:","D:\\Teste-Resultado","/regular","/a","/o:b","/n","\\RecoveryLab\\*.txt"]
```

Extensivo com duas extensões:

```json
["C:","D:\\Teste-Resultado","/extensive","/a","/n","\\RecoveryLab\\*.txt","/n","\\RecoveryLab\\*.pdf"]
```

Sem extensão, o argumento final continua sendo `"\\RecoveryLab\\"`. Não se inventou uma exigência de `\*` ou `\*.*`.

## Sintaxe oficial e limitações

A [documentação da Microsoft](https://support.microsoft.com/en-us/windows/experience/backup-recovery/windows-file-recovery) descreve origem por unidade, `/n` por caminho/tipo, pasta com barra final e exemplo de pasta+extensão. Regular atende NTFS saudável; Extensivo atende outros cenários/sistemas. A tabela apresenta `/n` em todos os modos básicos. Rede e armazenamento em nuvem não são suportados; dados sobrescritos podem ser irrecuperáveis. Não foi encontrada ali uma declaração de que Extensivo ignore pastas nem uma garantia absoluta de recuperação/proveniência.

As [regras de argumentos do Windows](https://learn.microsoft.com/en-us/cpp/c-language/parsing-c-command-line-arguments?view=msvc-170) fundamentam o escape da barra final no preview.

Consequências para este aplicativo:

- Podemos garantir por testes a construção e o transporte dos filtros. Não podemos certificar o comportamento do WinFR real sem executá-lo no cenário de controle.
- Um arquivo apenas na nuvem não constitui um controle válido para recuperação local. No roteiro de OneDrive, é necessário disponibilizar os arquivos no dispositivo antes de apagá-los.
- Resultado vazio não comprova precisão por pasta: o arquivo interno também precisa ser recuperado para o teste positivo ser conclusivo.
- `relativePath` é relativo à pasta de destino; o coletor não tem um campo confiável de caminho original. Filtrar esse valor como se fosse origem pode ocultar arquivos legítimos, renomeados ou sem estrutura preservada.
- Mantém-se o pós-filtro existente de extensão, mas ele não remove arquivos do disco nem valida sua origem.
- Pós-filtragem por pasta só deve ser decidida após a matriz manual. Se o controle externo aparecer, registrar evidência e tratar o resultado como “origem não verificada”, sem apagá-lo automaticamente. Mensagem recomendada para uma futura detecção confiável: “Não foi possível confirmar a pasta original de todos os arquivos recuperados. Confira o destino antes de utilizá-los.” Essa detecção/mensagem não foi implementada sem metadados que a sustentem.
- A coleta pressupõe uma pasta nova por operação. Reutilização de pasta pelo motor, gravação concorrente por outro WinFR e falhas de acesso ao snapshot precisam de diagnóstico próprio; proximidade de horário não será usada como prova.

## Testes e validação

Usamos `node:test` e `node:assert/strict`, com mock de módulos habilitado pelo script `npm test`. São módulos ESM nativos, independentes da transformação Vite; nenhuma dependência foi adicionada. Ambiente validado: Windows, Node `22.18.0`, npm `10.9.3`. O mock de módulos requer a flag experimental presente no script e pode emitir um aviso do Node.

| Arquivo | Cobertura |
| --- | --- |
| `electron/tests/winfrCommandBuilder.test.js` | Os cinco caminhos solicitados, barras simples/duplicadas, caixa da unidade, nenhum/um/vários filtros, ambos os modos, UNC, travessias, ausência de pasta, raiz, unidade divergente, duplicados, argv exato e aspas |
| `electron/tests/recoveryPipeline.test.js` | Preload real em sandbox de teste → handlers IPC reais → serviço real, com `spawn` e dependências de sistema simulados; compara preview/argv, validações, progresso, duplicados e cancelamento |
| `electron/tests/recoveryResults.test.js` | Regressão de resultados anteriores recentes e seleção exclusiva da pasta nova, com sistema de arquivos simulado |

Nenhum `winfr.exe`, `where.exe`, `taskkill.exe` ou Electron real é iniciado pelos testes.

- `npm test`: 113 testes aprovados.
- `npm run lint`: aprovado, zero erros; os mesmos 17 avisos preexistentes, sem novos avisos.
- `npm run build`: aprovado.
- Recuperação real/manual: **não executada**. Seguir [roteiro manual](winfr-manual-test.md).

## Arquivos alterados

Código: `winfrCommandBuilder.js`, `recoveryResultService.js`, `Scan.jsx` (invalidação de preview) e `package.json` (script de testes).

Adicionados: os três arquivos de testes acima e os dois documentos desta pasta.

Atualizado: `file-recovery-roadmap (1).md`, preservando os itens existentes e distinguindo implementação de validação manual.
