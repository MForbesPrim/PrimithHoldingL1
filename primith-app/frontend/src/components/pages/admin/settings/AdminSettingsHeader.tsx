interface AdminSettingsHeaderProps {
  title: string
  description: string
}

export function AdminSettingsHeader({ title, description }: AdminSettingsHeaderProps) {
  return (
    <div className="flex items-center px-12 py-10 h-16">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D] dark:text-gray-300">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 