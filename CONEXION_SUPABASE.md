# Conexión de MISKI con Supabase

Esta versión de MISKI puede guardar sus datos (Asistentes, Usuarios,
Asistencia, Cronograma y Ventas) en una base de datos en la nube
(Supabase) en lugar de solo en el navegador. Si Supabase no se
configura, la app sigue funcionando igual que antes, usando
`localStorage`.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta gratuita (puedes usar GitHub o correo).
2. Click en **"New project"**.
3. Elige una organización, ponle un nombre al proyecto (ej. `miski-revibo`), define una contraseña para la base de datos (guárdala) y elige la región más cercana.
4. Espera 1–2 minutos a que Supabase termine de aprovisionar el proyecto.

## 2. Crear las tablas (esquema)

1. En el panel del proyecto, ve a **SQL Editor** (ícono de terminal en el menú izquierdo).
2. Click en **"New query"**.
3. Abre el archivo `supabase_schema.sql` incluido en esta entrega, copia todo su contenido y pégalo en el editor.
4. Click en **"Run"**. Esto crea las 5 tablas (`auxiliares`, `usuarios`, `asistencia`, `turnos`, `ventas`), sus índices y las políticas de seguridad (RLS) necesarias para que la app pueda leer y escribir.
5. Verifica en **Table Editor** que las 5 tablas aparezcan, todas vacías.

## 3. Obtener las claves de conexión

1. Ve a **Project Settings** (ícono de engranaje) → **API**.
2. Copia dos valores:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
   - **anon public key** (una clave larga que empieza con `eyJ...`)

## 4. Configurar MISKI

1. Abre el archivo `js/supabase-config.js`.
2. Reemplaza estas dos líneas con tus valores reales:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';
```

3. Guarda el archivo y vuelve a abrir `index.html` (o sube la carpeta completa al hosting que uses).

## 5. ¿Cómo funciona a partir de aquí?

- Al cargar la página, MISKI se conecta a Supabase y descarga los datos existentes.
- Si las tablas están vacías (primera vez), MISKI carga automáticamente los datos de ejemplo (asistentes, usuarios, asistencia y cronograma de muestra) y los guarda en Supabase.
- Cada vez que se agrega, edita o elimina un registro (asistentes, usuarios, asistencia, turnos, ventas), el cambio se guarda:
  - **En el navegador** (localStorage), de forma inmediata.
  - **En Supabase**, en segundo plano, para que los datos estén disponibles desde cualquier computadora o navegador.
- Si no hay conexión a internet o Supabase no está configurado, la app sigue funcionando solo con los datos guardados localmente y mostrará un aviso.

## 6. Notas importantes

- **Multiusuario**: con Supabase, varias personas en distintas computadoras pueden ver y registrar información en la misma base de datos compartida.
- **Seguridad (RLS)**: el script SQL deja las tablas abiertas a la clave pública "anon" para que la app funcione sin necesidad de iniciar sesión. Si en el futuro se agrega un sistema de usuarios con contraseña, se recomienda ajustar las políticas (`create policy ...`) para restringir el acceso solo a usuarios autenticados.
- **No subas tu clave `service_role`** a ningún lugar público; la app solo necesita la clave `anon public`.
- Si necesitas reiniciar los datos de ejemplo, simplemente borra todas las filas de las 5 tablas desde **Table Editor** en Supabase y recarga la página: MISKI volverá a generar los datos de muestra.

## 7. Archivos modificados/agregados

- **`js/supabase-config.js`** (nuevo): cliente de Supabase y capa de datos `DB` que sincroniza `auxiliares`, `usuarios`, `asistencia`, `turnos` y `ventas` con la base de datos en la nube, manteniendo `localStorage` como respaldo.
- **`js/app.js`**: se eliminó el objeto `DB` antiguo (ahora vive en `supabase-config.js`); `seedData()` ahora solo carga datos de ejemplo si la tabla `auxiliares` está vacía; la inicialización (`DOMContentLoaded`) ahora espera a que Supabase responda antes de continuar.
- **`index.html`**: se agregaron las etiquetas `<script>` para cargar la librería de Supabase y `supabase-config.js` antes de `app.js`.
- **`supabase_schema.sql`** (nuevo): script SQL con la definición completa de las 5 tablas, índices y políticas de seguridad.
