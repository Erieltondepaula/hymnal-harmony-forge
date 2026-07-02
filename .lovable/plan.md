## Escopo desta primeira entrega

A especificação cobre um produto grande (IA de interpretação musical, OCR, exportação PDF vetorial, biblioteca com banco, colaboração, etc.). Proponho fatiar em fases e entregar **agora a Fase 1 — Fundação Visual + Editor com Preview ao Vivo**, respeitando exatamente a identidade visual, tipografia, grid de 8px e o padrão visual do mapa (baseado no PDF `TEU AMOR NÃO FALHA` que você enviou).

Isso garante que o "esqueleto" e o padrão visual do mapa estejam corretos antes de plugarmos IA e backend — que é onde o custo/complexidade explode.

## O que entra na Fase 1 (agora)

**Design System**
- Tokens em `src/styles.css`: paleta exata (#0F1115, #171A21, #1D212B, #2A2F3A, #FFFFFF, #A9B0BE, #4F7DFF, #22C55E, #EF4444, #FACC15), tipografia Inter, escala 8px, radius (cards 16, botões 12, campos 10), sombras discretas, transições 180ms.
- Tema escuro como padrão.
- Font Inter via `<link>` no `__root.tsx`.

**Layout da aplicação**
- Sidebar fixa 280px: Logo, Dashboard, Novo Projeto, Biblioteca, Importar, Configurações, Ajuda, usuário no rodapé.
- Área principal fluida com max 1600px, padding 40px, margens 48px.

**Rotas (TanStack Start)**
- `/` Dashboard: saudação, dois botões grandes (Novo Mapa / Importar PDF), grade de "Projetos recentes" com cards (nome, artista, tom, BPM, última edição, Abrir).
- `/novo` Novo Mapa: split 40/60 — coluna esquerda de importação (drag & drop, colar, arquivo, link, texto), coluna direita com preview do mapa.
- `/editor/$id` Editor completo: 3 áreas (painel de blocos à esquerda com drag & drop, preview central, painel de propriedades à direita) + header com salvar/desfazer/refazer/exportar + status bar.
- `/biblioteca` Biblioteca: busca, filtros, favoritos, tags, grid de cards.
- `/configuracoes` e `/ajuda` placeholders visuais.

**Renderer do Mapa Musical**
- Componente `SongMapRenderer` que reproduz fielmente o padrão do PDF anexado: título, TOM, RITMO com setas, blocos (INTRODUÇÃO/PARTE/REFRÃO/PONTE/SOLO/FINAL) com tabela de acordes, indicador de repetições (2X, 3X), primeira linha da letra ("Nada vai me separar…"), observações.
- Usado tanto no preview quanto na futura exportação PDF.

**Editor com Live Preview**
- Estado local (Zustand) do projeto: metadados (título, artista, tom, BPM, compasso, ritmo) + array de blocos.
- Alterar tom/BPM/bloco/acorde atualiza o preview em <100ms, sem botão "Gerar".
- Drag & drop de blocos (dnd-kit).
- Desfazer/Refazer com histórico ilimitado da sessão (Ctrl+Z / Ctrl+Shift+Z).
- Auto-save em `localStorage` (backend real vem na Fase 2).

**Motor de transposição (puro TS)**
- Função `transpose(chord, fromKey, toKey)` cobrindo C, C#, Db, m, 7, maj7, 9, add9, sus2, sus4, °, dim, aug e slash chords (`/E`).
- Muda o tom → recalcula todos os acordes matematicamente.

**Seed de dados**
- Pré-carrega os 2 exemplos do PDF (TEU AMOR NÃO FALHA, QUE ELE CRESÇA) como projetos demo para o dashboard/biblioteca não ficarem vazios.

## O que fica para próximas fases (não entra agora)

- **Fase 2 — Backend & Persistência:** Lovable Cloud (auth, banco, storage), CRUD de projetos, upload real de PDFs.
- **Fase 3 — IA & OCR:** parsing de PDF/DOCX/TXT, OCR de imagens, detecção de estrutura/tom/BPM, resumo inteligente — via Lovable AI Gateway (Gemini).
- **Fase 4 — Exportação PDF vetorial, compartilhamento por link, tags avançadas, versionamento, colaboração em tempo real, apps mobile.**

Vou confirmar cada fase antes de iniciar para evitar retrabalho.

## Detalhes técnicos

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn (já no template).
- Novas dependências: `zustand` (estado), `@dnd-kit/core` + `@dnd-kit/sortable` (drag & drop), `framer-motion` (animações 180ms).
- Sem `tailwind.config.js` — tokens vão em `@theme` de `src/styles.css`.
- Sidebar via shadcn `Sidebar` com `collapsible="icon"`.
- Sem tela de login nesta fase; usuário fake "João" no header.

Confirma que faz sentido começar assim (Fase 1 completa e polida agora, IA/backend nas próximas)?