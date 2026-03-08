"use client";

import { useEffect, useRef } from "react";
import { useMeetController } from "./useMeetController";

function VideoSurface({ stream, muted = false, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream || null;
  }, [stream]);

  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function Tile({ name, stream, audioEnabled, videoEnabled, muted = false, active = false, onClick }) {
  return (
    <button className={active ? "meet-tile active" : "meet-tile"} type="button" onClick={onClick}>
      {videoEnabled && stream ? (
        <VideoSurface stream={stream} muted={muted} className="meet-video" />
      ) : (
        <div className="meet-avatar">{(name || "?").charAt(0).toUpperCase()}</div>
      )}
      <div className="meet-tile-meta">
        <span>{name || "Guest"}</span>
        <span>{audioEnabled ? "Mic on" : "Mic off"}</span>
      </div>
    </button>
  );
}

export default function MeetApp() {
  const {
    roomInput,
    setRoomInput,
    roomId,
    inCall,
    connecting,
    audioEnabled,
    videoEnabled,
    remoteParticipants,
    selectedPeerId,
    setSelectedPeerId,
    selectedParticipant,
    error,
    emojiBursts,
    localVideoRef,
    localPreviewStream,
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    copyRoomId,
    sendEmoji
  } = useMeetController();

  const quickEmojis = ["\u{1F44D}", "\u{1F44F}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{1F602}", "\u{1F389}", "\u{1F60A}", "\u{1F680}"];

  if (!inCall) {
    return (
      <main className="meet-shell">
        <div className="meet-lobby">
          <p className="eyebrow">Together Space Meet</p>
          <h1>Join a video room</h1>
          <p>Meet with up to 8 people and share live reactions.</p>
          <div className="meet-lobby-row">
            <input
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Room code"
            />
            <button className="button" type="button" onClick={joinMeeting} disabled={connecting}>
              {connecting ? "Joining..." : "Join meeting"}
            </button>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="meet-shell">
      <section className="meet-room">
        <header className="meet-head">
          <div>
            <h2>Room: {roomId}</h2>
            <small>{remoteParticipants.length + 1}/8 participants</small>
          </div>
          <div className="row">
            <button className="button ghost" type="button" onClick={copyRoomId}>
              Copy room ID
            </button>
          </div>
        </header>

        <div className="meet-layout">
          <section className="meet-stage">
            {selectedParticipant?.peerId === "local" ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="meet-video stage" />
            ) : selectedParticipant?.videoEnabled && selectedParticipant?.stream ? (
              <VideoSurface stream={selectedParticipant?.stream || null} className="meet-video stage" />
            ) : (
              <div className="meet-avatar stage-avatar">
                {(selectedParticipant?.username || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="meet-stage-meta">
              <span>{selectedParticipant?.username || "Unknown"}</span>
              <span>{selectedParticipant?.audioEnabled ? "Mic on" : "Mic off"}</span>
            </div>
          </section>

          <aside className="meet-side">
            <Tile
              name="You"
              stream={localPreviewStream}
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              muted
              active={selectedPeerId === "local"}
              onClick={() => setSelectedPeerId("local")}
            />
            {remoteParticipants.map((participant) => (
              <Tile
                key={participant.peerId}
                name={participant.username}
                stream={participant.stream}
                audioEnabled={participant.audioEnabled}
                videoEnabled={participant.videoEnabled}
                active={selectedPeerId === participant.peerId}
                onClick={() => setSelectedPeerId(participant.peerId)}
              />
            ))}
          </aside>
        </div>

        <footer className="meet-controls">
          <div className="meet-emoji-row">
            {quickEmojis.map((emoji) => (
              <button key={emoji} className="reaction" type="button" onClick={() => sendEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
          <button className={audioEnabled ? "button ghost" : "button"} type="button" onClick={toggleAudio}>
            {audioEnabled ? "Mute" : "Unmute"}
          </button>
          <button className={videoEnabled ? "button ghost" : "button"} type="button" onClick={toggleVideo}>
            {videoEnabled ? "Camera off" : "Camera on"}
          </button>
          <button className="button meet-leave" type="button" onClick={leaveMeeting}>
            Leave call
          </button>
        </footer>
        {emojiBursts.length ? (
          <div className="meet-emoji-burst">
            {emojiBursts.map((item) => (
              <div key={item.id} className="meet-emoji-item">
                <span>{item.emoji}</span>
                <small>{item.username}</small>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
