// calendario.js

import { supabase } from "./supabaseClient.js";

const calendarioGrid = document.getElementById("calendario-grid");
const mesSelect = document.getElementById("mes-select");
const añoSelect = document.getElementById("año-select");
const prevBtn = document.getElementById("prev-mes");
const nextBtn = document.getElementById("next-mes");
const actividadesLista = document.getElementById("lista-actividades");
const fechaSeleccionadaSpan = document.getElementById("fecha-seleccionada");

const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let fechaActual = new Date();
let mesActual = fechaActual.getMonth();
let añoActual = fechaActual.getFullYear();
let actividadesPorFecha = {}; // Object to store activities grouped by date
let diaSeleccionado = null;

function poblarSelects() {
  meses.forEach((mes, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = mes;
    if (i === mesActual) option.selected = true;
    mesSelect.appendChild(option);
  });

  for (let a = añoActual - 5; a <= añoActual + 5; a++) {
    const option = document.createElement("option");
    option.value = a;
    option.textContent = a;
    if (a === añoActual) option.selected = true;
    añoSelect.appendChild(option);
  }
}

async function cargarActividades() {
  actividadesPorFecha = {}; // Clear previous activities
  const pad = (n) => n.toString().padStart(2, "0");

const inicioMes = `${añoActual}-${pad(mesActual + 1)}-01`;
const finDia = new Date(añoActual, mesActual + 1, 0).getDate();
const finMes = `${añoActual}-${pad(mesActual + 1)}-${pad(finDia)}`;


  const { data: citas, error: errorCitas } = await supabase
    .from("appointments")
    .select("id, description, date")
    .gte("date", inicioMes)
    .lte("date", finMes);

  if (!errorCitas && citas) {
    citas.forEach((cita) => {
      const fecha = cita.date;
      if (!actividadesPorFecha[fecha]) actividadesPorFecha[fecha] = [];
      actividadesPorFecha[fecha].push({ tipo: "CITA", descripcion: cita.description });
    });
  }

  const { data: rutinas, error: errorRutinas } = await supabase
    .from("routines")
    .select("id, description, days_of_week");

  if (!errorRutinas && rutinas) {
    rutinas.forEach((rutina) => {
      let diasSemana = rutina.days_of_week;
      if (typeof diasSemana === "string") diasSemana = JSON.parse(diasSemana);
      for (let dia = 1; dia <= new Date(añoActual, mesActual + 1, 0).getDate(); dia++) {
        const fecha = new Date(añoActual, mesActual, dia);
        const nombreDia = fecha.toLocaleDateString("es-ES", { weekday: "long" });
        const diaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
        if (diasSemana.includes(diaCapitalizado)) {
          const fechaStr = fecha.toISOString().split("T")[0];
          if (!actividadesPorFecha[fechaStr]) actividadesPorFecha[fechaStr] = [];
          actividadesPorFecha[fechaStr].push({ tipo: "RUTINA", descripcion: rutina.description });
        }
      }
    });
  }

  const { data: tareas, error: errorTareas } = await supabase
    .from("tasks")
    .select("id, description, due_date")
    .gte("due_date", inicioMes)
    .lte("due_date", finMes);

  if (!errorTareas && tareas) {
    tareas.forEach((tarea) => {
      const fecha = tarea.due_date;
      if (!actividadesPorFecha[fecha]) actividadesPorFecha[fecha] = [];
      actividadesPorFecha[fecha].push({ tipo: "TAREA", descripcion: tarea.description });
    });
  }
}

function renderizarCalendario() {
  calendarioGrid.innerHTML = "";
  const primerDia = new Date(añoActual, mesActual, 1);
  const ultimoDia = new Date(añoActual, mesActual + 1, 0);
  const primerDiaSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1; // Adjust for Monday as first day

  for (let i = 0; i < primerDiaSemana; i++) {
    const celdaVacia = document.createElement("div");
    calendarioGrid.appendChild(celdaVacia);
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fecha = new Date(añoActual, mesActual, dia);
    // CRITICAL CHANGE: Construct fechaStr using local date components to avoid timezone issues
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed, add 1 and pad
    const day = fecha.getDate().toString().padStart(2, '0'); // Pad day
    const fechaStr = `${year}-${month}-${day}`;

    const divDia = document.createElement("div");
    divDia.classList.add("dia-calendario");
    divDia.textContent = dia;

    if (
      fecha.getDate() === new Date().getDate() &&
      fecha.getMonth() === new Date().getMonth() &&
      fecha.getFullYear() === new Date().getFullYear()
    ) {
      divDia.classList.add("dia-actual");
    }

    if (diaSeleccionado === fechaStr) {
      divDia.classList.add("dia-seleccionado");
    }

    if (actividadesPorFecha[fechaStr]) {
      const tipos = actividadesPorFecha[fechaStr].map((a) => a.tipo);
      if (tipos.includes("CITA")) divDia.classList.add("dia-cita");
      if (tipos.includes("RUTINA")) divDia.classList.add("dia-rutina");
      if (tipos.includes("TAREA")) divDia.classList.add("dia-tarea");
    }

    divDia.addEventListener("click", () => seleccionarDia(fechaStr));
    calendarioGrid.appendChild(divDia);
  }
}

function seleccionarDia(fechaStr) {
  diaSeleccionado = fechaStr;
  // Parse the date string to avoid timezone issues
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day); // month - 1 because months are 0-indexed in JS Date

  const opciones = { year: "numeric", month: "long", day: "numeric" };
  fechaSeleccionadaSpan.textContent = fecha.toLocaleDateString("es-ES", opciones);
  actividadesLista.innerHTML = "";

  const actividades = actividadesPorFecha[fechaStr] || [];

  if (actividades.length === 0) {
    actividadesLista.innerHTML = "<li>No hay actividades para este día.</li>";
  } else {
    actividades.forEach((act) => {
  const li = document.createElement("li");
  li.textContent = `${act.tipo}: ${act.descripcion}`;
  li.classList.add(`actividad-${act.tipo.toLowerCase()}`);  // ← Añade clase CSS dinámica
  actividadesLista.appendChild(li);
});

  }

  renderizarCalendario();
}

mesSelect.addEventListener("change", async () => {
  mesActual = parseInt(mesSelect.value);
  await cargarActividades();
  renderizarCalendario();
});

añoSelect.addEventListener("change", async () => {
  añoActual = parseInt(añoSelect.value);
  await cargarActividades();
  renderizarCalendario();
});

prevBtn.addEventListener("click", async () => {
  if (mesActual === 0) {
    mesActual = 11;
    añoActual--;
  } else {
    mesActual--;
  }
  mesSelect.value = mesActual;
  añoSelect.value = añoActual;
  await cargarActividades();
  renderizarCalendario();
});

nextBtn.addEventListener("click", async () => {
  if (mesActual === 11) {
    mesActual = 0;
    añoActual++;
  } else {
    mesActual++;
  }
  mesSelect.value = mesActual;
  añoSelect.value = añoActual;
  await cargarActividades();
  renderizarCalendario();
});

// Initialization
poblarSelects();
cargarActividades().then(renderizarCalendario);
