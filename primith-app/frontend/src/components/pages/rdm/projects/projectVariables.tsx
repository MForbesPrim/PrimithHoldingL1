import { ProjectVariable } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";

interface ProjectVariablesPanelProps {
  projectId: string;
  projectService: any;
}

export function ProjectVariablesPanel({ projectId, projectService }: ProjectVariablesPanelProps) {
  const [variables, setVariables] = useState<ProjectVariable[]>([]);
  const [newVariable, setNewVariable] = useState({ key: "", value: "" });

  const handleAddVariable = async () => {
    try {
      const variable = await projectService.setProjectVariable(
        projectId,
        newVariable.key,
        newVariable.value
      );
      setVariables([...variables, variable]);
      setNewVariable({ key: "", value: "" });
    } catch (error) {
      console.error("Failed to add variable:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Variable name"
          value={newVariable.key}
          onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
        />
        <Input
          placeholder="Value"
          value={newVariable.value}
          onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
        />
        <Button onClick={handleAddVariable} disabled={!newVariable.key || !newVariable.value}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {variables.map((variable) => (
          <div key={variable.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{variable.key}</span>
              <span className="mx-2">=</span>
              <span>{variable.value}</span>
            </div>
            <Button variant="ghost" size="sm">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}