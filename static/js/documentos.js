// documentos.js

import { supabase } from "./supabaseClient.js";
import { getUsuarioActivo } from "./usuario.js";

const formulario = document.getElementById("formulario-documento");
const lista = document.getElementById("lista-documentos");
const selectorTipo = document.getElementById("filtro-tipo");
const tipoInput = document.getElementById("tipo");

// Cargar documentos
async function cargarDocumentos() {
  if (!lista || !selectorTipo) return;
  lista.innerHTML = "";
  selectorTipo.innerHTML = '<option value="todos">Todos</option>';

  const usuario = await getUsuarioActivo();
  if (!usuario) return;

  let { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("usuario", usuario);

  if (error) {
    console.error("Error cargando documentos:", error);
    return;
  }

  const tiposUnicos = [...new Set(data.map(doc => doc.tipo))];
  tiposUnicos.forEach(tipo => {
    const option = document.createElement("option");
    option.value = tipo;
    option.textContent = tipo;
    selectorTipo.appendChild(option);
  });

  data.forEach(doc => {
    const div = document.createElement("div");
    div.className = "mb-2 p-2 border rounded";

    const nombre = document.createElement("strong");
    nombre.textContent = doc.nombre;

    const tipo = document.createElement("em");
    tipo.textContent = ` (${doc.tipo})`;

    const br = document.createElement("br");

    const enlace = document.createElement("a");
    const url = supabase.storage.from("documentos").getPublicUrl(doc.archivo_url).data.publicUrl;
    enlace.href = url;
    enlace.target = "_blank";
    enlace.textContent = "Ver Archivo";
    enlace.className = "btn btn-sm btn-primary mt-1 mx-1";

    const btnBorrar = document.createElement("button");
    btnBorrar.className = "btn btn-sm btn-danger mt-1";
    btnBorrar.textContent = "Borrar";
    btnBorrar.onclick = () => borrarDocumento(doc.id);

    const btnEditar = document.createElement("button");
    btnEditar.className = "btn btn-sm btn-warning mt-1 mx-1";
    btnEditar.textContent = "Editar";
    btnEditar.onclick = () => {
      document.getElementById("nombre").value = doc.nombre;
      document.getElementById("tipo").value = doc.tipo;
      formulario.setAttribute("data-id-editar", doc.id);
      document.getElementById("app").scrollIntoView({ behavior: "smooth" });
    };

    div.appendChild(nombre);
    div.appendChild(tipo);
    div.appendChild(br);
    div.appendChild(enlace);
    div.appendChild(btnEditar);
    div.appendChild(btnBorrar);

    lista.appendChild(div);
  });
}

// Subir archivo
async function subirArchivo(archivo) {
  const nombreArchivo = `${Date.now()}_${archivo.name}`;
  const { data, error } = await supabase.storage.from("documentos").upload(nombreArchivo, archivo);
  if (error) {
    console.error("Error al subir archivo:", error);
    return null;
  }
  return data.path;
}

// Guardar o editar documento
if (formulario) {
  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const tipo = tipoInput.value.trim();
    const archivo = document.getElementById("archivo").files[0];
    const usuario = await getUsuarioActivo();
    const idEditar = formulario.getAttribute("data-id-editar");

    if (!nombre || !tipo || !usuario) return;

    if (idEditar) {
      // Modo edición
      const updateData = { nombre, tipo };
      if (archivo) {
        const archivo_url = await subirArchivo(archivo);
        if (!archivo_url) return;
        updateData.archivo_url = archivo_url;
      }

      const { error } = await supabase
        .from("documentos")
        .update(updateData)
        .eq("id", idEditar);

      if (error) {
        console.error("Error al actualizar:", error);
        return;
      }
    } else {
      // Nuevo documento
      if (!archivo) return;
      const archivo_url = await subirArchivo(archivo);
      if (!archivo_url) return;

      const { error } = await supabase.from("documentos").insert({
        nombre,
        tipo,
        archivo_url,
        usuario,
      });

      if (error) {
        console.error("Error guardando documento:", error);
        return;
      }
    }

    formulario.reset();
    formulario.removeAttribute("data-id-editar");
    cargarDocumentos();
  });
}

// Eliminar documento
async function borrarDocumento(id) {
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) {
    console.error("Error al borrar:", error);
    return;
  }
  cargarDocumentos();
}

// Filtro por tipo
if (selectorTipo) {
  selectorTipo.addEventListener("change", async () => {
    const tipoSeleccionado = selectorTipo.value;
    const usuario = await getUsuarioActivo();

    let query = supabase.from("documentos").select("*").eq("usuario", usuario);
    if (tipoSeleccionado !== "todos") {
      query = query.eq("tipo", tipoSeleccionado);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error filtrando:", error);
      return;
    }

    lista.innerHTML = "";
    data.forEach(doc => {
      const div = document.createElement("div");
      div.className = "mb-2 p-2 border rounded";

      const nombre = document.createElement("strong");
      nombre.textContent = doc.nombre;

      const tipo = document.createElement("em");
      tipo.textContent = ` (${doc.tipo})`;

      const br = document.createElement("br");

      const enlace = document.createElement("a");
      const url = supabase.storage.from("documentos").getPublicUrl(doc.archivo_url).data.publicUrl;
      enlace.href = url;
      enlace.target = "_blank";
      enlace.textContent = "Ver Archivo";
      enlace.className = "btn btn-sm btn-primary mt-1 mx-1";

      const btnBorrar = document.createElement("button");
      btnBorrar.className = "btn btn-sm btn-danger mt-1";
      btnBorrar.textContent = "Borrar";
      btnBorrar.onclick = () => borrarDocumento(doc.id);

      const btnEditar = document.createElement("button");
      btnEditar.className = "btn btn-sm btn-warning mt-1 mx-1";
      btnEditar.textContent = "Editar";
      btnEditar.onclick = () => {
        document.getElementById("nombre").value = doc.nombre;
        document.getElementById("tipo").value = doc.tipo;
        formulario.setAttribute("data-id-editar", doc.id);
        document.getElementById("app").scrollIntoView({ behavior: "smooth" });
      };

      div.appendChild(nombre);
      div.appendChild(tipo);
      div.appendChild(br);
      div.appendChild(enlace);
      div.appendChild(btnEditar);
      div.appendChild(btnBorrar);

      lista.appendChild(div);
    });
  });
}

document.addEventListener("DOMContentLoaded", cargarDocumentos);
