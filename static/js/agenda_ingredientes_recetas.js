// Importa la instancia de Supabase desde supabaseClient.js
import { supabase } from './supabaseClient.js';
import { calcularTotalesReceta } from '../utils/calculos_ingredientes.js';

// Espera a que el DOM esté completamente cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', async () => {
  // Variables para almacenar los datos de ingredientes y recetas
  let ingredientes = []; // Esta variable almacenará los ingredientes_base
  let recetas = [];

  // Referencias a los elementos del DOM
  const listaIngredientes = document.getElementById('lista-ingredientes');
  const listaRecetas = document.getElementById('lista-recetas');
  const porPagina = 10; // Número de ingredientes a mostrar por página
  let paginaActual = 1; // Página actual de ingredientes

  // Elementos del modal de edición de recetas
  const modal = document.getElementById('modal-editar-receta');
  const formEditar = document.getElementById('form-editar-receta');
  const inputId = document.getElementById('edit-receta-id');
  const inputNombre = document.getElementById('edit-receta-nombre');
  const inputInstrucciones = document.getElementById('edit-receta-instrucciones');
  const listaIngredientesReceta = document.getElementById('ingredientes-receta-lista');
  const selectNuevoIngrediente = document.getElementById('nuevo-ingrediente-id');
  const inputCantidadNuevo = document.getElementById('nuevo-ingrediente-cantidad');
  const selectUnidadNuevo = document.getElementById('nuevo-ingrediente-unidad');
  const btnAgregarIngrediente = document.getElementById('btn-agregar-ingrediente');
  const btnCancelar = document.getElementById('cancelar-editar-receta');
  const btnPrevIngredientes = document.getElementById('prev-ingredientes');
  const btnNextIngredientes = document.getElementById('next-ingredientes');

  // Elementos para mostrar los totales en el modal de edición
  const totalPrecioSpan = document.getElementById('total-precio');
  const totalCaloriasSpan = document.getElementById('total-calorias');
  const totalProteinasSpan = document.getElementById('total-proteinas');

  // Referencias al modal de edición de ingredientes
  const modalEditarIngrediente = document.getElementById('modal-editar-ingrediente');
  const formEditarIngrediente = document.getElementById('form-editar-ingrediente');
  const inputIngId = document.getElementById('edit-ingrediente-id');
  const inputIngNombre = document.getElementById('edit-ingrediente-nombre');
  const inputIngCantidad = document.getElementById('edit-ingrediente-cantidad');
  const inputIngUnidad = document.getElementById('edit-ingrediente-unidad');
  const inputIngCalorias = document.getElementById('edit-ingrediente-calorias');
  const inputIngProteinas = document.getElementById('edit-ingrediente-proteinas');

  const inputIngPrecio = document.getElementById('edit-ingrediente-precio');

  // Buscadores
  const buscadorIngredientes = document.getElementById('buscador-ingredientes');
  const buscadorRecetas = document.getElementById('buscador-recetas');

  let recetaActual = null; // Almacena la receta que se está editando
  let ingredientesReceta = []; // Almacena los ingredientes de la receta actual en el modal

  // --- Funciones de Utilidad para Modales Personalizados ---
  function showCustomModal(message, type = 'alert', onConfirm = null) {
    const customModal = document.getElementById('customModal');
    const customModalMessage = document.getElementById('customModalMessage');
    const customModalConfirmBtn = document.getElementById('customModalConfirmBtn');
    const customModalCancelBtn = document.getElementById('customModalCancelBtn');

    if (customModal) {
      customModalMessage.textContent = message;

      if (type === 'confirm') {
        customModalConfirmBtn.classList.remove('hidden');
        customModalCancelBtn.classList.remove('hidden');
        customModalConfirmBtn.onclick = () => {
          customModal.classList.add('hidden');
          if (onConfirm) onConfirm(true);
        };
        customModalCancelBtn.onclick = () => {
          customModal.classList.add('hidden');
          if (onConfirm) onConfirm(false);
        };
      } else { // type === 'alert'
        customModalConfirmBtn.classList.add('hidden');
        customModalCancelBtn.classList.add('hidden');
        // For alerts, the modal will just close when the user clicks outside or on a close button
      }
      customModal.classList.remove('hidden');
    }
  }

  // Event listener para cerrar el modal personalizado al hacer clic fuera
  const customModalElement = document.getElementById('customModal');
  if (customModalElement) {
    customModalElement.addEventListener('click', (e) => {
      if (e.target.id === 'customModal') {
        e.target.classList.add('hidden');
      }
    });
  }


  // --- Funciones de Carga y Visualización ---

  /**
   * Carga los ingredientes desde Supabase y los muestra en la interfaz.
   * Se ha modificado para seleccionar directamente los campos necesarios
   * y evitar el join implícito que causaba el error de relación ambigua.
   */
  async function cargarIngredientes() {
    const { data, error } = await supabase
      .from('ingredientes_base')
      .select('*');

    if (error) {
      console.error('Error cargando ingredientes base:', error);
      return;
    }

    ingredientes = data.map(ing => ({
      id: ing.id,
      description: ing.nombre || ing.description,
      calorias: ing.calorias,
      proteinas: ing.proteinas,
      precio: ing.precio,
      unidad: ing.unidad,
      cantidad: ing.cantidad,
      supermercado: ing.supermercado
    }));

    console.log('Ingredientes cargados:', ingredientes);
    mostrarIngredientes();
  }

  if (buscadorIngredientes) {
    buscadorIngredientes.addEventListener('input', (e) => {
      const filtro = e.target.value.toLowerCase();
      const filtrados = ingredientes.filter(ing =>
        ing.description?.toLowerCase().includes(filtro)
      );
      mostrarIngredientes(filtrados);
    });
  }


  /**
   * Muestra los ingredientes paginados en la sección de ingredientes.
   */
  function mostrarIngredientes(lista = ingredientes) {
    if (!listaIngredientes) {
      console.warn('Elemento listaIngredientes no encontrado.');
      return;
    }
    listaIngredientes.innerHTML = ''; // Limpia la lista actual
    const inicio = (paginaActual - 1) * porPagina;
    const fin = inicio + porPagina;
    const paginados = lista.slice(inicio, fin);

    paginados.forEach(ing => {
      const div = document.createElement('div');
      div.className = 'bg-white p-3 rounded-xl shadow-md w-full';

      div.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <strong class="text-lg font-semibold text-gray-800">${ing.description}</strong>
          <div class="flex gap-2">
            <button class="editar-ingrediente bg-blue-600 text-white hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${ing.id}">
              <i class="fas fa-edit text-sm"></i>
            </button>
            <button class="eliminar-ingrediente bg-red-600 text-white hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${ing.id}">
              <i class="fas fa-trash-alt text-sm"></i>
            </button>
          </div>
        </div>
        <p class="text-sm text-gray-600">${ing.calorias ?? 'null'} kcal, ${ing.proteinas ?? 'null'}g prot, ${ing.precio ?? 'null'} €</p>
      `;

      listaIngredientes.appendChild(div);
    });

    // Habilita/deshabilita los botones de paginación
    if (btnPrevIngredientes) btnPrevIngredientes.disabled = paginaActual === 1;
    if (btnNextIngredientes) btnNextIngredientes.disabled = fin >= ingredientes.length;
  }

  /**
   * Carga las recetas desde Supabase y las muestra en la interfaz.
   * Incluye los ingredientes asociados a cada receta.
   */
  async function cargarRecetas() {
    // Selecciona todas las recetas
    const { data, error } = await supabase.from('recetas').select('*');
    if (error) {
      console.error('Error cargando recetas:', error);
      return;
    }
    recetas = data;
    await mostrarRecetas(); // Llama a mostrarRecetas después de cargar
  }

  if (buscadorRecetas) {
    buscadorRecetas.addEventListener('input', async (e) => {
      const filtro = e.target.value.toLowerCase();
      const recetasFiltradas = recetas.filter(rec => rec.nombre?.toLowerCase().includes(filtro));
      await mostrarRecetasFiltradas(recetasFiltradas);
    });
  }


  async function mostrarRecetasFiltradas(filtradas) {
    if (!listaRecetas) {
      console.warn('Elemento listaRecetas no encontrado.');
      return;
    }
    listaRecetas.innerHTML = '';

    for (const rec of filtradas) {
      // AÑADIDO: Obtener los ingredientes de la receta para calcular los totales en tiempo real
      const { data: ingReceta, error: ingRecetaError } = await supabase
        .from('ingredientes_receta')
        .select('*, ingrediente:ingrediente_id (id, description)')
        .eq('receta_id', rec.id);

      if (ingRecetaError) {
        console.error(`Error cargando ingredientes para receta ${rec.id}:`, ingRecetaError);
        continue;
      }

      // AÑADIDO: Calcular los totales para la visualización
      // Asegúrate de que 'ingredientes' (la lista global de ingredientes_base) esté disponible.
      const { totalPrecio, totalCalorias, totalProteinas } = calcularTotalesReceta(ingReceta, ingredientes);


      const ingredientesHTML = (ingReceta ?? []).map(ing => {
        const cantidad = ing.cantidad ?? '?';
        const unidad = ing.unidad ?? '';
        const nombre = ing.ingrediente?.description ?? 'Sin nombre';
        return `<li class="text-sm text-gray-700">${nombre}: ${cantidad} ${unidad}</li>`;
      }).join('');

      const div = document.createElement('div');
      div.className = 'bg-white p-4 rounded-xl shadow-md';
      div.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <strong class="text-lg font-semibold text-gray-800">${rec.nombre}</strong>
          <div class="flex flex-col items-end gap-2">
            <div class="flex gap-2">
              <button class="editar-receta bg-blue-600 text-white hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${rec.id}">
                <i class="fas fa-edit text-sm"></i>
              </button>
              <button class="eliminar-receta bg-red-600 text-white hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${rec.id}">
                <i class="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
            <div class="flex items-center gap-1 text-yellow-400 text-xl estrellas" data-id="${rec.id}">
              ${[1, 2, 3].map(n => `
                <i class="fas fa-star ${rec.puntuacion >= n ? 'text-yellow-400' : 'text-gray-300'} estrella" data-id="${rec.id}" data-valor="${n}" style="cursor:pointer"></i>
              `).join('')}
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-2">💰 ${totalPrecio.toFixed(2)} € — 🔥 ${Math.round(totalCalorias)} kcal — 🥚 ${Math.round(totalProteinas)} g</p>

        <details>
          <summary class="cursor-pointer text-gray-700 italic text-sm">Ver ingredientes e instrucciones</summary>
          <div class="mt-2 text-sm text-gray-700">
            <p><strong>Instrucciones:</strong> ${rec.instrucciones || 'Sin instrucciones.'}</p>
            <h5 class="text-md font-semibold mt-2 mb-1">Ingredientes:</h5>
            <ul class="list-disc list-inside space-y-0.5">
              ${ingredientesHTML || '<li>No hay ingredientes definidos.</li>'}
            </ul>
          </div>
        </details>
      `;
      listaRecetas.appendChild(div);
    }
  }

  /**
   * Muestra las recetas en la sección de recetas, incluyendo sus ingredientes con cantidades y unidades.
   */
  async function mostrarRecetas() {
    if (!listaRecetas) {
      console.warn('Elemento listaRecetas no encontrado.');
      return;
    }
    listaRecetas.innerHTML = ''; // Limpia la lista actual
    for (const rec of recetas) {
      // Obtiene los ingredientes para cada receta, incluyendo la descripción del ingrediente
      const { data: ingReceta, error: ingRecetaError } = await supabase
        .from('ingredientes_receta')
        .select('*, ingrediente:ingrediente_id (id, description)')
        .eq('receta_id', rec.id);

      if (ingRecetaError) {
        console.error(`Error cargando ingredientes para receta ${rec.id}:`, ingRecetaError);
        continue; // Continúa con la siguiente receta si hay un error
      }

      // AÑADIDO: Calcular los totales en tiempo real para la visualización
      // Asegúrate de que 'ingredientes' (la lista global de ingredientes_base) esté disponible.
      const { totalPrecio, totalCalorias, totalProteinas } = calcularTotalesReceta(ingReceta, ingredientes);


      // Genera el HTML para la lista de ingredientes de la receta
      const ingredientesHTML = (ingReceta ?? []).map(ing => {
        const cantidad = ing.cantidad ?? '?'; // Usa '?' si la cantidad es nula
        const unidad = ing.unidad ?? '';     // Usa cadena vacía si la unidad es nula
        const nombre = ing.ingrediente?.description ?? 'Sin nombre'; // Usa 'Sin nombre' si la descripción es nula
        return `<li class="text-sm text-gray-700">${nombre}: ${cantidad} ${unidad}</li>`;
      }).join('');

      const div = document.createElement('div');
      div.className = 'bg-white p-4 rounded-xl shadow-md'; // Clases de Tailwind
      div.innerHTML = `
        <div class="flex items-start justify-between mb-1">
          <strong class="text-lg font-semibold text-gray-800">${rec.nombre}</strong>
          <div class="flex flex-col items-end gap-2">
            <div class="flex gap-2">
              <button class="editar-receta bg-blue-600 text-white hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${rec.id}">
                <i class="fas fa-edit text-sm"></i>
              </button>
              <button class="eliminar-receta bg-red-600 text-white hover:bg-red-700 rounded-full w-8 h-8 flex items-center justify-center" data-id="${rec.id}">
                <i class="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
            <div class="flex items-center gap-1 text-yellow-400 text-xl estrellas" data-id="${rec.id}">
              ${[1, 2, 3].map(n => `
                <i class="fas fa-star ${rec.puntuacion >= n ? 'text-yellow-400' : 'text-gray-300'} estrella" data-id="${rec.id}" data-valor="${n}" style="cursor:pointer"></i>
              `).join('')}
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-2">💰 ${totalPrecio.toFixed(2)} € — 🔥 ${Math.round(totalCalorias)} kcal — 🥚 ${Math.round(totalProteinas)} g</p>

        <details>
          <summary class="cursor-pointer text-gray-700 italic text-sm">Ver ingredientes e instrucciones</summary>
          <div class="mt-2 text-sm text-gray-700">
            <p><strong>Instrucciones:</strong> ${rec.instrucciones || 'Sin instrucciones.'}</p>
            <h5 class="text-md font-semibold mt-2 mb-1">Ingredientes:</h5>
            <ul class="list-disc list-inside space-y-0.5">
              ${ingredientesHTML || '<li>No hay ingredientes definidos.</li>'}
            </ul>
          </div>
        </details>
      `;
      listaRecetas.appendChild(div);
    }
  }

  // --- Lógica del Modal de Edición de Recetas ---

  /**
   * Muestra los ingredientes de la receta actual en el formulario del modal.
   * Incluye campos editables para cantidad y unidad.
   */
  function mostrarIngredientesEnFormulario() {
    if (!listaIngredientesReceta) {
      console.warn('Elemento listaIngredientesReceta no encontrado.');
      return;
    }
    listaIngredientesReceta.innerHTML = ''; // Limpia la lista actual
    const unidadesComunes = ['g', 'ml', 'ud', 'kg', 'l', 'cucharada', 'pellizco']; // Unidades comunes

    ingredientesReceta.forEach((ing, i) => {
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2 p-2 bg-gray-50 rounded-md';
      div.innerHTML = `
        <input type="text" value="${ing.ingrediente?.description || 'Sin nombre'}" disabled class="flex-1 border p-2 rounded bg-gray-100 text-gray-700" />
        <input type="number" step="0.1" value="${ing.cantidad ?? ''}" data-index="${i}" class="cantidad-edit w-24 border p-2 rounded text-gray-800" />
        <select data-index="${i}" class="unidad-edit w-28 border p-2 rounded text-gray-800">
          ${unidadesComunes.map(u => `<option value="${u}" ${ing.unidad === u ? 'selected' : ''}>${u}</option>`).join('')}
          ${!unidadesComunes.includes(ing.unidad) && ing.unidad ? `<option value="${ing.unidad}" selected>${ing.unidad}</option>` : ''}
        </select>
        <button type="button" data-index="${i}" class="eliminar-ing text-red-600 hover:text-red-800">Eliminar</button>
      `;
      listaIngredientesReceta.appendChild(div);
    });
    actualizarTotalesReceta(); // Llama a actualizar totales después de renderizar los ingredientes
  }

  /**
   * Carga las opciones de ingredientes para el select "Añadir nuevo ingrediente" en el modal.
   */
  async function cargarOpcionesIngredientes() {
    if (!selectNuevoIngrediente) {
      console.warn('Elemento selectNuevoIngrediente no encontrado.');
      return;
    }
    selectNuevoIngrediente.innerHTML = ''; // Limpia las opciones actuales
    ingredientes.forEach(ing => {
      const option = document.createElement('option');
      option.value = ing.id;
      option.textContent = ing.description;
      selectNuevoIngrediente.appendChild(option);
    });
  }

  // --- Event Listeners ---

  // Evento para los botones de paginación de ingredientes
  if (btnPrevIngredientes) {
    btnPrevIngredientes.addEventListener('click', () => {
      if (paginaActual > 1) {
        paginaActual--;
        mostrarIngredientes();
      }
    });
  }


  if (btnNextIngredientes) {
    btnNextIngredientes.addEventListener('click', () => {
      const totalPaginas = Math.ceil(ingredientes.length / porPagina);
      if (paginaActual < totalPaginas) {
        paginaActual++;
        mostrarIngredientes();
      }
    });
  }


  // Delegación de eventos para los botones de editar/eliminar receta e ingrediente
  document.addEventListener('click', async (e) => {
    // Editar Receta
    const editRecetaBtn = e.target.closest('.editar-receta');
    if (editRecetaBtn) {
      console.log('Clic en botón editar receta detectado.');
      const id = editRecetaBtn.dataset.id;
      console.log('ID de receta a editar:', id);

      // Carga la receta y sus ingredientes desde Supabase
      const { data: receta, error: recetaError } = await supabase.from('recetas').select('*').eq('id', id).single();
      const { data: ingReceta, error: ingRecetaError } = await supabase
        .from('ingredientes_receta')
        .select('*, ingrediente:ingrediente_id (id, description)')
        .eq('receta_id', id);

      if (recetaError) {
        console.error('Error cargando receta para edición:', recetaError);
        showCustomModal('Error al cargar la receta para edición.');
        return;
      }
      if (ingRecetaError) {
        console.error('Error cargando ingredientes de receta para edición:', ingRecetaError);
        showCustomModal('Error al cargar los ingredientes de la receta para edición.');
        return;
      }

      recetaActual = receta;
      if (inputId) inputId.value = receta.id;
      if (inputNombre) inputNombre.value = receta.nombre;
      if (inputInstrucciones) inputInstrucciones.value = receta.instrucciones || '';
      ingredientesReceta = ingReceta || [];

      await cargarOpcionesIngredientes();
      mostrarIngredientesEnFormulario();

      if (modal) {
        modal.classList.remove('hidden'); // Muestra el modal
        console.log('Modal de edición de receta mostrado.');
      } else {
        console.warn('Elemento modal-editar-receta no encontrado.');
      }
    }

    // Eliminar Receta
    const deleteRecetaBtn = e.target.closest('.eliminar-receta');
    if (deleteRecetaBtn) {
      console.log('Clic en botón eliminar receta detectado.');
      const id = deleteRecetaBtn.dataset.id;
      showCustomModal('¿Estás seguro de que quieres eliminar esta receta?', 'confirm', async (confirmed) => {
        if (confirmed) {
          const { error } = await supabase.from('recetas').delete().eq('id', id);
          if (error) {
            console.error('Error eliminando receta:', error);
            showCustomModal('Error al eliminar la receta.');
          } else {
            await cargarRecetas(); // Recarga las recetas después de eliminar
          }
        }
      });
    }

    // Editar Ingrediente
    const editIngredienteBtn = e.target.closest('.editar-ingrediente');
    if (editIngredienteBtn) {
      console.log('Clic en botón editar ingrediente detectado.');
      const id = editIngredienteBtn.dataset.id;
      const ingrediente = ingredientes.find(i => i.id == id);
      if (!ingrediente) {
        console.warn('Ingrediente no encontrado para el ID:', id);
        return;
      }

      // Rellenar campos del modal de edición de ingredientes
      if (inputIngId) inputIngId.value = ingrediente.id;
      if (inputIngNombre) inputIngNombre.value = ingrediente.description || '';
      if (inputIngCantidad) inputIngCantidad.value = ingrediente.cantidad ?? '';
      if (inputIngUnidad) inputIngUnidad.value = ingrediente.unidad ?? '';
      if (inputIngCalorias) inputIngCalorias.value = ingrediente.calorias ?? '';
      if (inputIngProteinas) inputIngProteinas.value = ingrediente.proteinas ?? '';
      if (inputIngPrecio) inputIngPrecio.value = ingrediente.precio ?? '';

      if (modalEditarIngrediente) {
        modalEditarIngrediente.classList.remove('hidden');
        console.log('Modal de edición de ingrediente mostrado.');
      } else {
        console.warn('Elemento modal-editar-ingrediente no encontrado.');
      }
    }

    // Eliminar Ingrediente
    const deleteIngredienteBtn = e.target.closest('.eliminar-ingrediente');
    if (deleteIngredienteBtn) {
      console.log('Clic en botón eliminar ingrediente detectado.');
      const id = deleteIngredienteBtn.dataset.id;
      showCustomModal('¿Estás seguro de que quieres eliminar este ingrediente?', 'confirm', async (confirmed) => {
        if (confirmed) {
          const { error } = await supabase.from('ingredientes_base').delete().eq('id', id); // Changed to ingredientes_base
          if (error) {
            console.error('Error eliminando ingrediente:', error);
            showCustomModal('Error al eliminar el ingrediente.');
          } else {
            await cargarIngredientes(); // Recarga los ingredientes después de eliminar
          }
        }
      });
    }
  });

  // Botón Cancelar del modal de edición de receta
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden'); // Oculta el modal
    });
  }


  // Botón Cancelar del modal de edición de ingrediente
  const cancelarEditarIngredienteBtn = document.getElementById('cancelar-editar-ingrediente');
  if (cancelarEditarIngredienteBtn) {
    cancelarEditarIngredienteBtn.addEventListener('click', () => {
      if (modalEditarIngrediente) modalEditarIngrediente.classList.add('hidden');
    });
  }


  // Guardar los cambios del ingrediente
  if (formEditarIngrediente) {
    formEditarIngrediente.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = inputIngId.value;
      const { error } = await supabase
        .from('ingredientes_base')
        .update({
          nombre: inputIngNombre.value,
          cantidad: parseFloat(inputIngCantidad.value),
          unidad: inputIngUnidad.value,
          calorias: parseFloat(inputIngCalorias.value),
          proteinas: parseFloat(inputIngProteinas.value),
          precio: parseFloat(inputIngPrecio.value),
        })
        .eq('id', id);

      if (error) {
        showCustomModal('Error al actualizar el ingrediente');
        console.error(error);
      } else {
        if (modalEditarIngrediente) modalEditarIngrediente.classList.add('hidden');
        await cargarIngredientes(); // Recargar ingredientes
      }
    });
  }


  // Botón Añadir Ingrediente en el modal de receta
  if (btnAgregarIngrediente) {
    btnAgregarIngrediente.addEventListener('click', () => {
      const id = selectNuevoIngrediente.value;
      const desc = selectNuevoIngrediente.options[selectNuevoIngrediente.selectedIndex].text;
      const cantidad = parseFloat(inputCantidadNuevo.value);
      const unidad = selectUnidadNuevo.value; // Obtiene el valor del select de unidad

      if (!id || isNaN(cantidad) || !unidad) {
        showCustomModal('Por favor, selecciona un ingrediente, introduce una cantidad y una unidad válida.');
        return;
      }

      // Añade el nuevo ingrediente a la lista temporal de ingredientes de la receta
      ingredientesReceta.push({
        ingrediente_id: id,
        cantidad,
        unidad,
        ingrediente: { description: desc }, // Añade la descripción para mostrarla inmediatamente
        nuevo: true, // Marca como nuevo para futuras operaciones de guardado
      });

      mostrarIngredientesEnFormulario(); // Actualiza la lista en el formulario
      if (inputCantidadNuevo) inputCantidadNuevo.value = ''; // Limpia el campo de cantidad
      if (selectNuevoIngrediente) selectNuevoIngrediente.value = ''; // Limpia el select de ingrediente
      if (selectUnidadNuevo) selectUnidadNuevo.value = 'g'; // Restablece la unidad por defecto
    });
  }


  // Evento para actualizar cantidad y unidad de ingredientes existentes en el modal
  if (listaIngredientesReceta) {
    listaIngredientesReceta.addEventListener('input', (e) => {
      const index = e.target.dataset.index;
      if (e.target.classList.contains('cantidad-edit')) {
        ingredientesReceta[index].cantidad = parseFloat(e.target.value);
      } else if (e.target.classList.contains('unidad-edit')) {
        ingredientesReceta[index].unidad = e.target.value;
      }
      actualizarTotalesReceta(); // Llama a actualizar totales con cada cambio
    });
  }


  // Evento para eliminar un ingrediente de la lista temporal en el modal
  if (listaIngredientesReceta) {
    listaIngredientesReceta.addEventListener('click', (e) => {
      if (e.target.classList.contains('eliminar-ing')) {
        const index = e.target.dataset.index;
        ingredientesReceta.splice(index, 1); // Elimina el ingrediente del array
        mostrarIngredientesEnFormulario(); // Actualiza la lista en el formulario y recalcula totales
      }
    });
  }


  // Envío del formulario de edición de receta
  if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
      e.preventDefault(); // Previene el envío por defecto del formulario

      const id = inputId.value;
      const nombre = inputNombre.value;
      const instrucciones = inputInstrucciones.value;

      // Elimina todos los ingredientes_receta existentes para esta receta
      const { error: deleteIngredientesError } = await supabase.from('ingredientes_receta').delete().eq('receta_id', id);
      if (deleteIngredientesError) {
        console.error('Error al eliminar ingredientes de la receta:', deleteIngredientesError);
        showCustomModal('Error al eliminar ingredientes de la receta.');
        return;
      }

      // Inserta los ingredientes actualizados (incluyendo los nuevos y los modificados)
      for (const ing of ingredientesReceta) {
        const { error: insertIngredienteError } = await supabase.from('ingredientes_receta').insert({
          receta_id: id,
          ingrediente_id: ing.ingrediente_id,
          cantidad: ing.cantidad,
          unidad: ing.unidad,
        });
        if (insertIngredienteError) {
          console.error('Error al insertar ingrediente de receta:', insertIngredienteError);
          showCustomModal('Error al insertar ingrediente de receta.');
        }
      }

      // Calcula los nuevos totales de la receta antes de actualizarla en la base de datos
      const { totalPrecio, totalCalorias, totalProteinas } = calcularTotalesReceta(ingredientesReceta, ingredientes);

      // Actualiza la tabla 'recetas' con los nuevos valores de nombre, instrucciones y totales
      const { error: updateRecetaError } = await supabase.from('recetas').update({
        nombre: nombre,
        instrucciones: instrucciones,
        total_precio: totalPrecio,
        total_calorias: totalCalorias,
        total_proteinas: totalProteinas
      }).eq('id', id);

      if (updateRecetaError) {
        console.error('Error al actualizar la receta:', updateRecetaError);
        showCustomModal('Error al actualizar la receta.');
        return;
      }

      if (modal) modal.classList.add('hidden'); // Oculta el modal
      await cargarRecetas(); // Recarga las recetas para mostrar los cambios
    });
  }


  // --- Inicialización ---
  // Carga inicial de ingredientes y recetas al cargar la página
  await cargarIngredientes(); // Carga los ingredientes_base
  await cargarRecetas(); // Carga las recetas y las muestra

  /**
   * Calcula y muestra los totales de precio, calorías y proteínas de los ingredientes de la receta actual.
   * Esta función se usa en el modal de edición.
   */
  function actualizarTotalesReceta() {
    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      console.warn('No se han cargado ingredientes base. Reintentando...');
      cargarIngredientes().then(() => {
        if (ingredientes.length > 0) {
          actualizarTotalesReceta();
        }
      });
      return;
    }

    const { totalPrecio, totalCalorias, totalProteinas } =
      calcularTotalesReceta(ingredientesReceta, ingredientes);

    if (totalPrecioSpan) totalPrecioSpan.textContent = `${totalPrecio.toFixed(2)} €`;
    if (totalCaloriasSpan) totalCaloriasSpan.textContent = `${Math.round(totalCalorias)} kcal`;
    if (totalProteinasSpan) totalProteinasSpan.textContent = `${Math.round(totalProteinas)} g`;
  }

  // Se puede llamar a esta función desde la consola del navegador si se necesita actualizar totales de recetas existentes
  // window.actualizarTotalesDeTodasLasRecetas = async function() { ... }
  // --- Estrellas para puntuación ---
