import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PageSize = "A4" | "Carta" | "A5" | "custom";

export type Preferences = {
  // Perfil
  userName: string;
  userEmail: string;
  ministry: string;

  // Cabeçalho do PDF
  showPdfHeader: boolean;
  churchName: string;
  ministryName: string;
  logoUrl: string;

  // Margens e escala
  pageSize: PageSize;
  customWidthMm: number;
  customHeightMm: number;
  marginMm: number;
  fitToOnePage: boolean;

  // Numeração / rodapé
  showPageNumber: boolean;
  showDate: boolean;
  footerText: string;
};

const DEFAULTS: Preferences = {
  userName: "João",
  userEmail: "",
  ministry: "",

  showPdfHeader: false,
  churchName: "",
  ministryName: "",
  logoUrl: "",

  pageSize: "A4",
  customWidthMm: 210,
  customHeightMm: 297,
  marginMm: 12,
  fitToOnePage: true,

  showPageNumber: false,
  showDate: false,
  footerText: "Gerado por MapaLouvor",
};

type State = Preferences & {
  update: (patch: Partial<Preferences>) => void;
  reset: () => void;
};

export const usePreferences = create<State>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set(() => ({ ...DEFAULTS })),
    }),
    { name: "mapalouvor-preferences-v1" },
  ),
);

export function pageDimensionsMm(prefs: Preferences): { w: number; h: number } {
  switch (prefs.pageSize) {
    case "A4":
      return { w: 210, h: 297 };
    case "Carta":
      return { w: 216, h: 279 };
    case "A5":
      return { w: 148, h: 210 };
    case "custom":
      return { w: prefs.customWidthMm, h: prefs.customHeightMm };
  }
}
