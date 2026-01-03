import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Context types for playback
export type PlaybackContextType = 
  | "PLAYLIST" 
  | "CHANNEL" 
  | "SEARCH_RESULTS" 
  | "HOME_FEED" 
  | "RELATED"
  | "MEDITATION";

export interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  duration: number | null;
  view_count: number | null;
  channel_name?: string;
  channel_id?: string;
  category?: string | null;
}

export interface PlaybackSession {
  session_id: string;
  user_id: string | null;
  start_video_id: string;
  context_type: PlaybackContextType;
  context_id: string | null; // playlist_id, channel_id, etc.
  queue: VideoItem[];
  history: string[]; // Array of video IDs that have been played
  current_index: number;
  position_ms: number;
  autoplay: boolean;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  created_at: string;
}

interface VideoPlaybackContextType {
  // Session state
  session: PlaybackSession | null;
  currentVideo: VideoItem | null;
  isAutoplayEnabled: boolean;
  
  // Session management
  createSession: (
    videoId: string, 
    contextType: PlaybackContextType, 
    contextId?: string | null,
    initialQueue?: VideoItem[]
  ) => Promise<void>;
  resumeSession: () => void;
  clearSession: () => void;
  
  // Playback control
  nextVideo: () => VideoItem | null;
  previousVideo: () => VideoItem | null;
  skipToVideo: (videoId: string) => void;
  
