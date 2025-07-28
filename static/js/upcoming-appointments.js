
import { supabase } from './supabaseClient.js';

const container = document.getElementById('citas-container');
const formEditar = document.getElementById('form-editar-cita');
const editarFormulario = document.getElementById('editar-formulario');

const inputId = document.getElementById('editar-id');
const inputDescripcion = document.getElementById('editar-descripcion');
const inputFecha = document.getElementById('editar-fecha');
const inputInicio = document.getElementById('editar-hora-inicio');
const inputFin = document.getElementById('editar-hora-fin');

const requisitosContainer = document.getElementById('requisitos-container');
const nuevoRequisitoInput = document.getElementById('nuevo-requisito'); // Cambiado de 'nuevoRequisito' a 'nuevoRequisitoInput' para claridad
const btnAñadirRequisito = document.getElementById('añadir-requisito');
const btnRecogerEdicion = document.getElementById('recoger-edicion'); // Botón para recoger el formulario de edición
const btnVerMasCitas = document.getElementById('ver-mas-citas'); // Botón para "Ver 5 citas más" / "Recoger citas"

let citas = [];
let citasMostradas = 0; // Contador para las citas mostradas
const LIMITE_CITAS_INICIAL = 1; // Citas a cargar inicialmente (solo se mostrará esta primera)
const LIMITE_CITAS_ADICIONALES = 5; // Citas a cargar con "Ver más"
let showingAllCitas = false; // Nuevo estado para saber si se están mostrando todas las citas

// Variables para el modal de mensajes (si se usa)
let messageModal;
let messageText;
let modalOkButton;
let closeButton;

// Requisitos para la edición de citas
let requisitosEdicion = [];

// Función para mostrar un modal de mensaje
function showMessageModal(message) {
    messageModal = document.getElementById('message-modal');
    messageText = document.getElementById('message-text');
    modalOkButton = document.getElementById('modal-ok-button');
    closeButton = document.querySelector('.modal .close-button');

    messageText.textContent = message;
    messageModal.classList.remove('oculto');

    const closeModal = () => {
        messageModal.classList.add('oculto');
        modalOkButton.removeEventListener('click', closeModal);
        closeButton.removeEventListener('click', closeModal);
    };

    modalOkButton.addEventListener('click', closeModal);
    closeButton.addEventListener('click', closeModal);
}

