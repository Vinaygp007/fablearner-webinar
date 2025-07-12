// 5. WebinarError.tsx - Error/No webinars screen
"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface WebinarErrorProps {
  error: string;
}

export const WebinarError: React.FC<WebinarErrorProps> = ({ error }) => {
  return (
    <section className="min-h-screen h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Webinars Available
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
        <p className="text-sm text-gray-500">
          Please check back later for upcoming webinars.
        </p>
      </div>
    </section>
  );
};
