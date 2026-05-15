import { useMutation } from "@tanstack/react-query";
import { reverseGeocode } from "../api/geocoding.api.ts";

/**
 * Reverse geocoding is one-shot (the user clicks "Use my current location" or
 * fills in lat/lng once and we resolve a name). Modeled as a mutation rather
 * than a query so the call is explicitly fired by the UI, not by a
 * dependency-change reactivity.
 */
export function useReverseGeocodingMutation() {
  return useMutation({
    mutationFn: (input: { latitude: number; longitude: number }) =>
      reverseGeocode(input.latitude, input.longitude),
  });
}
