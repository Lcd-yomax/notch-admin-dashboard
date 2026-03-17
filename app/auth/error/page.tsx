'use client'

import { Button } from '@/components/ui/button'
import { IconAlertTriangle, IconPackage } from '@tabler/icons-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function AuthErrorPage() {
  const t = useTranslations('auth')
  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <IconPackage className="size-6" />
          <span className="text-lg font-semibold">{t('brandName')}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <IconAlertTriangle className="size-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t('authError')}</h1>
            <p className="text-muted-foreground">
              {t('authErrorDescription')}
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/auth/login">
              {t('backToLogin')}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
