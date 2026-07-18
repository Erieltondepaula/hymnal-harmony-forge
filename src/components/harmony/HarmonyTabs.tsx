import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CircleOfFifths } from "./CircleOfFifths";
import { CircleOfFifthsMinor } from "./CircleOfFifthsMinor";
import { CircleOfFourths } from "./CircleOfFourths";
import { ChromaticScale } from "./ChromaticScale";
import { HarmonicField } from "./HarmonicField";

type Props = {
  currentKey: string;
  onSelectKey: (k: string) => void;
  className?: string;
};

/**
 * HarmonyTabs — wrapper com 4 conceitos separados, cada aba um único tópico.
 * Ciclo das Quintas | Quartas | Cromática | Campo Harmônico.
 */
export function HarmonyTabs({ currentKey, onSelectKey, className }: Props) {
  const [tab, setTab] = useState("fifths");
  return (
    <div className={className ?? "w-[380px] flex flex-col gap-3"}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fifths" className="text-[11px]">Quintas</TabsTrigger>
          <TabsTrigger value="fourths" className="text-[11px]">Quartas</TabsTrigger>
          <TabsTrigger value="chromatic" className="text-[11px]">Cromática</TabsTrigger>
          <TabsTrigger value="field" className="text-[11px]">Campo</TabsTrigger>
        </TabsList>
        <TabsContent value="fifths" className="mt-3 space-y-3">
          <CircleOfFifths currentKey={currentKey} onSelectKey={onSelectKey} />
          <details className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px]">
            <summary className="cursor-pointer font-semibold text-muted-foreground">
              Ver Ciclo das Quintas (perspectiva menor)
            </summary>
            <div className="mt-3">
              <CircleOfFifthsMinor currentKey={currentKey} onSelectKey={onSelectKey} />
            </div>
          </details>
        </TabsContent>
        <TabsContent value="fourths" className="mt-3">
          <CircleOfFourths currentKey={currentKey} onSelectKey={onSelectKey} />
        </TabsContent>
        <TabsContent value="chromatic" className="mt-3">
          <ChromaticScale currentKey={currentKey} onSelectKey={onSelectKey} />
        </TabsContent>
        <TabsContent value="field" className="mt-3">
          <HarmonicField currentKey={currentKey} onSelectKey={onSelectKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
