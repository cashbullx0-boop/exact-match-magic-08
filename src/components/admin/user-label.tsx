import type { AdminUserIdentity } from "@/lib/admin-users.functions";
import { identityName } from "@/lib/use-user-identities";

/** Shows the account name and email for a user id across admin screens. */
export function UserLabel({
  userId,
  identity,
  className = "",
}: {
  userId: string;
  identity?: AdminUserIdentity;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-sm font-medium truncate">{identityName(identity, userId)}</p>
      <p className="text-xs text-muted-foreground break-all">{identity?.email ?? "—"}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{userId.slice(0, 8)}…</p>
    </div>
  );
}
