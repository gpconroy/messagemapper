import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24">
      <div className="max-w-3xl text-center space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900">
            MessageMapper
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600">
            Visual message format mapping platform
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Transform complex message formats with ease. Map, visualize, and convert data structures
            between different systems seamlessly.
          </p>
        </div>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 border-2 border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-50 transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
