/*Pantallas de la aplicación*/
const T = {
    dashboard: ['Dashboard', vDash],
    venta: ['Punto de venta', vVenta],
    pedidos: ['Pedidos', vPed],
    ventas: ['Ventas del día', vVentas],
    facturas: ['Facturación', vFac],
    proveedores: ['Proveedores', vProv],
    perfil: ['Perfil de usuario', vPerfil],
    contacto: ['Contacto / Soporte', vContacto]
};

/*Tema claro y oscuro*/
function esOscuro() {
    const t = document.documentElement.dataset.theme;

    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

function iconoTema() {
    const ic = $('#temaic');
    const b = $('#tema');

    if (ic) ic.textContent = esOscuro() ? 'light_mode' : 'dark_mode';
    if (b) b.title = esOscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function aplicaTema(oscuro) {
    document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
    document.documentElement.dataset.bsTheme = oscuro ? 'dark' : 'light';
    iconoTema();
}

function tema() {
    aplicaTema(!esOscuro());
}

/*Inicio y cierre de sesión*/
function entrar(e) {
    e.preventDefault();

    const u = $('#lu').value.trim();
    const c = $('#lp').value;
    const err = $('#lerr');

    if (!u || !c) {
        err.textContent = 'Escribe tu usuario y tu contraseña';
        return;
    }

    if (!login(u, c)) {
        err.textContent = 'Usuario o contraseña incorrectos';
        $('#lp').value = '';
        $('#lp').focus();
        return;
    }

    err.textContent = '';
    $('#lform').reset();

    document.querySelectorAll('.menu-btn').forEach(b => {
        b.hidden = b.dataset.v ? !puede(b.dataset.v) : false;
    });

    document.body.classList.add('con-sesion');
    S.view = PERMISOS[SESION.rol][0];
    render();
}

function salir() {
    SESION = null;
    TABPERFIL = 'info';
    S.cart = [];
    S.recv = '';
    document.body.classList.remove('con-sesion');
    $('#lu').focus();
}

function verClave() {
    const p = $('#lp');

    p.type = p.type === 'password' ? 'text' : 'password';
}

function irA(vista) {
    S.view = vista;
    render();
}

/*Menú de la cuenta*/
function menuCuenta(abrir) {
    const m = $('#menuuser');
    const mostrar = abrir === undefined ? m.hidden : abrir;

    m.hidden = !mostrar;
    $('#chipuser').setAttribute('aria-expanded', String(mostrar));
}

/*Acciones de los botones con data-act*/
document.addEventListener('click', e => {
    const x = e.target.closest('[data-act]');

    if (!x) return;

    const d = x.dataset;

    if (d.act !== 'cuenta') menuCuenta(false);

    const acciones = {
        ticket: () => ticket(S.ventas.find(v => v.f == d.f)),
        cancel: () => cancelar(d.f),
        fac: () => desglose(d.f),
        caja: () => (S.turno ? corte() : abrirCaja()),
        print: () => {
            try {
                print();
            } catch (_) {}
        },
        tema,
        salir,
        ojo: verClave,
        cuenta: () => menuCuenta(),
        perfil: () => irA('perfil'),
        contacto: () => irA('contacto'),
        ptab: () => {
            TABPERFIL = d.t;
            render();
        },
        pguardar,
        pclave,
        psexo: () => {
            SESION.sexo = d.v;
            render();
        },
        ptema: () => {
            aplicaTema(d.v === 'dark');
            render();
        },
        ccopiar,
        cenviar,
        provnew: () => provForm(),
        provedit: () => provForm(+d.i),
        pnew,
        padd,
        pdel: () => {
            S.nuevo.splice(+d.i, 1);
            ppaint();
        },
        pnext: () => pnext(d.id),
        pcan: () => pcan(d.id)
    };

    acciones[d.act]?.();
});

document.addEventListener('click', e => {
    if (!e.target.closest('.cuenta')) menuCuenta(false);
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') menuCuenta(false);
});

document.addEventListener('submit', entrar);

/*Arranque*/
document.documentElement.dataset.bsTheme = esOscuro() ? 'dark' : 'light';
iconoTema();
render();
$('#lu').focus();
