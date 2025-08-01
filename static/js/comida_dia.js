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
      console.error('Error al cargar comida:', error.message);
      contenedor.innerHTML += `<p>Error al cargar datos de Supabase</p>`;
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML += `<p>No hay ${tipoActual.toLowerCase()} planeado para hoy.</p>`;
      return;
    }

    for (const comida of data) {
      const receta = comida.recetas;
      const idsIngredientes = receta.ingredientes_receta.map(ing => ing.ingrediente_id);
      let ingredientesMap = new Map();

      if (idsIngredientes.length > 0) {
        const { data: ingData } = await supabase
          .from('ingredientes_base')
          .select('id, description, precio, cantidad, calorias, proteinas, unidad')
          .in('id', idsIngredientes);

        ingData.forEach(ing => ingredientesMap.set(ing.id, ing));
      }

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
        const nuevoEstado = !comida.is_completed;

        if (nuevoEstado) {
          for (const ing of receta.ingredientes_receta) {
            const ingBase = ingredientesMap.get(ing.ingrediente_id);
            if (!ingBase) continue;

            const nombre = ingBase.description;
            const cantidadUsada = parseFloat(ing.cantidad);

            const { data: despensaItem } = await supabase
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

        await supabase
          .from('comidas_dia')
          .update({ is_completed: nuevoEstado })
          .eq('id', comida.id);

        cargarComidaDelDia();
      };

      encabezado.appendChild(nombre);
      encabezado.appendChild(toggle);

      const { totalCalorias: kcal, totalProteinas: prot, totalPrecio: precio } =
        calcularTotalesReceta(receta.ingredientes_receta, Array.from(ingredientesMap.values()));

      const detalles = document.createElement('p');
      detalles.innerHTML = `
        <strong>Precio:</strong> ${precio.toFixed(2)} € |
        <strong>Calorías:</strong> ${Math.round(kcal)} kcal |
        <strong>Proteínas:</strong> ${Math.round(prot)} g
      `;

      const lista = document.createElement('ul');
      lista.classList.add('ingredientes-lista');
      receta.ingredientes_receta.forEach(ing => {
        const ingBase = ingredientesMap.get(ing.ingrediente_id);
        if (!ingBase) return;
        const li = document.createElement('li');
        li.textContent = `${ingBase.description}: ${ing.cantidad} ${ing.unidad}`;
        lista.appendChild(li);
      });
      lista.style.display = 'none';

      const toggleIngredientes = document.createElement('button');
      toggleIngredientes.textContent = '🧾 Ver ingredientes';
      toggleIngredientes.classList.add('toggle-ingredientes');
      let visible = false;
      toggleIngredientes.onclick = () => {
        visible = !visible;
        lista.style.display = visible ? 'block' : 'none';
        toggleIngredientes.textContent = visible ? '🔽 Ocultar ingredientes' : '🧾 Ver ingredientes';
      };

      card.append(encabezado, detalles, toggleIngredientes, lista);
      contenedor.appendChild(card);
    }
  }

  cargarComidaDelDia();
});
