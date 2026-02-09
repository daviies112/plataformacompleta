import { useEffect } from "react";
import {
  useHMSStore,
  useHMSActions,
  selectPeers,
  selectIsConnectedToRoom,
  HMSPeer,
  useVideo,
} from "@100mslive/react-sdk";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";

function PeerTile({ peer }: { peer: HMSPeer }) {
  const { videoRef } = useVideo({
    trackId: peer.videoTrack || "",
  });

  useEffect(() => {
    console.log(`[PeerTile ${peer.name}] Video track: ${peer.videoTrack}`);
  }, [peer.videoTrack, peer.name]);

  return (
    <Card className="relative aspect-video overflow-hidden bg-black border-none shadow-none">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      {!peer.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
          Sem vídeo: {peer.name}
        </div>
      )}
    </Card>
  );
}

export default function RecordingView() {
  const { roomId } = useParams();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);

  // CRÍTICO: Filtrar o bot (isLocal) para prevenir loop de feedback
  const peers = useHMSStore(selectPeers).filter(p =>
    !p.isLocal && // Remove o próprio bot
    p.roleName !== '__internal_recorder' &&
    !p.name?.toLowerCase().includes('bot')
  );

  useEffect(() => {
    if (isConnected) {
      console.log("[RecordingView] Conectado. Participantes filtrados:", peers.length);
      peers.forEach(p => console.log(` - ${p.name} (Role: ${p.roleName}, Track: ${p.videoTrack})`));
    }
  }, [isConnected, peers]);

  useEffect(() => {
    if (!token || !roomId) return;

    const join = async () => {
      try {
        await hmsActions.join({
          userName: "Bot de Gravação",
          authToken: token,
          settings: { isAudioMuted: true, isVideoMuted: true },
        });
      } catch (e) {
        console.error("[RecordingView] Erro ao conectar:", e);
      }
    };

    join();
    return () => { hmsActions.leave(); };
  }, [hmsActions, token, roomId]);

  if (!isConnected) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono">
        Conectando...
      </div>
    );
  }

  if (peers.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono text-center px-4">
        Aguardando participantes reais...<br />
        (Bot está oculto)
      </div>
    );
  }

  const gridCols = peers.length === 1 ? "grid-cols-1" :
    peers.length === 2 ? "grid-cols-2" :
      peers.length <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="h-screen w-screen bg-black p-0 overflow-hidden">
      <div className={`grid ${gridCols} w-full h-full gap-1 p-1`}>
        {peers.map((peer) => (
          <PeerTile key={peer.id} peer={peer} />
        ))}
      </div>
    </div>
  );
}
