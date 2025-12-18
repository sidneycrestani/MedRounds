ALTER TABLE "app"."user_preferences" ALTER COLUMN "settings" SET DEFAULT '{"theme":"system","use_custom_key":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "app"."user_preferences" ADD COLUMN "encrypted_gemini_key" text;

CREATE OR REPLACE FUNCTION public.get_user_gemini_key(p_user_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Aqui está o segredo: ela ganha poder para ler o esquema 'app'
SET search_path = app, public
AS $$
BEGIN
  RETURN (
    SELECT encrypted_gemini_key 
    FROM app.user_preferences 
    WHERE user_id = p_user_id
  );
END;
$$;

-- Restringimos o acesso para que apenas a Edge Function (service_role) possa rodar
REVOKE EXECUTE ON FUNCTION public.get_user_gemini_key(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_gemini_key(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_gemini_key(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_gemini_key(text) TO service_role;