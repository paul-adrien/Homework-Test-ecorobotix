import type { GeocodingResult } from "@agriwatch/shared";
import { LocateFixed, MapPinPlus } from "lucide-react";
import { useState } from "react";
import { useReverseGeocodingMutation } from "@/modules/geocoding/hooks/use-reverse-geocoding-mutation.ts";
import { Alert, AlertDescription } from "@/shared/ui/alert.tsx";
import { Button } from "@/shared/ui/button.tsx";
import { CreateSiteDialog } from "./create-site-dialog.tsx";

/**
 * Empty state shown when the user has not added any site yet. Offers two
 * entry points into the create flow:
 *  - "Search a location" → opens the dialog in search mode.
 *  - "Use my current location" → requests browser geolocation, reverse-geocodes
 *    it, then opens the dialog with the coordinates pre-filled.
 */
export function EmptyState() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialLocation, setInitialLocation] = useState<GeocodingResult | undefined>();
  const [geoError, setGeoError] = useState<string | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const reverseMutation = useReverseGeocodingMutation();

  function openSearchFlow() {
    setInitialLocation(undefined);
    setGeoError(undefined);
    setDialogOpen(true);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser does not support geolocation.");
      return;
    }
    setGeoError(undefined);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        reverseMutation.mutate(
          { latitude, longitude },
          {
            onSuccess: (result) => {
              setIsLocating(false);
              setInitialLocation(
                result ?? {
                  name: `(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                  displayName: `Custom location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                  latitude,
                  longitude,
                  countryCode: null,
                  country: null,
                  admin1: null,
                  timezone: null,
                },
              );
              setDialogOpen(true);
            },
            onError: () => {
              setIsLocating(false);
              setGeoError(
                "Couldn't resolve a name for your location. You can still enter it manually.",
              );
            },
          },
        );
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location access denied. You can still search for a location by name.");
        } else {
          setGeoError("Couldn't get your current location. Try the search instead.");
        }
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-8 text-center sm:p-12">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
        <MapPinPlus className="size-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-xl">
          Add your first site
        </h2>
        <p className="max-w-md text-[var(--color-text-secondary)] text-sm">
          A site is a location you want to monitor weather for. You can have as many as you like —
          they all show up on your dashboard.
        </p>
      </div>

      {geoError ? (
        <Alert variant="warning" className="w-full max-w-md text-left">
          <AlertDescription>{geoError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={openSearchFlow}>
          <MapPinPlus className="size-4" aria-hidden="true" />
          Search a location
        </Button>
        <Button variant="secondary" onClick={useCurrentLocation} disabled={isLocating}>
          <LocateFixed className="size-4" aria-hidden="true" />
          {isLocating ? "Locating…" : "Use my current location"}
        </Button>
      </div>

      <CreateSiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialLocation={initialLocation}
      />
    </section>
  );
}
