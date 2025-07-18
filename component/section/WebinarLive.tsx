// WebinarLive.tsx - Live webinar screen with time-synced chat using Vimeo Player API
"use client";

import React, { useRef, useEffect, useState } from "react";
import { Clock, Send, Users, MessageCircle, Loader2 } from "lucide-react";

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
  handleSendComment: (timestamp: string) => void;
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
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Extract video ID from Vimeo URL safely
  const extractVideoId = (vimeoLink: string): string | null => {
    if (!vimeoLink) return null;

    try {
      // Handle different Vimeo URL formats
      const patterns = [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/,
        /vimeo\.com\/video\/(\d+)/,
      ];

      for (const pattern of patterns) {
        const match = vimeoLink.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error("Error extracting video ID:", error);
      return null;
    }
  };

  // Check if webinar data is loaded and valid
  const isWebinarLoaded =
    webinar && webinar.vimeoLink && webinar.vimeoLink.trim() !== "";
  const videoId = isWebinarLoaded ? extractVideoId(webinar.vimeoLink) : null;

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

  // Get current video timestamp
  const getCurrentVideoTimestamp = (): string => {
    return secondsToTimestamp(currentVideoTime);
  };

  // Handle sending comment with current timestamp
  const handleSendCommentWithTimestamp = () => {
    const currentTimestamp = getCurrentVideoTimestamp();
    handleSendComment(currentTimestamp);
  };

  // Initialize Vimeo Player with proper event handling
  useEffect(() => {
    if (!iframeRef.current || !isWebinarLoaded || !videoId) return;

    // Helper function to initialize player
    const initializePlayer = async () => {
      try {
        setIsVideoLoading(true);
        setVideoError(null);

        // Dynamically import Vimeo Player
        const Player = (await import("@vimeo/player")).default;
        playerRef.current = new Player(iframeRef.current!);

        // Set up ready event
        playerRef.current.on("loaded", () => {
          setIsVideoLoading(false);
          setIsPlayerReady(true);
        });

        // Set up error handling
        playerRef.current.on("error", (error: any) => {
          console.error("Vimeo player error:", error);
          setVideoError("Failed to load video. Please try again later.");
          setIsVideoLoading(false);
        });

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
      } catch (error) {
        console.error("Error initializing Vimeo player:", error);
        setVideoError("Failed to initialize video player.");
        setIsVideoLoading(false);
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        totalWatchTimeRef.current += elapsed;
      }

      console.log(
        "Final watch time:",
        totalWatchTimeRef.current.toFixed(1),
        "seconds"
      );

      if (playerRef.current) {
        playerRef.current.off("timeupdate");
        playerRef.current.off("play");
        playerRef.current.off("pause");
        playerRef.current.off("loaded");
        playerRef.current.off("error");
      }
    };
  }, [isWebinarLoaded, videoId]);

  useEffect(() => {
    // Helper function to convert timestamp to seconds
    interface ConvertToSeconds {
      (timestamp: string | number | undefined): number;
    }

    const convertToSeconds: ConvertToSeconds = (timestamp) => {
      if (!timestamp) return 0;

      if (typeof timestamp === "number") return timestamp;

      if (typeof timestamp === "string") {
        const parts = timestamp.split(":");
        if (parts.length === 2) {
          const minutes: number = parseInt(parts[0], 10) || 0;
          const seconds: number = parseInt(parts[1], 10) || 0;
          return minutes * 60 + seconds;
        } else if (parts.length === 3) {
          const hours: number = parseInt(parts[0], 10) || 0;
          const minutes: number = parseInt(parts[1], 10) || 0;
          const seconds: number = parseInt(parts[2], 10) || 0;
          return hours * 3600 + minutes * 60 + seconds;
        }
      }

      return 0;
    };

    const currentTimeInSeconds = Math.floor(Number(currentVideoTime) || 0);

    const newVisibleComments = comments.filter((comment) => {
      const commentTimeInSeconds = convertToSeconds(comment.timestamp);

      if (isNaN(commentTimeInSeconds) || isNaN(currentTimeInSeconds)) {
        console.warn("Invalid timestamp detected:", {
          original: comment.timestamp,
          converted: commentTimeInSeconds,
          currentTime: currentTimeInSeconds,
        });
        return false;
      }

      return commentTimeInSeconds <= currentTimeInSeconds;
    });

    newVisibleComments.sort((a, b) => {
      const timeA = convertToSeconds(a.timestamp);
      const timeB = convertToSeconds(b.timestamp);
      return timeA - timeB;
    });

    if (
      JSON.stringify(visibleComments) !== JSON.stringify(newVisibleComments)
    ) {
      setVisibleComments(newVisibleComments);
    }
  }, [currentVideoTime, comments]);

  // Auto-scroll chat when new comments appear
  useEffect(() => {
    if (visibleComments.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleComments]);

  // Show loading state if webinar data is not loaded
  if (!isWebinarLoaded) {
    return (
      <section className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading webinar...</p>
        </div>
      </section>
    );
  }

  // Show error state if video ID couldn't be extracted
  if (!videoId) {
    return (
      <section className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Invalid video URL</p>
          <p className="text-gray-600">
            Please check the webinar configuration.
          </p>
        </div>
      </section>
    );
  }

  const scheduledDate = new Date(webinar.date);
  const now = new Date();
  const offsetSeconds = Math.floor(
    (now.getTime() - scheduledDate.getTime()) / 1000
  );
  const isLate = offsetSeconds > 0;

  let vimeoUrl = webinar.vimeoLink + "&autoplay=1&controls=0&muted=0";
  if (isLate) {
    vimeoUrl += `#t=${offsetSeconds}s`;
  }

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
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {getCurrentVideoTimestamp()}
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

                {/* Video Loading State */}
                {isVideoLoading && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading video...</p>
                    </div>
                  </div>
                )}

                {/* Video Error State */}
                {videoError && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-20">
                    <div className="text-center text-white">
                      <p className="text-sm text-red-400">{videoError}</p>
                    </div>
                  </div>
                )}

                {/* Vimeo iframe - only render when video ID is available */}
                {videoId && (
                  <iframe
                    ref={iframeRef}
                    src={vimeoUrl}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-96"
                  />
                )}
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
                  Live Chat
                </h3>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {visibleComments.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    {isVideoPlaying
                      ? "Comments will appear as the Live progresses..."
                      : "No comments yet..."}
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
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter your name to join the chat..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base text-black"
                    />
                    <button
                      onClick={() => setUserName(userName)}
                      disabled={!userName.trim()}
                      className={`w-full py-3 px-4 rounded-lg text-base font-medium transition-colors ${
                        !userName.trim()
                          ? "bg-blue-300 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      Join Chat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendCommentWithTimestamp()
                        }
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base text-black"
                      />
                      <button
                        onClick={handleSendCommentWithTimestamp}
                        disabled={!newComment.trim()}
                        className={`py-3 px-4 rounded-lg transition-colors ${
                          !newComment.trim()
                            ? "bg-blue-300 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <Send className="w-5 h-5" />
                      </button>
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
