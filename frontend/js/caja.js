/*CAJA: cobro, ticket, turno, cancelaciones y efectos*/
function modal(t, h, okTxt, fn, cx) {
    dt.textContent = t;
    $('#db').innerHTML = h;

    const b = $('#dok');
    b.style.display = okTxt ? '' : 'none';

    if (okTxt) {
        b.textContent = okTxt;
        b.onclick = () => seguro(fn);
    }

    $('#dcx').textContent = cx || 'Cerrar';
    if (!dlg.open) dlg.showModal();
}

const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const lineas = (it, t) => {
    const filas = it.map(i => `
        <div class="fila"><span>${i.q} × ${i.n}</span><span>${money(i.q * i.p)}</span></div>
    `).join('');

    return `
        ${filas}
        <hr>
        <div class="fila"><span>Subtotal</span><span>${money(t / 1.16)}</span></div>
        <div class="fila"><span>IVA 16%</span><span>${money(t - t / 1.16)}</span></div>
        <div class="fila"><b>TOTAL</b><b>${money(t)}</b></div>
    `;
};

/*Evita cobrar dos veces si se toca el botón varias veces*/
let COBRANDO = false;

async function cobrar() {
    if (!S.turno) return abrirCaja(cobrar);
    if (COBRANDO) return;

    const t = total();

    if (S.pay === 'Efectivo') {
        if (S.recv === '' || isNaN(+S.recv)) return toast('Escribe el efectivo recibido');
        if (+S.recv < t) return toast('El efectivo recibido no cubre el total');
    }

    COBRANDO = true;

    try {
        const r = await api('ventas.php', 'POST', {
            accion: 'crear',
            items: S.cart.map(l => ({ id: l.p.id, q: l.q })),
            pago: S.pay,
            recibido: S.pay === 'Efectivo' ? +S.recv : t,
            factura: S.fact
        });

        S.cart = [];
        S.recv = '';
        S.fact = false;
        S.historial.vaciar();
        registra('Venta #' + r.venta.f + ' por ' + money(r.venta.t));

        await recarga(false);
        ticket(r.venta);
        render();
    } finally {
        COBRANDO = false;
    }
}

function nueva() {
    dlg.close();
    S.view = 'venta';
    render();
    $('#q')?.focus();
}

/*Nodo del ticket que se está viendo, sirve para ir al anterior o al siguiente*/
let NODO_TICKET = null;

