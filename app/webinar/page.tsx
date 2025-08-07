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
  where,
  writeBatch,
} from "firebase/firestore";
import { WebinarTimer } from "@/component/section/WebinarTimer";
import { WebinarLive } from "@/component/section/WebinarLive";
import { WebinarAccessDenied } from "@/component/section/WebinarAccessDenied";
import { WebinarFinished } from "@/component/section/WebinarFinished";
import { WebinarError } from "@/component/section/WebinarError";
import { WebinarLoading } from "@/component/section/WebinarLoading";

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

interface PendingComment {
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
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isUpcoming, setIsUpcoming] = useState<boolean>(false);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wasLive, setWasLive] = useState<boolean>(false);
  const [userToken, setUserToken] = useState<string>("");
  const [webinarId, setWebinarId] = useState<string>("");
  const [scheduledISTTime, setScheduledISTTime] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string>("");

  // Extract token and wid from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("t");
      const wid = urlParams.get("wid");
      if (token && wid) {
        setUserToken(token);
        setWebinarId(wid);
      } else {
        setError("Missing token or webinar ID in URL");
        setLoading(false);
      }
    }
  }, []);

  // Fetch webinar by ID and check token
  useEffect(() => {
    if (!userToken || !webinarId) return;
    const fetchWebinar = async (): Promise<void> => {
      try {
        const webinarRef = doc(db, "webinar", webinarId);
        const webinarSnap = await getDoc(webinarRef);
        if (!webinarSnap.exists()) {
          setError("Webinar not found");
          setLoading(false);
          return;
        }
        const w = { id: webinarSnap.id, ...webinarSnap.data() } as WebinarData;
        // Check token
        let validToken = false;
        let foundUserId = "";
        if (w.userLinks && Array.isArray(w.userLinks)) {
          const found = w.userLinks.find(
            (link: UserLink) => link.token === userToken
          );
          validToken = !!found;
          if (found) foundUserId = found.userId;
        } else if (w.userLinks && typeof w.userLinks === "object") {
          const found = Object.values(w.userLinks).find(
            (link: any) => link.token === userToken
          );
          validToken = !!found;
          if (found) foundUserId = (found as UserLink).userId;
        }
        setIsValidToken(validToken);
        setWebinar(w);
        setUserId(foundUserId);
        // Determine scheduled IST time
        let scheduledDate: Date;
        if (w.scheduleType === "custom" && w.date) {
          scheduledDate = getISTTime(w.date);
        } else if (
          (w.scheduleType === "saturday" || w.scheduleType === "sunday") &&
          !w.date
        ) {
          // Compute next Saturday or Sunday at 6:00 PM IST
          const now = getCurrentISTTime();
          let targetDay = w.scheduleType === "saturday" ? 6 : 0; // 0=Sun, 6=Sat
          let daysToAdd = (targetDay - now.getDay() + 7) % 7;
          if (daysToAdd === 0 && now.getHours() >= 18) {
            daysToAdd = 7; // If today is the day but past 6pm, go to next week
          }
          scheduledDate = new Date(now);
          scheduledDate.setDate(now.getDate() + daysToAdd);
          scheduledDate.setHours(18, 0, 0, 0); // 6:00 PM IST
        } else if (w.date) {
          scheduledDate = getISTTime(w.date);
        } else {
          setError("No scheduled date for this webinar");
          setLoading(false);
          return;
        }
        setScheduledISTTime(scheduledDate);
        // Set live/upcoming state
        const now = getCurrentISTTime();
        if (now < scheduledDate) {
          setIsLive(false);
          setIsUpcoming(true);
          setTimeUntilStart(scheduledDate.getTime() - now.getTime());
        } else if (now >= scheduledDate) {
          setIsLive(true);
          setIsUpcoming(false);
          setTimeUntilStart(null);
        }
      } catch (err) {
        setError("Error fetching webinar data");
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    fetchWebinar();
  }, [userToken, webinarId]);

  // Helper functions
  const getISTTime = (utcDate: string): Date => {
    const utcTime = new Date(utcDate);
    const istOffset = 1000;
    return new Date(utcTime.getTime() + istOffset);
  };

  // Return local time (assume system is set to IST or use as-is)
  const getCurrentISTTime = (): Date => {
    return new Date();
  };

  const formatTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Update all time displays to use scheduledISTTime
  const formatISTDateTime = (dateOrString: string | Date): string => {
    let istDate: Date;
    if (typeof dateOrString === "string") {
      istDate = getISTTime(dateOrString);
    } else {
      istDate = dateOrString;
    }
    return istDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getCurrentVideoTime = (): string => {
    if (!scheduledISTTime) return "00:00";
    const now = getCurrentISTTime();
    const elapsed = Math.floor(
      (now.getTime() - scheduledISTTime.getTime()) / 1000
    );
    if (elapsed < 0) return "00:00";
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Sync pending comments to Firebase when live session ends
  const syncPendingCommentsToFirebase = async (): Promise<void> => {
    if (!webinar || pendingComments.length === 0) return;

    try {
      const batch = writeBatch(db);
      const commentsRef = collection(db, "webinar", webinar.id, "comments");

      console.log(
        `Syncing ${pendingComments.length} pending comments to Firebase...`
      );

      pendingComments.forEach((comment) => {
        const docRef = doc(commentsRef);
        batch.set(docRef, {
          name: comment.name,
          comment: comment.comment,
          timestamp: comment.timestamp,
          messageIndex: comment.messageIndex,
          createdAt: comment.createdAt,
        });
      });

      await batch.commit();
      console.log("All pending comments synced to Firebase successfully!");

      // Clear pending comments after successful sync
      setPendingComments([]);
    } catch (err) {
      console.error("Error syncing pending comments to Firebase:", err);
    }
  };

  // Handle sending comment with timestamp
  const handleSendComment = async (timestamp: string): Promise<void> => {
    if (!newComment.trim() || !userName.trim() || !webinar) return;

    try {
      const commentData: PendingComment = {
        id: `pending-${Date.now()}-${Math.random()}`,
        name: userName,
        comment: newComment,
        timestamp: timestamp,
        messageIndex: allComments.length,
        createdAt: new Date().toISOString(),
      };

      if (isLive) {
        // During live session, add to pending comments and local state
        setPendingComments((prev) => [...prev, commentData]);
        setAllComments((prev) => [...prev, commentData as Comment]);
        console.log("Comment added to pending queue:", commentData);
      } else {
        // If not live, directly add to Firebase
        const commentsRef = collection(db, "webinar", webinar.id, "comments");
        await addDoc(commentsRef, {
          name: commentData.name,
          comment: commentData.comment,
          timestamp: commentData.timestamp,
          messageIndex: commentData.messageIndex,
          createdAt: commentData.createdAt,
        });
        console.log("Comment added directly to Firebase:", commentData);
      }

      setNewComment("");
    } catch (err) {
      console.error("Error sending comment:", err);
    }
  };

  /**
   * Store user response in the "response" subcollection within the "webinar" collection
   *
   * @param questionId - Unique identifier for the question
   * @param questionType - Type of question (text, mcq, etc.)
   * @param response - User's response text
   * @param timestamp - Video timestamp when response was submitted
   * @returns Promise with success status and optional error message
   *
   * Example usage:
   * const result = await handleResponse({
   *   questionId: "q1",
   *   questionType: "text",
   *   response: "My answer here",
   *   timestamp: "00:05:30"
   * });
   *
   * if (result.success) {
   *   console.log("Response saved successfully");
   * } else {
   *   console.error("Error:", result.error);
   * }
   */
  const handleResponse = async ({
    questionId,
    questionType,
    response,
    timestamp,
  }: {
    questionId: string;
    questionType: string;
    response: string;
    timestamp: string;
  }): Promise<{ success: boolean; error?: string }> => {
    // Validation
    if (!webinar) {
      return { success: false, error: "Webinar not found" };
    }
    if (!userId) {
      return { success: false, error: "User ID not found" };
    }
    if (!userName) {
      return { success: false, error: "User name not found" };
    }
    if (!questionId) {
      return { success: false, error: "Question ID is required" };
    }
    if (!response || response.trim() === "") {
      return { success: false, error: "Response cannot be empty" };
    }
    if (!timestamp) {
      return { success: false, error: "Timestamp is required" };
    }

    try {
      const responseRef = collection(db, "webinar", webinar.id, "response");

      // Create response document with additional metadata
      const responseData = {
        userId,
        userName,
        questionId,
        questionType: questionType || "text",
        response: response.trim(),
        timestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        webinarId: webinar.id,
        webinarTitle: webinar.title,
      };

      const docRef = await addDoc(responseRef, responseData);

      console.log("Response saved successfully:", {
        docId: docRef.id,
        questionId,
        response: responseData.response.substring(0, 50) + "...",
      });

      return { success: true };
    } catch (err) {
      console.error("Error saving response:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      };
    }
  };

  // Function to retrieve responses from the response subcollection
  const getResponses = async (questionId?: string): Promise<any[]> => {
    if (!webinar) return [];

    try {
      const responseRef = collection(db, "webinar", webinar.id, "response");
      let q = query(responseRef, orderBy("createdAt", "desc"));

      if (questionId) {
        q = query(
          responseRef,
          where("questionId", "==", questionId),
          orderBy("createdAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (err) {
      console.error("Error fetching responses:", err);
      return [];
    }
  };

  // Update allComments when comments or pendingComments change
  useEffect(() => {
    const combined = [...comments, ...pendingComments];
    combined.sort((a, b) => a.messageIndex - b.messageIndex);
    setAllComments(combined);
  }, [comments, pendingComments]);

  // Monitor live state changes and sync when live ends
  useEffect(() => {
    if (wasLive && !isLive) {
      // Live session just ended, sync pending comments
      syncPendingCommentsToFirebase();
    }
    setWasLive(isLive);
  }, [isLive, wasLive]);

  // Cleanup: sync pending comments when component unmounts
  useEffect(() => {
    return () => {
      if (pendingComments.length > 0) {
        syncPendingCommentsToFirebase();
      }
    };
  }, [pendingComments]);

  // Real-time comments listener (only for Firebase comments)
  useEffect(() => {
    if (!webinar || !isValidToken) return;

    const commentsRef = collection(db, "webinar", webinar.id, "comments");
    const q = query(commentsRef, orderBy("messageIndex", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [webinar, isValidToken]);

  // Real-time responses listener (optional - for admin dashboard)
  useEffect(() => {
    if (!webinar || !isValidToken) return;

    const responsesRef = collection(db, "webinar", webinar.id, "response");
    const q = query(responsesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responsesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(
        "Real-time responses update:",
        responsesData.length,
        "responses"
      );
      // You can store this in state if needed for admin dashboard
    });

    return () => unsubscribe();
  }, [webinar, isValidToken]);

  // Timer update for upcoming webinars (use scheduledISTTime)
  useEffect(() => {
    if (!timeUntilStart || !webinar || !isUpcoming || !scheduledISTTime) return;
    const timer = setInterval(() => {
      setCurrentTime(getCurrentISTTime());
      const now = getCurrentISTTime();
      const timeDiff = scheduledISTTime.getTime() - now.getTime();
      if (timeDiff <= 0) {
        setIsLive(true);
        setIsUpcoming(false);
        setTimeUntilStart(null);
      } else {
        setTimeUntilStart(timeDiff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeUntilStart, webinar, isUpcoming, scheduledISTTime]);

  // Render appropriate component based on state
  if (loading) {
    return <WebinarLoading />;
  }

  if (error) {
    return <WebinarError error={error} />;
  }

  if (!isValidToken) {
    return <WebinarAccessDenied />;
  }

  if (isUpcoming && timeUntilStart && webinar && scheduledISTTime) {
    return (
      <WebinarTimer
        webinar={webinar}
        timeUntilStart={timeUntilStart}
        formatTime={formatTime}
        formatISTDateTime={() => formatISTDateTime(scheduledISTTime)}
      />
    );
  }
  if (isLive && webinar && scheduledISTTime) {
    return (
      <WebinarLive
        webinar={webinar}
        comments={allComments}
        newComment={newComment}
        userName={userName}
        setNewComment={setNewComment}
        setUserName={setUserName}
        handleSendComment={handleSendComment}
        formatISTDateTime={() => formatISTDateTime(scheduledISTTime)}
        handleResponse={handleResponse}
        userId={userId}
      />
    );
  }
  if (webinar && scheduledISTTime) {
    return (
      <WebinarFinished
        webinar={webinar}
        formatISTDateTime={() => formatISTDateTime(scheduledISTTime)}
      />
    );
  }

  return <WebinarError error="No webinar found" />;
}
