import React from 'react'
import {
  IndianRupee, TrendingUp, Users, Building2, CheckCircle, Clock, FileText,
} from 'lucide-react'
import { DashboardMetrics } from '../../types/finance'
import { formatCurrency } from '../../utils/formatters'

interface MetricRowProps {
  label: string
  value: string | number
  color?: string
}

const MetricRow = ({ label, value, color = 'text-gray-900' }: MetricRowProps) => (
  <div className="flex justify-between items-center text-sm py-1">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${color}`}>{value}</span>
  </div>
)

const SkeletonCard = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
)

interface DashboardTabProps {
  metrics: DashboardMetrics | null
  loading: boolean
}

export default function DashboardTab({ metrics, loading }: DashboardTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
            <SkeletonCard />
          </div>
        ))}
      </div>
    )
  }

  const m = metrics

  const conversionRate = (m?.total_itineraries ?? 0) > 0
    ? ((m?.converted_itineraries ?? 0) / (m?.total_itineraries ?? 1) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* ── Itinerary Pipeline ── */}
      <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
        <h3 className="text-lg font-semibold text-sky-900 mb-4 flex items-center gap-2">
          <FileText size={18} /> Itinerary Pipeline
        </h3>
        <MetricRow label="Total Itineraries" value={m?.total_itineraries ?? 0} />
        <MetricRow label="Draft" value={m?.draft_itineraries ?? 0} color="text-gray-500" />
        <MetricRow label="Published" value={m?.published_itineraries ?? 0} color="text-blue-600" />
        <MetricRow label="Converted to Bookings" value={m?.converted_itineraries ?? 0} color="text-green-600" />
        <div className="mt-3 pt-3 border-t border-sky-200">
          <div className="flex justify-between text-sm">
            <span className="text-sky-700">Conversion Rate</span>
            <span className="font-semibold text-sky-900">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* ── Client Revenue ── */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <Users size={18} /> Client Revenue
        </h3>
        <MetricRow label="Total Bookings" value={m?.total_bookings ?? 0} />
        <MetricRow label="Selling Price" value={formatCurrency(m?.total_selling_price ?? 0)} />
        <MetricRow label="Received" value={formatCurrency(m?.total_received ?? 0)} color="text-green-600" />
        <MetricRow label="Balance Due" value={formatCurrency(m?.client_balance_due ?? 0)} color="text-red-600" />
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Collection Rate</span>
            <span className="font-semibold text-blue-900">{Number(m?.collection_rate ?? 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── Vendor Payables ── */}
      <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
        <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
          <Building2 size={18} /> Vendor Payables
        </h3>
        <MetricRow label="Total Vendor Cost" value={formatCurrency(m?.total_vendor_cost ?? 0)} />
        <MetricRow label="Paid to Vendors" value={formatCurrency(m?.total_paid_to_vendor ?? 0)} color="text-green-600" />
        <MetricRow label="Vendor Balance" value={formatCurrency(m?.vendor_balance_due ?? 0)} color="text-red-600" />
        <div className="mt-3 pt-3 border-t border-amber-200">
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">Vendor Pay Rate</span>
            <span className="font-semibold text-amber-900">{Number(m?.vendor_pay_rate ?? 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ── Profitability ── */}
      <div className="bg-green-50 p-6 rounded-xl border border-green-100">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Profitability
        </h3>
        <MetricRow label="Gross Profit" value={formatCurrency(m?.gross_profit ?? 0)} color="text-green-600" />
        <MetricRow label="Unrealised Profit" value={formatCurrency(m?.unrealised_profit ?? 0)} color="text-gray-600" />
      </div>

      {/* ── Completion ── */}
      <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
          <CheckCircle size={18} /> Completion
        </h3>
        <MetricRow label="Fully Paid Bookings" value={m?.completed_bookings ?? 0} color="text-green-600" />
        <MetricRow label="Total Bookings" value={m?.total_bookings ?? 0} />
      </div>

      {/* ── Summary ── */}
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
          <IndianRupee size={18} /> Summary
        </h3>
        <MetricRow label="Total Revenue" value={formatCurrency(m?.total_selling_price ?? 0)} />
        <MetricRow label="Total Cost" value={formatCurrency(m?.total_vendor_cost ?? 0)} color="text-amber-600" />
        <MetricRow label="Net Profit" value={formatCurrency(m?.net_profit ?? 0)} color="text-green-600" />
      </div>
    </div>
  )
}
