# Snake 3D 🐍

Juego clásico **Snake** renderizado en **3D** con [Three.js](https://threejs.org/).
Es un sitio **100% estático** (HTML + CSS + JavaScript), sin proceso de compilación,
pensado para publicarse con **GitHub Pages** en una cuenta gratuita.

## 🎮 Cómo jugar

- **Flechas** o **WASD** para mover la serpiente.
- **Espacio** para pausar / continuar.
- **Enter** para reiniciar.
- En móvil: usa el **D-pad** en pantalla o **desliza** el dedo sobre el tablero.
- Come los orbes para crecer y sumar puntos. Evita las paredes y tu propio cuerpo.
- El **récord** se guarda en el navegador (`localStorage`).

## 📁 Estructura

```
Snake3D/
  index.html              Punto de entrada + import map de Three.js
  README.md               Este archivo
  assets/
    css/styles.css        HUD, overlays y diseño responsive
    js/
      main.js             Escena Three.js, bucle de render, entrada y HUD
      game.js             Lógica del juego (grilla, serpiente, comida, colisiones)
```

## ▶️ Ver en local

Necesitas un servidor estático (los módulos ES no funcionan con `file://`).

Con Python:

```bash
cd Snake3D
python3 -m http.server 8000
```

Luego abre <http://localhost:8000> en el navegador.

Con Node.js:

```bash
cd Snake3D
npx serve
```

## 🚀 Publicar en GitHub Pages

Este juego vive dentro del repositorio **`inventarios`**, en la carpeta `Snake3D`,
junto a otros proyectos (por ejemplo `Petra`). La URL pública queda:

```
https://contactoedifbox-lgtm.github.io/inventarios/Snake3D/
```

### Pasos

1. Copia la carpeta `Snake3D` dentro de tu clon del repositorio `inventarios`.
2. Sube los cambios:

   ```bash
   cd ruta/a/inventarios
   git add Snake3D
   git commit -m "Agrega juego Snake 3D"
   git push origin main
   ```

3. Espera 1–2 minutos. GitHub Pages publicará automáticamente el contenido de la
   rama `main`. El juego quedará disponible en la URL indicada arriba.

> **Nota:** GitHub Pages sirve el contenido de la rama `main` del repositorio.
> No se requiere ningún paso de build porque el proyecto es estático.

## 🛠️ Tecnología

- **Three.js 0.160** cargado por CDN mediante `importmap` (sin `npm install`).
- Render con sombras, niebla y luces para dar profundidad.
- Interpolación de movimiento para una animación fluida entre celdas.
