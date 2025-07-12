// 3. WebinarAccessDenied.tsx - Invalid token screen
"use client";

import React from "react";
import { Users } from "lucide-react";

export const WebinarAccessDenied: React.FC = () => {
  return (
    <section className="min-h-screen h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Required
          </h2>
          <p className="text-gray-600">
            Join FableLearner Masterclass to access this exclusive webinar
            content.
          </p>
        </div>
        <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Join Masterclass
        </button>
      </div>
    </section>
  );
};
