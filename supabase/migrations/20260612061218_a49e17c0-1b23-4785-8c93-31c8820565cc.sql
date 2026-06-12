
-- 1. Explicit SELECT policy for avatars bucket (defensive)
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 2. Restrict notifications UPDATE: users can only flip the `read` flag
CREATE OR REPLACE FUNCTION public.notifications_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- lock every column except `read`
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.title := OLD.title;
  NEW.body := OLD.body;
  NEW.type := OLD.type;
  NEW.link := OLD.link;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_guard_update_trg ON public.notifications;
CREATE TRIGGER notifications_guard_update_trg
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_guard_update();
