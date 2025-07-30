CREATE FUNCTION public.update_updated_at_column () RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$;

CREATE TABLE public.effect_sql_migrations (
  migration_id integer NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  name text NOT NULL
);

CREATE TABLE public.styles (
  id uuid DEFAULT gen_random_uuid () NOT NULL,
  name text NOT NULL,
  rule text NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.effect_sql_migrations
ADD CONSTRAINT effect_sql_migrations_pkey PRIMARY KEY (migration_id);

ALTER TABLE ONLY public.styles
ADD CONSTRAINT styles_pkey PRIMARY KEY (id);

CREATE TRIGGER update_styles_updated_at BEFORE
UPDATE ON public.styles FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column ();

INSERT INTO
  public.effect_sql_migrations (migration_id, created_at, name)
VALUES
  (
    1,
    '2025-06-29 07:02:17.099451+00',
    'create-styles_table'
  );
