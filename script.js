let autoSaveTimeout;
const CURRENT_KEY = 'ficha_actual';
const FICHAS_KEY = 'fichas_guardadas';
const SHEETDB_URL = 'https://sheetdb.io/api/v1/w2p6xwx1d07uw';

// ============ FUNCIONES DE GOOGLE SHEETS ============

async function guardarEnGoogleSheets(datos) {
    try {
        const datosProcesados = {
            'Fecha y Hora': new Date().toLocaleString('es-CL'),
            'Nombre Alumno': datos.nombreAlumno || '',
            'RUN': datos.run || '',
            'Fecha Nacimiento': datos.fechaNacimiento || '',
            'Edad': datos.edad || '',
            'Curso': datos.cursoIngresa || '',
            'Domicilio': datos.domicilio || '',
            'Comuna': datos.comuna || '',
            'Teléfono': datos.celular || datos.fonoCasa || '',
            'Email': datos.emailOficial || '',
            'Nombre Apoderado': datos.nombreApoderado || '',
            'RUN Apoderado': datos.runApoderado || '',
            'Teléfono Apoderado': datos.telefonoApoderado || ''
        };

        const response = await fetch(SHEETDB_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: [datosProcesados] })
        });

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: 'Error al guardar en la nube' };
        }
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error.message };
    }
}

// ============ FIN FUNCIONES DE GOOGLE SHEETS ============

// ============ FUNCIONES DE VALIDACIÓN DE RUT ============

function limpiarRut(rut) {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

function formatearRut(rut) {
    const rutLimpio = limpiarRut(rut);
    if (rutLimpio.length < 2) return rutLimpio;
    
    const dv = rutLimpio.slice(-1);
    const numero = rutLimpio.slice(0, -1);
    
    // Formatear con puntos
    let numeroFormateado = '';
    let contador = 0;
    for (let i = numero.length - 1; i >= 0; i--) {
        if (contador === 3) {
            numeroFormateado = '.' + numeroFormateado;
            contador = 0;
        }
        numeroFormateado = numero[i] + numeroFormateado;
        contador++;
    }
    
    return numeroFormateado + '-' + dv;
}

function calcularDV(rut) {
    const rutLimpio = limpiarRut(rut);
    const numero = rutLimpio.slice(0, -1);
    
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dv = 11 - resto;
    
    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

function validarRut(rut) {
    const rutLimpio = limpiarRut(rut);
    
    if (rutLimpio.length < 2) return false;
    
    const dvIngresado = rutLimpio.slice(-1);
    const dvCalculado = calcularDV(rut);
    
    return dvIngresado === dvCalculado;
}

function configurarValidacionRut(inputId, mensajeId) {
    const input = document.getElementById(inputId);
    const mensaje = document.getElementById(mensajeId);
    
    input.addEventListener('input', function(e) {
        let valor = e.target.value;
        
        // Solo formatear si tiene al menos 2 caracteres
        if (limpiarRut(valor).length >= 2) {
            const cursorPos = e.target.selectionStart;
            const valorAnterior = valor;
            valor = formatearRut(valor);
            e.target.value = valor;
            
            // Ajustar posición del cursor después de formatear
            if (valor.length > valorAnterior.length) {
                e.target.setSelectionRange(cursorPos + 1, cursorPos + 1);
            }
        }
        
        // Validar si tiene longitud suficiente
        if (limpiarRut(valor).length >= 7) {
            if (validarRut(valor)) {
                input.classList.remove('rut-invalido');
                input.classList.add('rut-valido');
                mensaje.textContent = '✓ RUT válido';
                mensaje.className = 'texto-valido';
            } else {
                input.classList.remove('rut-valido');
                input.classList.add('rut-invalido');
                mensaje.textContent = '✗ RUT inválido, verifique el número';
                mensaje.className = 'texto-invalido';
            }
        } else {
            input.classList.remove('rut-valido', 'rut-invalido');
            mensaje.textContent = '';
        }
    });
    
    // Validar al perder el foco
    input.addEventListener('blur', function(e) {
        const valor = e.target.value;
        if (valor && limpiarRut(valor).length >= 7 && !validarRut(valor)) {
            mensaje.textContent = '⚠️ Por favor verifique el RUT ingresado';
            mensaje.className = 'texto-invalido';
        }
    });
}

// ============ FIN FUNCIONES DE VALIDACIÓN DE RUT ============

document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    document.getElementById('diaFecha').value = String(today.getDate()).padStart(2, '0');
    document.getElementById('mesFecha').value = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById('anoFecha').value = today.getFullYear();
    
    // Configurar validación de RUTs
    configurarValidacionRut('run', 'runValidacion');
    configurarValidacionRut('runMadre', 'runMadreValidacion');
    configurarValidacionRut('runPadre', 'runPadreValidacion');
    configurarValidacionRut('runApoderado', 'runApoderadoValidacion');
    
    cargarFichaActual();
    actualizarContador();
});

