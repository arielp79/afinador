let audioContext;
let analyser;
let dataArray;

const notaTexto = document.getElementById('nota');
const frecuenciaTexto = document.getElementById('frecuencia');
const aguja = document.getElementById('aguja');
const boton = document.getElementById('botonIniciar');

// Tabla de frecuencias de las notas musicales (A4 = 440Hz)
const NOTAS = [
    { nombre: "C", freq: 16.35 }, { nombre: "C#", freq: 17.32 }, { nombre: "D", freq: 18.35 },
    { nombre: "D#", freq: 19.45 }, { nombre: "E", freq: 20.60 }, { nombre: "F", freq: 21.83 },
    { nombre: "F#", freq: 23.12 }, { nombre: "G", freq: 24.50 }, { nombre: "G#", freq: 25.96 },
    { nombre: "A", freq: 27.50 }, { nombre: "A#", freq: 29.14 }, { nombre: "B", freq: 30.87 }
];

function obtenerNota(frecuencia) {
    // Calculamos qué tan lejos está la frecuencia de una nota real
    const i = Math.round(12 * (Math.log2(frecuencia / 440))) + 57;
    const octava = Math.floor(i / 12);
    const nombreNota = NOTAS[i % 12].nombre;
    return { nombre: nombreNota + octava, freqIdeal: 440 * Math.pow(2, (i - 57) / 12) };
}

async function iniciarAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Tamaño de la muestra
    source.connect(analyser);

    dataArray = new Float32Array(analyser.fftSize);
    
    boton.style.display = 'none'; // Escondemos el botón al empezar
    detectarTono();
}

function detectarTono() {
    analyser.getFloatTimeDomainData(dataArray);
    
    // Algoritmo de detección simple (Autocorrelación)
    let frecuencia = autoCorrelate(dataArray, audioContext.sampleRate);

    if (frecuencia !== -1) {
        const nota = obtenerNota(frecuencia);
        notaTexto.innerText = nota.nombre;
        frecuenciaTexto.innerText = Math.round(frecuencia) + " Hz";

        const diff = frecuencia - nota.freqIdeal;
        
        // --- CAMBIO AQUÍ ---
        // Ampliamos el margen a 1.5Hz para que sea más fácil afinar
        if (Math.abs(diff) < 1.5) {
            notaTexto.style.color = "#00ffcc"; // Verde/Cian cuando está afinado
        } else {
            notaTexto.style.color = "#ff4444"; // Rojo cuando está desafinado
        }
        // -------------------

        const mov = 50 + (diff * 2); 
        aguja.style.left = `${Math.max(10, Math.min(90, mov))}%`;
    }
    requestAnimationFrame(detectarTono);
}

// Función matemática para limpiar el ruido y encontrar la onda principal
function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // Muy poco volumen

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;
    return sampleRate / T0;
}

boton.addEventListener('click', iniciarAudio);

// Dentro de la función detectarTono, donde calculamos 'diff'
const diff = frecuencia - nota.freqIdeal;

// Si la diferencia es menor a 1Hz, lo consideramos "afinado"
if (Math.abs(diff) < 1) {
    notaTexto.style.color = "#00ffcc"; // Verde neón
} else {
    notaTexto.style.color = "white";
}