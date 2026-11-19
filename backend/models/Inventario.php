<?php
/* Consultas y escrituras del Kardex, solicitudes y compras. */
class Inventario
{
    public function lotesPorCaducar(int $dias=30): array
    {
        $dias=max(0,min(365,(int)$dias));
        return Database::pdo()->query('SELECT l.id,l.producto_id,p.nombre AS producto,l.lote,l.caducidad,l.cantidad_disponible,(l.caducidad<CURDATE()) AS vencido FROM inventario_lotes l JOIN productos p ON p.id=l.producto_id WHERE l.cantidad_disponible>0 AND l.caducidad IS NOT NULL AND l.caducidad <= DATE_ADD(CURDATE(),INTERVAL '.$dias.' DAY) ORDER BY l.caducidad,l.id')->fetchAll();
    }

    public function movimientos(int $limite = 100): array
    {
        $st = Database::pdo()->prepare('SELECT m.id, m.producto_id, p.nombre AS producto, m.tipo, m.cantidad, m.stock_resultante, m.motivo, m.referencia, m.lote, m.caducidad, m.creado, u.nombre AS usuario FROM movimientos_inventario m JOIN productos p ON p.id=m.producto_id JOIN usuarios u ON u.id=m.usuario_id ORDER BY m.id DESC LIMIT ?');
        $st->bindValue(1, $limite, PDO::PARAM_INT);
        $st->execute();
        return $st->fetchAll();
    }

    public function solicitudes(bool $soloPropias = false, int $usuarioId = 0): array
    {
        $sql = 'SELECT s.*, u.nombre AS solicitante, c.id AS orden_id FROM solicitudes_abastecimiento s JOIN usuarios u ON u.id=s.usuario_id LEFT JOIN ordenes_compra c ON c.solicitud_id=s.id';
        if ($soloPropias) $sql .= ' WHERE s.usuario_id = ?';
        $sql .= ' ORDER BY FIELD(s.estado,\'pendiente\',\'en_gestion\',\'confirmada\',\'recibida\',\'rechazada\'), s.creado DESC';
        $st = Database::pdo()->prepare($sql);
        $st->execute($soloPropias ? [$usuarioId] : []);
        $rows = $st->fetchAll();
        if (!$rows) return [];
        $ids = array_column($rows, 'id');
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $det = Database::pdo()->prepare("SELECT d.solicitud_id, d.producto_id, p.nombre AS producto, d.cantidad FROM solicitud_abastecimiento_detalle d JOIN productos p ON p.id=d.producto_id WHERE d.solicitud_id IN ($marks)");
        $det->execute($ids);
        $map = [];
        foreach ($det->fetchAll() as $r) $map[$r['solicitud_id']][] = $r;
        foreach ($rows as &$r) $r['items'] = $map[$r['id']] ?? [];
        return $rows;
    }

    public function compras(): array
    {
        $rows = Database::pdo()->query("SELECT c.*, p.nombre AS proveedor FROM ordenes_compra c JOIN proveedores p ON p.id=c.proveedor_id WHERE c.estado IN ('confirmada','parcial') ORDER BY c.fecha_estimada, c.id")->fetchAll();
        foreach ($rows as &$r) {
            $st = Database::pdo()->prepare('SELECT d.id AS linea_id, d.producto_id, p.nombre AS producto, d.cantidad, d.recibida, d.precio_compra FROM orden_compra_detalle d JOIN productos p ON p.id=d.producto_id WHERE d.compra_id=?');
            $st->execute([$r['id']]);
            $r['items'] = $st->fetchAll();
        }
        return $rows;
    }

