import { supabase } from './supabaseClient.js';

// Simula usuario activo desde tu tabla personalizada
localStorage.setItem('usuario_activo', 'raul'); // Cambia por 'pedro' si quieres probar

// Manejar subida del audio
export async function handleUpload() {
  const archivo = document.getElementById('archivoAudio').files[0];
  const usuario = localStorage.getItem('usuario_activo');

  if (!archivo) return alert('❌ Debes seleccionar un archivo.');
  if (!usuario) return alert('❌ No hay usuario activo.');

  const nombreArchivo = `${Date.now()}-${archivo.name}`;
  const rutaCompleta = `${usuario}/${nombreArchivo}`;

  // 1. Subir al bucket
  const { data: uploadData, error: storageError } = await supabase
    .storage
    .from('audios')
    .upload(rutaCompleta, archivo);

  if (storageError) {
    console.error('❌ Error al subir el archivo:', storageError);
    return alert('❌ Fallo al subir el archivo al bucket.');
  }

  // 2. Obtener la URL pública
  const { data: urlData } = supabase
    .storage
    .from('audios')
    .getPublicUrl(rutaCompleta);

  const url = urlData.publicUrl;

  // 3. Guardar en la tabla
const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  alert("❌ No estás autenticado.");
  return;
}

const { error: insertError } = await supabase
  .from('audios')
  .insert([{
    nombre: archivo.name,
    url: url,
    usuario: usuario,
    categoria: 'general',
    user_id: user.id // 👈 Añadimos el user_id real
  }]);


  if (insertError) {
    console.error('❌ Error al guardar en la tabla:', insertError);
    return alert('⚠️ El archivo se subió, pero no se guardó en la base de datos.');
  }

  alert('✅ Audio subido correctamente');
  cargarAudios();
}

// Cargar audios del usuario activo
async function cargarAudios() {
  const usuario = localStorage.getItem('usuario_activo');

  const { data, error } = await supabase
    .from('audios')
    .select('*')
    .eq('usuario', usuario)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al cargar audios:', error);
    return;
  }

  mostrarAudios(data);
}

// Mostrar lista de audios
let listaAudios = [];
let indiceActual = 0;
let reproductor = null;

function mostrarAudios(lista) {
  listaAudios = lista;
  indiceActual = 0;

  const contenedor = document.getElementById('lista-audios');
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    contenedor.innerHTML = '<p>No hay audios.</p>';
    return;
  }

  // Mostrar nombre del audio actual
  const titulo = document.createElement('p');
  titulo.id = 'audio-actual';
  contenedor.appendChild(titulo);

  // Crear único reproductor
  reproductor = document.createElement('audio');
  reproductor.controls = true;
  contenedor.appendChild(reproductor);

  // Cuando termina, pasa al siguiente
  reproductor.addEventListener('ended', () => {
    indiceActual++;
    if (indiceActual < listaAudios.length) {
      reproducirAudio(indiceActual);
    }
  });

  // Reproducir el primero
  reproducirAudio(indiceActual);
}

function reproducirAudio(indice) {
  const audio = listaAudios[indice];
  if (!audio || !reproductor) return;

  const titulo = document.getElementById('audio-actual');
  titulo.textContent = `▶️ Reproduciendo: ${audio.nombre}`;

  reproductor.src = audio.url;
  reproductor.play();
}


// Carga inicial
cargarAudios();
window.handleUpload = handleUpload;
