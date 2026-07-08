---
Task ID: 1
Agent: Main Agent
Task: Copiar arquivos do repositório GitHub Maxh8054/PlanOportunidade para o projeto Next.js local

Work Log:
- Clonou o repositório https://github.com/Maxh8054/PlanOportunidade para /tmp/PlanOportunidade
- Analisou a estrutura completa do projeto (page.tsx, layout.tsx, globals.css, API routes, componentes customizados, prisma schema)
- Instalou dependências adicionais: xlsx, recharts, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Copiou componentes customizados: PasswordModal.tsx, FilterDropdown.tsx, opportunity/types.ts, opportunity/constants.ts, opportunity/utils.ts
- Copiou page.tsx (2000 linhas - Dashboard de Oportunidades completo), layout.tsx, globals.css
- Copiou API route: src/app/api/dashboard-data/route.ts (adaptado para usar `db` import do projeto)
- Copiou e aplicou schema Prisma com modelo DashboardData
- Executou `bun run db:push` para sincronizar o banco de dados
- Executou `bun run lint` - passou sem erros
- Verificou com Agent Browser: todas as 3 abas (Visão Geral, Oportunidades, Ranking) funcionam corretamente
- Footer com sticky bottom funciona corretamente
- API endpoint /api/dashboard-data respondendo 200 com Prisma query

Stage Summary:
- Projeto PlanOportunidade completamente copiado e funcional
- Dashboard de Oportunidades com: importação Excel/JSON, exportação, gráficos (recharts), filtros avançados, ranking, follow-up, configuração de colunas com drag-and-drop
- Banco de dados SQLite com Prisma sincronizado
- Todos os componentes shadcn/ui e customizados copiados