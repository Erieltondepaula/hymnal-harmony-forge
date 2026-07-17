# Refatoração do Módulo de Harmonia — Harmony Forge

Trata-se de uma refatoração grande. Proponho entregar em **fases** para manter a aplicação funcionando a cada passo (a lógica de transposição atual — `smartTransposeChord`, campo harmônico da maior — continua intacta durante toda a migração).

## Fase 1 — Motor de Teoria Musical (novo core)

Novo arquivo `src/lib/theory/` com módulos puros e testáveis:

- **`chromatic.ts`** — escala cromática, enarmônicos, PC (pitch class 0-11).
- **`scales.ts`** — fórmulas intervalares:
  - Maior Natural: `2-2-1-2-2-2-1`
  - Menor Natural: `2-1-2-2-1-2-2`
  - Menor Harmônica: `2-1-2-2-1-3-1`
  - Menor Melódica (asc): `2-1-2-2-2-2-1`
- **`spelling.ts`** — grafia correta por armadura (nunca mistura ♯/♭). Regra: dada uma tônica e modo, gera as 7 notas usando **letras consecutivas** (A,B,C,D,E,F,G) e ajusta acidente para bater com o PC — algoritmo padrão de "note spelling".
- **`field.ts`** — campo harmônico dinâmico: para cada grau, monta tríade com 1-3-5 da escala e classifica qualidade (maior/menor/dim/aug) a partir dos intervalos reais. Isso naturalmente produz:
  - Maior → I ii iii IV V vi vii°
  - Menor natural → i ii° III iv v VI VII
  - Menor harmônica → i ii° III+ iv V VI vii°
  - Menor melódica → i ii III+ IV V vi° vii°
- **`functions.ts`** — mapa grau → função (Tônica, Supertônica, Mediante, Subdominante, Dominante, Submediante, Sensível/Subtônica).
- **`intervals.ts`** — nome de intervalos (3ª maior, 5ª justa, 7ª menor, etc.).

## Fase 2 — Ciclo/Círculo como navegador

- Reescrever `HarmonicCircle.tsx` para consumir o novo motor.
- Adicionar seletor de **modo** (Maior / Menor Nat / Menor Harm / Menor Mel).
- Adicionar seletor de **notação** (Auto / ♯ / ♭).
- **Todos os 12 acordes clicáveis** (usa PC, não string fixa) — ao clicar, vira tônica.
- Destaque do acorde selecionado: escala levemente, borda, ring animado.
- Rótulos mostram grau (I, ii, iii°, V…) sob o nome do acorde.

## Fase 3 — Painel Harmônico lateral

Novo `HarmonyPanel.tsx` (substitui/estende o painel atual do editor):
- Tom + Modo + Armadura + Tom Relativo
- Escala completa (7 notas, grafia correta)
- Campo harmônico com 7 acordes + graus + funções
- Ao clicar num acorde da **cifra da música**, abre este painel focado nele.

## Fase 4 — Integração com transposição existente

- `smartTransposeChord` passa a delegar em `theory/field.ts` (mantendo a API pública, então nada quebra em `song-store`, editor, etc.).
- Grafia do resultado respeita o **modo + tom destino** (sem misturar acidentes).

## Fase 5 — Dicionário de Acordes (`/dicionario`)

Nova rota `src/routes/dicionario.tsx`:
- Busca livre + construtor (Fundamental × Tipo).
- Detalhes: nome, fórmula, intervalos, notas, inversões.
- **Piano** (SVG teclado com notas destacadas — componente novo `PianoDiagram`).
- **Violão** (diagrama de traste — componente novo `GuitarDiagram`, usa um pequeno banco de digitações para tipos comuns; para tipos raros, mostra "posição não catalogada" em vez de inventar).
- **Áudio**: usa `Tone.js` via dynamic import (client-only) para tocar o acorde.
- Em quais campos harmônicos aparece; escalas relacionadas.

Adicionar link "Dicionário" no `AppSidebar`.

## Fase 6 — Painel do acorde na música

No `SongMapRenderer`, botão/clique-longo em um acorde abre drawer com:
Piano · Violão · Escala · Campo · Função · Graus · Intervalos · Inversões · Substituições · Escalas relacionadas — reutilizando componentes da Fase 5.

## Detalhes técnicos

- **Sem tabelas fixas** de campo harmônico. Tudo derivado das fórmulas intervalares + grafia por letra.
- **Enarmônicos**: motor trabalha em PC (0-11); apresentação decide grafia.
- **Tone.js**: `bun add tone`; import dinâmico dentro de handler (SSR safe).
- **Compatibilidade**: `smartTransposeChord`, `diatonicField`, `formatKeyInterval` mantêm assinaturas. Tipos existentes de `Song` não mudam.
- **Testes rápidos** de sanidade após Fase 1: verificar que Eb Maior → Eb F G Ab Bb C D (Eb Fm Gm Ab Bb Cm D°) e F# Maior → F# G# A# B C# D# E# (sem misturar bemóis).

## Escopo desta primeira entrega

Se você aprovar, sugiro entregar **Fases 1 → 4 nesta rodada** (motor completo + círculo novo + painel lateral + transposição delegada) porque são interdependentes. **Fases 5 e 6 (Dicionário + drawer na música)** em uma segunda rodada, pois envolvem UI grande (piano, violão, áudio) e vale confirmar preferências visuais.

Confirma essa divisão? Ou prefere que eu já ataque tudo (1–6) de uma vez?
