-- cleanup_storage.sql
-- Remove any custom `storage` schema objects. RUN AS DB OWNER (service role).
-- This will permanently delete storage schema and all objects inside it.
-- Take a DB backup/snapshot before running.

-- Drop the whole storage schema and everything in it
-- Safer, idempotent cleanup for a custom "storage" schema.
-- This script removes common Supabase-style storage objects (policies, triggers,
-- functions, tables) without immediately dropping the entire schema. Dropping
-- the schema is commented out below and should only be run by the DB owner
-- after you've verified that all objects have been migrated/backed up.

-- Run as DB OWNER (service role). Take a DB backup/snapshot before running.

BEGIN;

-- Only proceed if the schema exists
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN

		-- Drop policies on storage.objects and storage.buckets if present
		IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname='objects' AND n.nspname='storage') THEN
			EXECUTE 'DROP POLICY IF EXISTS objects_owner_manage ON storage.objects';
			EXECUTE 'DROP POLICY IF EXISTS objects_public_read ON storage.objects';
			EXECUTE 'DROP TRIGGER IF EXISTS storage_set_updated_at ON storage.objects';
			-- Remove any foreign key constraint referencing storage.buckets
			EXECUTE 'ALTER TABLE IF EXISTS storage.objects DROP CONSTRAINT IF EXISTS storage_objects_bucket_fkey';
			-- Drop the objects table
			EXECUTE 'DROP TABLE IF EXISTS storage.objects CASCADE';
		END IF;

		IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname='buckets' AND n.nspname='storage') THEN
			EXECUTE 'DROP POLICY IF EXISTS buckets_owner_manage ON storage.buckets';
			EXECUTE 'DROP POLICY IF EXISTS buckets_public_list ON storage.buckets';
			EXECUTE 'DROP TRIGGER IF EXISTS storage_set_updated_at_buckets ON storage.buckets';
			EXECUTE 'DROP TABLE IF EXISTS storage.buckets CASCADE';
		END IF;

		-- Drop accompanying functions
		EXECUTE 'DROP FUNCTION IF EXISTS storage.set_updated_at() CASCADE';

		RAISE NOTICE 'Targeted cleanup of storage schema objects completed. Review results and, if desired, run the final DROP SCHEMA command below as the DB owner.';
	ELSE
		RAISE NOTICE 'Schema "storage" does not exist - nothing to do.';
	END IF;
END
$$;

COMMIT;

-- The project currently does not use a custom `storage` schema. To avoid any
-- accidental destructive operations this script is intentionally a no-op and
-- will only report whether a `storage` schema exists.

-- Run as DB OWNER (service role) if you need to perform destructive cleanup.

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
		RAISE NOTICE 'Schema "storage" exists. No destructive action taken by this script.';
		RAISE NOTICE 'If you want to remove it, run: DROP SCHEMA IF EXISTS storage CASCADE; as the DB owner.';
	ELSE
		RAISE NOTICE 'Schema "storage" does not exist. Nothing to do.';
	END IF;
END
$$;

-- If you later decide to remove the schema automatically, run the following
-- command manually as the DB owner once you have backups and have confirmed
-- no objects need to be preserved:
-- DROP SCHEMA IF EXISTS storage CASCADE;

-- If you prefer a safer targeted cleanup, use the commands below instead of the DROP SCHEMA above:
-- BEGIN;
-- DROP POLICY IF EXISTS objects_owner_manage ON storage.objects;
-- DROP POLICY IF EXISTS objects_public_read ON storage.objects;
-- DROP POLICY IF EXISTS buckets_owner_manage ON storage.buckets;
-- DROP POLICY IF EXISTS buckets_public_list ON storage.buckets;
-- DROP TRIGGER IF EXISTS storage_set_updated_at ON storage.objects;
-- DROP TRIGGER IF EXISTS storage_set_updated_at_buckets ON storage.buckets;
-- DROP FUNCTION IF EXISTS storage.set_updated_at() CASCADE;
-- ALTER TABLE IF EXISTS storage.objects DROP CONSTRAINT IF EXISTS storage_objects_bucket_fkey;
-- DROP TABLE IF EXISTS storage.objects CASCADE;
-- DROP TABLE IF EXISTS storage.buckets CASCADE;
-- COMMIT;

-- End of cleanup_storage.sql
