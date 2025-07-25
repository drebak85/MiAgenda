import { supabase } from './supabaseClient.js';

const form = document.getElementById('form-lista');
const inputNombre = document.getElementById('nombre-item');
const container = document.getElementById('lista-compra-container');

// Supermercados seleccionables
const supermercado1Select = document.getElementById('super1');
const supermercado2Select = document.getElementById('super2');
const total1Span = document.getElementById('total-super1');
const total2Span = document.getElementById('total-super2');

// Añadir nuevo artículo
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = inputNombre.value.trim().toLowerCase();
  if (!texto) return;

  const { data: ingredientes } = await supabase
    .from('ingredientes')
    .select('description');

  const normalizar = str => str.toLowerCase().trim().replace(/(es|s)$/, '');
  const existentes = new Set(ingredientes.map(i => normalizar(i.description)));
  const singular = str => str.replace(/(es|s)$/, '');
  const palabras = texto.split(/\s+/);
  const resultado = [];

  let i = 0;
  while (i < palabras.length) {
    let encontrado = false;
    for (let len = 3; len >= 1; len--) {
      const grupo = palabras.slice(i, i + len).join(' ');
      const grupoSinPlural = singular(grupo);
      if (existentes.has(grupo) || existentes.has(grupoSinPlural)) {
        resultado.push(grupo);
        i += len;
        encontrado = true;
        break;
      }
    }
    if (!encontrado) {
      if (palabras[i] === 'de' && resultado.length > 0) {
        resultado[resultado.length - 1] += ' de ' + palabras[i + 1];
        i += 2;
      } else {
        resultado.push(palabras[i]);
        i++;
      }
    }
  }

  const nombres = [...new Set(resultado.map(s => s.trim()).filter(Boolean))];
  for (const nombre of nombres) {
    await supabase.from('lista_compra').insert([{ nombre }]);
  }

  inputNombre.value = '';
  cargarLista();
  cargarPendientes();
});

