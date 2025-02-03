import { DocumentManagement } from '@/components/pages/rdm/documentManagement/documentManagement'

export function DocumentManagementPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Document Management</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Here you can upload and organize documents.
      </p>
      <DocumentManagement />
    </div>
  )
}