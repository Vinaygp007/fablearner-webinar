"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { useParams } from "next/navigation";

type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
};

type WebinarData = {
  scheduledTime: string;
  videoUrl: string;
  videoDuration: number;
};

export default function WebinarDynamicPage() {
  const params = useParams();
  const { webinarId, userId } = params;

  const [webinar, setWebinar] = useState<WebinarData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [timeSinceStart, setTimeSinceStart] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch webinar data (not hardcoded)
  useEffect(() => {
    if (!webinarId) return;
    const fetchWebinar = async () => {
      const docRef = doc(db, "webinar", webinarId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWebinar({
          scheduledTime: data.date,
          videoUrl: data.videoUrl, // Make sure this field exists!
          videoDuration: data.videoDuration, // Make sure this field exists!
        });
      }
    };
    fetchWebinar();
  }, [webinarId]);

  // Calculate time since scheduled start
  useEffect(() => {
    if (!webinar) return;
    const interval = setInterval(() => {
      const scheduled = new Date(webinar.scheduledTime);
      const now = new Date();
      setTimeSinceStart(
        Math.floor((now.getTime() - scheduled.getTime()) / 1000)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [webinar]);

  // Fetch chat messages
  useEffect(() => {
    if (!webinarId) return;
    const fetchChats = async () => {
      const q = query(
        collection(db, "webinar", webinarId as string, "comments"),
        orderBy("timestamp")
      );
      const snapshot = await getDocs(q);
      const chats: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chats.push({
          id: doc.id,
          sender: data.sender,
          message: data.message,
          timestamp: data.timestamp,
        });
      });
      setChatMessages(chats);
    };
    fetchChats();
  }, [webinarId]);

  // Show messages according to video time
  const handleTimeUpdate = () => {
    const currentTime = videoRef.current?.currentTime || 0;
    setVisibleMessages(
      chatMessages.filter((msg) => msg.timestamp <= currentTime)
    );
  };

  // Set video to correct time on load
  const handleLoadedMetadata = () => {
    if (!videoRef.current || !webinar) return;
    if (timeSinceStart < 0) {
      videoRef.current.currentTime = 0;
    } else if (timeSinceStart > webinar.videoDuration) {
      videoRef.current.currentTime = webinar.videoDuration;
      setVideoEnded(true);
    } else {
      videoRef.current.currentTime = timeSinceStart;
      videoRef.current.play();
    }
  };

  if (!webinar) {
    return (
      <div className="flex items-center justify-center min-h-screen text-2xl font-bold text-primary">
        Loading webinar...
      </div>
    );
  }

  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-primary via-info to-secondary py-0 px-0 flex justify-center items-stretch">
      <div className="flex flex-col md:flex-row w-full max-w-7xl h-screen items-stretch m-0">
        {/* Video Section */}
        <div className="flex-[2] flex items-stretch justify-stretch">
          <div className="w-full h-full aspect-video md:aspect-auto rounded-none md:rounded-l-2xl shadow-lg bg-black overflow-hidden flex items-center justify-center">
            {timeSinceStart < 0 ? (
              <div className="w-full text-center text-2xl font-bold text-primary flex items-center justify-center">
                Webinar starts in{" "}
                {Math.abs(Math.floor(timeSinceStart / 60))} min{" "}
                {Math.abs(timeSinceStart % 60)} sec
              </div>
            ) : timeSinceStart > webinar.videoDuration || videoEnded ? (
              <div className="w-full text-center text-2xl font-bold text-primary flex items-center justify-center">
                Webinar has ended.
              </div>
            ) : (
              <video
                ref={videoRef}
                controls
                className="w-full h-full object-contain md:rounded-l-2xl rounded-none"
                src={webinar.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            )}
          </div>
        </div>
        {/* Chat Section */}
        <div className="flex-1 min-w-[300px] max-w-[400px] flex-shrink-0 flex items-stretch">
          <div className="bg-white/90 rounded-none md:rounded-r-2xl shadow-lg p-6 w-full h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <h2 className="text-xl font-bold text-primary text-center flex-1">
                Live Chat
              </h2>
              <span className="text-xs text-secondary font-bold">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto text-gray-700 space-y-2">
              {visibleMessages.length === 0 && (
                <div className="text-center text-gray-400">
                  [Chat will appear as the webinar plays]
                </div>
              )}
              {visibleMessages.map((msg) => (
                <div key={msg.id}>
                  <span className="font-bold text-secondary">
                    {msg.sender}:{" "}
                  </span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}