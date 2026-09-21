# Roadmap — File Recovery

Aplicativo desktop para recuperação de arquivos no Windows, desenvolvido com Electron, React e integração com o Windows File Recovery (WinFR).

Última atualização: 21 de setembro de 2026.

## 1. Detecção e seleção de discos — concluído

- [x] Listar unidades disponíveis
- [x] Exibir espaço e sistema de arquivos
- [x] Identificar disco do sistema
- [x] Selecionar disco de origem

## 2. Destino seguro — concluído

- [x] Selecionar pasta de destino
- [x] Impedir origem e destino iguais
- [x] Exibir alertas de segurança
- [x] Identificar discos físicos quando possível

## 3. Fluxo visual da recuperação — concluído

- [x] Criar modal de progresso
- [x] Implementar estados de execução
- [x] Implementar cancelamento visual
- [x] Exibir resultados iniciais

## 4. Integração real com WinFR — em finalização

- [x] Detectar a instalação do WinFR
- [x] Gerar e validar comandos
- [x] Executar recuperação real
- [x] Receber atualizações pelo IPC
- [x] Filtrar por extensão
- [x] Selecionar e normalizar a pasta de origem na interface
- [x] Restaurar uma operação ativa
- [x] Cancelar a recuperação
- [x] Forçar o modo Extensivo para sistemas de arquivos diferentes de NTFS, incluindo FAT32
- [x] Corrigir a construção da restrição por pasta de origem no comando do WinFR (testes automatizados; precisão real pendente)
- [x] Combinar corretamente pasta de origem e extensão no argumento `/n`
- [ ] Validar que a recuperação restrita não traga arquivos de todo o volume — requer validação manual
- [ ] Remover definitivamente listeners duplicados
- [x] Exibir a fase de organização dos resultados após o encerramento do WinFR (evento `finalizing`, progresso 100%)
- [ ] Mapear códigos de saída, incluindo `0xC0000005`
- [ ] Registrar a saída completa do WinFR em log
- [x] Identificar a pasta `Recovery_<data e hora>` criada pelo WinFR usando snapshot do destino
- [ ] Validar os cenários finais:
  - [ ] Recuperação concluída com arquivos
  - [ ] Recuperação concluída sem arquivos encontrados
  - [ ] Cancelamento solicitado pelo usuário
  - [ ] Falha ou encerramento inesperado do WinFR

### 4.1. Precisão da pasta de origem e filtros do WinFR

Detalhes, fontes e roteiro: [diagnóstico](docs/winfr-source-folder.md) e [teste manual](docs/winfr-manual-test.md).

| Item | Estado atual |
| --- | --- |
| Investigação do `/n`, sintaxe oficial e fluxo React → preload → IPC → spawn | Concluído; não há evidência de perda da pasta no transporte |
| Correção da normalização (unidades, barras, UNC, travessias e raiz) | Concluído, com testes |
| Combinação entre pasta e extensões em cada `/n` | Concluído; nunca emite extensão global |
| Preview e execução com o mesmo construtor e array de argumentos | Concluído, com testes de integração usando processos simulados |
| Testes automatizados de filtros, caminhos, duplicados, progresso e cancelamento | Concluído: 113 testes; nenhuma recuperação real executada |
| Impedir inclusão de pastas de recuperações anteriores pelo fallback de 60 segundos | Concluído; regressão reproduzida antes da correção |
| Teste manual fora do OneDrive, com arquivo externo de controle | Requer validação manual, nos modos Regular e Extensivo |
| Teste manual dentro do OneDrive, com arquivos disponíveis localmente | Requer validação manual, nos modos Regular e Extensivo |
| Limitações conhecidas do WinFR | Concluído: documentadas; nuvem/rede não suportadas, recuperação depende dos dados ainda disponíveis |
| Explicação de arquivos externos gerados pelo WinFR com `/n` válido | Pendente de logs/versão e reprodução manual; não atribuído a um bug comprovado do motor |
| Necessidade de pós-filtragem por pasta original | Requer validação manual; não implementada por falta de metadados confiáveis de origem |

O pós-filtro de extensão existente foi preservado como filtro de exibição. Ele não substitui os filtros enviados ao motor nem comprova a pasta original. Nenhum teste manual foi marcado como concluído.

## 5. Interface geral e configurações — em andamento

### 5.1. Tela inicial — interface concluída

- [x] Criar uma nova Home/Dashboard com visual moderno
- [x] Exibir saudação personalizada com o nome do usuário do Windows
- [x] Adicionar o botão principal “Nova recuperação”
- [x] Criar banners de avisos, novidades e dicas de uso
- [x] Criar cards de ações rápidas
- [x] Criar uma seção de próximos passos e engajamento
- [x] Adicionar atalhos para histórico e configurações
- [x] Exibir o status do Windows File Recovery
- [x] Informar quando forem necessárias permissões administrativas
- [ ] Exibir a última recuperação realizada
- [ ] Conectar os cards da Home aos dados reais de histórico e recuperação ativa
- [ ] Criar um estado vazio baseado em dados reais para o primeiro acesso

