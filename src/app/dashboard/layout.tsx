import { Settings, History, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark h-screen overflow-hidden bg-black text-foreground relative">
      <div className="flex h-full relative z-10">
        {/* Sidebar (Navigation) */}
        <aside className="flex w-16 flex-col items-center border-r border-zinc-800 bg-black py-4">
          <TooltipProvider>
            {/* Logo / Home */}
            <div className="mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-900">
                      <Home className="h-5 w-5" strokeWidth={1.5} />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Home</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Separator className="mb-4 w-8" />

            {/* Navigation Icons */}
            <nav className="flex flex-1 flex-col gap-4 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-white hover:bg-zinc-900">
                    <History className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Project History</p>
                </TooltipContent>
              </Tooltip>
            </nav>

            {/* Settings at Bottom */}
            <div className="mt-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-900">
                    <Settings className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
