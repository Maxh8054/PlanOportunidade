---
Task ID: 1
Agent: Z.ai Code (main)
Task: Copiar os arquivos do repositório GitHub https://github.com/Maxh8054/PlanOportunidade para o projeto Next.js atual em /home/z/my-project.

Work Log:
- Clonado o repositório de origem para /tmp/PlanOportunidade
- Comparado os arquivos compartilhados (layout.tsx, globals.css, api/route.ts, lib/utils.ts, lib/db.ts, components/ui/*) — a base do projeto já era praticamente idêntica
- Identificadas as diferenças principais: metadados do layout, modelo DashboardData ausente no schema.prisma, API route dashboard-data ausente, componentes customizados (PasswordModal, FilterDropdown, opportunity/*) ausentes, page.tsx principal ausente, e dependência xlsx ausente
- Atualizado src/app/layout.tsx com metadados "Planilha de Oportunidade ZAMine"
- Adicionado model DashboardData ao prisma/schema.prisma
- Criado src/app/api/dashboard-data/route.ts (GET/POST com Prisma upsert)
- Copiado src/components/PasswordModal.tsx e src/components/FilterDropdown.tsx
- Copiado src/components/opportunity/{types,utils,constants}.ts
- Copiado src/app/page.tsx (2359 linhas — dashboard completo com abas Visão Geral/Oportunidades/Ranking, importação Excel/JSON, filtros, gráficos recharts, follow-ups)
- Instalado xlsx@0.18.5 via bun add
- Executado bun run db:push — schema sincronizado, Prisma Client gerado
- Executado bun run lint — sem erros
- Reiniciado dev server (porta 3000) — ready em 694ms
- Verificado HTTP 200 na home (58KB HTML renderizado)
- Verificado API /api/dashboard-data retorna {"data":[],"updatedAt":null} com query Prisma executada corretamente
- Verificação com Agent Browser:
  - Página carrega com título "Planilha de Oportunidade ZAMine"
  - Heading "Dashboard de Oportunidades" presente
  - Botões Importar JSON / Importar Excel / Exportar presentes
  - 3 abas (Visão Geral, Oportunidades, Ranking) presentes e funcionais
  - Clique na aba Oportunidades revela tabela com 14 colunas (ID, Empresa, Cliente, DESCRIÇÃO, EQUIPAMENTO, PN, QTY, CRITICIDADE, ORDEM DE MANUTENÇÃO, PEDIDO DE COMPRA, 📋 Follow Ups, PREVISÃO DE CHEGADA, Status, Dias em Aberto) e estado vazio "Nenhum registro encontrado com os filtros aplicados"
  - Sem erros de console, sem erros de página

Stage Summary:
- Projeto PlanOportunidade copiado com sucesso do GitHub para /home/z/my-project
- Dashboard de Oportunidades ZAMine totalmente funcional: upload de planilhas Excel/JSON, visualização em tabelas filtráveis, gráficos (recharts), follow-ups, persistência via Prisma (SQLite) na tabela DashboardData
- Lint limpo, dev server rodando sem erros na porta 3000
- Verificação end-to-end no browser confirmou renderização e interatividade (navegação por abas)

---
Task ID: 2
Agent: Z.ai Code (main)
Task: Corrigir persistência de dados entre dispositivos — dados importados não aparecem quando acessados de outro PC.

Work Log:
- Identificadas as causas do problema:
  1. O campo `excelHeadersByOrigin` (configuração de colunas do Excel) NUNCA era salvo na API — só ia para localStorage (por navegador)
  2. No Render, SQLite é efêmero (container restart perde dados)
  3. localStorage é por dispositivo → dados de PC1 não aparecem em PC2
- Adicionado campo `excelHeadersByOrigin` (String @default("{}")) ao modelo DashboardData no prisma/schema.prisma
- Atualizado GET do /api/dashboard-data para retornar `excelHeadersByOrigin` no JSON
- Atualizado POST do /api/dashboard-data para salvar `excelHeadersByOrigin` no banco
- Atualizado frontend page.tsx para enviar `excelHeadersByOrigin` no body do POST
- Executado db:push — schema sincronizado com nova coluna
- Lint limpo
- Teste com curl: POST com dados → GET retorna dados + excelHeadersByOrigin corretamente
- Teste no browser: dados persistidos carregam automaticamente da API após reload (gráficos e tabela mostram registros)

Stage Summary:
- Dados agora são completamente salvos no banco SQLite (servidor) e restaurados em qualquer dispositivo
- O campo excelHeadersByOrigin (configuração de colunas por aba) agora persiste no servidor junto com os dados
- Ciclo completo de save→load verificado via curl + Agent Browser
- NOTA: no Render (free tier), SQLite é efêmero — para persistência real em produção, recomenda-se usar PostgreSQL ou banco gerenciado