### 5.2. Tela de configurações — interface e persistência local concluídas

- [x] Criar a tela de Configurações seguindo o padrão visual da Home
- [x] Definir o modo padrão: Regular ou Extensivo
- [x] Definir o grupo padrão de arquivos
- [x] Configurar a política para arquivos duplicados
- [x] Adicionar confirmação antes de iniciar a recuperação
- [x] Adicionar a preferência para abrir o destino após a recuperação
- [x] Adicionar preferências de notificações
- [x] Adicionar a exibição opcional de detalhes técnicos
- [x] Adicionar a opção de reduzir animações
- [x] Adicionar um botão para testar o mecanismo WinFR
- [x] Permitir restaurar as configurações padrão
- [x] Criar o serviço `src/services/appSettings.js`
- [x] Salvar e carregar preferências pelo `localStorage`
- [ ] Configurar uma pasta de destino preferida
- [ ] Adicionar a opção de restaurar uma operação ativa
- [ ] Configurar a retenção dos logs
- [ ] Disponibilizar os temas claro, escuro e sistema
- [x] Exibir o diagnóstico básico do teste do WinFR nas Configurações
- [ ] Adicionar um botão para abrir a pasta de logs
- [x] Aplicar o modo e o grupo padrão na tela `Scan.jsx`
- [x] Aplicar a política de duplicados: `/o` no Regular e resposta ao prompt no Extensivo
- [x] Aplicar a confirmação antes do início da recuperação
- [x] Abrir automaticamente a pasta de destino quando configurado
- [x] Integrar notificações ao processo principal do Electron
- [x] Aplicar a preferência de detalhes técnicos ao modal da recuperação
- [ ] Ampliar detalhes técnicos nos resultados, se necessário

### 5.3. Estrutura e experiência

- [x] Padronizar a base visual da Home e das Configurações
- [x] Destacar a página ativa na navegação
- [x] Aplicar globalmente a preferência de animações reduzidas
- [ ] Criar componentes visuais reutilizáveis
- [ ] Padronizar estados de carregamento, bloqueio, vazio e erro
- [ ] Ajustar a responsividade
- [ ] Revisar a acessibilidade e a navegação por teclado
- [ ] Persistir as configurações pelo processo principal do Electron

### Ordem de implementação do tópico 5

1. ~~Ajustar a navegação e a estrutura geral.~~
2. ~~Construir a nova tela inicial.~~
3. ~~Construir a tela de configurações.~~
4. ~~Integrar as preferências aos consumidores (`Scan.jsx`, WinFR e notificações).~~
5. Migrar a persistência do `localStorage` para o processo principal do Electron.
6. Finalizar os estados visuais, a acessibilidade e a responsividade.

## 6. Resultados recuperados

- [x] Localizar automaticamente a pasta criada pelo WinFR
- [x] Percorrer os arquivos recuperados recursivamente
- [x] Indexar e normalizar os arquivos recuperados (até 2.000 resultados visíveis)
- [x] Exibir os arquivos reais na tabela
- [ ] Adicionar pesquisa e filtros
- [ ] Permitir abrir um arquivo
- [ ] Permitir abrir a pasta de um arquivo
- [ ] Exibir tamanho, extensão e localização
- [ ] Diferenciar arquivos recuperados, corrompidos, duplicados e desconhecidos
- [ ] Exibir um resumo com quantidade, tamanho total, duração e modo utilizado

## 7. Histórico de recuperações

- [x] Criar a interface do histórico (atualmente usa `MOCK_RECOVERIES`)
- [ ] Salvar recuperações anteriores
- [ ] Consultar os detalhes de uma recuperação
- [ ] Reabrir pastas de destino
- [ ] Remover registros do histórico

## 8. Segurança e diagnóstico

- [x] Consultar privilégios administrativos e informar o usuário
- [ ] Solicitar elevação administrativa automaticamente
- [ ] Criar logs técnicos persistentes
- [ ] Implementar tratamento centralizado de erros
- [ ] Proteger e validar todos os canais IPC
- [ ] Limitar e normalizar caminhos e parâmetros enviados ao processo principal

## 9. Distribuição

- [ ] Gerar o instalador do Windows
- [ ] Testar a aplicação empacotada
- [ ] Configurar ícone, nome, versão e metadados
- [ ] Validar atualização e desinstalação
- [ ] Preparar a primeira versão pública

## Estratégia de testes

Para testes rápidos e reais durante o desenvolvimento:

- utilizar um pendrive ou VHD pequeno como disco de origem;
- usar um destino em outro volume;
- preferir o modo Regular em volumes NTFS saudáveis;
- usar uma pasta pequena e, quando possível, o nome exato do arquivo;
- reservar o modo Extensivo para volumes pequenos ou para os testes finais;
- nunca executar duas recuperações simultaneamente.
