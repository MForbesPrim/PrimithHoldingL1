import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Star, Filter } from "lucide-react"
import { Link } from "react-router-dom"

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="container mx-auto px-4">
        {/* Shop Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Robot Shop</h1>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Input placeholder="Search robots..." className="max-w-xs bg-gray-900 border-gray-800" />
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-900 border-gray-800">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <Link key={product.id} to={`/shop/${product.id}`} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-900 mb-4">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm">
                    {product.category}
                  </Badge>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-blue-400">${product.price.toLocaleString()}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-400">{product.rating}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

const products = [
  {
    id: 1,
    name: "HomeBot Pro",
    description: "Advanced home assistant with AI capabilities",
    price: 2999,
    rating: 4.8,
    category: "Home Assistant",
    image: "/placeholder.svg?height=600&width=600",
  },
  {
    id: 2,
    name: "IndustrialArm X1",
    description: "High-precision industrial robotic arm",
    price: 5999,
    rating: 4.9,
    category: "Industrial",
    image: "/placeholder.svg?height=600&width=600",
  },
  {
    id: 3,
    name: "CompanionBot Mini",
    description: "Personal companion robot with emotional AI",
    price: 1999,
    rating: 4.7,
    category: "Companion",
    image: "/placeholder.svg?height=600&width=600",
  },
  {
    id: 4,
    name: "SecurityBot Pro",
    description: "Advanced security and surveillance robot",
    price: 3499,
    rating: 4.6,
    category: "Security",
    image: "/placeholder.svg?height=600&width=600",
  },
  {
    id: 5,
    name: "MedicalBot Assistant",
    description: "Healthcare and medical assistance robot",
    price: 6999,
    rating: 4.9,
    category: "Medical",
    image: "/placeholder.svg?height=600&width=600",
  },
  {
    id: 6,
    name: "EducationBot Teacher",
    description: "Interactive educational robot for learning",
    price: 2499,
    rating: 4.5,
    category: "Education",
    image: "/placeholder.svg?height=600&width=600",
  },
]

