# Importação Inteligente — Pipeline Único (v2)

Toda importação (Cifra Club, PDF, DOCX, TXT, RTF, colar) passa pelo mesmo pipeline. Nenhuma tela nova.

## Regra fundamental — SourceModel vs ViewModel

O sistema mantém **duas representações**:

- **SourceModel**: a música exatamente como importada (letra, acordes, ordem, blocos). Imutável após a importação. É o que fica salvo no banco.
- **ViewModel**: derivada do SourceModel — reutilização de blocos, referências `↺`, escala de fonte, paginação A4. Recalculável a qualquer momento; nunca reescreve o SourceModel.

Toda análise, classificação, otimização, reutilização e paginação vive na camada ViewModel.

## Estrutura de arquivos

```text
src/lib/import/
├── index.ts        // runImportPipeline() — orquestra
├── parser.ts       // wrapper de parseCifra + extractText
├── classifier.ts   // rótulos canônicos de bloco
├── repetition.ts   // similaridade + structureId
├── layout.ts       // motor de diagramação (medição + simulação)
├── preview.ts      // gera ViewModel + score de qualidade
├── types.ts        // SourceModel, ViewModel, Analysis, Score
└── utils.ts        // normalização, hashing, medidas
```

## 1. Pipeline

```text
extractText → parseCifra → classify → detectRepetitions →
buildViewModel → runLayoutEngine → scoreQuality → Preview → confirm → save(SourceModel)
```

`runImportPipeline({ text, titleHint, artistHint }) → { source, view, analysis, score }`.

## 2. Classificação (`classifier.ts`)

Vocabulário canônico: Intro, Verso, Primeira/Segunda/Terceira Parte, Pré-Refrão, Refrão, Ponte, Solo, Instrumental, Finalização, Vamp, Interlúdio.

- Se a cifra já traz rótulo → normaliza (case/acentos/sinônimos: "Chorus"→Refrão, "Bridge"→Ponte...).
- **Sem marcações** → heurística estrutural:
  - blocos com letra e alta repetição posterior → candidato a Refrão;
  - blocos com letra única e progressão linear → Verso;
  - blocos só de acordes no início → Intro; no fim → Finalização;
  - bloco curto entre refrões → Ponte;
  - bloco só de acordes no meio → Solo/Instrumental.

## 3. Repetição (`repetition.ts`) — features ampliadas

Cada bloco recebe um **fingerprint**:
```ts
{ chordSeq, chordSet, chordCount, lineCount, phraseCount,
  estimatedMeasures, positionRatio, lyricNorm, lyricHash }
```

Similaridade combinada:
- `chordSeqSim` (LCS na sequência normalizada) — peso 0.35
- `chordSetSim` (Jaccard) — peso 0.10
- `lyricSim` (levenshtein normalizado) — peso 0.30
- `shapeSim` (proximidade de measures/lines/phrases) — peso 0.15
- `positionSim` (mesmo papel estrutural) — peso 0.10

Regras:
- `≥ 0.95` letra+acordes iguais → repetição automática.
- `0.85–0.94` → sugestão pendente no Preview (card [Sim]/[Não]).
- **Mesmos acordes, letra diferente** (chordSeqSim ≥ 0.95, lyricSim < 0.6) → marca como *variação estrutural* do mesmo `structureId` (ex.: Verso 1 / Verso 2 com mesma progressão), sem colapsar automaticamente.
- `< 0.85` → bloco independente.

## 4. StructureId

Cada bloco no ViewModel recebe `structureId` canônico (`chorus-1`, `verse-1`, `verse-2`, `bridge-1`, ...).
Referências apontam para `structureId`, não índice — sobrevive a reordenações.

```ts
type ViewBlock =
  | { kind: "content"; sourceIndex: number; structureId: string; type; ... }
  | { kind: "ref";     structureId: string; label: "↺ Voltar ao Refrão" | ... };
```

