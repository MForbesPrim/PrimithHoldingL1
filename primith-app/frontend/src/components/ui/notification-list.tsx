import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/components/pages/rdm/context/notificationContext"
import { formatDistanceToNow } from 'date-fns'
import { Bell, Check, CheckCheck } from "lucide-react"
import { Button } from "./button"
import { Skeleton } from "./skeleton"

export function NotificationList() {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Failed to load notifications
      </div>
    )
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="mx-auto h-6 w-6 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">
          No notifications yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h4 className="text-sm font-medium">Notifications</h4>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => markAllAsRead()}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all as read
        </Button>
      </div>
      <ScrollArea className="h-[300px]">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-4 p-4 border-b last:border-0 ${
              notification.read ? 'bg-background' : 'bg-muted/50'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-xs text-muted-foreground">
                {notification.message}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => markAsRead(notification.id)}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Mark as read</span>
              </Button>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}