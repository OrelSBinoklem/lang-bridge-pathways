const { render, useEffect } = wp.element;
import axios from 'axios';
import env from './env'
require('./WaterLogo');
require('./EducationExamenWords.jsx');
require('./Dictionary.jsx');

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