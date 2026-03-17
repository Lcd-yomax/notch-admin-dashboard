"use client"

import * as React from "react"
import useSWR from "swr"

interface MeData {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  role: string | null
  permissions: string[]
}

interface PermissionsContextType {
  user: MeData | null
  permissions: string[]
  hasPermission: (key: string) => boolean
  hasAnyPermission: (...keys: string[]) => boolean
  isLoading: boolean
}

const PermissionsContext = React.createContext<PermissionsContextType>({
  user: null,
  permissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isLoading: true,
})

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch permissions")
  return res.json()
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useSWR<MeData>("/api/me", fetcher)

  const permissions = data?.permissions || []

  const hasPermission = React.useCallback(
    (key: string) => {
      if (isLoading) return true // show everything while loading
      return permissions.includes(key)
    },
    [permissions, isLoading]
  )

  const hasAnyPermission = React.useCallback(
    (...keys: string[]) => {
      if (isLoading) return true
      return keys.some((k) => permissions.includes(k))
    },
    [permissions, isLoading]
  )

  return (
    <PermissionsContext.Provider
      value={{
        user: data || null,
        permissions,
        hasPermission,
        hasAnyPermission,
        isLoading,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return React.useContext(PermissionsContext)
}
