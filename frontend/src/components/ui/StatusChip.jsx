import React from "react";
import { BadgeCheck, CircleCheck, CircleX, Clock3, ShieldAlert, TrendingUp } from "lucide-react";
import { statusOf, TRX_STATUS } from "../../utils/status";

const ORDER_ICON = { pending: Clock3, approved: BadgeCheck, process: TrendingUp, done: CircleCheck, rejected: CircleX };
const TRX_ICON = { pending: Clock3, paid: CircleCheck, failed: CircleX, challenge: ShieldAlert };

/** Chip status orderan. `admin` → pakai label versi admin ("Diproses") */
export function OrderStatusChip({ status, admin = false }) {
  const s = statusOf(status);
  const Icon = ORDER_ICON[status] || Clock3;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s.chip}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {admin ? s.adminLabel : s.label}
    </span>
  );
}

export function TrxStatusChip({ status }) {
  const s = TRX_STATUS[status] || TRX_STATUS.pending;
  const Icon = TRX_ICON[status] || Clock3;
  return (
    <span title={s.note} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s.chip}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {s.label}
    </span>
  );
}
