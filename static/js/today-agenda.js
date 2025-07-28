import { supabase } from './supabaseClient.js';

const container = document.getElementById('agenda-container');

async function cargarAgendaHoy() {
  const hoy = new Date();
  const diaSemanaEsp = hoy.toLocaleDateString('es-ES', { weekday: 'long' });
  const hoyStr = hoy.toISOString().split('T')[0];

  let actividades = [];

  // TAREAS
  const { data: tareas, error: errorTareas } = await supabase
    .from('tasks')
    .select('*')
    .eq('due_date', hoyStr);

  if (!errorTareas && tareas) {
    const tareasFormateadas = tareas.map(t => ({
      tipo: 'Tarea',
      id: t.id,
      descripcion: t.description,
      start: t.start_time || '',
      end: t.end_time || '',
      completado: t.is_completed,
      prioridad: t.priority
    }));
    actividades = actividades.concat(tareasFormateadas);
  }

  // RUTINAS
  const { data: rutinas, error: errorRutinas } = await supabase
    .from('routines')
    .select('*')
    .eq('is_active', true)
    .eq('date', hoyStr);

  if (!errorRutinas && rutinas) {
    const rutinasDelDia = rutinas.filter(r =>
      Array.isArray(r.days_of_week) && r.days_of_week.includes(capitalize(diaSemanaEsp))
    );

    const rutinasFormateadas = rutinasDelDia.map(r => ({
      tipo: 'Rutina',
      id: r.id,
      descripcion: r.description,
      start: r.start_time || '',
      end: r.end_time || '',
      completado: r.is_completed

    }));

    actividades = actividades.concat(rutinasFormateadas);
  }

  renderizarActividades(actividades);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function rutinaTerminadaHoy(rutina) {
  if (!rutina.end_time || !rutina.end_time.includes(':')) return false;
  const ahora = new Date();
  const [h, m] = rutina.end_time.split(':').map(Number);
  const fin = new Date();
  fin.setHours(h, m, 0, 0);
  return ahora > fin;
}

function formatHora(hora) {
  if (!hora || hora === '00:00:00') return '';
  return hora.slice(0,5); // Recorta HH:MM
}

function renderizarActividades(actividades) {
  container.innerHTML = '';
  if (actividades.length === 0) {
    container.innerHTML = '<p class="no-citas-msg">No hay actividades para hoy.</p>';
    return;
  }

  const ahora = new Date();

  actividades.sort((a, b) => {
    if (a.completado !== b.completado) {
      return a.completado ? 1 : -1;
    }
    return (a.start || '').localeCompare(b.start || '');
  });

  actividades.forEach(act => {
    const actDiv = document.createElement('div');
    actDiv.classList.add('actividad-item');
actDiv.classList.add(act.tipo.toLowerCase()); // "tarea" o "rutina"
if (act.completado) actDiv.classList.add('actividad-completada');


    let tiempo = '';
    if (act.start && act.start.includes(':')) {
      const [sh, sm] = act.start.split(':').map(Number);
      const inicio = new Date();
      inicio.setHours(sh, sm, 0, 0);
      const diffInicio = inicio - ahora;

      if (diffInicio > 0) {
  const min = Math.floor(diffInicio / (1000 * 60));
  if (min < 60) {
    tiempo = `Empieza en ${min} min`;
  } else if (min < 1440) {
    const horas = Math.floor(min / 60);
    const minutos = min % 60;
    tiempo = `Empieza en ${horas} h ${minutos} min`;
  } else {
    const dias = Math.floor(min / 1440);
    const horas = Math.floor((min % 1440) / 60);
    tiempo = `Empieza en ${dias} d ${horas} h`;
  }
} else if (act.end && act.end.includes(':')) {


        const [eh, em] = act.end.split(':').map(Number);
        const fin = new Date();
        fin.setHours(eh, em, 0, 0);
        const diffFin = fin - ahora;

        if (diffFin > 0) {
          const min = Math.floor(diffFin / (1000 * 60));
          tiempo = `Termina en ${min} min`;
        } else {
          tiempo = 'Terminada';
        }
      } else {
        tiempo = 'En curso';
      }
    } else {
      tiempo = 'Sin hora';
    }

    actDiv.innerHTML = `
  <div class="actividad-info">
    <span class="actividad-hora">
  ${formatHora(act.start)}${formatHora(act.end) ? ` - ${formatHora(act.end)}` : ''}
</span>

    <span class="actividad-descripcion">${act.descripcion}</span>
    <span class="actividad-tiempo">${tiempo}</span>
  </div>
  <div class="actividad-actions">
    <button class="btn-check" data-id="${act.id}" data-tipo="${act.tipo}" data-completado="${act.completado}">
      <span class="circle-btn green">✔️</span>
    </button>
    <button class="btn-editar" data-id="${act.id}" data-tipo="${act.tipo}">
      <span class="circle-btn yellow">✏️</span>
    </button>
    <button class="btn-borrar" data-id="${act.id}" data-tipo="${act.tipo}">
      <span class="circle-btn red">🗑️</span>
    </button>
  </div>
`;


    container.appendChild(actDiv);
  });

  agregarEventos();
}

function agregarEventos() {
document.querySelectorAll('.btn-check').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    const tipo = e.currentTarget.dataset.tipo;
    const actual = e.currentTarget.dataset.completado === 'true';
    const nuevoEstado = !actual;

    const { error } = await supabase
      .from(tipo === 'Tarea' ? 'tasks' : 'routines')
      .update({ is_completed: nuevoEstado })
      .eq('id', id);

    if (!error) cargarAgendaHoy();
  });
});

  document.querySelectorAll('.btn-borrar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const tipo = e.currentTarget.dataset.tipo;

      const { error } = await supabase
        .from(tipo === 'Tarea' ? 'tasks' : 'routines')
        .delete()
        .eq('id', id);

      if (!error) cargarAgendaHoy();
    });
  });

  document.querySelectorAll('.btn-editar').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    const tipo = e.currentTarget.dataset.tipo;

    const { data, error } = await supabase
      .from(tipo === 'Tarea' ? 'tasks' : 'routines')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error("No se pudo obtener la actividad:", error);
      return;
    }

    // Crear el formulario visualmente bonito
    const formContainer = document.createElement('div');
    formContainer.classList.add('form-overlay');

    formContainer.innerHTML = `
      <form class="formulario-edicion">
        <h3>Editar ${tipo}</h3>
        <label>Descripción:
          <input type="text" name="descripcion" value="${data.description}" required>
        </label>
        <label>Hora inicio:
          <input type="time" name="start" value="${data.start_time || ''}">
        </label>
        <label>Hora fin:
          <input type="time" name="end" value="${data.end_time || ''}">
        </label>
        <div class="form-botones">
          <button type="submit">Guardar</button>
          <button type="button" id="cancelarEdicion">Cancelar</button>
        </div>
      </form>
    `;
    document.body.appendChild(formContainer);

    // Cancelar
    formContainer.querySelector('#cancelarEdicion').onclick = () => formContainer.remove();

    // Guardar cambios
    formContainer.querySelector('form').onsubmit = async (ev) => {
      ev.preventDefault();
      const nuevaDescripcion = ev.target.descripcion.value;
      const nuevaHoraInicio = ev.target.start.value;
      const nuevaHoraFin = ev.target.end.value;

      const { error: errorUpdate } = await supabase
        .from(tipo === 'Tarea' ? 'tasks' : 'routines')
        .update({
          description: nuevaDescripcion,
          start_time: nuevaHoraInicio || null,
          end_time: nuevaHoraFin || null
        })
        .eq('id', id);

      if (errorUpdate) {
        console.error("Error al actualizar:", errorUpdate);
      } else {
        formContainer.remove();
        cargarAgendaHoy();
      }
    };
  });
});


}

cargarAgendaHoy();
window.cargarAgendaHoy = cargarAgendaHoy;
