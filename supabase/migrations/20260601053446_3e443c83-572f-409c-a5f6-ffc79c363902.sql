DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'deposit_status'
      AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE public.deposit_status ADD VALUE 'approved' AFTER 'confirming';
  END IF;
END $$;