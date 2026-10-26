/*Utilidades y estado de la pantalla*/
const $ = s => document.querySelector(s);
const money = n => '$' + n.toFixed(2);

const S = {
    view: 'dashboard',
    cat: 'Todos',
    q: '',
    cart: [],
    pay: 'Efectivo',
    fact: false,
    recv: '',
    ...BD
};

/*Guardado local desactivado, para remplazarla por la base de datos

const KEY = 'sweetmanager.v1';

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify({ p: S.prods, v: S.ventas, f: S.fac, n: S.folio, t: S.turno, o: S.ped, pf: S.pf }));
    } catch (_) {}
}

function load() {
    try {
        const d = JSON.parse(localStorage.getItem(KEY));
        if (d) {
            S.prods = d.p;
            S.ventas = d.v;
            S.fac = d.f;
            S.folio = d.n;
            S.turno = d.t;
            S.ped = d.o || [];
            S.pf = d.pf || 1;
        }
    } catch (_) {}
}

load();
*/