function formatFecha(fechaISO) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const [año, mes, dia] = fechaISO.split('-');
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]}`;
}


async function cargarCitas(showAll = false) {
    console.log(`[cargarCitas] Llamada a cargarCitas con showAll: ${showAll}`);
    let query = supabase
        .from('appointments')
        .select('id, description, date, start_time, end_time, completed, requirements') // Usar start_time y end_time
        .order('completed', { ascending: true })
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }); // Usar start_time

    // Eliminado: if (!showAll) { query = query.limit(LIMITE_CITAS_INICIAL); }
    // Ahora, la consulta siempre trae todas las citas, y el renderizado las limita.
    console.log(`[cargarCitas] Cargando todas las citas para procesamiento.`);


    const { data, error } = await query;

    if (error) {
        console.error('Error al cargar citas desde Supabase:', error);
        showMessageModal(`Error al cargar citas: ${error.message}`);
        return;
    }

    citas = data;
    console.log(`[cargarCitas] Citas cargadas:`, citas);
    renderCitas(showAll);
}

window.cargarCitas = cargarCitas;


function renderCitas(showAll) {
    console.log(`[renderCitas] Renderizando citas. Total de citas: ${citas.length}, showAll: ${showAll}`);
    container.innerHTML = ''; // Limpiar el contenedor antes de renderizar
    citasMostradas = 0;

    if (citas.length === 0) {
        container.innerHTML = '<p class="no-citas-msg">No hay citas programadas.</p>';
        btnVerMasCitas.classList.add('oculto'); // Ocultar el botón si no hay citas
        console.log('[renderCitas] No hay citas, botón "Ver más" oculto.');
        return;

    }


    // Determinar cuántas citas mostrar
    const citasToShow = showAll ? citas.length : LIMITE_CITAS_INICIAL;
    console.log(`[renderCitas] Citas a mostrar: ${citasToShow}`);

    for (let i = 0; i < citasToShow; i++) {
        const cita = citas[i];
        const citaDiv = document.createElement('div');
        citaDiv.classList.add('cita-item');
        if (cita.completed) {
            citaDiv.classList.add('completed-cita-item');
        }

        // Calcular tiempo restante si la cita no está completada
        let tiempoRestante = '';
        if (!cita.completed && cita.date && cita.start_time) {
            const [year, month, day] = cita.date.split('-').map(Number);
            const [hours, minutes] = cita.start_time.split(':').map(Number);
            const fechaCita = new Date(year, month - 1, day, hours, minutes);
            const ahora = new Date();

            const diffMs = fechaCita - ahora;
            if (diffMs > 0) {
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                if (diffDays > 0) {
                    tiempoRestante = `Faltan ${diffDays}d ${diffHours}h`;
                } else if (diffHours > 0) {
                    tiempoRestante = `Faltan ${diffHours}h ${diffMinutes}m`;
                } else {
                    tiempoRestante = `Faltan ${diffMinutes}m`;
                }
            } else {
                tiempoRestante = 'Pasada';
                citaDiv.classList.add('completed-cita-item'); // Marcar como pasada si la fecha/hora ya pasó
            }
        } else if (cita.completed) {
            tiempoRestante = 'Completada';
        }

        citaDiv.innerHTML = `
    <div class="cita-main-content">
        <i class="estado-icono"></i>
        <span class="cita-descripcion">${cita.description}</span>
        <span class="cita-hora">${cita.start_time || ''}${cita.end_time ? ' - ' + cita.end_time : ''}</span>
        <span class="cita-tiempo-restante">${tiempoRestante}</span>
        <div class="cita-requisitos">
            ${(cita.requirements || []).map((req, reqIndex) => `
                <label class="requisito-checkbox">
                    <input type="checkbox"
                           data-id="${cita.id}"
                           data-index="${reqIndex}"
                           ${req.checked ? 'checked' : ''} />
                    <span>${req.text}</span>
                </label>
            `).join('')}
        </div>
    </div>
    <div class="cita-aside-content">
        <div class="cita-fecha">${formatFecha(cita.date)}</div>
        <div class="cita-actions">
            <button class="btn-action btn-complete ${cita.completed ? 'completed' : ''}" data-id="${cita.id}" data-completed="${cita.completed}">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn-action btn-edit" data-id="${cita.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-action btn-delete" data-id="${cita.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
`;
        container.appendChild(citaDiv);
        citasMostradas++;
    }

    // Lógica para el botón "Ver 5 citas más" / "Recoger citas"
    if (citas.length > LIMITE_CITAS_INICIAL) {
        btnVerMasCitas.classList.remove('oculto');
        if (showAll) {
            btnVerMasCitas.textContent = 'Recoger citas';
            console.log('[renderCitas] Botón "Recoger citas" visible.');
        } else {
            const remainingCitas = citas.length - LIMITE_CITAS_INICIAL;
            const numToShow = Math.min(LIMITE_CITAS_ADICIONALES, remainingCitas);
            btnVerMasCitas.textContent = `Ver ${numToShow} citas más`;
            console.log(`[renderCitas] Botón "Ver ${numToShow} citas más" visible.`);
        }
    } else {
        btnVerMasCitas.classList.add('oculto');
        console.log('[renderCitas] No hay suficientes citas para mostrar el botón "Ver más".');
    }

    // Añadir event listeners a los botones de acción
    document.querySelectorAll('.btn-complete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const completed = e.currentTarget.dataset.completed === 'true';
            toggleCompletado(id, !completed);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editarCita(id);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Eliminado: showMessageModal('¿Estás seguro de que quieres borrar esta cita?', () => {
            borrarCita(id);
            // Eliminado: });
        });
    });
// Añadir event listeners a los checkboxes de requisitos
document.querySelectorAll('.cita-requisitos input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
        const citaId = e.target.dataset.id;
        const index = parseInt(e.target.dataset.index);
        const checked = e.target.checked;

        const cita = citas.find(c => c.id == citaId);
        if (!cita || !Array.isArray(cita.requirements)) return;

        cita.requirements[index].checked = checked;

        const { error } = await supabase
            .from('appointments')
            .update({ requirements: cita.requirements })
            .eq('id', citaId);

        if (error) {
            console.error('❌ Error al guardar requisito:', error);
            showMessageModal('No se pudo guardar el cambio en el requisito.');
        } else {
            console.log(`✅ Requisito actualizado para cita ${citaId}`);
        }
    });
});

}

async function editarCita(id) {
    // Si ya está abierto para la misma cita, se pliega
    if (!formEditar.classList.contains('oculto') && inputId.value == id) {
        formEditar.classList.add('oculto');
        return;
    }

    const cita = citas.find(c => c.id == id);
    if (!cita) {
        showMessageModal('Cita no encontrada.');
        return;
    }

    inputId.value = cita.id;
    inputDescripcion.value = cita.description;
    inputFecha.value = cita.date;
    inputInicio.value = cita.start_time;
    inputFin.value = cita.end_time;

    requisitosEdicion = (cita.requirements || []).map(r =>
        typeof r === 'string' ? { text: r, checked: false } : r
    );

    renderRequisitosEdicion();

    formEditar.classList.remove('oculto');
}


function renderRequisitosEdicion() {
    requisitosContainer.innerHTML = '';
    requisitosEdicion.forEach((req, index) => {
        const reqItem = document.createElement('div');
        reqItem.classList.add('requirement-item');
        reqItem.innerHTML = `
            <span>${req.text}</span>

            <button type="button" class="delete-requirement" data-index="${index}">&times;</button>
        `;
        requisitosContainer.appendChild(reqItem);
    });

    requisitosContainer.querySelectorAll('.delete-requirement').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            requisitosEdicion.splice(index, 1);
            renderRequisitosEdicion();
        });
    });
}

// Event listener para añadir requisito en el formulario de edición
btnAñadirRequisito.addEventListener('click', () => {
    const nuevoReq = nuevoRequisitoInput.value.trim();
    if (nuevoReq) {
        requisitosEdicion.push({ text: nuevoReq, checked: false }); // ✅ Aquí está el cambio
        renderRequisitosEdicion();
        nuevoRequisitoInput.value = '';
    }
});


// Event listener para recoger el formulario de edición
btnRecogerEdicion.addEventListener('click', () => {
    formEditar.classList.add('oculto');
});

// Event listener para guardar cambios en el formulario de edición
editarFormulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const updatedDescription = inputDescripcion.value.trim();
    const updatedDate = inputFecha.value;
    const updatedStartTime = inputInicio.value; // Usar start_time
    const updatedEndTime = inputFin.value;     // Usar end_time

    if (!updatedDescription || !updatedDate) {
        showMessageModal('La descripción y la fecha son obligatorias.');
        return;
    }

    const { data, error } = await supabase
        .from('appointments')
        .update({
            description: updatedDescription,
            date: updatedDate,
            start_time: updatedStartTime, // Usar start_time
            end_time: updatedEndTime,     // Usar end_time
            requirements: requisitosEdicion.map(req => {
    if (typeof req === 'string') {
        return { text: req, checked: false };
    }
    return req;
})


        })
        .eq('id', id);

    if (error) {
        console.error('Error al actualizar cita:', error);
        showMessageModal(`Error al actualizar cita: ${error.message}`);
        return;
    }

    // showMessageModal('Cita actualizada exitosamente!');

    formEditar.classList.add('oculto');
    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
});


async function toggleCompletado(id, completedStatus) {
    const { data, error } = await supabase
        .from('appointments')
        .update({ completed: completedStatus })
        .eq('id', id);

    if (error) {
        console.error(error);
        showMessageModal(`Error al cambiar estado: ${error.message}`);
        return;
    }

    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
}

async function borrarCita(id) {
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(error);
        showMessageModal(`Error al borrar cita: ${error.message}`);
        return;
    }

    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
}

document.addEventListener('DOMContentLoaded', () => {
    cargarCitas(); // Cargar citas inicialmente
    
    btnVerMasCitas.addEventListener('click', () => {
        showingAllCitas = !showingAllCitas; // Alternar el estado
        cargarCitas(showingAllCitas); // Volver a cargar citas con el nuevo estado
    });
});




import { supabase } from './supabaseClient.js';

const container = document.getElementById('citas-container');
const formEditar = document.getElementById('form-editar-cita');
const editarFormulario = document.getElementById('editar-formulario');

const inputId = document.getElementById('editar-id');
const inputDescripcion = document.getElementById('editar-descripcion');
const inputFecha = document.getElementById('editar-fecha');
const inputInicio = document.getElementById('editar-hora-inicio');
const inputFin = document.getElementById('editar-hora-fin');

const requisitosContainer = document.getElementById('requisitos-container');
const nuevoRequisitoInput = document.getElementById('nuevo-requisito'); // Cambiado de 'nuevoRequisito' a 'nuevoRequisitoInput' para claridad
const btnAñadirRequisito = document.getElementById('añadir-requisito');
const btnRecogerEdicion = document.getElementById('recoger-edicion'); // Botón para recoger el formulario de edición
const btnVerMasCitas = document.getElementById('ver-mas-citas'); // Botón para "Ver 5 citas más" / "Recoger citas"

let citas = [];
let citasMostradas = 0; // Contador para las citas mostradas
const LIMITE_CITAS_INICIAL = 1; // Citas a cargar inicialmente (solo se mostrará esta primera)
const LIMITE_CITAS_ADICIONALES = 5; // Citas a cargar con "Ver más"
let showingAllCitas = false; // Nuevo estado para saber si se están mostrando todas las citas

// Variables para el modal de mensajes (si se usa)
let messageModal;
let messageText;
let modalOkButton;
let closeButton;

// Requisitos para la edición de citas
let requisitosEdicion = [];

// Función para mostrar un modal de mensaje
function showMessageModal(message) {
    messageModal = document.getElementById('message-modal');
    messageText = document.getElementById('message-text');
    modalOkButton = document.getElementById('modal-ok-button');
    closeButton = document.querySelector('.modal .close-button');

    messageText.textContent = message;
    messageModal.classList.remove('oculto');

    const closeModal = () => {
        messageModal.classList.add('oculto');
        modalOkButton.removeEventListener('click', closeModal);
        closeButton.removeEventListener('click', closeModal);
    };

    modalOkButton.addEventListener('click', closeModal);
    closeButton.addEventListener('click', closeModal);
}

function formatFecha(fechaISO) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const [año, mes, dia] = fechaISO.split('-');
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]}`;
}


async function cargarCitas(showAll = false) {
    console.log(`[cargarCitas] Llamada a cargarCitas con showAll: ${showAll}`);
    let query = supabase
        .from('appointments')
        .select('id, description, date, start_time, end_time, completed, requirements') // Usar start_time y end_time
        .order('completed', { ascending: true })
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }); // Usar start_time

    // Eliminado: if (!showAll) { query = query.limit(LIMITE_CITAS_INICIAL); }
    // Ahora, la consulta siempre trae todas las citas, y el renderizado las limita.
    console.log(`[cargarCitas] Cargando todas las citas para procesamiento.`);


    const { data, error } = await query;

    if (error) {
        console.error('Error al cargar citas desde Supabase:', error);
        showMessageModal(`Error al cargar citas: ${error.message}`);
        return;
    }

    citas = data;
    console.log(`[cargarCitas] Citas cargadas:`, citas);
    renderCitas(showAll);
}

