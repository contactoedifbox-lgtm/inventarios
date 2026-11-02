# Petra — Sitio web de Petrasur

Sitio web corporativo de **PetraSur SpA**: manta de hormigón **Concrete Blanket**
para revestimiento de canales, protección de taludes y obras hidráulicas en Chile.

Sitio **estático** (HTML + CSS + JavaScript), sin dependencias ni proceso de
compilación. Se publica con **GitHub Pages**.

## Publicación (GitHub Pages)

Este proyecto se publica en GitHub Pages en la ruta:

    https://TU-USUARIO.github.io/inventarios/Petra/

Reemplaza `TU-USUARIO` por tu usuario de GitHub en:

- `sitemap.xml`
- `robots.txt`
- las etiquetas `canonical`, `og:url` y `og:image` de los archivos `.html`

## Estructura

    index.html            Inicio
    nosotros.html         Nosotros
    producto.html         Producto (Concrete Blanket)
    aplicaciones.html     Aplicaciones
    galeria.html          Galería de obras
    contacto.html         Contacto
    404.html              Página de error
    assets/css/           Estilos
    assets/js/            JavaScript (main, galería, analytics)
    assets/img/           Imágenes y logos
    assets/docs/          PDFs descargables
    assets/galeria/       Fotos y videos de obras
    generar_galeria.py    Genera la galería desde la carpeta de fotos
    LEEME.txt             Guía completa de uso y mantenimiento

## Ver en local

    python3 -m http.server 8000

Luego abre http://localhost:8000 en tu navegador.

## Documentación

Consulta **LEEME.txt** para las instrucciones detalladas: datos de contacto,
formulario, galería de obras, Google Analytics y publicación en GitHub Pages.
