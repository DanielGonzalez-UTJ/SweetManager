/*Pedidos (colas de pedidos)*/
//Mejorar lo estados de los pedido, ejemplo una checklist de estados, para que se pueda ver el progreso de cada pedido y no solo 3 estados. Pendiente, Preparando, Listo, Entregado, Cancelado.
const ESTADOS = {
    pendiente: ['Pendiente', 'p', 'Empezar a preparar'],
    preparando: ['Preparando', 'i', 'Marcar como listo'],
    listo: ['Listo', 'ok', 'Entregar y cobrar'],
    entregado: ['Entregado', 'ok', 'Marcar como entregado'],
    cancelado: ['Cancelado', 'err', 'Marcar como cancelado']
};

/*Sin function flecha 
function activos() {
    return ordenaBurbuja(
        filtraLineal(S.ped, function(o) {
            return ESTADOS[o.st];
        }),
        function(a, b) {
            return a.ent - b.ent || a.id - b.id;
        }
    );
}
 */
//Crea una constante activos que almacena una función

/*Pedidos activos ordenados por fecha de entrega con burbuja*/

const activos = () => ordenaBurbuja(
    filtraLineal(S.ped, o => ESTADOS[o.st]), //o representa el pedido
    (a, b) => a.ent - b.ent || a.id - b.id //Pedidos que se estan comparando (a,b), hora de entrada (ent), identificadores
);

/*Cola de atención, el primero en la cola es el siguiente pedido a preparar*/
function colaPedidos() {
    const cola = new Cola();

    activos().forEach(o => cola.encolar(o));
    return cola;
}

function cuando(ts) {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    const dd = Math.round((new Date(ts).setHours(0, 0, 0, 0) - h) / 864e5);
    const d = new Date(ts);
    
    return (dd < 0 ? 'Atrasado' : dd === 0 ? 'Hoy' : dd === 1 ? 'Mañana' : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })) + ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function vPed() {
    return `<div class="bar"><button class="btn pk" data-act="pnew">+ Nuevo pedido</button></div>` +
        colaPedidos().aArreglo().map((o, i) => `
            <div class="card ped ${o.ent < Date.now() ? 'late' : ''}">
                <div class="pos-n">${i + 1}</div>
                <div class="pb">
                    <div class="fila">
                        <b>${o.cliente}</b>
                        <span>
                            ${i === 0 ? '<span class="b" style="background: var(--sweet-pink)">Siguiente</span>' : ''}
                            <span class="b ${ESTADOS[o.st][1]}">${ESTADOS[o.st][0]}</span>
                        </span>
                    </div>
                    <div class="mut">${o.folio} · ${o.tel || 'Sin teléfono'} · <b>${cuando(o.ent)}</b></div>
                    <div style="margin:6px 0">${o.items.map(x => x.q + ' × ' + x.n).join(', ')}</div>
                    ${o.nota ? `<div class="mut"> ${o.nota}</div>` : ''}
                    <div class="fila">
                        <b>${money(o.t)}</b>
                        <span>
                            <button class="btn" style="background:var(--err)" data-act="pcan" data-id="${o.id}">Cancelar</button>
                            <button class="btn ${o.st === 'listo' ? 'pk' : 'cy'}" data-act="pnext" data-id="${o.id}">${ESTADOS[o.st][2]}</button>
                        </span>
                    </div>
                </div>
            </div>
        `).join('') || '<div class="card empty">No hay pedidos pendientes. Usa “Nuevo pedido” cuando alguien encargue para otro día.</div>';
}

