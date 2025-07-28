import { supabase } from './supabaseClient.js';

export async function guardarIngrediente() {
  const nombre = document.getElementById('ingrediente-nombre').value.trim();
  const supermercado = document.getElementById('ingrediente-supermercado').value;
  const precio = parseFloat(document.getElementById('ingrediente-precio').value);
  const cantidad = parseFloat(document.getElementById('ingrediente-cantidad').value);
  const unidad = document.getElementById('ingrediente-unidad').value;
  const calorias = parseFloat(document.getElementById('ingrediente-calorias').value);
  const proteinas = parseFloat(document.getElementById('ingrediente-proteinas').value);

  if (!nombre || isNaN(precio) || isNaN(cantidad)) {
    alert("Por favor, completa todos los campos obligatorios.");
    return;
  }

  const { error } = await supabase.from('ingredientes').insert([{
    nombre,
    supermercado,
    precio,
    cantidad,
    unidad,
    calorias,
    proteinas,
    fecha_creacion: new Date().toISOString()
  }]);

  if (error) {
    alert("Error al guardar ingrediente");
    console.error(error);
  } else {
    alert("Ingrediente guardado correctamente");
  }
}
// Mostrar el formulario
document.getElementById('btn-ingrediente-actividad').addEventListener('click', () => {
  document.getElementById('formulario-ingrediente').classList.remove('oculto');
});

// Cancelar y ocultar el formulario
document.getElementById('cancelar-ingrediente').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('formulario-ingrediente').classList.add('oculto');
});
