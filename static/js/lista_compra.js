// Importa el cliente de Supabase desde el archivo de configuración
import { supabase } from './supabaseClient.js';

// Obtiene referencias a los elementos del DOM
const form = document.getElementById('form-lista');
const inputNombre = document.getElementById('nombre-item');
const inputCantidad = document.getElementById('cantidad-item');
const selectUnidad = document.getElementById('unidad-item');
const container = document.getElementById('lista-compra-container');

// Añade un 'event listener' al formulario para el envío
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página)

  // Obtiene los valores de los campos de entrada
  const nombre = inputNombre.value.trim(); // Elimina espacios en blanco al inicio y al final
  const cantidad = parseFloat(inputCantidad.value); // Convierte la cantidad a número flotante
  const unidad = selectUnidad.value;

  // Valida la entrada del usuario
  if (!nombre || isNaN(cantidad) || cantidad <= 0) {
    // Usa un modal personalizado en lugar de alert()
    mostrarMensajeModal('Introduce un nombre y una cantidad válida.');
    return;
  }

  // Inserta el nuevo elemento en la tabla 'lista_compra' de Supabase
  const { error } = await supabase
    .from('lista_compra')
    .insert([{ nombre, cantidad, unidad }]);

  // Manejo de errores durante la inserción
  if (error) {
    mostrarMensajeModal('Error al guardar: ' + error.message);
    return;
  }

  // Limpia los campos del formulario después de una inserción exitosa
  inputNombre.value = '';
  inputCantidad.value = '';
  selectUnidad.value = 'g'; // Restablece la unidad a su valor predeterminado

  // Vuelve a cargar la lista para mostrar el nuevo elemento
  cargarLista();
});

// Función asíncrona para cargar y mostrar la lista de la compra
async function cargarLista() {
  // Obtiene los datos de la tabla 'lista_compra' de Supabase
  const { data: lista, error } = await supabase
    .from('lista_compra')
    .select('id, nombre, cantidad, unidad, completado') // Selecciona las columnas necesarias
    .order('created_at', { ascending: true }); // Ordena por fecha de creación

  // *** INICIO DE DEPURACIÓN ***
  // Muestra los datos obtenidos de Supabase en la consola para depuración
  console.log("Datos de Supabase para lista_compra:", lista);
  // *** FIN DE DEPURACIÓN ***

  // Manejo de errores al cargar la lista
  if (error) {
    container.innerHTML = '<p>Error al cargar la lista.</p>';
    console.error("Error al cargar la lista de la compra:", error);
    return;
  }

  // Si no hay elementos en la lista, muestra un mensaje
  if (!lista || lista.length === 0) {
    container.innerHTML = '<p>No hay ingredientes en la lista.</p>';
    return;
  }

  // Carga los ingredientes actuales de la tabla 'ingredientes' para verificar duplicados
  const { data: ingredientes, error: ingredientesError } = await supabase
    .from('ingredientes')
    .select('description');

  // Manejo de errores al cargar ingredientes existentes
  if (ingredientesError) {
    console.error("Error al cargar ingredientes existentes:", ingredientesError);
    // Continuar sin esta información si hay un error, o manejarlo de otra manera
    // Por ahora, solo se registrará el error y se asumirá que no hay ingredientes existentes
  }

  // Crea un Set para una búsqueda eficiente de ingredientes existentes
  const ingredientesExistentes = new Set(ingredientes?.map(i => i.description) || []);

  const list = document.createElement('ul'); // Crea una lista desordenada

  // Separa los elementos pendientes de los completados
  const completados = [];
  const pendientes = [];

  lista.forEach(item => {
    if (item.completado) {
      completados.push(item);
    } else {
      pendientes.push(item);
    }
  });

  // Une las dos listas para mostrar los pendientes primero
  const ordenados = [...pendientes, ...completados];

  // Itera sobre los elementos ordenados y crea elementos de lista para cada uno
  ordenados.forEach(item => {
    const yaExiste = ingredientesExistentes.has(item.nombre); // Verifica si el ingrediente ya existe
    const icono = yaExiste ? '✅' : '➕'; // Elige el icono según si ya existe

    const li = document.createElement('li'); // Crea un elemento de lista
    li.innerHTML = `
      <input type="checkbox" class="completado-checkbox" data-id="${item.id}" ${item.completado ? 'checked' : ''}>
      <span>${item.nombre} — ${item.cantidad} ${item.unidad}</span>
      <button class="editar-btn" data-id="${item.id}">✏️</button>
      <button class="borrar-btn" data-id="${item.id}">🗑️</button>
      <button class="agregar-btn" data-nombre="${item.nombre}" data-unidad="${item.unidad}" ${yaExiste ? 'disabled' : ''}>
        ${icono}
      </button>
    `;
    list.appendChild(li); // Añade el elemento de lista a la lista desordenada
  });

  container.innerHTML = ''; // Limpia el contenido actual del contenedor
  container.appendChild(list); // Añade la lista desordenada al contenedor

  // Añade 'event listeners' a los botones de borrar, editar y los checkboxes
  document.querySelectorAll('.borrar-btn').forEach(btn => {
    btn.addEventListener('click', borrarItem);
  });

  document.querySelectorAll('.editar-btn').forEach(btn => {
    btn.addEventListener('click', editarItem);
  });

  document.querySelectorAll('.completado-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const id = e.target.dataset.id; // Obtiene el ID del elemento
      const completado = e.target.checked; // Obtiene el estado del checkbox

      // Actualiza el estado 'completado' en Supabase
      const { error } = await supabase
        .from('lista_compra')
        .update({ completado })
        .eq('id', id); // Filtra por ID

      // Manejo de errores al actualizar el estado
      if (error) {
        mostrarMensajeModal('Error al actualizar estado: ' + error.message);
      } else {
        cargarLista(); // Vuelve a cargar la lista para que el elemento se mueva al final
      }
    });
  });

  // Añade 'event listeners' a los botones de agregar como ingrediente
  document.querySelectorAll('.agregar-btn').forEach(btn => {
    btn.addEventListener('click', agregarComoIngrediente);
  });
}

