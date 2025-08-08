import { supabase } from './supabaseClient.js';
import { guardarReceta } from './recetas.js';

// Obtener referencias a los elementos del DOM (la mayoría se obtendrán al cargar el DOM)
const botonesActividad = document.getElementById("botones-actividad");
let tipoSeleccionado = null; // Variable para almacenar el tipo de actividad seleccionado

// Lógica para añadir y renderizar requisitos de citas
const requisitosCita = [];
let inputNuevoRequisito;
let btnAñadirRequisito;
let contenedorRequisitos;

// Función para renderizar los requisitos en el DOM
function renderizarRequisitos() {
  if (!contenedorRequisitos) return;
  contenedorRequisitos.innerHTML = ''; // Limpia el contenedor
  requisitosCita.forEach((req, index) => {
    const item = document.createElement('div');
    item.classList.add('requirement-item');
    // Crea un elemento con el texto del requisito y un botón para eliminarlo
    item.innerHTML = `<span>${req.text}</span> <button type="button" data-index="${index}">&times;</button>`;
    item.querySelector('button').addEventListener('click', () => {
      requisitosCita.splice(index, 1); // Elimina el requisito del array
      renderizarRequisitos(); // Vuelve a renderizar la lista
    });
    contenedorRequisitos.appendChild(item);
  });
}

