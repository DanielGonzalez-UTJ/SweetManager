/*Script completo de SweetManager para MySQL Workbench: estructura y datos de prueba en un solo archivo*/
/*Base de datos de SweetManager para la web: administrador y cajero*/
/*Hecha para MySQL 8 y MariaDB 10.4 o superior, la que trae XAMPP*/

/*Para empezar de cero, quita los símbolos de comentario de la siguiente línea*/
/* DROP DATABASE IF EXISTS sweetmanager; */

CREATE DATABASE IF NOT EXISTS sweetmanager
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sweetmanager;


/*Usuarios de la web, la clave se guarda encriptada*/
CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(30) NOT NULL UNIQUE,
    clave_hash VARCHAR(255) NOT NULL,
    correo VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(20) NULL,
    rol ENUM('admin', 'cajero') NOT NULL,
    sexo ENUM('hombre', 'mujer') NOT NULL DEFAULT 'hombre',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME NULL,
    creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;


/*Categorías y productos, el precio ya incluye el IVA del 16 por ciento*/
CREATE TABLE categorias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE = InnoDB;

CREATE TABLE productos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    categoria_id INT UNSIGNED NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    emoji VARCHAR(16) NOT NULL DEFAULT '🍬',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
    CONSTRAINT ck_productos_precio CHECK (precio >= 0),
    CONSTRAINT ck_productos_stock CHECK (stock >= 0),
    INDEX idx_productos_categoria (categoria_id)
) ENGINE = InnoDB;


/*Proveedores y los productos que ofrece cada uno*/
CREATE TABLE proveedores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NULL,
    estado ENUM('Activo', 'Pedido pendiente', 'Inactivo') NOT NULL DEFAULT 'Activo'
) ENGINE = InnoDB;

CREATE TABLE proveedor_producto (
    proveedor_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (proveedor_id, producto_id),
    CONSTRAINT fk_pp_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id) ON DELETE CASCADE,
    CONSTRAINT fk_pp_producto FOREIGN KEY (producto_id) REFERENCES productos (id)
) ENGINE = InnoDB;


/*Turnos de caja, un turno abierto tiene el cierre vacío*/
CREATE TABLE turnos_caja (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    fondo_inicial DECIMAL(10, 2) NOT NULL,
    apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cierre DATETIME NULL,
    efectivo_esperado DECIMAL(10, 2) NULL,
    efectivo_contado DECIMAL(10, 2) NULL,
    diferencia DECIMAL(10, 2) NULL,
    CONSTRAINT fk_turnos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT ck_turnos_fondo CHECK (fondo_inicial >= 0)
) ENGINE = InnoDB;


/*Pedidos para otro día, se atienden por fecha de entrega, el folio es P y el número con tres dígitos*/
CREATE TABLE pedidos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NULL,
    fecha_entrega DATETIME NOT NULL,
    nota VARCHAR(255) NULL,
    total DECIMAL(10, 2) NOT NULL,
    estado ENUM('pendiente', 'preparando', 'listo', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    usuario_id INT UNSIGNED NOT NULL,
    creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT ck_pedidos_total CHECK (total >= 0),
    INDEX idx_pedidos_cola (estado, fecha_entrega)
) ENGINE = InnoDB;

CREATE TABLE pedido_detalle (
    pedido_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (pedido_id, producto_id),
    CONSTRAINT fk_pd_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
    CONSTRAINT fk_pd_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT ck_pd_cantidad CHECK (cantidad > 0)
) ENGINE = InnoDB;


/*Ventas, el folio es el id y empieza en 1001*/
CREATE TABLE ventas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    turno_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    pedido_id INT UNSIGNED NULL UNIQUE,
    subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    forma_pago ENUM('Efectivo', 'Tarjeta') NOT NULL,
    recibido DECIMAL(10, 2) NOT NULL,
    cambio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estado ENUM('pagada', 'cancelada') NOT NULL DEFAULT 'pagada',
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelada_en DATETIME NULL,
    cancelada_por INT UNSIGNED NULL,
    CONSTRAINT fk_ventas_turno FOREIGN KEY (turno_id) REFERENCES turnos_caja (id),
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_ventas_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
    CONSTRAINT fk_ventas_cancelo FOREIGN KEY (cancelada_por) REFERENCES usuarios (id),
    CONSTRAINT ck_ventas_total CHECK (total >= 0 AND subtotal + iva = total),
    INDEX idx_ventas_fecha (fecha)
) ENGINE = InnoDB AUTO_INCREMENT = 1001;

CREATE TABLE venta_detalle (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    importe DECIMAL(10, 2) AS (cantidad * precio_unitario) STORED,
    CONSTRAINT fk_vd_venta FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
    CONSTRAINT fk_vd_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
    CONSTRAINT ck_vd_cantidad CHECK (cantidad > 0),
    INDEX idx_vd_venta (venta_id)
) ENGINE = InnoDB;


