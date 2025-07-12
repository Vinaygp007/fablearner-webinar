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

export default function WebinarPage(): JSX.Element {
  const [webinar, setWebinar] = useState<WebinarData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isUpcoming, setIsUpcoming] = useState<boolean>(false);
  const [timeUntilStart, setTimeUntilStart] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mock token - in real app, get from URL params or auth
  const userToken: string = "8a3d570a-48e2-40bc-8f42-d0aaee8554ea";

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

  const handleSendComment = async (): Promise<void> => {
    if (!newComment.trim() || !userName.trim() || !webinar) return;

    try {
      const commentsRef = collection(db, "webinar", webinar.id, "comments");
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

  // All your existing useEffect hooks remain the same...
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

  // Real-time comments listener
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
        comments={comments}
        newComment={newComment}
        userName={userName}
        setNewComment={setNewComment}
        setUserName={setUserName}
        handleSendComment={handleSendComment}
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
