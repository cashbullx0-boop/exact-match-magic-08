
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own spins" ON public.spins;
CREATE POLICY "Users read own spins" ON public.spins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all spins" ON public.spins;
CREATE POLICY "Admins manage all spins" ON public.spins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users read own reset requests" ON public.password_reset_requests;
CREATE POLICY "Users read own reset requests" ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE SELECT (otp_hash) ON public.password_reset_requests FROM authenticated, anon;

ALTER FUNCTION public.enqueue_email(queue_name text, payload jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(queue_name text, message_id bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) SET search_path = public, pgmq;
