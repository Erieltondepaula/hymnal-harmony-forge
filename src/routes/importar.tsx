import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/importar")({
  component: () => (
    <div className="space-y-4">
      <h1 className="h-song">Importar</h1>
      <p className="text-muted-foreground">
        Use a tela <a className="text-primary hover:underline" href="/novo">Novo Mapa</a> para importar cifras.
      </p>
    </div>
  ),
});
