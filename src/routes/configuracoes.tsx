import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="h-song">Configurações</h1>
        <p className="text-muted-foreground">Personalize a aparência do PDF e do sistema.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { t: "Cabeçalho do PDF", d: "Logo, nome da igreja e do ministério" },
          { t: "Margens e escala", d: "A4, Carta, A5 ou personalizado" },
          { t: "Numeração", d: "Página, data e rodapé" },
          { t: "Perfil", d: "Nome, e-mail e ministério" },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border border-border bg-card p-6">
            <div className="text-[16px] font-semibold">{x.t}</div>
            <div className="text-[14px] text-muted-foreground">{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  ),
});
