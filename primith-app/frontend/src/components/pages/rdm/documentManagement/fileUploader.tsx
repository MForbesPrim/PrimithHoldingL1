import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface FileUploaderProps {
  onUpload: (file: File) => void
  isUploading: boolean
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button 
        size="sm" 
        onClick={() => {
            // Similar to New Folder, this should trigger file upload functionality
            console.log("Upload Document button clicked");
        }}
        className="flex items-center gap-2"
        >
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
    </div>
  )
}