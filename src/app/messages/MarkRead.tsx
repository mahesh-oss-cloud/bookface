'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Opening a thread marks its incoming messages read. Only read_at is granted to
 * the recipient at the column level, so this cannot touch anything else.
 */
export default function MarkRead({ ids }: { ids: string[] }) {
  const router = useRouter()
  const key = ids.join(',')

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', key.split(','))
      .then(() => { if (!cancelled) router.refresh() })
    return () => { cancelled = true }
  }, [key, router])

  return null
}
