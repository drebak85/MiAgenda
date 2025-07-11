// src/current-date.js

export function displayCurrentDateTime() {
    const fechaHoraElement = document.getElementById('fechaHora'); //

    if (fechaHoraElement) {
        const updateDateTime = () => { // Envuelve la lógica en una función para poder usar setInterval
            const now = new Date();

            // Formato para la hora (HH:MM)
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false // Formato de 24 horas (00-23)
            };
            const formattedTime = now.toLocaleTimeString('es-ES', timeOptions);

            // Formato para la fecha (D de Mes, Año)
            const dateOptions = {
                day: 'numeric',
                month: 'long', // Nombre completo del mes (ej. "julio")
                
            };
            const formattedDate = now.toLocaleDateString('es-ES', dateOptions);

            // Ahora los ponemos en la misma línea
            fechaHoraElement.innerHTML = `
                <span class="hora"><i class="fas fa-clock"></i> ${formattedTime}</span> 
                <span class="fecha">🗓️ ${formattedDate}</span>
            `;
        };

        // Actualizar inmediatamente y luego cada segundo
        updateDateTime();
        setInterval(updateDateTime, 1000); // Actualiza cada segundo
        
    } else {
        console.error("No se encontró el elemento con ID 'fechaHora' en el HTML.");
    }
}