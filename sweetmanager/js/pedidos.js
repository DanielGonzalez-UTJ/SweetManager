//Pedidos (colas de pedidos)
const ESTADOS = {
    pendiente: ['Pendiente', 'p', 'Empezar a preparar'],
    preparando: ['Preparando', 'i', 'Marcar como listo'],
    listo: ['Listo', 'ok', 'Entregar y cobrar']
};

const activos = () => S.ped
    .filter(o => ESTADOS[o.st])
    .sort((a, b) => a.ent - b.ent || a.id - b.id);

function cuando(ts) {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    const dd = Math.round((new Date(ts).setHours(0, 0, 0, 0) - h) / 864e5);
    const d = new Date(ts);
    
    return (dd < 0 ? 'Atrasado' : dd === 0 ? 'Hoy' : dd === 1 ? 'Mañana' : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })) + ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function vPed() {
    return `<div class="bar"><button class="btn pk" data-act="pnew">+ Nuevo pedido</button></div>` +
        activos().map((o, i) => `
            <div class="card ped ${o.ent < Date.now() ? 'late' : ''}">
                <div class="pos-n">${i + 1}</div>
                <div class="pb">
                    <div class="row">
                        <b>${o.cliente}</b>
                        <span class="b ${ESTADOS[o.st][1]}">${ESTADOS[o.st][0]}</span>
                    </div>
                    <div class="mut">${o.folio} · ${o.tel || 'Sin teléfono'} · <b>${cuando(o.ent)}</b></div>
                    <div style="margin:6px 0">${o.items.map(x => x.q + ' × ' + x.n).join(', ')}</div>
                    ${o.nota ? `<div class="mut"> ${o.nota}</div>` : ''}
                    <div class="row">
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
          <input class="f" id="pn">
          <label>Teléfono</label>
          <input class="f" id="pt" type="tel" inputmode="tel">
          <label>Fecha y hora de entrega</label>
          <input class="f" id="pe" type="datetime-local" value="${v}">
          <label>Productos</label>
          <div style="display:flex;gap:6px">
              <select id="pp">${S.prods.map(p => `<option value="${p.id}">${p.e} ${p.n} ·${money(p.p)}</option>`).join('')}</select>
              <input class="f" id="pq" type="number" min="1" value="1" style="width:72px">
              <button class="btn cy" data-act="padd">+</button>
          </div>
          <div id="pl"></div>
          <label>Nota (opcional)</label>
          <input class="f" id="po">`,
        'Guardar pedido',
        () => {
            const n = $('#pn').value.trim();
            const e = new Date($('#pe').value).getTime();
            
            if (!n) return toast('Escribe el nombre de quien encarga');
            if (!S.nuevo.length) return toast('Agrega al menos un producto');
            if (isNaN(e)) return toast('Elige fecha y hora de entrega');
            
            S.ped.push({
                id: S.pf,
                folio: 'P-' + String(S.pf++).padStart(3, '0'),
                cliente: n,
                tel: $('#pt').value.trim(),
                ent: e,
                items: S.nuevo,
                t: S.nuevo.reduce((a, i) => a + i.q * i.p, 0),
                nota: $('#po').value.trim(),
                st: 'pendiente'
            });
            
            dlg.close();
            toast('Pedido guardado');
            render();
        }
    );
}

function ppaint() {
    const t = S.nuevo.reduce((a, i) => a + i.q * i.p, 0);
    $('#pl').innerHTML = S.nuevo.map((i, k) => `
        <div class="row" style="padding:6px 0;border-bottom:1px dashed var(--border)">
            <span>${i.q} × ${i.n}</span>
            <span>${money(i.q * i.p)} <button data-act="pdel" data-i="${k}" style="background:none;color:var(--err);font-weight:800">✕</button></span>
        </div>
    `).join('') + (t ? `<div class="row" style="margin-top:6px"><b>Total</b><b>${money(t)}</b></div>` : '');
}

function padd() {
    const p = S.prods.find(x => x.id == $('#pp').value);
    const q = Math.max(1, +$('#pq').value || 1);
    const l = S.nuevo.find(x => x.id === p.id);
    
    l ? l.q += q : S.nuevo.push({ id: p.id, n: p.n, q, p: p.p });
    ppaint();
}

function pnext(id) {
    const o = S.ped.find(x => x.id == id);
    if (o.st === 'pendiente') o.st = 'preparando';
    else if (o.st === 'preparando') o.st = 'listo';
    else return entregar(o);
    render();
}

function pcan(id) {
    const o = S.ped.find(x => x.id == id);
    modal(
        'Cancelar pedido ' + o.folio,
        `<p>Se cancelará el pedido de <b>${o.cliente}</b>.</p>`,
        'Sí, cancelar',
        () => {
            o.st = 'cancelado';
            dlg.close();
            toast('Pedido cancelado');
            render();
        },
        'Volver'
    );
}

function entregar(o) {
    if (!S.turno) return abrirCaja();
    const f = o.items.find(i => S.prods.find(p => p.id == i.id).s < i.q);
    if (f) return toast('Falta existencia de ' + f.n);
    
    modal(
        'Entregar ' + o.folio,
        `<p><b>${o.cliente}</b> · Total <b>${money(o.t)}</b></p>
        <label>Forma de pago</label>
        <select id="ep"><option>Efectivo</option><option>Tarjeta</option></select>
        <label>Efectivo recibido</label>
        <input class="f" id="er" type="number" inputmode="decimal">
        <label><input type="checkbox" id="ef"> Generar factura</label>`,
        'Cobrar y entregar',
        () => {
            const pay = $('#ep').value;
            const r = $('#er').value === '' ? o.t : +$('#er').value;
            
            if (pay === 'Efectivo' && r < o.t) return toast('El efectivo no cubre el total');
            
            const v = venta(o.items.map(i => ({ ...i })), pay, r, $('#ef').checked);
            v.ped = o.folio;
            o.st = 'entregado';
            dlg.close();
            render();
            ticket(v);
        },
        'Volver'
    );
}