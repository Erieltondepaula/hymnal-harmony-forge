import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ajuda")({
  component: () => (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="h-song">Ajuda</h1>
        <p className="text-muted-foreground">Guia rápido para montar seu primeiro mapa musical.</p>
      </div>
      <ol className="space-y-4">
        {[
          "Clique em Novo Mapa e envie sua cifra (PDF, imagem ou texto).",
          "Aguarde a IA analisar a estrutura e montar o mapa automaticamente.",
          "Ajuste tom, BPM e detalhes no editor — o preview atualiza em tempo real.",
          "Exporte em PDF ou compartilhe com sua banda.",
        ].map((step, i) => (
          <li key={i} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {i + 1}
            </div>
            <div className="pt-1 text-[15px]">{step}</div>
          </li>
        ))}
      </ol>
    </div>
  ),
});
