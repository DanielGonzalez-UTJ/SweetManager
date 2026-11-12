<?php
/*Perfil personal y administración de cuentas*/
class UsuarioController
{
    public function perfil(): void
    {
        $d=Request::cuerpo(); $nombre=Request::texto($d,'nombre'); $correo=Request::texto($d,'correo'); $telefono=Request::texto($d,'telefono');
        if ($nombre==='' || mb_strlen($nombre)>100) throw new ApiError('Escribe tu nombre completo');
        if (!filter_var($correo,FILTER_VALIDATE_EMAIL) || mb_strlen($correo)>120) throw new ApiError('Escribe un correo válido');
        $telefonoLimpio = preg_replace('/\D+/', '', $telefono);
        if ($telefonoLimpio !== '' && !preg_match('/^\d{10}$/', $telefonoLimpio)) throw new ApiError('El teléfono debe tener exactamente 10 dígitos');
        $telefono = $telefonoLimpio;
        (new UsuarioService())->actualizarPerfil((int)Session::usuario()['id'],$nombre,$correo,$telefono===''?null:$telefono);
        Response::json(['ok'=>true,'usuario'=>['nombre'=>$nombre,'correo'=>$correo,'telefono'=>$telefono]]);
    }
    public function sexo(): void { $sexo=Request::cadena(Request::cuerpo(),'sexo'); if(!in_array($sexo,['hombre','mujer'],true)) throw new ApiError('Imagen de perfil no válida'); (new UsuarioService())->cambiarSexo((int)Session::usuario()['id'],$sexo); Response::json(['ok'=>true]); }
    public function clave(): void { $d=Request::cuerpo(); (new UsuarioService())->cambiarClave((int)Session::usuario()['id'],Request::cadena($d,'actual'),Request::cadena($d,'nueva')); Response::json(['ok'=>true]); }
    public function listar(): void { Response::json(['ok'=>true,'usuarios'=>(new UsuarioService())->listar()]); }
    public function guardar(): void { $d=Request::cuerpo(); Response::json(array_merge(['ok'=>true],(new UsuarioService())->guardar($d))); }
    public function estado(): void { $d=Request::cuerpo(); (new UsuarioService())->estado((int)($d['id']??0),(int)($d['activo']??0),(int)Session::usuario()['id']); Response::json(['ok'=>true]); }
    public function restablecer(): void { $d=Request::cuerpo(); $clave=(new UsuarioService())->restablecer((int)($d['id']??0)); Response::json(['ok'=>true,'clave_temporal'=>$clave]); }
}