document.addEventListener('click', async (e) => {
  const estrella = e.target.closest('.estrella');
  if (estrella) {
    const recetaId = estrella.dataset.id;
    const valor = parseInt(estrella.dataset.valor);

    // Actualiza en Supabase
    const { error } = await supabase
      .from('recetas')
      .update({ puntuacion: valor })
      .eq('id', recetaId);

   if (error) {
  console.error('Error actualizando puntuación:', error);
  showCustomModal('Error al guardar la puntuación.');
} else {
  // Actualiza visualmente las estrellas sin recargar
  const estrellas = document.querySelectorAll(`.estrellas[data-id="${recetaId}"] .estrella`);
  estrellas.forEach((estrellaEl) => {
    const val = parseInt(estrellaEl.dataset.valor);
    estrellaEl.classList.remove('text-yellow-400', 'text-gray-300');
    estrellaEl.classList.add(val <= valor ? 'text-yellow-400' : 'text-gray-300');
  });
}

  }
});

});

// Custom Modal HTML (add this to your main HTML file, e.g., index.html)
/*
<div id="customModal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
    <p id="customModalMessage" class="text-lg text-gray-800 mb-4"></p>
    <div class="flex justify-end space-x-3">
      <button id="customModalCancelBtn" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 hidden">Cancelar</button>
      <button id="customModalConfirmBtn" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden">Aceptar</button>
    </div>
  </div>
</div>
*/
