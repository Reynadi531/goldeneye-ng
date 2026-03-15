import { Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
          >
            <Shield className="w-5 h-5 text-red-500" />
            <span>GoldenEye</span>
            <span className="text-muted-foreground text-sm font-normal">
              - Illegal Mining Tracker
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
