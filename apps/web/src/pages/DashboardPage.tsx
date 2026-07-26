import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export const DashboardPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">LingoVerse</h1>
          <div className="flex items-center gap-4">
            <Link to="/profile" className="text-blue-600 hover:underline">
              Profile
            </Link>
            <Link to="/settings" className="text-blue-600 hover:underline">
              Settings
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <p>
          Welcome to LingoVerse! Your language learning journey starts here.
        </p>
      </div>
    </div>
  );
};
