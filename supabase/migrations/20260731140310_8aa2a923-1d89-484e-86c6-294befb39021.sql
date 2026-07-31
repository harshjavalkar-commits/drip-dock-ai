CREATE POLICY "wardrobe own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);