"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconLock } from "@tabler/icons-react"
import { usePermissions } from "@/hooks/use-permissions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { VariantProps } from "class-variance-authority"

// ─── <Can> ───────────────────────────────────────────────────────────────────
//
// Renders `children` only when the user has the required permission.
// Pass `fallback` to show something else when access is denied.
// Pass an array to `permission` to allow if the user has ANY of the keys.
//
// Usage:
//   <Can permission="orders:delete">
//     <Button>Delete</Button>
//   </Can>
//
//   <Can permission={["orders:update_status", "orders:update_own"]}>
//     <StatusForm />
//   </Can>
//
//   <Can permission="users:write" fallback={<p>No access</p>}>
//     <CreateUserForm />
//   </Can>

interface CanProps {
  permission: string | string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  // Optimistic: show content while loading to avoid layout flicker
  if (isLoading) return <>{children}</>

  const allowed = Array.isArray(permission)
    ? hasAnyPermission(...permission)
    : hasPermission(permission)

  return <>{allowed ? children : fallback}</>
}

// ─── <AccessDenied> ──────────────────────────────────────────────────────────
//
// Full-page fallback for pages the user has no permission for.
//
// Usage:
//   <Can permission="brands.manage" fallback={<AccessDenied />}>
//     <BrandsPageContent />
//   </Can>

export function AccessDenied() {
  const t = useTranslations("common")
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center">
      <IconLock className="size-8 text-muted-foreground" />
      <p className="text-muted-foreground">{t("noAccess")}</p>
    </div>
  )
}

// ─── <PermissionButton> ──────────────────────────────────────────────────────
//
// A drop-in replacement for <Button> that auto-disables and shows a tooltip
// when the user lacks the required permission. Accepts all Button props.
//
// Usage:
//   <PermissionButton permission="products:write" onClick={handleCreate}>
//     Create Product
//   </PermissionButton>
//
//   <PermissionButton
//     permission="orders:delete"
//     variant="destructive"
//     tooltip="Only admins can delete orders"
//     onClick={handleDelete}
//   >
//     Delete Order
//   </PermissionButton>

interface PermissionButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  permission: string | string[]
  tooltip?: string
  asChild?: boolean
}

export function PermissionButton({
  permission,
  tooltip = "You don't have permission to do this",
  children,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  const allowed = isLoading
    ? true
    : Array.isArray(permission)
    ? hasAnyPermission(...permission)
    : hasPermission(permission)

  if (!allowed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span needed because disabled buttons don't fire mouse events for the tooltip */}
          <span className="inline-flex cursor-not-allowed">
            <Button {...props} disabled>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button {...props} disabled={disabled}>
      {children}
    </Button>
  )
}
