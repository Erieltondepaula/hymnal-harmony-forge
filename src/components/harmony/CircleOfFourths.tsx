import { TwoRingWheel, FIFTHS_MAJORS, FIFTHS_MINORS } from "./TwoRingWheel";

type Props = { currentKey: string; onSelectKey: (k: string) => void };

/**
 * Ciclo das Quartas — mesma estrutura do Ciclo das Quintas, porém em sentido
 * anti-horário (C → F → B♭ → E♭ → …). C permanece no topo.
 */
export function CircleOfFourths({ currentKey, onSelectKey }: Props) {
  // Reverse everything except index 0 to flip direction while keeping C on top.
  const reorder = <T,>(arr: T[]): T[] => [arr[0], ...arr.slice(1).slice().reverse()];
  const majors = reorder(FIFTHS_MAJORS);
  const minors = reorder(FIFTHS_MINORS);
  const slots = majors.map((maj, i) => ({
    outer: maj.display,
    outerValue: maj.value,
    inner: minors[i].display,
    innerValue: minors[i].value,
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
        Sentido inverso do Ciclo das Quintas: C → F → B♭ → E♭ …
      </p>
    </div>
  );
}