async function cargarLista() {
  const { data: lista } = await supabase
    .from('lista_compra')
    .select('id, nombre, completado')
    .order('created_at', { ascending: true });

  if (!lista || lista.length === 0) {
    container.innerHTML = '<p>No hay ingredientes en la lista.</p>';

    // Forzar Lidl y Mercadona aunque no haya productos
    supermercado1Select.innerHTML = '<option value="Lidl">Lidl</option>';
    supermercado1Select.value = 'Lidl';
    supermercado2Select.innerHTML = '<option value="Mercadona">Mercadona</option>';
    supermercado2Select.value = 'Mercadona';

    total1Span.textContent = '0.00€';
    total2Span.textContent = '0.00€';
    return;
  }

  const { data: ingredientes } = await supabase
    .from('ingredientes')
    .select('description, supermercado, precio, cantidad, unidad');

  const mapaIngredientes = new Map();
  const supermercadosUnicos = new Set();
  const existentesSet = new Set(ingredientes.map(i => i.description.trim().toLowerCase().replace(/(es|s)$/, '')));

  ingredientes.forEach(i => {
    const key = i.description.trim().toLowerCase().replace(/(es|s)$/, '');
    supermercadosUnicos.add(i.supermercado);
    if (!mapaIngredientes.has(key)) {
      mapaIngredientes.set(key, []);
    }
    mapaIngredientes.get(key).push(i);
  });

  // Llenar selectores (conservar selección previa)
  const prevSuper1 = supermercado1Select.value;
  const prevSuper2 = supermercado2Select.value;

  supermercado1Select.innerHTML = '<option value="">--Elige--</option>';
  supermercado2Select.innerHTML = '<option value="">--Elige--</option>';

  [...supermercadosUnicos].sort().forEach(s => {
    const o1 = document.createElement('option');
    o1.value = s;
    o1.textContent = s;
    supermercado1Select.appendChild(o1);

    const o2 = document.createElement('option');
    o2.value = s;
    o2.textContent = s;
    supermercado2Select.appendChild(o2);
  });

  if (prevSuper1 && supermercadosUnicos.has(prevSuper1)) {
    supermercado1Select.value = prevSuper1;
  } else if (supermercadosUnicos.has('Lidl')) {
    supermercado1Select.value = 'Lidl';
  }

  if (prevSuper2 && supermercadosUnicos.has(prevSuper2)) {
    supermercado2Select.value = prevSuper2;
  } else if (supermercadosUnicos.has('Mercadona')) {
    supermercado2Select.value = 'Mercadona';
  }

  // Si no hay Lidl o Mercadona, los añadimos manualmente
  if (supermercado1Select.options.length === 1) {
    supermercado1Select.innerHTML += '<option value="Lidl">Lidl</option>';
    supermercado1Select.value = 'Lidl';
  }
  if (supermercado2Select.options.length === 1) {
    supermercado2Select.innerHTML += '<option value="Mercadona">Mercadona</option>';
    supermercado2Select.value = 'Mercadona';
  }

  const super1 = supermercado1Select.value || null;
  const super2 = supermercado2Select.value || null;

  const completados = [], pendientes = [];
  lista.forEach(item => item.completado ? completados.push(item) : pendientes.push(item));
  const ordenados = [...pendientes, ...completados];

  let total1 = 0;
  let total2 = 0;

  const list = document.createElement('ul');
  ordenados.forEach(item => {
    const nombreNormalizado = item.nombre.trim().toLowerCase().replace(/(es|s)$/, '');
    const coincidencias = mapaIngredientes.get(nombreNormalizado) || [];

    const precio1 = coincidencias.find(i => i.supermercado === super1)?.precio ?? null;
    const precio2 = coincidencias.find(i => i.supermercado === super2)?.precio ?? null;
    const ingParaCantidad =
      coincidencias.find(i => i.supermercado === super1) ||
      coincidencias[0]; // si no hay en super1, usa cualquier registro

    let cantidadUnidad;
    if (ingParaCantidad && (ingParaCantidad.cantidad || ingParaCantidad.unidad)) {
      const cantTxt = ingParaCantidad.cantidad ?? '';
      const uniTxt  = ingParaCantidad.unidad ?? '';
      cantidadUnidad = `${cantTxt} ${uniTxt}`.trim();
    } else {
      cantidadUnidad = '—';
    }

    if (precio1) total1 += precio1;
    if (precio2) total2 += precio2;

    const li = document.createElement('li');
    li.classList.add("lista-item");

    const clase1 = precio1 < precio2 ? 'text-green-600 font-bold' : '';
    const clase2 = precio2 < precio1 ? 'text-green-600 font-bold' : '';

    const esIngrediente = existentesSet.has(nombreNormalizado);
    const nombreClase = item.completado
      ? 'line-through text-gray-400'
      : esIngrediente
        ? 'text-green-600 font-bold'
        : '';

    li.innerHTML = `
      <div class="item-linea">
        <div class="item-izquierda">
          <input type="checkbox" class="completado-checkbox" data-id="${item.id}" ${item.completado ? 'checked' : ''}>
          <div class="item-nombre-cantidad">
            <span class="item-nombre ${nombreClase}">${item.nombre}</span>
            <span class="item-cantidad">${cantidadUnidad}</span>
          </div>
        </div>
        <div class="item-derecha">
          <span class="item-precio ${clase1}">${precio1 ? precio1.toFixed(2) + '€' : '—'}</span>
          <span class="item-precio ${clase2}">${precio2 ? precio2.toFixed(2) + '€' : '—'}</span>
          <div class="lista-botones">
            <button class="boton-redondo boton-amarillo editar-btn" data-id="${item.id}" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="boton-redondo boton-rojo borrar-btn" data-id="${item.id}" title="Borrar">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  container.innerHTML = '';
  container.appendChild(list);

  total1Span.textContent = total1.toFixed(2) + '€';
  total2Span.textContent = total2.toFixed(2) + '€';

  document.querySelectorAll('.borrar-btn').forEach(btn => btn.addEventListener('click', borrarItem));
  document.querySelectorAll('.editar-btn').forEach(btn => btn.addEventListener('click', editarItem));
  document.querySelectorAll('.completado-checkbox').forEach(checkbox =>
    checkbox.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const completado = e.target.checked;
      await supabase.from('lista_compra').update({ completado }).eq('id', id);
      cargarLista();
      cargarPendientes();
    })
  );
}

function borrarItem(e) {
  const id = e.target.dataset.id;
  supabase.from('lista_compra').delete().eq('id', id).then(() => {
    cargarLista();
    cargarPendientes();
  });
}

function editarItem(e) {
  const id = e.target.dataset.id;
  const li = e.target.closest('li');

  // Prevenir múltiples ediciones en el mismo item
  if (li.classList.contains('editando')) return;
  li.classList.add('editando');

  const span = li.querySelector('.item-nombre');
  const nombre = span.textContent.trim();

  const form = document.createElement('form');
  form.classList.add('form-editar');
  form.innerHTML = `
    <input type="text" name="nombre" value="${nombre}" required class="editar-input">
    <button type="submit" class="editar-guardar" title="Guardar">
      <i class="fas fa-save"></i>
    </button>
    <button type="button" class="editar-cancelar cancelar-edicion" title="Cancelar">
      <i class="fas fa-times"></i>
    </button>
  `;

  span.replaceWith(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nuevoNombre = form.nombre.value.trim();
    await supabase.from('lista_compra').update({ nombre: nuevoNombre }).eq('id', id);
    li.classList.remove('editando');
    cargarLista();
    cargarPendientes();
  });

  form.querySelector('.cancelar-edicion').addEventListener('click', () => {
    li.classList.remove('editando');
    cargarLista();
  });
}


document.getElementById('agregar-completados-despensa').addEventListener('click', async () => {
  const { data: completados } = await supabase
    .from('lista_compra')
    .select('*')
    .eq('completado', true);

  for (const item of completados) {
    const { data: existente } = await supabase
      .from('despensa')
      .select('id')
      .eq('nombre', item.nombre)
      .maybeSingle();

    if (!existente) {
      await supabase.from('despensa').insert([{ nombre: item.nombre }]);
    }

    await supabase.from('lista_compra').delete().eq('id', item.id);
  }

  cargarLista();
  cargarPendientes();
});

// --- NUEVA FUNCIÓN PARA PENDIENTES ---
async function cargarPendientes() {
  const contPendientes = document.getElementById('pendientes-container');
  if (!contPendientes) return;

  const { data: pendientes } = await supabase
    .from('despensa')
    .select('*')
    .order('created_at', { ascending: true });

  contPendientes.innerHTML = pendientes.length
    ? pendientes.map(p => `<div>${p.nombre}</div>`).join('')
    : '<p>No hay productos pendientes.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
  supermercado1Select.addEventListener('change', cargarLista);
  supermercado2Select.addEventListener('change', cargarLista);
  cargarLista();
  cargarPendientes();
});
