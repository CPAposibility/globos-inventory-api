-- Corre esto en pgAdmin, conectado a tu servidor de Azure, base Globos_base

ALTER TABLE public.globo
    ADD COLUMN IF NOT EXISTS codigo_interno character varying(50);

COMMENT ON COLUMN public.globo.codigo_interno
    IS 'Código corto autogenerado en el formulario (marca-estilo-tamaño-color)';
