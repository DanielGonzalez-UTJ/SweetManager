/*Estructuras de datos y algoritmos del proyecto*/

/*Búsqueda lineal, recorre el arreglo hasta encontrar el primer elemento que cumple*/
function buscaLineal(arreglo, condicion) {
    for (let i = 0; i < arreglo.length; i++) {
        if (condicion(arreglo[i])) return i;
    }

    return -1;
}

function encuentraLineal(arreglo, condicion) {
    const i = buscaLineal(arreglo, condicion);

    return i === -1 ? null : arreglo[i];
}

/*Filtra recorriendo todo el arreglo y juntando lo que cumple*/
function filtraLineal(arreglo, condicion) {
    const resultado = [];

    for (let i = 0; i < arreglo.length; i++) {
        if (condicion(arreglo[i])) resultado.push(arreglo[i]);
    }

    return resultado;
}

/*Atajos de búsqueda por id o folio*/
const buscarProducto = id => encuentraLineal(S.prods, p => p.id == id);
const buscarVenta = folio => encuentraLineal(S.ventas, v => v.f == folio);
const buscarFactura = folio => encuentraLineal(S.fac, f => f.f === folio);
const buscarPedido = id => encuentraLineal(S.ped, o => o.id == id);
const buscarLinea = id => encuentraLineal(S.cart, l => l.p.id == id);


/*Ordenamiento burbuja, compara vecinos y los intercambia, devuelve una copia ordenada*/
function ordenaBurbuja(arreglo, comparar) {
    const a = [];

    for (let i = 0; i < arreglo.length; i++) a.push(arreglo[i]);

    for (let pasada = 0; pasada < a.length - 1; pasada++) {
        let huboCambio = false;

        for (let j = 0; j < a.length - 1 - pasada; j++) {
            if (comparar(a[j], a[j + 1]) > 0) {
                const temporal = a[j];

                a[j] = a[j + 1];
                a[j + 1] = temporal;
                huboCambio = true;
            }
        }

        if (!huboCambio) break;
    }

    return a;
}

/*Formas de ordenar las ventas del día*/
const ORDENES = {
    reciente: ['Más recientes', (a, b) => b.f - a.f],
    antiguo: ['Más antiguas', (a, b) => a.f - b.f],
    mayor: ['Total de mayor a menor', (a, b) => b.t - a.t],
    menor: ['Total de menor a mayor', (a, b) => a.t - b.t]
};

const ventasOrdenadas = () => ordenaBurbuja(S.ventas, ORDENES[S.orden][1]);


/*Pila, lo último que entra es lo primero que sale*/
class Pila {
    constructor() {
        this.items = [];
    }

    apilar(dato) {
        this.items.push(dato);
    }

    desapilar() {
        return this.items.pop();
    }

    cima() {
        return this.items[this.items.length - 1];
    }

    vacia() {
        return this.items.length === 0;
    }

    tamano() {
        return this.items.length;
    }

    vaciar() {
        this.items = [];
    }
}


/*Cola, lo primero que entra es lo primero que sale*/
class Cola {
    constructor() {
        this.items = [];
    }

    encolar(dato) {
        this.items.push(dato);
    }

    desencolar() {
        return this.items.shift();
    }

    frente() {
        return this.items[0];
    }

    vacia() {
        return this.items.length === 0;
    }

    tamano() {
        return this.items.length;
    }

    aArreglo() {
        return this.items.slice();
    }
}


/*Lista doblemente enlazada, cada nodo conoce al anterior y al siguiente*/
class NodoDoble {
    constructor(dato) {
        this.dato = dato;
        this.ant = null;
        this.sig = null;
    }
}

class ListaDoble {
    constructor() {
        this.cabeza = null;
        this.cola = null;
        this.largo = 0;
    }

    agregarAlFinal(dato) {
        const nodo = new NodoDoble(dato);

        if (this.cola) {
            this.cola.sig = nodo;
            nodo.ant = this.cola;
        } else {
            this.cabeza = nodo;
        }

        this.cola = nodo;
        this.largo++;
        return nodo;
    }

