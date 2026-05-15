import type { SiteUpdate } from "@agriwatch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSite } from "../api/sites.api.ts";
import { sitesQueryKey } from "./use-sites.ts";

export function useUpdateSiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SiteUpdate }) => updateSite(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    },
  });
}
