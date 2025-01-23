import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Share2 } from "lucide-react"

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="container mx-auto px-4">
        {/* Gallery Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Design Gallery</h1>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input placeholder="Search designs..." className="max-w-xs bg-gray-900 border-gray-800" />
            <div className="flex gap-2">
              <Button variant="outline">Latest</Button>
              <Button variant="outline">Popular</Button>
              <Button variant="outline">Featured</Button>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designs.map((design) => (
            <div key={design.id} className="group">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-900 mb-4">
                <img
                  src={design.image || "/placeholder.svg"}
                  alt={design.title}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 p-4 w-full">
                    <div className="flex justify-between items-center">
                      <Button variant="outline" size="sm" className="bg-black/50 backdrop-blur-sm">
                        View Details
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="bg-black/50 backdrop-blur-sm">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="bg-black/50 backdrop-blur-sm">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{design.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={design.designer.avatar || "/placeholder.svg"}
                      alt={design.designer.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-gray-400">{design.designer.name}</span>
                  </div>
                  <div className="flex gap-2">
                    {design.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-gray-800">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{design.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">{design.comments}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const designs = [
  {
    id: 1,
    title: "Quantum Series Prototype",
    designer: {
      name: "Alex Chen",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["Industrial", "Futuristic"],
    likes: 234,
    comments: 45,
  },
  {
    id: 2,
    title: "Bio-Inspired Helper Bot",
    designer: {
      name: "Sarah Miller",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["Healthcare", "Organic"],
    likes: 187,
    comments: 32,
  },
  {
    id: 3,
    title: "Urban Assistant 2.0",
    designer: {
      name: "James Wilson",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["City", "Service"],
    likes: 156,
    comments: 28,
  },
  {
    id: 4,
    title: "Guardian Series",
    designer: {
      name: "Elena Rodriguez",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["Security", "Military"],
    likes: 289,
    comments: 56,
  },
  {
    id: 5,
    title: "EduBot Teaching Assistant",
    designer: {
      name: "Michael Chang",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["Education", "Interactive"],
    likes: 167,
    comments: 38,
  },
  {
    id: 6,
    title: "Domestic Helper X1",
    designer: {
      name: "Lisa Park",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    image: "/placeholder.svg?height=600&width=800",
    tags: ["Home", "Assistant"],
    likes: 198,
    comments: 42,
  },
]

