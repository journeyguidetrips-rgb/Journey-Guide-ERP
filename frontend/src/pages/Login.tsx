import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { LogIn, Loader } from 'lucide-react'
import { useUserStore } from '../stores/userStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, hasRole, isAuthenticated } = useUserStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      })

      if (response.data.success) {
        // Token is stored in httpOnly cookie by the server; just save user info
        login(response.data.user)
        toast.success(`Welcome, ${response.data.user.firstName}!`)
        if (hasRole('superAdmin')) 
          navigate('/admin')
        else 
          navigate('/')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg shadow-lg">
                <LogIn size={32} className="text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center text-white">
              Journey Guide
            </h1>
            <p className="text-center text-blue-100 mt-2">Travel Agency ERP System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <p className="text-center text-gray-600 mb-6 text-sm">
              Sign in to your account to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800"
                    disabled={loading}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" disabled={loading} />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          <p>
            © 2026 Journey Guide ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}