// Lógica para el manejo del formulario de notas, contador y otros
document.addEventListener('DOMContentLoaded', () => {
  // Obtener referencias a los elementos del DOM
  const form = document.getElementById('nueva-actividad-formulario');
  const descripcionInput = document.getElementById('nueva-actividad-descripcion');
  const tipoButtons = document.querySelectorAll('.icon-button[data-type]');
  const formulariosActividad = document.getElementById('formularios-actividad');
  const cancelarBtn = document.getElementById("cancelar-nueva-actividad");
  const btnNota = document.getElementById('btn-nota-actividad');

  // Asignar referencias a las variables globales para los requisitos de citas
  inputNuevoRequisito = document.getElementById('nuevo-requisito-cita');
  btnAñadirRequisito = document.getElementById('btn-añadir-requisito-cita');
  contenedorRequisitos = document.getElementById('cita-requisitos-container');

  // Función para actualizar el contador de notas solo del usuario actual
  async function actualizarContadorNotas() {
    const usuarioActual = localStorage.getItem('usuario_actual');
    const { count, error } = await supabase
      .from('notas')
      .select('*', { count: 'exact', head: true })
      .eq('usuario', usuarioActual);

    const badge = document.getElementById('contador-notas');
    if (!error && badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } else {
      console.error('Error al cargar el contador de notas:', error);
    }
  }

  // Si el botón de nota existe, añadir el event listener
  if (btnNota) {
    btnNota.addEventListener('click', async () => {
      const texto = descripcionInput.value.trim();

      if (!texto) {
        // Si está vacío, redirige a la página de notas
        window.location.href = '/notas';
        return;
      }

      // Si hay texto, guarda la nota en Supabase
      const usuarioActual = localStorage.getItem('usuario_actual');
      const { error } = await supabase.from('notas').insert([
        { descripcion: texto, usuario: usuarioActual }
      ]);

      if (error) {
        // Muestra un mensaje de error si falla la operación
        console.error('Error al guardar nota: ' + error.message);
        // Considerar usar un modal personalizado en lugar de alert()
      } else {
        // Limpia el input y actualiza el contador de notas
        descripcionInput.value = '';
        actualizarContadorNotas();
      }
    });

    // Cargar el contador de notas al inicio
    actualizarContadorNotas();
  }

  // Verificar que los elementos esenciales del formulario existan
  if (!form || !descripcionInput || tipoButtons.length === 0 || !formulariosActividad || !cancelarBtn) {
    console.warn("Algunos elementos del formulario de actividad no se encontraron. El script podría no funcionar correctamente.");
    return;
  }

  // Función para establecer valores por defecto para el formulario de Tarea
  function setDefaultsForTask() {
    const now = new Date();
    const fechaInput = document.getElementById('tarea-fecha');
    if (fechaInput) fechaInput.value = now.toISOString().split('T')[0];
    const startInput = document.getElementById('tarea-hora-inicio');
    // Establece la hora de inicio una hora después de la actual
    if (startInput) startInput.value = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
    const endInput = document.getElementById('tarea-hora-fin');
    // Establece la hora de fin dos horas después de la actual
    if (endInput) endInput.value = new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
  }

  // Función para establecer valores por defecto para el formulario de Rutina
  function setDefaultsForRoutine() {
    const now = new Date();
    const fechaInput = document.getElementById('rutina-fecha');
    if (fechaInput) fechaInput.value = now.toISOString().split('T')[0];
    const startInput = document.getElementById('rutina-hora-inicio');
    // Establece la hora de inicio una hora después de la actual
    if (startInput) startInput.value = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
    const endInput = document.getElementById('rutina-hora-fin');
    // Establece la hora de fin dos horas después de la actual
    if (endInput) endInput.value = new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
  }

  // Lógica para añadir y renderizar requisitos de citas
  if (btnAñadirRequisito && inputNuevoRequisito && contenedorRequisitos) {
    btnAñadirRequisito.addEventListener('click', () => {
      const texto = inputNuevoRequisito.value.trim();
      if (texto) {
        requisitosCita.push({ text: texto, checked: false });
        renderizarRequisitos();
        inputNuevoRequisito.value = '';
      }
    });
  }
  if (tipoButtons.length === 0) {
  console.warn('No se encontraron botones con data-type. Verifica si están en el DOM al cargar el script.');
}

  // Añadir event listeners a los botones de tipo de actividad
  tipoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tipoSeleccionado = btn.dataset.type; // Obtiene el tipo de actividad del atributo data-type
      mostrarFormulario(tipoSeleccionado); // Muestra el formulario correspondiente
    });
  });

  // Función para mostrar el formulario de actividad según el tipo seleccionado
  function mostrarFormulario(tipo) {
    if (!tipo) return;

    // Oculta todos los formularios antes de mostrar el nuevo
    document.querySelectorAll('.tipo-formulario').forEach(f => f.classList.add('oculto'));
    formulariosActividad.classList.remove('oculto');

    // Asegúrate de que los botones se muestren
    if (botonesActividad) botonesActividad.classList.remove("oculto");

    // Mostrar el formulario correspondiente
    const formToShow = document.getElementById(`form-${tipo.toLowerCase()}`);
    if (formToShow) {
      formToShow.classList.remove('oculto');
      formToShow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Inicializar valores por defecto si aplica
    if (tipo === 'Receta' && typeof cargarIngredientesParaReceta === 'function') {
      cargarIngredientesParaReceta();
    }
    if (tipo === 'Tarea') setDefaultsForTask();
    if (tipo === 'Rutina') setDefaultsForRoutine();
  }

  // Event listener para el botón de cancelar
  cancelarBtn.addEventListener("click", () => {
    formulariosActividad.classList.add("oculto"); // Oculta el contenedor de formularios
    // Oculta todos los formularios de tipo
    document.querySelectorAll(".tipo-formulario").forEach(form => form.classList.add("oculto"));
    descripcionInput.value = ""; // Limpia el campo de descripción
    if (botonesActividad) botonesActividad.classList.add("oculto");
  });

  // Event listener para el envío del formulario principal
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene el envío por defecto del formulario
    const descripcion = descripcionInput.value.trim();
    if (!descripcion || !tipoSeleccionado) return; // Si no hay descripción o tipo, no hace nada

    let dataToSave = { description: descripcion };
    // Obtener el usuario actual desde localStorage
  dataToSave.usuario = localStorage.getItem('usuario_actual') || "desconocido";


    // Lógica para guardar diferentes tipos de actividades
if (tipoSeleccionado === 'Receta') {
  if (typeof guardarReceta === 'function') {
    const usuario = localStorage.getItem('usuario_actual') || "desconocido"; // ✅ AÑADIDO AQUÍ
    await guardarReceta(usuario); // ✅ Ya funciona correctamente
    form.reset(); 
    formulariosActividad.classList.add('oculto'); 
    tipoSeleccionado = null;
  } else {
    console.error('guardarReceta() no está disponible');
  }
  return;
}


    if (tipoSeleccionado === 'Tarea') {
      try {
        const tableName = 'tasks';
        dataToSave.due_date = document.getElementById('tarea-fecha').value;
        dataToSave.start_time = document.getElementById('tarea-hora-inicio').value;
        dataToSave.end_time = document.getElementById('tarea-hora-fin').value;
        const prioridad = document.getElementById('tarea-prioridad').value;
        dataToSave.priority = prioridad === 'Alta' ? 3 : prioridad === 'Media' ? 2 : 1;
        dataToSave.is_completed = false;

        const { error } = await supabase.from(tableName).insert([dataToSave]);

        if (error) {
          throw error;
        }

        // Éxito: Ocultar y resetear
        form.reset();
        formulariosActividad.classList.add('oculto');
        tipoSeleccionado = null;
        if (typeof cargarAgendaHoy === 'function') cargarAgendaHoy();
        if (botonesActividad) botonesActividad.classList.add("oculto");

      } catch (error) {
        console.error('Error al guardar Tarea: ' + error.message);
      }
    } else if (tipoSeleccionado === 'Ingrediente') {
      try {
        const tableName = 'ingredientes';
        dataToSave.supermercado = document.getElementById('ingrediente-supermercado').value;
        dataToSave.precio = parseFloat(document.getElementById('ingrediente-precio').value);
        dataToSave.cantidad = parseFloat(document.getElementById('ingrediente-cantidad').value);
        dataToSave.unidad = document.getElementById('ingrediente-unidad').value;
        dataToSave.calorias = parseFloat(document.getElementById('ingrediente-calorias').value);
        dataToSave.proteinas = parseFloat(document.getElementById('ingrediente-proteinas').value);

        // Guardar también en ingredientes_base para mantener una lista maestra
        const { error: upsertError } = await supabase.from('ingredientes_base').upsert([{
          nombre: descripcion,
          unidad: dataToSave.unidad,
          cantidad: dataToSave.cantidad,
          calorias: dataToSave.calorias,
          proteinas: dataToSave.proteinas,
          precio: dataToSave.precio,
          supermercado: dataToSave.supermercado,
          description: descripcion
        }], {
          onConflict: ['nombre']
        });

        if (upsertError) {
          console.error("Error al guardar en ingredientes_base:", upsertError.message);
        } else {
          console.log("Ingrediente guardado también en ingredientes_base");
        }
        
        const { error: insertError } = await supabase.from(tableName).insert([dataToSave]);
        
        if (insertError) {
          throw insertError;
        }

        // Éxito: Ocultar y resetear
        form.reset();
        formulariosActividad.classList.add('oculto');
        tipoSeleccionado = null;
        if (typeof cargarAgendaHoy === 'function') cargarAgendaHoy();
        if (botonesActividad) botonesActividad.classList.add("oculto");

      } catch (error) {
        console.error('Error al guardar Ingrediente: ' + error.message);
      }
    } else if (tipoSeleccionado === 'Rutina') {
      try {
        const tableName = 'routines';
        dataToSave.start_time = document.getElementById('rutina-hora-inicio').value;
        dataToSave.end_time = document.getElementById('rutina-hora-fin').value;
        const dias = Array.from(document.querySelectorAll('input[name="rutina_dia_semana"]:checked')).map(el => el.value);
        dataToSave.days_of_week = dias;
        dataToSave.is_active = true;
        dataToSave.date = document.getElementById('rutina-fecha').value;
        const endDateInput = document.getElementById('rutina-fecha-fin');
        if (endDateInput && endDateInput.value) {
          dataToSave.end_date = endDateInput.value;
        }

        const { error } = await supabase.from(tableName).insert([dataToSave]);

        if (error) {
          throw error;
        }

        // Éxito: Ocultar y resetear
        form.reset();
        formulariosActividad.classList.add('oculto');
        tipoSeleccionado = null;
        if (typeof cargarAgendaHoy === 'function') cargarAgendaHoy();
        if (botonesActividad) botonesActividad.classList.add("oculto");

      } catch (error) {
        console.error('Error al guardar Rutina: ' + error.message);
      }
    } else if (tipoSeleccionado === 'Cita') {
      try {
        const tableName = 'appointments';
        dataToSave.date = document.getElementById('cita-fecha').value;
        dataToSave.start_time = document.getElementById('cita-hora-inicio').value;
        dataToSave.end_time = document.getElementById('cita-hora-fin').value;
        dataToSave.requirements = requisitosCita;
        dataToSave.completed = false;

        const { error } = await supabase.from(tableName).insert([dataToSave]);

        if (error) {
          throw error;
        }

        // Éxito: Ocultar y resetear
        if (typeof cargarCitas === 'function') {
          cargarCitas();
        }
        form.reset();
        formulariosActividad.classList.add('oculto');
        tipoSeleccionado = null;
        if (typeof cargarAgendaHoy === 'function') cargarAgendaHoy();
        if (botonesActividad) botonesActividad.classList.add("oculto");

      } catch (error) {
        console.error('Error al guardar Cita: ' + error.message);
      }
    }
  });
});
