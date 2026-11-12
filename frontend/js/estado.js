/*Utilidades y estado de la pantalla*/
const $ = s => document.querySelector(s);
const money = n => '$' + n.toFixed(2);

/*Zona horaria de SweetManager (como esta en el php de conexion)*/
const ZONA_HORARIA = 'America/Mexico_City';

/*Formato de fecha y hora de México*/
const fechaMX = (fecha, opciones = {}) => new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA_HORARIA,
    ...opciones
}).format(fecha);

/*Solo hora*/
const horaMX = fecha => fechaMX(fecha, {
    hour: '2-digit',
    minute: '2-digit'
});

/*Solo fecha*/
const soloFechaMX = fecha => fechaMX(fecha, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

/*Fecha y hora completas*/
const fechaHoraMX = fecha => fechaMX(fecha, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});


/*Información que necesita el sistema :) */
const S = {
    view: 'dashboard',
    cat: 'Todos', //categoria de productos seleccionada
    q: '', //Texto de búsqueda
    cart: [], //Productos en el carrito de venta
    pay: 'Efectivo', //Método de pago seleccionado
    fact: true, //Si se va a generar factura o no
    recv: '', //Efectivo recibido
    prods: [],//Productos de la base de datos
    prov: [], //Proveedores de la base de datos
    ventas: [], //Ventas de la base de datos
    fac: [], //Facturas de la base de datos
    ped: [], //Pedidos de la base de datos
    turno: null //Turno actual
};
