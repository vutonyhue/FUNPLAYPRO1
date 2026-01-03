-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS pending_rewards numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_camly_rewards numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_claim_at timestamp with time zone;

-- Create claim_requests table
CREATE TABLE IF NOT EXISTS public.claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS on claim_requests
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for claim_requests
-- Users can view their own claims
CREATE POLICY "Users can view their own claims"
ON public.claim_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own claims
CREATE POLICY "Users can create their own claims"
ON public.claim_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
ON public.claim_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all claims
CREATE POLICY "Admins can update all claims"
ON public.claim_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));