import type { SitePublic } from "@agriwatch/shared";
import type { VariantProps } from "class-variance-authority";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, type buttonVariants } from "@/shared/ui/button.tsx";
import { CreateSiteDialog } from "./create-site-dialog.tsx";

type AddSiteButtonProps = Readonly<{
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  label?: string;
  /** Forwarded to `CreateSiteDialog.onSuccess` — lets the parent react to a
   * fresh site (e.g. the dashboard auto-selecting it so the forecast
   * switches over instead of staying on the previously-selected site). */
  onCreated?: (site: SitePublic) => void;
}>;

/**
 * Self-contained "Add site" entry point: a button that opens the
 * `CreateSiteDialog` and resets it on close. Used in the sidebar (and
 * reusable from the mobile drawer header or anywhere else we want the
 * create flow).
 */
export function AddSiteButton({
  variant,
  size,
  label = "Add site",
  onCreated,
}: AddSiteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        {label}
      </Button>
      <CreateSiteDialog open={open} onOpenChange={setOpen} onSuccess={onCreated} />
    </>
  );
}
