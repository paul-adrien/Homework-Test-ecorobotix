import type { GeocodingResult, SitePublic } from "@agriwatch/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toServerErrorMessage } from "@/shared/api/api-error.ts";
import { Alert, AlertDescription } from "@/shared/ui/alert.tsx";
import { Button } from "@/shared/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog.tsx";
import { FormError, FormField } from "@/shared/ui/field.tsx";
import { Input } from "@/shared/ui/input.tsx";
import { Label } from "@/shared/ui/label.tsx";
import { useCreateSiteMutation } from "../hooks/use-create-site-mutation.ts";
import { LatLngInput } from "./lat-lng-input.tsx";
import { SiteSearchInput } from "./site-search-input.tsx";

type Mode = "search" | "coordinates";

type CreateSiteDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When set, the dialog opens with this location already selected — used by
   * the empty state's "Use my current location" flow which has already
   * reverse-geocoded the agent's position.
   */
  initialLocation?: GeocodingResult;
  onSuccess?: (site: SitePublic) => void;
}>;

const labelFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "A label is required.")
    .max(80, "Label is too long (max 80 characters)."),
});

type LabelForm = z.infer<typeof labelFormSchema>;

export function CreateSiteDialog({
  open,
  onOpenChange,
  initialLocation,
  onSuccess,
}: CreateSiteDialogProps) {
  const [mode, setMode] = useState<Mode>("search");
  const [selected, setSelected] = useState<GeocodingResult | null>(null);
  const createMutation = useCreateSiteMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LabelForm>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: { label: "" },
  });

  // Reset state every time the dialog opens — we intentionally watch only
  // `open` so the user's in-progress edits aren't wiped on every parent
  // re-render. Initial values are snapshotted at open time.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open-time snapshot
  useEffect(() => {
    if (open) {
      setMode(initialLocation ? "coordinates" : "search");
      setSelected(initialLocation ?? null);
      reset({ label: initialLocation?.name ?? "" });
      createMutation.reset();
    }
  }, [open]);

  function handleSelectLocation(result: GeocodingResult) {
    setSelected(result);
    // Pre-fill the label with the location name only if the user hasn't started typing.
    setValue("label", result.name, { shouldDirty: false, shouldValidate: true });
  }

  const submit = handleSubmit((values) => {
    if (!selected) return;
    createMutation.mutate(
      {
        label: values.label.trim(),
        latitude: selected.latitude,
        longitude: selected.longitude,
        displayName: selected.displayName,
        countryCode: selected.countryCode ?? undefined,
        timezone: selected.timezone ?? undefined,
      },
      {
        onSuccess: (site) => {
          onOpenChange(false);
          onSuccess?.(site);
        },
      },
    );
  });

  const serverError = toServerErrorMessage(createMutation.error);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a site</DialogTitle>
          <DialogDescription>
            Search for a place, or enter coordinates directly if the site doesn't match a known
            town.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div
            role="tablist"
            aria-label="Site location input mode"
            className="inline-flex w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-alt)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "search"}
              onClick={() => setMode("search")}
              className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
                mode === "search"
                  ? "bg-[var(--color-surface)] font-medium text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Search by name
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "coordinates"}
              onClick={() => setMode("coordinates")}
              className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
                mode === "coordinates"
                  ? "bg-[var(--color-surface)] font-medium text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Enter coordinates
            </button>
          </div>

          {mode === "search" ? (
            <SiteSearchInput onSelect={handleSelectLocation} autoFocus />
          ) : (
            <LatLngInput onResolve={handleSelectLocation} />
          )}

          {selected ? (
            <div className="rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] p-3">
              <p className="flex items-start gap-2 text-sm">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {selected.name}
                  </span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {selected.displayName}
                  </span>
                  <span className="mt-1 font-mono text-[var(--color-text-muted)] text-xs">
                    {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                  </span>
                </span>
              </p>
            </div>
          ) : null}

          <FormField>
            <Label htmlFor="site-label">Name this site</Label>
            <Input
              id="site-label"
              type="text"
              placeholder="North field — wheat 2026"
              aria-invalid={errors.label ? true : undefined}
              maxLength={80}
              {...register("label")}
            />
            <FormError>{errors.label?.message}</FormError>
            <p className="text-[var(--color-text-muted)] text-xs">
              Choose a label that's meaningful to you (the location's name is just a suggestion).
            </p>
          </FormField>

          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selected || createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
