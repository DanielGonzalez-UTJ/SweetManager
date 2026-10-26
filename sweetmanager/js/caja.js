// CAJA: cobro, ticket, turno, cancelaciones y efectos
function modal(t, h, okTxt, fn, cx) {
    dt.textContent = t;
    $('#db').innerHTML = h;

    const b = $('#dok');
    b.style.display = okTxt ? '' : 'none';

    if (okTxt) {
        b.textContent = okTxt;
        b.onclick = fn;
    }

    $('#dcx').textContent = cx || 'Cerrar';
    dlg.showModal();
}

const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

const lineas = (it, t) => it.map(i => `<div class="row"><span>${i.q} × ${i.n}</span><span>${money(i.q * i.p)}</span></div>`).join('') +
    `<hr><div class="row"><span>Subtotal</span><span>${money(t / 1.16)}</span></div><div class="row"><span>IVA 16%</span><span>${money(t - t / 1.16)}</span></div><div class="row"><b>TOTAL</b><b>${money(t)}</b></div>`;

function venta(items, pay, rec, fact) {
    const t = items.reduce((a, i) => a + i.q * i.p, 0);
    const d = new Date();
    const v = {
        f: S.folio++,
        t,
        pay,
        h: hora(),
        hr: d.getHours(),
        ts: d.getTime(),
        n: items.reduce((a, i) => a + i.q, 0),
        items,
        rec: pay === 'Efectivo' ? rec : t,
        st: 'ok'
    };

    items.forEach(i => {
        S.prods.find(p => p.id == i.id).s -= i.q;
    });

    S.ventas.push(v);

    if (fact) {
        S.fac.unshift({ f: 'F-' + v.f, t, h: v.h, items });
    }

    return v;
}

function cobrar() {
    if (!S.turno) return abrirCaja();

    const t = total();
    const c = S.recv === '' ? t : +S.recv;

    if (S.pay === 'Efectivo' && c < t) return toast('El efectivo recibido no cubre el total');

    const v = venta(S.cart.map(l => ({ id: l.p.id, n: l.p.n, q: l.q, p: l.p.p })), S.pay, c, S.fact);
    S.cart = [];
    S.recv = '';
    S.fact = false;

    render();
    ticket(v);
}

function nueva() {
    dlg.close();
    S.view = 'venta';
    render();
    $('#q')?.focus();
}

function ticket(v) {
    modal(
        'Ticket #' + v.f,
        `<div class="rcpt"><center><b>SweetManager</b><br>${v.h} · ${v.pay}${v.ped ? '<br>Pedido ' + v.ped : ''}</center><hr>${lineas(v.items, v.t)}<div class="row"><span>Recibido</span><span>${money(v.rec)}</span></div><div class="row"><span>Cambio</span><b>${money(Math.max(0, v.rec - v.t))}</b></div><hr><center>Precios con IVA 16% incluido<br>¡Gracias por tu compra!</center></div><button class="btn" style="margin-top:10px" data-act="print"> Imprimir</button>`,
        'Nueva venta',
        nueva,
        'Cerrar'
    );
}

function desglose(id) {
    const f = S.fac.find(x => x.f === id);
    modal(
        'Factura ' + id,
        `<div class="rcpt"><b>Receptor:</b> Público en general<br>RFC XAXX010101000 · ${f.h}<hr>${lineas(f.items || [], f.t)}</div>`,
        null,
        null,
        'Cerrar'
    );
}

function abrirCaja() {
    modal(
        'Abrir caja',
        '<label>Fondo inicial en efectivo</label><input class="f" id="fo" type="number" inputmode="decimal" value="500">',
        'Abrir caja',
        () => {
            const f = +$('#fo').value;
            if (isNaN(f) || f < 0) return toast('Escribe un fondo válido');

            S.turno = { fondo: f, ini: hora(), ts: Date.now() };
            dlg.close();
            toast('Caja abierta');
            render();
        },
        'Ahora no'
    );
}

function corte() {
    const V = ok();
    const efe = V.filter(v => v.pay === 'Efectivo').reduce((a, v) => a + v.t, 0);
    const tj = V.reduce((a, v) => a + v.t, 0) - efe;
    const esp = S.turno.fondo + efe;

    modal(
        'Corte de caja',
        `<div class="row"><span>Fondo inicial</span><b>${money(S.turno.fondo)}</b></div><div class="row"><span>Ventas en efectivo</span><b>${money(efe)}</b></div><div class="row"><span>Ventas con tarjeta</span><b>${money(tj)}</b></div><div class="row"><span>Efectivo esperado</span><b style="color:var(--sweet-pink)">${money(esp)}</b></div><label>Efectivo contado</label><input class="f" id="ct" type="number" inputmode="decimal">`,
        'Cerrar caja',
        () => {
            const r = $('#ct').value;
            const c = +r;

            if (r === '' || isNaN(c)) return toast('Escribe el efectivo contado');

            const d = c - esp;
            S.turno = null;
            S.ventas = [];
            dlg.close();
            toast(d === 0 ? 'Caja cuadrada ' : (d > 0 ? 'Sobrante ' : 'Faltante ') + money(Math.abs(d)));
            render();
        }
    );
}

function cancelar(f) {
    const v = S.ventas.find(x => x.f == f);

    modal(
        'Cancelar venta #' + f,
        `<p>Se devolverán ${v.n} piezas al inventario y se anulará la factura si existe. Total: <b>${money(v.t)}</b>.</p>`,
        'Sí, cancelar',
        () => {
            v.items.forEach(i => {
                const p = S.prods.find(x => x.id == i.id);
                if (p) p.s += i.q;
            });
            v.st = 'cancelada';
            S.fac = S.fac.filter(x => x.f !== 'F-' + f);
            dlg.close();
            toast('Venta cancelada');
            render();
        },
        'Volver'
    );
}

function fx() {
    const v = $('#view');
    $('#np').textContent = activos().length || '';

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