// Función asíncrona para agregar un elemento como ingrediente a la despensa
async function agregarComoIngrediente(e) {
  const nombre = e.target.dataset.nombre;
  const unidad = e.target.dataset.unidad;

  // Verifica si el ingrediente ya existe en la tabla 'ingredientes'
  const { data, error } = await supabase
    .from('ingredientes')
    .select('id')
    .eq('description', nombre)
    .maybeSingle(); // Espera un solo resultado o ninguno

  // Manejo de errores al buscar el ingrediente
  if (error) {
    mostrarMensajeModal('Error al verificar ingrediente existente: ' + error.message);
    return;
  }

  // Si el ingrediente ya existe, muestra un mensaje
  if (data) {
    mostrarMensajeModal('Este ingrediente ya está en la lista de ingredientes.');
    return;
  }

  // Inserta el nuevo ingrediente en la tabla 'ingredientes'
  const { error: insertError } = await supabase
    .from('ingredientes')
    .insert([{ description: nombre, unidad }]);

  // Manejo de errores durante la inserción
  if (insertError) {
    mostrarMensajeModal('Error al añadir a ingredientes: ' + insertError.message);
    return;
  }

  cargarLista(); // Recarga la lista para mostrar el icono actualizado
}

// Función asíncrona para borrar un elemento de la lista
async function borrarItem(e) {
  const id = e.target.dataset.id; // Obtiene el ID del elemento a borrar

  // Elimina el elemento de la tabla 'lista_compra'
  const { error } = await supabase
    .from('lista_compra')
    .delete()
    .eq('id', id); // Filtra por ID

  // Manejo de errores durante el borrado
  if (error) {
    mostrarMensajeModal('Error al borrar: ' + error.message);
    return;
  }

  cargarLista(); // Vuelve a cargar la lista después de borrar
}

