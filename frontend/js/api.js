/*Conexión con la API en PHP*/
const API = '../backend/';

/*Token CSRF que el servidor entrega en cada respuesta y se manda de vuelta al modificar datos*/
let CSRF = '';

async function api(archivo, metodo = 'GET', cuerpo, reintento = true) {
    const opciones = {
        method: metodo,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'sweetmanager' }
    };

    if (CSRF) {
        opciones.headers['X-CSRF-Token'] = CSRF;
    }

    if (cuerpo !== undefined) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }

    let respuesta;

    try {
        respuesta = await fetch(API + archivo, opciones);
    } catch (_) {
        throw new Error('No hay conexión con el servidor');
    }

    const token = respuesta.headers.get('X-CSRF-Token');

    if (token) {
        CSRF = token;
    }

    let datos = null;

    try {
        datos = await respuesta.json();
    } catch (_) {}

    /*Si el token venció el servidor ya mandó uno nuevo, se repite la petición una sola vez*/
    if (respuesta.status === 403 && datos && datos.codigo === 'csrf' && reintento) {
        return api(archivo, metodo, cuerpo, false);
    }

    if (!respuesta.ok || !datos || datos.ok === false) {
        if (respuesta.status === 401 && SESION) sesionVencida();

        throw new Error((datos && datos.mensaje) || 'Error del servidor (' + respuesta.status + ')');
    }

    return datos;
}

/*Ejecuta una acción, si falla muestra el error y vuelve a pedir los datos*/
function seguro(accion) {
    return Promise.resolve()
        .then(accion)
        .catch(async e => {
            toast(e.message);

            if (SESION) await refresca();
        });
}

/*Pone en la pantalla los datos que llegan de la base de datos*/
function aplicaDatos(d) {
    S.prods = d.productos;
    S.prov = d.proveedores;
    S.ped = d.pedidos;
    S.turno = d.turno;
    S.ventas = d.ventas;
    S.fac = d.facturas;
    S.cart = armaTicket(S.cart.map(l => ({ id: l.p.id, q: l.q })));
}

async function recarga(redibuja = true) {
    aplicaDatos(await api('datos.php'));

    if (redibuja) render();
}

function refresca() {
    return recarga().catch(() => {});
}

/*Actualiza los datos cada 20 segundos para ver lo que hacen los demás*/
let TEMPORIZADOR = null;
const VISTAS_SIN_FORMULARIO = ['dashboard', 'venta', 'pedidos', 'ventas', 'facturas', 'proveedores'];

function iniciaRefresco() {
    detieneRefresco();

    TEMPORIZADOR = setInterval(() => {
        if (!SESION || document.hidden) return;

        recarga(VISTAS_SIN_FORMULARIO.includes(S.view)).catch(() => {});
    }, 20000);
}

function detieneRefresco() {
    if (TEMPORIZADOR) clearInterval(TEMPORIZADOR);

    TEMPORIZADOR = null;
}
