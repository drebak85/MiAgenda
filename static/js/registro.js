import { supabase } from './supabaseClient.js';

const form = document.getElementById('form-registro');
const tipoInput = document.getElementById('tipo');
const tiposDatalist = document.getElementById('tipos-existentes');
const filtroTipo = document.getElementById('filtro-tipo');
const listaRegistros = document.getElementById('registros-lista');

let fotoCapturadaBlob = null;

// Cargar tipos únicos
async function cargarTipos() {
  const { data, error } = await supabase.from('registros').select('tipo');
  if (data) {
    const tiposUnicos = [...new Set(data.map(r => r.tipo))];
    tiposDatalist.innerHTML = '';
    filtroTipo.innerHTML = '<option value="">Todos</option>';
    tiposUnicos.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo;
      tiposDatalist.appendChild(option);

      const filtroOption = document.createElement('option');
      filtroOption.value = tipo;
      filtroOption.textContent = tipo;
      filtroTipo.appendChild(filtroOption);
    });
  }
}

// Subir archivo o imagen a Supabase Storage
async function subirArchivo(archivo) {
  if (!archivo) return null;

  const extensionesPermitidas = ['pdf', 'png', 'jpg', 'jpeg', 'gif'];
  const extension = archivo.name.split('.').pop().toLowerCase();

  if (!extensionesPermitidas.includes(extension)) {
    alert("Tipo de archivo no permitido. Solo PDF o imagen.");
    return null;
  }

  const nombreBase = archivo.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const nombreUnico = `${Date.now()}_${nombreBase}.${extension}`;

  const { data, error } = await supabase.storage
    .from('registros')
    .upload(nombreUnico, archivo);

  if (error) {
    console.error("Error al subir:", error);
    alert("Error al subir el archivo.");
    return null;
  }

  const { data: urlData } = supabase.storage.from('registros').getPublicUrl(nombreUnico);
  return urlData.publicUrl;
}

// Mostrar registros agrupados por fecha
async function mostrarRegistros() {
  const filtro = filtroTipo.value;
  let query = supabase.from('registros').select('*').order('fecha', { ascending: false });

  if (filtro) query = query.eq('tipo', filtro);

  const { data, error } = await query;
  if (error) return console.error(error);

  const agrupado = {};
  data.forEach(r => {
    if (!agrupado[r.fecha]) agrupado[r.fecha] = [];
    agrupado[r.fecha].push(r);
  });

  listaRegistros.innerHTML = '';
  Object.keys(agrupado).forEach(fecha => {
    const bloque = document.createElement('div');
    bloque.innerHTML = `<h3>${fecha}</h3>`;
    agrupado[fecha].forEach(reg => {
      const div = document.createElement('div');
      div.className = 'registro-item';
      div.innerHTML = `
        <strong>${reg.nombre}</strong> <em>(${reg.tipo})</em><br>
        ${reg.descripcion ? `<p>${reg.descripcion}</p>` : ''}
        ${
          reg.archivo_url
            ? /\.(jpg|jpeg|png|gif)$/i.test(reg.archivo_url)
              ? `<img src="${reg.archivo_url}" alt="Imagen" style="max-width:100%; max-height:150px; margin-top:10px;">`
              : `<a href="${reg.archivo_url}" target="_blank">📄 Ver archivo</a>`
            : ''
        }
        <div class="registro-botones">
          <button class="btn-editar" data-id="${reg.id}"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-borrar" data-id="${reg.id}"><i class="fas fa-trash-alt"></i> Borrar</button>
        </div>
        <hr>
      `;
      bloque.appendChild(div);

      // Botón borrar
      div.querySelector('.btn-borrar').addEventListener('click', async () => {
        if (confirm('¿Borrar este registro?')) {
          await supabase.from('registros').delete().eq('id', reg.id);
          mostrarRegistros();
        }
      });

      // Botón editar
      div.querySelector('.btn-editar').addEventListener('click', () => {
        document.getElementById('nombre').value = reg.nombre;
        document.getElementById('descripcion').value = reg.descripcion || '';
        document.getElementById('fecha').value = reg.fecha;
        tipoInput.value = reg.tipo;
        form.dataset.editandoId = reg.id;
        form.querySelector('button[type="submit"]').textContent = 'Actualizar';
      });
    });
    listaRegistros.appendChild(bloque);
  });
}

// Guardar nuevo registro o actualizar
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const fecha = document.getElementById('fecha').value;
  const tipo = tipoInput.value.trim();
  const archivo = fotoCapturadaBlob || document.getElementById('archivo').files[0];

  if (!nombre || !fecha || !tipo) {
    alert('Faltan campos obligatorios');
    return;
  }

  let archivo_url = null;
  if (archivo) archivo_url = await subirArchivo(archivo);

  const editandoId = form.dataset.editandoId;

  if (editandoId) {
    const { error } = await supabase.from('registros').update({
      nombre, descripcion, fecha, tipo, ...(archivo_url && { archivo_url })
    }).eq('id', editandoId);

    if (error) {
      alert('Error al actualizar');
    } else {
      delete form.dataset.editandoId;
      form.reset();
      form.querySelector('button[type="submit"]').textContent = 'Guardar';
      await cargarTipos();
      await mostrarRegistros();
    }

  } else {
    const { error } = await supabase.from('registros').insert([{
      nombre, descripcion, fecha, tipo, archivo_url
    }]);

    if (error) {
      alert('Error al guardar');
    } else {
      form.reset();
      await cargarTipos();
      await mostrarRegistros();
    }
  }
});

// Activar cámara y capturar imagen
window.abrirCamara = async function () {
  const constraints = {
    video: { facingMode: { exact: "environment" } }, // cámara trasera
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('videoCamara');
    video.srcObject = stream;
    video.style.display = 'block';

    const tomar = confirm('¿Tomar la foto ahora?');
    if (tomar) {
      const canvas = document.getElementById('canvasFoto');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stream.getTracks().forEach(track => track.stop());
      video.style.display = 'none';

      canvas.toBlob(blob => {
        fotoCapturadaBlob = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
        alert('Foto capturada y lista para subir');
      }, 'image/jpeg');
    } else {
      stream.getTracks().forEach(track => track.stop());
      video.style.display = 'none';
    }
  } catch (error) {
    alert('No se pudo acceder a la cámara trasera.');
    console.error(error);
  }
};

// Cargar tipos y registros al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('fecha').valueAsDate = new Date();
  await cargarTipos();
  await mostrarRegistros();
});

// Filtro por tipo
filtroTipo.addEventListener('change', mostrarRegistros);
