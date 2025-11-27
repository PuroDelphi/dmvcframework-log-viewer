# Log Monitor - Sistema de Monitoreo de Logs

Sistema web moderno y de alto rendimiento para monitorear archivos de log en tiempo real con detección automática de tags, soporte para múltiples carpetas y optimizaciones para grandes volúmenes de datos.

## 🚀 Inicio Rápido

1. **Iniciar el servidor:**
   ```bash
   python server.py
   ```

2. **Abrir en el navegador:**
   ```
   http://localhost:8080/index.html
   ```

## ⚙️ Configuración

### Configuración del Frontend (Opcional)

Si necesitas alojar el frontend en un servidor diferente al backend (API), puedes configurar la URL del servidor en el archivo `config.js`:

```javascript
window.AppConfig = {
    // Ejemplo: 'http://localhost:8080'
    serverUrl: '' // Dejar vacío si el frontend y backend están en el mismo servidor
};
```

### Configuración del Backend (config.json)

Edita el archivo `config.json` para personalizar el comportamiento del monitor.

### Estructura del archivo config.json

```json
{
  "logPatterns": [
    {
      "pattern": "*.*.*.log",
      "description": "Patrón: NOMBRE.NUMERO.TAG.log",
      "regex": "^(.+?)\\.(\\d+)\\.(.+?)\\.log$",
      "tagGroup": 3,
      "nameGroup": 1
    }
  ],
  "scanPaths": [
    "."
  ],
  "port": 8080,
  "updateInterval": 2000,
  "maxEntriesPerTag": 500,
  "maxFileReadSize": 524288,
  "enableVirtualScroll": true,
  "autoScroll": true,
  "theme": "dark"
}
```

## 🌐 Despliegue Desacoplado (Frontend y Backend Separados)

Puedes alojar el frontend y el backend en servidores diferentes. Por ejemplo:

### Escenario: Backend en servidor A, Frontend en servidor B

**Servidor A (Backend - API de Logs):**
1. Edita `config.json` y establece el puerto deseado:
   ```json
   {
     "port": 9000,
     ...
   }
   ```
2. Ejecuta el servidor:
   ```bash
   python server.py
   ```
3. El servidor API estará en: `http://servidor-a.com:9000`

**Servidor B (Frontend - Interfaz Web):**
1. Copia los archivos del frontend a tu servidor web (Apache, Nginx, IIS, etc.):
   - `index.html`
   - `config.js`
   - `app.js`
   - `datetime-filter.js`
   - `performance.js`
   - `styles.css`
   - `datetime-filter.css`

2. Edita `config.js` para apuntar al backend:
   ```javascript
   window.AppConfig = {
       serverUrl: 'http://servidor-a.com:9000'
   };
   ```

3. Accede a la interfaz: `http://servidor-b.com/index.html`

> **Nota sobre CORS:** Si recibes errores de CORS, asegúrate de que el servidor backend (`server.py`) esté correctamente configurado para permitir peticiones desde el dominio del frontend. El servidor Python ya incluye headers CORS por defecto.

### Parámetros de Configuración

#### `logPatterns` (Array)
Define los patrones de nombres de archivo que se deben buscar.
- **`pattern`**: Patrón glob simple para referencia visual.
- **`regex`**: Expresión regular para extraer información del nombre del archivo.
- **`tagGroup`**: Número del grupo de captura que contiene el TAG (usado para agrupar en pestañas).
- **`nameGroup`**: Número del grupo de captura que contiene el NOMBRE.

#### `scanPaths` (Array)
Lista de rutas donde buscar archivos de log. Puedes especificar múltiples carpetas usando rutas relativas o absolutas.

**Ejemplos Windows:**
```json
"scanPaths": [
  ".",                                    // Carpeta actual
  "../other-logs",                       // Carpeta relativa
  "C:/logs/application",                 // Ruta absoluta
  "D:/proyectos/mi-app/logs",           // Otro disco
  "//servidor-remoto/logs/produccion"   // Carpeta compartida en red
]
```

