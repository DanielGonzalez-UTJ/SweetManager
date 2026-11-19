/*Pedidos (colas de pedidos)*/
//Mejorar lo estados de los pedido, ejemplo una checklist de estados, para que se pueda ver el progreso de cada pedido y no solo 3 estados. Pendiente, Preparando, Listo, Entregado, Cancelado.
/*Validar fecha hora, que no sean anteriores a la actual
  validar de existencia antes de generar el pedido (botón generar) */
const ESTADOS = {
    esperando_abastecimiento: ['Esperando mercancía', 'w', 'Esperando recepción'],
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
    const solicitudes = S.solicitudes || [];
    return `<div class="bar"><button class="btn pk" data-act="pnew">+ Nuevo pedido</button></div>` +
        (solicitudes.length ? `<div class="card mb-3"><h3>Mis solicitudes de abastecimiento</h3>${solicitudes.map(x => `<div class="fila py-2"><span><b>SA-${String(x.id).padStart(5,'0')}</b> · ${x.items.map(i=>i.producto+' × '+i.cantidad).join(', ')}</span><span class="b ${x.estado==='confirmada'?'ok':'w'}">${x.estado.replace('_',' ')}</span></div>${x.respuesta_admin ? `<small class="mut">${esc(x.respuesta_admin)}</small>`:''}`).join('')}</div>` : '') +
        colaPedidos().aArreglo().map((o, i) => `
            <div class="card ped ${o.ent < Date.now() ? 'late' : ''}">
                <div class="pos-n">${i + 1}</div>
                <div class="pb">
                    <div class="fila">
                        <b>${esc(o.cliente)}</b>
                        <span>
                            ${i === 0 ? '<span class="b" style="background: var(--sweet-pink)">Siguiente</span>' : ''}
                            <span class="b ${ESTADOS[o.st][1]}">${ESTADOS[o.st][0]}</span>
                        </span>
                    </div>
                    <div class="mut">${o.folio} · ${esc(o.tel || 'Sin teléfono')} · <b>${cuando(o.ent)}</b></div>
                    <div class="my-2">${o.items.map(x => o.st==='preparando' ? `<label class="d-flex align-items-center gap-2 py-1"><input type="checkbox" data-act="pcheck" data-pedido="${o.id}" data-producto="${x.id}" ${x.preparado?'checked':''}><span>${x.q} × ${esc(x.n)}</span></label>` : `<div>${x.q} × ${esc(x.n)}</div>`).join('')}</div>
                    ${o.nota ? `<div class="mut"> ${esc(o.nota)}</div>` : ''}
                    <div class="fila">
                        <b>${money(o.t)}</b>
                        <span>
                            <button class="btn" style="background:var(--err)" data-act="pcan" data-id="${o.id}">Cancelar</button>
                            ${o.st !== 'esperando_abastecimiento' ? `<button class="btn ${o.st === 'listo' ? 'pk' : 'cy'}" data-act="pnext" data-id="${o.id}">${ESTADOS[o.st][2]}</button>` : '<small class="text-warning">Pendiente de recepción física</small>'}
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
    const min = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    
    modal(
        'Nuevo pedido',
        `<label>Nombre de quien encarga</label>
            <input class="form-control" id="pn">
            <label>Teléfono</label>
            <input class="form-control" id="pt" type="tel" inputmode="numeric" maxlength="10" placeholder="10 dígitos">
            <label>Fecha y hora de entrega</label>
            <input class="form-control" id="pe" type="datetime-local" min="${min}" value="${v}">
            <label>Productos</label>
            <div style="display:flex;gap:6px">
            <select class="form-select" id="pp">${S.prods.map(p => `<option value="${p.id}">${esc(p.n)} · ${money(p.p)}</option>`).join('')}</select>
            <input class="form-control" id="pq" type="number" min="1" value="1" style="width:72px">
            <button class="btn cy" data-act="padd">+</button>
        </div>
        <div id="pl"></div>
            <button type="button" class="btn cy mt-2" data-act="psolicitar">Solicitar productos faltantes al administrador</button>
            <label>Nota (opcional)</label>
        <input class="form-control" id="po">`,
        'Guardar pedido',
        async () => {
            const n = $('#pn').value.trim();
            const e = $('#pe').value;

            if (!n) return toast('Escribe el nombre de quien encarga');
            const tel = $('#pt').value.trim().replace(/\D/g, '');
            if ($('#pt').value.trim() && !/^\d{10}$/.test(tel)) return toast('El teléfono debe tener exactamente 10 dígitos');
            if (new Date(e).getTime() <= Date.now()) return toast('La fecha y hora deben ser posteriores a este momento');
            if (!S.nuevo.length) return toast('Agrega al menos un producto');
            if (!e) return toast('Elige fecha y hora de entrega');

            await api('pedidos.php', 'POST', {
                accion: 'crear',
                cliente: n,
                telefono: tel,
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
            <span>${i.q} × ${esc(i.n)}<small class="d-block ${i.q > (buscarProducto(i.id)?.s ?? 0) ? 'text-danger' : 'text-success'}">Disponible: ${buscarProducto(i.id)?.s ?? 0}</small></span>
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

async function psolicitar() {
    const cliente=$('#pn').value.trim(); const entrega=$('#pe').value;
    const telefono=$('#pt').value.trim().replace(/\D/g,'');
    if (!cliente) return toast('Escribe el nombre del cliente');
    if (telefono && !/^\d{10}$/.test(telefono)) return toast('El teléfono debe tener exactamente 10 dígitos');
    if (!entrega || new Date(entrega).getTime() <= Date.now()) return toast('Selecciona una fecha y hora futura');
    if (!S.nuevo.length) return toast('Agrega los productos que necesita el cliente');
    try {
        const r=await api('index.php?ruta=abastecimiento','POST',{accion:'solicitar',cliente,telefono,entrega,nota:$('#po').value.trim(),items:S.nuevo.map(i=>({id:i.id,q:i.q}))});
        dlg.close(); await recarga(); toast('Solicitud SA-'+String(r.id).padStart(5,'0')+' enviada al administrador');
    } catch(e) { toast(e.message); }
}

async function marcarItemPreparado(pedido,producto,preparado){
    try{await api('pedidos.php','POST',{accion:'checklist',id:pedido,producto_id:producto,preparado});await recarga();}
    catch(e){toast(e.message);await recarga();}
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
        `<p>Se cancelará el pedido de <b>${esc(o.cliente)}</b>.</p>`,
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

    const f = encuentraLineal(
        o.items,
        i => buscarProducto(i.id).s < i.q
    );

    if (f) return toast('Falta existencia de ' + f.n);

    modal(
        'Entregar ' + o.folio,

        `
        <p>
            <b>${esc(o.cliente)}</b> · Total
            <b>${money(o.t)}</b>
        </p>

        <label>Forma de pago</label>
        <select class="form-select" id="ep">
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
        </select>

        <div id="contenedor-efectivo">
            <label>Efectivo recibido</label>
            <input
                class="form-control"
                id="er"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ingresa el efectivo recibido"
            >
        </div>

        <div class="form-check mt-2">
            <input
                type="checkbox"
                id="ef"
                checked
            >
            <label for="ef">Generar factura</label>
        </div>
        `,

        'Cobrar y entregar',

        async () => {
            const pay = $('#ep').value;
            const efectivo = $('#er').value;
            const r = Number(efectivo);

            if (
                pay === 'Efectivo' &&
                (efectivo === '' || !Number.isFinite(r) || r < o.t)
            ) {
                return toast(
                    'El efectivo recibido debe cubrir el total'
                );
            }

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

    // Mostrar u ocultar efectivo según la forma de pago
    const formaPago = $('#ep');
    const contenedorEfectivo = $('#contenedor-efectivo');

    const actualizarEfectivo = () => {
        contenedorEfectivo.style.display =
            formaPago.value === 'Tarjeta' ? 'none' : '';
    };

    formaPago.addEventListener('change', actualizarEfectivo);

    actualizarEfectivo();
}
