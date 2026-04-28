---
name: update-todo
description: Actualizar el TO-DO.md marcando con [x] los ítems implementados en el proyecto
---

Lee el estado actual del proyecto y actualiza TO-DO.md marcando como completados los ítems que ya están implementados.

## Pasos

1. Lee `/Users/carlosjesus/Desktop/projects/challenge-rappi-AI/TO-DO.md` completo.

2. Ejecuta `git diff HEAD` y `git status` para ver qué archivos cambiaron en esta sesión.

3. Para cada ítem con `- [ ]` en el TO-DO, verifica si está implementado comprobando:
   - ¿Existe el archivo mencionado en el ítem?
   - ¿El archivo tiene contenido real (no vacío, no solo stub)?
   - ¿La funcionalidad descrita está efectivamente codificada?

4. Cambia `- [ ]` a `- [x]` solo en los ítems que estén realmente completos. No marques como hecho algo que solo existe parcialmente o está en borrador.

5. Escribe el archivo actualizado conservando exactamente el mismo formato, estructura y texto de todos los demás ítems.

6. Reporta un resumen de cuántos ítems marcaste y cuáles fueron.

## Reglas

- No marques ítems de verificación ("Verificar que...", "Probar...") a menos que haya evidencia concreta (logs, tests pasando, output visible).
- Si un ítem tiene sub-ítems, márcalo completo solo cuando TODOS sus sub-ítems estén completos.
- No modifiques el texto de ningún ítem, solo el `[ ]` → `[x]`.
- Ante la duda, deja el ítem como pendiente.
