import os
from flask import Flask, jsonify, request, send_from_directory, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta
import requests
import bcrypt # Asegúrate de tener 'pip install bcrypt'

# Cargar variables de entorno desde .env
load_dotenv()

# Obtener variables de entorno, con valores por defecto para depuración si no existen
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or "clave_segura_por_defecto"

# Verificar que las variables de Supabase estén cargadas
if not SUPABASE_URL or not SUPABASE_API_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_API_KEY not set in .env file.")
    print("Please ensure your .env file is correctly configured.")

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = FLASK_SECRET_KEY

CORS(app)

from functools import wraps
from flask import redirect, url_for

def login_requerido(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('serve_login'))
        return f(*args, **kwargs)
    return decorador

# --- Rutas para servir páginas HTML ---
@app.route('/')
@login_requerido
def serve_index():
    return render_template('index.html', cargar_add_activity=True)

@app.route("/despensa")
@login_requerido
def despensa():
    return render_template("despensa.html")

@app.route('/calendario')
@login_requerido
def calendario():
    return render_template('calendario.html')

@app.route('/citas')
@login_requerido
def serve_citas():
    return render_template('citas.html')

@app.route("/lista-compra")
@login_requerido
def lista_compra():
    return render_template("lista_compra.html")

@app.route("/alimentacion")
@login_requerido
def alimentacion():
    return render_template('alimentacion.html', cargar_add_activity=False)

@app.route('/notas')
@login_requerido
def notas():
    return render_template('notas.html')

@app.route('/menu')
@login_requerido
def menu():
    fechas_con_dias = []
    today = datetime.now()
    start_of_today = today.replace(hour=0, minute=0, second=0, microsecond=0)
    nombres_dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

    for i in range(7):
        current_date = start_of_today + timedelta(days=i)
        day_of_week_index = current_date.weekday()
        day_name = nombres_dias[day_of_week_index]
        fechas_con_dias.append({
            'fecha': current_date,
            'dia_nombre': day_name
        })
    print("Fechas generadas en el backend:", fechas_con_dias)
    return render_template('menu.html', fechas_con_dias=fechas_con_dias)

@app.route('/documentos')
@login_requerido
def documentos():
    return render_template('documentos.html')

@app.route('/ejercicio')
@login_requerido
def ejercicio():
    return render_template('ejercicio.html')



@app.route('/registro-usuario') # Ruta para la página de registro de usuarios
def serve_registro_usuario():
    return render_template('registro_usuario.html')

