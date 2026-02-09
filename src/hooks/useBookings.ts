import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { bookingsApi } from "@/lib/api";
import { MeetingBooking } from "@/types/reuniao";

interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
  meetingTypeId?: string;
}

export function useBookings(initialFilters?: BookingFilters) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BookingFilters>(initialFilters || {});

  const { 
    data: bookings = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<MeetingBooking[]>({
    queryKey: ["/api/bookings", filters],
    queryFn: async () => {
      const response = await bookingsApi.list(filters);
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reason 
    }: { 
      id: string; 
      status: string; 
      reason?: string 
    }) => {
      const response = await bookingsApi.updateStatus(id, status, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await bookingsApi.cancel(id, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await bookingsApi.addNote(id, notes);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const updateFilters = useCallback((newFilters: Partial<BookingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const getBookingById = useCallback((id: string) => {
    return bookings.find(b => b.id === id);
  }, [bookings]);

  const getBookingsByStatus = useCallback((status: MeetingBooking['status']) => {
    return bookings.filter(b => b.status === status);
  }, [bookings]);

  const getUpcomingBookings = useCallback(() => {
    const now = new Date();
    return bookings
      .filter(b => new Date(b.scheduledDateTime) > now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  }, [bookings]);

  const getPastBookings = useCallback(() => {
    const now = new Date();
    return bookings
      .filter(b => new Date(b.scheduledDateTime) <= now || b.status === 'completed')
      .sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());
  }, [bookings]);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    noShow: bookings.filter(b => b.status === 'no_show').length,
  };

  return {
    bookings,
    isLoading,
    error,
    refetch,

    filters,
    updateFilters,
    clearFilters,

    updateBookingStatus: (id: string, status: string, reason?: string) => 
      updateStatusMutation.mutateAsync({ id, status, reason }),
    cancelBooking: (id: string, reason?: string) => 
      cancelMutation.mutateAsync({ id, reason }),
    addNote: (id: string, notes: string) => 
      addNoteMutation.mutateAsync({ id, notes }),

    isUpdating: updateStatusMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isAddingNote: addNoteMutation.isPending,

    updateError: updateStatusMutation.error,
    cancelError: cancelMutation.error,

    getBookingById,
    getBookingsByStatus,
    getUpcomingBookings,
    getPastBookings,
    stats,
  };
}

export function useBooking(id: string | null) {
  const queryClient = useQueryClient();

  const { 
    data: booking, 
    isLoading, 
    error,
    refetch 
  } = useQuery<MeetingBooking>({
    queryKey: ["/api/bookings", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await bookingsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      if (!id) throw new Error("ID is required");
      const response = await bookingsApi.updateStatus(id, status, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!id) throw new Error("ID is required");
      const response = await bookingsApi.cancel(id, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  return {
    booking,
    isLoading,
    error,
    refetch,

    updateStatus: (status: string, reason?: string) => 
      updateStatusMutation.mutateAsync({ status, reason }),
    cancel: (reason?: string) => 
      cancelMutation.mutateAsync(reason),

    isUpdating: updateStatusMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
