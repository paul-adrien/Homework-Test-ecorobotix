import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSite } from "../api/sites.api.ts";
import { sitesQueryKey } from "./use-sites.ts";

export function useDeleteSiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    },
  });
}
