// WebinarLive.tsx - Live webinar screen with Vimeo Player API
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Clock, Users, Loader2, X, MessageCircle } from "lucide-react";

// Question interface
interface WebinarQuestion {
  id: string;
  question: string;
  timestamp: string;
  time: number; // Duration in seconds to show the question
  type: "text" | "mcq";
  options?: string[];
  answer?: string;
}

interface WebinarLiveProps {
  webinar: {
    id: string;
    title: string;
    date: string;
    vimeoLink: string;
    chatMessagesCount: number;
  };
  formatISTDateTime: (utcDate: string) => string;
  comments?: any[];
  newComment?: string;
  userName?: string;
  setNewComment?: (comment: string) => void;
  setUserName?: (name: string) => void;
  handleSendComment?: (timestamp: string) => Promise<void>;
  handleResponse?: (params: {
    questionId: string;
    questionType: string;
    response: string;
    timestamp: string;
  }) => Promise<{ success: boolean; error?: string }>;
  userId?: string;
}

// Mock questions data
const mockQuestions: WebinarQuestion[] = [
  {
    id: "q1",
    question: "What is the main topic of this webinar?",
    timestamp: "00:00:30",
    time: 10,
    type: "text",
  },
  {
    id: "q2",
    question: "Which of the following is a key benefit discussed so far?",
    timestamp: "00:00:50",
    time: 30,
    type: "mcq",
    options: [
      "Increased productivity",
      "Lower costs",
      "Better teamwork",
      "All of the above",
    ],
    answer: "All of the above",
  },
  {
    id: "q3",
    question: "What questions do you have about the last section?",
    timestamp: "00:01:30",
    time: 30,
    type: "text",
  },
  {
    id: "q4",
    question: "Which tool was demonstrated in the webinar?",
    timestamp: "00:02:00",
    time: 40,
    type: "mcq",
    options: ["Tool A", "Tool B", "Tool C", "Tool D"],
    answer: "Tool B",
  },
];