/*Facturas, siempre al público en general, el folio es F y el número de la venta*/
CREATE TABLE facturas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id INT UNSIGNED NOT NULL UNIQUE,
    folio VARCHAR(20) AS (CONCAT('F-', venta_id)) STORED UNIQUE,
    receptor VARCHAR(120) NOT NULL DEFAULT 'Público en general',
    rfc VARCHAR(13) NOT NULL DEFAULT 'XAXX010101000',
    subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    estado ENUM('vigente', 'cancelada') NOT NULL DEFAULT 'vigente',
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_facturas_venta FOREIGN KEY (venta_id) REFERENCES ventas (id),
    CONSTRAINT ck_facturas_total CHECK (subtotal + iva = total)
) ENGINE = InnoDB;


/*Triggers: la base de datos cuida la existencia aunque falle la web*/
DELIMITER $$

/*Impide vender más de lo que hay*/
CREATE TRIGGER trg_detalle_valida
BEFORE INSERT ON venta_detalle
FOR EACH ROW
BEGIN
    DECLARE disponible INT;

    SELECT stock INTO disponible FROM productos WHERE id = NEW.producto_id;

    IF disponible < NEW.cantidad THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Existencia insuficiente';
    END IF;
END$$

/*Descuenta la existencia al registrar cada producto vendido*/
CREATE TRIGGER trg_detalle_descuenta
AFTER INSERT ON venta_detalle
FOR EACH ROW
BEGIN
    UPDATE productos SET stock = stock - NEW.cantidad WHERE id = NEW.producto_id;
END$$

/*Al cancelar una venta regresa la existencia y anula su factura*/
CREATE TRIGGER trg_venta_cancela
AFTER UPDATE ON ventas
FOR EACH ROW
BEGIN
    IF OLD.estado = 'pagada' AND NEW.estado = 'cancelada' THEN
        UPDATE productos p
        JOIN venta_detalle d ON d.producto_id = p.id
        SET p.stock = p.stock + d.cantidad
        WHERE d.venta_id = NEW.id;

        UPDATE facturas SET estado = 'cancelada' WHERE venta_id = NEW.id;
    END IF;
END$$

DELIMITER ;


/*Vistas que usa la web*/

/*Cola de pedidos en orden de atención*/
CREATE VIEW v_pedidos_cola AS
SELECT
    ROW_NUMBER() OVER (ORDER BY p.fecha_entrega, p.id) AS posicion,
    p.id,
    CONCAT('P-', LPAD(p.id, 3, '0')) AS folio,
    p.cliente_nombre,
    p.cliente_telefono,
    p.fecha_entrega,
    p.nota,
    p.total,
    p.estado
FROM pedidos p
WHERE p.estado IN ('pendiente', 'preparando', 'listo');

/*Alertas de existencias del dashboard*/
CREATE VIEW v_alertas_existencias AS
SELECT
    p.id,
    p.emoji,
    p.nombre,
    p.stock,
    p.stock_minimo,
    CASE WHEN p.stock = 0 THEN 'Agotado' ELSE 'Stock bajo' END AS estado
FROM productos p
WHERE p.activo = 1 AND p.stock <= p.stock_minimo
ORDER BY p.stock;

/*Ventas de hoy por hora, para la gráfica del dashboard*/
CREATE VIEW v_ventas_por_hora_hoy AS
SELECT
    HOUR(v.fecha) AS hora,
    COUNT(*) AS tickets,
    SUM(v.total) AS total
FROM ventas v
WHERE v.estado = 'pagada' AND DATE(v.fecha) = CURDATE()
GROUP BY HOUR(v.fecha);

/*Los cinco productos más vendidos hoy*/
CREATE VIEW v_mas_vendidos_hoy AS
SELECT
    d.nombre,
    SUM(d.cantidad) AS piezas
FROM venta_detalle d
JOIN ventas v ON v.id = d.venta_id
WHERE v.estado = 'pagada' AND DATE(v.fecha) = CURDATE()
GROUP BY d.nombre
ORDER BY piezas DESC
LIMIT 5;

/*Totales de cada turno para el corte de caja*/
CREATE VIEW v_corte_turno AS
SELECT
    t.id AS turno_id,
    t.fondo_inicial,
    COALESCE(SUM(CASE WHEN v.forma_pago = 'Efectivo' THEN v.total END), 0) AS efectivo,
    COALESCE(SUM(CASE WHEN v.forma_pago = 'Tarjeta' THEN v.total END), 0) AS tarjeta,
    t.fondo_inicial + COALESCE(SUM(CASE WHEN v.forma_pago = 'Efectivo' THEN v.total END), 0) AS efectivo_esperado
FROM turnos_caja t
LEFT JOIN ventas v ON v.turno_id = t.id AND v.estado = 'pagada'
GROUP BY t.id, t.fondo_inicial;



