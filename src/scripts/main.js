import '../index_style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { PointerLockControls } from './controls/PointerLockControls.js';
import { Projector } from 'three/examples/jsm/renderers/Projector.js';

var sphereShape, sphereBody, world, physicsMaterial, walls = [], balls = [], ballMeshes = [], boxes = [], boxMeshes = [];

var camera, scene, renderer;
var geometry, material, mesh;
var controls, time = Date.now();

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if (havePointerLock) {

    var element = document.body;

    var pointerlockchange = function (event) {

        if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
            controls.enabled = true;
            blocker.style.display = 'none';

        } else {
            controls.enabled = false;
            blocker.style.display = '-webkit-box';
            blocker.style.display = '-moz-box';
            blocker.style.display = 'box';
            instructions.style.display = '';
        }
    }

    var pointerlockerror = function (event) {
        instructions.style.display = '';
    }

    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

    document.addEventListener('pointerlockerror', pointerlockerror, false);
    document.addEventListener('mozpointerlockerror', pointerlockerror, false);
    document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

    instructions.addEventListener('click', function (event) {
        instructions.style.display = 'none';

        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

        if (/Firefox/i.test(navigator.userAgent)) {

            var fullscreenchange = function (event) {

                if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {

                    document.removeEventListener('fullscreenchange', fullscreenchange);
                    document.removeEventListener('mozfullscreenchange', fullscreenchange);

                    element.requestPointerLock();
                }

            }

            document.addEventListener('fullscreenchange', fullscreenchange, false);
            document.addEventListener('mozfullscreenchange', fullscreenchange, false);

            element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.webkitRequestFullscreen;

            element.requestFullscreen();

        } else {

            element.requestPointerLock();

        }

    }, false);

} else {

    instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

}

initCannon();
init();
animate();

function initCannon() {
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0; //how often normalize quaternions (x per second). Set to 0 if bodies tend to explode
    world.quatNormalizeFast = false; //fast quaternion normalization. Set to false if bodies tend to explode

    var solver = new CANNON.GSSolver(); // constraint equation Gauss-Seidel solver.


    //defaultContactMaterial is used if no suitable ContactMaterial is found for a contact.
    world.defaultContactMaterial.contactEquationStiffness = 1e9; // stiffness of the produced contact equations
    world.defaultContactMaterial.contactEquationRelaxation = 4; // relaxation time of the produced friction equations 


    solver.iterations = 7; // the number of solver iterations determines quality of the constraints in the world. The more iterations, the more correct simulation. More iterations need more computations though. If you have a large gravity force in your world, you will need more iterations.
    solver.tolerance = 0.1; // when tolerance is reached, the system is assumed to be converged.

    var split = true;
    if (split)
        world.solver = new CANNON.SplitSolver(solver); // splits the equations into islands and solves them independently. Can improve performance.

    else
        world.solver = solver;

    world.gravity.set(0, -20, 0);
    world.broadphase = new CANNON.NaiveBroadphase();// naive broadphase implementation, used in lack of better ones.


    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
        physicsMaterial,
        0.0, // friction coefficient for this material. If non-negative, it will be used instead of the friction given by ContactMaterials. If there's no matching ContactMaterial, the value from .defaultContactMaterial in the World will be used.
        0.3  // restitution
    );
    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);

    // Create a sphere
    var mass = 5, radius = 1.3;
    sphereShape = new CANNON.Sphere(radius);
    sphereBody = new CANNON.Body({ mass: mass });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(0, 5, 0); //position in the world
    sphereBody.linearDamping = 0.9; //0.1 = slides forever 
    world.addBody(sphereBody);

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

