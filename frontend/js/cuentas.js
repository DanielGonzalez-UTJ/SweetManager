/*Roles y pantallas permitidas, el usuario real llega de la base de datos al iniciar sesión*/
const ROLES = {
    admin: 'Administrador',
    cajero: 'Cajero',
    almacenista: 'Almacenista',
    
};
/*Mostrar mensaje ya cuando se desactive la cuenta, de que no tiene acceco a la plataforma */
/*Pantallas por rol, la primera es la de inicio*/
const PERMISOS = {
    admin: ['dashboard', 'ventas', 'facturas', 'proveedores','inventario', 'usuarios', 'perfil', 'contacto', 'nosotros'],
    cajero: ['venta', 'pedidos', 'ventas', 'facturas', 'perfil', 'contacto', 'nosotros'],
    almacenista: ['perfil', 'contacto', 'nosotros']
};

let SESION = null;

function puede(vista) {
    return !SESION || PERMISOS[SESION.rol].includes(vista);
}

/*Solo el administrador cancela ventas y genera reportes*/
function esAdmin() {
    return !!SESION && SESION.rol === 'admin';
}
