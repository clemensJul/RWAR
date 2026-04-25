import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Settings, User, LogOut } from "lucide-react"

export function ExampleSheet() {
  return (
    <Sheet>
      {/* 1. The Trigger (What the user clicks) */}
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      {/* 2. The Content (The slide-out panel) */}
      {/* side="left" makes it a sidebar; side="right" is default */}
      <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-slate-950 text-white border-slate-800">
        <SheetHeader>
          <SheetTitle className="text-white">Dashboard Menu</SheetTitle>
          <SheetDescription className="text-slate-400">
            Access your 3D layers and account settings.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-6">
          <Button variant="ghost" className="justify-start gap-2 hover:bg-slate-900 hover:text-blue-400">
            <User className="h-4 w-4" /> Profile
          </Button>
          <Button variant="ghost" className="justify-start gap-2 hover:bg-slate-900 hover:text-blue-400">
            <Settings className="h-4 w-4" /> Map Settings
          </Button>
        </div>

        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button type="submit" variant="destructive" className="w-full gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}