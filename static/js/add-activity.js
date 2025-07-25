import { supabase } from './supabaseClient.js';
import { guardarReceta } from './recetas.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('nueva-actividad-formulario');
  const descripcionInput = document.getElementById('nueva-actividad-descripcion');
  const tipoButtons = document.querySelectorAll('.icon-button');
  const formulariosActividad = document.getElementById('formularios-actividad');
  const cancelarBtn = document.getElementById("cancelar-nueva-actividad");

  if (!form || !descripcionInput || tipoButtons.length === 0 || !formulariosActividad || !cancelarBtn) return;

  const requisitosCita = [];
  const inputNuevoRequisito = document.getElementById('nuevo-requisito-cita');
  const btnAñadirRequisito = document.getElementById('btn-añadir-requisito-cita');
  const contenedorRequisitos = document.getElementById('cita-requisitos-container');

  let tipoSeleccionado = null;

  function setDefaultsForTask() {
    const now = new Date();
    const fechaInput = document.getElementById('tarea-fecha');
    if (fechaInput) fechaInput.value = now.toISOString().split('T')[0];
    const startInput = document.getElementById('tarea-hora-inicio');
    if (startInput) startInput.value = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
    const endInput = document.getElementById('tarea-hora-fin');
    if (endInput) endInput.value = new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
  }

  function setDefaultsForRoutine() {
    const now = new Date();
    const fechaInput = document.getElementById('rutina-fecha');
    if (fechaInput) fechaInput.value = now.toISOString().split('T')[0];
    const startInput = document.getElementById('rutina-hora-inicio');
    if (startInput) startInput.value = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
    const endInput = document.getElementById('rutina-hora-fin');
    if (endInput) endInput.value = new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
  }

  if (btnAñadirRequisito && inputNuevoRequisito && contenedorRequisitos) {
    btnAñadirRequisito.addEventListener('click', () => {
      const texto = inputNuevoRequisito.value.trim();
      if (texto) {
        requisitosCita.push({ text: texto, checked: false });
        renderizarRequisitos();
        inputNuevoRequisito.value = '';
      }
    });

    function renderizarRequisitos() {
      contenedorRequisitos.innerHTML = '';
      requisitosCita.forEach((req, index) => {
        const item = document.createElement('div');
        item.classList.add('requirement-item');
        item.innerHTML = `<span>${req.text}</span> <button type="button" data-index="${index}">&times;</button>`;
        item.querySelector('button').addEventListener('click', () => {
          requisitosCita.splice(index, 1);
          renderizarRequisitos();
        });
        contenedorRequisitos.appendChild(item);
      });
    }
  }

  tipoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tipoSeleccionado = btn.dataset.type;
      mostrarFormulario(tipoSeleccionado);
    });
  });

  function mostrarFormulario(tipo) {
    if (!tipo) return;
    formulariosActividad.classList.remove('oculto');
    document.querySelectorAll('.tipo-formulario').forEach(f => f.classList.add('oculto'));
    const form = document.getElementById(`form-${tipo.toLowerCase()}`);
    if (form) {
      form.classList.remove('oculto');
    }
    if (tipo === 'Receta' && typeof cargarIngredientesParaReceta === 'function') {
      cargarIngredientesParaReceta();
    }
    if (tipo === 'Tarea') setDefaultsForTask();
    if (tipo === 'Rutina') setDefaultsForRoutine();
  }

  cancelarBtn.addEventListener("click", () => {
    formulariosActividad.classList.add("oculto");
    document.querySelectorAll(".tipo-formulario").forEach(form => form.classList.add("oculto"));
    descripcionInput.value = "";
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descripcion = descripcionInput.value.trim();
    if (!descripcion || !tipoSeleccionado) return;

    let dataToSave = { description: descripcion };
    let tableName = '';

    if (tipoSeleccionado === 'Receta') {
      if (typeof guardarReceta === 'function') {
        await guardarReceta();
        form.reset();
        formulariosActividad.classList.add('oculto');
        tipoSeleccionado = null;
      } else {
        alert('guardarReceta() no está disponible');
      }
      return;
    }

    if (tipoSeleccionado === 'Tarea') {
      tableName = 'tasks';
      dataToSave.due_date = document.getElementById('tarea-fecha').value;
      dataToSave.start_time = document.getElementById('tarea-hora-inicio').value;
      dataToSave.end_time = document.getElementById('tarea-hora-fin').value;
      const prioridad = document.getElementById('tarea-prioridad').value;
      dataToSave.priority = prioridad === 'Alta' ? 3 : prioridad === 'Media' ? 2 : 1;
      dataToSave.is_completed = false;
    } else if (tipoSeleccionado === 'Ingrediente') {
      tableName = 'ingredientes';
      dataToSave.description = descripcion;
      dataToSave.supermercado = document.getElementById('ingrediente-supermercado').value;
      dataToSave.precio = parseFloat(document.getElementById('ingrediente-precio').value);
      dataToSave.cantidad = parseFloat(document.getElementById('ingrediente-cantidad').value);
      dataToSave.unidad = document.getElementById('ingrediente-unidad').value;
      dataToSave.calorias = parseFloat(document.getElementById('ingrediente-calorias').value);
      dataToSave.proteinas = parseFloat(document.getElementById('ingrediente-proteinas').value);

      // Guardar también en ingredientes_base
      supabase.from('ingredientes_base').upsert([{
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
      }).then(({ error }) => {
        if (error) {
          console.error("Error al guardar en ingredientes_base:", error.message);
        } else {
          console.log("Ingrediente guardado también en ingredientes_base");
        }
      });

    } else if (tipoSeleccionado === 'Rutina') {
      tableName = 'routines';
      dataToSave.start_time = document.getElementById('rutina-hora-inicio').value;
      dataToSave.end_time = document.getElementById('rutina-hora-fin').value;
      const dias = Array.from(document.querySelectorAll('input[name="rutina_dia_semana"]:checked')).map(el => el.value);
      dataToSave.days_of_week = dias;
      dataToSave.is_active = true;
      dataToSave.date = document.getElementById('rutina-fecha').value;
    } else if (tipoSeleccionado === 'Cita') {
      tableName = 'appointments';
      dataToSave.date = document.getElementById('cita-fecha').value;
      dataToSave.start_time = document.getElementById('cita-hora-inicio').value;
      dataToSave.end_time = document.getElementById('cita-hora-fin').value;
      dataToSave.requirements = requisitosCita;
      dataToSave.completed = false;
    }

    const { error } = await supabase.from(tableName).insert([dataToSave]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      if (tipoSeleccionado === 'Cita' && typeof cargarCitas === 'function') {
        cargarCitas();
      }

      form.reset();
      formulariosActividad.classList.add('oculto');
      tipoSeleccionado = null;
      if (typeof cargarAgendaHoy === 'function') cargarAgendaHoy();
    }
  });
});
