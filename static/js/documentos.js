import { supabase } from './supabaseClient.js';

const claveCorrecta = "1234";
const seccionAcceso = document.getElementById("acceso-documentos");
const seccionContenido = document.getElementById("contenido-documentos");
const botonAcceder = document.getElementById("acceder-documentos");
const inputClave = document.getElementById("clave-documentos");
const formulario = document.getElementById("formulario-documento");
const nombreInput = document.getElementById("nombre-documento");
const tipoSelect = document.getElementById("tipo-documento");
const archivoInput = document.getElementById("archivo-documento");
const filtroTipo = document.getElementById("filtro-tipo");
const lista = document.getElementById("lista-documentos");

// Esperar a que el DOM se cargue para asignar eventos
document.addEventListener("DOMContentLoaded", () => {
  // Asignar evento para la contraseña
  botonAcceder.addEventListener("click", () => {
    if (inputClave.value === claveCorrecta) {
      seccionAcceso.classList.add("oculto");
      seccionContenido.classList.remove("oculto");
    } else {
      alert("Clave incorrecta");
    }
  });

  cargarTipos();
  mostrarDocumentos();
});

// Manejo del formulario para subir documento
formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = nombreInput.value.trim();
  const tipo = tipoSelect.value.trim();
  const archivo = archivoInput.files[0];

  if (!nombre || !tipo || !archivo) {
    alert("Completa todos los campos");
    return;
  }

  const nombreArchivo = Date.now() + "-" + archivo.name;
  const { data: archivoSubido, error: errorSubida } = await supabase
    .storage
    .from("documentos")
    .upload(nombreArchivo, archivo);

  if (errorSubida) {
    alert("Error subiendo archivo");
    return;
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      nombre,
      tipo,
      archivo_url: archivoSubido.path,
    });

  if (error) {
    alert("Error guardando en base de datos");
    return;
  }
  formulario.reset();
  cargarTipos();
  mostrarDocumentos();
});

// Cargar tipos existentes de documentos y actualizar los selects
async function cargarTipos() {
  const { data, error } = await supabase.from("documentos").select("tipo");
  if (error) return;

  const tiposUnicos = [...new Set(data.map(d => d.tipo))];
  const datalist = document.getElementById("tipos-opciones");
  datalist.innerHTML = tiposUnicos.map(tipo => `<option value="${tipo}">`).join("");
}


// Mostrar documentos en el listado, filtrando por tipo si aplica
async function mostrarDocumentos() {
  const tipo = filtroTipo.value;
  let query = supabase.from("documentos").select("*").order("tipo", { ascending: true });
  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) return;

  lista.innerHTML = "";
  data.forEach(doc => {
    const div = document.createElement("div");
    div.className = "documento-item";
    div.innerHTML = `
      <strong>${doc.nombre}</strong> <em>(${doc.tipo})</em><br>
<a href="https://nizjvhmrzjvjfxaapihm.supabase.co/storage/v1/object/public/documentos/${doc.archivo_url}" target="_blank">📄 Ver documento</a>
      <button onclick="editarDocumento(${doc.id})">✏️</button>
      <button onclick="eliminarDocumento(${doc.id})">🗑️</button>
    `;
    lista.appendChild(div);
  });
}

// Actualizar el listado cuando se cambia el filtro por tipo
filtroTipo.addEventListener("change", mostrarDocumentos);

// Funciones de placeholder para editar y eliminar (puedes implementarlas luego)
window.editarDocumento = function(id) {
  alert("Función editarDocumento no implementada. ID: " + id);
};

window.eliminarDocumento = function(id) {
  alert("Función eliminarDocumento no implementada. ID: " + id);
};
