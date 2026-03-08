"use client";

import { useMemo, useRef } from "react";
import { useCinemaController } from "./useCinemaController";

export default function CinemaApp() {
  const localVideoRef = useRef(null);
  const {
    roomInput,
    setRoomInput,
    roomId,
    joining,
    inRoom,
    videoUrl,
    videoDraft,
    setVideoDraft,
    participants,
    participantCount,
    remoteVoiceParticipants,
    messages,
    chatDraft,
    setChatDraft,
    localVideoName,
    error,
    videoRef,
    joinRoom,
    leaveRoom,
    emitState,
    loadVideo,
    loadLocalVideo,
    sendChat,
    copyRoomId,
    voiceEnabled,
    toggleVoice
  } = useCinemaController();

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  if (!inRoom) {
    return (
      <main className="cinema-shell">
        <section className="cinema-lobby">
          <p className="eyebrow">Together Space Watch</p>
          <h1>Start Or Join A Watch Room</h1>
          <p>Paste a direct video URL (mp4/webm) and sync playback with your group.</p>
          <div className="cinema-lobby-row">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room code"
            />
            <button className="button" type="button" onClick={joinRoom} disabled={joining}>
              {joining ? "Joining..." : "Join Room"}
            </button>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="cinema-shell">
      <section className="cinema-room">
        <header className="cinema-head">
          <div>
            <h2>Room: {roomId}</h2>
            <small>{participantCount}/8 watching</small>
          </div>
          <div className="row">
            <button className="button ghost" type="button" onClick={copyRoomId}>
              Copy Room ID
            </button>
          </div>
        </header>

        <div className="cinema-layout">
          <section className="cinema-stage">
            <div className="cinema-source">
              <input
                ref={(node) => {
                  localVideoRef.current = node;
                }}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => {
                  loadLocalVideo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                value={videoDraft}
                onChange={(e) => setVideoDraft(e.target.value)}
                placeholder="Video URL"
              />
              <button className="button" type="button" onClick={loadVideo}>
                Load Video
              </button>
              <button className="button ghost" type="button" onClick={() => localVideoRef.current?.click()}>
                Load local file
              </button>
            </div>
            {localVideoName ? <div className="cinema-local-note">Local video: {localVideoName}</div> : null}
            {videoUrl ? (
              <video
                ref={videoRef}
                className="cinema-video"
                src={videoUrl}
                controls
                playsInline
                onPlay={() => emitState({ paused: false })}
                onPause={() => emitState({ paused: true })}
                onSeeked={() => emitState()}
              />
            ) : (
              <div className="cinema-placeholder">Paste a video URL to start watching together</div>
            )}
          </section>

          <aside className="cinema-side">
            <div className="cinema-card">
              <h4>Participants</h4>
              <div className="cinema-users">
                {participants.map((p) => (
                  <div key={p.peerId} className="cinema-user">
                    <span>{(p.username || "?").charAt(0).toUpperCase()}</span>
                    <strong>{p.username}</strong>
                    <small>{p.audioEnabled ? "Mic on" : "Mic off"}</small>
                  </div>
                ))}
                {!participants.length ? <small className="muted">Only you in room</small> : null}
              </div>
            </div>

            <div className="cinema-card cinema-chat">
              <h4>Room Chat</h4>
              <div className="cinema-messages">
                {sortedMessages.map((m) => (
                  <div key={m.id} className={m.system ? "cinema-msg system" : "cinema-msg"}>
                    <strong>{m.username}</strong>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
              <div className="cinema-chat-row">
                <input
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Message"
                />
                <button className="button" type="button" onClick={sendChat}>
                  Send
                </button>
              </div>
            </div>
          </aside>
        </div>

        <div className="cinema-audio-sinks" aria-hidden="true">
          {remoteVoiceParticipants.map((participant) => (
            <audio
              key={`voice_${participant.peerId}`}
              autoPlay
              playsInline
              ref={(node) => {
                if (node) node.srcObject = participant.stream || null;
              }}
            />
          ))}
        </div>

        <footer className="cinema-controls">
          <button className={voiceEnabled ? "button ghost" : "button"} type="button" onClick={toggleVoice}>
            {voiceEnabled ? "Mute Voice" : "Join Voice"}
          </button>
          <button className="button meet-leave" type="button" onClick={leaveRoom}>
            Leave Room
          </button>
        </footer>
      </section>
    </main>
  );
}
