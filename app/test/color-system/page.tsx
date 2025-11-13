"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

export default function ColorSystemTest() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">TD Solutions Color System</h1>
        <p className="text-muted-foreground">Testing the new ocean blue color palette</p>
      </div>

      {/* Primary Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Colors</CardTitle>
          <CardDescription>Ocean blue theme from TD Solutions brand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-full h-20 bg-primary rounded-lg"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">Bright ocean blue</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-primary-dark rounded-lg"></div>
              <p className="text-sm font-medium">Primary Dark</p>
              <p className="text-xs text-muted-foreground">Deep ocean blue</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-primary-light rounded-lg"></div>
              <p className="text-sm font-medium">Primary Light</p>
              <p className="text-xs text-muted-foreground">Light ocean blue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles with the new color system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="destructive">Destructive</Button>
            <Button className="bg-success hover:bg-success/90">Success</Button>
            <Button className="bg-warning hover:bg-warning/90">Warning</Button>
          </div>
        </CardContent>
      </Card>

      {/* Semantic Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Semantic Colors</CardTitle>
          <CardDescription>Status and feedback colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is an info alert using primary colors.
            </AlertDescription>
          </Alert>
          <Alert className="border-success/50 text-success dark:border-success [&>svg]:text-success">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This is a success alert with green colors.
            </AlertDescription>
          </Alert>
          <Alert className="border-warning/50 text-warning dark:border-warning [&>svg]:text-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a warning alert with amber colors.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is an error alert with red colors.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Chart Colors Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Colors</CardTitle>
          <CardDescription>Ocean-themed chart color palette</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="space-y-2">
                <div 
                  className={`w-full h-20 rounded-lg bg-chart-${num}`}
                  style={{ backgroundColor: `hsl(var(--chart-${num}))` }}
                ></div>
                <p className="text-sm font-medium">Chart {num}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Different badge variants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Text Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Text colors and hierarchy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Primary Text (Foreground)</h1>
            <p className="text-muted-foreground">Muted text for descriptions and secondary information</p>
            <p className="text-primary">Primary colored text for links and emphasis</p>
            <p className="text-destructive">Destructive text for errors</p>
            <p className="text-success">Success text for confirmations</p>
            <p className="text-warning">Warning text for cautions</p>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Test */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility & Contrast</CardTitle>
          <CardDescription>Testing color contrast for readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Light backgrounds */}
            <div className="space-y-3">
              <h3 className="font-semibold">Light Backgrounds</h3>
              <div className="space-y-2">
                <div className="p-3 bg-background border rounded">
                  <p className="text-foreground font-medium">Normal text on background</p>
                  <p className="text-muted-foreground text-sm">Muted text for secondary info</p>
                </div>
                <div className="p-3 bg-primary-light rounded">
                  <p className="text-primary-dark font-medium">Dark text on light primary</p>
                  <p className="text-primary text-sm">Primary text on light background</p>
                </div>
                <div className="p-3 bg-card border rounded">
                  <p className="text-card-foreground font-medium">Card text</p>
                  <p className="text-muted-foreground text-sm">Secondary card text</p>
                </div>
              </div>
            </div>

            {/* Dark backgrounds */}
            <div className="space-y-3">
              <h3 className="font-semibold">Dark Backgrounds</h3>
              <div className="space-y-2">
                <div className="p-3 bg-primary rounded">
                  <p className="text-primary-foreground font-medium">White text on primary</p>
                  <p className="text-primary-foreground/80 text-sm">Slightly transparent text</p>
                </div>
                <div className="p-3 bg-primary-dark rounded">
                  <p className="text-white font-medium">White text on dark primary</p>
                  <p className="text-white/70 text-sm">Muted white text</p>
                </div>
                <div className="p-3 bg-destructive rounded">
                  <p className="text-destructive-foreground font-medium">Error message</p>
                  <p className="text-destructive-foreground/80 text-sm">Error description</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}