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

// ============ FUNCIONES PARA APODERADO AUTOMÁTICO ============

function configurarApoderadoAutomatico() {
    const checkboxMadre = document.getElementById('madreApoderado');
    const checkboxPadre = document.getElementById('padreApoderado');
    
    // Listener para los inputs de madre
    const inputsMadre = ['nombreMadre', 'edadMadre', 'runMadre', 'escolaridadMadre', 'trabajoMadre'];
    inputsMadre.forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            if (checkboxMadre.checked) {
                copiarDatosMadreAApoderado();
            }
        });
    });
    
    // Listener para los inputs de padre
    const inputsPadre = ['nombrePadre', 'edadPadre', 'runPadre', 'escolaridadPadre', 'trabajoPadre'];
    inputsPadre.forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            if (checkboxPadre.checked) {
                copiarDatosPadreAApoderado();
            }
        });
    });
    
    checkboxMadre.addEventListener('change', function() {
        if (this.checked) {
            checkboxPadre.checked = false;
            copiarDatosMadreAApoderado();
        } else {
            limpiarDatosApoderado();
        }
    });
    
    checkboxPadre.addEventListener('change', function() {
        if (this.checked) {
            checkboxMadre.checked = false;
            copiarDatosPadreAApoderado();
        } else {
            limpiarDatosApoderado();
        }
    });
}

function copiarDatosMadreAApoderado() {
    document.getElementById('nombreApoderado').value = document.getElementById('nombreMadre').value;
    document.getElementById('edadApoderado').value = document.getElementById('edadMadre').value;
    document.getElementById('runApoderado').value = document.getElementById('runMadre').value;
    document.getElementById('escolaridadApoderado').value = document.getElementById('escolaridadMadre').value;
    document.getElementById('trabajoApoderado').value = document.getElementById('trabajoMadre').value;
    document.getElementById('parentesco').value = 'Madre';
}

function copiarDatosPadreAApoderado() {
    document.getElementById('nombreApoderado').value = document.getElementById('nombrePadre').value;
    document.getElementById('edadApoderado').value = document.getElementById('edadPadre').value;
    document.getElementById('runApoderado').value = document.getElementById('runPadre').value;
    document.getElementById('escolaridadApoderado').value = document.getElementById('escolaridadPadre').value;
    document.getElementById('trabajoApoderado').value = document.getElementById('trabajoPadre').value;
    document.getElementById('parentesco').value = 'Padre';
}

function limpiarDatosApoderado() {
    document.getElementById('nombreApoderado').value = '';
    document.getElementById('edadApoderado').value = '';
    document.getElementById('runApoderado').value = '';
    document.getElementById('escolaridadApoderado').value = '';
    document.getElementById('trabajoApoderado').value = '';
    document.getElementById('parentesco').value = '';
}

