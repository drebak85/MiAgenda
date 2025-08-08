// static/js/login.js
import { supabase } from './supabaseClient.js';

// Obtener referencias a las secciones y enlaces de alternancia
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const showRegisterFormLink = document.getElementById('show-register-form');
const showLoginFormLink = document.getElementById('show-login-form');

// Formularios
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMsg = document.getElementById('login-error-msg');
const loginButton = loginForm?.querySelector('button[type="submit"]');

const registerForm = document.getElementById('register-form');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerErrorMsg = document.getElementById('register-error-msg');
const registerSuccessMsg = document.getElementById('register-success-msg');
const registerButton = registerForm?.querySelector('button[type="submit"]');

// Validación de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mostrar / ocultar formularios
if (showRegisterFormLink && loginSection && registerSection) {
  showRegisterFormLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('hidden-form');
    registerSection.classList.remove('hidden-form');
    loginErrorMsg.textContent = '';
    registerErrorMsg.textContent = '';
    registerSuccessMsg.textContent = '';
  });
}

if (showLoginFormLink && loginSection && registerSection) {
  showLoginFormLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.classList.add('hidden-form');
    loginSection.classList.remove('hidden-form');
    loginErrorMsg.textContent = '';
    registerErrorMsg.textContent = '';
    registerSuccessMsg.textContent = '';
  });
}

// Lógica de registro
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value.trim();

    // Validaciones
    if (!isValidEmail(email)) {
      registerErrorMsg.textContent = 'Por favor ingresa un email válido';
      return;
    }

    if (password.length < 6) {
      registerErrorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    registerErrorMsg.textContent = '';
    registerSuccessMsg.textContent = '';
    if (registerButton) {
      registerButton.disabled = true;
      registerButton.textContent = 'Registrando...';
    }

    try {
      // 1. Registrar usuario en Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      // 2. Verificar si el usuario ya existe en la tabla 'usuarios'
      const { data: existingUser, error: selectError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error verificando usuario:', selectError);
      }

      // 3. Insertar en tabla 'usuarios' solo si no existe
      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert([{
            id: data.user.id,
            username: email,
            role: 'user',
          }]);

        if (insertError) {
          throw insertError;
        }
      }

      // 4. Iniciar sesión automáticamente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        registerSuccessMsg.textContent = 'Registro exitoso. Por favor inicia sesión manualmente.';
        return;
      }

      // 5. Obtener datos del usuario y redirigir
      const { data: perfil, error: userError } = await supabase
        .from('usuarios')
        .select('username, role')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      localStorage.setItem("usuario_actual", perfil.username);
      localStorage.setItem("rol_usuario", perfil.role);
      window.location.href = "/";

    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.message.includes('duplicate key value violates unique constraint "usuarios_pkey"')) {
        // Si el usuario ya existe, intentamos iniciar sesión directamente
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          registerErrorMsg.textContent = 'El usuario ya existe. Por favor inicia sesión.';
        } else {
          // Obtener datos del usuario existente
          const { data: { user } } = await supabase.auth.getUser();
          const { data: perfil } = await supabase
            .from('usuarios')
            .select('username, role')
            .eq('id', user.id)
            .single();

          localStorage.setItem("usuario_actual", perfil.username);
          localStorage.setItem("rol_usuario", perfil.role);
          window.location.href = "/";
        }
      } else {
        registerErrorMsg.textContent = error.message || 'No se pudo completar el registro.';
      }
    } finally {
      if (registerButton) {
        registerButton.disabled = false;
        registerButton.textContent = 'Registrar';
      }
    }
  });
}

// Lógica de inicio de sesión
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    loginErrorMsg.textContent = '';
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Iniciando sesión...';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Obtener el nombre de usuario y rol desde la tabla usuarios
      const { data: perfil, error: userError } = await supabase
        .from('usuarios')
        .select('username, role')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw userError;
      }

      localStorage.setItem("usuario_actual", perfil.username);
      localStorage.setItem("rol_usuario", perfil.role);
      window.location.href = "/";

    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      
      if (error.message.includes('Email not confirmed')) {
        loginErrorMsg.textContent = 'Debes verificar tu correo electrónico antes de iniciar sesión.';
      } else if (error.message.includes('Invalid login credentials')) {
        loginErrorMsg.textContent = 'Email o contraseña incorrectos.';
      } else {
        loginErrorMsg.textContent = error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.';
      }
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
      }
    }
  });
}