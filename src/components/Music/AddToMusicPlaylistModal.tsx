import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Music, Lock, Globe, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Playlist {
  id: string;
  name: string;
  is_public: boolean | null;
  track_count?: number;
}

interface AddToMusicPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
}

export function AddToMusicPlaylistModal({
  isOpen,
  onClose,
  trackId,
  trackTitle,
}: AddToMusicPlaylistModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchPlaylists();
      checkExistingPlaylists();
    }
  }, [isOpen, user]);

  const fetchPlaylists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("playlists")
        .select("id, name, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get track count for each playlist
      const playlistsWithCount = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from("playlist_videos")
            .select("*", { count: "exact", head: true })
            .eq("playlist_id", playlist.id);
          return { ...playlist, track_count: count || 0 };
        })
      );

      setPlaylists(playlistsWithCount);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPlaylists = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("playlist_videos")
        .select("playlist_id")
        .eq("video_id", trackId);

      if (data) {
        setAddedPlaylists(new Set(data.map((d) => d.playlist_id)));
      }
    } catch (error) {
      console.error("Error checking existing playlists:", error);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      if (addedPlaylists.has(playlistId)) {
        // Remove from playlist
        await supabase
          .from("playlist_videos")
          .delete()
          .eq("playlist_id", playlistId)
          .eq("video_id", trackId);

        setAddedPlaylists((prev) => {
          const newSet = new Set(prev);
          newSet.delete(playlistId);
          return newSet;
        });

        toast({ title: "Đã xóa khỏi playlist" });
      } else {
        // Add to playlist
        const { count } = await supabase
          .from("playlist_videos")
          .select("*", { count: "exact", head: true })
          .eq("playlist_id", playlistId);

        await supabase.from("playlist_videos").insert({
          playlist_id: playlistId,
          video_id: trackId,
          position: (count || 0) + 1,
        });

        setAddedPlaylists((prev) => new Set([...prev, playlistId]));

        toast({
          title: "Đã thêm vào playlist!",
          description: trackTitle,
        });
      }

      // Refresh playlist counts
      fetchPlaylists();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreatePlaylist = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!newPlaylistName.trim()) {
      toast({
        title: "Vui lòng nhập tên playlist",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: newPlaylist, error: playlistError } = await supabase
        .from("playlists")
        .insert({
          user_id: user.id,
          name: newPlaylistName.trim(),
          is_public: newPlaylistPublic,
        })
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Add current track to the new playlist
      await supabase.from("playlist_videos").insert({
        playlist_id: newPlaylist.id,
        video_id: trackId,
        position: 1,
      });

      toast({
        title: "Đã tạo playlist mới!",
        description: `Đã thêm "${trackTitle}" vào playlist "${newPlaylistName}"`,
      });

      setNewPlaylistName("");
      setShowCreateForm(false);
      setAddedPlaylists((prev) => new Set([...prev, newPlaylist.id]));
      fetchPlaylists();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Thêm vào Playlist</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Đăng nhập để tạo và quản lý playlist của bạn
            </p>
            <Button onClick={() => navigate("/auth")}>Đăng nhập</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Thêm vào Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Track being added */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Bài hát:</p>
            <p className="font-medium truncate">{trackTitle}</p>
          </div>

          {/* Create new playlist */}
          <AnimatePresence mode="wait">
            {showCreateForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 border rounded-lg p-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="playlist-name">Tên playlist</Label>
                  <Input
                    id="playlist-name"
                    placeholder="Nhập tên playlist..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {newPlaylistPublic ? (
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {newPlaylistPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>
                  <Switch
                    checked={newPlaylistPublic}
                    onCheckedChange={setNewPlaylistPublic}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreatePlaylist}
                    disabled={creating || !newPlaylistName.trim()}
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Tạo
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Tạo playlist mới
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Existing playlists */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : playlists.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-4">
                {playlists.map((playlist) => {
                  const isAdded = addedPlaylists.has(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isAdded
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                          isAdded
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {isAdded ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Music className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {playlist.is_public ? (
                            <Globe className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          <span>{playlist.track_count || 0} bài hát</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Bạn chưa có playlist nào</p>
              <p className="text-sm">Tạo playlist đầu tiên ngay!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
