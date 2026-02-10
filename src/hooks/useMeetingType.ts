import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingTypesApi } from "@/lib/api";
import { MeetingType } from "@/types/reuniao";
import { useMeetingStore } from "@/stores/meetingStore";

export function useMeetingType(id?: string) {
  const queryClient = useQueryClient();
  const { setSelectedMeetingType } = useMeetingStore();

  const { 
    data: meetingTypes = [], 
    isLoading: listLoading, 
    error: listError,
    refetch: refetchList
  } = useQuery<MeetingType[]>({
    queryKey: ["/api/meeting-types"],
    queryFn: async () => {
      const response = await meetingTypesApi.list();
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const { 
    data: meetingType, 
    isLoading: meetingTypeLoading, 
    error: meetingTypeError 
  } = useQuery<MeetingType>({
    queryKey: ["/api/meeting-types", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await meetingTypesApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<MeetingType>) => {
      const response = await meetingTypesApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MeetingType> }) => {
      const response = await meetingTypesApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await meetingTypesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      await meetingTypesApi.publish(id, isPublic);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types", id] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await meetingTypesApi.duplicate(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
    },
  });

  return {
    meetingTypes,
    meetingType,
    loading: listLoading || meetingTypeLoading,
    error: listError || meetingTypeError,

    createMeetingType: (data: Partial<MeetingType>) => createMutation.mutateAsync(data),
    updateMeetingType: (id: string, data: Partial<MeetingType>) => 
      updateMutation.mutateAsync({ id, data }),
    deleteMeetingType: (id: string) => deleteMutation.mutateAsync(id),
    publishMeetingType: (id: string, isPublic: boolean) => 
      publishMutation.mutateAsync({ id, isPublic }),
    duplicateMeetingType: (id: string) => duplicateMutation.mutateAsync(id),

    selectMeetingType: setSelectedMeetingType,
    refetch: refetchList,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDuplicating: duplicateMutation.isPending,

    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}
