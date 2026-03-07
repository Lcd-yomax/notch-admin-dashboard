import { Button } from '@/components/ui/button'
import { IconAlertTriangle, IconPackage } from '@tabler/icons-react'
import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <IconPackage className="size-6" />
          <span className="text-lg font-semibold">E-Commerce Admin</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <IconAlertTriangle className="size-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Authentication Error</h1>
            <p className="text-muted-foreground">
              There was a problem signing you in. Please try again or contact your administrator.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/auth/login">
              Back to Login
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
