CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: approve_user_reward(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_user_reward(p_user_id uuid, p_admin_id uuid, p_note text DEFAULT NULL::text) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pending_amount numeric;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve rewards';
  END IF;

  SELECT pending_rewards INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to approve';
  END IF;
  
  UPDATE profiles SET 
    pending_rewards = 0,
    approved_reward = COALESCE(approved_reward, 0) + v_pending_amount
  WHERE id = p_user_id;
  
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'approved', p_admin_id, p_note, now());
  
  RETURN v_pending_amount;
END;
$$;


--
-- Name: ban_user_permanently(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ban_user_permanently(p_admin_id uuid, p_user_id uuid, p_reason text DEFAULT 'Lạm dụng hệ thống'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet text;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  SELECT wallet_address INTO v_wallet FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET 
    banned = true,
    banned_at = now(),
    ban_reason = p_reason,
    violation_level = 3,
    pending_rewards = 0,
    approved_reward = 0
  WHERE id = p_user_id;
  
  IF v_wallet IS NOT NULL THEN
    INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id, created_by)
    VALUES (v_wallet, p_reason, true, p_user_id, p_admin_id)
    ON CONFLICT (wallet_address) DO NOTHING;
  END IF;
  
  INSERT INTO reward_bans (user_id, reason, expires_at, created_by)
  VALUES (p_user_id, p_reason, now() + interval '100 years', p_admin_id);
  
  RETURN true;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Create channel
  INSERT INTO public.channels (user_id, name, description)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email) || '''s Channel',
    'Welcome to my channel!'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: reject_user_reward(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_user_reward(p_user_id uuid, p_admin_id uuid, p_note text DEFAULT NULL::text) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pending_amount numeric;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject rewards';
  END IF;

  SELECT pending_rewards INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET pending_rewards = 0 WHERE id = p_user_id;
  
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, COALESCE(v_pending_amount, 0), 'rejected', p_admin_id, p_note, now());
  
  RETURN COALESCE(v_pending_amount, 0);
END;
$$;


--
-- Name: unban_user(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unban_user(p_admin_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;
  
  UPDATE profiles SET 
    banned = false,
    banned_at = NULL,
    ban_reason = NULL,
    violation_level = 0
  WHERE id = p_user_id;
  
  DELETE FROM reward_bans WHERE user_id = p_user_id;
  
  DELETE FROM blacklisted_wallets WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;


--
-- Name: update_channel_subscriber_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_channel_subscriber_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.channels
    SET subscriber_count = (
      SELECT COUNT(*) FROM public.subscriptions WHERE channel_id = NEW.channel_id
    )
    WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.channels
    SET subscriber_count = (
      SELECT COUNT(*) FROM public.subscriptions WHERE channel_id = OLD.channel_id
    )
    WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: blacklisted_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blacklisted_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address text NOT NULL,
    reason text,
    is_permanent boolean DEFAULT true,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    banner_url text,
    subscriber_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: claim_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claim_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    wallet_address text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    tx_hash text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    claim_type text DEFAULT 'manual'::text,
    gas_fee numeric DEFAULT 0
);


--
-- Name: comment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    is_valid boolean DEFAULT false NOT NULL,
    is_rewarded boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content_hash text,
    session_id uuid
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    like_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_hashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_hashes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid,
    content_hash text NOT NULL,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_reward_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_reward_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    view_rewards_earned numeric DEFAULT 0 NOT NULL,
    comment_rewards_earned numeric DEFAULT 0 NOT NULL,
    upload_rewards_earned numeric DEFAULT 0 NOT NULL,
    uploads_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid,
    comment_id uuid,
    is_dislike boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT likes_check CHECK ((((video_id IS NOT NULL) AND (comment_id IS NULL)) OR ((video_id IS NULL) AND (comment_id IS NOT NULL))))
);


--
-- Name: meditation_playlist_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meditation_playlist_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    video_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meditation_playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meditation_playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_featured boolean DEFAULT false,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_statistics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    total_users integer DEFAULT 0 NOT NULL,
    active_users integer DEFAULT 0 NOT NULL,
    total_videos integer DEFAULT 0 NOT NULL,
    total_views integer DEFAULT 0 NOT NULL,
    total_comments integer DEFAULT 0 NOT NULL,
    total_rewards_distributed numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playlist_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    video_id uuid NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    content text NOT NULL,
    image_url text,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text,
    avatar_url text,
    bio text,
    wallet_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    background_music_url text,
    music_enabled boolean DEFAULT false,
    wallet_type text,
    total_camly_rewards numeric DEFAULT 0 NOT NULL,
    music_url text,
    pending_rewards numeric DEFAULT 0,
    last_claim_at timestamp with time zone,
    banned boolean DEFAULT false,
    banned_at timestamp with time zone,
    ban_reason text,
    violation_level integer DEFAULT 0,
    avatar_verified boolean DEFAULT false,
    approved_reward numeric DEFAULT 0,
    signup_rewarded boolean DEFAULT false,
    wallet_connect_rewarded boolean DEFAULT false,
    first_upload_rewarded boolean DEFAULT false
);


--
-- Name: reward_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_id uuid,
    admin_note text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reward_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: reward_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value numeric NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: reward_config_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_config_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid,
    config_key text NOT NULL,
    old_value numeric,
    new_value numeric NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now()
);


--
-- Name: reward_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reward_enabled boolean DEFAULT false NOT NULL,
    reward_token text DEFAULT 'CAMLY'::text NOT NULL,
    reward_amount numeric DEFAULT 9.999 NOT NULL,
    min_watch_percentage integer DEFAULT 80 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reward_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid,
    amount numeric NOT NULL,
    reward_type text NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    tx_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed boolean DEFAULT false NOT NULL,
    claimed_at timestamp with time zone,
    claim_tx_hash text
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscriber_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    ip_hash text,
    user_agent_hash text,
    started_at timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: video_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_migrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    original_video_url text NOT NULL,
    original_thumbnail_url text,
    new_video_url text,
    new_thumbnail_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: video_watch_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_watch_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    watch_percentage integer DEFAULT 0 NOT NULL,
    rewarded boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_position_seconds integer DEFAULT 0
);


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    video_url text NOT NULL,
    thumbnail_url text,
    duration integer,
    view_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    dislike_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'general'::text,
    file_size bigint
);


--
-- Name: view_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.view_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    watch_time_seconds integer DEFAULT 0 NOT NULL,
    video_duration_seconds integer,
    watch_percentage integer DEFAULT 0 NOT NULL,
    is_valid boolean DEFAULT false NOT NULL,
    session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    session_ref uuid
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_user_id uuid,
    to_user_id uuid,
    from_address text NOT NULL,
    to_address text NOT NULL,
    video_id uuid,
    token_type text NOT NULL,
    amount numeric(36,18) NOT NULL,
    tx_hash text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.wallet_transactions REPLICA IDENTITY FULL;


--
-- Name: watch_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    last_position_seconds integer DEFAULT 0,
    watch_time_seconds integer DEFAULT 0,
    completed boolean DEFAULT false,
    watched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: watch_later; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_later (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blacklisted_wallets blacklisted_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklisted_wallets
    ADD CONSTRAINT blacklisted_wallets_pkey PRIMARY KEY (id);


--
-- Name: blacklisted_wallets blacklisted_wallets_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklisted_wallets
    ADD CONSTRAINT blacklisted_wallets_wallet_address_key UNIQUE (wallet_address);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: channels channels_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_user_id_key UNIQUE (user_id);


--
-- Name: claim_requests claim_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claim_requests
    ADD CONSTRAINT claim_requests_pkey PRIMARY KEY (id);


--
-- Name: comment_logs comment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_logs
    ADD CONSTRAINT comment_logs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: content_hashes content_hashes_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_hashes
    ADD CONSTRAINT content_hashes_content_hash_key UNIQUE (content_hash);


--
-- Name: content_hashes content_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_hashes
    ADD CONSTRAINT content_hashes_pkey PRIMARY KEY (id);


--
-- Name: daily_reward_limits daily_reward_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reward_limits
    ADD CONSTRAINT daily_reward_limits_pkey PRIMARY KEY (id);


--
-- Name: daily_reward_limits daily_reward_limits_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reward_limits
    ADD CONSTRAINT daily_reward_limits_user_id_date_key UNIQUE (user_id, date);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: likes likes_user_id_comment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_comment_id_key UNIQUE (user_id, comment_id);


--
-- Name: likes likes_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: meditation_playlist_videos meditation_playlist_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meditation_playlist_videos
    ADD CONSTRAINT meditation_playlist_videos_pkey PRIMARY KEY (id);


--
-- Name: meditation_playlist_videos meditation_playlist_videos_playlist_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meditation_playlist_videos
    ADD CONSTRAINT meditation_playlist_videos_playlist_id_video_id_key UNIQUE (playlist_id, video_id);


--
-- Name: meditation_playlists meditation_playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meditation_playlists
    ADD CONSTRAINT meditation_playlists_pkey PRIMARY KEY (id);


--
-- Name: platform_statistics platform_statistics_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_statistics
    ADD CONSTRAINT platform_statistics_date_key UNIQUE (date);


--
-- Name: platform_statistics platform_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_statistics
    ADD CONSTRAINT platform_statistics_pkey PRIMARY KEY (id);


--
-- Name: playlist_videos playlist_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_pkey PRIMARY KEY (id);


--
-- Name: playlist_videos playlist_videos_playlist_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_playlist_id_video_id_key UNIQUE (playlist_id, video_id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: reward_approvals reward_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_approvals
    ADD CONSTRAINT reward_approvals_pkey PRIMARY KEY (id);


--
-- Name: reward_bans reward_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_bans
    ADD CONSTRAINT reward_bans_pkey PRIMARY KEY (id);


--
-- Name: reward_config reward_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config
    ADD CONSTRAINT reward_config_config_key_key UNIQUE (config_key);


--
-- Name: reward_config_history reward_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config_history
    ADD CONSTRAINT reward_config_history_pkey PRIMARY KEY (id);


--
-- Name: reward_config reward_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config
    ADD CONSTRAINT reward_config_pkey PRIMARY KEY (id);


--
-- Name: reward_settings reward_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_settings
    ADD CONSTRAINT reward_settings_pkey PRIMARY KEY (id);


--
-- Name: reward_transactions reward_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_transactions
    ADD CONSTRAINT reward_transactions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_subscriber_id_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriber_id_channel_id_key UNIQUE (subscriber_id, channel_id);


--
-- Name: video_migrations unique_video_migration; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_migrations
    ADD CONSTRAINT unique_video_migration UNIQUE (video_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: video_migrations video_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_migrations
    ADD CONSTRAINT video_migrations_pkey PRIMARY KEY (id);


--
-- Name: video_watch_progress video_watch_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_watch_progress
    ADD CONSTRAINT video_watch_progress_pkey PRIMARY KEY (id);


--
-- Name: video_watch_progress video_watch_progress_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_watch_progress
    ADD CONSTRAINT video_watch_progress_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: view_logs view_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.view_logs
    ADD CONSTRAINT view_logs_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_tx_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_tx_hash_key UNIQUE (tx_hash);


--
-- Name: watch_history watch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_pkey PRIMARY KEY (id);


--
-- Name: watch_history watch_history_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: watch_later watch_later_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_later
    ADD CONSTRAINT watch_later_pkey PRIMARY KEY (id);


--
-- Name: watch_later watch_later_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_later
    ADD CONSTRAINT watch_later_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: idx_blacklisted_wallets_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blacklisted_wallets_address ON public.blacklisted_wallets USING btree (wallet_address);


--
-- Name: idx_claim_requests_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_user_created ON public.claim_requests USING btree (user_id, created_at DESC);


--
-- Name: idx_claim_requests_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claim_requests_user_status ON public.claim_requests USING btree (user_id, status);


--
-- Name: idx_comment_logs_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_logs_content_hash ON public.comment_logs USING btree (content_hash);


--
-- Name: idx_comment_logs_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_logs_user_created ON public.comment_logs USING btree (user_id, created_at);


--
-- Name: idx_comment_logs_user_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_logs_user_video ON public.comment_logs USING btree (user_id, video_id);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_comment_id);


--
-- Name: idx_comments_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_video_id ON public.comments USING btree (video_id);


--
-- Name: idx_daily_limits_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_limits_user_date ON public.daily_reward_limits USING btree (user_id, date);


--
-- Name: idx_platform_statistics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_statistics_date ON public.platform_statistics USING btree (date);


--
-- Name: idx_profiles_banned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_banned ON public.profiles USING btree (banned);


--
-- Name: idx_profiles_total_camly_rewards; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_total_camly_rewards ON public.profiles USING btree (total_camly_rewards DESC);


--
-- Name: idx_reward_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_approvals_status ON public.reward_approvals USING btree (status);


--
-- Name: idx_reward_approvals_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_approvals_user ON public.reward_approvals USING btree (user_id);


--
-- Name: idx_reward_bans_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_bans_user ON public.reward_bans USING btree (user_id);


--
-- Name: idx_reward_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_transactions_type ON public.reward_transactions USING btree (reward_type);


--
-- Name: idx_reward_transactions_unclaimed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_transactions_unclaimed ON public.reward_transactions USING btree (user_id, claimed) WHERE (claimed = false);


--
-- Name: idx_reward_transactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_transactions_user ON public.reward_transactions USING btree (user_id, created_at);


--
-- Name: idx_reward_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_transactions_user_created ON public.reward_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_subscriptions_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_channel_id ON public.subscriptions USING btree (channel_id);


--
-- Name: idx_subscriptions_subscriber_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_subscriber_id ON public.subscriptions USING btree (subscriber_id);


--
-- Name: idx_user_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_video_migrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_migrations_status ON public.video_migrations USING btree (status);


--
-- Name: idx_video_migrations_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_migrations_video_id ON public.video_migrations USING btree (video_id);


--
-- Name: idx_videos_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_channel_id ON public.videos USING btree (channel_id);


--
-- Name: idx_videos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_created_at ON public.videos USING btree (created_at DESC);


--
-- Name: idx_videos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_user_id ON public.videos USING btree (user_id);


--
-- Name: idx_view_logs_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_user_date ON public.view_logs USING btree (user_id, created_at);


--
-- Name: idx_view_logs_user_video_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_user_video_created ON public.view_logs USING btree (user_id, video_id, created_at);


--
-- Name: idx_view_logs_video; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_view_logs_video ON public.view_logs USING btree (video_id);


--
-- Name: idx_wallet_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions USING btree (created_at DESC);


--
-- Name: idx_wallet_transactions_from_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_from_user ON public.wallet_transactions USING btree (from_user_id);


--
-- Name: idx_wallet_transactions_to_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_to_address ON public.wallet_transactions USING btree (to_address);


--
-- Name: idx_wallet_transactions_to_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_to_user ON public.wallet_transactions USING btree (to_user_id);


--
-- Name: idx_wallet_transactions_tx_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_tx_hash ON public.wallet_transactions USING btree (tx_hash);


--
-- Name: idx_watch_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_user_id ON public.watch_history USING btree (user_id);


--
-- Name: idx_watch_history_watched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_watched_at ON public.watch_history USING btree (user_id, watched_at DESC);


--
-- Name: idx_watch_later_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_later_user_id ON public.watch_later USING btree (user_id);


--
-- Name: subscriptions on_subscription_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_subscription_change AFTER INSERT OR DELETE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_channel_subscriber_count();


--
-- Name: channels update_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_reward_limits update_daily_reward_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_reward_limits_updated_at BEFORE UPDATE ON public.daily_reward_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meditation_playlists update_meditation_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meditation_playlists_updated_at BEFORE UPDATE ON public.meditation_playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: playlists update_playlists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reward_settings update_reward_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reward_settings_updated_at BEFORE UPDATE ON public.reward_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: video_watch_progress update_video_watch_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_video_watch_progress_updated_at BEFORE UPDATE ON public.video_watch_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: videos update_videos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blacklisted_wallets blacklisted_wallets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklisted_wallets
    ADD CONSTRAINT blacklisted_wallets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: blacklisted_wallets blacklisted_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blacklisted_wallets
    ADD CONSTRAINT blacklisted_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: channels channels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: comment_logs comment_logs_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_logs
    ADD CONSTRAINT comment_logs_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_logs comment_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_logs
    ADD CONSTRAINT comment_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id);


--
-- Name: comment_logs comment_logs_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_logs
    ADD CONSTRAINT comment_logs_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: content_hashes content_hashes_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_hashes
    ADD CONSTRAINT content_hashes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: likes likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: meditation_playlist_videos meditation_playlist_videos_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meditation_playlist_videos
    ADD CONSTRAINT meditation_playlist_videos_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.meditation_playlists(id) ON DELETE CASCADE;


--
-- Name: meditation_playlist_videos meditation_playlist_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meditation_playlist_videos
    ADD CONSTRAINT meditation_playlist_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: playlist_videos playlist_videos_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_videos playlist_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_videos
    ADD CONSTRAINT playlist_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reward_config_history reward_config_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config_history
    ADD CONSTRAINT reward_config_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: reward_config_history reward_config_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config_history
    ADD CONSTRAINT reward_config_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.reward_config(id);


--
-- Name: reward_config reward_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_config
    ADD CONSTRAINT reward_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: reward_transactions reward_transactions_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_transactions
    ADD CONSTRAINT reward_transactions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: video_migrations video_migrations_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_migrations
    ADD CONSTRAINT video_migrations_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: video_watch_progress video_watch_progress_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_watch_progress
    ADD CONSTRAINT video_watch_progress_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: videos videos_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE;


--
-- Name: videos videos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: view_logs view_logs_session_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.view_logs
    ADD CONSTRAINT view_logs_session_ref_fkey FOREIGN KEY (session_ref) REFERENCES public.user_sessions(id);


--
-- Name: view_logs view_logs_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.view_logs
    ADD CONSTRAINT view_logs_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE SET NULL;


--
-- Name: watch_history watch_history_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: watch_later watch_later_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_later
    ADD CONSTRAINT watch_later_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can manage all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all user roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blacklisted_wallets Admins can manage blacklisted wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blacklisted wallets" ON public.blacklisted_wallets USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: platform_statistics Admins can manage platform statistics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage platform statistics" ON public.platform_statistics USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_approvals Admins can manage reward approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reward approvals" ON public.reward_approvals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_bans Admins can manage reward bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reward bans" ON public.reward_bans USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: video_migrations Admins can manage video migrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage video migrations" ON public.video_migrations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: comments Authenticated users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: likes Authenticated users can create likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create likes" ON public.likes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: channels Channels are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Channels are viewable by everyone" ON public.channels FOR SELECT USING (true);


--
-- Name: comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);


--
-- Name: content_hashes Content hashes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Content hashes are viewable by everyone" ON public.content_hashes FOR SELECT USING (true);


--
-- Name: blacklisted_wallets Everyone can view blacklisted wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view blacklisted wallets" ON public.blacklisted_wallets FOR SELECT USING (true);


--
-- Name: platform_statistics Everyone can view platform statistics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view platform statistics" ON public.platform_statistics FOR SELECT USING (true);


--
-- Name: likes Likes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);


--
-- Name: meditation_playlist_videos Meditation playlist videos viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Meditation playlist videos viewable by everyone" ON public.meditation_playlist_videos FOR SELECT USING (true);


--
-- Name: meditation_playlists Meditation playlists are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Meditation playlists are viewable by everyone" ON public.meditation_playlists FOR SELECT USING (true);


--
-- Name: reward_config_history Only admins can insert config history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert config history" ON public.reward_config_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_config Only admins can insert reward config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert reward config" ON public.reward_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_config Only admins can update reward config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update reward config" ON public.reward_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_settings Only admins can update reward settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update reward settings" ON public.reward_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reward_config_history Only admins can view config history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view config history" ON public.reward_config_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: playlist_videos Playlist owners can manage playlist videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Playlist owners can manage playlist videos" ON public.playlist_videos USING ((EXISTS ( SELECT 1
   FROM public.playlists
  WHERE ((playlists.id = playlist_videos.playlist_id) AND (playlists.user_id = auth.uid())))));


--
-- Name: meditation_playlist_videos Playlist owners can manage videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Playlist owners can manage videos" ON public.meditation_playlist_videos USING ((EXISTS ( SELECT 1
   FROM public.meditation_playlists
  WHERE ((meditation_playlists.id = meditation_playlist_videos.playlist_id) AND (meditation_playlists.user_id = auth.uid())))));


--
-- Name: playlist_videos Playlist videos viewable if playlist is viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Playlist videos viewable if playlist is viewable" ON public.playlist_videos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.playlists
  WHERE ((playlists.id = playlist_videos.playlist_id) AND ((playlists.is_public = true) OR (playlists.user_id = auth.uid()))))));


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: playlists Public playlists are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: posts Public posts are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public posts are viewable by everyone" ON public.posts FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: videos Public videos are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT USING (((is_public = true) OR (auth.uid() = user_id)));


--
-- Name: reward_config Reward config is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reward config is viewable by everyone" ON public.reward_config FOR SELECT USING (true);


--
-- Name: reward_settings Reward settings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reward settings are viewable by everyone" ON public.reward_settings FOR SELECT USING (true);


--
-- Name: subscriptions Subscriptions are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Subscriptions are viewable by everyone" ON public.subscriptions FOR SELECT USING (true);


--
-- Name: user_roles User roles are viewable by owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User roles are viewable by owner" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: watch_later Users can add to their own watch later list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to their own watch later list" ON public.watch_later FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: meditation_playlists Users can create meditation playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create meditation playlists" ON public.meditation_playlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: playlists Users can create playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create playlists" ON public.playlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: posts Users can create posts on their channel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create posts on their channel" ON public.posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can create subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = subscriber_id));


--
-- Name: channels Users can create their own channel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own channel" ON public.channels FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: claim_requests Users can create their own claim requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own claim requests" ON public.claim_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can create transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create transactions" ON public.wallet_transactions FOR INSERT WITH CHECK ((auth.uid() = from_user_id));


--
-- Name: videos Users can create videos on their channel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create videos on their channel" ON public.videos FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: likes Users can delete their own likes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: meditation_playlists Users can delete their own meditation playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own meditation playlists" ON public.meditation_playlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: playlists Users can delete their own playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.subscriptions FOR DELETE USING ((auth.uid() = subscriber_id));


--
-- Name: videos Users can delete their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own videos" ON public.videos FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: watch_history Users can delete their own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own watch history" ON public.watch_history FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: content_hashes Users can insert content hashes for their videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert content hashes for their videos" ON public.content_hashes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.videos
  WHERE ((videos.id = content_hashes.video_id) AND (videos.user_id = auth.uid())))));


--
-- Name: comment_logs Users can insert their own comment logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own comment logs" ON public.comment_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_reward_limits Users can insert their own daily limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own daily limits" ON public.daily_reward_limits FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: reward_transactions Users can insert their own reward transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own reward transactions" ON public.reward_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_sessions Users can insert their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: view_logs Users can insert their own view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own view logs" ON public.view_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: watch_history Users can insert their own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own watch history" ON public.watch_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: video_watch_progress Users can insert their own watch progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own watch progress" ON public.video_watch_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: watch_later Users can remove from their own watch later list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove from their own watch later list" ON public.watch_later FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: channels Users can update their own channel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own channel" ON public.channels FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: daily_reward_limits Users can update their own daily limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own daily limits" ON public.daily_reward_limits FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: meditation_playlists Users can update their own meditation playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own meditation playlists" ON public.meditation_playlists FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: playlists Users can update their own playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own playlists" ON public.playlists FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: posts Users can update their own posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_sessions Users can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sessions" ON public.user_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: videos Users can update their own videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: watch_history Users can update their own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own watch history" ON public.watch_history FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: video_watch_progress Users can update their own watch progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own watch progress" ON public.video_watch_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reward_approvals Users can view their own approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own approvals" ON public.reward_approvals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reward_bans Users can view their own bans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bans" ON public.reward_bans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: claim_requests Users can view their own claim requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own claim requests" ON public.claim_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: comment_logs Users can view their own comment logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own comment logs" ON public.comment_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_reward_limits Users can view their own daily limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own daily limits" ON public.daily_reward_limits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reward_transactions Users can view their own reward transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reward transactions" ON public.reward_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));


--
-- Name: view_logs Users can view their own view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own view logs" ON public.view_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: watch_history Users can view their own watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own watch history" ON public.watch_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: watch_later Users can view their own watch later list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own watch later list" ON public.watch_later FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: video_watch_progress Users can view their own watch progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own watch progress" ON public.video_watch_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: blacklisted_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blacklisted_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

--
-- Name: claim_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: content_hashes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_hashes ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_reward_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_reward_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: likes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

--
-- Name: meditation_playlist_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meditation_playlist_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: meditation_playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meditation_playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_statistics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_statistics ENABLE ROW LEVEL SECURITY;

--
-- Name: playlist_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_config_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_config_history ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: reward_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: video_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: video_watch_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_watch_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: view_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_later; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;