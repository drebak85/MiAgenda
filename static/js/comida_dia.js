import { supabase } from './supabaseClient.js';
import { calcularTotalesReceta } from '../utils/calculos_ingredientes.js';


document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('comida-container');
  if (!contenedor) return;

  const tipos = ['Desayuno', 'Comida', 'Cena'];
  let tipoActual = calcularTipoComida();

  function calcularTipoComida() {
    const hora = new Date().getHours();
    if (hora < 12) return 'Desayuno';
    else if (hora < 18) return 'Comida';
    return 'Cena';
  }

  function cambiarTipo(direccion) {
    let idx = tipos.indexOf(tipoActual);
    idx = (idx + direccion + tipos.length) % tipos.length;
    tipoActual = tipos[idx];
    cargarComidaDelDia();
  }

  async function cargarComidaDelDia() {
    const hoy = new Date().toISOString().split('T')[0];

    // Consulta solo recetas + ingredientes_receta (sin intentar join a ingredientes_base)
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

    contenedor.innerHTML = '';

    // Slider de navegación
    const slider = document.createElement('div');
    slider.classList.add('comida-tipo-header');
    slider.innerHTML = `
      <button class="flecha-roja" id="comida-prev">⬅</button>
      <span class="titulo-comida">🍽️ ${tipoActual} del día</span>
      <button class="flecha-roja" id="comida-next">➡</button>
    `;
    contenedor.appendChild(slider);

    document.getElementById('comida-prev').onclick = () => cambiarTipo(-1);
    document.getElementById('comida-next').onclick = () => cambiarTipo(1);

    if (error) {
      console.error('Error cargando comida:', error.message);
      contenedor.innerHTML += `<p>Error cargando datos de Supabase</p>`;
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML += `<p>No hay ${tipoActual.toLowerCase()} planificado para hoy.</p>`;
      return;
    }

    const comida = data[0];
    const receta = comida.recetas;

    // Obtener los IDs de ingredientes
    const idsIngredientes = receta.ingredientes_receta.map(ing => ing.ingrediente_id);
    let ingredientesMap = new Map();
    if (idsIngredientes.length > 0) {
      const { data: ingData, error: ingError } = await supabase
        .from('ingredientes_base')
        .select('id, description, precio, cantidad, calorias, proteinas, unidad')
        .in('id', idsIngredientes);
      if (ingError) {
        console.error('Error cargando ingredientes_base:', ingError);
      } else {
        ingData.forEach(ing => ingredientesMap.set(ing.id, ing));
      }
    }

    // Crear tarjeta
    const card = document.createElement('div');
    card.classList.add('comida-card');

    const encabezado = document.createElement('div');
    encabezado.classList.add('comida-header');

    const nombre = document.createElement('h4');
    nombre.textContent = receta.nombre;

    const toggle = document.createElement('button');
    toggle.classList.add('check-small');
    toggle.innerHTML = comida.is_completed ? '✅' : '⭕';
    toggle.onclick = async () => {
      await supabase
        .from('comidas_dia')
        .update({ is_completed: !comida.is_completed })
        .eq('id', comida.id);
      cargarComidaDelDia();
    };

    encabezado.append(nombre, toggle);

    let totalCalorias = 0, totalPrecio = 0, totalProteinas = 0;
const lista = document.createElement('ul');
lista.classList.add('lista-ingredientes');

receta.ingredientes_receta.forEach(ing => {
  const ingBase = ingredientesMap.get(ing.ingrediente_id);
  const cantidad = parseFloat(ing.cantidad);
  const unidad = ing.unidad;
  const li = document.createElement('li');

  if (ingBase) {
    li.textContent = `${cantidad} ${unidad} de ${ingBase.description}`;
  } else {
    li.textContent = `${cantidad} ${unidad} (ingrediente #${ing.ingrediente_id} no encontrado)`;
  }

  lista.appendChild(li);
});

// Usamos la función centralizada
const { totalCalorias: kcal, totalProteinas: prot, totalPrecio: precio } =
  calcularTotalesReceta(receta.ingredientes_receta, Array.from(ingredientesMap.values()));

totalCalorias = kcal;
totalProteinas = prot;
totalPrecio = precio;


    const detalles = document.createElement('p');
    detalles.innerHTML = `
      <strong>Precio:</strong> ${totalPrecio.toFixed(2)} € |
      <strong>Calorías:</strong> ${Math.round(totalCalorias)} kcal |
      <strong>Proteínas:</strong> ${Math.round(totalProteinas)} g
    `;

    const toggleIngredientes = document.createElement('button');
    toggleIngredientes.textContent = '🧾 Ver ingredientes';
    toggleIngredientes.classList.add('toggle-ingredientes');
    let visible = false;
    toggleIngredientes.onclick = () => {
      visible = !visible;
      lista.style.display = visible ? 'block' : 'none';
      toggleIngredientes.textContent = visible ? '🔽 Ocultar ingredientes' : '🧾 Ver ingredientes';
    };

    lista.style.display = 'none';
    card.append(encabezado, detalles, toggleIngredientes, lista);
    contenedor.appendChild(card);
  }

  cargarComidaDelDia();
});
