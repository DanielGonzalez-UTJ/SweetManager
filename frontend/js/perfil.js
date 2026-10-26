/*Perfil de usuario y contacto*/
/*NOTA IMPORTANTE: falta colocar el logo de nosotros */
const CONTACTO = {
    empresa: 'NovaCore',
    lema: 'TECHNOLOGY SOLUTIONS',
    correo: 'soporte@novacore.com'
};

let TABPERFIL = 'info';

const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

const avatar = u => 'imagenes/avatar-' + (u.sexo === 'mujer' ? 'mujer' : 'hombre') + '.svg';

const correoValido = c => /^\S+@\S+\.\S+$/.test(c);

const fechaLarga = d => {
    if (!d) return 'Primer acceso';

    return new Date(d).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/*Cabecera con foto, nombre y rol*/
function actualizaCabecera() {
    if (!SESION) return;

    $('#uimg').src = avatar(SESION);
    $('#unom').textContent = SESION.nombre;
    $('#urol').textContent = ROLES[SESION.rol];
    $('#uimg2').src = avatar(SESION);
    $('#unom2').textContent = SESION.nombre;
    $('#ucor').textContent = SESION.correo;
    $('#chipuser').classList.toggle('on', S.view === 'perfil' || S.view === 'contacto');

    const bc = $('#btncaja');
    bc.hidden = SESION.rol !== 'cajero';
    bc.textContent = S.turno ? ' Corte de caja' : ' Abrir caja';
}

function vPerfil() {
    const u = SESION;
    const tabs = [
        ['info', 'Información personal'],
        ['seg', 'Seguridad'],
        ['pref', 'Preferencias']
    ];
    let cuerpo = '';

    if (TABPERFIL === 'info') {
        cuerpo = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label" for="pf-n">Nombre completo</label>
                    <input class="form-control" id="pf-n" value="${esc(u.nombre)}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Usuario</label>
                    <input class="form-control" value="${esc(u.usuario)}" disabled>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="pf-c">Correo electrónico</label>
                    <input class="form-control" id="pf-c" type="email" value="${esc(u.correo)}">
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="pf-t">Teléfono</label>
                    <input class="form-control" id="pf-t" type="tel" value="${esc(u.telefono)}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Rol</label>
                    <select class="form-select" disabled>
                        <option>${ROLES[u.rol]}</option>
                    </select>
                </div>
            </div>
            <div class="acciones">
                <button class="btn pk" data-act="pguardar">Guardar cambios</button>
            </div>`;
    } else if (TABPERFIL === 'seg') {
        cuerpo = `
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label" for="ps-a">Contraseña actual</label>
                    <input class="form-control" id="ps-a" type="password" autocomplete="current-password">
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="ps-n">Nueva contraseña (mínimo 6 caracteres)</label>
                    <input class="form-control" id="ps-n" type="password" autocomplete="new-password">
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="ps-r">Confirmar nueva contraseña</label>
                    <input class="form-control" id="ps-r" type="password" autocomplete="new-password">
                </div>
            </div>
            <div class="acciones">
                <button class="btn pk" data-act="pclave">Cambiar contraseña</button>
            </div>`;
    } else {
        const fotos = ['hombre', 'mujer'].map(s => `
            <button class="opt ${u.sexo === s ? 'on' : ''}" data-act="psexo" data-v="${s}">
                <img src="imagenes/avatar-${s}.svg" alt="">
                <span>${s === 'mujer' ? 'Mujer' : 'Hombre'}</span>
            </button>
        `).join('');

        const temas = [
            ['light', 'light_mode', 'Claro'],
            ['dark', 'dark_mode', 'Oscuro']
        ].map(([v, i, t]) => `
            <button class="opt ${(esOscuro() ? 'dark' : 'light') === v ? 'on' : ''}" data-act="ptema" data-v="${v}">
                <span class="material-symbols-rounded">${i}</span>
                <span>${t}</span>
            </button>
        `).join('');

        cuerpo = `
            <label class="form-label">Imagen de perfil</label>
            <div class="opts mb-3">${fotos}</div>
            <label class="form-label">Tema</label>
            <div class="opts">${temas}</div>`;
    }

    return `
        <div class="row g-3">
            <div class="col-lg-4 col-xxl-3">
                <div class="card pf-lado">
                    <img class="pf-foto" src="${avatar(u)}" alt="Foto de perfil">
                    <h3>${esc(u.nombre)}</h3>
                    <span class="pf-rol">${ROLES[u.rol]}</span>
                    <div class="pf-sep">Empleado de la dulcería<br>${esc(u.correo)}</div>
                    <div class="pf-sep">Último acceso:<br>${fechaLarga(u.anterior)}</div>
                </div>
            </div>

            <div class="col-lg-8 col-xxl-9">
                <div class="card">
                    <div class="tabs">
                        ${tabs.map(([k, t]) => `
                            <button class="tab ${TABPERFIL === k ? 'on' : ''}" data-act="ptab" data-t="${k}">${t}</button>
                        `).join('')}
                    </div>
                    ${cuerpo}
                </div>
            </div>
        </div>`;
}

function pguardar() {
    const n = $('#pf-n').value.trim();
    const c = $('#pf-c').value.trim();
    const t = $('#pf-t').value.trim();

    if (!n) return toast('Escribe tu nombre completo');
    if (!correoValido(c)) return toast('Escribe un correo válido');
    if (t && !/^[\d\s+()-]{8,}$/.test(t)) return toast('El teléfono no es válido');

    Object.assign(SESION, { nombre: n, correo: c, telefono: t });

    /*Con la base de datos se guarda en la API*/
    toast('Perfil actualizado');
    render();
}

function pclave() {
    const a = $('#ps-a').value;
    const n = $('#ps-n').value;
    const r = $('#ps-r').value;

    if (a !== SESION.clave) return toast('La contraseña actual no es correcta');
    if (n.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres');
    if (n !== r) return toast('Las contraseñas nuevas no coinciden');

    SESION.clave = n;
    toast('Contraseña actualizada');
    render();
}

function vContacto() {
    const asuntos = ['Soporte técnico', 'Duda de uso', 'Reportar un error', 'Sugerencia'];

    return `
        <div class="row g-3">
            <div class="col-lg-7">
                <div class="card ct-info h-100">
                    <div class="ct-marca">
                        <b>${CONTACTO.empresa}</b>
                        <small>${CONTACTO.lema}</small>
                    </div>

                    <h3>Estamos para <span class="rosa">ayudarte</span></h3>
                    <p>
                        En ${CONTACTO.empresa} brindamos soporte técnico y atención para el uso de SweetManager.
                        Si tienes dudas, problemas o necesitas asistencia, puedes contactarnos a través del siguiente medio.
                    </p>

                    <div class="ct-mail">
                        <div class="ct-cab">
                            <div class="ct-ico">✉</div>
                            <div>
                                <b>Correo electrónico</b><br>
                                <span class="mut">Envíanos tus dudas o solicitudes de soporte</span>
                            </div>
                        </div>
                        <div class="ct-copia">
                            <span>${CONTACTO.correo}</span>
                            <button class="btn cy" data-act="ccopiar">Copiar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-5">
                <div class="card ct-form">
                    <h3>Envíanos un mensaje</h3>
                    <p class="mut">Completa el formulario y nuestro equipo te responderá lo antes posible.</p>

                    <div class="mb-3">
                        <label class="form-label" for="ct-n">Nombre</label>
                        <input class="form-control" id="ct-n" placeholder="Tu nombre" value="${esc(SESION.nombre)}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="ct-c">Correo electrónico</label>
                        <input class="form-control" id="ct-c" type="email" placeholder="Tu correo electrónico" value="${esc(SESION.correo)}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="ct-a">Asunto</label>
                        <select class="form-select" id="ct-a">
                            ${asuntos.map(a => `<option>${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="ct-m">Mensaje</label>
                        <textarea class="form-control" id="ct-m" rows="4" placeholder="Escribe tu mensaje aquí..."></textarea>
                    </div>

                    <button class="cobrar w-100" data-act="cenviar"> Enviar mensaje</button>
                </div>
            </div>
        </div>`;
}

function ccopiar() {
    try {
        navigator.clipboard.writeText(CONTACTO.correo).then(
            () => toast('Correo copiado'),
            () => toast(CONTACTO.correo)
        );
    } catch (_) {
        toast(CONTACTO.correo);
    }
}

function cenviar() {
    const n = $('#ct-n').value.trim();
    const c = $('#ct-c').value.trim();
    const a = $('#ct-a').value;
    const m = $('#ct-m').value.trim();

    if (!n) return toast('Escribe tu nombre');
    if (!correoValido(c)) return toast('Escribe un correo válido');
    if (m.length < 10) return toast('Escribe tu mensaje (mínimo 10 caracteres)');

    /*Con la base de datos se envía a la API*/
    const asunto = encodeURIComponent('SweetManager · ' + a);
    const cuerpo = encodeURIComponent(m + '\n\n' + n + ' · ' + c);

    location.href = 'mailto:' + CONTACTO.correo + '?subject=' + asunto + '&body=' + cuerpo;
    toast('Se abrió tu correo para enviar el mensaje');
}
