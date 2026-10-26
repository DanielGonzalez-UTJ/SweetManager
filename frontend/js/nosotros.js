/*Quiénes somos, los textos y las fotos se editan aquí*/
const NOSOTROS = {
    texto: 'Somos una empresa dedicada a la venta y distribución de dulces, con el objetivo de llevar alegría a cada momento. Contamos con una gran variedad de productos de las mejores marcas, ofreciendo calidad y un excelente servicio a nuestros clientes.',
    fotos: [
        { src: 'imagenes/carrusel/frasco.svg', alt: 'Frasco lleno de dulces' },
        { src: 'imagenes/carrusel/paletas.svg', alt: 'Paletas de colores' },
        { src: 'imagenes/carrusel/golosinas.svg', alt: 'Caramelos y chocolate' }
    ],
    tarjetas: [
        {
            titulo: 'Misión',
            icono: 'track_changes',
            fondo: 'var(--sweet-pink)',
            tinta: '#ffffff',
            texto: 'Ofrecer una amplia variedad de dulces de calidad, con un servicio excelente y precios accesibles.'
        },
        {
            titulo: 'Visión',
            icono: 'visibility',
            fondo: 'var(--sweet-cyan)',
            tinta: '#ffffff',
            texto: 'Ser la dulcería líder en la región, reconocida por su calidad, innovación y satisfacción del cliente.'
        },
        {
            titulo: 'Valores',
            icono: 'workspace_premium',
            fondo: 'var(--sweet-yellow)',
            tinta: 'var(--sweet-navy)',
            texto: 'Calidad, honestidad, servicio, trabajo en equipo y pasión por lo que hacemos.'
        }
    ]
};

function vNosotros() {
    const fotos = NOSOTROS.fotos;

    return `
        <div class="card nosotros mb-3">
            <div class="row g-0">
                <div class="col-lg-6 nos-texto">
                    <h2 class="nos-titulo">Nuestra <span class="rosa">dulcería</span></h2>
                    <p>${NOSOTROS.texto}</p>
                </div>

                <div class="col-lg-6 nos-foto">
                    <div id="carruselNosotros" class="carousel slide">
                        <div class="carousel-indicators">
                            ${fotos.map((f, i) => `
                                <button
                                    type="button"
                                    data-bs-target="#carruselNosotros"
                                    data-bs-slide-to="${i}"
                                    class="${i === 0 ? 'active' : ''}"
                                    aria-label="Foto ${i + 1}"
                                ></button>
                            `).join('')}
                        </div>

                        <div class="carousel-inner">
                            ${fotos.map((f, i) => `
                                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                    <img src="${f.src}" alt="${esc(f.alt)}">
                                </div>
                            `).join('')}
                        </div>

                        <button class="carousel-control-prev" type="button" data-bs-target="#carruselNosotros" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Anterior</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#carruselNosotros" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Siguiente</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3">
            ${NOSOTROS.tarjetas.map(t => `
                <div class="col-md-4">
                    <div class="card nos-tarjeta">
                        <div class="nos-ico" style="background: ${t.fondo}; color: ${t.tinta}">
                            <span class="material-symbols-rounded">${t.icono}</span>
                        </div>
                        <div>
                            <h3>${t.titulo}</h3>
                            <p>${t.texto}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/*Activa el carrusel de Bootstrap cada vez que se dibuja la pantalla*/
function iniciaCarrusel() {
    const el = $('#carruselNosotros');

    if (!el || typeof bootstrap === 'undefined') return;

    bootstrap.Carousel.getOrCreateInstance(el, { ride: 'carousel', interval: 4000 });
}
