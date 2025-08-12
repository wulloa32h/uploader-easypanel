
# Uploader EasyPanel

Servicio mínimo para subir imágenes vía HTTP y servirlas desde `/uploads`.

## Endpoints
- `GET /health` -> `{ ok: true }`
- `POST /upload` (multipart/form-data, campo `file`) -> `{ url, filename, size, mime }`
- `GET /uploads/<filename>` (estático, cacheado)

## Variables de entorno
- `BASE_HOST` (recomendado) — Ej: `imgs.tu-dominio.com` sin protocolo.
- `AUTH_TOKEN` (opcional) — Si se define, exige `Authorization: Bearer <token>` en `/upload`.
- `CORS_ORIGIN` — `*` o lista separada por comas.
- `MAX_FILE_SIZE` — bytes, por defecto 15728640 (15MB).
- `ALLOWED_MIME` — lista separada por comas. Por defecto `image/jpeg,image/png,image/webp,image/gif`.

## Deploy en EasyPanel (Hostinger)
1. Crea una **App** nueva → tipo **Dockerfile**.
2. Conecta este repo.
3. En **Build & Run** deja el puerto **3000**.
4. En **Storage** añade un volumen persistente montado en `/app/public/uploads`.
5. En **Domains** agrega `imgs.tu-dominio.com`, activa **SSL** (Let's Encrypt).
6. En **Environment** define:
   - `BASE_HOST=imgs.tu-dominio.com`
   - `AUTH_TOKEN=<tu_token_seguro>` (opcional pero recomendado)
   - `CORS_ORIGIN=*`
7. Health check: `GET /health`, puerto 3000.
8. Deploy.

## Probar
```bash
# Sin auth
curl -F "file=@foto.jpg" https://imgs.tu-dominio.com/upload

# Con auth
curl -H "Authorization: Bearer TU_TOKEN" -F "file=@foto.jpg" https://imgs.tu-dominio.com/upload
```

## n8n (HTTP Request)
- Method: `POST`
- URL: `https://imgs.tu-dominio.com/upload`
- Send Binary Data: `true`
- Binary Property: `data` (o el nombre que uses)
- Name (form field): `file`
- Content Type: `multipart/form-data`
- Headers (si usas token):
  - `Authorization: Bearer <TU_TOKEN>`

Respuesta JSON -> `{{$json["url"]}}` contiene la URL pública.
