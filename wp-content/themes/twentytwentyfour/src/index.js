const { render, useEffect } = wp.element;
import axios from 'axios';

//https://www.youtube.com/watch?v=EaC7x6QCjjQ


const App = () => {
	useEffect(() => {
		let url = `${process.env.REACT_APP_API_ROOT}/posts?per_page=1&page=1`;
		axios.get(url).then((res) => {
			const { data, headers } = res;
			console.log(data)
		});
	}, []);
	
	return (
			<div>
				<p>My First Apollo Theme!</p>
				{/* <Votes /> */}
			</div>
	);
};
render(<App />, document.getElementById(`react-app`));