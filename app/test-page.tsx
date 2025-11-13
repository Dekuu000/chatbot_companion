"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestPage() {
  return (
    <div>
      <h1>Test Page</h1>
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>If you see this, Card component works!</p>
        </CardContent>
      </Card>
    </div>
  )
}









