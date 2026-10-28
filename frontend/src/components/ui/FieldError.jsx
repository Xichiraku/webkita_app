import React from "react";
import { CircleAlert } from "lucide-react";

/** Pesan error di bawah input (gaya desain HTML) */
export default function FieldError({ id, msg }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#B91C1C]" role="alert">
      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
    </p>
  );
}