const campos = document.querySelectorAll('input:not([readonly]), select, textarea');
campos.forEach(campo => {
    campo.addEventListener('input', function() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            autoGuardar();
        }, 2000);
    });
});

function autoGuardar() {
    const data = obtenerDatosFormulario();
    localStorage.setItem(CURRENT_KEY, JSON.stringify(data));
    mostrarNotificacion();
}

function obtenerDatosFormulario() {
    return {
        diaFecha: document.getElementById('diaFecha').value,
        mesFecha: document.getElementById('mesFecha').value,
        anoFecha: document.getElementById('anoFecha').value,
        numeroRegistro: document.getElementById('numeroRegistro').value,
        nombreAlumno: document.getElementById('nombreAlumno').value,
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        edad: document.getElementById('edad').value,
        run: document.getElementById('run').value,
        cursoIngresa: document.getElementById('cursoIngresa').value,
        repitente: document.getElementById('repitente').value,
        cursoRepetido: document.getElementById('cursoRepetido').value,
        domicilio: document.getElementById('domicilio').value,
        comuna: document.getElementById('comuna').value,
        fonoCasa: document.getElementById('fonoCasa').value,
        celular: document.getElementById('celular').value,
        otroFono: document.getElementById('otroFono').value,
        procedenciaEscolar: document.getElementById('procedenciaEscolar').value,
        enfermedades: document.getElementById('enfermedades').value,
        informePsico: document.getElementById('informePsico').value,
        programaPIE: document.getElementById('programaPIE').value,
        programaGobierno: document.getElementById('programaGobierno').value,
        perteneceEtnia: document.getElementById('perteneceEtnia').value,
        cualEtnia: document.getElementById('cualEtnia').value,
        personasVive: document.getElementById('personasVive').value,
        nombreMadre: document.getElementById('nombreMadre').value,
        edadMadre: document.getElementById('edadMadre').value,
        runMadre: document.getElementById('runMadre').value,
        escolaridadMadre: document.getElementById('escolaridadMadre').value,
        trabajoMadre: document.getElementById('trabajoMadre').value,
        nombrePadre: document.getElementById('nombrePadre').value,
        edadPadre: document.getElementById('edadPadre').value,
        runPadre: document.getElementById('runPadre').value,
        escolaridadPadre: document.getElementById('escolaridadPadre').value,
        trabajoPadre: document.getElementById('trabajoPadre').value,
        nombreApoderado: document.getElementById('nombreApoderado').value,
        edadApoderado: document.getElementById('edadApoderado').value,
        runApoderado: document.getElementById('runApoderado').value,
        escolaridadApoderado: document.getElementById('escolaridadApoderado').value,
        trabajoApoderado: document.getElementById('trabajoApoderado').value,
        parentesco: document.getElementById('parentesco').value,
        movilizacionParticular: document.getElementById('movilizacionParticular').value,
        movilizacionEscolar: document.getElementById('movilizacionEscolar').value,
        nombreCompromisoApo: document.getElementById('nombreCompromisoApo').value,
        reciboMano: document.getElementById('reciboMano').checked,
        reciboCorreo: document.getElementById('reciboCorreo').checked,
        emailOficial: document.getElementById('emailOficial').value,
        fechaGuardado: new Date().toISOString()
    };
}

