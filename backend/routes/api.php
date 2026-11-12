<?php
/*Rutas de la API, cada ruta indica métodos, middleware y el controlador que la atiende*/
return [
    'sesion' => [
        'metodos' => ['*' => 'AuthController@sesion']
    ],
    'login' => [
        'metodos' => ['POST' => 'AuthController@login']
    ],
    'logout' => [
        'metodos' => ['*' => 'AuthController@logout']
    ],
    'productos' => [
        'middleware' => ['sesion_completa'],
        'metodos' => ['*' => 'ProductoController@listar']
    ],
    'datos' => [
        'middleware' => ['sesion_completa'],
        'metodos' => ['*' => 'DatosController@paquete']
    ],
    'ventas' => [
        'metodos' => [
            'POST' => [
                'crear' => ['VentaController@crear', ['sesion_completa', 'rol:cajero']],
                'cancelar' => ['VentaController@cancelar', ['sesion_completa', 'rol:admin']]
            ]
        ]
    ],
    'pedidos' => [
        'middleware' => ['sesion_completa', 'rol:cajero'],
        'metodos' => [
            'POST' => [
                'crear' => 'PedidoController@crear',
                'estado' => 'PedidoController@estado'
            ]
        ]
    ],
    'turnos' => [
        'middleware' => ['sesion_completa', 'rol:cajero'],
        'metodos' => [
            'GET' => 'TurnoController@resumen',
            'POST' => [
                'abrir' => 'TurnoController@abrir',
                'cerrar' => 'TurnoController@cerrar'
            ]
        ]
    ],
    'usuarios' => [
        'middleware' => ['sesion'],
        'metodos' => [
            'POST' => [
                'perfil' => ['UsuarioController@perfil', ['sesion_completa']],
                'sexo' => ['UsuarioController@sexo', ['sesion_completa']],
                'clave' => 'UsuarioController@clave',
                'listar' => ['UsuarioController@listar', ['sesion_completa', 'rol:admin']],
                'guardar' => ['UsuarioController@guardar', ['sesion_completa', 'rol:admin']],
                'estado' => ['UsuarioController@estado', ['sesion_completa', 'rol:admin']],
                'restablecer' => ['UsuarioController@restablecer', ['sesion_completa', 'rol:admin']]
            ]
        ]
    ],
    'proveedores' => [
        'middleware' => ['sesion_completa', 'rol:admin'],
        'metodos' => [
            'POST' => ['guardar' => 'ProveedorController@guardar']
        ]
    ]
];
