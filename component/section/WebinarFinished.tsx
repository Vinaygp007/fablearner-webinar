// 4. WebinarFinished.tsx - Webinar ended screen
"use client";

import React from "react";
import { MessageCircle, Clock, Users } from "lucide-react";

interface WebinarFinishedProps {
  webinar: {
    title: string;
    date: string;
    chatMessagesCount: number;
  };
  formatISTDateTime: (utcDate: string) => string;
}

export const WebinarFinished: React.FC<WebinarFinishedProps> = ({
  webinar,
  formatISTDateTime,
}) => {
  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {webinar.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatISTDateTime(webinar.date)} (IST)
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {webinar.chatMessagesCount || 0} participants
            </span>
            <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              ENDED
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-96 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-bold mb-2">Webinar Ended</h3>
              <p className="text-gray-300 mb-4">Thank you for joining us!</p>
              <div className="text-sm text-gray-400">
                Session ended at {formatISTDateTime(webinar.date)} (IST)
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-gray-300">
                  We hope you enjoyed the session.
                </p>
                <p className="text-gray-400 text-sm">
                  Look out for our next webinar!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
