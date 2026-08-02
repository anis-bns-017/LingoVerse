import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { VoiceRoomView } from "./VoiceRoomView";

export const VoiceRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  if (!roomId) {
    return <div className="p-6">Invalid room</div>;
  }

  const handleLeave = () => {
    navigate("/voice");
  };

  return <VoiceRoomView roomId={roomId} onLeave={handleLeave} />;
};
