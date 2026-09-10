# Roadmap — File Recovery

Aplicativo desktop para recuperação de arquivos no Windows, desenvolvido com Electron, React e integração com o Windows File Recovery (WinFR).

Última atualização: 8 de setembro de 2026.

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
- [x] Forçar o modo Extensivo para FAT32
- [ ] Corrigir a restrição por pasta de origem no comando do WinFR
- [ ] Combinar corretamente pasta de origem e extensão no argumento `/n`
- [ ] Validar que a recuperação restrita não traga arquivos de todo o volume
- [ ] Remover definitivamente listeners duplicados
- [ ] Exibir o estado “Finalizando...” quando o progresso chegar a 99%
- [ ] Mapear códigos de saída, incluindo `0xC0000005`
- [ ] Registrar a saída completa do WinFR em log
- [ ] Identificar a pasta `Recovery_<data e hora>` criada pelo WinFR
- [ ] Validar os cenários finais:
  - [ ] Recuperação concluída com arquivos
  - [ ] Recuperação concluída sem arquivos encontrados
  - [ ] Cancelamento solicitado pelo usuário
  - [ ] Falha ou encerramento inesperado do WinFR

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
- [ ] Informar quando forem necessárias permissões administrativas
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
- [ ] Exibir o diagnóstico do WinFR
- [ ] Adicionar um botão para abrir a pasta de logs
- [ ] Aplicar o modo e o grupo padrão na tela `Scan.jsx`
- [ ] Aplicar a política de duplicados no comando do WinFR
- [ ] Aplicar a confirmação antes do início da recuperação
- [ ] Abrir automaticamente a pasta de destino quando configurado
- [ ] Integrar notificações ao processo principal do Electron
- [ ] Aplicar a preferência de detalhes técnicos ao modal e aos resultados

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
4. Integrar as preferências aos consumidores (`Scan.jsx`, WinFR e notificações).
5. Migrar a persistência do `localStorage` para o processo principal do Electron.
6. Finalizar os estados visuais, a acessibilidade e a responsividade.

## 6. Resultados recuperados

- [ ] Localizar automaticamente a pasta criada pelo WinFR
- [ ] Percorrer os arquivos recuperados recursivamente
- [ ] Indexar e normalizar os arquivos recuperados
- [ ] Exibir os arquivos reais na tabela
- [ ] Adicionar pesquisa e filtros
- [ ] Permitir abrir um arquivo
- [ ] Permitir abrir a pasta de um arquivo
- [ ] Exibir tamanho, extensão e localização
- [ ] Diferenciar arquivos recuperados, corrompidos, duplicados e desconhecidos
- [ ] Exibir um resumo com quantidade, tamanho total, duração e modo utilizado

## 7. Histórico de recuperações

- [ ] Salvar recuperações anteriores
- [ ] Consultar os detalhes de uma recuperação
- [ ] Reabrir pastas de destino
- [ ] Remover registros do histórico

## 8. Segurança e diagnóstico

- [ ] Validar e solicitar permissões administrativas
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
