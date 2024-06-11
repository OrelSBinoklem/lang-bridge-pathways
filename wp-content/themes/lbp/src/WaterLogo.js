import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

let scene, camera, renderer, water, sun, moon, sunLight, moonLight, composer;
let startTime = Date.now();
const params = {
	speed: 1,
	developerMode: false,
	waveHeight: 1.0,
	waveSpeed: 0.5,
	//dayWaterColor: 0x88ccee,
	dayWaterColor: 0xD3FBFB,
	nightWaterColor: 0x446688,
	sunIntensity: 1.0,
	moonIntensity: 0.5
};

function init() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, 300 / 100, 1, 2000);
	camera.position.set(0, 5, 60); // Устанавливаем камеру ближе и выше
	
	// Указание, куда должна смотреть камера
	camera.lookAt(0, 50, 40);
	
	renderer = new THREE.WebGLRenderer({ alpha: true });
	renderer.setSize(300, 100);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setClearColor(0x000000, 0); // Прозрачный фон
	document.getElementById('super-logo-bg').appendChild(renderer.domElement);
	
	const controls = new OrbitControls(camera, renderer.domElement);
	
	const waterGeometry = new THREE.PlaneGeometry(800, 200); // Увеличиваем размеры полотна воды
	
	const waterNormals = new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	});
	
	water = new Water(waterGeometry, {
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: waterNormals,
		alpha: 1.0,
		sunDirection: new THREE.Vector3(),
		sunColor: 0xffffff,
		waterColor: new THREE.Color(params.dayWaterColor),
		distortionScale: params.waveHeight,
		fog: scene.fog !== undefined
	});
	
	water.rotation.x = -Math.PI / 2;
	scene.add(water);
	
	sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
	sun.position.set(50, 0, 0);
	scene.add(sun);
	
	// Добавление сияния
	addSunGlow(sun);
	
	moon = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
	moon.position.set(-50, 0, 0);
	scene.add(moon);
	
	sunLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
	sunLight.position.set(0, 50, 50);
	scene.add(sunLight);
	
	moonLight = new THREE.DirectionalLight(0xaaaaaa, params.moonIntensity);
	moonLight.position.set(0, -50, -50);
	scene.add(moonLight);
	
	const ambientLight = new THREE.AmbientLight(0x404040);
	scene.add(ambientLight);
	
	// Постобработка для прозрачности по краям
	composer = new EffectComposer(renderer);
	const renderPass = new RenderPass(scene, camera);
	composer.addPass(renderPass);
	
	window.addEventListener('resize', onWindowResize, false);
	
	// GUI setup
	const gui = new GUI();
	const controlsFolder = gui.addFolder('Controls');
	controlsFolder.add(params, 'developerMode').name('Developer Mode').onChange(toggleDeveloperMode);
	controlsFolder.add(params, 'speed', 0.1, 10, 0.1).name('Speed');
	controlsFolder.add(params, 'waveHeight', 1, 500, 1).name('Wave Height').onChange(updateWaveHeight);
	controlsFolder.add(params, 'waveSpeed', 0.1, 5, 0.1).name('Wave Speed');
	controlsFolder.open();
	
	animate();
}

function addSunGlow(sun) {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const context = canvas.getContext('2d');
	
	const gradient = context.createRadialGradient(
		canvas.width / 2,
		canvas.height / 2,
		0,
		canvas.width / 2,
		canvas.height / 2,
		canvas.width / 2
	);
	gradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
	gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.25)');
	gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
	
	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	const texture = new THREE.CanvasTexture(canvas);
	const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
	const sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(30, 30, 1); // Уменьшение диаметра сияния вдвое
	sun.add(sprite);
}

function updateWaveHeight(value) {
	water.material.uniforms.distortionScale.value = value;
}

function toggleDeveloperMode(value) {
	startTime = Date.now(); // Reset start time when toggling mode
}

function onWindowResize() {
	camera.aspect = 300 / 100;
	camera.updateProjectionMatrix();
	renderer.setSize(300, 100);
	composer.setSize(300, 100);
}

