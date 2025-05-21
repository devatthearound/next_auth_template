export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome to Auth Demo App</h1>
      
      <p className="mb-4">
        This application demonstrates user authentication and role-based access control.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Features</h2>
          <ul className="list-disc pl-5">
            <li>User authentication (login & register)</li>
            <li>Role-based access control (Customer/Owner)</li>
            <li>Protected routes</li>
            <li>JWT token authentication</li>
            <li>User activity logging</li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Test Pages</h2>
          <ul className="list-disc pl-5">
            <li><strong>Public Page</strong> - Anyone can access</li>
            <li><strong>Dashboard</strong> - Any authenticated user</li>
            <li><strong>Customer Area</strong> - Only customers</li>
            <li><strong>Owner Area</strong> - Only business owners</li>
          </ul>
        </div>
      </div>
    </div>
  );
}