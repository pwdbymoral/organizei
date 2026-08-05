# GitHub settings

Abra **Settings → Code security and analysis** e habilite Secret scanning, Push protection, Dependabot alerts/updates e Code scanning. Em **Settings → Rules → Rulesets**, crie regra para `main`: pull request obrigatório, checks `CI / verify` e `CodeQL / analyze`, branches atualizadas, histórico linear e force push proibido. Não use secrets em workflows de forks.
