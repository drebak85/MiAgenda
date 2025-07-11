import { supabase } from './supabaseClient.js';

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
            cantidad, unidad,
            ingredientes (
              description, calorias, precio, proteinas
            )
          )
        )
      `)
      .eq('fecha', hoy)
      .eq('tipo', tipoActual);

    contenedor.innerHTML = ''; // limpiar

  const slider = document.createElement('div');
slider.classList.add('comida-tipo-header');

const btnPrev = document.createElement('button');
btnPrev.innerHTML = '⬅';
btnPrev.classList.add('flecha-roja');
btnPrev.onclick = () => cambiarTipo(-1);

const tipoText = document.createElement('span');
tipoText.textContent = `🍽️ ${tipoActual} del día`;
tipoText.classList.add('titulo-comida');

const btnNext = document.createElement('button');
btnNext.innerHTML = '➡';
btnNext.classList.add('flecha-roja');
btnNext.onclick = () => cambiarTipo(1);

slider.append(btnPrev, tipoText, btnNext);
contenedor.appendChild(slider);


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

    // Calcular totales
    let totalCalorias = 0;
    let totalPrecio = 0;
    let totalProteinas = 0;

    const lista = document.createElement('ul');
    lista.classList.add('lista-ingredientes');
    receta.ingredientes_receta.forEach(ing => {
      const ingrediente = ing.ingredientes;
      const cantidad = parseFloat(ing.cantidad);
      const unidad = ing.unidad;

      const li = document.createElement('li');
      li.textContent = `${cantidad} ${unidad} de ${ingrediente.description}`;
      lista.appendChild(li);

     const cantidadBase = parseFloat(ingrediente.cantidad) || 1000;
const precioUnitario = (ingrediente.precio || 0) / cantidadBase;
totalPrecio += precioUnitario * cantidad;

// Calorías y proteínas por cada 100 g
totalCalorias += (ingrediente.calorias || 0) * (cantidad / 100);
totalProteinas += (ingrediente.proteinas || 0) * (cantidad / 100);


    });

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
