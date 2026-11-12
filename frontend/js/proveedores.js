/*Proveedores, gestión solo para el administrador*/
let FILTRO_PROVEEDORES = '';
const nombresProd = ids => {
    const nombres = S.prods.filter(p => ids.includes(p.id)).map(p => p.n);

    return nombres.join(', ') || 'Sin productos';
};

function vProv() {
    const filtro = FILTRO_PROVEEDORES.trim().toLocaleLowerCase('es-MX');
    const proveedoresVisibles = S.prov.filter(p => [p.n, p.tel, p.st, nombresProd(p.ids)].some(v => String(v || '').toLocaleLowerCase('es-MX').includes(filtro)));

    return `
        <div class="bar">
            <button class="btn pk" data-act="provnew">+ Nuevo proveedor</button>
        </div>
        <div class="usuarios-busqueda">
            <span class="material-symbols-rounded">search</span>
            <input class="form-control" id="buscar-proveedores" type="search" placeholder="Buscar proveedor, teléfono, estado o producto..." value="${esc(FILTRO_PROVEEDORES)}">
        </div>

        <div class="card table-responsive">
            <table class="table table-hover align-middle mb-0">
                <tr>
                    <th>Proveedor</th>
                    <th>Teléfono</th>
                    <th>Productos asignados</th>
                    <th>Estado</th>
                    <th></th>
                </tr>
                ${proveedoresVisibles.map(p => ({p, i:S.prov.indexOf(p)})).map(({p, i}) => `
                    <tr>
                        <td><b>${p.n}</b></td>
                        <td>${p.tel}</td>
                        <td>${nombresProd(p.ids)}</td>
                        <td><span class="b ${p.st === 'Activo' ? 'ok' : 'p'}">${p.st}</span></td>
                        <td><button class="btn cy" data-act="provedit" data-i="${i}">Editar</button></td>
                    </tr>
                `).join('')}
            </table>
        </div>`;
}

function provForm(i) {
    const nuevo = i === undefined;
    const p = nuevo ? { n: '', tel: '', st: 'Activo', ids: [] } : S.prov[i];
    const estados = ['Activo', 'Pedido pendiente', 'Inactivo'];

    modal(
        nuevo ? 'Nuevo proveedor' : 'Editar proveedor',
        `
            <label>Nombre</label>
            <input class="form-control" id="pvn" value="${esc(p.n)}">

            <label>Teléfono</label>
            <input class="form-control" id="pvt" type="tel" value="${esc(p.tel)}">

            <label>Estado</label>
            <select class="form-select" id="pve">
                ${estados.map(e => `<option ${p.st === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>

            <label>Productos que ofrece</label>
            <div class="chkgrid">
                ${S.prods.map(x => `
                    <label class="chk">
                        <input type="checkbox" value="${x.id}" ${p.ids.includes(x.id) ? 'checked' : ''}>
                        ${x.n}
                    </label>
                `).join('')}
            </div>
        `,
        'Guardar proveedor',
        async () => {
            const n = $('#pvn').value.trim();
            const ids = [...document.querySelectorAll('#db .chkgrid input:checked')].map(c => +c.value);

            if (!n) return toast('Escribe el nombre del proveedor');
            const telefono = $('#pvt').value.trim().replace(/\D/g, '');
            if ($('#pvt').value.trim() && !/^\d{10}$/.test(telefono)) return toast('El teléfono debe tener exactamente 10 dígitos');
            if (!ids.length) return toast('Asigna al menos un producto');

            await api('proveedores.php', 'POST', {
                accion: 'guardar',
                id: nuevo ? null : S.prov[i].id,
                nombre: n,
                telefono,
                estado: $('#pve').value,
                ids
            });

            dlg.close();
            toast('Proveedor guardado');
            await recarga();
        },
        'Cancelar'
    );
}
