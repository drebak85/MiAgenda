import { supabase } from './supabaseClient.js';

let recetasDisponibles = [];

// Cargar recetas disponibles desde la tabla 'recetas'
async function cargarRecetas() {
  const { data, error } = await supabase.from("recetas").select("id, nombre");
  if (error) {
    console.error("Error cargando recetas:", error);
    return;
  }
  recetasDisponibles = data;
  document.querySelectorAll(".selector-receta").forEach(select => {
    select.innerHTML = '<option value="">Selecciona una receta</option>';
    data.forEach(receta => {
      const option = document.createElement("option");
      option.value = receta.id;
      option.textContent = receta.nombre;
      select.appendChild(option);
    });
  });
}

// Guardar receta seleccionada en Supabase y actualizar la vista
// Añade 'dia' como parámetro
async function guardarRecetaEnBD(tipo, recetaId, fecha, dia, container) {
  if (!fecha) {
    console.error("Fecha no definida");
    return;
  }
  // Incluye 'dia' en el objeto a insertar
  const { error } = await supabase.from("comidas_dia").insert([{ tipo, receta_id: recetaId, fecha, dia }]);
  if (error) {
    console.error("Error al guardar la receta:", error);
    return;
  }
  await cargarMenuGuardado();
}

// Borrar receta de Supabase
async function borrarRecetaDeBD(recetaId, tipo, fecha) {
  const { error } = await supabase
    .from("comidas_dia")
    .delete()
    .match({ receta_id: recetaId, tipo, fecha });

  if (error) console.error("Error al borrar receta:", error);
}

