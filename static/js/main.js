// src/main.js

import { displayCurrentDateTime } from './current-date.js';
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Muestra la fecha y hora actual al cargar la página.
  displayCurrentDateTime();

    await rellenarCantidadTotalEnDespensa(); // <--- LLAMADA NECESARIA


  // Verifica la despensa y actualiza la lista de la compra, obteniendo el número de elementos faltantes.
  const faltantes = await verificarDespensaYActualizar();

  // Si hay elementos faltantes, actualiza el botón de la despensa con un contador.
  if (faltantes > 0) {
   const btnLista = document.querySelector('.lista-btn');

const contadorLista = document.getElementById('contador-lista');
if (contadorLista) {
  contadorLista.textContent = faltantes;
  contadorLista.style.display = 'inline-block'; // por si está oculto por CSS
}


  }
});

/**
 * Verifica los ingredientes necesarios para el menú del día,
 * los compara con la despensa y actualiza la lista de la compra.
 * @returns {Promise<number>} El número de ingredientes faltantes o con bajo stock.
 */
async function verificarDespensaYActualizar() {
  // Obtiene la fecha de hoy en formato 'YYYY-MM-DD'.
  const hoy = new Date().toISOString().split('T')[0];

  // Consulta el menú del día para la fecha actual.
  const { data: comidasDia, error: err1 } = await supabase
    .from('comidas_dia')
    .select('receta_id')
    .eq('fecha', hoy);

  // Manejo de errores si no se puede obtener el menú del día.
  if (err1) {
    console.error('Error al obtener el menú del día:', err1);
    return 0; // Retorna 0 si hay un error.
  }

  // Si no hay comidas para hoy, no hay nada que verificar.
  if (!comidasDia || comidasDia.length === 0) {
    console.log('No hay comidas planificadas para hoy.');
    return 0;
  }

  let faltantes = 0; // Inicializa el contador de ingredientes faltantes.

  // Itera sobre cada comida en el menú del día.
  for (const comida of comidasDia) {
    const recetaId = comida.receta_id;

    // Obtiene los ingredientes asociados a la receta actual.
    const { data: ingredientesReceta, error: err2 } = await supabase
      .from('ingredientes_receta')
      .select('ingrediente_id, cantidad, unidad')
      .eq('receta_id', recetaId);

    // Manejo de errores si no se pueden obtener los ingredientes de la receta.
    if (err2) {
      console.error(`Error obteniendo ingredientes para la receta ${recetaId}:`, err2);
      continue; // Pasa a la siguiente comida si hay un error.
    }

    // Si no hay ingredientes para esta receta, pasa a la siguiente.
    if (!ingredientesReceta || ingredientesReceta.length === 0) {
      console.log(`No hay ingredientes definidos para la receta ${recetaId}.`);
      continue;
    }

    // Itera sobre cada ingrediente de la receta.
    for (const ing of ingredientesReceta) {
      // Obtiene la descripción (nombre) del ingrediente.
      const { data: ingrediente, error: err3 } = await supabase
        .from('ingredientes_base')
        .select('nombre')
        .eq('id', ing.ingrediente_id)
        .maybeSingle();

      if (err3) {
        console.error(`Error obteniendo nombre para el ingrediente con ID: ${ing.ingrediente_id}:`, err3);
        continue;
      }

      const nombre = ingrediente?.nombre;
      if (!nombre) {
        console.warn(`No se encontró nombre para el ingrediente con ID: ${ing.ingrediente_id}.`);
        continue;
      }

      // Consulta la despensa para verificar la cantidad actual y total del ingrediente.
      const { data: enDespensa, error: err4 } = await supabase
        .from('despensa')
        .select('cantidad, cantidad_total')
        .eq('nombre', nombre)
        .maybeSingle();

      if (err4) {
        console.error(`Error al consultar la despensa para ${nombre}:`, err4);
        continue; // Pasa al siguiente ingrediente si hay un error en la consulta de despensa.
      }

      let agregarALista = false; // Bandera para determinar si se debe agregar a la lista de la compra.

      // Si el ingrediente no está en la despensa, se debe agregar a la lista.
      if (!enDespensa) {
        console.log(`${nombre} no encontrado en la despensa.`);
        agregarALista = true;
      } else {
        // Si está en la despensa, verifica si la cantidad actual es menor al 15% de la cantidad total.
        const actual = parseFloat(enDespensa.cantidad);
        const total = parseFloat(enDespensa.cantidad_total || 0); // Asegura que total sea un número.

        // Si la cantidad total es 0 (no se ha definido un total) o la cantidad actual es muy baja, se agrega a la lista.
        if (total === 0 || (total > 0 && actual / total < 0.15)) {
          console.log(`${nombre}: Cantidad actual (${actual}) es menor al 15% de la total (${total}).`);
          agregarALista = true;
        } else {
          console.log(`${nombre}: Suficiente en despensa (Actual: ${actual}, Total: ${total}).`);
        }
      }

      // Si se debe agregar a la lista de la compra.
         // Si se debe agregar a la lista de la compra.
      if (agregarALista) {
        // Verifica si el ingrediente ya existe en la lista de la compra para evitar duplicados.
        const { data: yaExiste, error: err5 } = await supabase
          .from('lista_compra')
          .select('id')
          .eq('nombre', nombre)
          .maybeSingle();

        if (err5) {
          console.error(`Error al verificar si ${nombre} ya existe en la lista de compra:`, err5);
          continue; // Pasa al siguiente ingrediente si hay un error.
        }

        if (!yaExiste) {
          // Obtener más datos del ingrediente base
          const { data: infoBase, error: errBase } = await supabase
  .from('ingredientes_base')
  .select('unidad, cantidad')
  .eq('nombre', nombre)
  .maybeSingle();


          if (errBase || !infoBase) {
            console.error(`No se pudo obtener info base de ${nombre}:`, errBase);
            continue;
          }

          const { unidad, cantidad: cantidad_base } = infoBase;


          // Insertar con unidad y cantidad
          const { error: insertError } = await supabase
            .from('lista_compra')
            .insert({
              nombre: nombre,
              unidad: unidad || null,
              cantidad: cantidad_base || null
            });

          if (insertError) {
            console.error(`Error al insertar ${nombre} en la lista de compra:`, insertError);
          } else {
            console.log(`${nombre} añadido a la lista de la compra con datos completos.`);
            faltantes++;
          }
        } else {
          // Ya estaba en la lista, pero cuenta como faltante.
          console.log(`${nombre} ya está en la lista de la compra, pero se considera faltante.`);
          faltantes++;
        }
      } // fin de if (agregarALista)
    } // fin de for...ingredientesReceta
  } // fin de for...comidasDia

  

  return faltantes; // Retorna el número total de ingredientes faltantes.
} // fin de verificarDespensaYActualizar


