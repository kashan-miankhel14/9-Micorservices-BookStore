"use client"

import useSWR from "swr"
import { swrFetcher } from "@/lib/swr-fetcher"

export default function OrdersPage() {
  const { data, isLoading, error } = useSWR("/api/orders", swrFetcher)
  const orders = data?.items || []

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="text-destructive">Failed to load orders</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Orders</h1>
      <div className="space-y-3">
        {orders.length === 0 && <div>You haven’t placed any orders yet.</div>}
        {orders.map((o: any) => (
          <div key={o.id} className="border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order #{o.id}</div>
              <div className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
            </div>
            <ul className="mt-2 text-sm">
              {o.items.map((it: any) => (
                <li key={it.id} className="flex items-center justify-between">
                  <span>
                    {it.title} × {it.qty}
                  </span>
                  <span>${(it.price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-right font-semibold">Total: ${o.total.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
