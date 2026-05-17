import type { SitePublic } from "@agriwatch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSite } from "../api/sites.api.ts";
import { sitesQueryKey } from "./use-sites.ts";

export function useCreateSiteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSite,
    onSuccess: (newSite) => {
      // Optimistically append the new site to the cached list so any
      // consumer that selects it right after (e.g. the dashboard
      // auto-switching to the new site) finds it in `useSites().data` on
      // the next render — without this, the dashboard's
      // "selected site no longer exists" effect would fire during the
      // brief window before the refetch lands and fall back to sites[0].
      queryClient.setQueryData<SitePublic[]>(sitesQueryKey, (old) =>
        old ? [...old, newSite] : [newSite],
      );
      queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    },
  });
}
