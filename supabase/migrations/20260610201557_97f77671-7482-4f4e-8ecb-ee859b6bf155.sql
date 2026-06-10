
CREATE POLICY "kyc upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc read own or admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
