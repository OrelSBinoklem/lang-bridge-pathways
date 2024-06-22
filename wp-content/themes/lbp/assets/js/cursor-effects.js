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