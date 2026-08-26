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
- [] Impedir recuperação para o disco de origem

## 3. Motor de varredura simulado

- [ ] Criar contrato do motor de recuperação
- [ ] Simular progresso
- [ ] Implementar cancelamento
- [ ] Gerar resultados fictícios
- [ ] Validar o fluxo completo da interface

## 4. Motor de recuperação real

- [ ] Avaliar Windows File Recovery
- [ ] Avaliar leitura de metadados NTFS
- [ ] Tratar permissões administrativas
- [ ] Implementar varredura somente leitura
- [ ] Tratar SSD, TRIM e arquivos sobrescritos

## 5. Resultados e recuperação

- [ ] Listar arquivos encontrados
- [ ] Criar filtros e busca
- [ ] Exibir possibilidade de recuperação
- [ ] Selecionar destino
- [ ] Recuperar para outro disco

## 6. Persistência

- [ ] Armazenar sessões de varredura
- [ ] Criar histórico
- [ ] Persistir configurações
- [ ] Registrar arquivos recuperados

## 7. Distribuição

- [ ] Configurar empacotamento
- [ ] Criar instalador para Windows
- [ ] Configurar ícones e metadados
- [ ] Testar aplicação empacotada
- [ ] Revisar segurança e permissões