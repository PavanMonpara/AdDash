import { create } from "zustand";
import { useGlobalLoaderType } from "../types"

export const useGlobalLoader = create<useGlobalLoaderType>((set) => ({
  isLoading: false,
  setIsLoading: (value: boolean) => set(() => ({ isLoading: value })),
}));