    public function crearSolicitud(array $u, array $datos, array $items): int
    {
        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare("INSERT INTO solicitudes_abastecimiento (cliente_nombre, cliente_telefono, fecha_requerida, nota, usuario_id) VALUES (?,?,?,?,?)");
            $ins->execute([$datos['cliente'], $datos['telefono'], $datos['fecha'], $datos['nota'], (int)$u['id']]);
            $id = (int)$pdo->lastInsertId();
            $line = $pdo->prepare('INSERT INTO solicitud_abastecimiento_detalle (solicitud_id, producto_id, cantidad) VALUES (?,?,?)');
            $incoming=$pdo->prepare("SELECT COALESCE(SUM(d.cantidad-d.recibida),0) FROM orden_compra_detalle d JOIN ordenes_compra c ON c.id=d.compra_id WHERE d.producto_id=? AND c.estado IN ('confirmada','parcial') AND c.fecha_estimada<=?");
            $encontrados = 0;
            foreach ($items as $it) {
                $pid = (int)($it['id'] ?? 0); $qty = (int)($it['q'] ?? 0);
                if ($pid < 1 || $qty < 1 || $qty > 9999) continue;
                $lock = $pdo->prepare('SELECT p.stock, p.stock_reservado, GREATEST(0,p.stock-p.stock_reservado-COALESCE((SELECT SUM(l.cantidad_disponible) FROM inventario_lotes l WHERE l.producto_id=p.id AND l.caducidad<CURDATE()),0)) AS disponible FROM productos p WHERE p.id=? AND p.activo=1 FOR UPDATE');
                $lock->execute([$pid]); $p = $lock->fetch();
                if (!$p) continue;
                if ((int)$p['disponible'] >= $qty) continue;
                $incoming->execute([$pid,$datos['fecha']]);
                if ((int)$p['disponible']+(int)$incoming->fetchColumn() >= $qty) continue;
                $line->execute([$id, $pid, $qty]); $encontrados++;
            }
            if (!$encontrados) throw new ApiError('No se generó solicitud porque ya hay existencias o una recepción confirmada suficiente para esa fecha. Intenta registrar el pedido.', 409);
            $pdo->commit();
            return $id;
        } catch (Throwable $e) { Database::revertir(); throw $e; }
    }

    public function resolverSolicitud(int $id, string $estado, string $nota): void
    {
        if (!in_array($estado, ['en_gestion','confirmada','rechazada'], true)) throw new ApiError('Estado de solicitud no válido');
        $st = Database::pdo()->prepare("UPDATE solicitudes_abastecimiento SET estado=?, respuesta_admin=?, atendida_en=NOW() WHERE id=? AND estado IN ('pendiente','en_gestion','confirmada')");
        $st->execute([$estado, $nota !== '' ? $nota : null, $id]);
        if (!$st->rowCount()) throw new ApiError('La solicitud no existe o ya fue cerrada', 409);
    }

    public function crearCompra(array $u, int $proveedor, string $fecha, string $nota, array $items, ?int $solicitudId=null): int
    {
        $pdo = Database::pdo(); $pdo->beginTransaction();
        try {
            $prov=$pdo->prepare("SELECT id FROM proveedores WHERE id=? AND estado='Activo'");
            $prov->execute([$proveedor]);
            if (!$prov->fetchColumn()) throw new ApiError('Selecciona un proveedor activo',409);
            $st = $pdo->prepare("INSERT INTO ordenes_compra (solicitud_id,proveedor_id, fecha_estimada, nota, usuario_id) VALUES (?,?,?,?,?)");
            if($solicitudId){
                $sol=$pdo->prepare("SELECT id,fecha_requerida FROM solicitudes_abastecimiento WHERE id=? AND estado IN ('pendiente','en_gestion','confirmada') FOR UPDATE"); $sol->execute([$solicitudId]);
                $solFila=$sol->fetch();
                if(!$solFila) throw new ApiError('La solicitud ya no está disponible para generar una compra',409);
                if(strtotime($fecha)>strtotime($solFila['fecha_requerida'])) throw new ApiError('La entrega del proveedor sería posterior a la fecha que necesita el cliente',409);
                $vinculada=$pdo->prepare('SELECT COUNT(*) FROM ordenes_compra WHERE solicitud_id=?'); $vinculada->execute([$solicitudId]);
                if((int)$vinculada->fetchColumn()>0) throw new ApiError('La solicitud ya tiene una orden de compra vinculada',409);
            }
            $st->execute([$solicitudId,$proveedor, $fecha, $nota ?: null, (int)$u['id']]);
            $id = (int)$pdo->lastInsertId();
            if($solicitudId) $pdo->prepare("UPDATE solicitudes_abastecimiento SET estado='confirmada',atendida_en=NOW() WHERE id=?")->execute([$solicitudId]);
            $det = $pdo->prepare('INSERT INTO orden_compra_detalle (compra_id, producto_id, cantidad, precio_compra) VALUES (?,?,?,?)');
            $n = 0;
            foreach ($items as $it) {
                $pid=(int)($it['id']??0); $q=(int)($it['q']??0); $c=(float)($it['costo']??0);
                if ($pid<1 || $q<1 || $q>99999 || $c<0) continue;
                $exists=$pdo->prepare('SELECT id FROM productos WHERE id=? AND activo=1'); $exists->execute([$pid]);
                if (!$exists->fetchColumn()) continue;
                $det->execute([$id,$pid,$q,number_format($c,2,'.','')]); $n++;
            }
            if (!$n) throw new ApiError('Agrega al menos un producto válido a la compra');
            $pdo->commit(); return $id;
        } catch(Throwable $e){ Database::revertir(); throw $e; }
    }

    public function recibirCompra(array $u, int $compraId, array $items): void
    {
        $pdo=Database::pdo(); $pdo->beginTransaction();
        try {
            $lock=$pdo->prepare("SELECT id, estado FROM ordenes_compra WHERE id=? FOR UPDATE"); $lock->execute([$compraId]); $compra=$lock->fetch();
            if (!$compra || !in_array($compra['estado'], ['confirmada','parcial'], true)) throw new ApiError('La orden no está disponible para recepción',409);
            $rec=$pdo->prepare('INSERT INTO recepciones (compra_id, usuario_id) VALUES (?,?)'); $rec->execute([$compraId,(int)$u['id']]); $recepcionId=(int)$pdo->lastInsertId();
            $get=$pdo->prepare('SELECT d.id,d.producto_id,d.cantidad,d.recibida,d.precio_compra,p.nombre FROM orden_compra_detalle d JOIN productos p ON p.id=d.producto_id WHERE d.id=? AND d.compra_id=? FOR UPDATE');
            $upd=$pdo->prepare('UPDATE orden_compra_detalle SET recibida=recibida+? WHERE id=?');
            $stock=$pdo->prepare('UPDATE productos SET stock=stock+?, precio_compra=? WHERE id=?');
            $mov=$pdo->prepare("INSERT INTO movimientos_inventario (producto_id,tipo,cantidad,stock_resultante,motivo,referencia,lote,caducidad,usuario_id) SELECT id,'entrada_compra',?,stock,?,?,?, ?,? FROM productos WHERE id=?");
            $rd=$pdo->prepare('INSERT INTO recepcion_detalle (recepcion_id,producto_id,cantidad,lote,caducidad) VALUES (?,?,?,?,?)');
            $recibidos=0;
            foreach ($items as $it) {
                $lineId=(int)($it['linea_id']??0); $q=(int)($it['cantidad']??0); $lote=trim((string)($it['lote']??'')); $cad=trim((string)($it['caducidad']??''));
                if ($lineId<1 || $q<1) continue;
                $get->execute([$lineId,$compraId]); $line=$get->fetch();
                if (!$line || (int)$line['recibida']+$q>(int)$line['cantidad']) throw new ApiError('La cantidad recibida supera lo pendiente de la orden',409);
                $upd->execute([$q,$lineId]); $stock->execute([$q,$line['precio_compra'],$line['producto_id']]);
                if($cad!=='' && $cad<date('Y-m-d')) throw new ApiError('No se puede ingresar mercancía con fecha de caducidad vencida');
                $cadVal=$cad!==''?$cad:null; $loteVal=$lote!==''?$lote:null;
                $loteReal=$loteVal ?: ('REC-'.$recepcionId.'-'.$line['producto_id']);
                $rd->execute([$recepcionId,$line['producto_id'],$q,$loteReal,$cadVal]);
                $loteIns=$pdo->prepare('INSERT INTO inventario_lotes (producto_id,lote,fecha_recepcion,caducidad,cantidad_recibida,cantidad_disponible) VALUES (?,?,NOW(),?,?,?) ON DUPLICATE KEY UPDATE cantidad_recibida=cantidad_recibida+VALUES(cantidad_recibida),cantidad_disponible=cantidad_disponible+VALUES(cantidad_disponible),caducidad=COALESCE(VALUES(caducidad),caducidad)');
                $loteIns->execute([$line['producto_id'],$loteReal,$cadVal,$q,$q]);
                $mov->execute([$q,'Recepción de compra #'.$compraId,'OC-'.$compraId,$loteReal,$cadVal,(int)$u['id'],$line['producto_id']]);
                $recibidos++;
            }
            if (!$recibidos) throw new ApiError('Captura al menos una cantidad recibida');
            $check=$pdo->prepare('SELECT COUNT(*) FROM orden_compra_detalle WHERE compra_id=? AND recibida<cantidad'); $check->execute([$compraId]);
            $estado=(int)$check->fetchColumn()===0?'recibida':'parcial';
            $pdo->prepare('UPDATE ordenes_compra SET estado=? WHERE id=?')->execute([$estado,$compraId]);
            if($estado==='recibida') $pdo->prepare("UPDATE solicitudes_abastecimiento s JOIN ordenes_compra c ON c.solicitud_id=s.id SET s.estado='recibida',s.atendida_en=NOW() WHERE c.id=?")->execute([$compraId]);
            /* Al recibir físicamente, intenta apartar pedidos que estaban esperando mercancía. */
            $esperando=$pdo->query("SELECT id FROM pedidos WHERE estado='esperando_abastecimiento' AND reserva_activa=0 ORDER BY fecha_entrega,id FOR UPDATE")->fetchAll(PDO::FETCH_COLUMN);
            foreach ($esperando as $pedidoId) {
                $det=$pdo->prepare('SELECT producto_id,cantidad FROM pedido_detalle WHERE pedido_id=?'); $det->execute([(int)$pedidoId]);
                $lineasPedido=$det->fetchAll(); $puede=true;
                $lockProducto=$pdo->prepare('SELECT p.stock,p.stock_reservado,GREATEST(0,p.stock-p.stock_reservado-COALESCE((SELECT SUM(l.cantidad_disponible) FROM inventario_lotes l WHERE l.producto_id=p.id AND l.caducidad<CURDATE()),0)) AS disponible FROM productos p WHERE p.id=? FOR UPDATE');
                foreach ($lineasPedido as $lp) {
                    $lockProducto->execute([(int)$lp['producto_id']]); $stockFila=$lockProducto->fetch();
                    if (!$stockFila || (int)$stockFila['disponible']<(int)$lp['cantidad']) { $puede=false; break; }
                }
                if ($puede) {
                    $aparta=$pdo->prepare('UPDATE productos SET stock_reservado=stock_reservado+? WHERE id=?');
                    foreach ($lineasPedido as $lp) $aparta->execute([(int)$lp['cantidad'],(int)$lp['producto_id']]);
                    $pdo->prepare("UPDATE pedidos SET estado='pendiente',reserva_activa=1 WHERE id=?")->execute([(int)$pedidoId]);
                }
            }
            $pdo->commit();
        } catch(Throwable $e){ Database::revertir(); throw $e; }
    }

    public function registrarMerma(array $u, int $producto, int $cantidad, string $motivo, string $lote): void
    {
        $pdo=Database::pdo(); $pdo->beginTransaction();
        try {
            $st=$pdo->prepare('SELECT stock,stock_reservado FROM productos WHERE id=? AND activo=1 FOR UPDATE'); $st->execute([$producto]); $p=$st->fetch();
            if (!$p) throw new ApiError('Producto no encontrado',404);
            $disponible=(int)$p['stock']-(int)$p['stock_reservado'];
            if ($cantidad<1 || $cantidad>$disponible) throw new ApiError('La merma supera las existencias no reservadas',409);
            $lotes=$pdo->prepare('SELECT id,cantidad_disponible FROM inventario_lotes WHERE producto_id=? AND cantidad_disponible>0 '.($lote!==''?'AND lote=? ':'').'ORDER BY fecha_recepcion,id FOR UPDATE');
            $lote!==''?$lotes->execute([$producto,$lote]):$lotes->execute([$producto]);
            $filas=$lotes->fetchAll(); $total=array_sum(array_map(static function($r){return (int)$r['cantidad_disponible'];},$filas));
            if ($total<$cantidad) throw new ApiError('No hay cantidad suficiente registrada en los lotes para esa merma',409);
            $restante=$cantidad; $updLote=$pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible=cantidad_disponible-? WHERE id=?');
            foreach($filas as $l){ if($restante<=0)break; $tomar=min($restante,(int)$l['cantidad_disponible']); $updLote->execute([$tomar,$l['id']]); $restante-=$tomar; }
            $pdo->prepare('UPDATE productos SET stock=stock-? WHERE id=?')->execute([$cantidad,$producto]);
            $pdo->prepare("INSERT INTO movimientos_inventario (producto_id,tipo,cantidad,stock_resultante,motivo,referencia,lote,usuario_id) VALUES (?,'salida_merma',?,?,?,'MERMA',?,?)")
                ->execute([$producto,$cantidad,(int)$p['stock']-$cantidad,$motivo,$lote?:null,(int)$u['id']]);
            $pdo->commit();
        } catch(Throwable $e){ Database::revertir(); throw $e; }
    }

    /* Asigna la venta a los lotes más antiguos primero (PEPS/FIFO). */
    public function asignarLotesVenta(int $ventaId): void
    {
        $pdo=Database::pdo();
        $det=$pdo->prepare('SELECT producto_id,cantidad FROM venta_detalle WHERE venta_id=?'); $det->execute([$ventaId]);
        $lotesQ=$pdo->prepare('SELECT id,cantidad_disponible FROM inventario_lotes WHERE producto_id=? AND cantidad_disponible>0 AND (caducidad IS NULL OR caducidad>=CURDATE()) ORDER BY fecha_recepcion,id FOR UPDATE');
        $upd=$pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible=cantidad_disponible-? WHERE id=?');
        $ins=$pdo->prepare('INSERT INTO venta_lote_detalle (venta_id,producto_id,lote_id,cantidad) VALUES (?,?,?,?)');
        foreach($det->fetchAll() as $d){
            $restante=(int)$d['cantidad']; $lotesQ->execute([(int)$d['producto_id']]);
            foreach($lotesQ->fetchAll() as $l){ if($restante<=0)break; $tomar=min($restante,(int)$l['cantidad_disponible']); $upd->execute([$tomar,$l['id']]); $ins->execute([$ventaId,$d['producto_id'],$l['id'],$tomar]); $restante-=$tomar; }
            if($restante>0) throw new ApiError('No hay lotes disponibles suficientes para aplicar PEPS/FIFO',409);
        }
    }

    public function reponerLotesVenta(int $ventaId): void
    {
        $pdo=Database::pdo();
        $st=$pdo->prepare('SELECT lote_id,cantidad FROM venta_lote_detalle WHERE venta_id=?'); $st->execute([$ventaId]); $rows=$st->fetchAll();
        if($rows){
            $up=$pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible=cantidad_disponible+? WHERE id=?');
            foreach($rows as $r)$up->execute([(int)$r['cantidad'],(int)$r['lote_id']]);
            return;
        }
        /* Ventas históricas anteriores al Kardex: reingreso a un lote de devolución. */
        $det=$pdo->prepare('SELECT producto_id,cantidad FROM venta_detalle WHERE venta_id=?'); $det->execute([$ventaId]);
        foreach($det->fetchAll() as $d){
            $lote='DEV-V'.$ventaId.'-P'.$d['producto_id'];
            $ins=$pdo->prepare('INSERT INTO inventario_lotes (producto_id,lote,fecha_recepcion,cantidad_recibida,cantidad_disponible) VALUES (?,?,NOW(),?,?) ON DUPLICATE KEY UPDATE cantidad_recibida=cantidad_recibida+VALUES(cantidad_recibida),cantidad_disponible=cantidad_disponible+VALUES(cantidad_disponible)');
            $ins->execute([(int)$d['producto_id'],$lote,(int)$d['cantidad'],(int)$d['cantidad']]);
        }
    }

}
