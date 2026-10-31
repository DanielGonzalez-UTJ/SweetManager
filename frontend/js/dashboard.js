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

    const tp = ordenaBurbuja(Object.entries(top), (a, b) => b[1] - a[1]).slice(0, 5);
    const tm = tp[0] ? tp[0][1] : 1;

    const low = ordenaBurbuja(filtraLineal(S.prods, p => p.s <= p.m), (a, b) => a.s - b.s);
    const C = 2 * Math.PI * 40;
    const pe = tot ? efe / tot : 0;
    const efeTurno = filtraLineal(V, v => S.turno && v.turno === S.turno.id && v.pay === 'Efectivo').reduce((a, v) => a + v.t, 0);
    const caja = S.turno ? S.turno.fondo + efeTurno : 0;

    const k = (bg, v, l, m, c) => `
        <div class="col-6 col-lg-3">
            <div class="kpi" style="background: ${bg}; ${c || ''}">
                <b data-count="${v}" ${m ? 'data-m="1"' : ''}>${m ? money(v) : v}</b>
                <span>${l}</span>
            </div>
        </div>
    `;

    return `
        ${botonReporte()}

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

        <div class="row g-3 mt-0">
            <div class="col-12">
                <div class="card">
                    <h3>Actividad reciente</h3>
                    ${S.bitacora.desdeElFinal(8).map(e => `
                        <div class="fila fila-lista">
                            <span>${e.texto}</span>
                            <span class="mut">${e.usuario} · ${e.hora}</span>
                        </div>
                    `).join('') || '<div class="empty">Todavía no hay actividad</div>'}
                </div>
            </div>
        </div>
    `;
}

function vVentas() {
    return `
        ${esAdmin() ? botonReporte() : ''}

        <div class="bar align-items-center">
            <label class="mut" for="orden">Ordenar por</label>
            <select class="form-select w-auto" id="orden">
                ${Object.entries(ORDENES).map(([k, o]) => `<option value="${k}" ${S.orden === k ? 'selected' : ''}>${o[0]}</option>`).join('')}
            </select>
        </div>

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
                ${ventasOrdenadas().map(v => {
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
                            ${x || !esAdmin() ? '' : `<button class="btn" style="background:var(--err)" data-act="cancel" data-f="${v.f}">Cancelar</button>`}
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

/*Reporte de ventas, solo para el administrador*/
const botonReporte = () => `
    <div class="bar">
        <button class="btn pk btn-ico" data-act="reporte">
            <span class="material-symbols-rounded">summarize</span>
            Generar reporte
        </button>
    </div>
`;

function datosReporte() {
    const V = ok();
    const total = V.reduce((a, v) => a + v.t, 0);
    const efectivo = V.filter(v => v.pay === 'Efectivo').reduce((a, v) => a + v.t, 0);
    const piezas = {};

    V.forEach(v => v.items.forEach(i => {
        piezas[i.n] = (piezas[i.n] || 0) + i.q;
    }));

    return {
        pagadas: V.length,
        canceladas: S.ventas.filter(v => v.st === 'cancelada').length,
        total,
        iva: total - total / 1.16,
        promedio: V.length ? total / V.length : 0,
        efectivo,
        tarjeta: total - efectivo,
        top: ordenaBurbuja(Object.entries(piezas), (a, b) => b[1] - a[1]).slice(0, 5)
    };
}

function reporte() {
    if (!esAdmin()) return toast('Solo el administrador genera reportes');

    const r = datosReporte();

    modal(
        'Reporte de ventas del día',
        `
            <div class="rcpt">
                <div class="fila"><span>Fecha</span><span>${new Date().toLocaleDateString('es-MX')}</span></div>
                <hr>
                <div class="fila"><span>Ventas pagadas</span><b>${r.pagadas}</b></div>
                <div class="fila"><span>Total vendido</span><b>${money(r.total)}</b></div>
                <div class="fila"><span>IVA 16% incluido</span><span>${money(r.iva)}</span></div>
                <div class="fila"><span>Ticket promedio</span><span>${money(r.promedio)}</span></div>
                <hr>
                <div class="fila"><span>Efectivo</span><span>${money(r.efectivo)}</span></div>
                <div class="fila"><span>Tarjeta</span><span>${money(r.tarjeta)}</span></div>
                <div class="fila"><span>Ventas canceladas</span><span>${r.canceladas}</span></div>
                <hr>
                <b>Más vendidos</b>
                ${r.top.map(([n, q]) => `
                    <div class="fila"><span>${n}</span><span>${q} pzas</span></div>
                `).join('') || '<div class="mut">Todavía no hay ventas</div>'}
            </div>
            <button class="btn btn-ico mt-2" data-act="print">
                <span class="material-symbols-rounded">print</span>Imprimir
            </button>
        `,
        'Descargar CSV',
        descargaCsv,
        'Cerrar'
    );
}

/*Archivo CSV con todas las ventas, se abre en Excel*/
function descargaCsv() {
    const celda = x => '"' + String(x).replace(/"/g, '""') + '"';
    const filas = [['Folio', 'Fecha y hora', 'Forma de pago', 'Piezas', 'Subtotal', 'IVA 16%', 'Total', 'Estado']];

    S.ventas.forEach(v => {
        filas.push([
            v.f,
            new Date(v.ts).toLocaleString('es-MX'),
            v.pay,
            v.n,
            (v.t / 1.16).toFixed(2),
            (v.t - v.t / 1.16).toFixed(2),
            v.t.toFixed(2),
            v.st === 'cancelada' ? 'Cancelada' : 'Pagada'
        ]);
    });

    const texto = '\ufeff' + filas.map(f => f.map(celda).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'reporte-ventas-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    toast('Reporte descargado');
}
