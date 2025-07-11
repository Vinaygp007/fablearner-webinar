"use client";

import React, { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { Clock, Send, Users, MessageCircle } from "lucide-react";

interface UserLink {
  token: string;
  userId: string;
}

interface WebinarData {
  id: string;
  title: string;
  scheduleType: string;
  date: string;
  vimeoLink: string;
  userLinks: UserLink[];
  status: string;
  chatMessagesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  name: string;
  comment: string;
  timestamp: string;
  messageIndex: number;
  createdAt: string;
}

export default function WebinarPage(): JSX.Element {
  const [webinar, setWebinar] = useState<WebinarData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const webinarId: string = "3ee7a35e-dca7-4459-a925-2b094103c41f"; // Replace with dynamic ID from URL params

  // Mock token - in real app, get from URL params or auth
  const userToken: string = "e573c84d-6bc1-4601-95fd-c58ecb519f17";

  // Fetch webinar data
  useEffect(() => {
    const fetchWebinar = async (): Promise<void> => {
      try {
        const webinarDoc = await getDoc(doc(db, "webinar", webinarId));
        if (webinarDoc.exists()) {
          const webinarData: WebinarData = {
            id: webinarDoc.id,
            ...webinarDoc.data(),
          } as WebinarData;
          setWebinar(webinarData);

          // Validate token
          const validToken: boolean =
            webinarData.userLinks?.some(
              (link: UserLink) => link.token === userToken
            ) || false;
          setIsValidToken(validToken);

          // Check if webinar is live
          const scheduledTime: Date = new Date(webinarData.date);
          const now: Date = new Date();
          const timeDiff: number = scheduledTime.getTime() - now.getTime();

          if (Math.abs(timeDiff) <= 300000) {
            // 5 minutes tolerance
            setIsLive(true);
          } else if (timeDiff > 0) {
            setTimeUntilStart(timeDiff);
          }
        } else {
          setError("Webinar not found");
        }
      } catch (err) {
        setError("Error fetching webinar data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinar();
  }, [webinarId, userToken]);

  // Real-time comments listener
  useEffect(() => {
    if (!webinar || !isValidToken) return;

    const commentsRef = collection(db, "webinar", webinarId, "comments");
    const q = query(commentsRef, orderBy("messageIndex", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [webinar, webinarId, isValidToken]);

  // Timer update
  useEffect(() => {
    if (!timeUntilStart || !webinar) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const scheduledTime: Date = new Date(webinar.date);
      const now: Date = new Date();
      const timeDiff: number = scheduledTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setIsLive(true);
        setTimeUntilStart(null);
      } else {
        setTimeUntilStart(timeDiff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeUntilStart, webinar]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Send comment
  const handleSendComment = async (): Promise<void> => {
    if (!newComment.trim() || !userName.trim()) return;

    try {
      const commentsRef = collection(db, "webinar", webinarId, "comments");
      await addDoc(commentsRef, {
        name: userName,
        comment: newComment,
        timestamp: getCurrentVideoTime(),
        messageIndex: comments.length,
        createdAt: new Date().toISOString(),
      });

      setNewComment("");
    } catch (err) {
      console.error("Error sending comment:", err);
    }
  };

  const getCurrentVideoTime = (): string => {
    // In a real implementation, you'd get this from the video player
    const elapsed: number = Math.floor(
      (new Date().getTime() - new Date(webinar?.date || "").getTime()) / 1000
    );
    const minutes: number = Math.floor(elapsed / 60);
    const seconds: number = elapsed % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const formatTime = (milliseconds: number): string => {
    const hours: number = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes: number = Math.floor(
      (milliseconds % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds: number = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading webinar...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </section>
    );
  }

  if (!isValidToken) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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
  }

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {webinar?.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {webinar && new Date(webinar.date).toLocaleDateString()} at{" "}
              {webinar && new Date(webinar.date).toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {webinar?.chatMessagesCount || 0} participants
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {isLive ? (
                <div className="relative">
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </span>
                  </div>
                  <iframe
                    src={webinar?.vimeoLink}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-96"
                  ></iframe>
                </div>
              ) : timeUntilStart ? (
                <div className="h-96 bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                    <h3 className="text-2xl font-bold mb-2">
                      Webinar Starts In
                    </h3>
                    <div className="text-4xl font-mono font-bold text-blue-400">
                      {formatTime(timeUntilStart)}
                    </div>
                    <p className="text-gray-300 mt-4">
                      Get ready for an amazing session!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-96 bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold mb-2">Webinar Ended</h3>
                    <p className="text-gray-300">Thank you for joining us!</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg h-96 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat ({comments.length})
                </h3>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.map((comment: Comment) => (
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
                          <span className="text-xs text-gray-500">
                            {comment.timestamp}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              {isLive && (
                <div className="p-4 border-t bg-gray-50">
                  {!userName ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter your name..."
                        value={userName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserName(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        onClick={() => setUserName(userName)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Join Chat
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
