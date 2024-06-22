document.querySelectorAll('.cursor-effect-radial-highlight-container').forEach(link => {
	link.addEventListener('mouseenter', () => {
		link.querySelector('.cursor-effect-radial-highlight').style.opacity = '1';
	});
	
	link.addEventListener('mouseleave', () => {
		link.querySelector('.cursor-effect-radial-highlight').style.opacity = '0';
	});
	
	link.addEventListener('mousemove', function(e) {
		const cursor = link.querySelector('.cursor-effect-radial-highlight');
		cursor.style.left = e.pageX - link.getBoundingClientRect().left - cursor.offsetWidth / 2 + 'px';
		cursor.style.top = e.pageY - link.getBoundingClientRect().top - cursor.offsetHeight / 2 + 'px';
	});
});

/*Эффект курсора картинка под картинкой!*/
document.querySelectorAll('.cursor-effect-mask-container').forEach(container => {
	let isActive = false;
	let pageXCache = 0;
	let pageYCache = 0;
	
	container.addEventListener('mouseenter', () => {
		isActive = true;
		container.querySelector('.cursor-effect-mask').style.opacity = '1';
	});
	
	container.addEventListener('mouseleave', () => {
		isActive = false;
		container.querySelector('.cursor-effect-mask').style.opacity = '0';
	});
	
	container.addEventListener('mousemove', (e) => {
		pageXCache = e.pageX; pageYCache = e.pageY;
		animateMask({pageX: e.pageX, pageY: e.pageY})
	});
	
	function animateMask(data) {
		if(isActive) {
			let pageX = Object.is(data) && 'pageX' in data ? data.pageX : pageXCache;
			let pageY = Object.is(data) && 'pageY' in data ? data.pageY : pageYCache;
			
			const cursor = container.querySelector('.cursor-effect-mask');
			cursor.style.left = pageX - container.getBoundingClientRect().left - cursor.offsetWidth / 2 + 'px';
			cursor.style.top = pageY - container.getBoundingClientRect().top - cursor.offsetHeight / 2 + 'px';
			
			const img = cursor.querySelector('img');
			img.style.left = -1 * (pageX - container.getBoundingClientRect().left - cursor.offsetWidth / 2) + 'px';
			img.style.top = -1 * (pageY - container.getBoundingClientRect().top - cursor.offsetHeight / 2) + 'px';
			console.log(pageX, pageY);
			img.style.width = container.offsetWidth + 'px';
			img.style.height = container.offsetHeight + 'px';
		}
		
		//requestAnimationFrame(animateMask);
	}

// Запускаем первый кадр анимации
	animateMask();
});