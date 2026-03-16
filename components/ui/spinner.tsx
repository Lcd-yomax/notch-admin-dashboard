import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function TableSpinner({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-24 text-center">
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </td>
    </tr>
  )
}

export { Spinner, PageSpinner, TableSpinner }
