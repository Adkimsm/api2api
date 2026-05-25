import { createContext, useContext } from "react";
import type { Config, Model, Provider, StatusKind } from "../types";

export interface AdminDataValue {
  providers: Provider[];
  models: Model[];
  config: Config | null;
  loading: boolean;
  reload: () => Promise<void>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  showStatus: (text: string, kind?: StatusKind) => void;
}

export const AdminDataContext = createContext<AdminDataValue | null>(null);

export function useAdminData(): AdminDataValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used inside AdminDataContext");
  return ctx;
}