# --- Rutas de API para autenticación ---

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    # --- DEBUGGING ADICIONAL ---
    print(f"DEBUG: Login recibido - Usuario: '{username}', Contraseña: '{password}'")
    # --- FIN DEBUGGING ADICIONAL ---

    if not username or not password:
        return jsonify({"message": "Usuario y contraseña son requeridos"}), 400

    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return jsonify({"message": "Error de configuración del servidor: Claves de Supabase no encontradas."}), 500

    supabase_url = f"{SUPABASE_URL}/rest/v1/usuarios"
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }
    # CAMBIO CRÍTICO AQUÍ: Usamos 'ilike' para búsqueda insensible a mayúsculas/minúsculas
    params = {"username": f"ilike.{username}"}

    # --- DEBUGGING ADICIONAL ---
    print(f"DEBUG: Consultando Supabase URL: {supabase_url}")
    print(f"DEBUG: Parámetros de consulta: {params}")
    # --- FIN DEBUGGING ADICIONAL ---

    try:
        response = requests.get(supabase_url, headers=headers, params=params)
        response.raise_for_status() # Lanza una excepción para errores HTTP (4xx o 5xx)
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con Supabase: {e}")
        return jsonify({"message": "Error al conectar con el servicio de autenticación."}), 500

    users = response.json()

    # --- DEBUGGING ADICIONAL ---
    print(f"DEBUG: Respuesta de Supabase (users): {users}")
    # --- FIN DEBUGGING ADICIONAL ---

    if not users:
        # Si no se encuentra el usuario, el mensaje debe ser genérico por seguridad
        print(f"DEBUG: Usuario '{username}' no encontrado en Supabase.")
        return jsonify({"message": "Usuario o contraseña incorrectos."}), 401

    user = users[0]
    stored_hash = user.get("password_hash")

    if not stored_hash:
        print(f"Error: password_hash no encontrado para el usuario {username}")
        # Si el hash no existe, es un problema de configuración del usuario
        return jsonify({"message": "Error de configuración del usuario: Hash de contraseña no encontrado."}), 500

    # --- DEBUGGING CRÍTICO ---
    print(f"DEBUG: Contraseña recibida (plano): '{password}'")
    print(f"DEBUG: Hash almacenado en DB: '{stored_hash}'")
    # --- FIN DEBUGGING CRÍTICO ---

    try:
        # Codificamos la contraseña ingresada a bytes y el hash almacenado también
        password_bytes = password.encode("utf-8")
        stored_hash_bytes = stored_hash.encode("utf-8")

        if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
            # Si la verificación falla, el mensaje debe ser genérico por seguridad
            print(f"DEBUG: bcrypt.checkpw FALLÓ para usuario '{username}'.")
            return jsonify({"message": "Usuario o contraseña incorrectos."}), 401
        else:
            print(f"DEBUG: bcrypt.checkpw ÉXITO para usuario '{username}'.")
    except ValueError as e:
        print(f"Error en la verificación de bcrypt: {e}")
        # Este error indica que el hash almacenado no es un hash bcrypt válido.
        return jsonify({"message": "Error interno de autenticación. Hash de contraseña inválido."}), 500
    except Exception as e:
        print(f"DEBUG: Error inesperado durante la verificación de bcrypt: {e}")
        return jsonify({"message": "Error interno del servidor durante la autenticación."}), 500


    # Si todo es correcto, guarda la información del usuario en la sesión
    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]

    return jsonify({
        "message": "Login correcto",
        "username": user["username"],
        "user_id": user["id"]
    }), 200

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")  # Valor por defecto

    if not username or not password:
        return jsonify({"message": "Usuario y contraseña son requeridos"}), 400

    # Comprobar configuración
    if not SUPABASE_URL or not SUPABASE_API_KEY:
        return jsonify({"message": "Error de configuración del servidor: Claves de Supabase no encontradas."}), 500

    # Verificar si el usuario ya existe
    check_url = f"{SUPABASE_URL}/rest/v1/usuarios?username=eq.{username}"
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }
    response_check = requests.get(check_url, headers=headers)

    if response_check.status_code == 200 and response_check.json():
        return jsonify({"message": "El usuario ya existe"}), 400

    # Hashear la contraseña
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Insertar el nuevo usuario
    payload = {
        "username": username,
        "password_hash": hashed_password,
        "role": role
    }

    insert_url = f"{SUPABASE_URL}/rest/v1/usuarios"
    response_insert = requests.post(insert_url, headers=headers, json=payload)

    if response_insert.status_code in [200, 201]:
        return jsonify({"message": "Usuario registrado correctamente"}), 201
    else:
        print("ERROR REGISTRO:", response_insert.text)
        return jsonify({"message": "Error al registrar el usuario"}), 500


@app.route('/api/usuario', methods=['GET'])
def obtener_usuario_actual():
    if 'username' not in session:
        return jsonify({"message": "No autorizado"}), 401
    return jsonify({
        "username": session["username"],
        "role": session.get("role", "user")
    }), 200


@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'css'), filename)

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'js'), filename)

@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    if request.method == 'POST':
        return jsonify({"message": "Sesión cerrada"}), 200
    return redirect(url_for('serve_login'))


@app.route('/login')
def serve_login():
    if 'user_id' in session:
        return redirect(url_for('serve_index'))
    return render_template('login.html')

if __name__ == '__main__':
    app.run(debug=True)