// Cargar menú guardado para la semana
async function cargarMenuGuardado() {
  const { data, error } = await supabase
    .from("comidas_dia")
    .select(`
      id, tipo, fecha, receta_id, dia,
      recetas ( nombre,
        ingredientes_receta (
          cantidad,
          ingrediente_id (
            precio,
            cantidad,
            calorias,
            proteinas
          )
        )
      )
    `);

  if (error) {
    console.error("Error al cargar el menú guardado:", error);
    return;
  }

  document.querySelectorAll(".lista-recetas").forEach(ul => ul.innerHTML = "");
  document.querySelectorAll(".totales").forEach(span => {
    span.dataset.precio = 0;
    span.dataset.calorias = 0;
    span.dataset.proteinas = 0;
    // Fix: Clear previous text content as well
    const parentComidaDia = span.closest(".comida-dia");
    const precioSpan = parentComidaDia.querySelector(".precio");
    const caloriasSpan = parentComidaDia.querySelector(".calorias");
    const proteinasSpan = parentComidaDia.querySelector(".proteinas");

    if (precioSpan) precioSpan.textContent = "0.00 €";
    if (caloriasSpan) caloriasSpan.textContent = "0";
    if (proteinasSpan) proteinasSpan.textContent = "0";
  });


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  data.forEach(entry => {
    const entryDate = new Date(entry.fecha);
    entryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((entryDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > 6) return;

    const diaEl = document.querySelectorAll(".dia-menu")[diffDays];
    const indexTipo = ['Desayuno', 'Comida', 'Cena'].indexOf(entry.tipo);
    if (indexTipo === -1) return;

    const comidaEl = diaEl.querySelectorAll(".comida-dia")[indexTipo];
    const ul = comidaEl.querySelector(".lista-recetas");

    const li = document.createElement("li");
    li.classList.add("actividad-item", "tarea");

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("actividad-info");

    const descripcion = document.createElement("div");
    descripcion.classList.add("actividad-descripcion");
    descripcion.textContent = entry.recetas.nombre;

    infoDiv.appendChild(descripcion);

    const acciones = document.createElement("div");
    acciones.classList.add("actividad-actions");

    const btnBorrar = document.createElement("button");
    btnBorrar.innerHTML = "<span style='display:inline-block;background:#e74c3c;color:#fff;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;'>🗑️</span>";
    btnBorrar.onclick = async () => {
      await borrarRecetaDeBD(entry.receta_id, entry.tipo, entry.fecha);
      await cargarMenuGuardado();
    };

    acciones.appendChild(btnBorrar);
    li.appendChild(infoDiv);
    li.appendChild(acciones);
    ul.appendChild(li);

    let precio = 0, calorias = 0, proteinas = 0;
    entry.recetas.ingredientes_receta?.forEach(item => {
      const cantidadUsada = parseFloat(item.cantidad);
      const ing = item.ingrediente_id;
      if (!ing || isNaN(cantidadUsada)) return;

      const precioUnitario = (ing.precio || 0) / (parseFloat(ing.cantidad) || 1000);
      precio += precioUnitario * cantidadUsada;
      calorias += (ing.calorias || 0) * (cantidadUsada / 100);
      proteinas += (ing.proteinas || 0) * (cantidadUsada / 100);
    });

    sumarTotales(comidaEl, precio, calorias, proteinas);
    actualizarResumenSemanal();
  });
}

function sumarTotales(container, precio, calorias, proteinas) {
  const precioSpan = container.querySelector(".precio");
  const caloriasSpan = container.querySelector(".calorias");
  const proteinasSpan = container.querySelector(".proteinas");

  let precioActual = parseFloat(precioSpan.textContent.replace(" €", "") || 0);
  let caloriasActual = parseFloat(caloriasSpan.textContent || 0);
  let proteinasActual = parseFloat(proteinasSpan.textContent || 0);

  precioActual += precio;
  caloriasActual += calorias;
  proteinasActual += proteinas;

  precioSpan.textContent = precioActual.toFixed(2) + " €";
  caloriasSpan.textContent = caloriasActual.toFixed(0);
  proteinasSpan.textContent = proteinasActual.toFixed(0);
}


function actualizarResumenSemanal() {
  let costeTotalSemanal = 0;
  let caloriasTotalesSemanal = 0;
  let proteinasTotalesSemanal = 0;

  document.querySelectorAll(".comida-dia").forEach(comidaDia => {
    const precioText = comidaDia.querySelector(".precio").textContent;
    const caloriasText = comidaDia.querySelector(".calorias").textContent;
    const proteinasText = comidaDia.querySelector(".proteinas").textContent;

    costeTotalSemanal += parseFloat(precioText.replace(" €", "") || 0);
    caloriasTotalesSemanal += parseFloat(caloriasText || 0);
    proteinasTotalesSemanal += parseFloat(proteinasText || 0);
  });

  document.getElementById("coste-semanal").textContent = costeTotalSemanal.toFixed(2) + " €";
  document.getElementById("calorias-semanales").textContent = caloriasTotalesSemanal.toFixed(0);
  document.getElementById("proteinas-semanales").textContent = proteinasTotalesSemanal.toFixed(0);
}

// Cargar todo al inicio
document.addEventListener("DOMContentLoaded", async () => {
  await cargarRecetas();
  await cargarMenuGuardado();

  const botonesAñadir = document.querySelectorAll(".btn-add");
  botonesAñadir.forEach(boton => {
    boton.addEventListener("click", async (e) => {
      const container = e.target.closest(".comida-dia");
      const select = container.querySelector(".selector-receta");
      const recetaId = select.value;
      if (!recetaId) return;

      const tipo = container.querySelector('h3').textContent; // Get the text content of the <h3> tag for 'tipo'
      const diaSection = container.closest(".dia-menu");
      const fecha = diaSection ? diaSection.getAttribute("data-fecha") : null;
      const dia = diaSection ? diaSection.querySelector('h2').textContent : null; // Get the text content of the <h2> tag for 'dia'

      if (!fecha) {
        console.error("No se pudo obtener la fecha del contenedor .dia-menu");
        return;
      }
      if (!dia) {
        console.error("No se pudo obtener el día del contenedor .dia-menu");
        return;
      }

      await guardarRecetaEnBD(tipo, recetaId, fecha, dia, container);
    });
  });
});