**Ejemplos Linux:**
```json
"scanPaths": [
  ".",                                    // Carpeta actual
  "../logs",                             // Carpeta relativa
  "/var/log/myapp",                      // Ruta absoluta
  "/home/usuario/proyectos/app/logs",   // Ruta de usuario
  "/mnt/storage/logs"                    // Disco montado
]
```

> **⚠️ Importante**: Evita rutas duplicadas (ej: `.` y `../LogMonitor` si apuntan a lo mismo) para prevenir logs duplicados en la interfaz.

#### `port` (Number)
Puerto en el que escuchará el servidor backend (por defecto: 8080).
- Útil cuando necesitas correr múltiples instancias del monitor o evitar conflictos de puerto.

#### `updateInterval` (Number)
Intervalo de actualización en milisegundos (por defecto: 2000 = 2 segundos).

#### `autoScroll` (Boolean)
Activar auto-scroll automáticamente al cargar (por defecto: true).

### ⚡ Configuración de Rendimiento

Para manejar miles de registros eficientemente:

#### `maxEntriesPerTag` (Number)
Número máximo de entradas de log a mantener en memoria por tag (Recomendado: 500).
*Esto evita que el navegador consuma demasiada memoria RAM.*

#### `maxFileReadSize` (Number)
Tamaño máximo en bytes para leer del final del archivo (Recomendado: 524288 = 512KB).
*Permite cargar instantáneamente archivos de log gigantes (GBs) leyendo solo la parte más reciente.*

#### `enableVirtualScroll` (Boolean)
Activa la renderización virtual de la lista de logs.
*Esencial para mantener la fluidez de la interfaz cuando hay muchos logs.*

## 🖥️ Guía de Uso de la Interfaz

### 1. Pestañas y Auto-descubrimiento
- **Pestañas Dinámicas**: Se crea una pestaña automáticamente por cada TAG único encontrado.
- **Auto-descubrimiento**: Si añades un nuevo archivo de log mientras el monitor está corriendo, aparecerá una nueva pestaña automáticamente en unos 10 segundos (sin reiniciar).

### 2. Filtrado y Búsqueda
- **Buscador**: Escribe texto para filtrar logs en tiempo real (con debounce de 100ms).
- **Niveles**: Haz clic en los botones `INFO`, `ERROR`, `DEBUG`, etc., para mostrar solo esos niveles.
- **Filtro de Fecha/Hora**:
  - Selecciona fecha/hora de inicio en "Desde".
  - Selecciona fecha/hora de fin en "Hasta".
  - Usa el botón **✕** para limpiar el filtro rápidamente.

### 3. Controles
- **🗑️ Limpiar**: Borra visualmente los logs actuales (se recargarán si refrescas).
- **⏸️ Pausar**: Detiene la actualización automática.
- **📜 Auto-scroll**: Activa/desactiva el desplazamiento automático al final.

## 📋 Formato de Log Esperado

```
YYYY-MM-DD HH:MM:SS:mmm [TID    XXXXX][LEVEL   ] Mensaje [tag]
```

**Ejemplo:**
```
2025-11-25 17:22:04:997 [TID    25512][INFO   ] Application started [dmvcframework]
```

## 🔌 API Endpoints

- **GET `/api/logs`**: Lista de archivos descubiertos.
- **GET `/api/config`**: Configuración actual.
- **GET `/api/refresh`**: Fuerza el re-escaneo de archivos.

## 🐛 Solución de Problemas comunes

### Logs Duplicados
Si ves el doble de logs de lo esperado, verifica `scanPaths` en `config.json`. Asegúrate de no estar escaneando la misma carpeta desde dos rutas diferentes (ej: `.` y `../logs`).

### No aparecen nuevos archivos
El auto-descubrimiento corre cada 10 segundos. Espera un momento. Si no aparecen, verifica que el nombre del archivo coincida con `logPatterns`.

### Interfaz lenta
Asegúrate de tener activado `"enableVirtualScroll": true` y `"maxEntriesPerTag": 500` en `config.json`.
