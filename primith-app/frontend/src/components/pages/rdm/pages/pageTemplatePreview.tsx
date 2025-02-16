import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PageNode } from '@/types/pages';

interface TemplatePreviewProps {
  template: PageNode;
  onUseTemplate: (template: PageNode) => void;
  onClose: () => void;
}

export default function TemplatePreview({ 
    template, 
    onUseTemplate, 
    onClose 
  }: TemplatePreviewProps) {
    return (
      <div className="h-full border-l">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{template.title}</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onUseTemplate(template)}>
                Use Template
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4 prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: template.content }} />
        </div>
      </div>
    );  
}