// static/js/usuario.js
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Carga nombre de usuario desde la tabla
    const { data, error } = await supabase
      .from("usuarios")
      .select("username")
      .eq("uuid", user.id)
      .single();

    if (!error && data) {
      document.getElementById("nombre-usuario").textContent = data.username;
    }
  }

  // Toggle del menú
const btnMenu = document.getElementById("usuario-menu-btn");
const menuUsuario = document.getElementById("menu-usuario");
if (btnMenu && menuUsuario) {
  btnMenu.addEventListener("click", () => {
    menuUsuario.classList.toggle("oculto");
  });
}

const btnLogout = document.getElementById("cerrar-sesion");
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  });
}

});

export function getUsuarioActivo() {
  const usuario = localStorage.getItem('usuario');
  return usuario || null;
}
