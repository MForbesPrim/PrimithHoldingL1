import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface NotificationBellProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function NotificationBell({ isOpen, setIsOpen }: NotificationBellProps) {
  const hasNotifications = false;

  return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="relative"
                        onMouseEnter={() => !isOpen && setIsOpen(false)} // Ensure tooltip can show when popover is closed
                    >
                        <Bell className="h-5 w-5" />
                        {hasNotifications && (
                            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                    {hasNotifications ? (
                        <div className="grid gap-4">
                            {/* Render notifications */}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No notifications available</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}