  // Queue management
  addToQueue: (video: VideoItem) => void;
  removeFromQueue: (videoId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  
  // Settings
  setAutoplay: (enabled: boolean) => void;
  setShuffle: (enabled: boolean) => void;
  setRepeat: (mode: "off" | "all" | "one") => void;
  
  // Progress tracking
  updateProgress: (positionMs: number) => void;
  
  // Up Next preview
  getUpNext: (count?: number) => VideoItem[];
  
  // Anti-repeat status
  canPlayVideo: (videoId: string) => boolean;
}

const VideoPlaybackContext = createContext<VideoPlaybackContextType | undefined>(undefined);

const HISTORY_LIMIT = 20; // Don't repeat videos in last 20 played
const SESSION_STORAGE_KEY = "funplay_playback_session";

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const exhaustedPoolRef = useRef<Set<string>>(new Set());

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        if (parsed.queue[parsed.current_index]) {
          setCurrentVideo(parsed.queue[parsed.current_index]);
        }
      } catch (e) {
        console.error("Failed to restore playback session:", e);
      }
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  // Generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fetch related videos for queue generation
  const fetchRelatedVideos = async (
    currentVideoId: string,
    category: string | null,
    channelId: string | null,
    excludeIds: string[]
  ): Promise<VideoItem[]> => {
    const results: VideoItem[] = [];
    
    // 1. Videos from same category
    if (category) {
      const { data: categoryVideos } = await (supabase
        .from("videos") as any)
        .select(`
          id, title, thumbnail_url, video_url, duration, view_count, category,
          channels!inner (id, name)
        `)
        .eq("is_public", true)
        .eq("category", category)
        .not("id", "in", `(${[currentVideoId, ...excludeIds].join(",")})`)
        .order("view_count", { ascending: false })
        .limit(10);
      
      if (categoryVideos) {
        results.push(...categoryVideos.map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          duration: v.duration,
          view_count: v.view_count,
          channel_name: v.channels?.name,
          channel_id: v.channels?.id,
          category: v.category,
        })));
      }
    }

    // 2. Videos from same channel
    if (channelId && results.length < 15) {
      const { data: channelVideos } = await (supabase
        .from("videos") as any)
        .select(`
          id, title, thumbnail_url, video_url, duration, view_count, category,
          channels!inner (id, name)
        `)
        .eq("is_public", true)
        .eq("channel_id", channelId)
        .not("id", "in", `(${[currentVideoId, ...excludeIds, ...results.map(r => r.id)].join(",")})`)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (channelVideos) {
        results.push(...channelVideos.map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          duration: v.duration,
          view_count: v.view_count,
          channel_name: v.channels?.name,
          channel_id: v.channels?.id,
          category: v.category,
        })));
      }
    }

    // 3. Fallback: trending/recent videos
    if (results.length < 20) {
      const allExcludeIds = [currentVideoId, ...excludeIds, ...results.map(r => r.id)];
      const { data: trendingVideos } = await (supabase
        .from("videos") as any)
        .select(`
          id, title, thumbnail_url, video_url, duration, view_count, category,
          channels!inner (id, name)
        `)
        .eq("is_public", true)
        .not("id", "in", `(${allExcludeIds.join(",")})`)
        .order("view_count", { ascending: false })
        .limit(20 - results.length);
      
      if (trendingVideos) {
        results.push(...trendingVideos.map((v: any) => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          duration: v.duration,
          view_count: v.view_count,
          channel_name: v.channels?.name,
          channel_id: v.channels?.id,
          category: v.category,
        })));
      }
    }

    return results;
  };

  // Fetch playlist videos
  const fetchPlaylistVideos = async (playlistId: string): Promise<VideoItem[]> => {
    const { data } = await (supabase
      .from("playlist_videos") as any)
      .select(`
        position,
        videos (
          id, title, thumbnail_url, video_url, duration, view_count, category,
          channels (id, name)
        )
      `)
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true });

    if (!data) return [];

    return data
      .filter((item: any) => item.videos)
      .map((item: any) => {
        const v = item.videos;
        return {
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: v.video_url,
          duration: v.duration,
          view_count: v.view_count,
          channel_name: v.channels?.name,
          channel_id: v.channels?.id,
          category: v.category,
        };
      });
  };

  // Fetch channel videos
  const fetchChannelVideos = async (channelId: string, currentVideoId: string): Promise<VideoItem[]> => {
    const { data } = await (supabase
      .from("videos") as any)
      .select(`
        id, title, thumbnail_url, video_url, duration, view_count, category,
        channels (id, name)
      `)
      .eq("is_public", true)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) return [];

    return data.map((v: any) => ({
      id: v.id,
      title: v.title,
      thumbnail_url: v.thumbnail_url,
      video_url: v.video_url,
      duration: v.duration,
      view_count: v.view_count,
      channel_name: v.channels?.name,
      channel_id: v.channels?.id,
      category: v.category,
    }));
  };

  // Create a new playback session
  const createSession = useCallback(async (
    videoId: string,
    contextType: PlaybackContextType,
    contextId?: string | null,
    initialQueue?: VideoItem[]
  ) => {
    let queue: VideoItem[] = initialQueue || [];
    
    // Fetch current video info if not in queue
    let startVideo: VideoItem | null = queue.find(v => v.id === videoId) || null;
    
    if (!startVideo) {
      const { data } = await (supabase
        .from("videos") as any)
        .select(`
          id, title, thumbnail_url, video_url, duration, view_count, category,
          channels (id, name)
        `)
        .eq("id", videoId)
        .single();
      
      if (data) {
        startVideo = {
          id: data.id,
          title: data.title,
          thumbnail_url: data.thumbnail_url,
          video_url: data.video_url,
          duration: data.duration,
          view_count: data.view_count,
          channel_name: data.channels?.name,
          channel_id: data.channels?.id,
          category: data.category,
        };
      }
    }

    if (!startVideo) return;

    // Build queue based on context
    if (queue.length === 0 || contextType !== "PLAYLIST") {
      switch (contextType) {
        case "PLAYLIST":
          if (contextId) {
            queue = await fetchPlaylistVideos(contextId);
          }
          break;
        case "CHANNEL":
          if (contextId) {
            queue = await fetchChannelVideos(contextId, videoId);
          }
          break;
        case "HOME_FEED":
        case "RELATED":
        case "SEARCH_RESULTS":
        default:
          // Start with current video, then fetch related
          queue = [startVideo];
          const related = await fetchRelatedVideos(
            videoId,
            startVideo.category || null,
            startVideo.channel_id || null,
            [videoId]
          );
          queue.push(...related);
          break;
      }
    }

    // Ensure current video is in queue
    const currentIndex = queue.findIndex(v => v.id === videoId);
    if (currentIndex === -1) {
      queue.unshift(startVideo);
    }

    const newSession: PlaybackSession = {
      session_id: generateSessionId(),
      user_id: null, // Will be set from auth context
      start_video_id: videoId,
      context_type: contextType,
      context_id: contextId || null,
      queue,
      history: [videoId],
      current_index: currentIndex === -1 ? 0 : currentIndex,
      position_ms: 0,
      autoplay: true,
      shuffle: false,
      repeat: "off",
      created_at: new Date().toISOString(),
    };

    setSession(newSession);
    setCurrentVideo(startVideo);
    exhaustedPoolRef.current.clear();
  }, []);

  // Check if a video can be played (anti-repeat)
  const canPlayVideo = useCallback((videoId: string): boolean => {
    if (!session) return true;
    
    // Never repeat the immediately previous video
    if (session.history.length > 0 && session.history[session.history.length - 1] === videoId) {
      return false;
    }
    
    // Check if video is in recent history
    const recentHistory = session.history.slice(-HISTORY_LIMIT);
    if (recentHistory.includes(videoId)) {
      // Only allow if all eligible videos have been exhausted
      const eligibleVideos = session.queue.filter(v => !recentHistory.includes(v.id));
      if (eligibleVideos.length > 0) {
        return false;
      }
      // All videos exhausted, check exhausted pool
      if (exhaustedPoolRef.current.has(videoId)) {
        return false;
      }
    }
    
    return true;
  }, [session]);

  // Get next video based on context and anti-repeat rules
  const nextVideo = useCallback((): VideoItem | null => {
    if (!session || session.queue.length === 0) return null;

    // Handle repeat one
    if (session.repeat === "one") {
      return currentVideo;
    }

    let nextIdx: number;
    let nextVid: VideoItem | null = null;

    if (session.shuffle) {
      // Shuffle mode: find a random unplayed video
      const recentHistory = session.history.slice(-HISTORY_LIMIT);
      let candidates = session.queue.filter(v => 
        v.id !== currentVideo?.id && !recentHistory.includes(v.id)
      );
      
      // If all exhausted, reset (but avoid immediate repeat)
      if (candidates.length === 0) {
        if (session.repeat === "all") {
          candidates = session.queue.filter(v => v.id !== currentVideo?.id);
          exhaustedPoolRef.current.clear();
        } else {
          return null; // End of queue
        }
      }
      
      if (candidates.length > 0) {
        nextVid = candidates[Math.floor(Math.random() * candidates.length)];
        nextIdx = session.queue.findIndex(v => v.id === nextVid!.id);
      } else {
        return null;
      }
    } else {
      // Sequential mode
      nextIdx = session.current_index + 1;
      
      if (nextIdx >= session.queue.length) {
        if (session.repeat === "all") {
          nextIdx = 0;
        } else {
          return null; // End of queue
        }
      }
      
      nextVid = session.queue[nextIdx];
      
      // Anti-repeat check
      if (!canPlayVideo(nextVid.id)) {
        // Find next eligible video
        for (let i = 1; i <= session.queue.length; i++) {
          const checkIdx = (session.current_index + i) % session.queue.length;
          if (canPlayVideo(session.queue[checkIdx].id)) {
            nextIdx = checkIdx;
            nextVid = session.queue[checkIdx];
            break;
          }
        }
      }
    }

    if (nextVid) {
      setSession(prev => {
        if (!prev) return null;
        const newHistory = [...prev.history, nextVid!.id].slice(-50); // Keep last 50
        return {
          ...prev,
          current_index: nextIdx,
          history: newHistory,
          position_ms: 0,
        };
      });
      setCurrentVideo(nextVid);
    }

    return nextVid;
  }, [session, currentVideo, canPlayVideo]);

  // Get previous video from history
  const previousVideo = useCallback((): VideoItem | null => {
    if (!session || session.history.length < 2) return null;

    const prevVideoId = session.history[session.history.length - 2];
    const prevVid = session.queue.find(v => v.id === prevVideoId);
    
    if (prevVid) {
      const prevIdx = session.queue.findIndex(v => v.id === prevVideoId);
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          current_index: prevIdx,
          history: prev.history.slice(0, -1),
          position_ms: 0,
        };
      });
      setCurrentVideo(prevVid);
    }

    return prevVid || null;
  }, [session]);

  // Skip to specific video
  const skipToVideo = useCallback((videoId: string) => {
    if (!session) return;
    
    const idx = session.queue.findIndex(v => v.id === videoId);
    if (idx === -1) return;
    
    const video = session.queue[idx];
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        current_index: idx,
        history: [...prev.history, videoId].slice(-50),
        position_ms: 0,
      };
    });
    setCurrentVideo(video);
  }, [session]);

  // Add video to queue
  const addToQueue = useCallback((video: VideoItem) => {
    setSession(prev => {
      if (!prev) return null;
      // Add after current position
      const newQueue = [...prev.queue];
      newQueue.splice(prev.current_index + 1, 0, video);
      return { ...prev, queue: newQueue };
    });
  }, []);

  // Remove video from queue
  const removeFromQueue = useCallback((videoId: string) => {
    setSession(prev => {
      if (!prev) return null;
      const idx = prev.queue.findIndex(v => v.id === videoId);
      if (idx === -1) return prev;
      
      const newQueue = prev.queue.filter(v => v.id !== videoId);
      let newIndex = prev.current_index;
      
      // Adjust current index if needed
      if (idx < prev.current_index) {
        newIndex--;
      } else if (idx === prev.current_index && newQueue.length > 0) {
        newIndex = Math.min(newIndex, newQueue.length - 1);
      }
      
      return {
        ...prev,
        queue: newQueue,
        current_index: Math.max(0, newIndex),
      };
    });
  }, []);

  // Reorder queue
  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setSession(prev => {
      if (!prev) return null;
      const newQueue = [...prev.queue];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      
      // Adjust current index
      let newCurrentIndex = prev.current_index;
      if (fromIndex === prev.current_index) {
        newCurrentIndex = toIndex;
      } else if (fromIndex < prev.current_index && toIndex >= prev.current_index) {
        newCurrentIndex--;
      } else if (fromIndex > prev.current_index && toIndex <= prev.current_index) {
        newCurrentIndex++;
      }
      
      return {
        ...prev,
        queue: newQueue,
        current_index: newCurrentIndex,
      };
    });
  }, []);

  // Settings
  const setAutoplay = useCallback((enabled: boolean) => {
    setSession(prev => prev ? { ...prev, autoplay: enabled } : null);
  }, []);

  const setShuffle = useCallback((enabled: boolean) => {
    setSession(prev => prev ? { ...prev, shuffle: enabled } : null);
  }, []);

  const setRepeat = useCallback((mode: "off" | "all" | "one") => {
    setSession(prev => prev ? { ...prev, repeat: mode } : null);
  }, []);

  // Progress tracking
  const updateProgress = useCallback((positionMs: number) => {
    setSession(prev => prev ? { ...prev, position_ms: positionMs } : null);
  }, []);

  // Get up next videos
  const getUpNext = useCallback((count: number = 10): VideoItem[] => {
    if (!session) return [];
    
    const startIdx = session.current_index + 1;
    const upNext: VideoItem[] = [];
    
    for (let i = 0; i < count && startIdx + i < session.queue.length; i++) {
      upNext.push(session.queue[startIdx + i]);
    }
    
    return upNext;
  }, [session]);

  // Resume session
  const resumeSession = useCallback(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        if (parsed.queue[parsed.current_index]) {
          setCurrentVideo(parsed.queue[parsed.current_index]);
        }
      } catch (e) {
        console.error("Failed to restore playback session:", e);
      }
    }
  }, []);

  // Clear session
  const clearSession = useCallback(() => {
    setSession(null);
    setCurrentVideo(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    exhaustedPoolRef.current.clear();
  }, []);

  return (
    <VideoPlaybackContext.Provider
      value={{
        session,
        currentVideo,
        isAutoplayEnabled: session?.autoplay ?? true,
        createSession,
        resumeSession,
        clearSession,
        nextVideo,
        previousVideo,
        skipToVideo,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        setAutoplay,
        setShuffle,
        setRepeat,
        updateProgress,
        getUpNext,
        canPlayVideo,
      }}
    >
      {children}
    </VideoPlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const context = useContext(VideoPlaybackContext);
  if (context === undefined) {
    throw new Error("useVideoPlayback must be used within a VideoPlaybackProvider");
  }
  return context;
}
