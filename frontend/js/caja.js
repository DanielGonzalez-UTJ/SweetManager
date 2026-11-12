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
            <div class="rcpt">
                <center><b>SweetManager</b><br>${v.h} · ${v.pay}${v.ped ? '<br>Pedido ' + v.ped : ''}</center>
                <hr>
                ${lineas(v.items, v.t)}
                <div class="fila"><span>Recibido</span><span>${money(v.rec)}</span></div>
                <div class="fila"><span>Cambio</span><b>${money(Math.max(0, v.rec - v.t))}</b></div>
                <hr>
                <center>Precios con IVA 16% incluido<br>¡Gracias por tu compra!</center>
            </div>
            <button class="btn btn-ico mt-2" disabled title="En proceso">
                <span class="material-symbols-rounded">print</span>Imprimir (en proceso)
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