import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCBX, formatCBXHundredths } from "@/lib/currency";

type CbxAmountProps = {
  value: number;
  hundredths?: boolean;
  sign?: boolean;
  className?: string;
  coinClassName?: string;
  label?: boolean;
};

export function CbxAmount({
  value,
  hundredths = true,
  sign = false,
  className,
  coinClassName,
  label = true,
}: CbxAmountProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <span className={cn("cbx-coin", coinClassName)} aria-hidden="true">
        <Coins className="h-[0.72em] w-[0.72em]" strokeWidth={2.5} />
      </span>
      <span>{hundredths ? formatCBXHundredths(value, { sign }) : formatCBX(value, { sign })}</span>
      {label ? <span className="text-[0.72em] font-bold tracking-normal text-cbx">CBX</span> : null}
    </span>
  );
}