import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BillingState {
  initialized: boolean;
  setInitialized: (value: boolean) => void;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set) => ({
      initialized: false,
      setInitialized: (value) => set({ initialized: value }),
    }),
    {
      name: 'billing-storage',
    }
  )
);
