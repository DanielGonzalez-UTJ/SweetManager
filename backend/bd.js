/*Conexión con la API compartida con la app móvil, pendiente

const API_URL = 'http://localhost:3000/api';
let TOKEN = null;

async function api(ruta, metodo = 'GET', cuerpo) {
    const r = await fetch(API_URL + ruta, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + TOKEN
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });

    if (!r.ok) throw new Error('Error de servidor: ' + r.status);
    return r.json();
}

Rutas previstas
productos: api('/productos')
venta: api('/ventas', 'POST', venta)
turno: api('/turnos', 'POST', turno)
pedido: api('/pedidos', 'POST', pedido)
proveedores: api('/proveedores')
*/
