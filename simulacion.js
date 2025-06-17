// Configuración inicial de Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0f7fa); // Azul claro
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight - 100);
renderer.shadowMap.enabled = true;
document.getElementById("simulacion-container").appendChild(renderer.domElement);

// Configuración de la cámara (vista isométrica)
camera.position.set(10, 12, 15); // Vista en ángulo
camera.lookAt(0, 5, 0); // Apunta al centro del tanque

// Luz ambiental
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Luz ambiental más suave
scene.add(ambientLight);

// Luz direccional
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Configuración de Cannon.js para física
const world = new CANNON.World();
// Configuración de la gravedad
world.gravity.set(0, -9.81, 0); // Gravedad estándar en m/s²

// Crear el tanque tridimensional
const tanqueMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.1,
});

const tanqueGeometry = new THREE.BoxGeometry(10, 10, 10);
const tanqueMesh = new THREE.Mesh(tanqueGeometry, tanqueMaterial);
tanqueMesh.position.set(0, 5, 0); // Centrar el tanque
scene.add(tanqueMesh);

// Crear el suelo (base del tanque)
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// Crear líquidos con densidades actualizadas
const liquidos = {
    agua: { color: new THREE.Color(0x0000ff), densidad: 1000, nivel: 4, mesh: null }, // Agua: 4 de altura
    aceite: { color: new THREE.Color(0xffff00), densidad: 916, nivel: 4, mesh: null }, // Aceite: 4 de altura
    alcohol: { color: new THREE.Color(0xff0000), densidad: 789, nivel: 4, mesh: null }, // Alcohol: 4 de altura
};

// Crear líquidos tridimensionales
Object.keys(liquidos).forEach((key) => {
    const liquido = liquidos[key];
    const geometry = new THREE.BoxGeometry(9.8, liquido.nivel, 9.8); // Reducir ligeramente el ancho y profundidad
    const material = new THREE.MeshPhysicalMaterial({
        color: liquido.color,
        transparent: true,
        opacity: 0.6,
        roughness: 0.8,
        metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Ajustar la posición del líquido
    mesh.position.y = 6 + liquido.nivel / 2; // Posicionar un poco más arriba de la mitad del tanque
    mesh.position.x = 0; // Centrar en el eje X
    mesh.position.z = 0; // Centrar en el eje Z
    mesh.visible = false;

    // Agregar el líquido a la escena
    scene.add(mesh);
    liquido.mesh = mesh;
});

// Mostrar líquido seleccionado y cambiar el color del suelo
document.getElementById("liquido").addEventListener("change", (event) => {
    const liquidoSeleccionado = event.target.value;
    Object.keys(liquidos).forEach((key) => {
        liquidos[key].mesh.visible = key === liquidoSeleccionado;
    });

    // Cambiar el color del suelo al color del líquido seleccionado
    if (liquidos[liquidoSeleccionado]) {
        groundMaterial.color = liquidos[liquidoSeleccionado].color;
    } else {
        groundMaterial.color.set(0x555555); // Color predeterminado si no hay líquido
    }
});

// Botón para eliminar líquidos
document.getElementById("eliminarLiquidos").addEventListener("click", () => {
    Object.keys(liquidos).forEach((key) => {
        liquidos[key].mesh.visible = false;
    });
    groundMaterial.color.set(0x555555); // Restablecer el color del suelo
    console.log("Todos los líquidos eliminados.");
});

// Botón para eliminar bloques
document.getElementById("eliminarBloques").addEventListener("click", () => {
    bloques.forEach(({ mesh, body }) => {
        scene.remove(mesh);
        world.removeBody(body);
    });
    bloques = [];
    console.log("Todos los bloques eliminados.");
});

// Variables para bloques
let bloques = [];
const pesoBloque = 1.0; // Masa fija del bloque
const densidadBloque = 1.0; // Densidad fija del bloque

// Agregar un bloque en posición aleatoria
document.getElementById("agregarBloque").addEventListener("click", () => {
    const size = 1; // Tamaño del bloque
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // Color naranja
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    // Calcular la posición inicial del bloque
    const x = Math.random() * 8 - 4; // Rango entre -4 y 4
    const z = Math.random() * 8 - 4; // Rango entre -4 y 4

    // Determinar el nivel más alto de los líquidos
    const nivelMasAlto = Math.max(...Object.values(liquidos).map(liquido => liquido.nivel));
    const y = nivelMasAlto + 2; // Generar el bloque 2 unidades por encima del líquido más alto

    mesh.position.set(x, y, z);
    scene.add(mesh); // Agregar el bloque a la escena

    // Crear el cuerpo físico del bloque
    const body = new CANNON.Body({
        mass: pesoBloque, // Masa fija
        shape: new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)), // Tamaño del cuerpo físico
        position: new CANNON.Vec3(x, y, z), // Posición inicial
    });
    world.addBody(body); // Agregar el cuerpo al mundo físico

    // Sincronizar el bloque visual con el cuerpo físico
    bloques.push({ mesh, body });

    // Depuración: Mostrar información en la consola
    console.log(`Bloque agregado: posición (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}), masa: ${pesoBloque}, densidad: ${densidadBloque}`);
});

