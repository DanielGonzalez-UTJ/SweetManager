
/*Datos de prueba,NOTA IMPORTANTE se reemplazara por la base de datos*/
const BD = {
    turno: null,
    ventas: [],
    fac: [],
    ped: [],
    pf: 1,
    folio: 1001,

    /*Productos de prueba*/
    prods: [
        { id: 1, n: 'Paleta espiral', c: 'Paletas', p: 8, s: 120, m: 30, e: '' },
        { id: 2, n: 'Paleta enchilada', c: 'Paletas', p: 10, s: 14, m: 30, e: ''},
        { id: 3, n: 'Chocolate de leche', c: 'Chocolates', p: 18, s: 60, m: 20, e: ''},
        { id: 4, n: 'Barra almendra', c: 'Chocolates', p: 25, s: 0, m: 15, e: ''},
        { id: 5, n: 'Gomitas ositos 100g', c: 'Gomitas', p: 22, s: 45, m: 20, e: ''},
        { id: 6, n: 'Gomitas ácidas', c: 'Gomitas', p: 24, s: 9, m: 20, e: '' },
        { id: 7, n: 'Caramelo macizo', c: 'Caramelos', p: 2, s: 400, m: 100, e: '' },
        { id: 8, n: 'Menta bolsa', c: 'Caramelos', p: 15, s: 70, m: 25, e: '' },
        { id: 9, n: 'Chicle globo', c: 'Chicles', p: 3, s: 250, m: 80, e: '' },
        { id: 10, n: 'Malvaviscos', c: 'Gomitas', p: 28, s: 33, m: 15, e: '️' },
        { id: 11, n: 'Bolsa fiesta 1kg', c: 'Mayoreo', p: 140, s: 18, m: 10, e: '' },
        { id: 12, n: 'Piñata surtida', c: 'Mayoreo', p: 260, s: 6, m: 8, e: '' }
    ],

    /*Registro provisional de proveedores*/
    prov: [
        { n: 'Dulces del Valle', tel: '33 1234 5678', items: 'Paletas, caramelos', st: 'Activo' },
        { n: 'Choco Distribuciones', tel: '33 8765 4321', items: 'Chocolates, barras', st: 'Activo' },
        { n: 'Gomitas Mexicanas', tel: '33 5555 0101', items: 'Gomitas, malvaviscos', st: 'Pedido pendiente' }
    ]
};
