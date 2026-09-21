# Teste manual da pasta de origem

Estado: **requer validação manual**. Este roteiro não foi executado automaticamente.

Use somente arquivos sintéticos que possam ser perdidos. Não misture este teste com a recuperação de dados importantes. Prepare dependências e abra o aplicativo antes de apagar os arquivos; após a exclusão, evite outras gravações na origem. Prefira um volume NTFS de teste pequeno já existente e um destino em outro dispositivo. Não formate nem crie partições para este teste.

## Preparar o aplicativo

No repositório corrigido, com Node 22.18 ou superior compatível:

```powershell
npm ci
npm test
npm run lint
npm run build
npm run desktop
```

Para a recuperação real, execute o aplicativo com os privilégios administrativos exigidos pelo WinFR. O navegador aberto por Vite sozinho não tem a API Electron.

Em Configurações, ative os detalhes técnicos e a confirmação antes de iniciar. Use “manter ambos” para duplicados. O diagnóstico da instalação informa disponibilidade; ele não valida recuperação por pasta.

## Fora do OneDrive

Exemplo com origem `C:` e destino `D:`. Substitua as letras se necessário. O aplicativo também pode bloquear volumes do mesmo disco físico; use outro HD/SSD/pendrive para o destino.

1. Execute apenas a preparação abaixo no PowerShell. Ela cria duas pastas de teste com identificador exclusivo e não apaga nada:

```powershell
$scopeRunId = 'Escopo-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$scopeRoot = Join-Path 'C:\RecoveryLab' $scopeRunId
$scopeTarget = Join-Path $scopeRoot 'Alvo'
$scopeControl = Join-Path $scopeRoot 'Controle'
$scopeDestination = Join-Path 'D:\Teste-Resultado' $scopeRunId
if ((Test-Path -LiteralPath $scopeRoot) -or (Test-Path -LiteralPath $scopeDestination)) {
    throw 'As pastas já existem. Gere outro identificador.'
}
New-Item -ItemType Directory -Path $scopeTarget, $scopeControl, $scopeDestination | Out-Null
$scopeInside = Join-Path $scopeTarget 'dentro.txt'
$scopeOutside = Join-Path $scopeControl 'fora-controle.txt'
Set-Content -LiteralPath $scopeInside -Value ('DENTRO ' + $scopeRunId) -Encoding utf8
Set-Content -LiteralPath $scopeOutside -Value ('FORA ' + $scopeRunId) -Encoding utf8
Get-FileHash -LiteralPath $scopeInside, $scopeOutside |
    Export-Csv -LiteralPath (Join-Path $scopeDestination 'hashes-antes.csv') -NoTypeInformation
[pscustomobject]@{ Origem = $scopeTarget; Controle = $scopeControl; Destino = $scopeDestination }
```

2. Anote as três pastas exibidas. No Explorador, selecione **apenas** `dentro.txt` e use Shift+Delete. Faça o mesmo com **apenas** `fora-controle.txt`. Mantenha as pastas Alvo e Controle. Não exclua qualquer arquivo preexistente.
3. No aplicativo, abra “Nova recuperação”, selecione a unidade de origem e a pasta de destino recém-criada.
4. Em “Configurar recuperação”, escolha Regular, grupo “Teste rápido (.txt)” e a pasta **Alvo** como origem. Prepare o comando.
5. Confira o preview antes de iniciar. Para o identificador de exemplo `Escopo-EXEMPLO`, deve ser:

```text
winfr.exe C: D:\Teste-Resultado\Escopo-EXEMPLO /regular /a /o:b /n \RecoveryLab\Escopo-EXEMPLO\Alvo\*.txt
```

Cada `/n` precisa começar na pasta Alvo. Não deve existir `/n *.txt` nem um `/n` separado abrangendo toda a pasta junto à extensão. A primeira origem deve continuar `C:`.

