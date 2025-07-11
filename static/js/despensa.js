import { supabase } from './supabaseClient.js';

const container = document.getElementById('despensa-container');
const form = document.getElementById('form-despensa');
const selectIngrediente = document.getElementById('ingrediente-select');
const inputCantidad = document.getElementById('cantidad-ingrediente');
const selectUnidad = document.getElementById('unidad-ingrediente');

// Cargar ingredientes disponibles desde tabla ingredientes
async function cargarListaIngredientes() {
  const { data, error } = await supabase
    .from('ingredientes')
    .select('id, description, unidad')
    .order('description', { ascending: true });

  if (error) {
    alert('Error al cargar ingredientes: ' + error.message);
    return;
  }

  data.forEach(item => {
    const option = document.createElement('option');
    option.value = item.description;
    option.textContent = `${item.description} (${item.unidad})`;
    selectIngrediente.appendChild(option);
  });
}

// Mostrar lo que hay en la despensa
async function cargarDespensa() {
  const { data, error } = await supabase
    .from('despensa')
    .select('id, nombre, cantidad, unidad')
    .order('nombre', { ascending: true });

  if (error) {
    container.innerHTML = `<p>Error al cargar la despensa.</p>`;
    console.error('Error cargando despensa:', error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>No tienes ingredientes guardados.</p>`;
    return;
  }

  const list = document.createElement('ul');

  data.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${item.nombre} — ${item.cantidad} ${item.unidad}
      <button data-id="${item.id}" class="editar-btn">✏️</button>
      <button data-id="${item.id}" class="borrar-btn">🗑</button>
    `;
    list.appendChild(li);
  });

  container.innerHTML = '';
  container.appendChild(list);

  // Eventos de editar y borrar
  document.querySelectorAll('.borrar-btn').forEach(btn => {
    btn.addEventListener('click', borrarIngrediente);
  });

  document.querySelectorAll('.editar-btn').forEach(btn => {
    btn.addEventListener('click', editarIngrediente);
  });
}
async function borrarIngrediente(e) {
  const id = e.target.dataset.id;
  if (!confirm('¿Eliminar este ingrediente de la despensa?')) return;

  const { error } = await supabase
    .from('despensa')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error al borrar: ' + error.message);
  } else {
    cargarDespensa();
  }
}

async function editarIngrediente(e) {
  const id = e.target.dataset.id;

  const nuevaCantidad = prompt('Nueva cantidad:');
  const cantidadNum = parseFloat(nuevaCantidad);

  if (isNaN(cantidadNum) || cantidadNum <= 0) {
    alert('Cantidad no válida.');
    return;
  }

  const { error } = await supabase
    .from('despensa')
    .update({ cantidad: cantidadNum })
    .eq('id', id);

  if (error) {
    alert('Error al editar: ' + error.message);
  } else {
    cargarDespensa();
  }
}

// Añadir ingrediente a la despensa
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = selectIngrediente.value;
    const cantidad = parseFloat(inputCantidad.value);
    const unidad = selectUnidad.value;

    if (!nombre || isNaN(cantidad) || cantidad <= 0) {
      alert('Selecciona un ingrediente y una cantidad válida.');
      return;
    }

    const { error } = await supabase
      .from('despensa')
      .insert([{ nombre, cantidad, unidad }]);

    if (error) {
      alert('Error al guardar el ingrediente: ' + error.message);
      return;
    }

    selectIngrediente.value = '';
    inputCantidad.value = '';
    selectUnidad.value = 'g';

    cargarDespensa();
  });
}


document.addEventListener('DOMContentLoaded', () => {
  cargarListaIngredientes();
  cargarDespensa();
});
