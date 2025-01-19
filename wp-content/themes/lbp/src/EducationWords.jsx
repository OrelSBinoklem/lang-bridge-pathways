import env from "./env";
import axios from "axios";

const { render, useEffect, useState } = wp.element;
let {SpokenTextChecker} = require('./SpokenTextChecker.js');

const EducationWords = ({  }) => {
	const [progressText, setProgressText] = useState('');
	const [check, setCheck] = useState(null);

	useEffect(() => {

	}, []);

	return (
		<div>
			<h3>2222222222222222222222222222</h3>

		</div>
	);
};

export default EducationWords;