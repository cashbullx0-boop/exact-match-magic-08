
-- 1) Allow users to delete their own deposit-slip files
CREATE POLICY "Users can delete own deposit slips"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deposit-slips'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) Guard KYC updates: non-admins cannot mutate admin/review fields
CREATE OR REPLACE FUNCTION public.kyc_submissions_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Lock immutable identity/audit columns
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.submitted_at := OLD.submitted_at;
  NEW.created_at := OLD.created_at;

  -- Lock admin/review-only columns
  NEW.status := OLD.status;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_submissions_guard_update_trg ON public.kyc_submissions;
CREATE TRIGGER kyc_submissions_guard_update_trg
BEFORE UPDATE ON public.kyc_submissions
FOR EACH ROW EXECUTE FUNCTION public.kyc_submissions_guard_update();
