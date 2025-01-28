import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function NotificationBell() {
    const hasNotifications = false;
    return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </Button>
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