import type { GeocodingResult } from "@agriwatch/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useReverseGeocodingMutation } from "@/modules/geocoding/hooks/use-reverse-geocoding-mutation.ts";
import { toServerErrorMessage } from "@/shared/api/api-error.ts";
import { Alert, AlertDescription } from "@/shared/ui/alert.tsx";
import { Button } from "@/shared/ui/button.tsx";
import { FormError, FormField } from "@/shared/ui/field.tsx";
import { Input } from "@/shared/ui/input.tsx";
import { Label } from "@/shared/ui/label.tsx";

type LatLngInputProps = Readonly<{
  onResolve: (result: GeocodingResult) => void;
}>;

const latLngSchema = z.object({
  latitude: z.coerce
    .number({ message: "Latitude must be a number." })
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
  longitude: z.coerce
    .number({ message: "Longitude must be a number." })
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
});

type LatLngForm = z.infer<typeof latLngSchema>;

/**
 * Two number inputs + a "Look up" button that reverse-geocodes the coordinates
 * via /api/geocoding/reverse. On success, hands a `GeocodingResult` to the
 * parent (real one from Nominatim, or a synthetic one anchored on the raw
 * coordinates if Nominatim doesn't recognise the spot).
 */
export function LatLngInput({ onResolve }: LatLngInputProps) {
  const reverseMutation = useReverseGeocodingMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LatLngForm>({
    resolver: zodResolver(latLngSchema),
    mode: "onBlur",
    defaultValues: { latitude: "" as unknown as number, longitude: "" as unknown as number },
  });

  const submit = handleSubmit((values) => {
    reverseMutation.mutate(
      { latitude: values.latitude, longitude: values.longitude },
      {
        onSuccess: (result) => {
          if (result) {
            onResolve(result);
            return;
          }
          onResolve({
            name: `(${values.latitude.toFixed(4)}, ${values.longitude.toFixed(4)})`,
            displayName: `Custom location at ${values.latitude.toFixed(4)}, ${values.longitude.toFixed(4)}`,
            latitude: values.latitude,
            longitude: values.longitude,
            countryCode: null,
            country: null,
            admin1: null,
            timezone: null,
          });
        },
      },
    );
  });

  const serverError = toServerErrorMessage(reverseMutation.error);

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField>
          <Label htmlFor="site-latitude">Latitude</Label>
          <Input
            id="site-latitude"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="46.7785"
            aria-invalid={errors.latitude ? true : undefined}
            {...register("latitude")}
          />
          <FormError>{errors.latitude?.message}</FormError>
        </FormField>
        <FormField>
          <Label htmlFor="site-longitude">Longitude</Label>
          <Input
            id="site-longitude"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="6.6411"
            aria-invalid={errors.longitude ? true : undefined}
            {...register("longitude")}
          />
          <FormError>{errors.longitude?.message}</FormError>
        </FormField>
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" variant="secondary" disabled={reverseMutation.isPending || !isValid}>
        <MapPin className="size-4" aria-hidden="true" />
        {reverseMutation.isPending ? "Looking up location…" : "Look up location"}
      </Button>
    </form>
  );
}
