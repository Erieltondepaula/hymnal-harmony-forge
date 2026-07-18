import { cn } from "@/lib/utils";
import { noteToPc } from "@/lib/theory";

type Props = { currentKey: string; onSelectKey: (k: string) => void };

const CHROMATIC: Array<{ sharp: string; flat: string; value: string }> = [
  { sharp: "C",  flat: "C",  value: "C"  },
  { sharp: "C♯", flat: "D♭", value: "C#" },
  { sharp: "D",  flat: "D",  value: "D"  },
  { sharp: "D♯", flat: "E♭", value: "D#" },
  { sharp: "E",  flat: "E",  value: "E"  },
  { sharp: "F",  flat: "F",  value: "F"  },
  { sharp: "F♯", flat: "G♭", value: "F#" },
  { sharp: "G",  flat: "G",  value: "G"  },
  { sharp: "G♯", flat: "A♭", value: "G#" },
  { sharp: "A",  flat: "A",  value: "A"  },
  { sharp: "A♯", flat: "B♭", value: "A#" },
  { sharp: "B",  flat: "B",  value: "B"  },
];

/**
 * Escala cromática — os 12 sons em faixa horizontal, com dupla grafia
 * (♯ e ♭) nas notas alteradas. Todos clicáveis.
 */
export function ChromaticScale({ currentKey, onSelectKey }: Props) {
  const isMinor = currentKey.endsWith("m") && !currentKey.endsWith("dim");
  const rootName = isMinor ? currentKey.slice(0, -1) : currentKey;
  const currentPc = noteToPc(rootName);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {CHROMATIC.map((n, i) => {
          const active = currentPc === i;
          const hasAlt = n.sharp !== n.flat;
          return (
            <button
              key={n.value}
              onClick={() => onSelectKey(isMinor ? n.value + "m" : n.value)}
              className={cn(
                "flex flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              <span className="text-sm font-bold">{n.sharp}</span>
              {hasAlt && <span className="text-[10px] opacity-70">{n.flat}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        Os 12 sons — clique em qualquer um para defini-lo como Tom Atual
        (mantém maior/menor conforme o tom já selecionado).
      </p>
    </div>
  );
}