export const WebinarLive: React.FC<WebinarLiveProps> = ({
  webinar,
  formatISTDateTime,
  handleResponse,
  userId,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const totalWatchTimeRef = useRef<number>(0);

  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isWebinarEnded, setIsWebinarEnded] = useState<boolean>(false);

  // Question state management
  const [currentQuestion, setCurrentQuestion] =
    useState<WebinarQuestion | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [userResponses, setUserResponses] = useState<Record<string, string>>(
    {}
  );
  const [textResponse, setTextResponse] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");

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

  // Check if a question should be shown at current time
  const checkForQuestions = useCallback(
    (currentTime: number) => {
      // If there's already a question showing, check if it should be hidden
      if (currentQuestion && questionStartTime) {
        const elapsed = currentTime - questionStartTime;
        if (elapsed >= currentQuestion.time) {
          // Save response before hiding
          if (currentQuestion.type === "text" && textResponse.trim()) {
            setUserResponses((prev) => ({
              ...prev,
              [currentQuestion.id]: textResponse,
            }));
          } else if (currentQuestion.type === "mcq" && selectedOption) {
            setUserResponses((prev) => ({
              ...prev,
              [currentQuestion.id]: selectedOption,
            }));
          }

          // Hide question
          setCurrentQuestion(null);
          setQuestionStartTime(0);
          setTextResponse("");
          setSelectedOption("");
          return;
        }
      }

      // Check for new questions to show
      for (const question of mockQuestions) {
        const questionTime = timestampToSeconds(question.timestamp);
        if (
          currentTime >= questionTime &&
          currentTime < questionTime + question.time
        ) {
          // Check if this question is already being shown
          if (!currentQuestion || currentQuestion.id !== question.id) {
            setCurrentQuestion(question);
            setQuestionStartTime(currentTime);
            setTextResponse("");
            setSelectedOption("");
          }
          break;
        }
      }
    },
    [currentQuestion, questionStartTime, textResponse, selectedOption]
  );

  // Handle text response submission
  const handleTextSubmit = () => {
    if (currentQuestion && textResponse.trim()) {
      setUserResponses((prev) => ({
        ...prev,
        [currentQuestion.id]: textResponse,
      }));
      setCurrentQuestion(null);
      setQuestionStartTime(0);
      setTextResponse("");
    }
  };

  // Handle MCQ option selection
  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    setUserResponses((prev) => ({
      ...prev,
      [currentQuestion!.id]: option,
    }));
    // Auto-hide MCQ after selection
    setTimeout(() => {
      setCurrentQuestion(null);
      setQuestionStartTime(0);
      setSelectedOption("");
    }, 1000);
  };

  // Handle response submission when component unmounts or window closes
  const submitResponses = useCallback(async () => {
    if (!handleResponse || Object.keys(userResponses).length === 0) return;

    console.log("Submitting responses:", userResponses);

    // Submit each response to Firebase
    for (const [questionId, response] of Object.entries(userResponses)) {
      const question = mockQuestions.find((q) => q.id === questionId);
      if (question) {
        try {
          await handleResponse({
            questionId,
            questionType: question.type,
            response,
            timestamp: question.timestamp,
          });
        } catch (error) {
          console.error(`Error submitting response for ${questionId}:`, error);
        }
      }
    }
  }, [userResponses, handleResponse]);

  // Effect to check for questions when video time changes
  useEffect(() => {
    checkForQuestions(currentVideoTime);
  }, [currentVideoTime, checkForQuestions]);

  // Effect to check if webinar has ended
  useEffect(() => {
    if (videoDuration > 0 && currentVideoTime >= videoDuration) {
      setIsWebinarEnded(true);
      // Submit any remaining responses
      submitResponses();
    }
  }, [currentVideoTime, videoDuration, submitResponses]);

  // Effect to handle window close/component unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      submitResponses();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      submitResponses();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [submitResponses]);

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

          // Get video duration
          playerRef.current.getDuration().then((duration: number) => {
            setVideoDuration(duration);
          });
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

      // Handle responses before cleanup
      submitResponses();

      if (playerRef.current) {
        playerRef.current.off("timeupdate");
        playerRef.current.off("play");
        playerRef.current.off("pause");
        playerRef.current.off("loaded");
        playerRef.current.off("error");
      }
    };
  }, [isWebinarLoaded, videoId, submitResponses]);

  // Show loading state if webinar data is not loaded
  if (!isWebinarLoaded) {
    return (
      <section className="min-h-screen min-w-screen bg-gray-50 flex items-center justify-center">
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
      <section className="min-h-screen min-w-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Invalid video URL</p>
          <p className="text-gray-600">
            Please check the webinar configuration.
          </p>
        </div>
      </section>
    );
  }

  // Show webinar ended screen when video has finished
  if (isWebinarEnded) {
    return (
      <section className="min-h-screen min-w-screen bg-gray-50">
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
    <section className="min-h-screen min-w-screen bg-gray-50">
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

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section - Left Side (2/3 width) */}
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

          {/* Questions Section - Right Side (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              {currentQuestion ? (
                <div className="space-y-4">
                  <p className="text-gray-700 text-sm">
                    {currentQuestion.question}
                  </p>
                  {currentQuestion.type === "text" ? (
                    <div className="space-y-3">
                      <textarea
                        value={textResponse}
                        onChange={(e) => setTextResponse(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        rows={3}
                      />
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textResponse.trim()}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                      >
                        Submit Answer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentQuestion.options?.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleOptionSelect(option)}
                          className={`w-full p-3 text-left rounded-lg border transition-colors text-sm ${
                            selectedOption === option
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="mb-4">
                    <Clock className="w-12 h-12 mx-auto text-gray-300" />
                  </div>
                  <p className="text-sm">
                    Questions will appear here during the webinar
                  </p>
                  <p className="text-xs mt-2">Keep watching to participate!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
