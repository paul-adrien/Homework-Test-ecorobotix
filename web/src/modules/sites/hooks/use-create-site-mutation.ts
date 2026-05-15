import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSite } from "../api/sites.api.ts";
import { sitesQueryKey } from "./use-sites.ts";

export function useCreateSiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    },
  });
}
