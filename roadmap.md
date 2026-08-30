# Roadmap — File Recovery

## Base da aplicação

- [x] Inicializar React com Vite
- [x] Integrar Electron
- [x] Configurar preload e IPC
- [x] Criar layout e navegação
- [x] Configurar Content Security Policy
- [x] Adicionar lint e validação de build

## 1. Listagem real de discos

- [x] Consultar discos do Windows
- [x] Criar serviço de discos
- [x] Criar canal IPC
- [x] Expor API pelo preload
- [x] Exibir discos na interface
- [x] Tratar carregamento, erros e ausência de discos

## 2. Seleção segura do disco

- [x] Criar cards selecionáveis
- [x] Identificar disco do sistema
- [x] Exibir espaço total e disponível
- [x] Avisar sobre gravações no disco analisado
- [x] Selecionar disco de destino
- [x] Impedir recuperação para o disco de origem

## 3. Motor de varredura simulado

- [x] Definir o contrato da varredura
- [x] Validar os dados no processo principal
- [x] Criar serviço de simulação
- [x] Simular etapas e progresso
- [x] Contabilizar arquivos encontrados
- [x] Implementar cancelamento
- [x] Criar canais IPC
- [x] Expor funções pelo preload
- [x] Testar pelo DevTools
- [x] Integrar eventos ao React
- [x] Criar modal de progresso
- [x] Exibir percentual, tempo e quantidade
- [x] Impedir alterações durante a execução
- [x] Validar o cancelamento pelo modal
- [x] Gerar arquivos fictícios encontrados
- [x] Exibir resultados simulados
- [x] Validar o fluxo completo

## 4. Motor de recuperação real

- [x] Detectar a instalação do WinFR
- [x] Validar execução com privilégios administrativos
- [x] Criar gerador seguro de argumentos
- [x] Configurar modo Regular e Extensivo
- [x] Configurar filtros por categoria
- [x] Criar modal de configuração
- [x] Executar o WinFR com spawn
- [x] Corrigir a saída UTF-16LE
- [x] Capturar eventos de progresso
- [x] Consultar a recuperação ativa
- [x] Cancelar a recuperação pelo aplicativo
- [ ] Executar uma recuperação completa
- [ ] Confirmar o arquivo recuperado no destino
- [ ] Conectar a execução real ao modal de progresso
- [ ] Substituir a varredura simulada
- [ ] Exibir os resultados reais recuperados
- [ ] Implementar elevação UAC na versão instalada

## 5. Resultados e recuperação

- [ ] Listar arquivos encontrados
- [ ] Filtrar por nome, tipo e localização
- [ ] Selecionar arquivos
- [ ] Exibir tamanho e possibilidade de recuperação
- [ ] Recuperar para o destino escolhido
- [ ] Apresentar resumo da operação

## 6. Persistência

- [ ] Salvar varreduras realizadas
- [ ] Registrar resultados e erros
- [ ] Criar tela de histórico
- [ ] Permitir consultar operações anteriores
- [ ] Implementar limpeza do histórico

## 7. Distribuição

- [ ] Preparar o aplicativo para produção
- [ ] Configurar ícone e informações
- [ ] Gerar instalador do Windows
- [ ] Testar em outro computador
- [ ] Documentar instalação e utilização