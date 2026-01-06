"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type Book = {
  id: string
  title: string
  author: string
  price: number
  rating?: number
  coverUrl?: string
}

export default function BookCard({ book, onAddToCart }: { book: Book; onAddToCart?: (b: Book) => Promise<void> }) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onAddToCart) return
    
    try {
      setIsAdding(true)
      await onAddToCart(book)
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card 
      className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/books/${book.id}`)}
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={book.coverUrl || "/placeholder.svg?height=300&width=200&text=Book+Cover"}
          alt={book.title}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle className="text-pretty line-clamp-2" title={book.title}>
          {book.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{book.author}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold">${book.price.toFixed(2)}</span>
          {book.rating && (
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
              <span className="text-yellow-400">★</span>
              <span className="text-sm font-medium">{book.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          className="w-full" 
          onClick={handleAddToCart}
          disabled={isAdding}
        >
          {isAdding ? "Adding..." : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  )
}
