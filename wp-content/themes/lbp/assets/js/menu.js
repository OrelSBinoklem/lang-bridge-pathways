document.addEventListener('DOMContentLoaded', function() {
	var menuToggle = document.getElementById('menu-toggle');
	var primaryMenu = document.getElementById('primary-menu');
	
	menuToggle.addEventListener('click', function() {
		primaryMenu.classList.toggle('open');
		var isExpanded = primaryMenu.classList.contains('open');
		menuToggle.setAttribute('aria-expanded', isExpanded);
	});
});