`sourceIndex` liga de volta ao SourceModel; edições sempre voltam à fonte.

## 5. Layout Engine (`layout.ts`) — motor de diagramação

Não é "mede e quebra". É **medir → simular → escolher**:

1. **Medir** cada elemento em px para cada nível de escala (fonte, padding, spacing) usando as escalas discretas de preferências.
2. **Estado do layout** por candidato:
   - `availableWidth`, `availableHeight`,
   - `compactionFactor` (0..1),
   - `visualDensity` (chips/cm²),
   - `maxLinesPerBlock`,
   - `breakCost` (penaliza quebra de bloco, órfão de título, chip cortado — cortar chip = ∞).
3. **Simular candidatos** na ordem:
   a) tudo com refs em 1 página, escala nominal;
   b) idem, compactação vertical;
   c) idem, compactação horizontal + reflow chord layout;
   d) idem, fonte -1 nível;
   e) 2 páginas com quebra de menor `breakCost`.
4. Escolher o **menor custo** que satisfaça restrições invioláveis:
   - chip nunca cortado/abreviado,
   - linha de acordes + letra é unidade,
   - bloco (título+conteúdo+obs) é unidade,
   - título nunca órfão.
5. Só então **renderizar**.

Saída: `PagedLayout = { pages: RenderedBlock[][], scale, spacing, cost }`.

## 6. Smart Chord Layout com padrões

Distribuidor gera candidatos de arranjo (1×6, 2×3, 3×2, 6×1, com preferência por múltiplos naturais 2/4/8), pontua por:
- equilíbrio (variância de largura entre linhas),
- aproveitamento horizontal,
- proximidade a "compasso natural" (4).

Escolhe o mais equilibrado que caiba na `availableWidth` corrente do Layout Engine.

## 7. Score de qualidade (`preview.ts`)

```ts
Score = {
  overall: 0..100,
  checks: [
    { label: "Estrutura reconhecida", ok, weight },
    { label: "Refrões encontrados", ok },
    { label: "Blocos reutilizados", ok, detail: "Refrão ×3" },
    { label: "Layout otimizado", ok },
    { label: "Cabe em A4", ok },
  ],
  savingsPct: number,
}
```

Renderizado no card "🧠 Estrutura reconhecida" acima do Preview, com o resumo dos blocos e reutilizações.

## 8. Metadados derivados (para futuro)

Calculados na análise e persistidos no SourceModel (readonly):
```ts
derived: {
  estimatedDuration, estimatedTempo,
  averageChordDensity, difficulty: "easy"|"med"|"hard",
  uniqueBlocks, repeatedBlocks
}
```
Não usados em UI agora, mas ficam prontos para biblioteca/repertório/ensaios.

## 9. Modelo de dados

`song-store` (extensão):
```ts
type Song = {
  ...campos atuais,
  source: SourceBlock[],        // imutável
  view?: ViewModel,             // regenerável, cache
  derived?: DerivedMetadata,
}
```
Migração: songs existentes → `source = blocks atuais`, `view` recomputado no primeiro carregamento.

## 10. UI da importação (`src/routes/novo.tsx`)

Após pipeline:
- Card **Qualidade da importação** com Score + checks.
- Preview com o ViewModel (refs `↺` clicáveis, rolam até o alvo).
- Cards de sugestão 85–94% → [Sim] reutiliza / [Não] mantém.
- Botão **Confirmar e salvar** grava o SourceModel; **Ajustar** entra no editor.

## 11. PDF / impressão

`editor.$id.tsx` usa o mesmo `PagedLayout` — WYSIWYG entre tela e papel.

## Fora de escopo

- SourceModel nunca é reescrito por otimizações. Toda mudança visual vive no ViewModel.
- Fases 5/6 do Harmony Engine seguem pausadas.
- Sem novas migrations obrigatórias; `source`/`derived` cabem no JSON já persistido.
