import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OriginalCircle } from "./OriginalCircle";
import { ChromaticScale } from "./ChromaticScale";
import { HarmonicField } from "./HarmonicField";

type Props = {
  currentKey: string;
  onSelectKey: (k: string) => void;
  className?: string;
};

/**
 * HarmonyTabs — Ciclo original (Quintas/Quartas com 3 anéis) + módulos separados
 * para Escala Cromática e Campo Harmônico.
 */
export function HarmonyTabs({ currentKey, onSelectKey, className }: Props) {
  const [tab, setTab] = useState("circle");
  return (
    <div className={className ?? "w-[380px] flex flex-col gap-3"}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="circle" className="text-[11px]">Ciclo</TabsTrigger>
          <TabsTrigger value="chromatic" className="text-[11px]">Cromática</TabsTrigger>
          <TabsTrigger value="field" className="text-[11px]">Campo</TabsTrigger>
        </TabsList>
        <TabsContent value="circle" className="mt-3">
          <OriginalCircle currentKey={currentKey} onSelectKey={onSelectKey} />
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
