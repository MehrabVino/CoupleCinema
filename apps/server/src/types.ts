export type Participant = {
  socketId: string;
  name: string;
  isHost: boolean;
};

export type JoinPayload = {
  code: string;
  name: string;
  hostToken?: string;
};

export type PlaybackPayload = {
  code: string;
  currentTime: number;
  isPlaying: boolean;
  source: "play" | "pause" | "seek" | "sync";
};

export type ChatPayload = {
  code: string;
  senderName: string;
  type: "TEXT" | "IMAGE";
  content?: string;
  imagePath?: string;
};

export type SignalPayload = {
  to: string;
  from: string;
  data: unknown;
};

