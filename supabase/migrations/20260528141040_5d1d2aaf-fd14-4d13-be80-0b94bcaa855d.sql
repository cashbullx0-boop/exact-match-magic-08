
CREATE TYPE public.deposit_status AS ENUM ('pending', 'confirming', 'completed', 'failed', 'expired');
CREATE TYPE public.deposit_network AS ENUM ('USDT_TRC20', 'USDT_BEP20');

CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_usd NUMERIC(18,6) NOT NULL CHECK (amount_usd > 0),
  network public.deposit_network NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_payment_id TEXT,
  confirmations INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deposits_user_id ON public.deposits(user_id, created_at DESC);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE UNIQUE INDEX idx_deposits_tx_hash ON public.deposits(tx_hash) WHERE tx_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits" ON public.deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users create own deposits" ON public.deposits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending tx hash" ON public.deposits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status IN ('pending','confirming'));

CREATE POLICY "Admins manage deposits" ON public.deposits
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER deposits_touch_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
