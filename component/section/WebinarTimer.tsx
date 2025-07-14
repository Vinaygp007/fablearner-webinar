"use client";

import React from "react";
import { Clock } from "lucide-react";

interface WebinarTimerProps {
  webinar: {
    title: string;
    date: string;
  };
  timeUntilStart: number;
  formatTime: (milliseconds: number) => string;
  formatISTDateTime: (utcDate: string) => string;
}

export const WebinarTimer: React.FC<WebinarTimerProps> = ({
  webinar,
  timeUntilStart,
  formatTime,
  formatISTDateTime,
}) => {
  return (
    <section className="min-h-screen h-screen w-full bg-gray-50 flex items-center justify-center px-4">
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
            <span className="bg-pink-600/30 text-white px-2 py-1 rounded-full text-xs font-medium">
              UPCOMING
            </span>
          </div>
        </div>

        {/* Timer Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-96 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h3 className="text-2xl font-bold mb-2">Webinar Starts In</h3>
              <div className="text-4xl font-mono font-bold text-blue-400">
                {formatTime(timeUntilStart)}
              </div>
              <p className="text-gray-300 mt-4">
                Get ready for an amazing session!
              </p>
              <div className="mt-4 text-sm text-gray-400">
                Starting at {formatISTDateTime(webinar.date)} (IST)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