function cargarDatosFormulario(data) {
    document.getElementById('diaFecha').value = data.diaFecha || '';
    document.getElementById('mesFecha').value = data.mesFecha || '';
    document.getElementById('anoFecha').value = data.anoFecha || '';
    document.getElementById('numeroRegistro').value = data.numeroRegistro || '';
    document.getElementById('nombreAlumno').value = data.nombreAlumno || '';
    document.getElementById('fechaNacimiento').value = data.fechaNacimiento || '';
    document.getElementById('edad').value = data.edad || '';
    document.getElementById('run').value = data.run || '';
    document.getElementById('cursoIngresa').value = data.cursoIngresa || '';
    document.getElementById('repitente').value = data.repitente || '';
    document.getElementById('cursoRepetido').value = data.cursoRepetido || '';
    document.getElementById('domicilio').value = data.domicilio || '';
    document.getElementById('comuna').value = data.comuna || '';
    document.getElementById('fonoCasa').value = data.fonoCasa || '';
    document.getElementById('celular').value = data.celular || '';
    document.getElementById('otroFono').value = data.otroFono || '';
    document.getElementById('procedenciaEscolar').value = data.procedenciaEscolar || '';
    document.getElementById('enfermedades').value = data.enfermedades || '';
    document.getElementById('informePsico').value = data.informePsico || '';
    document.getElementById('programaPIE').value = data.programaPIE || '';
    document.getElementById('programaGobierno').value = data.programaGobierno || '';
    document.getElementById('perteneceEtnia').value = data.perteneceEtnia || '';
    document.getElementById('cualEtnia').value = data.cualEtnia || '';
    document.getElementById('personasVive').value = data.personasVive || '';
    document.getElementById('nombreMadre').value = data.nombreMadre || '';
    document.getElementById('edadMadre').value = data.edadMadre || '';
    document.getElementById('runMadre').value = data.runMadre || '';
    document.getElementById('escolaridadMadre').value = data.escolaridadMadre || '';
    document.getElementById('trabajoMadre').value = data.trabajoMadre || '';
    document.getElementById('nombrePadre').value = data.nombrePadre || '';
    document.getElementById('edadPadre').value = data.edadPadre || '';
    document.getElementById('runPadre').value = data.runPadre || '';
    document.getElementById('escolaridadPadre').value = data.escolaridadPadre || '';
    document.getElementById('trabajoPadre').value = data.trabajoPadre || '';
    document.getElementById('nombreApoderado').value = data.nombreApoderado || '';
    document.getElementById('edadApoderado').value = data.edadApoderado || '';
    document.getElementById('runApoderado').value = data.runApoderado || '';
    document.getElementById('escolaridadApoderado').value = data.escolaridadApoderado || '';
    document.getElementById('trabajoApoderado').value = data.trabajoApoderado || '';
    document.getElementById('parentesco').value = data.parentesco || '';
    document.getElementById('movilizacionParticular').value = data.movilizacionParticular || '';
    document.getElementById('movilizacionEscolar').value = data.movilizacionEscolar || '';
    document.getElementById('nombreCompromisoApo').value = data.nombreCompromisoApo || '';
    document.getElementById('reciboMano').checked = data.reciboMano || false;
    document.getElementById('reciboCorreo').checked = data.reciboCorreo || false;
    document.getElementById('emailOficial').value = data.emailOficial || '';
}

function cargarFichaActual() {
    const saved = localStorage.getItem(CURRENT_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        cargarDatosFormulario(data);
    }
}

function mostrarNotificacion() {
    const notif = document.getElementById('saveNotification');
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 2000);
}

