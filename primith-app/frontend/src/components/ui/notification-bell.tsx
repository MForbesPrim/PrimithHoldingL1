import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bell } from "lucide-react"
import { NotificationList } from "@/components/ui/notification-list"
import { useNotifications } from "@/components/pages/rdm/context/notificationContext"

interface NotificationBellProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
  }

  export function NotificationBell({ isOpen, setIsOpen }: NotificationBellProps) {
    const { unreadCount } = useNotifications()
  
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setIsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[11px] font-medium text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <NotificationList />
        </PopoverContent>
      </Popover>
    )
  }