-- Create watch_history table
CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  last_position_seconds integer DEFAULT 0,
  watch_time_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  watched_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch history" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert watch history" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watch history" ON public.watch_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watch history" ON public.watch_history FOR DELETE USING (auth.uid() = user_id);

-- Create watch_later table
CREATE TABLE IF NOT EXISTS public.watch_later (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch later" ON public.watch_later FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to watch later" ON public.watch_later FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from watch later" ON public.watch_later FOR DELETE USING (auth.uid() = user_id);

-- Create daily_reward_limits table
CREATE TABLE IF NOT EXISTS public.daily_reward_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  view_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  total_earned numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_reward_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limits" ON public.daily_reward_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own limits" ON public.daily_reward_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own limits" ON public.daily_reward_limits FOR UPDATE USING (auth.uid() = user_id);

-- Create view_logs table
CREATE TABLE IF NOT EXISTS public.view_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  watch_duration integer DEFAULT 0,
  rewarded boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own view logs" ON public.view_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert view logs" ON public.view_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create comment_logs table
CREATE TABLE IF NOT EXISTS public.comment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  rewarded boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own comment logs" ON public.comment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert comment logs" ON public.comment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for daily_reward_limits updated_at
CREATE TRIGGER update_daily_reward_limits_updated_at BEFORE UPDATE ON public.daily_reward_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();