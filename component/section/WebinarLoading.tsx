"use client";

import React from "react";

export const WebinarLoading: React.FC = () => {
  return (
    <section className="fixed inset-0 w-full h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading webinars...</p>
      </div>
    </section>
  );
};
