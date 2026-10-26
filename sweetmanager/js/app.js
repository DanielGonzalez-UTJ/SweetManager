//Lógica del punto de venta
const cats = ['Todos', ...new Set(S.prods.map(p => p.c))];

const st = p => p.s <= 0 ? ['Agotado', 'e'] : p.s <= p.m ? ['Stock bajo', 'w'] : ['Óptimo', 'ok'];

const toast = t => {
    const e = $('#toast');
    e.textContent = t;
    e.style.display = 'block';
    clearTimeout(toast.t);
    toast.t = setTimeout(() => e.style.display = 'none', 2200);
};

const total = () => S.cart.reduce((a, l) => a + l.p.p * l.q, 0);

function add(id) {
    const p = S.prods.find(x => x.id == id);
    const l = S.cart.find(x => x.p.id == id);

    if (l) {
        if (l.q >= p.s) return toast('Solo hay ' + p.s + ' en existencia');
        l.q++;
    } else if (p.s > 0) {
        S.cart.push({ p, q: 1 });
    }

    S.pop = id;
    render();
}

function qty(id, d) {
    const l = S.cart.find(x => x.p.id == id);
    l.q += d;

    if (l.q > l.p.s) l.q = l.p.s;
    if (l.q <= 0) S.cart = S.cart.filter(x => x !== l);

    render();
}

function vVenta() {
    const list = S.prods.filter(p => (S.cat === 'Todos' || p.c === S.cat) && p.n.toLowerCase().includes(S.q.toLowerCase()));
    const t = total();
    const iva = t - t / 1.16;
    const c = S.recv === '' ? 0 : +S.recv - t;

    return `
        <div class="pos">
            <div>
                <input class="search" id="q" placeholder="Buscar dulce o escanear código (F2)" value="${S.q}" autocomplete="off">
                <div class="chips">
                    ${cats.map(c => `<button class="chip ${c === S.cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}
                </div>
                <div class="grid">
                    ${list.map(p => {
                        const [l, k] = st(p);
                        return `<button class="prod" data-add="${p.id}" ${p.s <= 0 ? 'disabled' : ''}>
                            <span class="em">${p.e || '🍬'}</span>
                            <b>${p.n}</b>
                            <span class="p">${money(p.p)}</span>
                            <small><span class="b ${k}">${p.s <= 0 ? 'Agotado' : p.s <= p.m ? 'Quedan ' + p.s : p.s + ' pzas'}</span></small>
                        </button>`;
                    }).join('') || '<div class="empty">Sin resultados</div>'}
                </div>
            </div>
            <div class="card cart">
                <h3>Ticket actual</h3>
                <div class="lines">
                    ${S.cart.map(l => `
                        <div class="line" data-id="${l.p.id}">
                            <div>
                                <b>${l.p.n}</b><br>
                                <small style="color:var(--muted)">${money(l.p.p)} c/u</small>
                            </div>
                            <div class="q">
                                <button data-q="${l.p.id}" data-d="-1">−</button>
                                <b>${l.q}</b>
                                <button data-q="${l.p.id}" data-d="1">+</button>
                            </div>
                            <b>${money(l.p.p * l.q)}</b>
                        </div>
                    `).join('') || '<div class="empty">Toca un dulce para agregarlo</div>'}
                </div>
                <label style="font-size:14px">
                    <input type="checkbox" id="fact" ${S.fact ? 'checked' : ''}> Generar factura (público en general)
                </label>
                <div class="pay">
                    ${['Efectivo', 'Tarjeta'].map(m => `
                        <button class="${S.pay === m ? 'on' : ''}" data-pay="${m}">
                            ${m === 'Efectivo' ? '💵' : '💳'} ${m}
                        </button>
                    `).join('')}
                </div>
                ${S.pay === 'Efectivo' ? `<input class="f" id="recv" type="number" inputmode="decimal" placeholder="Efectivo recibido" value="${S.recv}">` : ''}
                <div>
                    <div class="row"><span>Subtotal</span><span>${money(t - iva)}</span></div>
                    <div class="row"><span>IVA 16%</span><span>${money(iva)}</span></div>
                    ${S.pay === 'Efectivo' && c > 0 ? `<div class="row"><span>Cambio</span><b style="color:var(--ok)">${money(c)}</b></div>` : ''}
                    <div class="row"><b>Total</b><span class="total">${money(t)}</span></div>
                </div>
                <button class="cobrar" id="cob" ${S.cart.length ? '' : 'disabled'}>Cobrar ${money(t)}</button>
                <button class="btn" style="background:var(--bg2);color:var(--muted)" data-clear>Vaciar ticket</button>
            </div>
        </div>
    `;
}

const vProv = () => `
    <div class="card tw">
        <table>
            <tr>
                <th>Proveedor</th>
                <th>Teléfono</th>
                <th>Productos que ofrece</th>
                <th>Estado</th>
            </tr>
            ${S.prov.map(p => `
                <tr>
                    <td><b>${p.n}</b></td>
                    <td>${p.tel}</td>
                    <td>${p.items}</td>
                    <td><span class="b ${p.st === 'Activo' ? 'ok' : 'p'}">${p.st}</span></td>
                </tr>
            `).join('')}
        </table>
    </div>
`;

function render() {
    const [t, f] = T[S.view];
    $('#ttl').textContent = t;
    $('#who').textContent = (S.turno ? 'Caja abierta ' + S.turno.ini : 'Caja cerrada') + ' · ' + new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    const foc = document.activeElement?.id;
    const pos = document.activeElement?.selectionStart;

    $('#view').innerHTML = f();

    document.querySelectorAll('.nav').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));

    if (foc && $('#' + foc)) {
        const e = $('#' + foc);
        e.focus();
        try {
            e.setSelectionRange(pos, pos);
        } catch (_) {}
    }

    save();
    fx();
}

const dlg = $('#dlg');
const dt = $('#dt');

document.addEventListener('click', e => {
    const g = s => e.target.closest(s);
    let x;

    if (x = g('.nav')) {
        S.view = x.dataset.v;
        render();
    } else if (x = g('[data-cat]')) {
        S.cat = x.dataset.cat;
        render();
    } else if (x = g('[data-add]')) {
        add(x.dataset.add);
    } else if (x = g('[data-q]')) {
        qty(x.dataset.q, +x.dataset.d);
    } else if (x = g('[data-pay]')) {
        S.pay = x.dataset.pay;
        render();
    } else if (g('#cob')) {
        cobrar();
    } else if (g('[data-clear]')) {
        S.cart = [];
        render();
    }
});

document.addEventListener('input', e => {
    if (e.target.id === 'q') {
        S.q = e.target.value;
        render();
    } else if (e.target.id === 'recv') {
        S.recv = e.target.value;
        const f = $('#recv');
        render();
    }
});

document.addEventListener('change', e => {
    if (e.target.id === 'fact') {
        S.fact = e.target.checked;
    }
});

/*document.addEventListener('keydown', e => {
    if (e.key === 'F2') {
        e.preventDefault();
        S.view = 'venta';
        render();
        $('#q')?.focus();
    }

    if (e.key === 'Enter' && e.target.id === 'q') {
        const p = S.prods.find(p => p.s > 0 && p.n.toLowerCase().includes(S.q.toLowerCase()));
        if (p) {
            add(p.id);
            S.q = '';
            render();
            $('#q').focus();
        }
    }
})*/;