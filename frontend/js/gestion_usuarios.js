/*Gestión administrativa de cuentas de SweetManager*/
let listaUsuarios = [];
let FILTRO_USUARIOS = '';

function vUsuarios() {
    const filtro = FILTRO_USUARIOS.trim().toLocaleLowerCase('es-MX');
    const visibles = listaUsuarios.filter(u =>
        [u.nombre, u.usuario, u.correo, u.rol].some(v => String(v || '').toLocaleLowerCase('es-MX').includes(filtro))
    );

    return `
        <div class="bar usuarios-bar">
            <p class="text-muted mb-0">Administra las cuentas del personal. No existe registro público.</p>
            <button class="btn pk" data-act="usuariocrear">+ Nuevo usuario</button>
        </div>
        <div class="usuarios-busqueda">
            <span class="material-symbols-rounded">search</span>
            <input class="form-control" id="buscar-usuarios" type="search" placeholder="Buscar por nombre, usuario, correo o rol..." value="${esc(FILTRO_USUARIOS)}">
        </div>
        <div class="card table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        ${visibles.map(u => {
            const propio = Number(u.id) === Number(SESION.id);
            const activo = Number(u.activo) === 1;
            const rol = {admin:'Administrador', cajero:'Cajero', almacenista:'Almacenista'}[u.rol] || u.rol;
            return `<tr>
                <td><b>${esc(u.nombre)}</b>${propio ? '<small class="d-block text-muted">Tu cuenta</small>' : ''}</td>
                <td>${esc(u.usuario)}</td><td>${esc(u.correo)}</td><td>${rol}</td>
                <td><span class="estado-usuario ${activo ? 'activo' : 'inactivo'}"><i></i>${activo ? 'Activo' : 'Inactivo'}</span></td>
                <td class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm cy" data-act="usuarioeditar" data-id="${u.id}">Editar</button>
                    <button class="btn btn-sm btn-outline-warning" data-act="usuarioclave" data-id="${u.id}">Restablecer clave</button>
                    ${propio ? '<button class="btn btn-sm btn-outline-secondary" disabled title="No puedes desactivar tu propia cuenta">Tu cuenta</button>' : `<button class="btn btn-sm ${activo ? 'btn-outline-danger' : 'btn-outline-success'}" data-act="usuarioestado" data-id="${u.id}" data-activo="${activo ? 0 : 1}">${activo ? 'Desactivar' : 'Activar'}</button>`}
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="6" class="text-center py-4">${filtro ? 'No se encontraron usuarios con esa búsqueda.' : 'No hay usuarios registrados.'}</td></tr>`}
        </tbody></table></div>`;
}

function formularioUsuario(id) {
    const u = id ? listaUsuarios.find(x=>Number(x.id)===id) : {nombre:'',usuario:'',correo:'',telefono:'',rol:'cajero'};
    if (!u) return toast('No se encontró el usuario');
    const esPropio = id && Number(id) === Number(SESION.id);
    modal(id?'Editar usuario':'Crear usuario', `
        <label>Nombre completo</label><input class="form-control mb-2" id="nu_nombre" maxlength="100" value="${esc(u.nombre)}" required>
        <label>Nombre de usuario</label><input class="form-control mb-2" id="nu_usuario" minlength="3" maxlength="30" pattern="[A-Za-z0-9._-]+" value="${esc(u.usuario)}" required>
        <label>Correo</label><input class="form-control mb-2" id="nu_correo" type="email" maxlength="120" value="${esc(u.correo)}" required>
        <label>Teléfono</label><input class="form-control mb-2" id="nu_telefono" type="tel" inputmode="numeric" maxlength="10" placeholder="10 dígitos" value="${esc(u.telefono||'')}">
        <label>Rol</label><select class="form-select" id="nu_rol" ${esPropio ? 'disabled' : ''}><option value="cajero" ${u.rol==='cajero'?'selected':''}>Cajero</option><option value="admin" ${u.rol==='admin'?'selected':''}>Administrador</option><option value="almacenista" ${u.rol==='almacenista'?'selected':''}>Almacenista</option></select>
        ${esPropio ? '<small class="text-muted">No puedes cambiar tu propio rol de administrador.</small>' : ''}
        ${id?'':'<small class="text-muted">Se generará una contraseña temporal única. El empleado deberá cambiarla al ingresar.</small>'}`,'Guardar',async()=>{
        const datos={accion:'guardar',nombre:$('#nu_nombre').value.trim(),usuario:$('#nu_usuario').value.trim(),correo:$('#nu_correo').value.trim(),telefono:$('#nu_telefono').value.trim(),rol:$('#nu_rol').value};
        if(id) datos.id=id;
        if(!datos.nombre||!datos.usuario||!datos.correo||!datos.rol) throw new Error('Completa los campos obligatorios');
        if(!/^[A-Za-z0-9._-]{3,30}$/.test(datos.usuario)) throw new Error('El usuario debe tener 3 a 30 caracteres, sin espacios');
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo)) throw new Error('Escribe un correo válido');
        const telefono = datos.telefono.replace(/\D/g, '');
        if(datos.telefono && !/^\d{10}$/.test(telefono)) throw new Error('El teléfono debe tener exactamente 10 dígitos');
        datos.telefono = telefono;
        const r=await api('usuarios.php','POST',datos);
        dlg.close();
        if(r.clave_temporal) modal('Contraseña temporal generada',`<p>Comparte esta contraseña con el empleado. Solo se muestra ahora.</p><div class="alert alert-warning fw-bold user-select-all">${esc(r.clave_temporal)}</div>`,'Copiar y cerrar',async()=>{await navigator.clipboard.writeText(r.clave_temporal);dlg.close();await renderUsuarios();});
        else {toast('Usuario actualizado');await renderUsuarios();}
    });
}

async function cargarUsuarios(){ try { const r=await api('usuarios.php','POST',{accion:'listar'}); listaUsuarios=r.usuarios||[]; if(S.view==='usuarios') render(); } catch(e){toast(e.message);} }
async function renderUsuarios(){ if(S.view==='usuarios') await cargarUsuarios(); }
async function cambiarEstadoUsuario(id,activo){ if(!confirm(activo?'¿Activar esta cuenta?':'¿Desactivar esta cuenta?'))return; try{await api('usuarios.php','POST',{accion:'estado',id,activo});toast('Estado actualizado');await renderUsuarios();}catch(e){toast(e.message);} }
async function restablecerClaveUsuario(id){const u=listaUsuarios.find(x=>Number(x.id)===id);if(!u||!confirm(`¿Seguro que deseas restablecer la contraseña de ${u.nombre}? Se generará una contraseña temporal nueva.`))return;try{const r=await api('usuarios.php','POST',{accion:'restablecer',id});modal('Contraseña temporal',`<p>Entrega esta contraseña al empleado. Deberá cambiarla al iniciar sesión.</p><div class="alert alert-warning fw-bold user-select-all">${esc(r.clave_temporal)}</div>`,'Cerrar',async()=>{dlg.close();});}catch(e){toast(e.message);} }
