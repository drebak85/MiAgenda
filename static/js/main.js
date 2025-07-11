// src/main.js

// 1. Importar la función que muestra la fecha y hora desde current-date.js
//    La ruta './current-date.js' es relativa desde main.js dentro de la carpeta 'src'.
import { displayCurrentDateTime } from './current-date.js'; //

// 2. Esperar a que todo el contenido HTML de la página esté completamente cargado.
//    Esto es muy importante para asegurarse de que el 'div' con ID 'fechaHora' ya existe
//    en la página antes de que intentemos manipularlo con JavaScript.
document.addEventListener('DOMContentLoaded', () => {
    // 3. Llamar a la función para mostrar la fecha y hora
    displayCurrentDateTime();

    // Puedes añadir más código aquí para otras funcionalidades
    // que quieras que se inicien cuando la página esté lista.
});