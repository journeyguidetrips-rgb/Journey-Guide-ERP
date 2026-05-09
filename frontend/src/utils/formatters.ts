export const formatCurrency = (amount: number): string =>
  `₹${(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const getStatusStyle = (status: string): string => {
  const styles: Record<string, string> = {
    Pending:   'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
  }
  return `px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`
}

export const getPaymentTypeStyle = (type: string): string => {
  const styles: Record<string, string> = {
    Advance: 'bg-blue-100 text-blue-700',
    Final:   'bg-green-100 text-green-700',
    Refund:  'bg-red-100 text-red-700',
    Other:   'bg-gray-100 text-gray-700',
  }
  return `px-2 py-1 rounded text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`
}
