//Dashboard
const ok = () => S.ventas.filter(v => v.st !== 'cancelada');

function vDash() {
    const V = ok();
    const tot = V.reduce((a, v) => a + v.t, 0);
    const efe = V.filter(v => v.pay === 'Efectivo').reduce((a, v) => a + v.t, 0);
    const tj = tot - efe;

    const hrs = [...Array(13)].map((_, i) => i + 8);
    const by = hrs.map(h => V.filter(v => v.hr === h).reduce((a, v) => a + v.t, 0));
    const mx = Math.max(...by, 1);

    const top = {};
    V.forEach(v => v.items.forEach(i => top[i.n] = (top[i.n] || 0) + i.q));

    const tp = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const tm = tp[0] ? tp[0][1] : 1;

    const low = S.prods.filter(p => p.s <= p.m).sort((a, b) => a.s - b.s);
    const C = 2 * Math.PI * 40;
    const pe = tot ? efe / tot : 0;
    const caja = S.turno ? S.turno.fondo + efe : 0;

    const k = (bg, v, l, m, c) => `<div class="kpi" style="background:${bg};${c || ''}"><b data-count="${v}" ${m ? 'data-m="1"' : ''}>${m ? money(v) : v}</b><span>${l}</span></div>`;

    return `
        <div class="bar">
            <button class="btn ${S.turno ? '' : 'pk'}" data-act="caja">
                ${S.turno ? ' Corte y cierre de caja' : ' Abrir caja'}
            </button>
        </div>
        <div class="kpis">
            ${k('var(--sweet-pink)', tot, 'Ventas del día', 1)}
            ${k('var(--sweet-cyan)', V.length, 'Tickets')}
            ${k('var(--sweet-brown)', V.length ? tot / V.length : 0, 'Ticket promedio', 1)}
            ${k('var(--sweet-yellow)', caja, 'Efectivo en caja', 1, 'color:var(--sweet-navy)')}
        </div>
        <div class="dash">
            <div class="card">
                <h3>Ventas por hora</h3>
                <div class="chart">
                    ${by.map((v, i) => `<div class="col" title="${money(v)}"><div class="hb" style="height:${v / mx * 100}%;animation-delay:${i * 50}ms"></div><small>${hrs[i]}h</small></div>`).join('')}
                </div>
            </div>
            <div class="card">
                <h3>Formas de pago</h3>
                <svg class="donut" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="var(--sweet-cyan)"/>
                    <circle class="a" cx="50" cy="50" r="40" stroke="var(--sweet-pink)" stroke-dasharray="${pe * C} ${C}" transform="rotate(-90 50 50)"/>
                </svg>
                <div class="leg">
                    <span><i style="background:var(--sweet-pink)"></i>Efectivo ${money(efe)}</span>
                    <span><i style="background:var(--sweet-cyan)"></i>Tarjeta ${money(tj)}</span>
                </div>
            </div>
        </div>
        <div class="dash2">
            <div class="card">
                <h3>Los más vendidos</h3>
                ${tp.map(([n, q]) => `<div class="rk"><div class="row"><span>${n}</span><b>${q} pzas</b></div><div class="t"><i style="width:${q / tm * 100}%"></i></div></div>`).join('') || '<div class="empty">Cobra una venta para ver tus favoritos</div>'}
            </div>
            <div class="card">
                <h3>Alertas de existencias</h3>
                ${low.map(p => {
                    const [l, c] = st(p);
                    return `<div class="row" style="padding:7px 0;border-bottom:1px dashed var(--border)"><span>${p.e}${p.n}</span><span class="b ${c}">${p.s} ·${l}</span></div>`;
                }).join('') || '<div class="empty">Todo el inventario está en orden</div>'}
            </div>
        </div>
    `;
}

function vInv() {
    return `
        <div class="card tw">
            <table>
                <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Nivel</th>
                    <th>Existencia</th>
                    <th>Estado</th>
                </tr>
                ${S.prods.map(p => {
                    const [l, k] = st(p);
                    const w = Math.min(100, p.s / (p.m * 3) * 100);
                    return `<tr>
                        <td>${p.e}${p.n}</td>
                        <td>${p.c}</td>
                        <td><div class="meter"><i class="${k}" style="width:${w}%"></i></div></td>
                        <td><b>${p.s}</b> / mín ${p.m}</td>
                        <td><span class="b ${k}">${l}</span></td>
                    </tr>`;
                }).join('')}
            </table>
        </div>
    `;
}

function vVentas() {
    return `
        <div class="card tw">
            <table>
                <tr>
                    <th>Folio</th>
                    <th>Hora</th>
                    <th>Pzas</th>
                    <th>Pago</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th></th>
                </tr>
                ${S.ventas.slice().reverse().map(v => {
                    const x = v.st === 'cancelada';
                    return `<tr class="${x ? 'x' : ''}">
                        <td>#${v.f}</td>
                        <td>${v.h}</td>
                        <td>${v.n}</td>
                        <td>${v.pay}</td>
                        <td><b>${money(v.t)}</b></td>
                        <td><span class="b ${x ? 'e' : 'ok'}">${x ? 'Cancelada' : 'Pagada'}</span></td>
                        <td>
                            <button class="btn cy" data-act="ticket" data-f="${v.f}">Ticket</button>
                            ${x ? '' : `<button class="btn" style="background:var(--err)" data-act="cancel" data-f="${v.f}">Cancelar</button>`}
                        </td>
                    </tr>`;
                }).join('') || '<tr><td colspan="7" class="empty">Aún no hay ventas en este turno</td></tr>'}
            </table>
        </div>
    `;
}

const vFac = () => `
    <div class="card" style="margin-bottom:12px">Receptor de todas las facturas: <b>Público en general</b> · RFC XAXX010101000</div>
    <div class="card tw">
        <table>
            <tr>
                <th>Factura</th>
                <th>Hora</th>
                <th>Subtotal</th>
                <th>IVA 16%</th>
                <th>Total</th>
                <th></th>
            </tr>
            ${S.fac.map(f => `<tr>
                <td><b>${f.f}</b></td>
                <td>${f.h}</td>
                <td>${money(f.t / 1.16)}</td>
                <td>${money(f.t - f.t / 1.16)}</td>
                <td><b>${money(f.t)}</b></td>
                <td><button class="btn cy" data-act="fac" data-f="${f.f}">Ver desglose</button></td>
            </tr>`).join('') || '<tr><td colspan="6" class="empty">Marca “Generar factura” al cobrar y aparecerá aquí con su desglose</td></tr>'}
        </table>
    </div>
`;