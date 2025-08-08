// src/main.js

import { displayCurrentDateTime } from './current-date.js';
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Primero, verificamos la sesión de Supabase
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Si no hay sesión, redirigimos al login
    window.location.href = "/login";
    return;
  }

  // Ahora que sabemos que el usuario está autenticado, podemos continuar con la lógica existente
  displayCurrentDateTime();

  // Rellena la cantidad total en la despensa si es nula.
  await rellenarCantidadTotalEnDespensa();

  // Verifica la despensa y actualiza la lista de la compra, obteniendo el número de elementos faltantes.
  await verificarDespensaYActualizar(); // No necesitamos el valor de retorno aquí directamente para el contador.

  // Mostrar contador lista compra (solo pendientes y del usuario activo)
  const usuario = localStorage.getItem("usuario_actual");
  if (usuario) {
    const { data: itemsLista, error } = await supabase
      .from('lista_compra')
      .select('id')
      .eq('usuario', usuario)
      .eq('completado', false); // ✅ solo productos pendientes

    if (!error && itemsLista) {
      const total = itemsLista.length;
      const contadorLista = document.getElementById('contador-lista');
      if (contadorLista) {
        if (total > 0) {
          contadorLista.textContent = total;
          contadorLista.style.display = 'inline-block';
        } else {
          contadorLista.style.display = 'none';
        }
      }
    }
  }

  // Restaura el usuario guardado y activa el modo administrador si corresponde.
  const guardado = localStorage.getItem('usuario_actual');
  if (guardado) {
    const radio = document.querySelector(`input[name="usuario"][value="${guardado}"]`);
    if (radio) radio.checked = true;
  }

  const rol = localStorage.getItem('rol_usuario');
  if (rol === 'admin') {
    console.log('👑 Modo administrador activado');
    document.body.classList.add('modo-admin');
    document.querySelectorAll('.solo-admin').forEach(el => el.classList.remove('oculto'));
  }

  // Eventos para mostrar/ocultar selector de usuario
  const toggleBtn = document.getElementById('toggle-selector');
  const selector = document.getElementById('selector-usuario');

  if (toggleBtn && selector) {
    toggleBtn.addEventListener('click', () => {
      selector.classList.toggle('oculto');
    });

    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !selector.contains(e.target)) {
        selector.classList.add('oculto');
      }
    });
  }

  // Evento al seleccionar usuario
  const roles = {
    raul: 'admin',
    derek: 'user'
  };

  document.querySelectorAll('input[name="usuario"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const usuario = radio.value;
      localStorage.setItem('usuario_actual', usuario);
      localStorage.setItem('rol_usuario', roles[usuario.toLowerCase()] || 'user');
      location.reload();
      if (usuario === "derek") {
        const botonesDerek = [
          document.getElementById("btn-ingrediente-actividad"),
          document.querySelector(".lista-btn"),
          [...document.querySelectorAll(".icon-button")].find(btn => btn.textContent.includes("Despensa"))
        ];
        botonesDerek.forEach(btn => {
          if (btn) btn.style.display = "none";
        });
      }
    });
  });

  // BOTÓN DE CERRAR SESIÓN
  document.getElementById("cerrar-sesion")?.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("usuario_actual");
      localStorage.removeItem("rol_usuario");
      sessionStorage.clear(); // Por si se guarda algo en sesión
      window.location.href = "/login"; // ✅ Redirige al login directamente
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      window.location.href = "/login"; // Redirige igual por si acaso
    }
  });

});

// Se mantienen tus funciones existentes sin cambios
async function verificarDespensaYActualizar() {
  const hoy = new Date().toISOString().split('T')[0];
  const { data: comidasDia, error: err1 } = await supabase
    .from('comidas_dia')
    .select('receta_id')
    .eq('fecha', hoy);

  if (err1 || !comidasDia?.length) return 0;

  let faltantes = 0;

  for (const comida of comidasDia) {
    const recetaId = comida.receta_id;
    const { data: ingredientesReceta, error: err2 } = await supabase
      .from('ingredientes_receta')
      .select('ingrediente_id, cantidad, unidad')
      .eq('receta_id', recetaId);

    if (err2 || !ingredientesReceta?.length) continue;

    for (const ing of ingredientesReceta) {
      const { data: ingrediente, error: err3 } = await supabase
        .from('ingredientes_base')
        .select('nombre')
        .eq('id', ing.ingrediente_id)
        .maybeSingle();
      if (err3 || !ingrediente?.nombre) continue;

      const nombre = ingrediente.nombre;
      const { data: enDespensa, error: err4 } = await supabase
        .from('despensa')
        .select('cantidad, cantidad_total')
        .eq('nombre', nombre)
        .maybeSingle();
      if (err4) continue;

      let agregarALista = false;
      if (!enDespensa) {
        agregarALista = true;
      } else {
        const actual = parseFloat(enDespensa.cantidad);
        const total = parseFloat(enDespensa.cantidad_total || 0);
        if (total === 0 || actual / total < 0.15) agregarALista = true;
      }

      if (agregarALista) {
        const { data: yaExiste } = await supabase
          .from('lista_compra')
          .select('id')
          .eq('nombre', nombre)
          .maybeSingle();

        if (!yaExiste) {
          const { data: infoBase } = await supabase
            .from('ingredientes_base')
            .select('unidad, cantidad')
            .eq('nombre', nombre)
            .maybeSingle();
          if (!infoBase) continue;

          await supabase.from('lista_compra').insert({
            nombre: nombre,
            unidad: infoBase.unidad || null,
            cantidad: infoBase.cantidad || null
          });
          faltantes++;
        } else {
          faltantes++;
        }
      }
    }
  }
  return faltantes;
}

async function rellenarCantidadTotalEnDespensa() {
  const { data: despensa, error: err1 } = await supabase
    .from('despensa')
    .select('id, nombre')
    .is('cantidad_total', null);

  if (err1) return;

  for (const item of despensa) {
    const { id, nombre } = item;
    const { data: base } = await supabase
      .from('ingredientes_base')
      .select('cantidad')
      .eq('nombre', nombre)
      .maybeSingle();

    if (!base) continue;

    await supabase
      .from('despensa')
      .update({ cantidad_total: base.cantidad })
      .eq('id', id);
  }
}