// Función para editar un elemento de la lista
function editarItem(e) {
  const id = e.target.dataset.id; // Obtiene el ID del elemento a editar
  const li = e.target.closest('li'); // Obtiene el elemento de lista padre
  const span = li.querySelector('span'); // Obtiene el span que contiene la información

  // Extrae los datos del texto del span (ej: "Azúcar — 100 g")
  const texto = span.textContent;
  const partes = texto.split('—');
  const nombre = partes[0]?.trim() || '';
  const cantidadYunidad = partes[1]?.trim().split(' ') || [];
  const cantidad = cantidadYunidad[0] || '';
  const unidad = cantidadYunidad[1] || '';

  // Crea un formulario de edición incrustado
  const form = document.createElement('form');
  form.innerHTML = `
    <input type="text" name="nombre" value="${nombre}" placeholder="Nombre" required>
    <input type="number" name="cantidad" value="${cantidad}" placeholder="Cantidad" required>
    <input type="text" name="unidad" value="${unidad}" placeholder="Unidad" required>
    <button type="submit">💾</button>
    <button type="button" class="cancelar-edicion">✖️</button>
  `;

  // Reemplaza el span con el formulario de edición
  span.replaceWith(form);

  // Añade un 'event listener' al formulario para guardar los cambios
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nuevoNombre = form.nombre.value.trim();
    const nuevaCantidad = parseFloat(form.cantidad.value);
    const nuevaUnidad = form.unidad.value.trim();

    // Actualiza el elemento en la tabla 'lista_compra' de Supabase
    const { error } = await supabase
      .from('lista_compra')
      .update({
        nombre: nuevoNombre,
        cantidad: nuevaCantidad,
        unidad: nuevaUnidad
      })
      .eq('id', id); // Filtra por ID

    // Manejo de errores al guardar cambios
    if (error) {
      mostrarMensajeModal('Error al guardar cambios: ' + error.message);
    } else {
      cargarLista(); // Vuelve a cargar la lista para mostrar los cambios
    }
  });

  // Añade un 'event listener' al botón de cancelar edición
  form.querySelector('.cancelar-edicion').addEventListener('click', () => {
    cargarLista(); // Vuelve a cargar la lista para descartar los cambios y restaurar el estado original
  });
}

// Función para mostrar un mensaje en un modal personalizado (reemplaza alert())
function mostrarMensajeModal(mensaje) {
  // Crea un elemento div para el modal
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = 'white';
  modal.style.padding = '20px';
  modal.style.borderRadius = '8px';
  modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  modal.style.zIndex = '1000';
  modal.style.textAlign = 'center';
  modal.style.border = '1px solid #ccc';
  modal.style.maxWidth = '80%'; // Para pantallas pequeñas

  // Contenido del modal
  modal.innerHTML = `
    <p>${mensaje}</p>
    <button id="cerrar-modal" style="margin-top: 15px; padding: 8px 15px; border: none; border-radius: 5px; background-color: #007bff; color: white; cursor: pointer;">Cerrar</button>
  `;

  document.body.appendChild(modal);

  // Añade un 'event listener' al botón de cerrar el modal
  document.getElementById('cerrar-modal').addEventListener('click', () => {
    modal.remove(); // Elimina el modal del DOM
  });
}


// Carga la lista cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', cargarLista);

// Añade un 'event listener' al botón para agregar completados a la despensa
document.getElementById('agregar-completados-despensa').addEventListener('click', async () => {
  // Obtiene todos los elementos completados de la lista de la compra
  const { data: completados, error } = await supabase
    .from('lista_compra')
    .select('*')
    .eq('completado', true);

  // Manejo de errores al obtener ingredientes completados
  if (error) {
    mostrarMensajeModal('Error al obtener ingredientes completados: ' + error.message);
    return;
  }

  // Itera sobre los elementos completados
  for (const item of completados) {
    // Verifica si el ingrediente ya existe en la tabla 'ingredientes'
    const { data: existente } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('description', item.nombre)
      .maybeSingle();

    // Si el ingrediente existe, actualiza su cantidad
    if (existente) {
      await supabase
        .from('ingredientes')
        .update({ cantidad: existente.cantidad + item.cantidad })
        .eq('id', existente.id);
    } else {
      // Si no existe, inserta el nuevo ingrediente
      await supabase
        .from('ingredientes')
        .insert([{ description: item.nombre, cantidad: item.cantidad, unidad: item.unidad }]);
    }

    // Elimina el elemento de la lista de la compra después de procesarlo
    await supabase
      .from('lista_compra')
      .delete()
      .eq('id', item.id);
  }

  mostrarMensajeModal('¡Ingredientes pasados a la despensa!');
  cargarLista(); // Vuelve a cargar la lista para reflejar los cambios
});
