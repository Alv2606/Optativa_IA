// Ruta donde se encuentra la carpeta de tu modelo
const URL = "./modelo/";

let model, webcam, maxPredictions;
let isPlaying = false;
let ultimoMensaje = ""; // Para no saturar el historial con lo mismo

// Referencias a los elementos del HTML
const btnInicio = document.getElementById('btn-inicio');
const btnParada = document.getElementById('btn-parada');
const umbralInput = document.getElementById('umbral');
const webcamContainer = document.getElementById('webcam-container');
const mensajeSalida = document.getElementById('mensaje-salida');
const listaHistorial = document.getElementById('lista-historial');
const inputImagen = document.getElementById('input-imagen');
const imagenSubidaContainer = document.getElementById('imagen-subida-container');

// 1. Iniciar la cámara y el modelo
async function init() {
    if (isPlaying) return;

    mensajeSalida.innerText = "Cargando modelo y cámara...";

    // Rutas de los archivos exportados
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Cargar el modelo
    if (!model) {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
    }

    // Configurar la cámara
    const flip = true; // Invierte la imagen como un espejo
    webcam = new tmImage.Webcam(300, 300, flip); 
    await webcam.setup(); 
    await webcam.play();
    
    window.requestAnimationFrame(loop);

    // Actualizar interfaz
    webcamContainer.innerHTML = '';
    webcamContainer.appendChild(webcam.canvas);
    imagenSubidaContainer.innerHTML = ''; // Limpia la subida manual si la había
    isPlaying = true;
    mensajeSalida.innerText = "Cámara iniciada. Analizando...";
}

// 2. Bucle que se repite constantemente analizando los fotogramas
async function loop() {
    if (!isPlaying) return;
    webcam.update(); // actualiza el fotograma
    await predict(webcam.canvas);
    window.requestAnimationFrame(loop);
}

// 3. Función de predicción y lógica del umbral
async function predict(imagenElemento) {
    const predictions = await model.predict(imagenElemento);
    const umbral = parseFloat(umbralInput.value);
    
    // Buscar la predicción con mayor probabilidad
    let mejorPrediccion = predictions[0];
    for (let i = 1; i < maxPredictions; i++) {
        if (predictions[i].probability > mejorPrediccion.probability) {
            mejorPrediccion = predictions[i];
        }
    }

    // Comprobar si supera el umbral establecido por el usuario
    if (mejorPrediccion.probability >= umbral) {
        const porcentaje = (mejorPrediccion.probability * 100).toFixed(2);
        const mensaje = `¡Coincidencia alta! Es: ${mejorPrediccion.className} (${porcentaje}%)`;
        
        // Solo actualizamos el historial y el mensaje si ha cambiado
        if (ultimoMensaje !== mensaje) {
            mensajeSalida.innerText = mensaje;
            agregarAlHistorial(mensaje);
            ultimoMensaje = mensaje;
            
            // Opcional: Cambiar estilo del mensaje a verde o destacado
            mensajeSalida.style.backgroundColor = "#d4edda";
            mensajeSalida.style.color = "#155724";
        }
    } else {
        mensajeSalida.innerText = "Reconocimiento por debajo del umbral mínimo...";
        mensajeSalida.style.backgroundColor = "#fff3cd";
        mensajeSalida.style.color = "#856404";
        ultimoMensaje = ""; // Reseteamos
    }
}

// 4. Parar la cámara
function stop() {
    if (isPlaying && webcam) {
        webcam.stop();
        isPlaying = false;
        mensajeSalida.innerText = "Cámara detenida.";
        mensajeSalida.style.backgroundColor = "#e8f8f5";
        mensajeSalida.style.color = "#16a085";
        ultimoMensaje = "";
    }
}

// 5. Añadir resultados al historial
function agregarAlHistorial(texto) {
    const li = document.createElement('li');
    const hora = new Date().toLocaleTimeString();
    li.innerText = `[${hora}] - ${texto}`;
    
    // Lo añadimos al principio de la lista para ver primero los más recientes
    listaHistorial.prepend(li);
}

// 6. Funcionalidad para subir una imagen estática
inputImagen.addEventListener('change', async (event) => {
    stop(); // Detenemos la cámara si estaba funcionando
    
    const file = event.target.files[0];
    if (file) {
        mensajeSalida.innerText = "Analizando imagen subida...";
        
        // Crear un elemento de imagen temporal
        const img = document.createElement('img');
        img.src = window.URL.createObjectURL(file);
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        img.onload = async () => {
            imagenSubidaContainer.innerHTML = '';
            imagenSubidaContainer.appendChild(img);
            webcamContainer.innerHTML = ''; // Limpiamos la visualización de la webcam
            
            // Nos aseguramos de que el modelo esté cargado
            if (!model) {
                const modelURL = URL + "model.json";
                const metadataURL = URL + "metadata.json";
                model = await tmImage.load(modelURL, metadataURL);
                maxPredictions = model.getTotalClasses();
            }
            
            // Hacemos una única predicción con la imagen fija
            ultimoMensaje = ""; // Forzamos a que siempre actualice el mensaje al subir foto
            await predict(img);
        };
    }
});

// Asignar los eventos a los botones
btnInicio.addEventListener('click', init);
btnParada.addEventListener('click', stop);