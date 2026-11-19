<?php
/* Operaciones de abastecimiento e inventario. */
class InventarioController
{
    public function listar(): void
    {
        $u=Session::usuario(); $admin=$u['rol']==='admin'; $inventario=$admin||$u['rol']==='almacenista'; $inv=new Inventario();
        Response::json(['ok'=>true,'solicitudes'=>$inv->solicitudes(!$admin,(int)$u['id']),'movimientos'=>$inventario?$inv->movimientos():[],'compras'=>$inventario?$inv->compras():[]]);
    }

    public function solicitud(): void
    {
        $d=Request::cuerpo(); $cliente=Request::texto($d,'cliente'); $tel=preg_replace('/\D+/', '', Request::texto($d,'telefono'));
        $fecha=Request::cadena($d,'entrega'); $ts=strtotime(str_replace('T',' ',$fecha));
        if ($cliente==='' || mb_strlen($cliente)>100) throw new ApiError('Escribe el nombre del cliente');
        if ($tel!=='' && !preg_match('/^\d{10}$/',$tel)) throw new ApiError('El teléfono debe contener exactamente 10 dígitos');
        if ($ts===false || $ts<=time()) throw new ApiError('La fecha de entrega debe ser futura');
        $items=isset($d['items'])&&is_array($d['items'])?$d['items']:[];
        $id=(new Inventario())->crearSolicitud(Session::usuario(),['cliente'=>$cliente,'telefono'=>$tel?:null,'fecha'=>date('Y-m-d H:i:s',$ts),'nota'=>Request::texto($d,'nota')],$items);
        Response::json(['ok'=>true,'id'=>$id]);
    }

    public function resolver(): void
    {
        $d=Request::cuerpo(); (new Inventario())->resolverSolicitud((int)($d['id']??0),Request::cadena($d,'estado'),Request::texto($d,'respuesta'));
        Response::json(['ok'=>true]);
    }

    public function compra(): void
    {
        $d=Request::cuerpo(); $fecha=Request::cadena($d,'fecha'); $ts=strtotime($fecha);
        if ($ts===false || $ts<=time()) throw new ApiError('La fecha estimada debe ser hoy o posterior');
        $items=isset($d['items'])&&is_array($d['items'])?$d['items']:[];
        if ((int)($d['proveedor_id']??0)<1) throw new ApiError('Selecciona un proveedor');
        $solicitudId=!empty($d['solicitud_id'])?(int)$d['solicitud_id']:null;
        $id=(new Inventario())->crearCompra(Session::usuario(),(int)($d['proveedor_id']??0),date('Y-m-d H:i:s',$ts),Request::texto($d,'nota'),$items,$solicitudId);
        Response::json(['ok'=>true,'id'=>$id]);
    }

    public function recibir(): void
    {
        $d=Request::cuerpo(); $items=isset($d['items'])&&is_array($d['items'])?$d['items']:[];
        (new Inventario())->recibirCompra(Session::usuario(),(int)($d['compra_id']??0),$items);
        Response::json(['ok'=>true]);
    }

    public function merma(): void
    {
        $d=Request::cuerpo(); $motivo=Request::cadena($d,'motivo');
        if (!in_array($motivo,['Producto dañado','Producto caducado','Empaque abierto','Deterioro por temperatura o humedad','Contaminación','Otro'],true)) throw new ApiError('Selecciona un motivo válido');
        (new Inventario())->registrarMerma(Session::usuario(),(int)($d['producto_id']??0),(int)($d['cantidad']??0),$motivo,Request::cadena($d,'lote'));
        Response::json(['ok'=>true]);
    }
}
