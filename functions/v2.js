const {
	cert,
	initializeApp,
} = require('firebase-admin/app');
const {
	getFirestore,
	Timestamp,
} = require('firebase-admin/firestore');
const md5 = require('md5');

const serviceAccount = JSON.parse(process.env.FIREBASE);
const regex = /\d{17,19}/;
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

exports.handler = async event => {
	console.log(event);
	const {
		client: id,
		guilds,
		members,
		tickets,
		version,
	} = JSON.parse(event.body);

	if (
		typeof id !== 'string' ||
		typeof guilds !== 'number' ||
		typeof members !== 'number' ||
		typeof tickets !== 'number' ||
		typeof version !== 'string'
	) {
		return {
			body: '400 BAD REQUEST: "Missing or invalid fields"',
			statusCode: 400,
		};
	}

	if (!regex.test(id)) {
		return {
			body: '400 BAD REQUEST: "Invalid client ID"',
			statusCode: 400,
		};
	}

	const data = {
		activated_users: null,
		arch: null,
		avg_response_time: null,
		categories: null,
		guilds,
		id: md5(id),
		lastSeen: Timestamp.fromMillis(Date.now()),
		members,
		messages: null,
		node: null,
		os: null,
		tags: null,
		tickets,
		version,
	};

	const docRef = db.collection('stats:clients').doc(id);
	let doc = await docRef.get();
	let statusCode = 200;

	if (!doc.exists) {
		data.firstSeen = Timestamp.fromMillis(Date.now());
		statusCode = 201;
	}

	doc = await docRef.set(data, { merge: true });

	return {
		body: `${statusCode} ${statusCode === 200 ? 'OK' : 'CREATED'}`,
		statusCode,
	};

};