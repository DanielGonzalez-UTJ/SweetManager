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
                'estado' => 'PedidoController@estado',
                'checklist' => 'PedidoController@checklist'
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
    'abastecimiento' => [
        'middleware' => ['sesion_completa'],
        'metodos' => [
            'GET' => 'InventarioController@listar',
            'POST' => [
                'solicitar' => ['InventarioController@solicitud', ['sesion_completa', 'rol:cajero']],
                'resolver' => ['InventarioController@resolver', ['sesion_completa', 'rol:admin']],
                'compra' => ['InventarioController@compra', ['sesion_completa', 'rol:admin']],
                'recibir' => ['InventarioController@recibir', ['sesion_completa', 'roles:admin,almacenista']],
                'merma' => ['InventarioController@merma', ['sesion_completa', 'roles:admin,almacenista']]
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
