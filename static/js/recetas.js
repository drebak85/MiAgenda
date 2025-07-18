import { supabase } from './supabaseClient.js';

function showMessageModal(mensaje) {
    const modal = document.getElementById('message-modal');
    const texto = document.getElementById('message-text');
    const btnOk = document.getElementById('modal-ok-button');
    const btnClose = document.querySelector('.close-button');
    if (!modal || !texto || !btnOk || !btnClose) {
        alert(mensaje);
        return;
    }
    texto.textContent = mensaje;
    modal.classList.remove('oculto');
    function cerrar() {
        modal.classList.add('oculto');
        btnOk.removeEventListener('click', cerrar);
        btnClose.removeEventListener('click', cerrar);
    }
    btnOk.addEventListener('click', cerrar);
    btnClose.addEventListener('click', cerrar);
}

let ingredientesRecetaSeleccionados = [];

export async function cargarIngredientesParaReceta() {
    const select = document.getElementById('receta-seleccionar-ingrediente');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un ingrediente</option>';

    const { data, error } = await supabase
        .from('ingredientes')
        .select('id, description, unidad, calorias, proteinas, precio');

    if (error) {
        showMessageModal('Error al cargar ingredientes: ' + error.message);
        return;
    }

    data.forEach(ingrediente => {
        const option = document.createElement('option');
        option.value = ingrediente.id;
        option.textContent = `${ingrediente.description} (${ingrediente.unidad})`;
        option.dataset.nombre = ingrediente.description;
        option.dataset.unidad = ingrediente.unidad;
        option.dataset.calorias = ingrediente.calorias || 0;
        option.dataset.proteinas = ingrediente.proteinas || 0;
        option.dataset.precio = ingrediente.precio || 0;
        select.appendChild(option);
    });
}

function renderizarIngredientesReceta() {
    const contenedor = document.getElementById('receta-ingredientes-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    ingredientesRecetaSeleccionados.forEach((ing, index) => {
        const item = document.createElement('div');
        item.classList.add('requisito-item');
        item.innerHTML = `
            <span>${ing.nombre} (${ing.cantidad} ${ing.unidad})</span>
            <button type="button" data-index="${index}">&times;</button>
        `;
        item.querySelector('button').addEventListener('click', () => {
            ingredientesRecetaSeleccionados.splice(index, 1);
            renderizarIngredientesReceta();
            actualizarTotales();
        });
        contenedor.appendChild(item);
    });
}

function actualizarTotales() {
    let totalCalorias = 0;
    let totalProteinas = 0;
    let totalPrecio = 0;

    ingredientesRecetaSeleccionados.forEach(ing => {
        // Factor para nutrientes (asumiendo valores por 100 g/ml)
        const factorNutrientes = ing.cantidad / 100;
        totalCalorias += ing.calorias * factorNutrientes;
        totalProteinas += ing.proteinas * factorNutrientes;
        // Factor para precio proporcional al paquete completo (ej: 1000 g)
        let factorPrecio;
        if (ing.unidad.toLowerCase().includes('g') || ing.unidad.toLowerCase().includes('ml')) {
            factorPrecio = ing.cantidad / 1000;
        } else {
            factorPrecio = ing.cantidad;
        }
        totalPrecio += ing.precio * factorPrecio;
    });

    document.getElementById('total-calorias').textContent = totalCalorias.toFixed(2);
    document.getElementById('total-proteinas').textContent = totalProteinas.toFixed(2);
    document.getElementById('total-precio').textContent = totalPrecio.toFixed(2);
}


export async function guardarReceta() {
    const nombre = document.getElementById('nueva-actividad-descripcion')?.value.trim();
    const instrucciones = document.getElementById('receta-instrucciones')?.value.trim();

    if (!nombre || !instrucciones) {
        showMessageModal('Introduce una descripción y las instrucciones.');
        return;
    }

    if (ingredientesRecetaSeleccionados.length === 0) {
        showMessageModal('Agrega al menos un ingrediente.');
        return;
    }

    try {
        const { data: receta, error: recetaError } = await supabase
            .from('recetas')
            .insert([{ nombre, instrucciones }])
            .select()
            .single();

        if (recetaError) throw recetaError;

        const ingredientesFormateados = ingredientesRecetaSeleccionados.map(ing => ({
            receta_id: receta.id,
            ingrediente_id: ing.id,
            cantidad: ing.cantidad,
            unidad: ing.unidad
        }));

        const { error: ingredientesError } = await supabase
            .from('ingredientes_receta')
            .insert(ingredientesFormateados);

        if (ingredientesError) throw ingredientesError;

        showMessageModal('Receta guardada correctamente.');
    } catch (err) {
        console.error('Error al guardar la receta:', err);
        showMessageModal('Error al guardar la receta.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnAdd = document.getElementById('btn-añadir-ingrediente-receta');
    const select = document.getElementById('receta-seleccionar-ingrediente');
    const inputCantidad = document.getElementById('receta-cantidad-ingrediente');
    const btnGuardar = document.getElementById('boton-guardar-receta');

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const option = select.options[select.selectedIndex];
            const ingredienteId = option.value;
            const ingredienteNombre = option.dataset.nombre;
            const unidad = option.dataset.unidad;
            const cantidad = parseFloat(inputCantidad.value);
            const calorias = parseFloat(option.dataset.calorias) || 0;
            const proteinas = parseFloat(option.dataset.proteinas) || 0;
            const precio = parseFloat(option.dataset.precio) || 0;

            if (!ingredienteId || isNaN(cantidad)) {
                showMessageModal('Selecciona un ingrediente válido y cantidad.');
                return;
            }

            ingredientesRecetaSeleccionados.push({
                id: ingredienteId,
                nombre: ingredienteNombre,
                cantidad,
                unidad,
                calorias,
                proteinas,
                precio
            });

            renderizarIngredientesReceta();
            actualizarTotales();

            select.value = '';
            inputCantidad.value = '';
        });
    }

    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarReceta);
    }

    window.cargarIngredientesParaReceta = cargarIngredientesParaReceta;
});
