-- Promote master user to admin automatically on signup
CREATE OR REPLACE FUNCTION public.assign_master_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'erieltondepaulamelo@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_master ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_master
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_master_admin();

-- If the account already exists, promote it now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'erieltondepaulamelo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;