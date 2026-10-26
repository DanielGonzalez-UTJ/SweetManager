/*Dashboard*/
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

    const k = (bg, v, l, m, c) => `
        <div class="col-6 col-lg-3">
            <div class="kpi" style="background: ${bg}; ${c || ''}">
                <b data-count="${v}" ${m ? 'data-m="1"' : ''}>${m ? money(v) : v}</b>
                <span>${l}</span>
            </div>
        </div>
    `;

    return `
        <div class="row g-3 mb-3">
            ${k('var(--sweet-pink)', tot, 'Ventas del día', 1)}
            ${k('var(--sweet-cyan)', V.length, 'Tickets')}
            ${k('var(--sweet-brown)', V.length ? tot / V.length : 0, 'Ticket promedio', 1)}
            ${k('var(--sweet-yellow)', caja, 'Efectivo en caja', 1, 'color: var(--sweet-navy)')}
        </div>

        <div class="row g-3 mb-3">
            <div class="col-lg-8">
                <div class="card h-100">
                    <h3>Ventas por hora</h3>
                    <div class="chart">
                        ${by.map((v, i) => `
                            <div class="barra" title="${money(v)}">
                                <div class="hb" style="height: ${v / mx * 100}%; animation-delay: ${i * 50}ms"></div>
                                <small>${hrs[i]}h</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="card h-100">
                    <h3>Formas de pago</h3>
                    <svg class="donut" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="var(--sweet-cyan)" />
                        <circle class="a" cx="50" cy="50" r="40" stroke="var(--sweet-pink)" stroke-dasharray="${pe * C} ${C}" transform="rotate(-90 50 50)" />
                    </svg>
                    <div class="leg">
                        <span><i style="background: var(--sweet-pink)"></i>Efectivo ${money(efe)}</span>
                        <span><i style="background: var(--sweet-cyan)"></i>Tarjeta ${money(tj)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3">
            <div class="col-lg-6">
                <div class="card h-100">
                    <h3>Los más vendidos</h3>
                    ${tp.map(([n, q]) => `
                        <div class="rk">
                            <div class="fila"><span>${n}</span><b>${q} pzas</b></div>
                            <div class="t"><i style="width: ${q / tm * 100}%"></i></div>
                        </div>
                    `).join('') || '<div class="empty">Cobra una venta para ver tus favoritos</div>'}
                </div>
            </div>

            <div class="col-lg-6">
                <div class="card h-100">
                    <h3>Alertas de existencias</h3>
                    ${low.map(p => {
                        const [l, c] = st(p);

                        return `
                            <div class="fila fila-lista">
                                <span>${p.e} ${p.n}</span>
                                <span class="b ${c}">${p.s} · ${l}</span>
                            </div>
                        `;
                    }).join('') || '<div class="empty">Todo el inventario está en orden</div>'}
                </div>
            </div>
        </div>
    `;
}

function vVentas() {
    return `
        <div class="card table-responsive">
            <table class="table table-hover align-middle mb-0">
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
    <div class="card mb-3">Receptor de todas las facturas: <b>Público en general</b> · RFC XAXX010101000</div>
    <div class="card table-responsive">
        <table class="table table-hover align-middle mb-0">
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