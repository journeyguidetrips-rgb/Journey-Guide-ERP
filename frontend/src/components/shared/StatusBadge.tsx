interface StatusBadgeProps {
  status: string
  variant?: 'booking' | 'itinerary'
}

const BOOKING_STYLES: Record<string, string> = {
  Pending:   'bg-yellow-100 text-yellow-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

const ITINERARY_STYLES: Record<string, string> = {
  Draft:     'bg-yellow-100 text-yellow-700',
  Published: 'bg-green-100 text-green-700',
  Converted: 'bg-purple-100 text-purple-700',
}

export default function StatusBadge({ status, variant = 'booking' }: StatusBadgeProps) {
  const styles = variant === 'itinerary' ? ITINERARY_STYLES : BOOKING_STYLES
  const className = styles[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {status}
    </span>
  )
}
