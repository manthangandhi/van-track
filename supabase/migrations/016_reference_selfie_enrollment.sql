-- Employee self-service reference selfie enrollment (bypasses RLS edge cases)

CREATE OR REPLACE FUNCTION public.enroll_reference_selfie(
  p_photo_path TEXT,
  p_face_descriptor JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_photo_path IS NULL OR btrim(p_photo_path) = '' THEN
    RAISE EXCEPTION 'Photo path required';
  END IF;

  IF p_face_descriptor IS NULL OR jsonb_typeof(p_face_descriptor) <> 'array' OR jsonb_array_length(p_face_descriptor) = 0 THEN
    RAISE EXCEPTION 'Face descriptor required';
  END IF;

  UPDATE public.profiles
  SET
    reference_selfie_url = p_photo_path,
    face_descriptor = p_face_descriptor,
    reference_selfie_enrolled_at = NOW(),
    updated_at = NOW()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM public.write_audit_log(
    'profile.reference_selfie_enrolled',
    'profile',
    v_profile.id,
    jsonb_build_object('reference_selfie_url', v_profile.reference_selfie_url)
  );

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'reference_selfie_url', v_profile.reference_selfie_url,
    'face_descriptor', v_profile.face_descriptor,
    'reference_selfie_enrolled_at', v_profile.reference_selfie_enrolled_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_reference_selfie(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enroll_reference_selfie(TEXT, JSONB) TO authenticated;

-- Allow employees to upsert files in their own storage folder
DROP POLICY IF EXISTS "employees_update_own_punch_photos" ON storage.objects;
CREATE POLICY "employees_update_own_punch_photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'punch-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'punch-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);