function init() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 0, 500);

    var ambient = new THREE.AmbientLight(0x111111);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.5);
    scene.add(hemiLight);

    var light = new THREE.SpotLight(0xffffff);
    light.position.set(10, 30, 20);
    light.castShadow = true;
    light.shadow.mapSize.width = 4 * 1024;
    light.shadow.mapSize.height = 4 * 1024;
    scene.add(light);


    controls = new PointerLockControls(camera, sphereBody);
    scene.add(controls.getObject());

    // floor
    geometry = new THREE.PlaneGeometry(300, 300, 50, 50);
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(- Math.PI / 2));

    material = new THREE.MeshPhongMaterial({ color: 0xdddddd });

    mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true; //activer les ombres sur le sol
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color, 1);

    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    // Add boxes
    var halfExtents = new CANNON.Vec3(1, 1, 1);
    var boxShape = new CANNON.Box(halfExtents);
    var boxGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
    for (var i = 0; i < 7; i++) {
        var x = (Math.random() - 0.5) * 20;
        var y = 1 + (Math.random() - 0.5) * 1;
        var z = (Math.random() - 0.5) * 20;
        var boxBody = new CANNON.Body({ mass: 5 });
        boxBody.addShape(boxShape);
        material = new THREE.MeshPhongMaterial({ color: 0x3349ff });
        var boxMesh = new THREE.Mesh(boxGeometry, material);
        world.addBody(boxBody);
        scene.add(boxMesh);
        boxBody.position.set(x, y, z);
        boxMesh.position.set(x, y, z);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxes.push(boxBody);
        boxMeshes.push(boxMesh);
    }


    // Add linked boxes
    var size = 0.5;
    var he = new CANNON.Vec3(size, size, size * 0.1);
    boxShape = new CANNON.Box(he);
    var mass = 0;
    var space = 0.1 * size;
    var N = 5, last;
    boxGeometry = new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
    for (var i = 0; i < N; i++) {
        var boxbody = new CANNON.Body({ mass: mass });
        boxbody.addShape(boxShape);
        material = new THREE.MeshPhongMaterial({ color: 0xf9ff33 });
        var boxMesh = new THREE.Mesh(boxGeometry, material);
        boxbody.position.set(5, (N - i) * (size * 2 + 2 * space) + size * 2 + space, 0);
        boxbody.linearDamping = 0.01;
        boxbody.angularDamping = 0.01;
        // boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        world.addBody(boxbody);
        scene.add(boxMesh);
        boxes.push(boxbody);
        boxMeshes.push(boxMesh);

        if (i != 0) {
            // Connect this body to the last one
            var c1 = new CANNON.PointToPointConstraint(boxbody, new CANNON.Vec3(-size, size + space, 0), last, new CANNON.Vec3(-size, -size - space, 0));
            var c2 = new CANNON.PointToPointConstraint(boxbody, new CANNON.Vec3(size, size + space, 0), last, new CANNON.Vec3(size, -size - space, 0));
            world.addConstraint(c1);
            world.addConstraint(c2);
        } else {
            mass = 0.3;
        }
        last = boxbody;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

var dt = 1 / 60;
function animate() {
    requestAnimationFrame(animate);
    if (controls.enabled) {
        world.step(dt); // Step the physics world forward in time.There are two modes. The simple mode is fixed timestepping without interpolation. In this case you only use the first argument. The second case uses interpolation. In that you also provide the time since the function was last used, as well as the maximum fixed timesteps to take.

        // Update ball positions
        for (var i = 0; i < balls.length; i++) {
            ballMeshes[i].position.copy(balls[i].position);
            ballMeshes[i].quaternion.copy(balls[i].quaternion);
        }

        // Update box positions
        for (var i = 0; i < boxes.length; i++) {
            boxMeshes[i].position.copy(boxes[i].position);
            boxMeshes[i].quaternion.copy(boxes[i].quaternion);
        }
    }

    controls.update(Date.now() - time);
    renderer.render(scene, camera);
    time = Date.now();

}

var ballShape = new CANNON.Sphere(0.2);
var ballGeometry = new THREE.SphereGeometry(ballShape.radius, 32, 32);
var shootDirection = new THREE.Vector3();
var shootVelo = 15;
var projector = new Projector();

function getShootDir(targetVec) {
    var vector = targetVec;
    targetVec.set(0, 0, 1);
    projector.unprojectVector(vector, camera);
    var ray = new THREE.Ray(sphereBody.position, vector.sub(sphereBody.position).normalize());
    targetVec.copy(ray.direction);
}

var idTimeout;

window.addEventListener('mousedown', function (e) {
        idTimeout = setTimeout(function () {
            if (controls.enabled == true) {
                // the setTimeout allows us to imitate a hold state of the mouse click 
                console.log(e)
                var x = sphereBody.position.x;
                var y = sphereBody.position.y;
                var z = sphereBody.position.z;
                var ballBody = new CANNON.Body({ mass: 1 });
                ballBody.addShape(ballShape);
                material = new THREE.MeshPhongMaterial({ color: 0xff3333 });

                var ballMesh = new THREE.Mesh(ballGeometry, material);
                world.addBody(ballBody);
                scene.add(ballMesh);
                ballMesh.castShadow = true;
                ballMesh.receiveShadow = true;
                balls.push(ballBody);
                ballMeshes.push(ballMesh);
                getShootDir(shootDirection);
                ballBody.velocity.set(shootDirection.x * shootVelo,
                    shootDirection.y * shootVelo,
                    shootDirection.z * shootVelo);

                // Move the ball outside the player sphere
                x += shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius);
                y += shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius);
                z += shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius);
                ballBody.position.set(x, y, z);
                ballMesh.position.set(x, y, z);
            }
        }, 0);
    
});

window.addEventListener('mouseup', function () {
    clearTimeout(idTimeout);
});

window.addEventListener("click", function (e) {

});
