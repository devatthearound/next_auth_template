import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6">Access Denied</h1>
      
      <div className="bg-red-50 p-6 rounded-lg shadow-md">
        <svg
          className="w-16 h-16 text-red-500 mx-auto mb-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        
        <h2 className="text-xl font-semibold mb-4">Unauthorized Access</h2>
        <p className="mb-4">
          You do not have permission to access this page. This page may be restricted to a specific user role.
        </p>
        
        <div className="mt-6 space-x-4">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}