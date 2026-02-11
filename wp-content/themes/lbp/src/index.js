const { render, useEffect } = wp.element;
import axios from 'axios';
import env from './env'
require('./WaterLogo');
require('./ExamenWords.jsx');
require('./Dictionary.jsx');

// Grammar Tables Gallery
import GrammarTablesGallery from './GrammarTablesGallery/GrammarTablesGallery.jsx';
// Lang page modals (Общая грамматика, Понятия)
import LangModalGrammarContent from './LangModals/LangModalGrammarContent.jsx';
import LangModalConceptsContent from './LangModals/LangModalConceptsContent.jsx';

if(document.getElementById('grammar-tables-gallery-root')) {
	render(<GrammarTablesGallery />, document.getElementById('grammar-tables-gallery-root'));
}

if (document.getElementById('lang-modal-184-content')) {
	render(<LangModalGrammarContent />, document.getElementById('lang-modal-184-content'));
}
if (document.getElementById('lang-modal-187-content')) {
	render(<LangModalConceptsContent />, document.getElementById('lang-modal-187-content'));
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