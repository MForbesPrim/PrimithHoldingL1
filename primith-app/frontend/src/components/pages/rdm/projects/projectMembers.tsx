import { useState, useEffect } from "react";
import { ProjectMember } from "@/types/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"; // Import subcomponents
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, MoreVertical, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectMembersProps {
  projectId: string;
  projectService: any;
  onMemberUpdate: () => void;
}

export function ProjectMembers({ projectId, projectService, onMemberUpdate }: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [availableUsers, _setAvailableUsers] = useState<any[]>([]); // Adjust type if you have a specific user type

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  async function loadMembers() {
    const data = await projectService.getProjectMembers(projectId);
    setMembers(data);
  }

  async function handleAddMember() {
    await projectService.addProjectMember(projectId, selectedUser, selectedRole);
    setShowAddDialog(false);
    loadMembers();
    onMemberUpdate();
  }

  async function handleRemoveMember(userId: string) {
    await projectService.removeProjectMember(projectId, userId);
    loadMembers();
    onMemberUpdate();
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await projectService.updateMemberRole(projectId, userId, newRole);
    loadMembers();
    onMemberUpdate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Project Members</h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="divide-y">
        {members.map((member) => (
          <div key={member.userId} className="py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>{member.userName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.userName}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleRoleChange(member.userId, "admin")}>
                  Make Admin
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleRoleChange(member.userId, "member")}>
                  Make Member
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={() => handleRemoveMember(member.userId)}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label || user.value} {/* Adjust based on your user object structure */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUser}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}