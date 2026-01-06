"use client"

import useSWR from "swr"
import { swrFetcher } from "@/lib/swr-fetcher"
import { Button } from "@/components/ui/button"

export default function CartPage() {
  const { data, mutate, isLoading, error } = useSWR("/api/cart", swrFetcher)
  const items = data?.items || []
  const total = items.reduce((sum: number, it: any) => sum + it.price * it.qty, 0)

  const removeItem = async (itemId: string) => {
    await fetch(`/api/cart/${itemId}`, { method: "DELETE", credentials: "include" })
    mutate()
  }

  const checkout = async () => {
    await fetch("/api/orders", { method: "POST", credentials: "include" })
    mutate()
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="text-destructive">Failed to load cart</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      <div className="space-y-3">
        {items.length === 0 && <div>Your cart is empty.</div>}
        {items.map((it: any) => (
          <div key={it.id} className="flex items-center justify-between border rounded-md p-3">
            <div>
              <div className="font-medium">{it.title}</div>
              <div className="text-sm text-muted-foreground">Qty: {it.qty}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">${(it.price * it.qty).toFixed(2)}</div>
              <Button variant="destructive" onClick={() => removeItem(it.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
        <Button onClick={checkout} disabled={items.length === 0}>
          Checkout
        </Button>
      </div>
    </div>
  )
}
