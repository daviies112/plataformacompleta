import { useState, useEffect } from "react";

export function use100ms(roomId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (roomId) {
      // Simulate connection delay
      const timer = setTimeout(() => {
        setIsConnected(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [roomId]);

  const joinRoom = () => {
    setIsJoined(true);
  };

  const leaveRoom = () => {
    setIsJoined(false);
  };

  return {
    isConnected,
    isJoined,
    joinRoom,
    leaveRoom
  };
}
