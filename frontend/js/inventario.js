/* Inventario, Kardex, solicitudes de abastecimiento y recepción de compras. */
let FILTRO_INVENTARIO = '';

function vInventario() {
    if (!esAdmin()) return '<div class="card">No tienes permiso para consultar el inventario.</div>';
    const consulta=(FILTRO_INVENTARIO||'').trim().toLocaleLowerCase('es-MX');
    const productos=S.prods.filter(p=>!consulta||p.n.toLocaleLowerCase('es-MX').includes(consulta)||p.c.toLocaleLowerCase('es-MX').includes(consulta));
    const total=S.prods.length, agotados=S.prods.filter(p=>p.s<=0).length, bajos=S.prods.filter(p=>p.s>0&&p.s<=p.m).length;
    const unidades=S.prods.reduce((a,p)=>a+(p.fisico??p.s),0);
    const solicitudes=S.solicitudes||[], compras=S.compras||[], movimientos=S.movimientos||[], lotes=S.lotes||[];
    return `
        <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Productos activos</small><h3>${total}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Unidades físicas</small><h3>${unidades.toLocaleString('es-MX')}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Stock bajo</small><h3>${bajos}</h3></div></div>
            <div class="col-6 col-xl-3"><div class="card"><small class="text-muted">Agotados</small><h3>${agotados}</h3></div></div>
            </div>
        <div class="card mb-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><div><h3 class="mb-1">Existencias de productos</h3><small class="text-muted"><!--Disponible = existencia física menos unidades reservadas en pedidos.--></small></div><button class="btn btn-ico" data-act="inventario-refresh">↻ Actualizar</button></div>
        <input class="form-control mb-3" id="buscar-inventario" placeholder="Buscar por producto o categoría" value="${esc(FILTRO_INVENTARIO)}">
        <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Producto</th><th>Categoría</th><th>Físico</th><th>Reservado</th><th>Disponible</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>
        ${productos.map(p=>{const [estado,clase]=st(p);return `<tr><td><b>${esc(p.n)}</b></td><td>${esc(p.c)}</td><td>${p.fisico??p.s}</td><td>${p.reservado||0}</td><td><b>${p.s}</b></td><td>${p.m}</td><td><span class="b ${clase}">${estado}</span></td></tr>`}).join('')||'<tr><td colspan="7" class="text-center">Sin resultados.</td></tr>'}
        </tbody></table></div>
    </div>
    <!---<div class="card mb-3"><h3>Caducidades próximas · 30 días</h3><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Producto</th><th>Lote</th><th>Caducidad</th><th>Existencia del lote</th></tr></thead><tbody>${lotes.map(l=>`<tr><td>${esc(l.producto)}</td><td>${esc(l.lote)}</td><td><span class="b ${l.vencido?'err':'w'}">${l.vencido?'Vencido · ':''}${new Date(l.caducidad+'T12:00:00').toLocaleDateString('es-MX')}</span></td><td>${l.cantidad_disponible}</td></tr>`).join('')||'<tr><td colspan="4" class="text-muted text-center">No hay lotes próximos a caducar registrados.</td></tr>'}</tbody></table></div></div>
    <div class="card mb-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><div><h3>Solicitudes del cajero</h3><small class="text-muted">No generan inventario ni compras automáticamente.</small></div><span class="b p">${solicitudes.filter(x=>x.estado==='pendiente'||x.estado==='en_gestion').length} pendientes</span></div>
        <div class="table-responsive mt-2"><table class="table align-middle"><thead><tr><th>Folio</th><th>Cliente / cajero</th><th>Productos</th><th>Fecha requerida</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        ${solicitudes.map(x=>`<tr><td>SA-${String(x.id).padStart(5,'0')}</td><td><b>${esc(x.cliente_nombre)}</b><small class="d-block text-muted">${esc(x.solicitante)}</small></td><td>${(x.items||[]).map(i=>`${esc(i.producto)} × ${i.cantidad}`).join('<br>')}</td><td>${fechaHoraMX(new Date(x.fecha_requerida.replace(' ','T')))}</td><td><span class="b ${x.estado==='rechazada'?'err':x.estado==='confirmada'?'ok':'w'}">${x.estado.replace('_',' ')}</span>${x.respuesta_admin?`<small class="d-block text-muted">${esc(x.respuesta_admin)}</small>`:''}</td><td>${x.estado!=='rechazada'&&x.estado!=='recibida'?`<div class="d-flex flex-wrap gap-1"><button class="btn cy btn-sm" data-act="sol-resolver" data-id="${x.id}" data-estado="en_gestion">En gestión</button><button class="btn pk btn-sm" data-act="sol-resolver" data-id="${x.id}" data-estado="confirmada">Confirmar</button><button class="btn btn-sm" style="background:var(--err)" data-act="sol-resolver" data-id="${x.id}" data-estado="rechazada">Rechazar</button>${!x.orden_id?`<button class="btn btn-sm" data-act="sol-compra" data-id="${x.id}">Crear compra</button>`:`<small class="text-muted">OC-${x.orden_id}</small>`}</div>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="text-center text-muted">No hay solicitudes.</td></tr>'}
        </tbody></table></div>
    </div>
    <div class="card mb-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><div><h3>Órdenes de compra</h3><small class="text-muted">Registra lo que el proveedor confirmó; la existencia aumenta hasta recibir físicamente.</small></div><button class="btn pk" data-act="inv-compra">+ Nueva orden</button></div>
        <div class="table-responsive mt-2"><table class="table align-middle"><thead><tr><th>Orden</th><th>Proveedor</th><th>Fecha estimada</th><th>Productos</th><th>Estado</th><th></th></tr></thead><tbody>
        ${compras.map(c=>`<tr><td>OC-${c.id}</td><td>${esc(c.proveedor)}</td><td>${fechaHoraMX(new Date(c.fecha_estimada.replace(' ','T')))}</td><td>${(c.items||[]).map(i=>`${esc(i.producto)}: ${i.recibida}/${i.cantidad}`).join('<br>')}</td><td><span class="b ${c.estado==='parcial'?'w':'p'}">${c.estado}</span></td><td><button class="btn cy btn-sm" data-act="inv-recibir" data-id="${c.id}">Registrar recepción</button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center text-muted">No hay órdenes pendientes de recepción.</td></tr>'}
        </tbody></table></div>
    </div>
    <div class="card mb-3"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><div><h3>Registrar merma</h3><small class="text-muted">Solo descuenta unidades no reservadas.</small></div></div>
        <div class="row g-2 mt-1"><div class="col-md-4"><select class="form-select" id="merma-producto">${S.prods.map(p=>`<option value="${p.id}">${esc(p.n)} · disp. ${p.s}</option>`).join('')}</select></div><div class="col-md-2"><input class="form-control" id="merma-cantidad" type="number" min="1" placeholder="Cantidad"></div><div class="col-md-3"><select class="form-select" id="merma-motivo"><option>Producto dañado</option><option>Producto caducado</option><option>Empaque abierto</option><option>Deterioro por temperatura o humedad</option><option>Contaminación</option><option>Otro</option></select></div><div class="col-md-2"><input class="form-control" id="merma-lote" placeholder="Lote (opcional)"></div><div class="col-md-1"><button class="btn pk w-100" data-act="inv-merma">Registrar</button></div></div>
    </div>
    <div class="card"><h3>Kardex · Últimos movimientos</h3><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Saldo</th><th>Motivo / referencia</th><th>Usuario</th></tr></thead><tbody>
        ${movimientos.map(m=>`<tr><td>${fechaHoraMX(new Date(m.creado.replace(' ','T')))}</td><td>${esc(m.producto)}</td><td>${esc(m.tipo.replace('_',' '))}</td><td>${m.tipo.startsWith('salida')?'-':'+'}${m.cantidad}</td><td>${m.stock_resultante}</td><td>${esc(m.motivo)} ${m.referencia?`· ${esc(m.referencia)}`:''}${m.lote?`<small class="d-block text-muted">Lote: ${esc(m.lote)}</small>`:''}</td><td>${esc(m.usuario)}</td></tr>`).join('')||'<tr><td colspan="7" class="text-center text-muted">Todavía no hay movimientos registrados.</td></tr>'}
    </tbody></table></div>---></div>`;
}

function lineaCompraHTML(){
    return `<div class="oc-linea row g-2 align-items-end border rounded p-2 mb-2"><div class="col-md-5"><label>Producto</label><select class="form-select oc-producto">${S.prods.map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select></div><div class="col-3 col-md-2"><label>Cantidad</label><input class="form-control oc-cantidad" type="number" min="1" value="1"></div><div class="col-5 col-md-3"><label>Costo unitario</label><input class="form-control oc-costo" type="number" min="0" step="0.01" value="0"></div><div class="col-2"><button type="button" class="btn btn-sm" style="background:var(--err)" data-act="oc-del-line">×</button></div></div>`;
}

function agregarLineaCompra(){
    const cont=$('#oc-lineas'); if(cont) cont.insertAdjacentHTML('beforeend',lineaCompraHTML());
}

function quitarLineaCompra(boton){
    const filas=document.querySelectorAll('#oc-lineas .oc-linea');
    if(filas.length<=1)return toast('La orden necesita al menos un producto');
    boton.closest('.oc-linea')?.remove();
}

function crearCompraUI(){
    const mañana=new Date(Date.now()+86400000); mañana.setHours(10,0,0,0);
    const fecha=new Date(mañana-mañana.getTimezoneOffset()*60000).toISOString().slice(0,16);
    modal('Nueva orden de compra',`<label>Proveedor</label><select class="form-select" id="oc-prov">${S.prov.filter(p=>p.st==='Activo').map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select><div class="d-flex justify-content-between align-items-center mt-3 mb-2"><b>Productos de la orden</b><button type="button" class="btn cy btn-sm" data-act="oc-add-line">+ Agregar producto</button></div><div id="oc-lineas">${lineaCompraHTML()}</div><label class="mt-2">Fecha y hora confirmada de entrega</label><input class="form-control" id="oc-fecha" type="datetime-local" value="${fecha}"><label>Nota</label><input class="form-control" id="oc-nota" maxlength="255">`,'Guardar orden',async()=>{
        const proveedor_id=+$('#oc-prov').value;
        if(!proveedor_id)return toast('Registra o selecciona un proveedor activo');
        const items=[...document.querySelectorAll('#oc-lineas .oc-linea')].map(row=>({id:+row.querySelector('.oc-producto').value,q:+row.querySelector('.oc-cantidad').value,costo:+row.querySelector('.oc-costo').value}));
        if(!items.length||items.some(i=>!i.id||!Number.isInteger(i.q)||i.q<1||!Number.isFinite(i.costo)||i.costo<0))return toast('Revisa productos, cantidades y costos');
        await api('index.php?ruta=abastecimiento','POST',{accion:'compra',proveedor_id,fecha:$('#oc-fecha').value,nota:$('#oc-nota').value,items});
        dlg.close();await recarga();toast('Orden de compra registrada; aún no aumenta el inventario.');
    },'Cancelar');
}

function crearCompraDesdeSolicitudUI(id){
    const sol=(S.solicitudes||[]).find(x=>+x.id===id); if(!sol)return toast('No se encontró la solicitud');
    const requerida=new Date(String(sol.fecha_requerida).replace(' ','T'));
    const fecha=new Date(requerida-requerida.getTimezoneOffset()*60000).toISOString().slice(0,16);
    const filas=(sol.items||[]).map(i=>`<div class="oc-linea row g-2 align-items-end border rounded p-2 mb-2"><div class="col-md-5"><label>Producto</label><input class="form-control" value="${esc(i.producto)}" disabled><input type="hidden" class="oc-producto" value="${i.producto_id}"></div><div class="col-3 col-md-2"><label>Cantidad</label><input class="form-control oc-cantidad" type="number" min="1" value="${i.cantidad}"></div><div class="col-5 col-md-3"><label>Costo unitario</label><input class="form-control oc-costo" type="number" min="0" step="0.01" value="0"></div></div>`).join('');
    modal('Crear compra desde SA-'+String(id).padStart(5,'0'),`<p>Cliente: <b>${esc(sol.cliente_nombre)}</b>. El administrador debe haber confirmado la disponibilidad con el proveedor.</p><label>Proveedor</label><select class="form-select" id="oc-prov">${S.prov.filter(p=>p.st==='Activo').map(p=>`<option value="${p.id}">${esc(p.n)}</option>`).join('')}</select><label class="mt-2">Fecha y hora confirmada de entrega</label><input class="form-control" id="oc-fecha" type="datetime-local" value="${fecha}"><div class="mt-2"><b>Productos solicitados</b>${filas}</div><label>Nota</label><input class="form-control" id="oc-nota" maxlength="255">`,'Crear orden',async()=>{
        const proveedor_id=+$('#oc-prov').value; if(!proveedor_id)return toast('Selecciona un proveedor activo');
        const items=[...document.querySelectorAll('#db .oc-linea')].map(row=>({id:+row.querySelector('.oc-producto').value,q:+row.querySelector('.oc-cantidad').value,costo:+row.querySelector('.oc-costo').value}));
        if(items.some(i=>!i.id||!Number.isInteger(i.q)||i.q<1||!Number.isFinite(i.costo)||i.costo<0))return toast('Revisa cantidades y costos');
        await api('index.php?ruta=abastecimiento','POST',{accion:'compra',solicitud_id:id,proveedor_id,fecha:$('#oc-fecha').value,nota:$('#oc-nota').value,items});
        dlg.close();await recarga();toast('Orden vinculada a la solicitud. El inventario aumentará al recibir físicamente.');
    },'Cancelar');
}

function recibirCompraUI(id){
    const compra=(S.compras||[]).find(c=>+c.id===id); if(!compra)return toast('No se encontró la orden');
    const pendientes=(compra.items||[]).filter(i=>+i.cantidad>+i.recibida);
    if(!pendientes.length)return toast('La orden ya está completa');
    modal('Recibir orden OC-'+id,`<p><b>${esc(compra.proveedor)}</b>. Captura solamente las cantidades que llegaron físicamente.</p>${pendientes.map(i=>`<div class="border rounded p-2 mb-2"><b>${esc(i.producto)}</b><small class="d-block text-muted">Pendiente: ${i.cantidad-i.recibida}</small><input class="form-control mt-1" type="number" min="0" max="${i.cantidad-i.recibida}" value="${i.cantidad-i.recibida}" id="rc-${i.linea_id}" placeholder="Cantidad recibida"><input class="form-control mt-1" id="rl-${i.linea_id}" placeholder="Lote (opcional)"><label class="small mt-1">Caducidad (opcional)</label><input class="form-control" type="date" id="rd-${i.linea_id}"></div>`).join('')}`,'Confirmar recepción',async()=>{
        const items=pendientes.map(i=>({linea_id:+i.linea_id,cantidad:+$('#rc-'+i.linea_id).value||0,lote:$('#rl-'+i.linea_id).value,caducidad:$('#rd-'+i.linea_id).value})).filter(i=>i.cantidad>0);
        if(!items.length)return toast('Captura al menos una cantidad recibida');
        await api('index.php?ruta=abastecimiento','POST',{accion:'recibir',compra_id:id,items});
        dlg.close();await recarga();toast('Recepción registrada e inventario actualizado.');
    },'Cancelar');
}

function registrarMermaUI(){
    const producto_id=+$('#merma-producto').value,cantidad=+$('#merma-cantidad').value,motivo=$('#merma-motivo').value,lote=$('#merma-lote').value.trim();
    if(!cantidad||!Number.isInteger(cantidad)||cantidad<1)return toast('Indica una cantidad válida');
    seguro(async()=>{await api('index.php?ruta=abastecimiento','POST',{accion:'merma',producto_id,cantidad,motivo,lote});await recarga();toast('Merma registrada en el Kardex.');});
}

function resolverSolicitudUI(id,estado){
    const nombres={en_gestion:'Marcar en gestión',confirmada:'Confirmar disponibilidad del proveedor',rechazada:'Rechazar solicitud'};
    modal(nombres[estado]||'Actualizar solicitud',`<p>La acción quedará registrada en la solicitud SA-${String(id).padStart(5,'0')}.</p><label>Respuesta para el cajero</label><textarea class="form-control" id="sol-respuesta" maxlength="255" placeholder="Ej. Proveedor confirmó entrega para mañana a las 10:00"></textarea><small class="text-muted">Confirma solamente si ya recibiste la respuesta del proveedor por teléfono, mensaje u otro medio.</small>`,'Guardar',async()=>{
        await api('index.php?ruta=abastecimiento','POST',{accion:'resolver',id,estado,respuesta:$('#sol-respuesta').value.trim()});dlg.close();await recarga();toast('Solicitud actualizada.');
    },'Cancelar');
}

document.addEventListener('input',e=>{
    if(e.target.id==='buscar-inventario'){
        FILTRO_INVENTARIO=e.target.value;const pos=e.target.selectionStart;render();const campo=$('#buscar-inventario');campo?.focus();try{campo?.setSelectionRange(pos,pos);}catch(_){}
    }
});