window.cargarCitas = cargarCitas;


function renderCitas(showAll) {
    console.log(`[renderCitas] Renderizando citas. Total de citas: ${citas.length}, showAll: ${showAll}`);
    container.innerHTML = ''; // Limpiar el contenedor antes de renderizar
    citasMostradas = 0;

    if (citas.length === 0) {
        container.innerHTML = '<p class="no-citas-msg">No hay citas programadas.</p>';
        btnVerMasCitas.classList.add('oculto'); // Ocultar el botón si no hay citas
        console.log('[renderCitas] No hay citas, botón "Ver más" oculto.');
        return;

    }


    // Determinar cuántas citas mostrar
let citasToShow = [];

if (showAll) {
  citasToShow = citas;
} else {
  const primeraFecha = citas[0]?.date;
  citasToShow = citas.filter(c => c.date === primeraFecha);
}
    console.log(`[renderCitas] Citas a mostrar: ${citasToShow}`);

    for (let i = 0; i < citasToShow.length; i++) {
  const cita = citasToShow[i];
        const citaDiv = document.createElement('div');
        citaDiv.classList.add('cita-item');
        if (cita.completed) {
            citaDiv.classList.add('completed-cita-item');
        }

        // Calcular tiempo restante si la cita no está completada
        let tiempoRestante = '';
        if (!cita.completed && cita.date && cita.start_time) {
            const [year, month, day] = cita.date.split('-').map(Number);
            const [hours, minutes] = cita.start_time.split(':').map(Number);
            const fechaCita = new Date(year, month - 1, day, hours, minutes);
            const ahora = new Date();

            const diffMs = fechaCita - ahora;
            if (diffMs > 0) {
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                if (diffDays > 0) {
                    tiempoRestante = `Faltan ${diffDays}d ${diffHours}h`;
                } else if (diffHours > 0) {
                    tiempoRestante = `Faltan ${diffHours}h ${diffMinutes}m`;
                } else {
                    tiempoRestante = `Faltan ${diffMinutes}m`;
                }
            } else {
                tiempoRestante = 'Pasada';
                citaDiv.classList.add('completed-cita-item'); // Marcar como pasada si la fecha/hora ya pasó
            }
        } else if (cita.completed) {
            tiempoRestante = 'Completada';
        }

        citaDiv.innerHTML = `
    <div class="cita-main-content">
        <i class="estado-icono"></i>
        <span class="cita-descripcion">${cita.description}</span>
        <span class="cita-hora">${cita.start_time || ''}${cita.end_time ? ' - ' + cita.end_time : ''}</span>
        <span class="cita-tiempo-restante">${tiempoRestante}</span>
        <div class="cita-requisitos">
            ${(cita.requirements || []).map((req, reqIndex) => `
                <label class="requisito-checkbox">
                    <input type="checkbox"
                           data-id="${cita.id}"
                           data-index="${reqIndex}"
                           ${req.checked ? 'checked' : ''} />
                    <span>${req.text}</span>
                </label>
            `).join('')}
        </div>
    </div>
    <div class="cita-aside-content">
        <div class="cita-fecha">${formatFecha(cita.date)}</div>
      <div class="cita-actions">
  <button class="btn-action btn-complete ${cita.completed ? 'completed' : ''}" data-id="${cita.id}" data-completed="${cita.completed}">
    <i class="fas fa-check"></i>
  </button>
  <button class="btn-action btn-edit" data-id="${cita.id}">
    <i class="fas fa-edit"></i>
  </button>
  <button class="btn-action btn-delete" data-id="${cita.id}">
    <i class="fas fa-trash"></i>
  </button>
  <button class="btn-action btn-register" data-id="${cita.id}" title="Guardar como registro">
    <i class="fas fa-bookmark"></i> <!-- Ícono de marcador -->
  </button>
</div>

    </div>
`;
        container.appendChild(citaDiv);
        citasMostradas++;
    }

    // Lógica para el botón "Ver 5 citas más" / "Recoger citas"
    if (citas.length > LIMITE_CITAS_INICIAL) {
        btnVerMasCitas.classList.remove('oculto');
        if (showAll) {
            btnVerMasCitas.textContent = 'Recoger citas';
            console.log('[renderCitas] Botón "Recoger citas" visible.');
        } else {
            const remainingCitas = citas.length - LIMITE_CITAS_INICIAL;
            const numToShow = Math.min(LIMITE_CITAS_ADICIONALES, remainingCitas);
            btnVerMasCitas.textContent = `Ver ${numToShow} citas más`;
            console.log(`[renderCitas] Botón "Ver ${numToShow} citas más" visible.`);
        }
    } else {
        btnVerMasCitas.classList.add('oculto');
        console.log('[renderCitas] No hay suficientes citas para mostrar el botón "Ver más".');
    }

    // Añadir event listeners a los botones de acción
    document.querySelectorAll('.btn-complete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const completed = e.currentTarget.dataset.completed === 'true';
            toggleCompletado(id, !completed);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editarCita(id);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Eliminado: showMessageModal('¿Estás seguro de que quieres borrar esta cita?', () => {
            borrarCita(id);
            // Eliminado: });
        });
    });
