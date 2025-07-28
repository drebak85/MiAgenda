import { supabase } from './supabaseClient.js';
import { calcularTotalesReceta } from '../utils/calculos_ingredientes.js';




// Escucha el evento DOMContentLoaded para garantizar que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {


  const contenedor = document.getElementById('comida-container');
  if (!contenedor) return;

  const tipos = ['Desayuno', 'Comida', 'Cena'];
  let tipoActual = calcularTipoComida();

  // Función para calcular el tipo de comida de acuerdo con la hora actual
  function calcularTipoComida() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Desayuno';
    else if (hora < 18) return 'Comida';
    return 'Cena';
  }

  // Función para cambiar el tipo de comida (anterior/próximo)
  function cambiarTipo(direccion) {
    let idx = tipos.indexOf(tipoActual);
    idx = (idx + direccion + tipos.length) % tipos.length; // Garantiza que el índice esté dentro del intervalo
    tipoActual = tipos[idx];
    cargarComidaDelDia(); // Recarga la comida con el nuevo tipo
  }

  // Función asíncrona para cargar la comida del día
  async function cargarComidaDelDia() {
    const hoy = new Date().toISOString().split('T')[0];

    // Consulta las recetas y sus ingredientes para el día y tipo actual
    const { data, error } = await supabase
      .from('comidas_dia')
      .select(`
        id, is_completed, tipo, receta_id,
        recetas (
          nombre,
          ingredientes_receta (
            cantidad, unidad, ingrediente_id
          )
        )
      `)
      .eq('fecha', hoy)
      .eq('tipo', tipoActual);

    contenedor.innerHTML = ''; // Limpia el contenedor antes de añadir nuevos elementos

    // Crea el slider de navegación para los tipos de comida
    const slider = document.createElement('div');
    slider.classList.add('comida-tipo-header');
    slider.innerHTML = `
      <button class="flecha-roja" id="comida-prev">⬅</button>
      <span class="titulo-comida">🍽️ ${tipoActual} del día</span>
      <button class="flecha-roja" id="comida-next">➡</button>
    `;
    contenedor.appendChild(slider);

    // Asigna eventos a los botones del slider
    document.getElementById('comida-prev').onclick = () => cambiarTipo(-1);
    document.getElementById('comida-next').onclick = () => cambiarTipo(1);

    if (error) {
      console.error('Error al cargar comida:', error.message);
      contenedor.innerHTML += `<p>Error al cargar datos de Supabase</p>`;
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML += `<p>No hay ${tipoActual.toLowerCase()} planeado para hoy.</p>`;
      return;
    }

    const comida = data[0]; // Tomamos la primera comida encontrada para el tipo actual
    const receta = comida.recetas;

    // Obtener los IDs de ingredientes de la receta
    const idsIngredientes = receta.ingredientes_receta.map(ing => ing.ingrediente_id);
    let ingredientesMap = new Map();
    if (idsIngredientes.length > 0) {
      // Carga los datos base de los ingredientes
      const { data: ingData, error: ingError } = await supabase
        .from('ingredientes_base')
        .select('id, description, precio, cantidad, calorias, proteinas, unidad')
        .in('id', idsIngredientes);
      if (ingError) {
        console.error('Error al cargar ingredientes_base:', ingError);
      } else {
        ingData.forEach(ing => ingredientesMap.set(ing.id, ing));
      }
    }

    // Crear la tarjeta de la comida
    const card = document.createElement('div');
    card.classList.add('comida-card');

    const encabezado = document.createElement('div');
    encabezado.classList.add('comida-header');

    const nombre = document.createElement('h4');
    nombre.textContent = receta.nombre;
    


    // Botón para marcar como completado
    const toggle = document.createElement('button');
    toggle.classList.add('check-small');
    toggle.innerHTML = comida.is_completed ? '✅' : '⭕';
    toggle.onclick = async () => {
  const nuevoEstado = !comida.is_completed;

  if (nuevoEstado) {
    // Solo restar si estamos marcando como completado
    for (const ing of receta.ingredientes_receta) {
      const ingBase = ingredientesMap.get(ing.ingrediente_id);
      if (!ingBase) continue;

      const nombre = ingBase.description;
      const cantidadUsada = parseFloat(ing.cantidad);

      const { data: despensaItem, error } = await supabase
        .from('despensa')
        .select('id, cantidad')
        .eq('nombre', nombre)
        .maybeSingle();

      if (despensaItem) {
        const cantidadActual = parseFloat(despensaItem.cantidad) || 0;
        const nuevaCantidad = Math.max(cantidadActual - cantidadUsada, 0);

        await supabase
          .from('despensa')
          .update({ cantidad: nuevaCantidad })
          .eq('id', despensaItem.id);
      }
    }
  }

  // Actualizar el estado completado en comidas_dia
  await supabase
    .from('comidas_dia')
    .update({ is_completed: nuevoEstado })
    .eq('id', comida.id);

  cargarComidaDelDia(); // Refresca la vista
};

encabezado.appendChild(nombre);
encabezado.appendChild(toggle);  // <---- AQUÍ LO AÑADIMOS

    // Calcula y muestra los totales nutricionales y de precio
    const { totalCalorias: kcal, totalProteinas: prot, totalPrecio: precio } =
      calcularTotalesReceta(receta.ingredientes_receta, Array.from(ingredientesMap.values()));

    const detalles = document.createElement('p');
    detalles.innerHTML = `
      <strong>Precio:</strong> ${precio.toFixed(2)} € |
      <strong>Calorías:</strong> ${Math.round(kcal)} kcal |
      <strong>Proteínas:</strong> ${Math.round(prot)} g
    `;

    // Botón para mostrar/ocultar ingredientes
    const toggleIngredientes = document.createElement('button');
    toggleIngredientes.textContent = '🧾 Ver ingredientes';
    toggleIngredientes.classList.add('toggle-ingredientes');
    let visible = false;
    toggleIngredientes.onclick = () => {
      visible = !visible;
      lista.style.display = visible ? 'block' : 'none';
      toggleIngredientes.textContent = visible ? '🔽 Ocultar ingredientes' : '🧾 Ver ingredientes';
    };

    // Crear lista de ingredientes
const lista = document.createElement('ul');
lista.classList.add('ingredientes-lista');

receta.ingredientes_receta.forEach(ing => {
  const ingBase = ingredientesMap.get(ing.ingrediente_id);
  if (!ingBase) return;

  const li = document.createElement('li');
  li.textContent = `${ingBase.description}: ${ing.cantidad} ${ing.unidad}`;
  lista.appendChild(li);
});

lista.style.display = 'none'; // Oculta la lista de ingredientes por defecto

    card.append(encabezado, detalles, toggleIngredientes, lista);
    contenedor.appendChild(card);
  }

  cargarComidaDelDia(); // Carga la comida inicial al cargar la página
});

