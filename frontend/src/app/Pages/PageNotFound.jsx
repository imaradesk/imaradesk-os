import { Head, Link } from '@inertiajs/react';

export default function PageNotFound() {
  return (
    <>
      <Head title="404 - Page Not Found" />
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full text-center">
          {/* 404 Icon */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-gray-300">404</div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-2">
              Sorry, we couldn't find the page you're looking for.
            </p>
            <p className="text-sm text-gray-500">
              The page may have been moved, deleted, or the URL might be incorrect.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-[#4a154b] text-white rounded-md hover:bg-[#0a2f33] transition-colors font-medium"
            >
              Go to Homepage
            </Link>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Go Back
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-12 text-sm text-gray-500">
            <p>Need help? <Link href="/docs" className="text-[#4a154b] hover:underline">Visit our documentation</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}