function pnew() {
    S.nuevo = [];
    const m = new Date(Date.now() + 864e5);
    m.setHours(10, 0, 0, 0);
    const v = new Date(m - m.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    
    modal(
        'Nuevo pedido',
        `<label>Nombre de quien encarga</label>
            <input class="form-control" id="pn">
            <label>Teléfono</label>
            <input class="form-control" id="pt" type="tel" inputmode="tel">
            <label>Fecha y hora de entrega</label>
            <input class="form-control" id="pe" type="datetime-local" value="${v}">
            <label>Productos</label>
            <div style="display:flex;gap:6px">
            <select class="form-select" id="pp">${S.prods.map(p => `<option value="${p.id}">${p.n} · ${money(p.p)}</option>`).join('')}</select>
            <input class="form-control" id="pq" type="number" min="1" value="1" style="width:72px">
            <button class="btn cy" data-act="padd">+</button>
        </div>
        <div id="pl"></div>
            <label>Nota (opcional)</label>
        <input class="form-control" id="po">`,
        'Guardar pedido',
        async () => {
            const n = $('#pn').value.trim();
            const e = $('#pe').value;

            if (!n) return toast('Escribe el nombre de quien encarga');
            if (!S.nuevo.length) return toast('Agrega al menos un producto');
            if (!e) return toast('Elige fecha y hora de entrega');

            await api('pedidos.php', 'POST', {
                accion: 'crear',
                cliente: n,
                telefono: $('#pt').value.trim(),
                entrega: e,
                nota: $('#po').value.trim(),
                items: S.nuevo.map(i => ({ id: i.id, q: i.q }))
            });

            dlg.close();
            toast('Pedido guardado');
            await recarga();
        }
    );
}

function ppaint() {
    const t = S.nuevo.reduce((a, i) => a + i.q * i.p, 0);
    $('#pl').innerHTML = S.nuevo.map((i, k) => `
        <div class="fila" style="padding:6px 0;border-bottom:1px dashed var(--border)">
            <span>${i.q} × ${i.n}</span>
            <span>${money(i.q * i.p)} <button data-act="pdel" data-i="${k}" style="background:none;color:var(--err);font-weight:800">✕</button></span>
        </div>
    `).join('') + (t ? `<div class="fila" style="margin-top:6px"><b>Total</b><b>${money(t)}</b></div>` : '');
}

function padd() {
    const p = buscarProducto($('#pp').value);
    const q = Math.max(1, +$('#pq').value || 1);
    const l = encuentraLineal(S.nuevo, x => x.id === p.id);
    
    l ? l.q += q : S.nuevo.push({ id: p.id, n: p.n, q, p: p.p });
    ppaint();
}

async function pnext(id) {
    const o = buscarPedido(id);

    if (o.st === 'listo') return entregar(o);

    await api('pedidos.php', 'POST', {
        accion: 'estado',
        id: o.id,
        estado: o.st === 'pendiente' ? 'preparando' : 'listo'
    });
    await recarga();
}

function pcan(id) {
    const o = buscarPedido(id);

    modal(
        'Cancelar pedido ' + o.folio,
        `<p>Se cancelará el pedido de <b>${o.cliente}</b>.</p>`,
        'Sí, cancelar',
        async () => {
            await api('pedidos.php', 'POST', { accion: 'estado', id: o.id, estado: 'cancelado' });

            dlg.close();
            toast('Pedido cancelado');
            await recarga();
        },
        'Volver'
    );
}

function entregar(o) {
    if (!S.turno) return abrirCaja(() => entregar(o));
    const f = encuentraLineal(o.items, i => buscarProducto(i.id).s < i.q);
    if (f) return toast('Falta existencia de ' + f.n);
    
    modal(
        'Entregar ' + o.folio,
        `<p><b>${o.cliente}</b> · Total <b>${money(o.t)}</b></p>
        <label>Forma de pago</label>
        <select class="form-select" id="ep"><option>Efectivo</option><option>Tarjeta</option></select>
        <label>Efectivo recibido</label>
        <input class="form-control" id="er" type="number" inputmode="decimal">
        <label><input type="checkbox" id="ef" checked> Generar factura</label>`,
        'Cobrar y entregar',
        async () => {
            const pay = $('#ep').value;
            const r = +$('#er').value;

            if (pay === 'Efectivo' && ($('#er').value === '' || r < o.t)) return toast('Escribe el efectivo recibido; debe cubrir el total');
            if (COBRANDO) return;

            COBRANDO = true;

            try {
                const res = await api('ventas.php', 'POST', {
                    accion: 'crear',
                    pedido_id: o.id,
                    pago: pay,
                    recibido: pay === 'Efectivo' ? r : o.t,
                    factura: $('#ef').checked
                });

                registra('Pedido ' + o.folio + ' entregado');
                dlg.close();
                await recarga(false);
                ticket(res.venta);
                render();
            } finally {
                COBRANDO = false;
            }
        },
        'Volver'
    );
}