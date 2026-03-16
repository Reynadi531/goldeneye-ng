import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@goldeneye-ng/ui/components/dropdown-menu";
import { Skeleton } from "@goldeneye-ng/ui/components/skeleton";
import { buttonVariants } from "@goldeneye-ng/ui/components/button";
import { ShieldCheck, User, LogOut, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <button className={buttonVariants({ variant: "outline" })}>Sign In</button>
      </Link>
    );
  }

  const isAdmin = (session.user as { role?: string }).role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
        {isAdmin ? (
          <ShieldCheck className="w-4 h-4 text-yellow-500" />
        ) : (
          <User className="w-4 h-4" />
        )}
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2">
            {isAdmin && <ShieldCheck className="w-4 h-4 text-yellow-500" />}
            {session.user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem>
                <Link to="/admin" className="flex items-center gap-2 w-full cursor-pointer">
                  <LayoutDashboard className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({ to: "/" });
                  },
                },
              });
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
