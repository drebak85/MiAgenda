// static/js/login.js

// Obtener referencias a las secciones y enlaces de alternancia
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const showRegisterFormLink = document.getElementById('show-register-form');
const showLoginFormLink = document.getElementById('show-login-form');

// Obtener referencias a los formularios y sus elementos
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMsg = document.getElementById('login-error-msg');
const loginButton = loginForm.querySelector('button[type="submit"]');

const registerForm = document.getElementById('register-form');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerErrorMsg = document.getElementById('register-error-msg');
const registerSuccessMsg = document.getElementById('register-success-msg');
const registerButton = registerForm.querySelector('button[type="submit"]');

// --- Funcionalidad para mostrar/ocultar formularios ---
showRegisterFormLink.addEventListener('click', (e) => {
  e.preventDefault(); // Evitar que el enlace recargue la página
  loginSection.classList.add('hidden-form'); // Ocultar sección de login
  registerSection.classList.remove('hidden-form'); // Mostrar sección de registro
  // Limpiar mensajes de error/éxito al cambiar de formulario
  loginErrorMsg.textContent = '';
  registerErrorMsg.textContent = '';
  registerSuccessMsg.textContent = '';
});

showLoginFormLink.addEventListener('click', (e) => {
  e.preventDefault(); // Evitar que el enlace recargue la página
  registerSection.classList.add('hidden-form'); // Ocultar sección de registro
  loginSection.classList.remove('hidden-form'); // Mostrar sección de login
  // Limpiar mensajes de error/éxito al cambiar de formulario
  loginErrorMsg.textContent = '';
  registerErrorMsg.textContent = '';
  registerSuccessMsg.textContent = '';
});

// --- Lógica para el formulario de Inicio de Sesión ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value;

  loginErrorMsg.textContent = ''; // Limpiar mensajes de error previos
  loginButton.disabled = true; // Deshabilitar el botón para evitar envíos múltiples
  loginButton.textContent = 'Iniciando sesión...'; // Mostrar un mensaje de carga

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
  localStorage.setItem("usuario_actual", data.username);  // ✅ NECESARIO para tareas
  localStorage.setItem("username", data.username);         // Opcional
  localStorage.setItem("user_id", data.user_id);           // Opcional
  console.log("Usuario guardado:", data.username);
  window.location.href = '/';
}

 else {
      loginErrorMsg.textContent = data.message || 'Error desconocido al iniciar sesión.';
    }
  } catch (error) {
    console.error('Error en la solicitud de login:', error);
    loginErrorMsg.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.';
  } finally {
    loginButton.disabled = false; // Habilitar el botón de nuevo
    loginButton.textContent = 'Entrar'; // Restaurar el texto del botón
  }
});

// --- Lógica para el formulario de Registro ---
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = registerUsernameInput.value.trim();
  const password = registerPasswordInput.value;

  registerErrorMsg.textContent = '';   // Limpiar mensajes de error previos
  registerSuccessMsg.textContent = ''; // Limpiar mensajes de éxito previos
  registerButton.disabled = true; // Deshabilitar el botón para evitar envíos múltiples
  registerButton.textContent = 'Registrando...'; // Mostrar un mensaje de carga

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) { // Si la respuesta es exitosa (código 200 o 201)
      registerSuccessMsg.textContent = data.message; // Mostrar mensaje de éxito
      // Opcional: limpiar los campos del formulario después de un registro exitoso
      registerUsernameInput.value = '';
      registerPasswordInput.value = '';
      // Redirigir al usuario a la página de login después de un breve retraso
      setTimeout(() => {
        loginSection.classList.remove('hidden-form'); // Mostrar sección de login
        registerSection.classList.add('hidden-form'); // Ocultar sección de registro
        loginErrorMsg.textContent = ''; // Limpiar mensajes de error de login
      }, 2000); // Redirige después de 2 segundos
    } else {
      registerErrorMsg.textContent = data.message || 'Error desconocido al registrar usuario.';
    }
  } catch (error) {
    console.error('Error en la solicitud de registro:', error);
    registerErrorMsg.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.';
  } finally {
    registerButton.disabled = false; // Habilitar el botón de nuevo
    registerButton.textContent = 'Registrar'; // Restaurar el texto del botón
  }
});
