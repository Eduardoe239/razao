# O Razão v1.15.0-beta.1 — Backup validado e restauração segura

## Alterações
- Exportação em envelope versionado (`orazao-backup`) com data, versão de formato e checksum para detectar corrupção acidental.
- Validação de estrutura antes da restauração: formato, versão, integridade do conteúdo, listas obrigatórias, IDs duplicados, datas, valores monetários e referências de contas/cartões inválidas.
- Rejeição de JSON truncado, arquivos vazios, arquivos acima de 25 MB e backups incompletos.
- Restauração exige confirmação explícita e apresenta um resumo dos dados que serão substituídos.
- O estado atual só é substituído depois que a persistência confirma a gravação do estado restaurado.
- Evento de auditoria local para a restauração.
- Exportação Electron agora grava o conteúdo no caminho escolhido; anteriormente o diálogo retornava um caminho sem escrever o arquivo.

## Limitações
- O checksum é não criptográfico e detecta corrupção acidental; não prova autenticidade contra adulteração deliberada.
- A restauração substitui os dados atuais. Recomenda-se exportar um backup atual antes de restaurar.
- A compilação completa e o instalador Windows ainda dependem de instalação funcional das dependências.
