const { render, useEffect } = wp.element;
import axios from 'axios';
import env from './env'
require('./WaterLogo');
require('./ExamenWords.jsx');
require('./Dictionary.jsx');

// Interactive Cheat Sheet
import InteractiveCheatSheet from './InteractiveCheatSheet/InteractiveCheatSheet.jsx';

if(document.getElementById('interactive-cheat-sheet-root')) {
	render(<InteractiveCheatSheet />, document.getElementById('interactive-cheat-sheet-root'));
}

// Grammar Tables Gallery
import GrammarTablesGallery from './GrammarTablesGallery/GrammarTablesGallery.jsx';

if(document.getElementById('grammar-tables-gallery-root')) {
	render(<GrammarTablesGallery />, document.getElementById('grammar-tables-gallery-root'));
}

//https://www.youtube.com/watch?v=EaC7x6QCjjQ

if(document.getElementById(`react-app`)) {
	const App = () => {
		useEffect(() => {
			let url = `${env.REACT_APP_API_ROOT}/posts?per_page=1&page=1`;
			axios.get(url).then((res) => {
				const { data, headers } = res;
				console.log(data)
			});
		}, []);

		return (
			<div>
				{/* <Votes /> */}
			</div>
		);
	};
	render(<App />, document.getElementById(`react-app`));
}