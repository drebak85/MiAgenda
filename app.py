from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def serve_index():
    # Sirve index.html desde templates si quieres o directamente desde static si lo tienes ahí
    return render_template('index.html')

@app.route("/despensa")
def despensa():
    return render_template("despensa.html")


@app.route('/calendario')
def calendario():
    return render_template('calendario.html')

@app.route('/citas')
def serve_citas():
    # Sirve la plantilla citas.html (en templates)
    return render_template('citas.html')

@app.route("/lista-compra")
def lista_compra():
    return render_template("lista_compra.html")

@app.route('/menu')
def menu():
    fechas_con_dias = []
    today = datetime.now()

    # Para asegurarte de que la fecha de inicio sea solo el día (sin hora)
    start_of_today = today.replace(hour=0, minute=0, second=0, microsecond=0)

    nombres_dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

    for i in range(7):
        current_date = start_of_today + timedelta(days=i)
        # Obtiene el día de la semana (0=Lunes, 6=Domingo)
        day_of_week_index = current_date.weekday() 
        day_name = nombres_dias[day_of_week_index]
        fechas_con_dias.append({
            'fecha': current_date,
            'dia_nombre': day_name
        })
    
    # Imprime las fechas para depuración en la consola del servidor
    print("Fechas generadas en el backend:", fechas_con_dias) 
    
    return render_template('menu.html', fechas_con_dias=fechas_con_dias)

if __name__ == '__main__':
    app.run(debug=True)


# Rutas para archivos estáticos CSS y JS, ya sirve Flask automáticamente desde /static
# No necesitas definirlas si usas url_for('static', filename='...')
# Pero si quieres rutas explícitas, puedes añadirlas así:

@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'css'), filename)

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'js'), filename)
