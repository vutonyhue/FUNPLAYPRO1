
-- Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  subscriber_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are viewable by everyone" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Users can create their own channel" ON public.channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own channel" ON public.channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own channel" ON public.channels FOR DELETE USING (auth.uid() = user_id);

-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration integer DEFAULT 0,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  category text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT USING (is_public = true);
CREATE POLICY "Channel owners can view all their videos" ON public.videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.channels WHERE channels.id = videos.channel_id AND channels.user_id = auth.uid())
);
CREATE POLICY "Channel owners can insert videos" ON public.videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.channels WHERE channels.id = channel_id AND channels.user_id = auth.uid())
);
CREATE POLICY "Channel owners can update videos" ON public.videos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.channels WHERE channels.id = videos.channel_id AND channels.user_id = auth.uid())
);
CREATE POLICY "Channel owners can delete videos" ON public.videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.channels WHERE channels.id = videos.channel_id AND channels.user_id = auth.uid())
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Channel owners can view their subscribers" ON public.subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.channels WHERE channels.id = subscriptions.channel_id AND channels.user_id = auth.uid())
);
CREATE POLICY "Users can subscribe" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsubscribe" ON public.subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own playlists" ON public.playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create playlists" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING (auth.uid() = user_id);

-- Create playlist_videos junction table
CREATE TABLE IF NOT EXISTS public.playlist_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlist videos follow playlist visibility" ON public.playlist_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND (playlists.is_public = true OR playlists.user_id = auth.uid()))
);
CREATE POLICY "Playlist owners can add videos" ON public.playlist_videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid())
);
CREATE POLICY "Playlist owners can remove videos" ON public.playlist_videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.user_id = auth.uid())
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  like_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (video_id IS NOT NULL OR comment_id IS NOT NULL)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  token_symbol text DEFAULT 'CAMLY',
  tx_hash text,
  from_address text,
  to_address text,
  status text DEFAULT 'pending',
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create reward_transactions table
CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  reason text,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON public.reward_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create rewards" ON public.reward_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all rewards" ON public.reward_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create meditation_playlists table
CREATE TABLE IF NOT EXISTS public.meditation_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meditation_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public meditation playlists are viewable" ON public.meditation_playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own meditation playlists" ON public.meditation_playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create meditation playlists" ON public.meditation_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meditation playlists" ON public.meditation_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meditation playlists" ON public.meditation_playlists FOR DELETE USING (auth.uid() = user_id);

-- Create meditation_playlist_videos junction table
CREATE TABLE IF NOT EXISTS public.meditation_playlist_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.meditation_playlists(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

ALTER TABLE public.meditation_playlist_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meditation playlist videos follow playlist visibility" ON public.meditation_playlist_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meditation_playlists WHERE meditation_playlists.id = meditation_playlist_videos.playlist_id AND (meditation_playlists.is_public = true OR meditation_playlists.user_id = auth.uid()))
);
CREATE POLICY "Playlist owners can add meditation videos" ON public.meditation_playlist_videos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.meditation_playlists WHERE meditation_playlists.id = playlist_id AND meditation_playlists.user_id = auth.uid())
);
CREATE POLICY "Playlist owners can remove meditation videos" ON public.meditation_playlist_videos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.meditation_playlists WHERE meditation_playlists.id = meditation_playlist_videos.playlist_id AND meditation_playlists.user_id = auth.uid())
);

-- Create triggers for updated_at
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
