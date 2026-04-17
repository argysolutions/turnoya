---
name: turnoya-react-standards
description: Obligatorio para la creación o modificación de componentes y vistas en el frontend con React. Define los estándares de arquitectura UI/UX, manejo de estado y prevención de errores para la turnera.
---

# Estándares de Frontend (React + Tailwind)

Este documento define las reglas innegociables para el desarrollo del frontend de **TurnoYa**. El objetivo es mantener una aplicación ligera (lean), de alto rendimiento y con una experiencia de usuario (UX) premium.

## 1. Rendimiento y Animaciones
*   **Prohibición de Framer Motion:** Está estrictamente prohibido el uso de `framer-motion` o `AnimatePresence`. Todas las animaciones (transiciones, opacidad, deslizamientos) deben realizarse utilizando clases nativas de **Tailwind CSS** para evitar inflar el bundle.
*   **Transiciones Lean:** Usa combinaciones de `transition-all`, `duration-300`, `ease-in-out` y estados de visibilidad (`opacity-0` vs `opacity-100`) para efectos de aparición.

## 2. Arquitectura de Estado y Datos
*   **Centralización de API:** Toda interacción con el backend debe pasar exclusivamente por el cliente de Axios centralizado en `src/api/client.js`.
*   **Manejo de Estados (Carga y Error):** Es obligatorio contemplar los estados `isLoading` y `isError`. 
    *   La pantalla **NUNCA** debe quedar en blanco.
    *   Usa Skeletons para cargas iniciales o Spinners discretos en mutaciones.
    *   Muestra mensajes de error amigables que permitan reintentar o volver atrás.
*   **Separación de Lógica:** La lógica de estado compleja, validaciones y llamadas a la API deben extraerse a **Custom Hooks** (ej. `useIncidencias.js`). Los componentes deben mantenerse "limpios" y dedicados únicamente a la presentación (render).

## 3. Experiencia de Usuario (UX)
*   **Prevención de Múltiples Envíos:** Todo botón o disparador que ejecute una operación de mutación (`POST`, `PUT`, `DELETE`) debe **deshabilitarse automáticamente (disabled)** al primer clic mientras espera la respuesta del servidor para evitar registros duplicados.
*   **Feedback de Operación:** Usa Toasts (sonner) para confirmar el éxito o advertir del fallo de acciones administrativas.

## 4. Diseño y Estilizado (UI)
*   **Design System:** Utiliza exclusivamente los tokens de diseño (variables CSS) definidos en `index.css` (`--primary`, `--background`, `--accent`, etc.). 
*   **Premium Aesthetics:** Las interfaces deben sentirse "vivas" y de alta calidad:
    *   Uso de sombras sutiles (`shadow-sm`, `shadow-md`).
    *   Bordes redondeados consistentes (`rounded-lg`, `rounded-xl`).
    *   Efectos de hover interactivos.
    *   Variantes de diseño que respeten el Dark Mode por defecto.

## 5. Mobile First
*   Todos los layouts y componentes deben diseñarse pensando primero en dispositivos móviles, utilizando los prefijos de breakpoint de Tailwind (`md:`, `lg:`) para expandirse a escritorio.