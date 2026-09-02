# Roadmap — File Recovery

Aplicativo desktop para recuperação de arquivos no Windows, desenvolvido com Electron, React e integração com o Windows File Recovery (WinFR).

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
- [x] Filtrar por pasta e extensão
- [x] Restaurar uma operação ativa
- [x] Cancelar a recuperação
- [x] Forçar o modo Extensivo para FAT32
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

## 5. Interface geral e configurações — próxima etapa

### 5.1. Tela inicial

- [ ] Criar a apresentação resumida do aplicativo
- [ ] Adicionar o botão principal “Nova recuperação”
- [ ] Exibir o status do Windows File Recovery
- [ ] Informar quando forem necessárias permissões administrativas
- [ ] Exibir a última recuperação realizada
- [ ] Criar atalhos para histórico e configurações
- [ ] Criar um estado vazio para o primeiro acesso

### 5.2. Tela de configurações

- [ ] Definir o modo padrão: Regular ou Extensivo
- [ ] Definir o grupo padrão de arquivos
- [ ] Configurar uma pasta de destino preferida
- [ ] Adicionar a opção de abrir a pasta após a recuperação
- [ ] Adicionar a opção de restaurar uma operação ativa
- [ ] Configurar a retenção dos logs
- [ ] Disponibilizar os temas claro, escuro e sistema
- [ ] Exibir o diagnóstico do WinFR
- [ ] Adicionar um botão para testar o mecanismo
- [ ] Adicionar um botão para abrir a pasta de logs
- [ ] Permitir restaurar as configurações padrão

### 5.3. Estrutura e experiência

- [ ] Padronizar cabeçalho, barra lateral e área de conteúdo
- [ ] Destacar a página ativa na navegação
- [ ] Criar componentes visuais reutilizáveis
- [ ] Padronizar estados de carregamento, bloqueio, vazio e erro
- [ ] Ajustar a responsividade
- [ ] Revisar a acessibilidade e a navegação por teclado
- [ ] Persistir as configurações pelo processo principal do Electron

### Ordem de implementação do tópico 5

1. Ajustar a navegação e a estrutura geral.
2. Construir a nova tela inicial.
3. Construir a tela de configurações.
4. Criar a persistência das configurações pelo Electron.
5. Finalizar os estados visuais, a acessibilidade e a responsividade.

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