// Añadir event listeners a los checkboxes de requisitos
document.querySelectorAll('.cita-requisitos input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
        const citaId = e.target.dataset.id;
        const index = parseInt(e.target.dataset.index);
        const checked = e.target.checked;

        const cita = citas.find(c => c.id == citaId);
        if (!cita || !Array.isArray(cita.requirements)) return;

        cita.requirements[index].checked = checked;

        const { error } = await supabase
            .from('appointments')
            .update({ requirements: cita.requirements })
            .eq('id', citaId);

        if (error) {
            console.error('❌ Error al guardar requisito:', error);
            showMessageModal('No se pudo guardar el cambio en el requisito.');
        } else {
            console.log(`✅ Requisito actualizado para cita ${citaId}`);
        }
    });
});

}

async function editarCita(id) {
    // Si ya está abierto para la misma cita, se pliega
    if (!formEditar.classList.contains('oculto') && inputId.value == id) {
        formEditar.classList.add('oculto');
        return;
    }

    const cita = citas.find(c => c.id == id);
    if (!cita) {
        showMessageModal('Cita no encontrada.');
        return;
    }

    inputId.value = cita.id;
    inputDescripcion.value = cita.description;
    inputFecha.value = cita.date;
    inputInicio.value = cita.start_time;
    inputFin.value = cita.end_time;

    requisitosEdicion = (cita.requirements || []).map(r =>
        typeof r === 'string' ? { text: r, checked: false } : r
    );

    renderRequisitosEdicion();

    formEditar.classList.remove('oculto');
}


