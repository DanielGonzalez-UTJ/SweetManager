/*Datos de prueba de SweetManager, se cargan después de esquema.sql*/

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
