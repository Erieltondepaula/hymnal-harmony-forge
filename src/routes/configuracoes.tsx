import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { usePreferences, type PageSize, DEFAULT_CHORD_COLORS } from "@/lib/preferences-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  const prefs = usePreferences();
  const [saved, setSaved] = useState(false);

  const flash = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 900);
  };

  const set = <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => {
    prefs.update({ [k]: v } as Partial<typeof prefs>);
    flash();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="h-song">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize a aparência do PDF e do sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex items-center gap-1 text-[13px] transition-opacity",
              saved ? "text-success opacity-100" : "opacity-0",
            )}
          >
            <Check className="h-4 w-4" /> Salvo
          </span>
          <button
            type="button"
            onClick={() => {
              if (confirm("Restaurar todas as configurações para o padrão?")) {
                prefs.reset();
                flash();
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cabeçalho do PDF */}
        <Card
          title="Cabeçalho do PDF"
          desc="Logo, nome da igreja e do ministério"
        >
          <Toggle
            label="Exibir cabeçalho no PDF"
            checked={prefs.showPdfHeader}
            onChange={(v) => set("showPdfHeader", v)}
          />
          <Field label="Nome da igreja">
            <input
              value={prefs.churchName}
              onChange={(e) => set("churchName", e.target.value)}
              placeholder="Ex.: Igreja Central"
              className="input"
            />
          </Field>
          <Field label="Nome do ministério">
            <input
              value={prefs.ministryName}
              onChange={(e) => set("ministryName", e.target.value)}
              placeholder="Ex.: Ministério de Louvor"
              className="input"
            />
          </Field>
          <Field label="URL da logo (opcional)">
            <input
              value={prefs.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </Field>
          {prefs.logoUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <img
                src={prefs.logoUrl}
                alt="Prévia da logo"
                className="h-10 w-10 rounded object-contain bg-white"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-[12px] text-muted-foreground">
                Prévia da logo
              </span>
            </div>
          ) : null}
        </Card>

        {/* Margens e escala */}
        <Card
          title="Margens e escala"
          desc="A4, Carta, A5 ou personalizado"
        >
          <Field label="Tamanho do papel">
            <select
              value={prefs.pageSize}
              onChange={(e) => set("pageSize", e.target.value as PageSize)}
              className="input"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Carta">Carta (216 × 279 mm)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
              <option value="custom">Personalizado</option>
            </select>
          </Field>
          {prefs.pageSize === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Largura (mm)">
                <input
                  type="number"
                  min={50}
                  max={500}
                  value={prefs.customWidthMm}
                  onChange={(e) =>
                    set("customWidthMm", Number(e.target.value) || 210)
                  }
                  className="input"
                />
              </Field>
              <Field label="Altura (mm)">
                <input
                  type="number"
                  min={50}
                  max={800}
                  value={prefs.customHeightMm}
                  onChange={(e) =>
                    set("customHeightMm", Number(e.target.value) || 297)
                  }
                  className="input"
                />
              </Field>
            </div>
          ) : null}
          <Field label={`Margem (${prefs.marginMm} mm)`}>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={prefs.marginMm}
              onChange={(e) => set("marginMm", Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <Toggle
            label="Ajustar automaticamente em 1 página"
            checked={prefs.fitToOnePage}
            onChange={(v) => set("fitToOnePage", v)}
          />
        </Card>

        {/* Numeração */}
        <Card
          title="Numeração"
          desc="Página, data e rodapé"
        >
          <Toggle
            label="Exibir número da página"
            checked={prefs.showPageNumber}
            onChange={(v) => set("showPageNumber", v)}
          />
          <Toggle
            label="Exibir data de geração"
            checked={prefs.showDate}
            onChange={(v) => set("showDate", v)}
          />
          <Field label="Texto do rodapé">
            <input
              value={prefs.footerText}
              onChange={(e) => set("footerText", e.target.value)}
              placeholder="Ex.: Gerado por MapaLouvor"
              className="input"
            />
          </Field>
        </Card>

        {/* Perfil */}
        <Card title="Perfil" desc="Nome, e-mail e ministério">
          <Field label="Seu nome (aparece em 'Olá, ...')">
            <input
              value={prefs.userName}
              onChange={(e) => set("userName", e.target.value)}
              placeholder="Ex.: João"
              className="input"
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={prefs.userEmail}
              onChange={(e) => set("userEmail", e.target.value)}
              placeholder="voce@exemplo.com"
              className="input"
            />
          </Field>
          <Field label="Ministério">
            <input
              value={prefs.ministry}
              onChange={(e) => set("ministry", e.target.value)}
              placeholder="Ex.: Louvor e Adoração"
              className="input"
            />
          </Field>
        </Card>

      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="text-[13px] text-muted-foreground">{desc}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
      <span className="text-[14px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}
