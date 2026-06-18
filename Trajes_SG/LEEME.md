# Caporales San Gabriel – Dashboard de Arriendo de Trajes

Aplicación web estática (HTML/CSS/JS) conectada a Supabase para gestionar el arriendo de trajes de caporal dentro de la agrupación.

## Funcionalidades

- Cualquier persona puede ver la tabla de trajes disponibles.
- Registro e inicio de sesión con correo y contraseña.
- Usuarios logueados pueden publicar sus trajes con datos de transferencia.
- Usuarios logueados pueden solicitar arriendo, adjuntar comprobante y dejar el traje en estado **reservado**.
- El dueño del traje ve los datos del arrendatario, el comprobante y un botón para confirmar el arriendo, pasándolo a estado **arrendado**.
- Filtros por año, talla, talla de bota y estado.

## Archivos

- `index.html` – estructura de la página.
- `style.css` – estilos visuales.
- `app.js` – lógica y conexión con Supabase.
- `LEEME.md` – este archivo.

## Requisitos previos

1. Tener una cuenta en [Supabase](https://supabase.com/).
2. Haber creado un proyecto en Supabase.

## Pasos de configuración en Supabase

### 1. Obtener las credenciales

En tu proyecto de Supabase ve a:

> Project Settings > API

Copia:

- `URL` (por ejemplo `https://abcdefghijklmnop.supabase.co`)
- `anon public` key

Pega esos valores en `app.js` reemplazando:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_PUBLIC_KEY';
```

### 2. Crear las tablas

Ve a:

> SQL Editor > New query

Pega y ejecuta el siguiente script:

```sql
-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trajes disponibles para arriendo
CREATE TABLE IF NOT EXISTS public.costumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year TEXT NOT NULL,
  size TEXT NOT NULL,
  boot_size TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 25000,
  bank_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'reservado', 'arrendado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Solicitudes de arriendo
CREATE TABLE IF NOT EXISTS public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costume_id UUID REFERENCES public.costumes(id) ON DELETE CASCADE NOT NULL,
  renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rut TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  event_name TEXT NOT NULL,
  voucher_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reservado' CHECK (status IN ('reservado', 'arrendado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para crear perfil automáticamente al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Crear el bucket de comprobantes

Ve a:

> Storage > New bucket

Crea un bucket llamado exactamente:

```
vouchers
```

Configúralo como **public** o déjalo privado; la app usa `createSignedUrl` para mostrar los comprobantes.

### 4. Configurar las políticas de seguridad (RLS)

Ejecuta en el SQL Editor:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Perfiles: todos pueden leer, cada usuario puede editar el suyo
CREATE POLICY "Perfiles lectura publica"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Perfiles auto actualizacion"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trajes: lectura publica
CREATE POLICY "Trajes lectura publica"
  ON public.costumes FOR SELECT
  USING (true);

-- Trajes: insertar solo usuarios autenticados (su propio traje)
CREATE POLICY "Trajes insertar autenticados"
  ON public.costumes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Trajes: actualizar solo el dueño
CREATE POLICY "Trajes actualizar dueño"
  ON public.costumes FOR UPDATE
  USING (auth.uid() = owner_id);

-- Trajes: eliminar solo el dueño
CREATE POLICY "Trajes eliminar dueño"
  ON public.costumes FOR DELETE
  USING (auth.uid() = owner_id);

-- Arriendos: lectura para el dueño del traje o el solicitante
CREATE POLICY "Arriendos lectura permitida"
  ON public.rentals FOR SELECT
  USING (
    auth.uid() = renter_id
    OR auth.uid() IN (
      SELECT owner_id FROM public.costumes WHERE id = costume_id
    )
  );

-- Arriendos: insertar usuarios autenticados
CREATE POLICY "Arriendos insertar autenticados"
  ON public.rentals FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

-- Arriendos: actualizar solo el dueño del traje
CREATE POLICY "Arriendos actualizar dueño"
  ON public.rentals FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.costumes WHERE id = costume_id
    )
  );

-- Storage: subir comprobantes (usuarios autenticados)
CREATE POLICY "Vouchers subir autenticados"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vouchers' AND auth.role() = 'authenticated'
  );

-- Storage: leer comprobantes (dueño del traje o quien subió el archivo)
CREATE POLICY "Vouchers leer permitido"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vouchers' AND (
      auth.uid() = owner
      OR auth.uid() IN (
        SELECT r.renter_id FROM public.rentals r WHERE r.voucher_path = storage.objects.name
      )
      OR auth.uid() IN (
        SELECT c.owner_id FROM public.costumes c
        JOIN public.rentals r ON r.costume_id = c.id
        WHERE r.voucher_path = storage.objects.name
      )
    )
  );
```

### 5. Deshabilitar confirmación por correo (opcional pero recomendado)

Como elegiste "email + contraseña sin confirmación", ve a:

> Authentication > Providers > Email

Deshabilita la opción **Confirm email**.

## Cómo subir a GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube los archivos `index.html`, `style.css`, `app.js` y `LEEME.md`.
3. Ve a:

> Settings > Pages

4. En **Source** selecciona la rama `main` y carpeta `/ (root)`.
5. Guarda. En pocos minutos tendrás una URL como:

```
https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/
```

## Flujo de uso

1. El dueño se registra, inicia sesión y publica su traje con sus datos bancarios.
2. Cualquier persona ve la tabla de trajes.
3. Quien quiera arrendar inicia sesión, presiona **Arrendar**, llena sus datos y sube el comprobante.
4. El traje pasa a **reservado**.
5. El dueño revisa su cuenta bancaria, luego en el dashboard presiona **Ver comprobante** y **Confirmar arriendo**.
6. El traje pasa a **arrendado**.

## Notas

- El precio por defecto es $25.000 pero el dueño puede modificarlo al publicar.
- Los eventos actuales son **Inti Raymi 2026** (21 de junio) y **Mil Tambores 2026** (11 de octubre).
- Para agregar más eventos o tallas, edita los `<select>` en `index.html`.

## Soporte

Si necesitas modificar algo (colores, campos, precios, eventos), edita `index.html`, `style.css` o `app.js` y vuelve a subir los archivos a GitHub.
