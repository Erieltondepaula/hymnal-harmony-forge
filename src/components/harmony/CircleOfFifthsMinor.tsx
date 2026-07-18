import { TwoRingWheel, FIFTHS_MAJORS, FIFTHS_MINORS } from "./TwoRingWheel";

type Props = { currentKey: string; onSelectKey: (k: string) => void };

/**
 * Ciclo das Quintas (Menor) — anel externo com as menores em ordem de quintas
 * (Am no topo), anel interno com as relativas maiores.
 */
export function CircleOfFifthsMinor({ currentKey, onSelectKey }: Props) {
  const slots = FIFTHS_MINORS.map((min, i) => ({
    outer: min.display,
    outerValue: min.value,
    inner: FIFTHS_MAJORS[i].display,
    innerValue: FIFTHS_MAJORS[i].value,
  }));
  const isMinor = currentKey.endsWith("m") && !currentKey.endsWith("dim");
  return (
    <div className="flex flex-col items-center gap-2">
      <TwoRingWheel
        slots={slots}
        activeOuter={isMinor ? currentKey : undefined}
        activeInner={!isMinor ? currentKey : undefined}
        onSelect={onSelectKey}
        outerLabel="menores"
        innerLabel="relativas Maiores"
      />
      <p className="text-center text-[11px] leading-snug text-muted-foreground max-w-[300px]">
        Perspectiva menor — Am no topo, Em à direita, seguindo quintas.
      </p>
    </div>
  );
}