// ============ FIN FUNCIONES PARA APODERADO AUTOMÁTICO ============

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
    
    // Configurar apoderado automático
    configurarApoderadoAutomatico();
    
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
        telefonoApoderado: document.getElementById('telefonoApoderado').value,
        movilizacionParticular: document.getElementById('movilizacionParticular').value,
        movilizacionEscolar: document.getElementById('movilizacionEscolar').value,
        nombreCompromisoApo: document.getElementById('nombreCompromisoApo').value,
        reciboMano: document.getElementById('reciboMano').checked,
        reciboCorreo: document.getElementById('reciboCorreo').checked,
        emailOficial: document.getElementById('emailOficial').value,
        nombreApoderadoRetiro: document.getElementById('nombreApoderadoRetiro').value,
        nombrePersonaRetiro: document.getElementById('nombrePersonaRetiro').value,
        rutPersonaRetiro: document.getElementById('rutPersonaRetiro').value,
        madreApoderado: document.getElementById('madreApoderado').checked,
        padreApoderado: document.getElementById('padreApoderado').checked,
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
    document.getElementById('telefonoApoderado').value = data.telefonoApoderado || '';
    document.getElementById('movilizacionParticular').value = data.movilizacionParticular || '';
    document.getElementById('movilizacionEscolar').value = data.movilizacionEscolar || '';
    document.getElementById('nombreCompromisoApo').value = data.nombreCompromisoApo || '';
    document.getElementById('reciboMano').checked = data.reciboMano || false;
    document.getElementById('reciboCorreo').checked = data.reciboCorreo || false;
    document.getElementById('emailOficial').value = data.emailOficial || '';
    document.getElementById('nombreApoderadoRetiro').value = data.nombreApoderadoRetiro || '';
    document.getElementById('nombrePersonaRetiro').value = data.nombrePersonaRetiro || '';
    document.getElementById('rutPersonaRetiro').value = data.rutPersonaRetiro || '';
    document.getElementById('madreApoderado').checked = data.madreApoderado || false;
    document.getElementById('padreApoderado').checked = data.padreApoderado || false;
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
                  '☁️ Sincronizada con Google Sheets\n' +
                  '📄 Comprobante descargado\n\n' +
                  'Alumno: ' + nombreAlumno + '\n' +
                  'Registro: ' + numeroRegistro);
        } else {
            alert('✓ Ficha guardada localmente\n' +
                  '⚠️ No se pudo sincronizar con Google Sheets\n' +
                  'Error: ' + resultado.error + '\n' +
                  '📄 Comprobante descargado\n\n' +
                  'Alumno: ' + nombreAlumno);
        }
        actualizarContador();
        
        // Descargar comprobante automáticamente
        descargarComprobante(data);
    }).catch(error => {
        ocultarMensajeSincronizando();
        alert('✓ Ficha guardada localmente\n' +
              '⚠️ Error de conexión con Google Sheets\n' +
              '📄 Comprobante descargado\n\n' +
              'Alumno: ' + nombreAlumno);
        actualizarContador();
        
        // Descargar comprobante automáticamente
        descargarComprobante(data);
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
    notif.textContent = '✓ Ficha guardada automáticamente';
    notif.style.background = '#28a745';
    setTimeout(() => {
        notif.classList.remove('show');
    }, 2000);
}

// ============ FUNCIÓN PARA DESCARGAR COMPROBANTE AUTOMÁTICAMENTE ============

function descargarComprobante(data) {
    // Formatear fecha de nacimiento si existe
    let fechaNacFormatted = data.fechaNacimiento;
    if (fechaNacFormatted) {
        const fechaParts = fechaNacFormatted.split('-');
        if (fechaParts.length === 3) {
            fechaNacFormatted = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;
        }
    }
    
    const nombreAlumno = data.nombreAlumno || 'Sin_nombre';
    const nombreArchivo = `Comprobante_${nombreAlumno.replace(/\s+/g, '_')}_${Date.now()}.html`;
    
    const htmlComprobante = generarHTMLComprobante(data, fechaNacFormatted);
    
    const blob = new Blob([htmlComprobante], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function generarHTMLComprobante(data, fechaNacFormatted) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprobante de Matrícula 2026</title>
        <style>
            @page {
                size: letter portrait;
                margin: 0.75in;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 11pt;
                color: #000;
                padding: 20px;
            }
            
            /* Header con logos */
            .header-comp {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
            }
            
            .logo-izq {
                width: 90px;
                text-align: center;
            }
            
            .logo-box {
                width: 90px;
                height: 90px;
                border: 1px solid #000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8pt;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .logo-texto {
                font-size: 7pt;
                font-weight: bold;
            }
            
            .titulo-centro {
                flex: 1;
                text-align: center;
                padding: 0 20px;
            }
            
            .titulo-centro h1 {
                font-size: 13pt;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .titulo-centro h2 {
                font-size: 11pt;
                font-weight: bold;
            }
            
            .logo-der {
                width: 90px;
                text-align: center;
            }
            
            /* Bloques */
            .bloque {
                border: 2px solid #000;
                padding: 15px;
                margin-bottom: 15px;
            }
            
            .bloque-titulo {
                font-weight: bold;
                font-size: 10pt;
                margin-bottom: 10px;
            }
            
            .linea-campo {
                display: flex;
                margin-bottom: 5px;
                font-size: 10pt;
            }
            
            .linea-campo label {
                margin-right: 5px;
            }
            
            .linea-campo .valor {
                flex: 1;
                border-bottom: 1px solid #000;
                min-height: 18px;
                padding-left: 5px;
            }
            
            .checkbox-linea {
                display: flex;
                gap: 40px;
                margin-top: 10px;
                font-size: 10pt;
            }
            
            .check-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .check-box {
                width: 14px;
                height: 14px;
                border: 1px solid #000;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12pt;
            }
            
            /* Firmas */
            .firmas {
                display: flex;
                justify-content: space-around;
                margin-top: 40px;
                gap: 50px;
            }
            
            .firma-box {
                flex: 1;
                text-align: center;
            }
            
            .firma-linea {
                border-top: 1px solid #000;
                margin-top: 50px;
                margin-bottom: 5px;
            }
            
            .firma-texto {
                font-size: 9pt;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            /* Importante */
            .importante {
                margin-top: 30px;
                font-size: 9pt;
            }
            
            .importante strong {
                text-transform: uppercase;
            }
            
            .importante ol {
                margin-left: 20px;
                margin-top: 10px;
            }
            
            .importante li {
                margin-bottom: 8px;
                text-align: justify;
            }
            
            @media print {
                body {
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header-comp">
            <div class="logo-izq">
                <div class="logo-box">LOGO<br>MINEDUC</div>
                <div class="logo-texto">Ministerio<br>de Educación</div>
            </div>
            <div class="titulo-centro">
                <h1>ANEXO 1: Comprobante de matrícula.</h1>
                <h2>COMPROBANTE MATRICULA PARA EL AÑO ESCOLAR 2026.</h2>
            </div>
            <div class="logo-der">
                <div class="logo-box">LOGO<br>COLEGIO</div>
                <div class="logo-texto">COLEGIO CRISTIANO</div>
            </div>
        </div>
        
        <!-- BLOQUE 1: DATOS ALUMNO -->
        <div class="bloque">
            <div class="bloque-titulo">DATOS ALUMNO:</div>
            <div class="linea-campo">
                <label>Nombre completo:</label>
                <div class="valor">${data.nombreAlumno || ''}</div>
            </div>
            <div class="linea-campo">
                <label>RUN/IPE:</label>
                <div class="valor">${data.run || ''}</div>
            </div>
            <div class="linea-campo">
                <label>Fecha Nacimiento:</label>
                <div class="valor">${fechaNacFormatted || ''}</div>
            </div>
        </div>
        
        <!-- BLOQUE 2: DATOS APODERADO -->
        <div class="bloque">
            <div class="bloque-titulo">DATOS APODERADO:</div>
            <div class="linea-campo">
                <label>Nombre completo:</label>
                <div class="valor">${data.nombreApoderado || ''}</div>
            </div>
            <div class="linea-campo">
                <label>RUN/IPA:</label>
                <div class="valor">${data.runApoderado || ''}</div>
            </div>
            <div class="linea-campo">
                <label>Correo electrónico:</label>
                <div class="valor">${data.emailOficial || ''}</div>
            </div>
            <div class="linea-campo">
                <label>Teléfono contacto:</label>
                <div class="valor">${data.telefonoApoderado || data.celular || ''}</div>
            </div>
        </div>
        
        <!-- BLOQUE 3: DATOS ESTABLECIMIENTO -->
        <div class="bloque">
            <div class="bloque-titulo">DATOS ESTABLECIMIENTO:</div>
            <div class="linea-campo">
                <label>Establecimiento:</label>
                <div class="valor">Colegio Cristiano Gabriela Mistral</div>
            </div>
            <div class="linea-campo">
                <label>Comuna:</label>
                <div class="valor">Nueva Imperial</div>
            </div>
            <div class="linea-campo">
                <label>RBD:</label>
                <div class="valor">6691 - 5</div>
            </div>
            <div class="linea-campo">
                <label>Curso 2025:</label>
                <div class="valor">${data.cursoIngresa || ''}</div>
            </div>
            <div class="checkbox-linea">
                <div class="check-item">
                    <label>Jornada:</label>
                    <div class="check-box">☐</div>
                    <span>Mañana</span>
                </div>
                <div class="check-item">
                    <div class="check-box">☐</div>
                    <span>Tarde</span>
                </div>
                <div class="check-item">
                    <div class="check-box">☑</div>
                    <span>Mañana y Tarde</span>
                </div>
            </div>
        </div>
        
        <!-- Firmas -->
        <div class="firmas">
            <div class="firma-box">
                <div class="firma-linea"></div>
                <div class="firma-texto">Firma Apoderado<br>Representante</div>
            </div>
            <div class="firma-box">
                <div class="firma-linea"></div>
                <div class="firma-texto">Firma/Timbre<br>Establecimiento</div>
            </div>
        </div>
        
        <!-- Importante -->
        <div class="importante">
            <strong>IMPORTANTE:</strong>
            <ol>
                <li>Este comprobante se entrega de conformidad a lo establecido en el artículo 53 inciso 1 del Decreto Exento N° 152 año 2016, del Ministerio de Educación, y acredita la matrícula del alumno individualizado en este documento, para el año escolar 2026.</li>
                <li>Es responsabilidad del Establecimiento Educacional formalizar esta matrícula a través del Sistema de Información General de Estudiantes (SIGE).</li>
                <li>Este documento debe extenderse en 2 copias, quedando una en poder del establecimiento, y otra en poder del apoderado.</li>
            </ol>
        </div>
    </body>
    </html>
    `;
}


// ============ FIN FUNCIÓN DESCARGAR COMPROBANTE ============

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

// ============ FUNCIÓN PARA IMPRIMIR COMPROBANTE DE MATRÍCULA ============

function imprimirComprobante() {
    const data = obtenerDatosFormulario();
    
    // Validar que haya datos mínimos
    if (!data.nombreAlumno) {
        alert('⚠️ Por favor complete al menos el nombre del alumno antes de imprimir el comprobante.');
        return;
    }
    
    // Guardar datos actuales en localStorage para el comprobante
    localStorage.setItem('fichaActual', JSON.stringify(data));
    
    // Abrir el comprobante en una nueva ventana
    window.open('comprobante.html', '_blank');
}