function guardarFicha() {
    const data = obtenerDatosFormulario();
    const nombreAlumno = data.nombreAlumno || 'Sin nombre';
    const numeroRegistro = data.numeroRegistro || 'Sin número';
    
    // Validar campos importantes
    if (!data.nombreAlumno || !data.run) {
        alert('⚠️ Por favor complete al menos:\n- Nombre del alumno\n- RUN del alumno');
        return;
    }

    // Validar RUTs
    if (data.run && !validarRut(data.run)) {
        alert('⚠️ El RUN del alumno no es válido. Por favor verifíquelo.');
        return;
    }

    // Guardar localmente
    let fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
    const nuevaFicha = {
        id: Date.now(),
        nombreAlumno: nombreAlumno,
        numeroRegistro: numeroRegistro,
        fechaGuardado: new Date().toLocaleString('es-CL'),
        datos: data
    };
    fichas.push(nuevaFicha);
    localStorage.setItem(FICHAS_KEY, JSON.stringify(fichas));

    // Guardar en Google Sheets
    mostrarMensajeSincronizando();
    guardarEnGoogleSheets(data).then(resultado => {
        ocultarMensajeSincronizando();
        if (resultado.success) {
            alert('✓ Ficha guardada exitosamente!\n\n' +
                  '📁 Guardada localmente\n' +
                  '☁️ Sincronizada con Google Sheets\n\n' +
                  'Alumno: ' + nombreAlumno + '\n' +
                  'Registro: ' + numeroRegistro);
        } else {
            alert('✓ Ficha guardada localmente\n' +
                  '⚠️ No se pudo sincronizar con Google Sheets\n' +
                  'Error: ' + resultado.error + '\n\n' +
                  'Alumno: ' + nombreAlumno);
        }
        actualizarContador();
    }).catch(error => {
        ocultarMensajeSincronizando();
        alert('✓ Ficha guardada localmente\n' +
              '⚠️ Error de conexión con Google Sheets\n\n' +
              'Alumno: ' + nombreAlumno);
        actualizarContador();
    });
}

function mostrarMensajeSincronizando() {
    const notif = document.getElementById('saveNotification');
    notif.textContent = '☁️ Sincronizando con Google Sheets...';
    notif.style.background = '#2196F3';
    notif.classList.add('show');
}

function ocultarMensajeSincronizando() {
    const notif = document.getElementById('saveNotification');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 2000);
}

function mostrarGuardadas() {
    const fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
    const lista = document.getElementById('listaFichas');
    
    if (fichas.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #666;">No hay fichas guardadas aún</p>';
    } else {
        lista.innerHTML = '';
        fichas.reverse().forEach(ficha => {
            const item = document.createElement('div');
            item.className = 'saved-item';
            item.innerHTML = `
                <div class="saved-item-info">
                    <strong>${ficha.nombreAlumno}</strong>
                    <small>Registro: ${ficha.numeroRegistro} | ${ficha.fechaGuardado}</small>
                </div>
                <div class="saved-item-actions">
                    <button class="btn-load" onclick="cargarFichaGuardada(${ficha.id})">Cargar</button>
                    <button class="btn-delete" onclick="eliminarFicha(${ficha.id})">Eliminar</button>
                </div>
            `;
            lista.appendChild(item);
        });
    }
    
    document.getElementById('modalFichas').classList.add('show');
}

function cargarFichaGuardada(id) {
    const fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
    const ficha = fichas.find(f => f.id === id);
    
    if (ficha) {
        cargarDatosFormulario(ficha.datos);
        cerrarModal();
        window.scrollTo(0, 0);
        alert('✓ Ficha cargada correctamente');
    }
}

function eliminarFicha(id) {
    if (confirm('¿Está seguro de eliminar esta ficha?')) {
        let fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
        fichas = fichas.filter(f => f.id !== id);
        localStorage.setItem(FICHAS_KEY, JSON.stringify(fichas));
        mostrarGuardadas();
        actualizarContador();
    }
}

function cerrarModal() {
    document.getElementById('modalFichas').classList.remove('show');
}

function actualizarContador() {
    const fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
    document.getElementById('countFichas').textContent = fichas.length;
}

function nuevaFicha() {
    if (confirm('¿Desea crear una nueva ficha? Los datos no guardados se perderán.')) {
        localStorage.removeItem(CURRENT_KEY);
        location.reload();
    }
}

function imprimirPDF() {
    window.print();
}

function exportarTodasJSON() {
    const fichas = JSON.parse(localStorage.getItem(FICHAS_KEY) || '[]');
    
    if (fichas.length === 0) {
        alert('No hay fichas guardadas para exportar');
        return;
    }
    
    const dataStr = JSON.stringify(fichas, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fichas_matricula_' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('✓ Archivo JSON descargado con ' + fichas.length + ' fichas');
}

document.getElementById('modalFichas').addEventListener('click', function(e) {
    if (e.target === this) {
        cerrarModal();
    }
});

function abrirGoogleSheets() {
    window.open('https://docs.google.com/spreadsheets/d/1ozBcEXuNn1XLQrqelrtdcERFPmk0Vk2I10SQoAa9q6I/edit', '_blank');
}