    agregarAlInicio(dato) {
        const nodo = new NodoDoble(dato);

        if (this.cabeza) {
            this.cabeza.ant = nodo;
            nodo.sig = this.cabeza;
        } else {
            this.cola = nodo;
        }

        this.cabeza = nodo;
        this.largo++;
        return nodo;
    }

    eliminar(nodo) {
        if (!nodo) return;

        if (nodo.ant) nodo.ant.sig = nodo.sig;
        else this.cabeza = nodo.sig;

        if (nodo.sig) nodo.sig.ant = nodo.ant;
        else this.cola = nodo.ant;

        nodo.ant = null;
        nodo.sig = null;
        this.largo--;
    }

    buscar(condicion) {
        let nodo = this.cabeza;

        while (nodo) {
            if (condicion(nodo.dato)) return nodo;
            nodo = nodo.sig;
        }

        return null;
    }

    posicion(nodo) {
        let actual = this.cabeza;
        let i = 1;

        while (actual && actual !== nodo) {
            actual = actual.sig;
            i++;
        }

        return actual ? i : 0;
    }

    /*Recorre hacia atrás desde el último nodo*/
    desdeElFinal(limite) {
        const datos = [];
        let nodo = this.cola;

        while (nodo && datos.length < limite) {
            datos.push(nodo.dato);
            nodo = nodo.ant;
        }

        return datos;
    }
}


/*Recursividad, el caso base es cuando ya no quedan renglones del ticket*/
function sumaTicket(renglones, i = 0) {
    if (i >= renglones.length) return 0;

    return renglones[i].p.p * renglones[i].q + sumaTicket(renglones, i + 1);
}

function piezasTicket(renglones, i = 0) {
    if (i >= renglones.length) return 0;

    return renglones[i].q + piezasTicket(renglones, i + 1);
}


/*Deshacer en el ticket, usa una pila de fotos del ticket*/
function guardaTicket() {
    const foto = S.cart.map(l => ({ id: l.p.id, q: l.q }));

    if (JSON.stringify(foto) === JSON.stringify(S.historial.cima())) return;

    S.historial.apilar(foto);
}

/*Arma el ticket otra vez respetando la existencia actual*/
function armaTicket(guardado) {
    const renglones = [];

    for (let i = 0; i < guardado.length; i++) {
        const p = buscarProducto(guardado[i].id);
        const q = p ? Math.min(guardado[i].q, p.s) : 0;

        if (q > 0) renglones.push({ p, q });
    }

    return renglones;
}

function deshacer() {
    if (S.historial.vacia()) return toast('No hay nada que deshacer');

    S.cart = armaTicket(S.historial.desapilar());
    toast('Cambio deshecho');
    render();
}


/*Ventas en espera, usa una cola, el primero que espera es el primero que se retoma*/
function ponerEnEspera() {
    if (!S.cart.length) return toast('El ticket está vacío');

    S.espera.encolar(S.cart.map(l => ({ id: l.p.id, q: l.q })));
    S.cart = [];
    S.recv = '';
    S.historial.vaciar();
    registra('Ticket puesto en espera');
    toast('Ticket en espera, lugar ' + S.espera.tamano());
    render();
}

function retomar() {
    if (S.espera.vacia()) return toast('No hay tickets en espera');
    if (S.cart.length) return toast('Termina o pon en espera el ticket actual');

    S.cart = armaTicket(S.espera.desencolar());
    S.historial.vaciar();
    registra('Ticket retomado');
    toast('Ticket retomado');
    render();
}


/*Bitácora de actividad, usa una lista doblemente enlazada de máximo 50 eventos*/
function registra(texto) {
    S.bitacora.agregarAlFinal({
        texto,
        hora: hora(),
        usuario: SESION ? SESION.nombre : ''
    });

    if (S.bitacora.largo > 50) S.bitacora.eliminar(S.bitacora.cabeza);
}

/*Ventas en una lista doble, para pasar de un ticket al anterior o al siguiente*/
function listaVentas() {
    const lista = new ListaDoble();

    for (let i = 0; i < S.ventas.length; i++) lista.agregarAlFinal(S.ventas[i]);

    return lista;
}


/*Inicio de las estructuras*/
S.historial = new Pila();
S.espera = new Cola();
S.bitacora = new ListaDoble();
S.orden = 'reciente';
