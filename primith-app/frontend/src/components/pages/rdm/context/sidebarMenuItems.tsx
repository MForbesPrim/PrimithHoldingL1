import { 
    PanelsTopLeft,
    Box,
    Layers2,
    Lightbulb,
    Users,
    FileText
} from "lucide-react"

export const menuItems = [
  {
    title: "Dashboard",
    url: "/rdm",
    icon: PanelsTopLeft,
  },
  {
    title: "Projects",
    url: "/rdm/projects",
    icon: Box,
  },
  {
    title: "Document Management",
    url: "/rdm/document-management",
    icon: Layers2,
  },
  {
    title: "Pages",
    url: "/rdm/pages",
    icon: FileText,
  },
  {
    title: "Document Intelligence",
    url: "/rdm/document-intelligence",
    icon: Lightbulb,
  },
  {
    title: "Collaborators",
    url: "/rdm/collaborators",
    icon: Users,
  }
]