function ticket(v) {
    const lista = listaVentas();
    const nodo = lista.buscar(x => x.f === v.f);

    NODO_TICKET = nodo;

    const navegacion = nodo ? `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <button class="btn btn-ico" data-act="tprev" ${nodo.ant ? '' : 'disabled'}>
                <span class="material-symbols-rounded">chevron_left</span>Anterior
            </button>
            <small class="mut">Ticket ${lista.posicion(nodo)} de ${lista.largo}</small>
            <button class="btn btn-ico" data-act="tnext" ${nodo.sig ? '' : 'disabled'}>
                Siguiente<span class="material-symbols-rounded">chevron_right</span>
            </button>
        </div>
    ` : '';

    modal(
        'Ticket #' + v.f,
        `
            ${navegacion}

            <!-- Ticket visual original -->
            <div class="rcpt">
                <center>
                    <b>SweetManager</b><br>
                    ${v.h} · ${v.pay}
                    ${v.ped ? '<br>Pedido ' + v.ped : ''}
                </center>
                <hr>
                ${lineas(v.items, v.t)}
                <div class="fila">
                    <span>Recibido</span>
                    <span>${money(v.rec)}</span>
                </div>
                <div class="fila">
                    <span>Cambio</span>
                    <b>${money(Math.max(0, v.rec - v.t))}</b>
                </div>
                <hr>
                <center>
                    Precios con IVA 16% incluido<br>
                    ¡Gracias por tu compra!
                </center>
            </div>

            <!-- Versión independiente para impresión -->
            <div style="position:absolute; left:-10000px; top:0;">
                <div class="rcpt-ticket" id="ticket-print">
                    <header class="ticket-encabezado">
                        <strong>SWEETMANAGER</strong>
                        <span>PUNTO DE VENTA</span>
                        <span>Gracias por tu preferencia</span>
                    </header>
                    <hr>
                    <div class="ticket-dato">
                        <span>FECHA:</span>
                        <b>${v.h}</b>
                    </div>
                    <div class="ticket-dato">
                        <span>TICKET #:</span>
                        <b>${v.f}</b>
                    </div>
                    ${v.ped ? `
                    <div class="ticket-dato">
                        <span>PEDIDO:</span><b>${v.ped}</b>
                    </div>` : ''}
                    <div class="ticket-dato">
                        <span>FORMA DE PAGO:</span>
                        <b>${v.pay}</b>
                    </div>
                    <hr>
                    <div class="ticket-columnas">
                        <b>CANT.</b>
                        <b>DESCRIPCIÓN</b>
                        <b>IMPORTE</b>
                    </div>
                    ${v.items.map(i => `
                        <div class="ticket-producto">
                            <span>${i.q}</span>
                            <span>${i.n}</span>
                            <span>${money(i.q * i.p)}</span>
                        </div>
                    `).join('')}
                    <hr>
                    <div class="ticket-total">
                        <span>SUBTOTAL:</span>
                        <b>${money(v.t / 1.16)}</b>
                    </div>
                    <div class="ticket-total">
                        <span>IVA 16%:</span>
                        <b>${money(v.t - v.t / 1.16)}</b>
                    </div>
                    <div class="ticket-total destacado">
                        <span>TOTAL:</span>
                        <b>${money(v.t)}</b>
                    </div>
                    <div class="ticket-total">
                        <span>PAGO CON:</span>
                        <b>${money(v.rec)}</b>
                    </div>
                    <div class="ticket-total">
                        <span>SU CAMBIO:</span>
                        <b>${money(Math.max(0, v.rec - v.t))}</b>
                    </div>
                    <hr>
                    <footer>
                        ¡GRACIAS POR SU COMPRA!<br>
                        Vuelva pronto
                    </footer>
                </div>
            </div>

            <button class="btn btn-ico mt-2" data-act="print-ticket">
                <span class="material-symbols-rounded">print</span>
                Imprimir ticket
            </button>
        `,
        'Nueva venta',
        nueva,
        'Cerrar'
    );
}

function ticketVecino(direccion) {
    const vecino = NODO_TICKET && NODO_TICKET[direccion];

    if (vecino) ticket(vecino.dato);
}

