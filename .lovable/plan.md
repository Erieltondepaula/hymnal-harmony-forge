## Objetivo

Consolidar e validar 100% a base teórica antes de avançar. Restaurar o Ciclo das Quintas original (visual/comportamento simples e intuitivo) e dividir os conceitos misturados no atual `HarmonyPanel` em **4 módulos independentes**, cada um com uma única responsabilidade.

Nenhuma mudança em dicionário de acordes, piano, violão, áudio ou drawer harmônico nesta etapa — isso fica reservado para as Fases 5-6.

## Arquitetura dos módulos

Cada módulo é um componente isolado em `src/components/harmony/`, consumindo o mesmo motor `src/lib/theory/` (já criado nas Fases 1-4). Recebe `currentKey` + `onSelectKey` e nada mais.

```text
src/components/harmony/
  CircleOfFifths.tsx      -> Ciclo das Quintas (Maior)      [restaurado]
  CircleOfFifthsMinor.tsx -> Ciclo das Quintas (Menor)      [novo]
  CircleOfFourths.tsx     -> Ciclo das Quartas              [novo]
  ChromaticScale.tsx      -> Escala cromática 12 sons       [novo]
  HarmonicField.tsx       -> Campo harmônico + escala + armadura  [extraído]
  HarmonyTabs.tsx         -> Wrapper com abas (Quintas | Quartas | Cromática | Campo)
```

O `HarmonicCircle.tsx` atual passa a re-exportar o `HarmonyTabs` para preservar imports existentes no editor.

## Detalhamento por módulo

**1. Ciclo das Quintas (Maior) — restaurado**
Layout circular simples da primeira versão: 12 tonalidades maiores no anel externo, relativas menores no anel interno. Sem anel de diminutos. Destaque do tom atual e das funções I/IV/V/vi ao redor. Clique em qualquer segmento define o tom.

**2. Ciclo das Quintas (Menor) — novo**
Mesma estrutura visual, mas centrado na perspectiva menor: menores no anel externo (ordem de quintas Am → Em → Bm...), relativos maiores no interno.

**3. Ciclo das Quartas — novo**
Ordem inversa (C → F → B♭ → E♭...). Mesmo layout de dois anéis, para servir de espelho didático do Ciclo das Quintas.

**4. Escala Cromática — novo**
Faixa horizontal (não circular) com os 12 sons, mostrando ambas as grafias (♯ e ♭) para as notas alteradas: C, C♯/D♭, D, D♯/E♭, E, F, F♯/G♭, G, G♯/A♭, A, A♯/B♭, B. Todos clicáveis; o tom atual fica destacado.

**5. Campo Harmônico — extraído do painel atual**
Seção separada com: seletor de modo (Maior / Menor Natural / Harmônica / Melódica), notação (Auto/♯/♭), escala, armadura, relativo, 7 graus com números romanos e funções (Tônica, Supertônica, ..., Sensível). Já existe no motor `harmonicField()` — só é reorganizado para ficar sozinho.

## Wrapper com abas

O `HarmonyTabs.tsx` usa `Tabs` do shadcn com 4 abas (Quintas / Quartas / Cromática / Campo). Cada aba renderiza um único módulo. Isso substitui a barra de botões atual (modo + notação + direção) que sobrecarrega visualmente o painel.

Modo e notação passam a viver **dentro** do módulo Campo Harmônico (onde realmente fazem sentido), não como controles globais.

## Validação teórica

Adicionar `src/lib/theory/__tests__/theory.test.ts` cobrindo:

- Escala cromática: 12 sons, com grafias ♯ e ♭
- Escalas Maior, Menor Natural, Harmônica, Melódica em C, G, F, F♯, G♭, B, A♭ (sem misturar acidentes)
- Campos harmônicos: qualidade de cada tríade em maior (I ii iii IV V vi vii°), menor natural (i ii° III iv v VI VII), harmônica (i ii° III+ iv V VI vii°), melódica (i ii III+ IV V vi° vii°)
- Armaduras de clave: 0 a 7 ♯/♭ em maior e relativas menores
- Todas 17 tonalidades clicáveis: C, C♯, D♭, D, D♯, E♭, E, F, F♯, G♭, G, G♯, A♭, A, A♯, B♭, B

Rodar com `bunx vitest run` para confirmar aprovação total antes de fechar a etapa.

## Ordem de execução

1. Criar `src/components/harmony/CircleOfFifths.tsx` (restaurar layout original de 2 anéis).
2. Criar `CircleOfFifthsMinor.tsx`, `CircleOfFourths.tsx`, `ChromaticScale.tsx`, `HarmonicField.tsx`.
3. Criar `HarmonyTabs.tsx` (wrapper com 4 abas).
4. Reescrever `src/components/HarmonicCircle.tsx` como reexport de `HarmonyTabs` (mantém `HarmonyPanel` e `HarmonicCircle` como aliases).
5. Adicionar testes `src/lib/theory/__tests__/theory.test.ts` e rodar.
6. Corrigir qualquer divergência encontrada no motor.

## Fora de escopo (Fases 5-6, adiadas)

Dicionário de acordes, diagramas de piano/violão, áudio, drawer harmônico ao clicar em acorde da música, progressões sugeridas. Nada disso será tocado agora.

Confirma que posso implementar exatamente assim?
