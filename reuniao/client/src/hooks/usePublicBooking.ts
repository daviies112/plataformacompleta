import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { publicApi } from "@/lib/api";
import { 
  PublicMeetingData, 
  TimeSlot, 
  CreateBookingRequest, 
  CreateBookingResponse 
} from "@/types/reuniao";

interface UsePublicBookingOptions {
  company: string;
  slug: string;
}

export function usePublicBooking({ company, slug }: UsePublicBookingOptions) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { 
    data: meetingData, 
    isLoading: isMeetingLoading, 
    error: meetingError 
  } = useQuery<PublicMeetingData>({
    queryKey: ["/api/public/agendar", company, slug],
    queryFn: async () => {
      const response = await publicApi.getMeeting(company, slug);
      return response.data;
    },
    enabled: !!company && !!slug,
    staleTime: 60 * 1000,
  });

  const { 
    data: availableSlots = [], 
    isLoading: isSlotsLoading, 
    error: slotsError,
    refetch: refetchSlots
  } = useQuery<TimeSlot[]>({
    queryKey: ["/api/public/agendar", company, slug, "slots", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const response = await publicApi.getAvailableSlots(company, slug, selectedDate);
      return response.data;
    },
    enabled: !!company && !!slug && !!selectedDate,
    staleTime: 30 * 1000,
  });

  const bookingMutation = useMutation<CreateBookingResponse, Error, Omit<CreateBookingRequest, 'meetingTypeId'>>({
    mutationFn: async (data) => {
      const response = await publicApi.createBooking(company, slug, data);
      return response.data;
    },
  });

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const handleSelectTime = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  const submitBooking = useCallback(async (answers: Record<string, any>) => {
    if (!selectedDate || !selectedTime) {
      throw new Error("Data e horário são obrigatórios");
    }

    const bookingData: Omit<CreateBookingRequest, 'meetingTypeId'> = {
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      answers,
    };

    return bookingMutation.mutateAsync(bookingData);
  }, [selectedDate, selectedTime, bookingMutation]);

  const resetSelection = useCallback(() => {
    setSelectedDate(null);
    setSelectedTime(null);
  }, []);

  return {
    meetingData,
    meeting: meetingData?.meeting,
    tenant: meetingData?.tenant,
    availableDates: meetingData?.availableDates || [],

    selectedDate,
    selectedTime,
    availableSlots,

    selectDate: handleSelectDate,
    selectTime: handleSelectTime,
    submitBooking,
    resetSelection,
    refetchSlots,

    isLoading: isMeetingLoading,
    isSlotsLoading,
    isSubmitting: bookingMutation.isPending,

    error: meetingError,
    slotsError,
    submitError: bookingMutation.error,

    bookingResult: bookingMutation.data,
    isBookingSuccess: bookingMutation.isSuccess,
  };
}

export function useBookingConfirmation(bookingId: string | null) {
  const { 
    data: confirmation, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/public/booking", bookingId, "confirmation"],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID is required");
      const response = await publicApi.getConfirmation(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
  });

  return {
    confirmation,
    isLoading,
    error,
  };
}