=======
import { supabase } from './supabaseClient.js';
import { calcularTotalesReceta } from '../utils/calculos_ingredientes.js';




// Escucha el evento DOMContentLoaded para garantizar que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {


  const contenedor = document.getElementById('comida-container');
  if (!contenedor) return;

  const tipos = ['Desayuno', 'Comida', 'Cena'];
  let tipoActual = calcularTipoComida();

  // Función para calcular el tipo de comida de acuerdo con la hora actual
  function calcularTipoComida() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Desayuno';
    else if (hora < 18) return 'Comida';
    return 'Cena';
  }

  // Función para cambiar el tipo de comida (anterior/próximo)
  function cambiarTipo(direccion) {
    let idx = tipos.indexOf(tipoActual);
    idx = (idx + direccion + tipos.length) % tipos.length; // Garantiza que el índice esté dentro del intervalo
    tipoActual = tipos[idx];
    cargarComidaDelDia(); // Recarga la comida con el nuevo tipo
  }

  // Función asíncrona para cargar la comida del día
  async function cargarComidaDelDia() {
    const hoy = new Date().toISOString().split('T')[0];

    // Consulta las recetas y sus ingredientes para el día y tipo actual
    const { data, error } = await supabase
      .from('comidas_dia')
      .select(`
        id, is_completed, tipo, receta_id,
        recetas (
          nombre,
          ingredientes_receta (
            cantidad, unidad, ingrediente_id
          )
        )
      `)
      .eq('fecha', hoy)
      .eq('tipo', tipoActual);

    contenedor.innerHTML = ''; // Limpia el contenedor antes de añadir nuevos elementos

    // Crea el slider de navegación para los tipos de comida
    const slider = document.createElement('div');
    slider.classList.add('comida-tipo-header');
    slider.innerHTML = `
      <button class="flecha-roja" id="comida-prev">⬅</button>
      <span class="titulo-comida">🍽️ ${tipoActual} del día</span>
      <button class="flecha-roja" id="comida-next">➡</button>
    `;
    contenedor.appendChild(slider);

    // Asigna eventos a los botones del slider
    document.getElementById('comida-prev').onclick = () => cambiarTipo(-1);
    document.getElementById('comida-next').onclick = () => cambiarTipo(1);

    if (error) {
      console.error('Error al cargar comida:', error.message);
      contenedor.innerHTML += `<p>Error al cargar datos de Supabase</p>`;
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML += `<p>No hay ${tipoActual.toLowerCase()} planeado para hoy.</p>`;
      return;
    }

    const comida = data[0]; // Tomamos la primera comida encontrada para el tipo actual
    const receta = comida.recetas;

    // Obtener los IDs de ingredientes de la receta
    const idsIngredientes = receta.ingredientes_receta.map(ing => ing.ingrediente_id);
    let ingredientesMap = new Map();
    if (idsIngredientes.length > 0) {
      // Carga los datos base de los ingredientes
      const { data: ingData, error: ingError } = await supabase
        .from('ingredientes_base')
        .select('id, description, precio, cantidad, calorias, proteinas, unidad')
        .in('id', idsIngredientes);
      if (ingError) {
        console.error('Error al cargar ingredientes_base:', ingError);
      } else {
        ingData.forEach(ing => ingredientesMap.set(ing.id, ing));
      }
    }

    // Crear la tarjeta de la comida
    const card = document.createElement('div');
    card.classList.add('comida-card');

    const encabezado = document.createElement('div');
    encabezado.classList.add('comida-header');

    const nombre = document.createElement('h4');
    nombre.textContent = receta.nombre;
    


    // Botón para marcar como completado
    const toggle = document.createElement('button');
    toggle.classList.add('check-small');
    toggle.innerHTML = comida.is_completed ? '✅' : '⭕';
    toggle.onclick = async () => {
  const nuevoEstado = !comida.is_completed;

  if (nuevoEstado) {
    // Solo restar si estamos marcando como completado
    for (const ing of receta.ingredientes_receta) {
      const ingBase = ingredientesMap.get(ing.ingrediente_id);
      if (!ingBase) continue;

      const nombre = ingBase.description;
      const cantidadUsada = parseFloat(ing.cantidad);

      const { data: despensaItem, error } = await supabase
        .from('despensa')
        .select('id, cantidad')
        .eq('nombre', nombre)
        .maybeSingle();

      if (despensaItem) {
        const cantidadActual = parseFloat(despensaItem.cantidad) || 0;
        const nuevaCantidad = Math.max(cantidadActual - cantidadUsada, 0);

        await supabase
          .from('despensa')
          .update({ cantidad: nuevaCantidad })
          .eq('id', despensaItem.id);
      }
    }
  }

  // Actualizar el estado completado en comidas_dia
  await supabase
    .from('comidas_dia')
    .update({ is_completed: nuevoEstado })
    .eq('id', comida.id);

  cargarComidaDelDia(); // Refresca la vista
};

encabezado.appendChild(nombre);
encabezado.appendChild(toggle);  // <---- AQUÍ LO AÑADIMOS

    // Calcula y muestra los totales nutricionales y de precio
    const { totalCalorias: kcal, totalProteinas: prot, totalPrecio: precio } =
      calcularTotalesReceta(receta.ingredientes_receta, Array.from(ingredientesMap.values()));

    const detalles = document.createElement('p');
    detalles.innerHTML = `
      <strong>Precio:</strong> ${precio.toFixed(2)} € |
      <strong>Calorías:</strong> ${Math.round(kcal)} kcal |
      <strong>Proteínas:</strong> ${Math.round(prot)} g
    `;

    // Botón para mostrar/ocultar ingredientes
    const toggleIngredientes = document.createElement('button');
    toggleIngredientes.textContent = '🧾 Ver ingredientes';
    toggleIngredientes.classList.add('toggle-ingredientes');
    let visible = false;
    toggleIngredientes.onclick = () => {
      visible = !visible;
      lista.style.display = visible ? 'block' : 'none';
      toggleIngredientes.textContent = visible ? '🔽 Ocultar ingredientes' : '🧾 Ver ingredientes';
    };

    // Crear lista de ingredientes
const lista = document.createElement('ul');
lista.classList.add('ingredientes-lista');

receta.ingredientes_receta.forEach(ing => {
  const ingBase = ingredientesMap.get(ing.ingrediente_id);
  if (!ingBase) return;

  const li = document.createElement('li');
  li.textContent = `${ingBase.description}: ${ing.cantidad} ${ing.unidad}`;
  lista.appendChild(li);
});

lista.style.display = 'none'; // Oculta la lista de ingredientes por defecto

    card.append(encabezado, detalles, toggleIngredientes, lista);
    contenedor.appendChild(card);
  }

  cargarComidaDelDia(); // Carga la comida inicial al cargar la página
});