async function rellenarCantidadTotalEnDespensa() {
  const { data: despensa, error: err1 } = await supabase
    .from('despensa')
    .select('id, nombre')
    .is('cantidad_total', null);

  if (err1) {
    console.error('❌ Error obteniendo ingredientes sin cantidad_total:', err1);
    return;
  }

  for (const item of despensa) {
    const { id, nombre } = item;

    const { data: base, error: err2 } = await supabase
      .from('ingredientes_base')
      .select('cantidad')
      .eq('nombre', nombre)
      .maybeSingle();

    if (err2 || !base) {
      console.warn(`⚠️ No se pudo obtener cantidad base para ${nombre}:`, err2);
      continue;
    }

    const cantidadBase = base.cantidad;

    const { error: err3 } = await supabase
      .from('despensa')
      .update({ cantidad_total: cantidadBase })
      .eq('id', id);

    if (err3) {
      console.error(`❌ Error actualizando cantidad_total para ${nombre}:`, err3);
    } else {
      console.log(`✅ ${nombre}: cantidad_total actualizada a ${cantidadBase}`);
    }
  }
}





=======
// src/main.js

import { displayCurrentDateTime } from './current-date.js';
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Muestra la fecha y hora actual al cargar la página.
  displayCurrentDateTime();

    await rellenarCantidadTotalEnDespensa(); // <--- LLAMADA NECESARIA


  // Verifica la despensa y actualiza la lista de la compra, obteniendo el número de elementos faltantes.
  const faltantes = await verificarDespensaYActualizar();

  // Si hay elementos faltantes, actualiza el botón de la despensa con un contador.
  if (faltantes > 0) {
   const btnLista = document.querySelector('.lista-btn');

const contadorLista = document.getElementById('contador-lista');
if (contadorLista) {
  contadorLista.textContent = faltantes;
  contadorLista.style.display = 'inline-block'; // por si está oculto por CSS
}


  }
});