// Actualizar la flotación de los bloques
function actualizarFlotacion() {
    const liquidoSeleccionado = document.getElementById("liquido").value;
    const densidadLiquido = liquidos[liquidoSeleccionado]?.densidad || 0; // Si no hay líquido, densidad = 0

    bloques.forEach(({ mesh, body }) => {
        const alturaBloque = body.position.y; // Altura actual del bloque
        const nivelLiquido = liquidos[liquidoSeleccionado]?.nivel || 0;

        if (alturaBloque < nivelLiquido) {
            // Calcular el volumen sumergido
            const profundidadSumergida = Math.min(nivelLiquido - alturaBloque, mesh.scale.y); // Máximo hasta la altura del bloque
            const volumenBloque = mesh.scale.x * mesh.scale.y * mesh.scale.z; // Volumen total del bloque
            const volumenSumergido = volumenBloque * (profundidadSumergida / mesh.scale.y); // Proporción sumergida

            // Calcular la fuerza de flotación
            const fuerzaFlotacion = volumenSumergido * densidadLiquido * 9.81; // Peso del líquido desplazado

            // Aplicar amortiguación para suavizar la fuerza
            const amortiguacion = 0.5; // Factor de amortiguación (entre 0 y 1)
            const fuerzaSuavizada = fuerzaFlotacion * amortiguacion;

            // Limitar la fuerza de flotación para evitar oscilaciones excesivas
            const fuerzaMaxima = pesoBloque * 9.81; // Máxima fuerza permitida (igual al peso del bloque)
            const fuerzaFinal = Math.min(fuerzaSuavizada, fuerzaMaxima);

            body.applyForce(new CANNON.Vec3(0, fuerzaFinal, 0), body.position);

            // Depuración
            console.log(`Bloque en altura ${alturaBloque.toFixed(2)}:
                Nivel del líquido: ${nivelLiquido.toFixed(2)},
                Volumen sumergido: ${volumenSumergido.toFixed(2)},
                Fuerza de flotación: ${fuerzaFinal.toFixed(2)}`);
        }
    });
}

// Mostrar mezclas de líquidos
function mostrarMezcla(liquido1, liquido2) {
    const nivel1 = liquidos[liquido1].nivel;
    const nivel2 = liquidos[liquido2].nivel;

    // Mostrar el primer líquido
    liquidos[liquido1].mesh.visible = true;
    liquidos[liquido1].mesh.scale.y = nivel1 / 4; // Ajustar la escala del líquido
    liquidos[liquido1].mesh.position.y = 6 + nivel1 / 2; // Ajustar la posición del líquido

    // Mostrar el segundo líquido
    liquidos[liquido2].mesh.visible = true;
    liquidos[liquido2].mesh.scale.y = nivel2 / 4; // Ajustar la escala del líquido
    liquidos[liquido2].mesh.position.y = 6 + nivel2 / 2; // Ajustar la posición del líquido

    console.log(`Mostrando mezcla: ${liquido1} y ${liquido2}`);
}

// Botones para mezclar líquidos
document.getElementById("mezclarAguaAceite").addEventListener("click", () => {
    mostrarMezcla("agua", "aceite");
});

document.getElementById("mezclarAguaAlcohol").addEventListener("click", () => {
    mostrarMezcla("agua", "alcohol");
});

document.getElementById("mezclarAceiteAlcohol").addEventListener("click", () => {
    mostrarMezcla("aceite", "alcohol");
});

// Animación
function animate() {
    requestAnimationFrame(animate);

    // Actualizar la física
    world.step(1 / 60);

    // Actualizar la flotación
    actualizarFlotacion();

    // Sincronizar objetos visuales con cuerpos físicos
    bloques.forEach(({ mesh, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    });

    // Renderizar la escena
    renderer.render(scene, camera);
}

animate();