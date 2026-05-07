
-- Restrict has_role execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- Restrict handle_new_user (only the trigger / service role should call it)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten storage public read: allow public read of individual objects but not bucket listing
DROP POLICY "Public read recipe images" ON storage.objects;
CREATE POLICY "Public read recipe images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'recipe-images');