/**
 * Verifica los ingredientes necesarios para el menú del día,
 * los compara con la despensa y actualiza la lista de la compra.
 * @returns {Promise<number>} El número de ingredientes faltantes o con bajo stock.
 */
async function verificarDespensaYActualizar() {
  // Obtiene la fecha de hoy en formato 'YYYY-MM-DD'.
  const hoy = new Date().toISOString().split('T')[0];

  // Consulta el menú del día para la fecha actual.
  const { data: comidasDia, error: err1 } = await supabase
    .from('comidas_dia')
    .select('receta_id')
    .eq('fecha', hoy);

  // Manejo de errores si no se puede obtener el menú del día.
  if (err1) {
    console.error('Error al obtener el menú del día:', err1);
    return 0; // Retorna 0 si hay un error.
  }

  // Si no hay comidas para hoy, no hay nada que verificar.
  if (!comidasDia || comidasDia.length === 0) {
    console.log('No hay comidas planificadas para hoy.');
    return 0;
  }

  let faltantes = 0; // Inicializa el contador de ingredientes faltantes.

  // Itera sobre cada comida en el menú del día.
  for (const comida of comidasDia) {
    const recetaId = comida.receta_id;

    // Obtiene los ingredientes asociados a la receta actual.
    const { data: ingredientesReceta, error: err2 } = await supabase
      .from('ingredientes_receta')
      .select('ingrediente_id, cantidad, unidad')
      .eq('receta_id', recetaId);

    // Manejo de errores si no se pueden obtener los ingredientes de la receta.
    if (err2) {
      console.error(`Error obteniendo ingredientes para la receta ${recetaId}:`, err2);
      continue; // Pasa a la siguiente comida si hay un error.
    }

    // Si no hay ingredientes para esta receta, pasa a la siguiente.
    if (!ingredientesReceta || ingredientesReceta.length === 0) {
      console.log(`No hay ingredientes definidos para la receta ${recetaId}.`);
      continue;
    }

    // Itera sobre cada ingrediente de la receta.
    for (const ing of ingredientesReceta) {
      // Obtiene la descripción (nombre) del ingrediente.
      const { data: ingrediente, error: err3 } = await supabase
        .from('ingredientes_base')
        .select('nombre')
        .eq('id', ing.ingrediente_id)
        .maybeSingle();

      if (err3) {
        console.error(`Error obteniendo nombre para el ingrediente con ID: ${ing.ingrediente_id}:`, err3);
        continue;
      }

      const nombre = ingrediente?.nombre;
      if (!nombre) {
        console.warn(`No se encontró nombre para el ingrediente con ID: ${ing.ingrediente_id}.`);
        continue;
      }

      // Consulta la despensa para verificar la cantidad actual y total del ingrediente.
      const { data: enDespensa, error: err4 } = await supabase
        .from('despensa')
        .select('cantidad, cantidad_total')
        .eq('nombre', nombre)
        .maybeSingle();

      if (err4) {
        console.error(`Error al consultar la despensa para ${nombre}:`, err4);
        continue; // Pasa al siguiente ingrediente si hay un error en la consulta de despensa.
      }

      let agregarALista = false; // Bandera para determinar si se debe agregar a la lista de la compra.

      // Si el ingrediente no está en la despensa, se debe agregar a la lista.
      if (!enDespensa) {
        console.log(`${nombre} no encontrado en la despensa.`);
        agregarALista = true;
      } else {
        // Si está en la despensa, verifica si la cantidad actual es menor al 15% de la cantidad total.
        const actual = parseFloat(enDespensa.cantidad);
        const total = parseFloat(enDespensa.cantidad_total || 0); // Asegura que total sea un número.

        // Si la cantidad total es 0 (no se ha definido un total) o la cantidad actual es muy baja, se agrega a la lista.
        if (total === 0 || (total > 0 && actual / total < 0.15)) {
          console.log(`${nombre}: Cantidad actual (${actual}) es menor al 15% de la total (${total}).`);
          agregarALista = true;
        } else {
          console.log(`${nombre}: Suficiente en despensa (Actual: ${actual}, Total: ${total}).`);
        }
      }

      // Si se debe agregar a la lista de la compra.
         // Si se debe agregar a la lista de la compra.
      if (agregarALista) {
        // Verifica si el ingrediente ya existe en la lista de la compra para evitar duplicados.
        const { data: yaExiste, error: err5 } = await supabase
          .from('lista_compra')
          .select('id')
          .eq('nombre', nombre)
          .maybeSingle();

        if (err5) {
          console.error(`Error al verificar si ${nombre} ya existe en la lista de compra:`, err5);
          continue; // Pasa al siguiente ingrediente si hay un error.
        }

        if (!yaExiste) {
          // Obtener más datos del ingrediente base
          const { data: infoBase, error: errBase } = await supabase
  .from('ingredientes_base')
  .select('unidad, cantidad')
  .eq('nombre', nombre)
  .maybeSingle();


          if (errBase || !infoBase) {
            console.error(`No se pudo obtener info base de ${nombre}:`, errBase);
            continue;
          }

          const { unidad, cantidad: cantidad_base } = infoBase;


          // Insertar con unidad y cantidad
          const { error: insertError } = await supabase
            .from('lista_compra')
            .insert({
              nombre: nombre,
              unidad: unidad || null,
              cantidad: cantidad_base || null
            });

          if (insertError) {
            console.error(`Error al insertar ${nombre} en la lista de compra:`, insertError);
          } else {
            console.log(`${nombre} añadido a la lista de la compra con datos completos.`);
            faltantes++;
          }
        } else {
          // Ya estaba en la lista, pero cuenta como faltante.
          console.log(`${nombre} ya está en la lista de la compra, pero se considera faltante.`);
          faltantes++;
        }
      } // fin de if (agregarALista)
    } // fin de for...ingredientesReceta
  } // fin de for...comidasDia

  

  return faltantes; // Retorna el número total de ingredientes faltantes.
} // fin de verificarDespensaYActualizar


async function rellenarCantidadTotalEnDespensa() {
  const { data: despensa, error: err1 } = await supabase
    .from('despensa')
    .select('id, nombre')
    .is('cantidad_total', null);

  if (err1) {
    console.error('❌ Error obteniendo ingredientes sin cantidad_total:', err1);
    return;
  }

  for (const item of despensa) {
    const { id, nombre } = item;

    const { data: base, error: err2 } = await supabase
      .from('ingredientes_base')
      .select('cantidad')
      .eq('nombre', nombre)
      .maybeSingle();

    if (err2 || !base) {
      console.warn(`⚠️ No se pudo obtener cantidad base para ${nombre}:`, err2);
      continue;
    }

    const cantidadBase = base.cantidad;

    const { error: err3 } = await supabase
      .from('despensa')
      .update({ cantidad_total: cantidadBase })
      .eq('id', id);

    if (err3) {
      console.error(`❌ Error actualizando cantidad_total para ${nombre}:`, err3);
    } else {
      console.log(`✅ ${nombre}: cantidad_total actualizada a ${cantidadBase}`);
    }
  }
}





