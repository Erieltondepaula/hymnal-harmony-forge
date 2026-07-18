import { TwoRingWheel, FIFTHS_MAJORS, FIFTHS_MINORS } from "./TwoRingWheel";

type Props = { currentKey: string; onSelectKey: (k: string) => void };

/**
 * Ciclo das Quintas (Maior) — layout clássico:
 *   anel externo = tonalidades maiores (ordem de quintas, C no topo),
 *   anel interno = relativas menores.
 */
export function CircleOfFifths({ currentKey, onSelectKey }: Props) {
  const slots = FIFTHS_MAJORS.map((maj, i) => ({
    outer: maj.display,
    outerValue: maj.value,
    inner: FIFTHS_MINORS[i].display,
    innerValue: FIFTHS_MINORS[i].value,
  }));
  const isMinor = currentKey.endsWith("m") && !currentKey.endsWith("dim");
  return (
    <div className="flex flex-col items-center gap-2">
      <TwoRingWheel
        slots={slots}
        activeOuter={!isMinor ? currentKey : undefined}
        activeInner={isMinor ? currentKey : undefined}
        onSelect={onSelectKey}
        outerLabel="Maiores"
        innerLabel="relativas menores"
      />
      <p className="text-center text-[11px] leading-snug text-muted-foreground max-w-[300px]">
        Clique em qualquer tom para defini-lo como Tom Atual.
      </p>
    </div>
  );
}
