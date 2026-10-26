# Conexión de SweetManager con MySQL Workbench

Esta guía sirve para crear la base de datos en tu computadora y verla desde MySQL Workbench.
El archivo que se usa es `sweetmanager-completo.sql`, que trae la estructura y los datos de prueba.

## 1. Tener el servidor encendido

- Si usas XAMPP: abre el panel de control y presiona Start en MySQL.
- Si instalaste MySQL Community Server: ya corre como servicio de Windows.

## 2. Crear la conexión en Workbench

1. Abre MySQL Workbench y en la pantalla de inicio presiona el signo + junto a MySQL Connections.
2. Llena los datos así:

| Campo | Valor |
| --- | --- |
| Connection Name | SweetManager local |
| Connection Method | Standard (TCP/IP) |
| Hostname | 127.0.0.1 |
| Port | 3306 |
| Username | root |

3. Presiona Store in Vault y escribe la contraseña de root. En XAMPP viene vacía, así que déjala vacía. Si instalaste MySQL por separado, es la que pusiste en la instalación.
4. Presiona Test Connection. Debe decir Successfully made the MySQL connection. Luego OK.

Si usas XAMPP, Workbench puede avisar que la versión del servidor no es de MySQL, porque XAMPP trae MariaDB. Presiona Continue Anyway; funciona igual.

## 3. Cargar la base de datos

1. Abre la conexión con doble clic.
2. Menú File, Open SQL Script, y elige `sweetmanager-completo.sql`.
3. Presiona el rayo (Execute) o Ctrl + Shift + Enter para ejecutarlo completo.
4. En el panel izquierdo (Schemas) presiona el botón de actualizar. Debe aparecer `sweetmanager`.

Workbench entiende la línea DELIMITER de los triggers, así que no hay que cambiar nada.

## 4. Comprobar que quedó bien

Abre una pestaña nueva de consulta (Ctrl + T) y ejecuta:

```sql
USE sweetmanager;

SHOW TABLES;

SELECT * FROM v_alertas_existencias;
SELECT * FROM v_pedidos_cola;
SELECT * FROM v_corte_turno;
```

Debes ver 11 tablas y 5 vistas, 4 productos en alerta (Barra almendra agotada, y Gomitas ácidas, Paleta enchilada y Piñata surtida con poco stock), un pedido en la cola y un corte con las dos ventas de prueba: 34.00 en efectivo, 28.00 con tarjeta y 534.00 de efectivo esperado.

## 5. Diagrama para tu documento

1. Menú Database, Reverse Engineer.
2. Elige la conexión, selecciona `sweetmanager` y avanza hasta el final.
3. Workbench dibuja el diagrama entidad-relación. Acomoda las tablas y exporta con File, Export, Export as PNG.

## 6. Usuario propio para la aplicación (recomendado)

No conviene que la aplicación entre como root. Con tu conexión abierta, ejecuta:

```sql
CREATE USER 'sweetmanager_web'@'localhost' IDENTIFIED BY 'cambia_esta_clave';
GRANT SELECT, INSERT, UPDATE ON sweetmanager.* TO 'sweetmanager_web'@'localhost';
FLUSH PRIVILEGES;
```

Ese usuario puede leer, registrar y actualizar, pero no borrar tablas ni la base de datos.

## Si algo falla

- Error 2003, Can't connect: el servidor no está encendido o el puerto no es 3306.
- Error 1045, Access denied: la contraseña de root no es la correcta.
- Error de sintaxis al ejecutar: copia el mensaje completo con el número de línea y envíalo.