6. Inicie e confirme a operação pelo aplicativo. Espere a indexação terminar.
7. Confira a tabela **e a nova pasta Recovery_* no destino**, incluindo suas subpastas. Deve existir `dentro.txt` com o conteúdo/hash anotado e não deve existir `fora-controle.txt`. Não conte arquivos de outros destinos/operações. Confira também se há arquivos inesperados ocultados pelo filtro de extensão da tabela.
8. Registre o comando, modo, versão do WinFR, sistema de arquivos, arquivos encontrados e hashes. Se o arquivo interno não for recuperado, marque o resultado como **inconclusivo**, não como aprovado.
9. Repita com um identificador novo para cada cenário: Extensivo + TXT; Regular/Extensivo + “Todos os arquivos”; Regular/Extensivo + “Documentos”. Em “Todos”, o `/n` termina em `\Alvo\`. Em “Documentos”, todos os cinco filtros devem começar em `\Alvo\`.

Para espaços e acentos, substitua o nome `Alvo` por `Recuperação Teste` em uma nova execução. O preview usa aspas. Se o argumento de pasta terminar com barra, a representação entre aspas terá barra final escapada; isso não significa UNC no array.

## Dentro do OneDrive

1. No Explorador, identifique o caminho físico local da sua pasta OneDrive. Não use uma URL nem suponha que o nome exibido seja idêntico ao caminho físico.
2. Crie um conjunto novo e exclusivo, por exemplo `C:\Users\Andre\OneDrive\Área de Trabalho\WinfrEscopo-<id>\Alvo` e `...\Controle`, com `dentro.txt` e `fora-controle.txt` e conteúdos distintos. Use apenas esses arquivos sintéticos, pois a exclusão pode ser sincronizada.
3. Marque as duas pastas como “Sempre manter neste dispositivo”, espere a disponibilidade local e confirme que os arquivos abrem. Salve seus hashes no destino em outra unidade.
4. Apague somente os dois arquivos de teste com Shift+Delete; mantenha as pastas.
5. Repita os passos do aplicativo acima, escolhendo o caminho local completo de Alvo. O filtro TXT deve preservar toda a parte `\Users\Andre\OneDrive\Área de Trabalho\WinfrEscopo-<id>\Alvo\*.txt`, dentro de aspas no preview.
6. Use um destino novo para cada execução e teste Regular e Extensivo. A aprovação exige recuperar o controle positivo interno e não retornar o externo, na tabela e no destino físico.

Arquivos que nunca estiveram disponíveis no disco local não são um teste válido dessa integração.

## Verificações adicionais e registro

- Pasta de uma unidade diferente: deve aparecer erro e nenhum processo deve começar.
- Limpar a pasta ou escolher a raiz da unidade: deve impedir recuperação global.
- Alterar destino, grupo, modo, pasta ou política de duplicados: preparar novamente o preview.
- Cancelar uma execução sintética: verificar encerramento e liberação para outra operação.
- Manter ambos, ignorar e sobrescrever: validar em destino de teste; verificar também notificações e abertura automática, se habilitadas.
- O histórico é demonstrativo no código atual; não o use como prova de execução ou persistência.

| Ambiente | Modo | Grupo | Interno recuperado/hash correto | Externo ausente no destino | Estado |
| --- | --- | --- | --- | --- | --- |
| Fora do OneDrive | Regular | TXT | | | Requer validação manual |
| Fora do OneDrive | Extensivo | TXT | | | Requer validação manual |
| Fora do OneDrive | Regular / Extensivo | Todos / Documentos | | | Requer validação manual |
| OneDrive local | Regular | TXT | | | Requer validação manual |
| OneDrive local | Extensivo | TXT | | | Requer validação manual |
| Espaços e acentos | Regular / Extensivo | TXT / Todos | | | Requer validação manual |

Se aparecer o controle externo, não marque o teste como aprovado e não apague os resultados. Guarde o preview, versão, horários, log gerado pelo WinFR e a árvore da nova pasta de destino. Compare com uma execução direta do mesmo comando somente se você decidir fazer esse teste adicional. Esses dados distinguem falha do motor, versão, metadados e erro da aplicação. Não implemente uma exclusão automática de resultados baseada apenas no nome da pasta de destino.