USE sweetmanager;

/*Usuarios, la contraseña de prueba es 1234 y la API real debe usar bcrypt*/
INSERT INTO usuarios (nombre, usuario, clave_hash, correo, telefono, rol, sexo) VALUES
    ('Ana López', 'alopez', SHA2('1234', 256), 'ana.lopez@dulceria.com', '33 1111 2222', 'admin', 'mujer'),
    ('Juan Pérez', 'jperez', SHA2('1234', 256), 'juan.perez@dulceria.com', '33 1234 5678', 'cajero', 'hombre');

/*Categorías*/
INSERT INTO categorias (nombre) VALUES
    ('Paletas'),
    ('Chocolates'),
    ('Gomitas'),
    ('Caramelos'),
    ('Chicles'),
    ('Mayoreo');

/*Productos, las existencias salen de datos.js*/
INSERT INTO productos (id, nombre, categoria_id, precio, stock, stock_minimo, emoji) VALUES
    (1, 'Paleta espiral', 1, 8, 120, 30, '🍭'),
    (2, 'Paleta enchilada', 1, 10, 14, 30, '🌶️'),
    (3, 'Chocolate de leche', 2, 18, 60, 20, '🍫'),
    (4, 'Barra almendra', 2, 25, 0, 15, '🥜'),
    (5, 'Gomitas ositos 100g', 3, 22, 45, 20, '🧸'),
    (6, 'Gomitas ácidas', 3, 24, 9, 20, '🐛'),
    (7, 'Caramelo macizo', 4, 2, 400, 100, '🍬'),
    (8, 'Menta bolsa', 4, 15, 70, 25, '🌿'),
    (9, 'Chicle globo', 5, 3, 250, 80, '🫧'),
    (10, 'Malvaviscos', 3, 28, 33, 15, '☁️️'),
    (11, 'Bolsa fiesta 1kg', 6, 140, 18, 10, '🎉'),
    (12, 'Piñata surtida', 6, 260, 6, 8, '🪅');

/*Proveedores*/
INSERT INTO proveedores (id, nombre, telefono, estado) VALUES
    (1, 'Dulces del Valle', '33 1234 5678', 'Activo'),
    (2, 'Choco Distribuciones', '33 8765 4321', 'Activo'),
    (3, 'Gomitas Mexicanas', '33 5555 0101', 'Pedido pendiente');

/*Productos que ofrece cada proveedor*/
INSERT INTO proveedor_producto (proveedor_id, producto_id) VALUES
    (1, 1),
    (1, 2),
    (1, 7),
    (1, 8),
    (2, 3),
    (2, 4),
    (3, 5),
    (3, 6),
    (3, 10);

/*Un turno abierto del cajero*/
INSERT INTO turnos_caja (usuario_id, fondo_inicial) VALUES (2, 500.00);

/*Venta 1001 en efectivo, dos paletas espiral y un chocolate de leche, con factura*/
INSERT INTO ventas (turno_id, usuario_id, subtotal, iva, total, forma_pago, recibido, cambio) VALUES
    (1, 2, ROUND(34 / 1.16, 2), 34 - ROUND(34 / 1.16, 2), 34.00, 'Efectivo', 50.00, 16.00);

INSERT INTO venta_detalle (venta_id, producto_id, nombre, cantidad, precio_unitario) VALUES
    (1001, 1, 'Paleta espiral', 2, 8.00),
    (1001, 3, 'Chocolate de leche', 1, 18.00);

INSERT INTO facturas (venta_id, subtotal, iva, total)
SELECT id, subtotal, iva, total FROM ventas WHERE id = 1001;

/*Venta 1002 con tarjeta, tres caramelos macizos y unas gomitas de ositos*/
INSERT INTO ventas (turno_id, usuario_id, subtotal, iva, total, forma_pago, recibido) VALUES
    (1, 2, ROUND(28 / 1.16, 2), 28 - ROUND(28 / 1.16, 2), 28.00, 'Tarjeta', 28.00);

INSERT INTO venta_detalle (venta_id, producto_id, nombre, cantidad, precio_unitario) VALUES
    (1002, 7, 'Caramelo macizo', 3, 2.00),
    (1002, 5, 'Gomitas ositos 100g', 1, 22.00);

/*Un pedido para mañana a las 10:00*/
INSERT INTO pedidos (cliente_nombre, cliente_telefono, fecha_entrega, nota, total, usuario_id) VALUES
    ('María García', '33 5555 1234', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'), 'Para fiesta infantil', 540.00, 2);

INSERT INTO pedido_detalle (pedido_id, producto_id, nombre, cantidad, precio_unitario) VALUES
    (1, 12, 'Piñata surtida', 1, 260.00),
    (1, 11, 'Bolsa fiesta 1kg', 2, 140.00);
