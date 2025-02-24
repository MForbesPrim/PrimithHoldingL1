import { RoadmapItem } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowRight } from "lucide-react";

interface RoadmapViewProps {
  items: RoadmapItem[];
  onItemCreate: (item: Partial<RoadmapItem>) => Promise<void>;
  onItemUpdate: (itemId: string, item: Partial<RoadmapItem>) => Promise<void>;
}

export function RoadmapView({ items, onItemCreate }: RoadmapViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Project Roadmap</h2>
        <Button onClick={() => onItemCreate({ title: "New Item", status: "planned" })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
                {item.startDate && item.endDate && (
                  <p className="text-sm text-gray-500">
                    {new Date(item.startDate).toLocaleDateString()} 
                    <ArrowRight className="inline h-4 w-4 mx-2" />
                    {new Date(item.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                item.status === 'completed' ? 'bg-green-100 text-green-800' :
                item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}