// Функция для определения цвета неба
// Функция для определения цвета неба
function getSkyColor(angle) {
	const nightColor = { r: 29, g: 34, b: 53 };   // Очень темно-синий для ночи
	//const nightColor = { r: 5, g: 5, b: 16 };    // Очень темно-синий для ночи
	const dayColor = { r: 208, g: 224, b: 240 }; // Слегка голубоватый для дня
	const eveningColor = { r: 139, g: 69, b: 19 }; // Темный красновато-оранжевый для вечера
	
	function interpolateColor(color1, color2, factor) {
		const result = {
			r: Math.round(color1.r + factor * (color2.r - color1.r)),
			g: Math.round(color1.g + factor * (color2.g - color1.g)),
			b: Math.round(color1.b + factor * (color2.b - color1.b))
		};
		return result;
	}
	
	// Нормализуем угол к диапазону от 0 до 2π
	angle = angle % (2 * Math.PI);
	let skyColor;
	
	if (angle >= 0 && angle < Math.PI / 2) {
		const t = angle / (Math.PI / 2);
		skyColor = interpolateColor(nightColor, dayColor, t);
	} else if (angle >= Math.PI / 2 && angle < Math.PI) {
		const t = (angle - Math.PI / 2) / (Math.PI / 2);
		skyColor = interpolateColor(dayColor, eveningColor, t);
	} else if (angle >= Math.PI && angle < 3 * Math.PI / 2) {
		const t = (angle - Math.PI) / (Math.PI / 2);
		skyColor = interpolateColor(eveningColor, nightColor, t);
	} else {
		const t = (angle - 3 * Math.PI / 2) / (Math.PI / 2);
		skyColor = interpolateColor(nightColor, nightColor, t); // Ночь к ночи
	}
	
	return {
		arr: [skyColor.r, skyColor.g, skyColor.b],
		rgb: `rgb(${skyColor.r}, ${skyColor.g}, ${skyColor.b})`,
		rgba1: `rgba(${skyColor.r}, ${skyColor.g}, ${skyColor.b}, 1)`,
		rgba0: `rgba(${skyColor.r}, ${skyColor.g}, ${skyColor.b}, 0)`
	};
}

function isBright(angle) {
	angle = angle % (2 * Math.PI);
	let skyColor;
	
	if (angle >= Math.PI / 4 && angle < Math.PI * 3 / 4) {
		return true;
	}
	
	return false;
}

function animate() {
	requestAnimationFrame(animate);
	
	const elapsed = (Date.now() - startTime) / 1000;
	const currentTime = new Date();
	const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
	const angle = (params.developerMode ? elapsed * params.speed : (hours / 24) * 2 * Math.PI - Math.PI / 2);
	
	const sunX = 75 * Math.cos(angle);
	const sunY = 28 * Math.sin(angle);
	const moonX = -75 * Math.cos(angle);
	const moonY = -28 * Math.sin(angle);
	
	sun.position.set(sunX, sunY, 0);
	moon.position.set(moonX, moonY, 0);
	
	sunLight.position.copy(sun.position);
	moonLight.position.copy(moon.position);
	
	const dayColor = new THREE.Color(params.dayWaterColor);
	const nightColor = new THREE.Color(params.nightWaterColor);
	const blendFactor = (Math.sin(angle) + 1) / 2;
	
	// Update water color and brightness
	water.material.uniforms['waterColor'].value.lerpColors(dayColor, nightColor, 1 - blendFactor);
	water.material.uniforms['sunColor'].value.setScalar(blendFactor);
	
	// Update sun and moon light intensity
	sunLight.intensity = blendFactor * params.sunIntensity;
	moonLight.intensity = (1 - blendFactor) * params.moonIntensity;
	
	water.material.uniforms['sunDirection'].value.copy(sunLight.position).normalize();
	
	// Update wave height
	water.material.uniforms['distortionScale'].value = params.waveHeight;
	
	// Update water time for slower waves
	water.material.uniforms['time'].value += params.waveSpeed / 60.0;
	
	composer.render();

	//Установка цвета хедера
	const skyColor = getSkyColor(angle);
	const skyElement = document.querySelector('.site-header');
	skyElement.style.backgroundColor = skyColor.rgb;
	
	// Если слишком ярко днём делаем меню чёрным
	document.querySelector('.site-navigation').classList.toggle('__dark', isBright(angle));
	
	document.querySelector('.gradient.left').style.background = `linear-gradient(to left, ${skyColor.rgba0}, ${skyColor.rgba1})`;
	document.querySelector('.gradient.right').style.background = `linear-gradient(to right, ${skyColor.rgba0}, ${skyColor.rgba1})`;
	
	//Записываем в куку и на сервере задаём цвета хедера чтобы при переходах между страница цвет не блымал...
	// Функция для установки cookies

	// Запись переменной в cookies
	setCookie('skyColor', skyColor.arr, 1/24);
	setCookie('isBright', isBright(angle), 1/24);
}

function setCookie(name, value, days) {
	const date = new Date();
	date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	const expires = "expires=" + date.toUTCString();
	document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

if(document.getElementById('super-logo-bg')) {
	init();
	document.querySelector('#super-logo-bg canvas').style.opacity = 1;
}