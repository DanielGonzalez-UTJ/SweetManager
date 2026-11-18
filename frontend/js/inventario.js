/*Inventario: consulta de existencias cargadas desde la base de datos*/
let FILTRO_INVENTARIO = '';

function vInventario() {
    if (!esAdmin()) return '<div class="card">No tienes permiso para consultar el inventario.</div>';

    const consulta = (FILTRO_INVENTARIO || '').trim().toLocaleLowerCase('es-MX');
    const productos = S.prods.filter(p =>
        !consulta ||
        p.n.toLocaleLowerCase('es-MX').includes(consulta) ||
        p.c.toLocaleLowerCase('es-MX').includes(consulta)
    );
    const total = S.prods.length;
    const agotados = S.prods.filter(p => p.s <= 0).length;
    const bajos = S.prods.filter(p => p.s > 0 && p.s <= p.m).length;
    const unidades = S.prods.reduce((a, p) => a + p.s, 0);

    return `
        <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Productos activos</small><h3>${total}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Unidades en existencia</small><h3>${unidades.toLocaleString('es-MX')}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Stock bajo</small><h3>${bajos}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Agotados</small><h3>${agotados}</h3></div></div>
        </div>
        <div class="card">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div><h3 class="mb-1">Existencias de productos</h3><small class="text-muted">Información actual obtenida de la base de datos</small></div>
                <button class="btn btn-ico" type="button" data-act="inventario-refresh"><span class="material-symbols-rounded">refresh</span>Actualizar</button>
            </div>
            <input class="form-control mb-3" id="buscar-inventario" placeholder="Buscar por producto o categoría" value="${FILTRO_INVENTARIO.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
            <div class="table-responsive">
                <table class="table align-middle">
                    <thead><tr><th>Producto</th><th>Categoría</th><th>Existencia</th><th>Mínimo</th><th>Nivel de stock</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${productos.map(p => {
                            const [estado, clase] = st(p);
                            const porcentaje = p.m > 0 ? Math.min(100, Math.round(p.s / (p.m * 3) * 100)) : (p.s > 0 ? 100 : 0);
                            return `<tr>
                                <td><strong>${p.n}</strong></td>
                                <td>${p.c}</td>
                                <td><strong>${p.s}</strong></td>
                                <td>${p.m}</td>
                                <td style="min-width:130px"><div class="progress" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100" style="height:8px"><div class="progress-bar ${clase === 'e' ? 'bg-danger' : clase === 'w' ? 'bg-warning' : 'bg-success'}" style="width:${porcentaje}%"></div></div></td>
                                <td><span class="b ${clase}">${estado}</span></td>
                            </tr>`;
                        }).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">No hay productos que coincidan con la búsqueda.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
}

document.addEventListener('input', e => {
    if (e.target.id === 'buscar-inventario') {
        FILTRO_INVENTARIO = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const campo = $('#buscar-inventario');
        campo?.focus();
        try { campo?.setSelectionRange(pos, pos); } catch (_) {}
    }
});
