"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Heart,
  Folder,
  FolderPlus,
  Box,
  Grid3X3,
  Brain,
} from "lucide-react"

export default function BrainwaveInterface() {
  const [isExploreOpen, setIsExploreOpen] = useState(true)

  const scenes = [
    {
      id: 1,
      title: "Delivery Robot on Wheels",
      category: "3D Icons",
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: 2,
      title: "Modern Workspace",
      category: "3D Scenes",
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: 3,
      title: "Abstract Geometry",
      category: "3D Icons",
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: 4,
      title: "Tech Dashboard",
      category: "UI Elements",
      image: "/placeholder.svg?height=200&width=200",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-r-3xl shadow-lg p-6 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">Brainwave</span>
        </div>

        {/* Explore Section */}
        <div className="mb-6">
          <button
            onClick={() => setIsExploreOpen(!isExploreOpen)}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Grid3X3 className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-900 flex-1 text-left">Explore</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isExploreOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isExploreOpen && (
            <div className="ml-8 mt-2 space-y-2">
              <div className="py-2 px-3 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                Designs
              </div>
              <div className="py-2 px-3 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors">
                Animations
              </div>
            </div>
          )}
        </div>

        {/* Assets */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer mb-2">
          <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <span className="font-semibold text-gray-900 flex-1">Assets</span>
          <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200">
            112
          </Badge>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Likes */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer mb-6">
          <Heart className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Likes</span>
        </div>

        {/* Scenes Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-3">Scenes</h3>
        </div>

        {/* My Scenes - Active */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 mb-2">
          <Box className="w-5 h-5 text-gray-900" />
          <span className="font-semibold text-gray-900">My Scenes</span>
        </div>

        {/* New Folder */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer mb-2">
          <FolderPlus className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">New Folder</span>
        </div>

        {/* Untitled Folder */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer mb-2">
          <Folder className="w-5 h-5 text-orange-500" />
          <span className="font-medium text-gray-700">Untitled Folder</span>
        </div>

        {/* 3D Icons */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
          <Folder className="w-5 h-5 text-green-500" />
          <span className="font-medium text-gray-700">3D Icons</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:shadow-md">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:shadow-md">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-10 w-80 bg-white border-0 shadow-sm rounded-full focus:shadow-md transition-shadow"
            />
          </div>
        </div>

        {/* Page Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Scenes</h1>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scenes.map((scene) => (
            <Card
              key={scene.id}
              className="group cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white"
            >
              <CardContent className="p-0">
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={scene.image || "/placeholder.svg"}
                    alt={scene.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {scene.title}
                  </h3>
                  <p className="text-sm text-gray-500">{scene.category}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add more content cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <Card
              key={item}
              className="group cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden bg-white"
            >
              <CardContent className="p-6">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Box className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">3D Asset Collection {item}</h3>
                <p className="text-sm text-gray-500 mb-3">Modern 3D icons and illustrations</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    {Math.floor(Math.random() * 50) + 10} items
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    View All
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
