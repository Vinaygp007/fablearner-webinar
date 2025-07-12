// WebinarLive.tsx - Live webinar screen with time-synced chat using Vimeo Player API
"use client";

import React, { useRef, useEffect, useState } from "react";
import { Clock, Send, Users, MessageCircle } from "lucide-react";

interface Comment {
  id: string;
  name: string;
  comment: string;
  timestamp: string; // Format: "00:05:28"
  messageIndex: number;
  createdAt: string;
}

interface WebinarLiveProps {
  webinar: {
    id: string;
    title: string;
    date: string;
    vimeoLink: string;
    chatMessagesCount: number;
  };
  comments: Comment[];
  newComment: string;
  userName: string;
  setNewComment: (comment: string) => void;
  setUserName: (name: string) => void;
  handleSendComment: () => void;
  formatISTDateTime: (utcDate: string) => string;
}

export const WebinarLive: React.FC<WebinarLiveProps> = ({
  webinar,
  comments,
  newComment,
  userName,
  setNewComment,
  setUserName,
  handleSendComment,
  formatISTDateTime,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const totalWatchTimeRef = useRef<number>(0);

  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [visibleComments, setVisibleComments] = useState<Comment[]>([]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Convert timestamp string to seconds
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Format seconds to timestamp string
  const secondsToTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize Vimeo Player with proper event handling
  useEffect(() => {
    if (!iframeRef.current) return;

    // Helper function to initialize player
    const initializePlayer = async () => {
      try {
        // Dynamically import Vimeo Player
        const Player = (await import("@vimeo/player")).default;
        playerRef.current = new Player(iframeRef.current!);

        // Set up time update listener
        playerRef.current.on("timeupdate", (data: { seconds: number }) => {
          setCurrentVideoTime(Math.floor(data.seconds));
        });

        // Set up play state listeners
        playerRef.current.on("play", () => {
          setIsVideoPlaying(true);
          startTimeRef.current = Date.now();
        });

        playerRef.current.on("pause", () => {
          setIsVideoPlaying(false);
          if (startTimeRef.current) {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            totalWatchTimeRef.current += elapsed;
            startTimeRef.current = 0;
          }
        });

        setIsPlayerReady(true);
      } catch (error) {
        console.error("Error initializing Vimeo player:", error);
      }
    };

    initializePlayer();

    // Cleanup function - this runs when component unmounts or video closes
    return () => {
      // Final time calculation before unmount
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        totalWatchTimeRef.current += elapsed;
      }

      // Log final watch time
      console.log(
        "Final watch time:",
        totalWatchTimeRef.current.toFixed(1),
        "seconds"
      );

      // Clean up player
      if (playerRef.current) {
        playerRef.current.off("timeupdate");
        playerRef.current.off("play");
        playerRef.current.off("pause");
      }
    };
  }, []);

  // Filter comments based on current video time (only when video is playing)
  useEffect(() => {
    console.log(comments);
    const currentTimeInSeconds = Math.floor(currentVideoTime);
    const newVisibleComments = comments.filter((comment) => {
      const commentTimeInSeconds = timestampToSeconds(comment.timestamp);
      // Show comments that have timestamps less than or equal to current time
      return commentTimeInSeconds <= currentTimeInSeconds;
    });

    // Sort by timestamp to maintain chronological order
    newVisibleComments.sort(
      (a, b) =>
        timestampToSeconds(a.timestamp) - timestampToSeconds(b.timestamp)
    );

    // Only update if there are actually changes
    if (
      JSON.stringify(visibleComments) !== JSON.stringify(newVisibleComments)
    ) {
      setVisibleComments(newVisibleComments);
    }
  }, [currentVideoTime]); // Remove isVideoPlaying from dependencies

  // Auto-scroll chat when new comments appear
  useEffect(() => {
    if (visibleComments.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleComments]);

  // Extract video ID from Vimeo URL for iframe src
  const getVimeoEmbedUrl = (vimeoLink: string): string => {
    const videoId = vimeoLink.match(/vimeo\.com\/(\d+)/)?.[1];
    return `https://player.vimeo.com/video/${videoId}?api=1&controls=1&sidedock=0&title=0&byline=0&portrait=0&badge=0&autoplay=1&muted=0`;
  };

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
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {isVideoPlaying ? "LIVE NOW" : "PAUSED"}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                  <span
                    className={`${
                      isVideoPlaying ? "bg-red-500" : "bg-gray-500"
                    } text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}
                  >
                    {isVideoPlaying && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                    {isVideoPlaying ? "LIVE" : "PAUSED"}
                  </span>
                </div>

                <iframe
                  ref={iframeRef}
                  src={`https://player.vimeo.com/video/${webinar.vimeoLink
                    .split("/")
                    .pop()}?api=1&controls=0&sidedock=0&title=0&byline=0&portrait=0&badge=0&autoplay=1`}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-96"
                ></iframe>
              </div>

              {/* Video Controls Info */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Current Time: {secondsToTimestamp(currentVideoTime)}
                  </span>
                  <span>
                    Watch Time: {totalWatchTimeRef.current.toFixed(1)}s
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      isVideoPlaying
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {isVideoPlaying ? "Playing" : "Paused"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg h-96 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Time-Synced Chat ({visibleComments.length}/{comments.length})
                </h3>
                <div className="text-xs text-gray-500 mt-1">
                  Video: {secondsToTimestamp(currentVideoTime)} •{" "}
                  {isVideoPlaying ? "Playing" : "Paused"}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visibleComments.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    {isVideoPlaying
                      ? "Comments will appear as the video progresses..."
                      : "Play the video to see time-synced comments"}
                  </div>
                ) : (
                  visibleComments.map((comment: Comment) => (
                    <div key={comment.id} className="group">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-medium text-sm">
                            {comment.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {comment.name}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {comment.timestamp}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {comment.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t bg-gray-50">
                {!userName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter your name to join chat..."
                      value={userName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserName(e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={() => setUserName(userName)}
                      disabled={!userName.trim()}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Chat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newComment}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewComment(e.target.value)
                        }
                        onKeyPress={(
                          e: React.KeyboardEvent<HTMLInputElement>
                        ) => e.key === "Enter" && handleSendComment()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Comment will be timestamped at:{" "}
                      {secondsToTimestamp(currentVideoTime)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