function renderRequisitosEdicion() {
    requisitosContainer.innerHTML = '';
    requisitosEdicion.forEach((req, index) => {
        const reqItem = document.createElement('div');
        reqItem.classList.add('requirement-item');
        reqItem.innerHTML = `
            <span>${req.text}</span>

            <button type="button" class="delete-requirement" data-index="${index}">&times;</button>
        `;
        requisitosContainer.appendChild(reqItem);
    });

    requisitosContainer.querySelectorAll('.delete-requirement').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            requisitosEdicion.splice(index, 1);
            renderRequisitosEdicion();
        });
    });
}

// Event listener para añadir requisito en el formulario de edición
btnAñadirRequisito.addEventListener('click', () => {
    const nuevoReq = nuevoRequisitoInput.value.trim();
    if (nuevoReq) {
        requisitosEdicion.push({ text: nuevoReq, checked: false }); // ✅ Aquí está el cambio
        renderRequisitosEdicion();
        nuevoRequisitoInput.value = '';
    }
});


// Event listener para recoger el formulario de edición
btnRecogerEdicion.addEventListener('click', () => {
    formEditar.classList.add('oculto');
});

// Event listener para guardar cambios en el formulario de edición
editarFormulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const updatedDescription = inputDescripcion.value.trim();
    const updatedDate = inputFecha.value;
    const updatedStartTime = inputInicio.value; // Usar start_time
    const updatedEndTime = inputFin.value;     // Usar end_time

    if (!updatedDescription || !updatedDate) {
        showMessageModal('La descripción y la fecha son obligatorias.');
        return;
    }

    const { data, error } = await supabase
        .from('appointments')
        .update({
            description: updatedDescription,
            date: updatedDate,
            start_time: updatedStartTime, // Usar start_time
            end_time: updatedEndTime,     // Usar end_time
            requirements: requisitosEdicion.map(req => {
    if (typeof req === 'string') {
        return { text: req, checked: false };
    }
    return req;
})


        })
        .eq('id', id);

    if (error) {
        console.error('Error al actualizar cita:', error);
        showMessageModal(`Error al actualizar cita: ${error.message}`);
        return;
    }

    // showMessageModal('Cita actualizada exitosamente!');

    formEditar.classList.add('oculto');
    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
});


async function toggleCompletado(id, completedStatus) {
    const { data, error } = await supabase
        .from('appointments')
        .update({ completed: completedStatus })
        .eq('id', id);

    if (error) {
        console.error(error);
        showMessageModal(`Error al cambiar estado: ${error.message}`);
        return;
    }

    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
}

async function borrarCita(id) {
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(error);
        showMessageModal(`Error al borrar cita: ${error.message}`);
        return;
    }

    cargarCitas(showingAllCitas); // Recargar manteniendo el estado actual (expandido o recogido)
}

document.addEventListener('DOMContentLoaded', () => {
    cargarCitas(); // Cargar citas inicialmente
    
    btnVerMasCitas.addEventListener('click', () => {
        showingAllCitas = !showingAllCitas; // Alternar el estado
        cargarCitas(showingAllCitas); // Volver a cargar citas con el nuevo estado
    });
});


