// Arranque: rutas, acciones y primer render
const T = {
    dashboard: ['Dashboard', vDash],
    venta: ['Punto de venta', vVenta],
    pedidos: ['Pedidos', vPed],
    ventas: ['Ventas del día', vVentas],
    inventario: ['Existencias', vInv],
    facturas: ['Facturación', vFac],
    proveedores: ['Proveedores', vProv]
};

document.addEventListener('click', e => {
    const x = e.target.closest('[data-act]');
    if (!x) return;

    const d = x.dataset;

    ({
        ticket: () => ticket(S.ventas.find(v => v.f == d.f)),
        cancel: () => cancelar(d.f),
        fac: () => desglose(d.f),
        caja: () => S.turno ? corte() : abrirCaja(),
        print: () => {
            try {
                print();
            } catch (_) {}
        },
        pnew,
        padd,
        pdel: () => {
            S.nuevo.splice(+d.i, 1);
            ppaint();
        },
        pnext: () => pnext(d.id),
        pcan: () => pcan(d.id)
    })[d.act]?.();
});

render();