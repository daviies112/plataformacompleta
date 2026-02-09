import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MeetingType, MeetingBooking } from '@/types/reuniao';
import { meetingTypesApi, bookingsApi } from '@/lib/api';

interface MeetingState {
  meetingTypes: MeetingType[];
  selectedMeetingType: MeetingType | null;
  bookings: MeetingBooking[];
  isLoading: boolean;
  error: string | null;

  setSelectedMeetingType: (meetingType: MeetingType | null) => void;
  clearError: () => void;

  fetchMeetingTypes: () => Promise<void>;
  createMeetingType: (data: Partial<MeetingType>) => Promise<MeetingType>;
  updateMeetingType: (id: string, data: Partial<MeetingType>) => Promise<MeetingType>;
  deleteMeetingType: (id: string) => Promise<void>;
  publishMeetingType: (id: string, isPublic: boolean) => Promise<void>;

  fetchBookings: (params?: { status?: string; from?: string; to?: string; meetingTypeId?: string }) => Promise<void>;
  updateBookingStatus: (id: string, status: string, reason?: string) => Promise<void>;
  cancelBooking: (id: string, reason?: string) => Promise<void>;
}

export const useMeetingStore = create<MeetingState>()(
  persist(
    (set, get) => ({
      meetingTypes: [],
      selectedMeetingType: null,
      bookings: [],
      isLoading: false,
      error: null,

      setSelectedMeetingType: (meetingType) => set({ selectedMeetingType: meetingType }),
      clearError: () => set({ error: null }),

      fetchMeetingTypes: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await meetingTypesApi.list();
          set({ meetingTypes: response.data, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao carregar tipos de reunião',
            isLoading: false 
          });
          throw error;
        }
      },

      createMeetingType: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await meetingTypesApi.create(data);
          const newMeetingType = response.data;
          set((state) => ({ 
            meetingTypes: [...state.meetingTypes, newMeetingType],
            isLoading: false 
          }));
          return newMeetingType;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao criar tipo de reunião',
            isLoading: false 
          });
          throw error;
        }
      },

      updateMeetingType: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await meetingTypesApi.update(id, data);
          const updatedMeetingType = response.data;
          set((state) => ({
            meetingTypes: state.meetingTypes.map((mt) => 
              mt.id === id ? updatedMeetingType : mt
            ),
            selectedMeetingType: state.selectedMeetingType?.id === id 
              ? updatedMeetingType 
              : state.selectedMeetingType,
            isLoading: false
          }));
          return updatedMeetingType;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao atualizar tipo de reunião',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteMeetingType: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await meetingTypesApi.delete(id);
          set((state) => ({
            meetingTypes: state.meetingTypes.filter((mt) => mt.id !== id),
            selectedMeetingType: state.selectedMeetingType?.id === id 
              ? null 
              : state.selectedMeetingType,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao excluir tipo de reunião',
            isLoading: false 
          });
          throw error;
        }
      },

      publishMeetingType: async (id, isPublic) => {
        set({ isLoading: true, error: null });
        try {
          await meetingTypesApi.publish(id, isPublic);
          set((state) => ({
            meetingTypes: state.meetingTypes.map((mt) => 
              mt.id === id ? { ...mt, isPublic } : mt
            ),
            selectedMeetingType: state.selectedMeetingType?.id === id 
              ? { ...state.selectedMeetingType, isPublic } 
              : state.selectedMeetingType,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao publicar tipo de reunião',
            isLoading: false 
          });
          throw error;
        }
      },

      fetchBookings: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const response = await bookingsApi.list(params);
          set({ bookings: response.data, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao carregar agendamentos',
            isLoading: false 
          });
          throw error;
        }
      },

      updateBookingStatus: async (id, status, reason) => {
        set({ isLoading: true, error: null });
        try {
          await bookingsApi.updateStatus(id, status, reason);
          set((state) => ({
            bookings: state.bookings.map((b) => 
              b.id === id ? { ...b, status: status as MeetingBooking['status'] } : b
            ),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao atualizar status do agendamento',
            isLoading: false 
          });
          throw error;
        }
      },

      cancelBooking: async (id, reason) => {
        set({ isLoading: true, error: null });
        try {
          await bookingsApi.cancel(id, reason);
          set((state) => ({
            bookings: state.bookings.map((b) => 
              b.id === id ? { ...b, status: 'cancelled', cancellationReason: reason || null } : b
            ),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Erro ao cancelar agendamento',
            isLoading: false 
          });
          throw error;
        }
      },
    }),
    {
      name: 'meeting-store',
      partialize: (state) => ({
        meetingTypes: state.meetingTypes,
        selectedMeetingType: state.selectedMeetingType,
      }),
    }
  )
);
