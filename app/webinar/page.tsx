"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: number; // seconds into the video
};

export default function WebinarPage() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch chat messages from Firestore
  useEffect(() => {
    const fetchChats = async () => {
      const q = query(
        collection(db, "webinar_chats"),
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
  }, []);

  // Show messages according to video time
  const handleTimeUpdate = () => {
    const currentTime = videoRef.current?.currentTime || 0;
    setVisibleMessages(
      chatMessages.filter((msg) => msg.timestamp <= currentTime)
    );
  };

  // Log video view
  const handlePlay = async () => {
    try {
      await addDoc(collection(db, "webinar_views"), {
        viewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error logging webinar view:", error);
    }
  };

  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-primary via-info to-secondary py-0 px-0 flex justify-center items-stretch">
      <div className="flex flex-col md:flex-row w-full max-w-7xl h-screen items-stretch m-0">
        {/* Video Section */}
        <div className="flex-[2] flex items-stretch justify-stretch">
          <div className="w-full h-full aspect-video md:aspect-auto rounded-none md:rounded-l-2xl shadow-lg bg-black overflow-hidden">
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain md:rounded-l-2xl rounded-none"
              src="/webinar.mp4"
              onPlay={handlePlay}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        </div>
        {/* Chat Section */}
        <div className="flex-1 min-w-[300px] max-w-[400px] flex-shrink-0 flex items-stretch">
          <div className="bg-white/90 rounded-none md:rounded-r-2xl shadow-lg p-6 w-full h-full flex flex-col">
            <h2 className="text-xl font-bold text-primary mb-4 text-center">
              Live Chat
            </h2>
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
