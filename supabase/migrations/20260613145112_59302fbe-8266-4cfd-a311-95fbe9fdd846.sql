CREATE POLICY "Users can delete their own withdrawal OTPs"
ON public.withdrawal_otps
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);