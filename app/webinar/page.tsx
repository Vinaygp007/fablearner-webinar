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

  // Add this useEffect to extract token from URL
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("t");

      if (token) {
        setUserToken(token);
      } else {
        setError("No token provided in URL");
        setLoading(false);
      }
    }
  }, []);

  // Update the fetchWebinars useEffect dependency array to include userToken
  // and add a condition to only run when userToken is available:
  useEffect(() => {
    if (!userToken) return; // Don't run if no token yet

    const fetchWebinars = async (): Promise<void> => {
      try {
        // ... rest of your existing fetchWebinars logic
      } catch (err) {
        setError("Error fetching webinar data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, [userToken]);

  // Helper functions
  const getISTTime = (utcDate: string): Date => {
    const utcTime = new Date(utcDate);
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(utcTime.getTime() + istOffset);
  };

  const getCurrentISTTime = (): Date => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(now.getTime() + istOffset);
  };

  const formatTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatISTDateTime = (utcDate: string): string => {
    const istDate = getISTTime(utcDate);
    return istDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getCurrentVideoTime = (): string => {
    if (!webinar) return "00:00";

    const webinarISTTime = getISTTime(webinar.date);
    const currentISTTime = getCurrentISTTime();
    const elapsed = Math.floor(
      (currentISTTime.getTime() - webinarISTTime.getTime()) / 1000
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

  useEffect(() => {
    const fetchWebinars = async (): Promise<void> => {
      try {
        const webinarsRef = collection(db, "webinar");
        const webinarsSnapshot = await getDocs(webinarsRef);

        const webinars: WebinarData[] = webinarsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WebinarData[];

        const currentISTTime = getCurrentISTTime();

        const ongoingWebinar = webinars.find((w) => {
          const webinarISTTime = getISTTime(w.date);
          const timeDiff = Math.abs(
            currentISTTime.getTime() - webinarISTTime.getTime()
          );
          return timeDiff <= 300000; // 5 minutes tolerance
        });

        const upcomingWebinar = webinars.find((w) => {
          const webinarISTTime = getISTTime(w.date);
          return webinarISTTime.getTime() > currentISTTime.getTime();
        });

        let selectedWebinar: WebinarData | null = null;

        if (ongoingWebinar) {
          selectedWebinar = ongoingWebinar;
          setIsLive(true);
          setIsUpcoming(false);
        } else if (upcomingWebinar) {
          selectedWebinar = upcomingWebinar;
          setIsLive(false);
          setIsUpcoming(true);

          const webinarISTTime = getISTTime(upcomingWebinar.date);
          const timeDiff = webinarISTTime.getTime() - currentISTTime.getTime();
          setTimeUntilStart(timeDiff);
        }

        if (selectedWebinar) {
          setWebinar(selectedWebinar);

          let validToken: boolean = false;

          if (
            selectedWebinar.userLinks &&
            Array.isArray(selectedWebinar.userLinks)
          ) {
            validToken = selectedWebinar.userLinks.some(
              (link: UserLink) => link.token === userToken
            );
          } else if (
            selectedWebinar.userLinks &&
            typeof selectedWebinar.userLinks === "object"
          ) {
            validToken = Object.values(selectedWebinar.userLinks).some(
              (link: any) => link.token === userToken
            );
          }

          setIsValidToken(validToken);
        } else {
          setError("No webinars available at this time");
        }
      } catch (err) {
        setError("Error fetching webinar data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, [userToken]);

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

  // Timer update for upcoming webinars
  useEffect(() => {
    if (!timeUntilStart || !webinar || !isUpcoming) return;

    const timer = setInterval(() => {
      setCurrentTime(getCurrentISTTime());
      const webinarISTTime = getISTTime(webinar.date);
      const currentISTTime = getCurrentISTTime();
      const timeDiff = webinarISTTime.getTime() - currentISTTime.getTime();

      if (timeDiff <= 0) {
        setIsLive(true);
        setIsUpcoming(false);
        setTimeUntilStart(null);
      } else {
        setTimeUntilStart(timeDiff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeUntilStart, webinar, isUpcoming]);

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

  if (isUpcoming && timeUntilStart && webinar) {
    return (
      <WebinarTimer
        webinar={webinar}
        timeUntilStart={timeUntilStart}
        formatTime={formatTime}
        formatISTDateTime={formatISTDateTime}
      />
    );
  }

  if (isLive && webinar) {
    return (
      <WebinarLive
        webinar={webinar}
        comments={allComments} // Pass combined comments (Firebase + pending)
        newComment={newComment}
        userName={userName}
        setNewComment={setNewComment}
        setUserName={setUserName}
        handleSendComment={handleSendComment} // Now accepts timestamp
        formatISTDateTime={formatISTDateTime}
      />
    );
  }

  if (webinar) {
    return (
      <WebinarFinished
        webinar={webinar}
        formatISTDateTime={formatISTDateTime}
      />
    );
  }

  return <WebinarError error="No webinar found" />;
}
