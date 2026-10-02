# Media Assets Directory (/assets)

Este directorio está destinado a almacenar imágenes, videos, logotipos y gráficos del portfolio.

## Organización recomendada:
- `/assets/alta/` (106 páginas de la revista editorial: `01portada.jpg`, `02portada.jpg`, `página3.jpg`..`página100.jpg`, desplegables `página12a/b.jpg`, `página80a/b.jpg`, `zcontraportada01.jpg`, `zcontraportada02.jpg`)
- `/assets/projects/project-01/` (imágenes y videos del proyecto 01)
- `/assets/projects/project-02/` (imágenes y videos del proyecto 02)
- `/assets/profile/` (fotografías o retratos para About)

## Reemplazo de placeholders en HTML:
Actualmente, las etiquetas de placeholders tienen la siguiente estructura:

```html
<!-- Placeholder actual -->
<div class="placeholder-media ratio-16-9">
  <span class="placeholder-label">Hero Image</span>
  <span class="placeholder-spec">16 : 9</span>
</div>

<!-- Reemplazo por imagen real -->
<img src="../assets/projects/project-01/hero.jpg" alt="Descripción del proyecto" loading="lazy" class="ratio-16-9">

<!-- Reemplazo por video real -->
<video autoplay muted loop playsinline class="ratio-16-9">
  <source src="../assets/projects/project-01/reel.mp4" type="video/mp4">
</video>
```
