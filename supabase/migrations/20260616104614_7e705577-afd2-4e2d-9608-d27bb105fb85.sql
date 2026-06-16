
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP FUNCTION IF EXISTS public.handle_deposit_approval();

-- Also drop duplicate guard trigger (both call the same function)
DROP TRIGGER IF EXISTS deposits_guard_update_trg ON public.deposits;

-- And duplicate completion trigger
DROP TRIGGER IF EXISTS trg_deposit_completed ON public.deposits;

-- And duplicate slip check trigger (check_duplicate_slip_trg covers AFTER INSERT;
-- trg_check_duplicate_slip on BEFORE INSERT OR UPDATE is the redundant one)
DROP TRIGGER IF EXISTS trg_check_duplicate_slip ON public.deposits;
