/*Usuarios de prueba  , el almacenista usa la app móvil*/
const USUARIOS = [
    {
        id: 1,
        nombre: 'Ana López',
        usuario: 'alopez',
        clave: '1234',
        correo: 'ana.lopez@dulceria.com',
        telefono: '33 1111 2222',
        rol: 'admin',
        sexo: 'mujer',
        ultimo: null
    },
    {
        id: 2,
        nombre: 'Juan Pérez',
        usuario: 'jperez',
        clave: '1234',
        correo: 'juan.perez@dulceria.com',
        telefono: '33 1234 5678',
        rol: 'cajero',
        sexo: 'hombre',
        ultimo: null
    }
];

const ROLES = {
    admin: 'Administrador',
    cajero: 'Cajero'
};

/*Pantallas por rol, la primera es la de inicio*/
const PERMISOS = {
    admin: ['dashboard', 'ventas', 'facturas', 'proveedores', 'perfil', 'contacto'],
    cajero: ['venta', 'pedidos', 'ventas', 'facturas', 'perfil', 'contacto']
};

let SESION = null;

/*Valida el usuario y guarda el acceso anterior*/
function login(usuario, clave) {
    const u = USUARIOS.find(x => x.usuario === usuario && x.clave === clave);

    if (!u) return false;

    SESION = u;
    SESION.anterior = u.ultimo;
    u.ultimo = new Date();
    return true;
}

function puede(vista) {
    return !SESION || PERMISOS[SESION.rol].includes(vista);
}