/*Imprime únicamente el comprobante, con formato para rollo térmico de 80 mm*/
function imprimirTicket() {
    const contenido = document.getElementById('ticket-print');
    if (!contenido) return toast('No se encontró el ticket para imprimir');

    const ventana = window.open('', '_blank', 'width=420,height=720');
    if (!ventana) return toast('Permite las ventanas emergentes para imprimir el ticket');

    ventana.document.open();
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
        <title>Ticket SweetManager</title>
        <style>
            @page { size: 80mm auto; margin: 4mm; }
            * { box-sizing: border-box; }
            body { width: 72mm; margin: 0 auto; color: #000; background: #fff;
                font: 11px "Courier New", monospace; }
            .rcpt-ticket { width: 100%; padding: 0; background: #fff; color: #000; }
            .ticket-encabezado, footer { display:flex; flex-direction:column; text-align:center; gap:3px; }
            .ticket-encabezado strong { font: bold 22px Georgia,serif; }
            .ticket-encabezado span, footer { font-size:11px; }
            hr { border:0; border-top:1px dashed #000; margin:9px 0; }
            .ticket-dato, .ticket-total { display:flex; justify-content:space-between; gap:8px; margin:4px 0; }
            .ticket-dato b { text-align:right; }
            .ticket-columnas, .ticket-producto { display:grid; grid-template-columns: 12% 1fr 27%; gap:4px; margin:5px 0; }
            .ticket-columnas { border-bottom:1px dashed #000; padding-bottom:5px; }
            .ticket-producto span:last-child, .ticket-columnas b:last-child { text-align:right; }
            .ticket-total { font-size:12px; font-weight:bold; }
            .ticket-total.destacado { font-size:17px; margin-top:8px; }
            footer { margin-top:14px; line-height:1.6; }
            @media print { body { width:72mm; } }
        </style></head><body>${contenido.outerHTML}</body></html>`);
    ventana.document.close();
    ventana.onload = () => { ventana.focus(); ventana.print(); ventana.close(); };
}

function desglose(id) {
    const f = buscarFactura(id);
    modal(
        'Factura ' + id,
        `<div class="rcpt"><b>Receptor:</b> Público en general<br>RFC XAXX010101000 · ${f.h}<hr>${lineas(f.items || [], f.t)}</div>`,
        null,
        null,
        'Cerrar'
    );
}

function abrirCaja(luego) {
    modal(
        'Abrir caja',
        '<label>Fondo inicial en efectivo</label><input class="form-control" id="fo" type="number" inputmode="decimal" value="500">',
        'Abrir caja',
        async () => {
            const f = +$('#fo').value;

            if (isNaN(f) || f < 0) return toast('Escribe un fondo válido');

            await api('turnos.php', 'POST', { accion: 'abrir', fondo: f });

            dlg.close();
            toast('Caja abierta');
            registra('Abrió la caja con ' + money(f));
            await recarga();

            if (typeof luego === 'function') seguro(luego);
        },
        'Ahora no'
    );
}

async function corte() {
    const { resumen: r } = await api('turnos.php');

    modal(
        'Corte de caja',
        `
            <div class="fila"><span>Fondo inicial</span><b>${money(r.fondo)}</b></div>
            <div class="fila"><span>Ventas en efectivo</span><b>${money(r.efectivo)}</b></div>
            <div class="fila"><span>Ventas con tarjeta</span><b>${money(r.tarjeta)}</b></div>
            <div class="fila"><span>Efectivo esperado</span><b style="color: var(--sweet-pink)">${money(r.esperado)}</b></div>
            <label>Efectivo contado</label>
            <input class="form-control" id="ct" type="number" inputmode="decimal">
        `,
        'Cerrar caja',
        async () => {
            const v = $('#ct').value;
            const c = +v;

            if (v === '' || isNaN(c)) return toast('Escribe el efectivo contado');

            const res = await api('turnos.php', 'POST', { accion: 'cerrar', contado: c });
            const d = res.diferencia;

            registra('Cerró la caja, diferencia ' + money(d));
            dlg.close();
            toast(d === 0 ? 'Caja cuadrada' : (d > 0 ? 'Sobrante ' : 'Faltante ') + money(Math.abs(d)));
            await recarga();
        }
    );
}

function cancelar(f) {
    if (!esAdmin()) return toast('Solo el administrador puede cancelar ventas');

    const v = buscarVenta(f);

    modal(
        'Cancelar venta #' + f,
        `<p>Se devolverán ${v.n} piezas al inventario y se anulará la factura si existe. Total: <b>${money(v.t)}</b>.</p>`,
        'Sí, cancelar',
        async () => {
            await api('ventas.php', 'POST', { accion: 'cancelar', id: v.f });

            registra('Canceló la venta #' + f);
            dlg.close();
            toast('Venta cancelada');
            await recarga();
        },
        'Volver'
    );
}

function fx() {
    const v = $('#view');
    const np = $('#np');
    actualizaCabecera();
    if (np) np.textContent = activos().length || '';

    if (S.last !== S.view) {
        S.last = S.view;
        v.classList.remove('enter');
        void v.offsetWidth;
        v.classList.add('enter');

        document.querySelectorAll('[data-count]').forEach(e => {
            const to = +e.dataset.count;
            const m = e.dataset.m === '1';
            const t0 = performance.now();

            (function f(t) {
                const k = Math.min(1, (t - t0) / 800);
                const val = to * (1 - Math.pow(1 - k, 3));
                e.textContent = m ? money(val) : Math.round(val);
                if (k < 1) requestAnimationFrame(f);
            })(t0);
        });
    }

    if (S.pop) {
        document.querySelectorAll(`[data-add="${S.pop}"],.line[data-id="${S.pop}"]`).forEach(e => e.classList.add('pop'));
        S.pop = null;
    }
}