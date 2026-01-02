import { useCallback } from "react";
import { useMusicPlayer, Track } from "@/contexts/MusicPlayerContext";

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  video_url: string;
  duration?: number | null;
  channel?: {
    name?: string;
  };
}

export const usePlayVideo = () => {
  const { playTrack, playQueue, addToQueue, currentTrack, isPlaying, togglePlay } = useMusicPlayer();

  const videoToTrack = useCallback((video: Video): Track => ({
    id: video.id,
    title: video.title,
    thumbnail_url: video.thumbnail_url,
    video_url: video.video_url,
    duration: video.duration,
    channelName: video.channel?.name,
  }), []);

  const playVideo = useCallback((video: Video, playlist?: Video[]) => {
    const track = videoToTrack(video);
    const tracks = playlist?.map(videoToTrack);
    playTrack(track, tracks);
  }, [playTrack, videoToTrack]);

  const playVideoList = useCallback((videos: Video[], startIndex = 0) => {
    const tracks = videos.map(videoToTrack);
    playQueue(tracks, startIndex);
  }, [playQueue, videoToTrack]);

  const addVideoToQueue = useCallback((video: Video) => {
    addToQueue(videoToTrack(video));
  }, [addToQueue, videoToTrack]);

  const isCurrentlyPlaying = useCallback((videoId: string) => {
    return currentTrack?.id === videoId && isPlaying;
  }, [currentTrack, isPlaying]);

  const toggleVideoPlay = useCallback((video: Video) => {
    if (currentTrack?.id === video.id) {
      togglePlay();
    } else {
      playVideo(video);
    }
  }, [currentTrack, togglePlay, playVideo]);

  return {
    playVideo,
    playVideoList,
    addVideoToQueue,
    isCurrentlyPlaying,
    toggleVideoPlay,
  };
};
